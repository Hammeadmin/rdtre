import { supabase } from './supabase';

export async function checkCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error("Error getting user:", error);
    return null;
  }
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error("Error getting profile:", profileError);
    return null;
  }

  return {
    user: data.user,
    profile
  };
}

export async function createShiftWithFreshSession(shiftData: any) {
  try {
    // Validate required fields
    const requiredFields = ['employer_id', 'title', 'pharmacy_name', 'description', 'date', 'start_time', 'end_time'];
    const missingFields = requiredFields.filter(field => !shiftData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log('Creating shift with validated data:', {
      ...shiftData,
      employer_id: shiftData.employer_id,
      date: new Date(shiftData.date).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Force refresh the session
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError) {
      console.error('Session refresh error:', sessionError);
      throw sessionError;
    }
    console.log('Session refreshed successfully');

    // Verify employer exists and has correct role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionData.session?.user.id)
      .single();
      
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw profileError;
    }
    console.log('User role:', profile.role);

    if (profile.role !== 'employer') {
      throw new Error('Only employers can create shifts');
    }

    // Verify employer_id exists in profiles table
    const { data: employerProfile, error: employerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', shiftData.employer_id)
      .single();

    if (employerError || !employerProfile) {
      console.error('Invalid employer_id:', shiftData.employer_id);
      throw new Error('Invalid employer_id');
    }

    // Validate status if provided
    if (shiftData.status && !['open', 'filled', 'cancelled'].includes(shiftData.status)) {
      console.error('Invalid status:', shiftData.status);
      throw new Error('Invalid status. Must be one of: open, filled, cancelled');
    }

    // Insert the shift
    const { data, error } = await supabase
      .from('shift_needs')
      .insert(shiftData)
      .select();

    if (error) {
      console.error('Shift creation error:', error);
      // Check for specific constraint violations
      if (error.code === '23503') {
        throw new Error('Foreign key violation: employer_id does not exist');
      } else if (error.code === '23514') {
        throw new Error('Check constraint violation: invalid status value');
      } else {
        throw error;
      }
    }
    
   
    return { data, error: null };
  } catch (error) {
    console.error("Error in createShiftWithFreshSession:", error);
    return { data: null, error };
  }
}