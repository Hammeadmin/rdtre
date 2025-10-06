import { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Create the clients with the correct environment variables
const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Professional HTML Email Template ---
const createStyledEmailHtml = (title: string, body: string, footerText: string = "Detta är ett automatiskt meddelande. Vänligen svara inte på detta email.") => {
  // Correct, absolute URL to your logo
  const logoUrl = 'https://www.farmispoolen.se/assets/farmispoolenLogo2.png'; 
  const loginUrl = 'https://www.farmispoolen.se/auth';
  
  // New Green & Beige color scheme
  const primaryColor = '#059669'; // A strong green
  const lightBgColor = '#F5F5F4'; // A light, neutral beige/stone color

  // Replace "Logga in..." text with a styled button
  const styledBody = body.replace(
    /Logga in för att ansöka\./g,
    `<a href="${loginUrl}" style="display: inline-block; background-color: ${primaryColor}; color: white; padding: 12px 24px; margin-top: 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Logga in för att ansöka</a>`
  );

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 20px auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${primaryColor}; color: white; padding: 20px; text-align: center;">
        <img src="${logoUrl}" alt="Farmispoolen Logo" style="max-width: 180px; margin: 0 auto;"/>
      </div>
      <div style="padding: 25px;">
        <h2 style="font-size: 22px; color: ${primaryColor}; margin-top: 0;">${title}</h2>
        ${styledBody}
        <p style="margin-top: 30px; font-size: 12px; color: #6B7280;">${footerText}</p>
      </div>
      <div style="background-color: ${lightBgColor}; color: #6B7280; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #E5E7EB;">
        <p>&copy; ${new Date().getFullYear()} Farmispoolen. Alla rättigheter förbehållna.</p>
      </div>
    </div>
  `;
};

// --- Helper function with ALL email types ---
const buildEmailContent = (emailType: string, payload: any) => {
  const fromAddress = 'noreply@farmispoolen.se';
  const supportAddress = 'support@farmispoolen.se';

  switch (emailType) {
    case 'employeeInvitation':
      return { to: payload.email, from: fromAddress, subject: `Inbjudan från ${payload.companyName}`, html: createStyledEmailHtml('Du har en ny inbjudan', `<p>Du har fått en inbjudan att arbeta för <strong>${payload.companyName}</strong>. Vänligen logga in på ditt Farmis-konto för att se och acceptera din inbjudan.</p>`)};

    case 'shiftApplicationAccepted':
      return { to: payload.userEmail, from: fromAddress, subject: `Din ansökan har accepterats!`, html: createStyledEmailHtml('Ansökan Accepterad', `<p>Grattis! Din ansökan för passet "<strong>${payload.shiftTitle}</strong>" har blivit accepterad.</p>`) };
    
    case 'shiftApplicationRejected':
      return { to: payload.userEmail, from: fromAddress, subject: `Uppdatering om din ansökan`, html: createStyledEmailHtml('Angående din ansökan', `<p>Tack för ditt intresse för passet "<strong>${payload.shiftTitle}</strong>". Tjänsten har tillsatts av en annan sökande.</p>`) };

// --- Add these two cases inside the buildEmailContent function ---

case 'newShiftApplication':
    if (!payload.applicantName || !payload.shiftTitle) throw new Error('Missing data for new shift application email.');
    return {
        to: '', // This will be set in the main handler
        from: fromAddress,
        subject: `Ny ansökan till ditt pass: ${payload.shiftTitle}`,
        html: createStyledEmailHtml(
            'Ny Ansökan Mottagen',
            `<p>Du har fått en ny ansökan för passet "<strong>${payload.shiftTitle}</strong>" från <strong>${payload.applicantName}</strong>.</p>
             <p>Logga in på din instrumentpanel för att granska ansökan.</p>`
        )
    };

case 'newPostingApplication':
    if (!payload.applicantName || !payload.postingTitle) throw new Error('Missing data for new posting application email.');
    return {
        to: '', // This will be set in the main handler
        from: fromAddress,
        subject: `Ny ansökan till ditt uppdrag: ${payload.postingTitle}`,
        html: createStyledEmailHtml(
            'Ny Ansökan Mottagen',
            `<p>Du har fått en ny ansökan för uppdraget "<strong>${payload.postingTitle}</strong>" från <strong>${payload.applicantName}</strong>.</p>
             <p>Logga in på din instrumentpanel för att granska ansökan.</p>`
        )
    };
      
    case 'newShiftNotification': {
    const isUrgent = payload.is_urgent;
    const city = payload.employerCity; // Get the city we just added

    // Create a dynamic subject and title based on whether a city is present
    const subject = isUrgent
        ? `BRÅDSKANDE: Nytt arbetspass: ${payload.shiftTitle}`
        : city
            ? `Nytt pass i ${city}: ${payload.shiftTitle}`
            : `Nytt arbetspass: ${payload.shiftTitle}`;

    const title = isUrgent
        ? 'Brådskande Arbetspass Tillgängligt'
        : city
            ? `Nytt Arbetspass i ${city}`
            : 'Nytt Arbetspass Tillgängligt';

    const urgentHtml = isUrgent && payload.urgent_pay_adjustment
        ? `<div style="background-color:#fffbe6; border:1px solid #fde68a; padding:12px; border-radius:5px; margin-top:10px; text-align:center;">
             <p style="margin:0; font-weight:bold; color:#ca8a04;">
               ❗️ Akut-tillägg: +${payload.urgent_pay_adjustment} kr/tim
             </p>
           </div>`
        : '';

    return {
        to: [],
        from: fromAddress,
        subject: subject, // Use the new dynamic subject
        html: createStyledEmailHtml(
            title, // Use the new dynamic title
            `<p>Ett nytt arbetspass har publicerats:</p>
             <div style="background-color:#f9f9f9;padding:15px;border-radius:5px;">
               <h3 style="margin-top:0;"><strong>${payload.shiftTitle}</strong></h3>
               <p><strong>Företag:</strong> ${payload.companyName || 'Ej specificerat'}</p>
               <p><strong>Beskrivning:</strong> ${payload.shiftDescription || 'Ingen beskrivning.'}</p>
               <p><strong>Datum:</strong> ${payload.shiftDate || 'Ej specificerat'}</p>
               <p><strong>Tid:</strong> ${payload.shiftTime || 'Ej specificerat'}</p>
               <p><strong>Plats:</strong> ${payload.shiftLocation || 'Ej specificerat'}</p>
               <p><strong>Grundlön:</strong> ${payload.hourlyRate ? `${payload.hourlyRate} kr/tim` : 'Ej specificerat'}</p>
               ${urgentHtml}
             </div>
             <p>Logga in för att ansöka.</p>`
        )
    };
}

      case 'intranetPostNotification':
    if (!payload.title || !payload.content) {
        throw new Error('Missing title or content for intranet post email.');
    }
    // Note: We are using a simplified version of the content for the email body.
    // You might want to convert HTML content from the post to plain text or a safe HTML subset.
    return {
        to: [], // The recipient list will be populated in the main handler
        from: fromAddress,
        subject: `Nytt meddelande på intranätet: ${payload.title}`,
        html: createStyledEmailHtml(
            payload.title,
            // The content from the intranet post will be inserted here.
            // It's important to ensure this content is properly sanitized if it contains user-generated HTML.
            payload.content,
            "Du kan se hela inlägget och eventuella kommentarer genom att logga in på Farmispoolen."
        )
    };

      case 'userVerified':
    return {
        to: payload.email,
        from: fromAddress,
        subject: `Ditt konto hos Farmispoolen är nu verifierat!`,
        html: createStyledEmailHtml(
            'Grattis, du är verifierad!',
            `<p>Hej ${payload.name || ''},</p>
             <p>Goda nyheter! Vi har granskat och verifierat ditt konto. Du har nu full tillgång till plattformen och kan börja söka arbetspass och uppdrag direkt.</p>
             <p>Logga in för att se passen som väntar på dig.</p>`,
            "Du kan nu börja din resa med Farmispoolen."
        )
    };

   case 'newPostingNotification':
    return { 
        to: [], 
        from: fromAddress, 
        subject: `Nytt uppdrag: ${payload.postingTitle}`, 
        html: createStyledEmailHtml(
            'Nytt Uppdrag Tillgängligt', 
            `<p>Ett nytt uppdrag har publicerats:</p>
             <div style="background-color:#f9f9f9;padding:15px;border-radius:5px;">
               <h3 style="margin-top:0;"><strong>${payload.postingTitle}</strong></h3>
               <p><strong>Företag:</strong> ${payload.companyName || 'Ej specificerat'}</p>
               <p><strong>Beskrivning:</strong> ${payload.postingDescription || 'Ingen beskrivning.'}</p>
               <p><strong>Plats:</strong> ${payload.postingLocation || 'Ej specificerat'}</p>
               <p><strong>Ersättning:</strong> ${payload.hourlyRate ? `${payload.hourlyRate} kr/tim` : 'Enligt överenskommelse'}</p>
             </div>
             <p>Logga in för att ansöka.</p>`
        ) 
    };
    
    case 'contactForm':
      if (!payload.name || !payload.email || !payload.message) throw new Error('Missing data for contact form email.');
      return { to: supportAddress, from: fromAddress, reply_to: payload.email, subject: `Kontaktformulär: ${payload.name}`, html: `<p><strong>Avsändare:</strong> ${payload.name} (${payload.email})</p><p><strong>Meddelande:</strong></p><p>${payload.message}</p>` };
      
    case 'sickReport':
    if (!payload.shiftTitle || !payload.shiftDate || !payload.employeeName) throw new Error('Missing data for sick report email.');
    return { 
        to: '', 
        from: fromAddress, 
        subject: `Sjukanmälan: ${payload.employeeName}`, 
        html: createStyledEmailHtml(
            `Sjukanmälan från ${payload.employeeName}`, 
            `<p>En anställd, <strong>${payload.employeeName}</strong>, har anmält sig sjuk för passet:</p>
             <ul>
               <li><strong>Pass:</strong> ${payload.shiftTitle}</li>
               <li><strong>Datum:</strong> ${payload.shiftDate}</li>
               <li><strong>Tid:</strong> ${payload.shiftTime || 'Ej specificerat'}</li>
             </ul>`, 
            "Detta är ett meddelande till arbetsgivaren."
        ) 
    };
      
    case 'payrollReport':
      if (!payload.recipientEmail || !payload.pdfData || !payload.payPeriod) {
          throw new Error('Missing data for payroll report email.');
      }

      const base64String = payload.pdfData.split(';base64,').pop();

      if (!base64String) {
          throw new Error('Invalid PDF data format provided.');
      }

      const pdfBuffer = Buffer.from(base64String, 'base64');

      return {
          to: payload.recipientEmail,
          from: fromAddress,
          subject: `Lönerapport för ${payload.payPeriod} - ${payload.employerName || 'Farmispoolen'}`,
          html: createStyledEmailHtml(
              `Lönerapport för ${payload.payPeriod}`,
              `<p>Hej,</p><p>Här kommer lönerapporten för perioden ${payload.payPeriod}.</p><p>Vänliga hälsningar,<br/>${payload.employerName || 'Farmispoolen'}</p>`
          ),
          attachments: [
              {
                  filename: `Lonerapport-${payload.payPeriod}.pdf`,
                  content: pdfBuffer,
              },
          ],
      };

    default:
      throw new Error(`The email type "${emailType}" is unknown.`);
  }
};

// --- Main Handler with all logic ---
export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { emailType, payload } = JSON.parse(event.body || '{}');
    if (!emailType || !payload) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Request must include 'emailType' and 'payload'." }) };
    }
    
    // This is the main logic block that handles different email types.
    // The special 'payrollReport' if-block has been removed for clarity.

    if (emailType === 'userInvitation') {
        const { inviteeEmail } = payload;
        if (!inviteeEmail) throw new Error("Missing email for user invitation.");

        const { error } = await supabase.auth.admin.inviteUserByEmail(inviteeEmail);

        if (error && !error.message.includes('User already registered')) {
            throw new Error(`Supabase invite error: ${error.message}`);
        }

    } else if (emailType === 'employeeInvitation') {
      const { employerId, inviteeEmail, relationshipType } = payload;
      if (!employerId || !inviteeEmail || !relationshipType) throw new Error("Missing data for invitation.");

      const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', inviteeEmail).single();

      if (existingUser) {
        const { data: employerProfile } = await supabase.from('profiles').select('pharmacy_name').eq('id', employerId).single();
        const companyName = employerProfile?.pharmacy_name || 'ditt företag';

        const { error: insertError } = await supabase.from('employer_employee_relationships').insert({
            employer_id: employerId,
            employee_id: existingUser.id,
            relationship_type: relationshipType,
            status: 'pending'
        });

        if (insertError) {
            throw new Error(`Database error creating relationship: ${insertError.message}`);
        }
        
        const emailData = { to: inviteeEmail, from: 'noreply@farmispoolen.se', subject: `Inbjudan från ${companyName}`, html: createStyledEmailHtml('Du har en ny inbjudan', `<p>Du har fått en inbjudan att arbeta för <strong>${companyName}</strong>. Vänligen logga in på ditt Farmis-konto för att se och acceptera din inbjudan.</p>`)};
        await resend.emails.send(emailData);

      } else {
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(inviteeEmail, { data: { invited_by_employer_id: employerId, initial_relationship_type: relationshipType } });
        if (inviteError) {
          throw new Error(`Supabase invite error: ${inviteError.message}`);
        }
      }

      } else if (emailType === 'intranetPostNotification') {
    console.log("Initiating 'intranetPostNotification' process...");

    // 1. Fetch all relevant users from the database.
    const { data: users, error } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['employer', 'pharmacist', 'säljare', 'egenvårdsrådgivare', 'admin']); // Add any other roles that should receive the email

    if (error) {
        throw new Error(`Database error fetching users: ${error.message}`);
    }

    const recipientList = users.map(user => user.email).filter(Boolean) as string[];

    if (recipientList.length > 0) {
        console.log(`Sending intranet post to ${recipientList.length} users.`);
        const emailData = buildEmailContent(emailType, payload);
        // Use bcc to protect user privacy
        await resend.emails.send({ ...emailData, bcc: recipientList }); 
    } else {
        console.log("No users found to send the intranet post to.");
    }
      
    } else if (emailType === 'newShiftNotification') {
      console.log("Initiating 'newShiftNotification' process...");
    const { employerId } = payload;
    if (!employerId) {
        console.warn("newShiftNotification was called without an employerId.");
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'No employerId, no emails sent.' }) };
    }

    // --- 1. Get users who want GENERAL notifications ---
    const { data: generalUsers, error: generalError } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['pharmacist', 'säljare', 'egenvårdsrådgivare'])
        .eq('receives_notifications', true); // The original general toggle

    if (generalError) throw generalError;
      console.log(`Found ${generalUsers?.length || 0} users for general notifications.`);


    // --- 2. Get users who want CITY-SPECIFIC notifications ---
    const { data: employer, error: employerError } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', employerId)
        .single();

        let regionalUsers: { email: string }[] = [];
        if (employerError) {
            console.error("Database error fetching employer city:", employerError.message);
        } else if (employer?.city) {
            const employerCity = employer.city;
            console.log(`Employer city found: ${employerCity}`);
            
            // Call the new, safe database function instead of the complex query
            const { data, error: rpcError } = await supabase
                .rpc('get_users_for_city_notification', { p_city_name: employerCity });
        
            if (rpcError) {
                // This will now give a much clearer error if something is wrong
                console.error("Error calling database function:", rpcError.message);
                throw rpcError;
            }
            
            regionalUsers = data || [];
            console.log(`Found ${regionalUsers.length} users for city-specific notifications in ${employerCity}.`);
        } else {
            console.log("Employer has no city defined, skipping city-specific notifications.");
        }

    // --- 3. Combine and de-duplicate the email lists ---
    const generalEmails = generalUsers?.map(u => u.email) || [];
    const regionalEmails = regionalUsers.map(u => u.email);

    const allEmails = new Set([...generalEmails, ...regionalEmails]);
    const finalRecipientList = Array.from(allEmails).filter(Boolean) as string[];

      console.log(`Final recipient list contains ${finalRecipientList.length} unique emails.`);
        // To avoid logging personal data, you can log just the count. If you need to debug further, you could temporarily log the array:
       console.log("Recipients:", finalRecipientList);


    // --- 4. Send the email if there are any recipients ---
    if (finalRecipientList.length > 0) {
      console.log("Preparing to send email...");
      const emailPayloadWithCity = { ...payload, employerCity: employer?.city };
        const emailData = buildEmailContent(emailType, emailPayloadWithCity);
        await resend.emails.send({ ...emailData, to: finalRecipientList });
     console.log("Email sent successfully to Resend.");
        } else {
            console.log("No recipients found, skipping email send.");
        }
      
}  else if (emailType === 'sickReport') {
        if (!payload.employerId) throw new Error("Employer ID is required for sick reports.");
        const { data: employer } = await supabase.from('profiles').select('email').eq('id', payload.employerId).single();
        if (employer?.email) {
            const emailData = buildEmailContent(emailType, payload);
            await resend.emails.send({ ...emailData, to: employer.email });
        }
} else if (emailType === 'newShiftApplication' || emailType === 'newPostingApplication') {
    if (!payload.employerId) throw new Error("Employer ID is required for application notifications.");
    
    // Fetch the employer's email from the database
    const { data: employer } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', payload.employerId)
        .single();
    
    if (employer?.email) {
        const emailData = buildEmailContent(emailType, payload);
        // Send the email to the fetched employer's address
        await resend.emails.send({ ...emailData, to: employer.email });
    }

      
    } else {
        // This is the generic handler for all other cases, including 'payrollReport'
        const emailData = buildEmailContent(emailType, payload);
        await resend.emails.send(emailData as any);
    }
    
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: `Process for '${emailType}' initiated.` }) };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error("Email sending error:", errorMessage);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send email', details: errorMessage }) };
  }
};
