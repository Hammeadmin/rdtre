import type { NextApiRequest, NextApiResponse } from 'next';
// Import our new centralized function
import { createAndSendNotification } from '../../lib/notifications'; 

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The frontend still sends the same data
  const { userId, title, message } = req.body;

  if (!userId || !title || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Now, we just make ONE call to our new service
  const result = await createAndSendNotification(userId, title, message);

  if (result.success) {
    return res.status(200).json({ message: 'Notification sent successfully.' });
  } else {
    return res.status(500).json({ error: result.error });
  }
}