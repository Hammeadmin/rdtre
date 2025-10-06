import { supabase } from './supabase';
import type { UserRole } from '../types';
import type { EmployeeProfileData, EmployeeProfileFilters } from '../types';


// Define the possible relationship types based on your database setup
export type RelationshipType = 'heltidsanställd' | 'timanställd' | 'deltidsanställd' | 'platform_user'; // Assuming 'platform_user' is still the default or possible

export async function fetchAllEmployerProfiles(): Promise<{ data: UserProfile[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        pharmacy_name, 
        email,
        role,
        description,
        profile_picture_url,
        street_address, 
        city,
        postal_code,
        country,
        pharmacy_phone
      `)
      .eq('role', 'employer')
      .order('pharmacy_name', { ascending: true });

    if (error) {
      console.error('Error fetching employer profiles:', error);
      throw new Error(error.message);
    }
    return { data: data as UserProfile[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred while fetching employer profiles.';
    console.error(message, err);
    return { data: null, error: message };
  }
}

// Define the structure of the filters the function will accept
export interface EmployeeProfileFilters {
  searchTerm?: string;
  role?: UserRole | '';
  workedForEmployer?: boolean;
  minExperience?: string[];
  systems?: string[];
  relationshipType?: RelationshipType | ''; // Use the defined type, allow '' for all
}

// Define the structure of the data returned by the RPC
export interface EmployeeProfileData {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  description: string | null;
  experience: string[] | null;
  systems: string[] | null;
  profile_picture_url: string | null;
  license_verified: boolean | null;
  has_worked_for_employer: boolean;
  work_history: WorkHistoryEntry[] | null;
  resume_url: string | null;
  // Newly added fields
  pharmacist_type: string | null;
  phone_number: string | null;
}

// Ensure this type is defined or imported
export interface WorkHistoryEntry {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  description?: string;
}


export async function setVerificationStatus(
  targetUserId: string,
  isVerified: boolean,
  isActive?: boolean // Optional: also set is_active status
): Promise<{ data: UserProfile | null; error: string | null }> {
  if (!targetUserId) {
    return { data: null, error: "Target User ID is required." };
  }

  // Client-side check for admin (RLS is the true enforcer)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: "User not authenticated." };
  }
  const { data: adminProfile, error: adminProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
    return { data: null, error: "Unauthorized: Only admins can change verification status." };
  }

  try {
    const updateData: { license_verified: boolean; is_active?: boolean } = {
      license_verified: isVerified,
    };

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }
    // 'license_rejection_reason' logic is now removed

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)
      .select() // Select the updated row to return
      .single();

    if (error) {
      console.error('Error updating verification status:', error);
      throw error; // Propagate the error
    }

    return { data: data as UserProfile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ett fel inträffade vid uppdatering av verifieringsstatus.';
    console.error(message, err);
    return { data: null, error: message };
  }
}


/**
 * Fetches a list of employee profiles based on specified filters for the currently authenticated employer.
 * Calls the 'get_employee_profiles_for_employer' Supabase RPC function.
 * @param filters - An object containing filter criteria.
 * @returns A promise that resolves to an object containing the profile data or an error message.
 */
export async function fetchEmployeeProfilesForEmployer(
  filters: EmployeeProfileFilters
): Promise<{ data: EmployeeProfileData[] | null; error: string | null }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return { data: null, error: 'User not authenticated.' };
    }

    console.log('Fetching employee profiles with filters:', filters);

    // Call the RPC function, including the relationship filter
    const { data, error: rpcError } = await supabase.rpc('get_employee_profiles_for_employer', {
      p_requesting_employer_id: user.id,
      p_search_term: filters.searchTerm || null,
      p_role: filters.role || null,
      p_worked_for_employer: filters.workedForEmployer || false,
      p_min_experience: filters.minExperience && filters.minExperience.length > 0 ? filters.minExperience : null,
      p_systems: filters.systems && filters.systems.length > 0 ? filters.systems : null,
      p_relationship_type: filters.relationshipType || null, // Pass relationship type filter (e.g., 'heltidsanställd')
    });

    if (rpcError) {
      console.error('Error fetching employee profiles via RPC:', rpcError);
      if (rpcError.message.includes('permission denied')) {
        throw new Error('Permission denied by database rules.');
      }
      throw new Error(rpcError.message || 'Database error fetching profiles.');
    }

    console.log('Received profiles:', data);

    const profiles = Array.isArray(data) ? data as EmployeeProfileData[] : [];
    return { data: profiles, error: null };

  } catch (err) {
    console.error('Error in fetchEmployeeProfilesForEmployer helper:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch employee profiles.';
    return { data: null, error: message };
  }
}

export async function fetchAllEmployeeProfiles(
  filters: EmployeeProfileFilters
): Promise<{ data: EmployeeProfileData[] | null; error: string | null }> {
  try {
    const { data, error: rpcError } = await supabase.rpc('get_all_employee_profiles', {
      p_search_term: filters.searchTerm || null,
      p_role: filters.role || null,
      p_min_experience: filters.minExperience && filters.minExperience.length > 0 ? filters.minExperience : null,
      p_systems: filters.systems && filters.systems.length > 0 ? filters.systems : null,
    });

    if (rpcError) throw rpcError;

    return { data: data as EmployeeProfileData[], error: null };

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch employee profiles.';
    return { data: null, error: message };
  }
}