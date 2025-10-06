// src/lib/shifts.ts
import { supabase } from './supabase';
import type { ShiftDate, ShiftNeed, UserRole } from '../types';

// Interface for data used when creating shifts (seems to be for the createShiftForm)
interface CreateShiftData {
  title: string;
  description: string;
  dates: ShiftDate[];
  required_experience: string[];
  required_role: UserRole;
  location: string;
  lunch: string | null; // Expecting interval string 'HH:MM:SS' or null
  is_urgent: boolean;
  urgent_pay_adjustment: number | null;
  hourly_rate: '',
}

// Interface for details of pending applications
export interface PendingApplicationDetail {
  application_id: string;
  application_status: string;
  applied_at: string;
  application_notes: string | null;
  shift_id: string;
  shift_title: string;
  shift_description: string | null;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_lunch: string | null;
  shift_location: string | null;
  shift_status: string;
  shift_required_role: string | null;
  shift_required_experience: string[] | null;
  shift_is_urgent: boolean | null;
  shift_urgent_pay_adjustment: number | null;
  shift_created_at: string;
  applicant_id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_role: UserRole | null;
}

export interface UnifiedEvent {
    event_id: string;
    title: string;
    start_time: string; // ISO string
    end_time: string; // ISO string
    event_type: 'shift' | 'posting';
    location: string;
}

export async function fetchMyFullSchedule(): Promise<{ data: UnifiedEvent[] | null; error: any | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase.rpc('get_my_full_schedule', {
        p_user_id: user.id
    });

    if (error) {
        console.error("Error fetching full schedule:", error);
        return { data: null, error };
    }
    return { data, error: null };
}


export async function reportSickForShift(shiftId: string): Promise<{ success: boolean; error: string | null; reposted_as_urgent?: boolean }> {
  try {
    const { data, error } = await supabase.rpc('report_sick_for_shift', {
      p_shift_id: shiftId,
    });

    if (error) throw error;
    if (data.error) throw new Error(data.error);

    return { success: true, error: null, reposted_as_urgent: data.reposted_as_urgent };
  } catch (err: any) {
    console.error("Error reporting sick for shift:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}


export async function fetchAllShiftsForAdmin(filters: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  role?: string;
  searchTerm?: string;
  employerId?: string;
  isUrgent?: boolean; // Added isUrgent filter
  location?: string; // Added location filter for consistency
  hourly_rate?: string;
}): Promise<{ data: ShiftNeed[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('shift_needs')
      .select(`
        *,
        employer:employer_id (full_name, pharmacy_name, email)
      `);

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo);
    }
    if (filters.role && filters.role !== 'all') {
      query = query.eq('required_role', filters.role);
    }
    if (filters.employerId) {
      query = query.eq('employer_id', filters.employerId);
    }
    if (filters.isUrgent === true) { // Check specifically for true
      query = query.eq('is_urgent', true);
    }
    if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters.searchTerm) {
      const st = `%${filters.searchTerm.toLowerCase()}%`;
      query = query.or(`title.ilike.${st},location.ilike.${st},description.ilike.${st},employer.full_name.ilike.${st},employer.pharmacy_name.ilike.${st}`);
    }

    // Default sorting, can be made configurable.
    // To sort urgent shifts first by default at DB level (optional, as frontend also sorts):
    // query = query.order('is_urgent', { ascending: false }); // Urgent true comes first
    query = query.order('date', { ascending: false }).order('start_time', { ascending: true });


    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all shifts for admin:', error);
      throw error;
    }

    const processedData = (data || []).map(shift => ({
      ...shift,
      employer_name: shift.employer?.pharmacy_name || shift.employer?.full_name || 'Okänd arbetsgivare',
      required_experience: Array.isArray(shift.required_experience) ? shift.required_experience : [],
    }));

    return { data: processedData as ShiftNeed[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ett fel inträffade vid hämtning av alla pass för admin.';
    console.error(message, err);
    return { data: null, error: message };
  }
}

