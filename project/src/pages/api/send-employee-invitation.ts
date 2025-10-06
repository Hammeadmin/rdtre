import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '../../src/lib/email'; // Adjust path as needed

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Safely get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  // --- FIX 1: Add a check for missing environment variables ---
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Server configuration error: Supabase URL or Service Key is missing.");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server is not configured correctly." }),
    };
  }

  // Initialize the client inside the handler
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { employerId, inviteeEmail, relationshipType } = JSON.parse(event.body || '{}');

    if (!employerId || !inviteeEmail || !relationshipType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields.' }),
      };
    }

    // Call your RPC function
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('create_employee_invitation', {
      p_employer_id: employerId,
      p_invitee_email: inviteeEmail,
      p_relationship_type: relationshipType,
    });

    if (rpcError) {
      console.error('Supabase RPC Error:', rpcError.message);
      throw new Error(rpcError.message);
    }
    if (rpcData.error) {
      console.error('Error from within RPC function:', rpcData.error);
      throw new Error(rpcData.error);
    }

    const { success, user_exists } = rpcData;

    if (!success) {
      throw new Error('Failed to create invitation in database.');
    }

    // Handle email notifications
    if (user_exists) {
      await sendNotificationEmail({
        to: inviteeEmail,
        recipientName: 'Användare',
        title: 'Du har en ny anställningsförfrågan!',
        message: 'En arbetsgivare har bjudit in dig till sitt team. Logga in på Farmispoolen för att se och svara på förfrågan.',
      });
    } else {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        inviteeEmail,
        { redirectTo: '/dashboard' }
      );
      if (inviteError) {
        console.error("Supabase inviteUserByEmail failed, but DB record was created:", inviteError.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Invitation sent successfully.' }),
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Full error in /api/send-employee-invitation:', errorMessage);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};