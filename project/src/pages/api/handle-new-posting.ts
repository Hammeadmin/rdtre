import type { NextApiRequest, NextApiResponse } from 'next';
import { createAndSendNotificationToGroup } from '../../lib/notifications';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { postingTitle } = req.body;

  // Call the same group notification function with a different message
  await createAndSendNotificationToGroup(
    'employee', // Notify all employees
    'Ny Jobbmöjlighet!',
    `En ny annons har publicerats: "${postingTitle}". Se detaljer och ansök.`,
    '/postings' // Link to the job postings page
  );

  // Respond immediately
  res.status(202).json({ message: 'Notification process started.' });
}