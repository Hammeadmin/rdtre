// supabase/functions/create-and-invite-employee/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// These headers are important for allowing your app to call the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This handles a pre-flight request required by browsers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { employeeData, employerId } = await req.json()
    
    // Initialize the Supabase admin client to perform secure operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Create the user securely using the Admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: employeeData.email,
      email_confirm: true, // The user will be created but must accept the invite
      user_metadata: { full_name: employeeData.fullName }
    })
    if (userError) throw userError
    
    const newUserId = userData.user.id

    // 2. Call your database function to link the new user to their data
    const { error: linkError } = await supabaseAdmin.rpc('link_employee_data', {
        p_user_id: newUserId,
        p_full_name: employeeData.fullName,
        p_email: employeeData.email,
        p_role: employeeData.role,
        p_employer_id: employerId,
        p_relationship_type: employeeData.relationshipType,
        p_phone_number: employeeData.phoneNumber,
        p_birth_date: employeeData.birthDate,
        p_address: employeeData.address,
        p_postal_code: employeeData.postalCode,
        p_city: employeeData.city,
        p_hourly_rate: employeeData.hourlyRate
    });
    if (linkError) throw linkError

    // 3. Send the official invitation email
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      employeeData.email
    );
    if (inviteError) throw inviteError

    // 4. Return a success message
    return new Response(JSON.stringify({ success: true, message: 'Employee created and invited.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Use 400 for client-side errors, 500 for server-side
    })
  }
})