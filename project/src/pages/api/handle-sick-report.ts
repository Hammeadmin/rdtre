import type { NextApiRequest, NextApiResponse } from 'next';
import { createAndSendNotificationToGroup } from '../../lib/notifications';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // You could use details from the body to make the message more specific
  // const { shiftId, employeeName } = req.body;

  await createAndSendNotificationToGroup(
    'employer', // Notify all employers
    'En anställd har sjukanmält sig',
    `En anställd har anmält sig sjuk och ett av deras pass har återpublicerats. Vänligen granska instrumentpanelen.`,
    '/employer-dashboard/shifts' // Link to the shifts page
  );

  // Respond immediately so the frontend doesn't wait
  res.status(202).json({ message: 'Employer notification process started.' });
}