export async function deleteShift(
  shiftId: string,
  employerId: string, // Keep this for ownership check if not admin
  currentUserRole?: UserRole | 'anonymous', // Added current user role
  currentUserId?: string // Added current user ID
): Promise<{ success: boolean; error: string | null }> {
  if (!shiftId) {
    return { success: false, error: "Shift ID is required." };
  }
  if (!currentUserId) {
    return { success: false, error: "User not authenticated for deletion." };
  }

  console.log(`Attempting to delete shift ${shiftId} by user ${currentUserId} (role: ${currentUserRole})`);
  try {
    let query = supabase
      .from('shift_needs')
      .delete()
      .eq('id', shiftId);

    // If the user is an employer, they can only delete their own shifts.
    // Admins can delete any shift.
    if (currentUserRole === 'employer') {
      query = query.eq('employer_id', currentUserId);
    } else if (currentUserRole !== 'admin') {
      // Other roles (employees) should not be able to delete shifts directly.
      return { success: false, error: "You do not have permission to delete this shift." };
    }
    // If admin, no additional employer_id filter is needed, they can delete any.

    const { error } = await query;

    if (error) {
      console.error("Error deleting shift:", error);
      if (error.code === 'PGRST116') { // Resource not found or RLS prevented
        return { success: false, error: "Shift not found or you don't have permission to delete it." };
      }
      throw error;
    }
    console.log(`Shift ${shiftId} deleted successfully.`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Exception during shift deletion:", err);
    return { success: false, error: err.message || "An unexpected error occurred while deleting the shift." };
  }
}


export async function duplicateShift(
  originalShiftId: string,
  employerId: string
): Promise<{ data: ShiftNeed | null; error: string | null }> {
  if (!originalShiftId || !employerId) {
    return { data: null, error: "Original Shift ID and Employer ID are required." };
  }
  console.log(`Attempting to duplicate shift ${originalShiftId} for employer ${employerId}`);

  try {
    const { data: originalShift, error: fetchError } = await supabase
      .from('shift_needs')
      .select('*')
      .eq('id', originalShiftId)
      .eq('employer_id', employerId)
      .single();

    if (fetchError || !originalShift) {
      console.error("Error fetching original shift for duplication:", fetchError);
      return { data: null, error: "Original shift not found or permission denied." };
    }

    const newShiftData: Omit<ShiftNeed, 'id' | 'created_at' | 'updated_at' | 'status' | 'shift_applications' | 'employer' | 'payroll_processed' | 'payroll_record_id' | 'reviewed_by_admin' | 'assigned_to'> & { employer_id: string; status: 'open' } = {
      employer_id: employerId,
      title: `${originalShift.title || 'Shift'} (Copy)`,
      description: originalShift.description,
      date: originalShift.date,
      start_time: originalShift.start_time,
      end_time: originalShift.end_time,
      required_experience: originalShift.required_experience,
      status: 'open',
      required_role: originalShift.required_role,
      location: originalShift.location,
      lunch: originalShift.lunch, // Assuming 'lunch' interval string on ShiftNeed
      lunch_duration_minutes: originalShift.lunch_duration_minutes, // And also this if present
      is_urgent: originalShift.is_urgent,
      urgent_pay_adjustment: originalShift.urgent_pay_adjustment,
      hourly_rate: originalShift.hourly_rate,
    };

    const { data: duplicatedShift, error: insertError } = await supabase
      .from('shift_needs')
      .insert(newShiftData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting duplicated shift:", insertError);
      throw insertError;
    }
    if (!duplicatedShift) {
      return { data: null, error: "Failed to retrieve duplicated shift data after creation." };
    }
    console.log(`Shift ${originalShiftId} duplicated successfully. New ID: ${duplicatedShift.id}`);
    return { data: duplicatedShift as ShiftNeed, error: null };
  } catch (err: any) {
    console.error("Exception during shift duplication:", err);
    return { data: null, error: err.message || "An unexpected error occurred while duplicating the shift." };
  }
}

export async function applyForShift(
  shiftId: string,
  notes?: string | null
): Promise<{ success: boolean; data: any | null; error: string | null }> {
  if (!shiftId) {
    return { success: false, data: null, error: "Shift ID is required." };
  }
  // console.log(`Attempting to apply for shift ${shiftId} with notes: "${notes || ''}"`); // More detailed log

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, data: null, error: "User not authenticated. Please log in." };
    }

    // console.log(`User ${user.id} calling RPC create_shift_application for shift: ${shiftId}`);
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_shift_application', {
      p_shift_id: shiftId,
      p_notes: notes?.trim() || null,
    });

    // Log the raw response from the RPC
    // console.log(`RPC create_shift_application raw response - rpcResult:`, JSON.stringify(rpcResult, null, 2), `rpcError:`, JSON.stringify(rpcError, null, 2));

    if (rpcError) {
      console.error("Error applying for shift via RPC (rpcError object):", rpcError);
      let userMessage = rpcError.message || "Misslyckades att skicka ansökan (RPC error).";
      if (rpcError.message.includes('You have already applied') || rpcError.message.includes('Du har redan en aktiv ansökan')) {
        userMessage = 'Du har redan ansökt till detta pass.';
      } else if (rpcError.message.includes('This shift is not open') || rpcError.message.includes('är inte öppet')) {
        userMessage = 'Detta pass är inte längre öppet för ansökningar.';
      } else if (rpcError.message.includes('Permission Denied') || rpcError.message.includes('Verification Required') || rpcError.message.includes('Account Inactive') || rpcError.message.includes('Role Mismatch')) {
        userMessage = rpcError.message; // Use the direct message from these specific exceptions
      }
      return { success: false, data: null, error: userMessage };
    }

    // Check if the RPC, despite no rpcError, returned a JSON object with an "error" key (from your EXCEPTION block)
    if (rpcResult && typeof rpcResult === 'object' && rpcResult !== null && 'error' in rpcResult && rpcResult.error) {
      console.error("RPC create_shift_application returned an error object in its data:", rpcResult.error);
      let userFacingError = String(rpcResult.error);
       // Potentially map SQLERRM to more user-friendly messages if needed
      if (userFacingError.includes('Du har redan en aktiv ansökan')) {
          userFacingError = 'Du har redan ansökt till detta pass.';
      } else if (userFacingError.includes('är inte öppet')) {
          userFacingError = 'Detta pass är inte längre öppet för ansökningar.';
      }
      return { success: false, data: null, error: userFacingError };
    }

    // **Stricter Success Check:**
    // Ensure rpcResult is an object and contains the 'id' of the new application
    if (rpcResult && typeof rpcResult === 'object' && rpcResult !== null && 'id' in rpcResult && rpcResult.id) {
      console.log(`Application for shift ${shiftId} seems successful. RPC Result:`, rpcResult);
      return { success: true, data: rpcResult, error: null };
    }

    // If none of the above, the RPC might have returned null or an unexpected valid JSON without an 'id' or 'error'
    console.warn(`RPC create_shift_application for shift ${shiftId} returned an unexpected or empty successful-looking response. Result:`, rpcResult);
    return { success: false, data: null, error: "Ansökan kunde inte bekräftas. Försök igen eller kontakta support. (Unexpected RPC response)" };

  } catch (err: any) {
    console.error("Exception caught in applyForShift (lib/shifts.ts):", err);
    return { success: false, data: null, error: err.message || "Ett oväntat serverfel inträffade vid ansökan." };
  }
}

