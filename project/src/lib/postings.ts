// src/lib/postings.ts
// src/lib/postings.ts
import { supabase } from './supabase'; // Adjust path as needed
// Adjust paths for types as needed
import type { JobPosting, JobPostingApplication } from '../types';
import type { Database } from '../types/database';
import type { JobPosting, UserRole } from '../types'; // Ensure UserRole is imported


// --- TYPE DEFINITIONS (Keep from previous step or import) ---
type CreatePostingData = Database['public']['Tables']['job_postings']['Insert'];
type UpdatePostingData = Partial<Omit<Database['public']['Tables']['job_postings']['Update'], 'id'>>;
type CreatePostingDataForAdmin = Omit<Database['public']['Tables']['job_postings']['Insert'], 'employer_id' | 'id' | 'created_at' | 'updated_at'>;


// Define type for the detailed application data returned by get_posting_applications
type PostingApplicationWithDetails = Database['public']['Functions']['get_posting_applications']['Returns'][number];
// Define type for the detailed application data returned by get_my_posting_applications
type MyPostingApplicationWithDetails = Database['public']['Functions']['get_my_posting_applications']['Returns'][number];


export async function updatePostingStatus(
    postingId: string,
    newStatus: 'open' | 'filled' | 'cancelled' | 'completed' // Add other valid statuses
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('job_postings')
            .update({ status: newStatus, updated_at: new Date().toISOString() }) // Also update updated_at
            .eq('id', postingId);
        if (error) throw error;
        return { success: true, error: null };
    } catch (error: any) {
        console.error('Error updating posting status:', error);
        return { success: false, error: error.message || 'Failed to update posting status.' };
    }
}

export async function adminCreatePosting(
    targetEmployerId: string,
    postingData: CreatePostingDataForAdmin // Use the more specific type matching your form, less employer_id
): Promise<{ data: JobPosting | null; error: string | null }> {
    try {
        if (!targetEmployerId) {
            throw new Error("Target Employer ID is required for admin to create posting.");
        }
        // Basic client-side validation (RPC has more)
        if (!postingData.title || !postingData.description || !postingData.required_role || !postingData.period_start_date || !postingData.period_end_date) {
            throw new Error("Missing required fields for job posting (title, description, role, period dates).");
        }

        const { data: result, error: rpcError } = await supabase
            .rpc('admin_create_job_posting', {
                p_target_employer_id: targetEmployerId,
                p_title: postingData.title,
                p_description: postingData.description,
                p_required_role: postingData.required_role, // Ensure this is 'pharmacist', 'säljare', or 'egenvårdsrådgivare'
                p_period_start_date: postingData.period_start_date,
                p_period_end_date: postingData.period_end_date,
                p_required_experience: postingData.required_experience || null,
                p_location: postingData.location || null,
                p_estimated_hours: postingData.estimated_hours || null,
                p_salary_description: postingData.salary_description || null,
                p_status: postingData.status || 'open', // Default to 'open' if not provided
                p_hourly_rate: postingData.hourly_rate,
                p_schedules: postingData.schedules,
              p_specific_work_times: postingData.specific_work_times 
            });

        if (rpcError) {
          console.error("RPC Error [admin_create_job_posting]:", rpcError);
          throw new Error(rpcError.message || "Database error during admin posting creation.");
        }

        // The RPC returns JSONB, check if it's an error structure from the EXCEPTION block
        if (result && result.error) {
            console.error("RPC Exception [admin_create_job_posting]:", result.error);
            throw new Error(String(result.error));
        }
        
        // Assuming the RPC returns the full posting object on success
        return { data: result as JobPosting, error: null };

    } catch (error) {
        console.error("Error in adminCreatePosting library function:", error);
        const message = error instanceof Error ? error.message : "Failed to create job posting as admin.";
        return { data: null, error: message };
    }
}

// --- NEW ADMIN FUNCTION ---

type AdminUpdatePostingData = Partial<Omit<Database['public']['Tables']['job_postings']['Update'], 'id' | 'employer_id' | 'created_at' | 'updated_at'>>;





/**
 * Allows an Admin to update an existing job posting using the admin_update_job_posting RPC.
 * @param postingId - The ID of the posting to update.
 * @param updateData - An object containing the fields to update.
 * @returns Object indicating success or error.
 */
