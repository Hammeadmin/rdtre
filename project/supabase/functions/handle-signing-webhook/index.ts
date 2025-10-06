import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

// This function handles incoming webhooks from Dropbox Sign (formerly HelloSign).

Deno.serve(async (req) => {
  try {
    // Dropbox Sign sends webhook data as a URL-encoded form with a 'json' parameter.
    const formData = await req.formData();
    const jsonPayload = formData.get('json');

    if (!jsonPayload || typeof jsonPayload !== 'string') {
      console.warn("Webhook received without 'json' payload.");
      // Still need to return the required response to prevent retries for malformed requests.
      return new Response('Hello API Event Received', { status: 200 });
    }

    const payload = JSON.parse(jsonPayload);
    const eventType = payload.event?.event_type;
    const signatureRequestId = payload.signature_request?.signature_request_id;

    if (!eventType || !signatureRequestId) {
      console.warn("Webhook payload missing event_type or signature_request_id.");
      return new Response('Hello API Event Received', { status: 200 });
    }

    console.log(`Received Dropbox Sign event: ${eventType} for request ${signatureRequestId}`);

    // Map Dropbox Sign events to our internal statuses
    let newStatus = '';
    switch (eventType) {
      case 'signature_request_all_signed':
        newStatus = 'signed';
        break;
      case 'signature_request_declined':
        newStatus = 'rejected';
        break;
      case 'signature_request_canceled':
        newStatus = 'withdrawn';
        break;
      // You can add more events here if needed, e.g., 'signature_request_viewed'
      default:
        console.log(`Ignoring Dropbox Sign event type: ${eventType}`);
        // We still acknowledge the event to stop retries.
        return new Response('Hello API Event Received', { status: 200 });
    }

    // Create a Supabase client with the SERVICE_ROLE_KEY to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update the contract in our database
    const { error } = await supabaseAdmin
      .from('contracts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('signing_request_id', signatureRequestId); // Match using the Dropbox Sign request ID

    if (error) {
      console.error(`Failed to update contract ${signatureRequestId}:`, error);
      // Even if our DB fails, we must tell Dropbox Sign we received the event.
    } else {
      console.log(`Successfully updated contract ${signatureRequestId} to status "${newStatus}".`);
    }

    // IMPORTANT: Dropbox Sign requires this exact string as a response.
    return new Response('Hello API Event Received', { status: 200 });

  } catch (error) {
    console.error('Error processing Dropbox Sign webhook:', error);
    // Return a generic server error but avoid sending detailed error messages back.
    return new Response('Webhook processing error', { status: 500 });
  }
});