/**
 * Updates the status of a specific shift. This is a generic helper.
 * @param shiftId The ID of the shift to update.
 * @param newStatus The new status to set for the shift.
 * @returns An object with success status and data or an error message.
 */
export async function updateShiftStatus(shiftId: string, newStatus: string) {
    try {
        const { data, error } = await supabase
            .from('shift_needs')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', shiftId)
            .select()
            .single();

        if (error) {
            console.error('Error updating shift status:', error);
            throw new Error(`Kunde inte uppdatera pass-status: ${error.message}`);
        }

        return { success: true, data };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function getPendingApplicationDetails(employerId: string): Promise<{ data: PendingApplicationDetail[] | null; error: string | null }> {
  if (!employerId) {
    return { data: null, error: "Employer ID is required." };
  }
  try {
    const { data, error } = await supabase.rpc('get_employer_pending_application_details', {
      p_employer_id: employerId,
    });

    if (error) {
      console.error('Error fetching pending application details via RPC:', error);
      return { data: null, error: error.message || 'Failed to fetch pending details' };
    }
    return { data: (data as PendingApplicationDetail[]) || [], error: null };
  } catch (error) {
    console.error('Error in getPendingApplicationDetails helper:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error getting pending application details',
    };
  }
}

export async function acceptApplication(applicationId: string, shiftId: string): Promise<{ success: boolean; error: string | null }> {
  if (!applicationId || !shiftId) {
    return { success: false, error: "Application ID and Shift ID are required." };
  }
  try {
    console.log(`Calling RPC accept_application for app: ${applicationId}, shift: ${shiftId}`);
    const { data, error } = await supabase.rpc('accept_application', {
      p_application_id: applicationId,
      p_shift_id: shiftId,
    });
    console.log('RPC accept_application result:', { data, error });

    if (error) {
      console.error('Error accepting application via RPC:', error);
      return { success: false, error: error.message || 'Failed to accept application via RPC' };
    }
    if (data === false) {
      console.warn('Accept RPC returned false, likely an issue within the SQL function (e.g., shift already filled).');
      return { success: false, error: 'Acceptance failed. The shift might already be filled or another issue occurred.' };
    }
    return { success: true, error: null };
  } catch (error) {
    console.error('Catastrophic error in acceptApplication helper:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept application',
    };
  }
}

export async function rejectApplication(applicationId: string): Promise<{ success: boolean; error: string | null }> {
  if (!applicationId) {
    return { success: false, error: "Application ID is required." };
  }
  try {
    console.log(`Calling RPC reject_application for app: ${applicationId}`);
    const { data, error } = await supabase.rpc('reject_application', {
      p_application_id: applicationId,
    });
    console.log('RPC reject_application result:', { data, error });

    if (error) {
      console.error('Error rejecting application via RPC:', error);
      return { success: false, error: error.message || 'Failed to reject application via RPC' };
    }
    if (data === false) {
      console.warn('Reject RPC returned false, likely an issue within the SQL function.');
      return { success: false, error: 'Rejection failed (Database operation error).' };
    }
    return { success: true, error: null };
  } catch (error) {
    console.error('Catastrophic error in rejectApplication helper:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject application',
    };
  }
}

export async function createShift(shiftData: CreateShiftData & { hourly_rate: number }): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user found');

    const createdShifts = [];
    for (const dateInfo of shiftData.dates) {
      const rpcParams = {
        p_title: shiftData.title,
        p_description: shiftData.description,
        p_date: dateInfo.date,
        p_start_time: dateInfo.start_time,
        p_end_time: dateInfo.end_time,
        p_lunch: shiftData.lunch,
        p_required_experience: shiftData.required_experience ?? [],
        p_status: 'open',
        p_location: shiftData.location,
        p_required_role: shiftData.required_role,
        p_is_urgent: shiftData.is_urgent,
        p_urgent_pay_adjustment: shiftData.urgent_pay_adjustment,
        p_hourly_rate: shiftData.hourly_rate // ** ADDED PARAMETER **
      };

      const { data: shiftResult, error: shiftError } = await supabase.rpc('create_shift', rpcParams);
      if (shiftError) {
        throw new Error(shiftError.message);
      }
      // 2. Check if the database function itself returned an error in its JSON response
      if (shiftResult && shiftResult.error) {
        throw new Error(shiftResult.error);
      }
      
      if (shiftResult) {
        createdShifts.push(shiftResult);
      } else {
        // This case indicates something went wrong but didn't produce an error
        throw new Error("Shift creation did not return the expected result from the database.");
      }
    }    
    return { data: createdShifts, error: null };
  } catch (error) {
    console.error('Error in createShift function:', error);
    const message = error instanceof Error ? error.message : 'Failed to create shifts due to an unexpected error.';
    return { data: null, error: message };
  }
}