export async function adminUpdatePosting(
    postingId: string,
    updateData: AdminUpdatePostingData
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!postingId) throw new Error("Posting ID is required for admin update.");

        // Construct the parameters for the RPC call
        // Ensure parameter names (p_...) match your admin_update_job_posting SQL function
        const rpcParams = {
            p_posting_id: postingId,
            p_title: updateData.title,
            p_description: updateData.description,
            p_required_role: updateData.required_role,
            p_period_start_date: updateData.period_start_date,
            p_period_end_date: updateData.period_end_date,
            p_required_experience: updateData.required_experience,
            p_location: updateData.location,
            p_estimated_hours: updateData.estimated_hours,
            p_salary_description: updateData.salary_description,
            p_status: updateData.status,
            p_hourly_rate: updateData.hourly_rate,
            p_schedules: updateData.schedules,
          p_specific_work_times: updateData.specific_work_times 
        };
        
        // Remove undefined properties so COALESCE works correctly in SQL for fields not being updated
        Object.keys(rpcParams).forEach(key => rpcParams[key] === undefined && delete rpcParams[key]);


        const { data: success, error: rpcError } = await supabase
            .rpc('admin_update_job_posting', rpcParams);

        if (rpcError) {
          console.error("RPC Error [admin_update_job_posting]:", rpcError);
          throw new Error(rpcError.message || "Database error during admin posting update.");
        }
        
        // The RPC returns a boolean
        if (success === false) {
          // This could mean the posting was not found, or an issue occurred within the RPC not raising an exception
          console.warn(`Admin update for posting ${postingId} returned false from RPC.`);
          // It might be better for the RPC to RAISE EXCEPTION if posting not found, so it's caught by rpcError.
          // If it can legitimately return false for "no rows updated but no error", this handling is okay.
          throw new Error("Admin update operation did not modify the posting (it may not exist or no changes were applicable).");
        }

        return { success: true, error: null };

    } catch (error) {
        console.error("Error in adminUpdatePosting library function:", error);
        const message = error instanceof Error ? error.message : "Failed to update job posting as admin.";
        return { success: false, error: message };
    }
}

/**
 * Allows an Admin to delete a specific job posting using the admin_delete_job_posting RPC.
 * @param postingId - The ID of the posting to delete.
 * @returns Object indicating success or error.
 */
export async function adminDeletePosting(
    postingId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!postingId) throw new Error("Posting ID is required for admin deletion.");

        const { data: success, error: rpcError } = await supabase
            .rpc('admin_delete_job_posting', { p_posting_id: postingId });

        if (rpcError) {
          console.error("RPC Error [admin_delete_job_posting]:", rpcError);
          throw new Error(rpcError.message || "Database error during admin posting deletion.");
        }
        
        // The RPC returns a boolean
        if (success === false) {
           console.warn(`Admin delete for posting ${postingId} returned false from RPC (may indicate posting not found).`);
           throw new Error("Admin delete operation failed (posting may not exist or another issue occurred).");
        }
        
        return { success: true, error: null };

    } catch (error) {
        console.error("Error in adminDeletePosting library function:", error);
        const message = error instanceof Error ? error.message : "Failed to delete job posting as admin.";
        return { success: false, error: message };
    }
}



/**
 * Fetches ALL job postings for admin view, including employer details.
 * @returns Object with an array of all postings or an error.
 */
