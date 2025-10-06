import { supabase } from './supabase'; // Assuming you have a central supabase client



export const createNotification = async (notificationData: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) => {
  try {
    // This only creates the in-app notification
    const { error } = await supabase.from('notifications').insert(notificationData);
    if (error) throw new Error(error.message);
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Error creating notification:", err.message);
    return { success: false, error: err.message };
  }
};

// This is our new, centralized function
export async function createAndSendNotification(
  userId: string,
  title: string,
  message: string,
  link?: string // Optional link for the in-app notification
) {
  try {
    // === Part 1: Get the recipient's email from their profile ===
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found to send notification.');
    }

    // === Part 2: Save the notification to the database ===
    const { error: notificationError } = await supabase
      .from('notifications') // Assuming you have a 'notifications' table
      .insert({
        user_id: userId,
        title: title,
        message: message,
        link: link || null, // e.g., '/my-applications'
        is_read: false,
      });

    if (notificationError) {
      throw new Error('Failed to save notification to the database.');
    }

     const { sendNotificationEmail } = await import('./email');

    // === Part 3: Send the email notification ===
    await sendNotificationEmail({
      to: profile.email,
      recipientName: profile.full_name || 'Användare',
      title: title,
      message: message,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    console.error('Error in createAndSendNotification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// === ADD THIS NEW FUNCTION BELOW THE OTHER ONE ===
export async function createAndSendNotificationToGroup(
  role: 'employee' | 'employer', // Define which group to notify
  title: string,
  message: string,
  link?: string
) {
  try {
    // 1. Get all users with the specified role
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id') // We only need their IDs for the notification function
      .eq('role', role);

    if (profilesError) {
      throw new Error('Could not fetch user profiles for notification.');
    }

    if (!profiles || profiles.length === 0) {
      console.log(`No users found with role "${role}" to notify.`);
      return { success: true }; // Not an error, just no one to notify
    }

    // 2. Loop through each user and send them a notification
    // We use Promise.all to run these in parallel for efficiency
    await Promise.all(
      profiles.map(profile =>
        createAndSendNotification(profile.id, title, message, link)
      )
    );

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    console.error(`Error notifying group "${role}":`, errorMessage);
    return { success: false, error: errorMessage };
  }
}