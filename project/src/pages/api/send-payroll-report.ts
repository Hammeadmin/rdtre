import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmailWithAttachment } from '../../lib/email'; // Make sure path is correct

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { recipientEmail, pdfData, payPeriod, employeeName } = req.body;

  if (!recipientEmail || !pdfData || !payPeriod) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await sendEmailWithAttachment({
      to: recipientEmail,
      subject: `Löneunderlag för ${employeeName || 'Anställda'} - ${payPeriod}`,
      html: `<p>Hej,</p><p>Vänligen se bifogat löneunderlag för perioden ${payPeriod}.</p><p>Med vänliga hälsningar,</p><p>Farmispoolen</p>`,
      attachment: {
        filename: `Löneunderlag_${payPeriod}.pdf`,
        content: pdfData,
      },
    });

    if (result.success) {
      return res.status(200).json({ message: 'Email sent successfully.' });
    } else {
      return res.status(500).json({ error: 'Failed to send email.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}