export async function fetchAllPostingsAdmin(filters?: {
    status?: string | null;
    searchTerm?: string | null;
    employerId?: string | null;
    role?: UserRole | null;
}): Promise<{ data: JobPosting[] | null; error: string | null }> {
    try {
        let query = supabase
            .from('job_postings')
           .select('*, employer: profiles(full_name, pharmacy_name)')

        if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        if (filters?.employerId) {
            query = query.eq('employer_id', filters.employerId);
        }
        if (filters?.role) {
            query = query.eq('required_role', filters.role);
        }
        if (filters?.searchTerm) {
            const st = `%${filters.searchTerm.toLowerCase()}%`;
            query = query.or(`title.ilike.${st},description.ilike.${st},location.ilike.${st},employer.full_name.ilike.${st},employer.pharmacy_name.ilike.${st}`);
        }

        const { data, error: fetchError } = await query.order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        
        // Process data to ensure employer_name is available at the top level for convenience
        const processedData = (data || []).map(p => ({
            ...p,
            employer_name: p.employer?.pharmacy_name || p.employer?.full_name || 'Unknown Employer'
        }));

        return { data: processedData as JobPosting[], error: null };
    } catch (error) {
        console.error("Error fetching all job postings for admin:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch job postings for admin.";
        return { data: null, error: message };
    }
}


export async function fetchMyAppliedPostingIds(userId: string): Promise<{ data: string[] | null, error: string | null }> {
    if (!userId) {
        return { data: [], error: null }; // No user, so no applications
    }
    try {
        const { data, error } = await supabase
            .from('job_posting_applications') // Replace 'job_applications' with your actual table name
            .select('job_posting_id')      // Select only the posting_id
            .eq('applicant_id', userId);    // Filter by the current user's ID (adjust column name if needed)

        if (error) {
            console.error("Error fetching user's applications:", error);
            return { data: null, error: error.message };
        }
        // Extract just the posting_id values into an array of strings
        const appliedIds = data ? data.map(app => app.posting_id) : [];
        return { data: appliedIds, error: null };

    } catch (e) {
        console.error("Catch error fetching user's applications:", e);
        const message = e instanceof Error ? e.message : "An unexpected error occurred";
        return { data: null, error: message };
    }
}

/**
 * Marks a job posting as completed and triggers payroll record creation.
 * @param postingId - The ID of the job posting to mark as completed.
 * @param assignedEmployeeId - The ID of the employee assigned to and completing this posting.
 * @returns Object indicating success or error.
 */
export async function processPostingForPayroll(
  postingId: string,
  employeeId: string
): Promise<{ new_payroll_record_id?: string; error?: string | null }> {
  try {
    if (!postingId || !employeeId) {
      throw new Error('Posting ID and Employee ID are required.');
    }

    const { data, error } = await supabase.rpc(
      'create_payroll_record_for_posting',
      {
        p_posting_id: postingId,
        p_employee_id: employeeId,
      }
    );

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    
    return { new_payroll_record_id: data.new_payroll_record_id, error: null };

  } catch (error) {
    console.error('Error processing posting for payroll:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: message };
  }
}

/**
 * Creates a new job posting.
 * @param postingData - The data for the new posting.
 * @returns Object with the created posting data or an error.
 */
export async function createPosting(
    postingData: Omit<CreatePostingData, 'employer_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: JobPosting | null; error: string | null }> {
    try {
        if (!postingData.title || !postingData.description || !postingData.required_role || !postingData.period_start_date || !postingData.period_end_date) {
            throw new Error("Missing required fields for job posting (title, description, role, period dates).");
        }

        const { data: result, error: rpcError } = await supabase
            .rpc('create_job_posting', {
                p_title: postingData.title,
                p_description: postingData.description,
                p_required_role: postingData.required_role,
                p_period_start_date: postingData.period_start_date,
                p_period_end_date: postingData.period_end_date,
                p_required_experience: postingData.required_experience || null,
                p_location: postingData.location || null,
                p_estimated_hours: postingData.estimated_hours || null,
                p_salary_description: postingData.salary_description || null,
                p_status: postingData.status || 'open',
                // V-- THE FIX IS HERE --V
                p_hourly_rate: postingData.hourly_rate,
                p_schedules: postingData.schedules,
                // ^-- THE FIX IS HERE --^
             
              p_specific_work_times: postingData.specific_work_times 
            });

        if (rpcError) {
          console.error("RPC Error [create_job_posting]:", rpcError);
          throw new Error(rpcError.message || "Database error during posting creation.");
        }

        if (result && result.error) {
            console.error("RPC Exception [create_job_posting]:", result.error);
            throw new Error(String(result.error));
        }
        
        return { data: result as JobPosting, error: null };

    } catch (error) {
        console.error("Error in createPosting library function:", error);
        const message = error instanceof Error ? error.message : "Failed to create job posting.";
        return { data: null, error: message };
    }
}

export interface PostingFinancials {
    total_hours: number;
    base_pay: number;
    total_ob_premium: number;
    final_total_pay: number;
    ob_details: {
        ob_50_hours: number;
        ob_75_hours: number;
        ob_100_hours: number;
    };
    error?: string;
}

export async function getPostingFinancials(postingId: string): Promise<PostingFinancials | null> {
    try {
        const { data, error } = await supabase.rpc('calculate_posting_financials', {
            p_posting_id: postingId,
        });

        if (error) throw error;
        return data as PostingFinancials;
    } catch (error) {
        console.error("Error fetching posting financials:", error);
        return null;
    }
}


/**
 * Fetches job postings created by the currently authenticated employer.
 * @returns Object with an array of postings or an error.
 */
export async function fetchEmployerPostings(): Promise<{ data: JobPosting[] | null; error: string | null }> {
    try {
        const { data, error: rpcError } = await supabase.rpc('get_employer_job_postings');

        if (rpcError) throw rpcError;

        return { data: data as JobPosting[], error: null };

    } catch (error) {
        console.error("Error fetching employer job postings:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch job postings.";
        return { data: null, error: message };
    }
}

/**
 * Fetches available ('open') job postings for applicants with various filters.
 * IMPORTANT: Ensure your 'get_available_job_postings' RPC in Supabase is updated
 * to accept and apply all these 'p_' prefixed parameters.
 *
 * @param filters - An object containing various filter parameters.
 * @returns Object with an array of postings or an error.
 */
export async function fetchAvailablePostings(filters: {
    p_required_role?: string | null;
    p_search_query?: string | null;
    p_location_query?: string | null;
    p_date_from?: string | null;
    p_date_to?: string | null;
    p_experience_keywords?: string[] | null;
}): Promise<{ data: JobPosting[] | null; error: string | null }> {
    try {
        const { data, error: rpcError } = await supabase.rpc('get_available_job_postings', {
            p_required_role: filters.p_required_role,
            p_search_query: filters.p_search_query,
            p_location_query: filters.p_location_query,
            p_date_from: filters.p_date_from,
            p_date_to: filters.p_date_to,
            p_experience_keywords: filters.p_experience_keywords,
        });

        if (rpcError) throw rpcError;

       
        return { data: data as JobPosting[], error: null };

    } catch (error) {
        console.error("Error fetching available job postings:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch available postings.";
        return { data: null, error: message };
    }
}

/**
 * Updates an existing job posting.
 * @param postingId - The ID of the posting to update.
 * @param updateData - An object containing the fields to update.
 * @returns Object indicating success or error.
 */
export async function updatePosting(
    postingId: string,
    updateData: UpdatePostingData
): Promise<{ success: boolean; error: string | null }> {
     try {
        if (!postingId) throw new Error("Posting ID is required for update.");

        const { data: success, error: rpcError } = await supabase
            .rpc('update_job_posting', {
                p_posting_id: postingId,
                p_title: updateData.title,
                p_description: updateData.description,
                p_required_role: updateData.required_role,
                p_period_start_date: updateData.period_start_date,
                p_period_end_date: updateData.period_end_date,
                p_required_experience: updateData.required_experience,
                p_location: updateData.location,
                p_estimated_hours: updateData.estimated_hours,
                p_salary_description: updateData.salary_description,
                p_status: updateData.status,
                p_hourly_rate: updateData.hourly_rate,
                p_schedules: updateData.schedules,
             
              p_specific_work_times: updateData.specific_work_times 
            });

        if (rpcError) throw rpcError;
        if (!success) throw new Error("Update operation returned false (check permissions or ID).");

        return { success: true, error: null };

    } catch (error) {
        console.error("Error updating job posting:", error);
        const message = error instanceof Error ? error.message : "Failed to update job posting.";
        return { success: false, error: message };
    }
}

/**
 * Deletes a specific job posting.
 * @param postingId - The ID of the posting to delete.
 * @returns Object indicating success or error.
 */
export async function deletePosting(
    postingId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!postingId) throw new Error("Posting ID is required for deletion.");

        const { data: success, error: rpcError } = await supabase
            .rpc('delete_job_posting', { p_posting_id: postingId });

        if (rpcError) throw rpcError;
        if (!success) throw new Error("Delete operation returned false (check permissions or ID).");

        return { success: true, error: null };

    } catch (error) {
        console.error("Error deleting job posting:", error);
        const message = error instanceof Error ? error.message : "Failed to delete job posting.";
        return { success: false, error: message };
    }
}

// --- NEW: JOB POSTING APPLICATION FUNCTIONS ---

/**
 * Applies the current authenticated user to a specific job posting.
 * @param postingId - The ID of the job posting to apply for.
 * @param notes - Optional notes from the applicant.
 * @returns Object indicating success, the created application data (or null), and error message.
 */
export async function applyForPosting(
    postingId: string,
    notes?: string | null
): Promise<{ success: boolean; data: any | null; error: string | null }> {
    try {
        if (!postingId) throw new Error("Posting ID is required to apply.");

        const { data: result, error: rpcError } = await supabase
            .rpc('create_job_posting_application', {
                p_posting_id: postingId,
                p_notes: notes?.trim() || null
            });

        if (rpcError) throw rpcError;

        // Check if the RPC returned an error object within its result
        if (result && 'error' in result && result.error) {
            // Handle specific user-facing errors from the RPC
             if (result.error.includes('already applied')) {
                 return { success: false, data: null, error: 'You have already applied for this job posting.' };
             }
             if (result.error.includes('not open')) {
                 return { success: false, data: null, error: 'This job posting is no longer open for applications.' };
             }
            throw new Error(result.error); // Throw other DB-level errors
        }

        // Assuming RPC returns application details on success
        return { success: true, data: result ?? null, error: null };

    } catch (error) {
        console.error("Error applying for job posting:", error);
        const message = error instanceof Error ? error.message : "Failed to submit application.";
        return { success: false, data: null, error: message };
    }
}

/**
 * Fetches all applications for a specific job posting (for employer view).
 * @param postingId - The ID of the job posting.
 * @returns Object with an array of applications (including applicant details) or an error.
 */
export async function fetchPostingApplications(
    postingId: string
): Promise<{ data: PostingApplicationWithDetails[] | null; error: string | null }> {
     try {
        if (!postingId) throw new Error("Posting ID is required to fetch applications.");

        const { data, error: rpcError } = await supabase.rpc('get_posting_applications', {
            p_posting_id: postingId
        });

        if (rpcError) throw rpcError;

        return { data: data as PostingApplicationWithDetails[], error: null };

    } catch (error) {
        console.error("Error fetching job posting applications:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch applications.";
        return { data: null, error: message };
    }
}

interface MyPostingApplicationWithDetails {
    application_id: string;
    job_posting_id: string;
    application_status: string; // Matches RPC: application_status
    application_notes: string | null; // Matches RPC: application_notes
    applied_at: string;             // Matches RPC: applied_at
    posting_title: string;
    posting_period_start: string; // Matches RPC: posting_period_start
    posting_period_end: string;   // Matches RPC: posting_period_end
    posting_location: string | null;
    posting_status: string;
    employer_id: string;
    employer_name: string | null;
    // Note: The RPC you provided for get_my_posting_applications does NOT return
    // posting_description, posting_required_role, posting_required_experience,
    // posting_estimated_hours, or posting_salary_description.
    // If you need these in the PostingDetailsModal, you MUST add them to your RPC.
}
/**
 * Fetches all job posting applications submitted by the current authenticated user.
 * @returns Object with an array of the user's applications (including posting details) or an error.
 */
export async function fetchMyPostingApplications(): Promise<{ data: MyPostingApplicationWithDetails[] | null; error: string | null }> {
     try {
        const { data, error: rpcError } = await supabase.rpc('get_my_posting_applications');

        if (rpcError) throw rpcError;

        return { data: data as MyPostingApplicationWithDetails[], error: null };

    } catch (error) {
        console.error("Error fetching my job posting applications:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch your applications.";
        return { data: null, error: message };
    }
}

/**
 * Accepts a specific job posting application (Employer action).
 * This also updates the posting status and rejects other pending applications.
 * @param applicationId - The ID of the application to accept.
 * @returns Object indicating success or error.
 */
export async function acceptPostingApplication(
    applicationId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!applicationId) throw new Error("Application ID is required to accept.");

        const { data: success, error: rpcError } = await supabase.rpc('accept_posting_application', {
            p_application_id: applicationId
        });

        if (rpcError) throw rpcError;
        if (!success) throw new Error("Accept operation returned false (check permissions or ID).");

        return { success: true, error: null };

    } catch (error) {
        console.error("Error accepting job posting application:", error);
        const message = error instanceof Error ? error.message : "Failed to accept application.";
        return { success: false, error: message };
    }
}

/**
 * Rejects a specific job posting application (Employer action).
 * @param applicationId - The ID of the application to reject.
 * @returns Object indicating success or error.
 */
export async function rejectPostingApplication(
    applicationId: string
): Promise<{ success: boolean; error: string | null }> {
     try {
        if (!applicationId) throw new Error("Application ID is required to reject.");

        const { data: success, error: rpcError } = await supabase.rpc('reject_posting_application', {
            p_application_id: applicationId
        });

        if (rpcError) throw rpcError;
        if (!success) throw new Error("Reject operation returned false (check permissions or ID).");

        return { success: true, error: null };

    } catch (error) {
        console.error("Error rejecting job posting application:", error);
        const message = error instanceof Error ? error.message : "Failed to reject application.";
        return { success: false, error: message };
    }
}

/**
 * Withdraws a specific job posting application (Applicant action).
 * Only works if the application status is 'pending'.
 * @param applicationId - The ID of the application to withdraw.
 * @returns Object indicating success or error.
 */
export async function withdrawPostingApplication(
    applicationId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!applicationId) throw new Error("Application ID is required to withdraw.");

        const { data: success, error: rpcError } = await supabase.rpc('withdraw_posting_application', {
            p_application_id: applicationId
        });

         if (rpcError) {
             // Handle specific user-facing errors from the RPC
             if (rpcError.message.includes('Cannot withdraw application with status')) {
                 throw new Error('Cannot withdraw application: it has already been processed.');
             }
            throw rpcError; // Throw other DB-level errors
         }
        if (!success) throw new Error("Withdraw operation returned false (check permissions, ID, or status).");

        return { success: true, error: null };

    } catch (error) {
        console.error("Error withdrawing job posting application:", error);
        const message = error instanceof Error ? error.message : "Failed to withdraw application.";
        return { success: false, error: message };
    }
}

