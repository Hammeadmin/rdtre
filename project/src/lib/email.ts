import { Resend } from 'resend';
// We are temporarily removing these imports for the test
// import { NotificationEmail } from '../components/Email/templates/NotificationEmail';
// import { renderToString } from 'react-dom/server';

// --- FIX: Use process.env for server-side code ---
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendNotificationEmail({
  to,
  title,
  message,
  recipientName,
}: {
  to: string;
  title:string;
  message: string;
  recipientName: string;
}) {
  if (!resend) {
    console.error('Resend not configured. RESEND_API_KEY environment variable is likely missing.');
    throw new Error('Email service is not configured on the server.');
  }

  try {
    // --- TEMPORARY DEBUGGING STEP ---
    // Instead of rendering a React component, we use a simple HTML string.
    // This removes any potential server-side rendering errors from the equation.
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
        </head>
        <body>
          <h2>Hej ${recipientName},</h2>
          <p>${message}</p>
          <p>Med vänliga hälsningar,</p>
          <p>Teamet på Farmispoolen</p>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Farmispoolen <no-reply@farmispoolen.se>',
      to,
      subject: title,
      html: emailHtml,
    });

    if (error) {
      throw error;
    }

    return { success: true, data };

  } catch (error) {
    console.error('Error sending notification email:', error);
    throw error;
  }
}

// The sendEmailWithAttachment function remains the same
export async function sendEmailWithAttachment({
  to,
  subject,
  html,
  attachment,
}: {
  to: string;
  subject: string;
  html: string;
  attachment: {
    filename: string;
    content: string;
  };
}) {
  if (!resend) {
    console.error('Resend not configured. RESEND_API_KEY environment variable is likely missing.');
    throw new Error('Email service is not configured on the server.');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Farmispoolen Rapporter <info@farmispoolen.se>',
      to: to,
      subject: subject,
      html: html,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content.split('base64,')[1],
        },
      ],
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    throw error;
  }
}
