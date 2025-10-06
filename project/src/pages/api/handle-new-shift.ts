import type { NextApiRequest, NextApiResponse } from 'next';
import { createAndSendNotificationToGroup } from '../../lib/notifications';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { shiftTitle } = req.body;

  // Call our new group notification function
  await createAndSendNotificationToGroup(
    'employee', // Notify all employees
    'Nytt Arbetspass Tillgängligt',
    `Ett nytt arbetspass har lagts till: "${shiftTitle}". Ansök nu!`,
    '/shifts' // Link to the shifts page
  );

  // Respond immediately, don't wait for all emails to send
  res.status(202).json({ message: 'Notification process started.' });
}