/**
 * Fetches all job postings where the current user's application has been accepted.
 * This is used for the "Mina uppdrag" (My Postings/Assignments) view for employees.
 *
 * @returns An object containing an array of JobPosting objects or an error message.
 */
export async function fetchMyAcceptedPostings(): Promise<{ data: JobPosting[] | null; error: string | null }> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { data: [], error: 'Not authenticated' };
    }

    try {
        // Step 1: Find all of the user's accepted applications to get the posting IDs.
        const { data: applications, error: applicationsError } = await supabase
            .from('job_posting_applications')
            .select('job_posting_id')
            .eq('applicant_id', user.id)
            .eq('status', 'accepted');

        if (applicationsError) {
            console.error("Error fetching user's accepted applications:", applicationsError);
            throw new Error("Could not retrieve your applications.");
        }

        if (!applications || applications.length === 0) {
            // If the user has no accepted applications, return an empty array.
            return { data: [], error: null };
        }

        // Step 2: Extract the job_posting_id from the applications.
        const postingIds = applications.map(app => app.job_posting_id);

        // Step 3: Fetch the full details for only those job postings.
        const { data: postings, error: postingsError } = await supabase
            .from('job_postings')
            .select(`
                *,
                employer: profiles(full_name, pharmacy_name)
            `)
            .in('id', postingIds)
            // You can also filter by status if you only want to see 'filled' or 'completed' postings.
            // .in('status', ['filled', 'completed']) 
            .order('period_start_date', { ascending: false });

        if (postingsError) {
            console.error("Error fetching accepted job postings:", postingsError);
            throw new Error("Could not retrieve your assigned job postings.");
        }
        
        // Return the fetched postings.
        const processedData = (postings || []).map(p => ({
            ...p,
            employer_name: p.employer?.pharmacy_name || p.employer?.full_name || 'Unknown Employer'
        }));


        return { data: processedData, error: null };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred while fetching your postings.";
        console.error(message, error);
        return { data: null, error: message };
    }
}

export async function fetchSinglePosting(
  postingId: string
): Promise<{ data: JobPosting | null; error: any | null }> {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('*, employer_profile:profiles!job_postings_employer_id_fkey(full_name, pharmacy_name)')
      .eq('id', postingId)
      .single();

    if (error) throw error;
    
    // Flatten the employer name for convenience
    const postingWithEmployerName = {
        ...data,
        employer_name: data.employer_profile?.pharmacy_name || data.employer_profile?.full_name || 'Okänd arbetsgivare'
    };

    return { data: postingWithEmployerName, error: null };
  } catch (error) {
    console.error("Error fetching single posting:", error);
    return { data: null, error };
  }
}

// --- Optional: Add function for applying to a job posting ---
// This would likely involve creating a new table `job_posting_applications`
// and corresponding RPC/lib functions, similar to how shifts work.
// Example:
// export async function applyForPosting(postingId: string, notes?: string | null) { ... }