export async function updateShift(
    shiftId: string,
    shiftData: UpdateShiftData & { hourly_rate?: number | null }
): Promise<{ success: boolean; error: string | null }> {
  if (!shiftId) return { success: false, error: "Shift ID is required." };

  try {
    const rpcParams = {
      shift_id: shiftId,
      shift_title: shiftData.title,
      shift_description: shiftData.description,
      shift_date: shiftData.date,
      shift_start_time: shiftData.start_time,
      shift_end_time: shiftData.end_time,
      shift_lunch: shiftData.lunch,
      shift_status: shiftData.status,
      shift_required_experience: shiftData.required_experience,
      shift_location: shiftData.location,
      shift_required_role: shiftData.required_role,
      shift_is_urgent: shiftData.is_urgent,
      shift_urgent_pay_adjustment: shiftData.urgent_pay_adjustment,
      shift_hourly_rate: shiftData.hourly_rate // ** ADDED PARAMETER **
    };

    // This logic to remove undefined keys is important for COALESCE to work
    Object.keys(rpcParams).forEach(key => (rpcParams as any)[key] === undefined && delete (rpcParams as any)[key]);
    
    const { data: rpcReturnedBoolean, error } = await supabase.rpc('update_shift', rpcParams);

    if (error) throw error;
    if (rpcReturnedBoolean === false) return { success: false, error: "Update failed. The shift may not have been found or you do not have permission." };
    
    return { success: true, error: null };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function fetchEmployerShifts(employerId: string): Promise<{ data: ShiftNeed[] | null; error: string | null }> {
  if (!employerId) {
    return { data: null, error: "Employer ID is required." };
  }
  try {
    const { data, error } = await supabase
      .from('shift_needs')
      .select(`
        *,
        employer:profiles (full_name, pharmacy_name, email),
        shift_applications (
          id,
          status,
          applicant_id,
          profiles (
            full_name,
            email,
            role
          )
        )
      `)
      .eq('employer_id', employerId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    const processedData = (data || []).map(shift => ({
      ...shift,
      required_experience: Array.isArray(shift.required_experience) ? shift.required_experience : [],
      shift_applications: Array.isArray(shift.shift_applications) ? shift.shift_applications : [],
    }));
    return { data: processedData as ShiftNeed[], error: null };
  } catch (error) {
    console.error('Error fetching employer shifts:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error fetching shifts',
    };
  }
}

function getAllowedRequiredRoles(userRole: UserRole): UserRole[] {
  switch (userRole) {
    case 'pharmacist':
      return ['pharmacist', 'egenvårdsrådgivare', 'säljare']; // Pharmacists can now also see säljare shifts
    case 'egenvårdsrådgivare':
      return ['egenvårdsrådgivare', 'säljare'];
    case 'säljare':
      return ['säljare'];
    case 'admin':
      return ['pharmacist', 'säljare', 'egenvårdsrådgivare'];
    default:
      return [];
  }
}

// MODIFIED fetchAvailableShifts
export async function fetchAvailableShifts(
  userRole: UserRole,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    location?: string;
    isUrgent?: boolean;
  }
): Promise<{ data: ShiftNeed[] | null; error: string | null }> {
  try {
    const allowedRoles = getAllowedRequiredRoles(userRole);
    if (allowedRoles.length === 0 && userRole !== 'admin') {
      return { data: [], error: null };
    }

    let query = supabase
      .from('shift_needs')
      .select(`
        *,
        employer:profiles (
          full_name,
          pharmacy_name,
          email
        )
      `)
      .eq('status', 'open')
      .gte('date', new Date().toISOString().split('T')[0]);

    if (userRole !== 'admin') {
      query = query.in('required_role', allowedRoles);
    }
    if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('date', filters.dateTo);
    if (filters?.location) query = query.ilike('location', `%${filters.location}%`);
    if (filters?.isUrgent === true) query = query.eq('is_urgent', true);

    query = query.order('date', { ascending: true }).order('start_time', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data as ShiftNeed[]) || [], error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching available shifts';
    return { data: null, error: message };
  }
}

export async function getShiftStats(userId: string): Promise<{ data: any | null; error: string | null }> {
  if (!userId) return { data: null, error: "User ID is required." };
  try {
    const { data, error } = await supabase.rpc('get_shift_stats', { user_id: userId });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting shift stats:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error getting shift stats',
    };
  }
}

export async function getPendingApplicationsCount(employerId: string): Promise<{ data: number | null; error: string | null }> {
  if (!employerId) return { data: null, error: "Employer ID is required." };
  try {
    const { data, error } = await supabase.rpc('get_employer_pending_applications_count', {
      p_employer_id: employerId,
    });
    if (error) {
      console.error('Error fetching pending applications count via RPC:', error);
      return { data: null, error: error.message || 'Failed to fetch pending count' };
    }
    return { data: data as number ?? 0, error: null };
  } catch (error) {
    console.error('Error in getPendingApplicationsCount helper:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error getting pending applications count',
    };
  }
}

export async function canViewShift(shiftId: string): Promise<{ data: boolean; error: string | null }> {
  if (!shiftId) return { data: false, error: "Shift ID is required." };
  try {
    const { data, error } = await supabase.rpc('can_view_shift', { shift_id_param: shiftId });
    if (error) throw error;
    return { data: !!data, error: null };
  } catch (error) {
    console.error('Error checking shift access:', error);
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Error checking shift access',
    };
  }
}

