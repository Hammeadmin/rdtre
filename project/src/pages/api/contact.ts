import type { NextApiRequest, NextApiResponse } from 'next';
import { sendContactFormEmail } from '../../lib/email'; // Make sure this path is correct

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // We only want to handle POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { name, email, message } = req.body;

  // Basic validation to ensure we have all the data
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Call the email-sending function you already have in `email.ts`
    const result = await sendContactFormEmail(name, email, message);

    if (result.success) {
      return res.status(200).json({ message: 'Email sent successfully' });
    } else {
      // If the email service failed, send an error response
      return res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
}