interface UpdateShiftData {
  title?: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  start_time?: string; // HH:MM:SS
  end_time?: string; // HH:MM:SS
  lunch?: string | null; // Interval string 'HH:MM:SS' or null
  status?: 'open' | 'filled' | 'cancelled' | 'completed';
  location?: string;
  required_experience?: string[];
  required_role?: UserRole;
  is_urgent?: boolean;
  urgent_pay_adjustment?: number | null;
  lunch_duration_minutes?: number | null; // Keep if used for other logic, but your SQL uses 'lunch' interval
  hourly_rate?: number | null; // Keep if your SQL or frontend logic uses it, though not in current SQL update_shift
  // employer_id?: string; // Usually not updated directly, ownership is key
}

/**
 * Updates an existing shift using the 'update_shift' RPC call.
 * @param shiftId - The ID of the shift to update.
 * @param shiftData - The data to update the shift with.
 * @returns Object indicating success or error. The RPC returns BOOLEAN (FOUND).
 */



export async function withdrawApplication(applicationId: string): Promise<{ success: boolean; error: string | null }> {
  if (!applicationId) return { success: false, error: "Application ID is required." };
  try {
    const { data, error } = await supabase.rpc('withdraw_application', {
      p_application_id: applicationId,
    });
    if (error) {
      console.error('Error withdrawing application via RPC:', error);
      return { success: false, error: error.message || 'Failed to withdraw application via RPC' };
    }
    return { success: !!data, error: null };
  } catch (error) {
    console.error('Error in withdrawApplication helper:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to withdraw application' };
  }
}

export async function getUnreadNotifications(): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('get_unread_notifications');
    if (error) throw error;
    return { data: (data as any[]) || [], error: null };
  } catch (err) {
    console.error("Error fetching notifications:", err);
    const message = err instanceof Error ? err.message : 'Error fetching notifications';
    return { data: null, error: message };
  }
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean; error: string | null }> {
  if (!notificationId) return { success: false, error: "Notification ID is required." };
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
    if (error) throw error;
    return { success: !!data, error: null };
  } catch (err) {
    console.error("Error marking notification read:", err);
    const message = err instanceof Error ? err.message : 'Error marking notification read';
    return { success: false, error: message };
  }
}

export async function markAllNotificationsRead(): Promise<{ data: number | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');
    if (error) throw error;
    return { data: (data as number) ?? 0, error: null };
  } catch (err) {
    console.error("Error marking all notifications read:", err);
    const message = err instanceof Error ? err.message : 'Error marking all notifications read';
    return { data: 0, error: message };
  }
}