// Import JSONValue type if needed, or use 'any'
import { JSONValue } from '@supabase/supabase-js'; // Example import path

export interface Database {
  public: {
    Tables: {

       // --- NEW: JOB POSTING APPLICATIONS TABLE ---
      job_posting_applications: {
        Row: {
          id: string; // uuid
          job_posting_id: string; // uuid
          applicant_id: string; // uuid
          status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; // text
          notes: string | null; // text
          created_at: string; // timestamptz
          updated_at: string; // timestamptz
        };
        Insert: {
          id?: string; // Default in DB
          job_posting_id: string; // Required
          applicant_id: string; // Required (usually auth.uid())
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; // Default 'pending'
          notes?: string | null; // Optional
          created_at?: string; // Default in DB
          updated_at?: string; // Default/Trigger in DB
        };
        Update: {
          id?: string;
          job_posting_id?: string; // Typically not updated
          applicant_id?: string; // Typically not updated
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; // Main field to update
          notes?: string | null; // Maybe allow editing notes?
          updated_at?: string; // Trigger handles this
        };
      }; // End job_posting_applications table

      // --- PROFILES TABLE ---
      profiles: {
        Row: { // Structure corresponding to your database columns
          id: string; // UUID, primary key, references auth.users(id)
          email: string; // Text, unique
          full_name: string; // Text
          role: 'employer' | 'pharmacist' | 'admin' | 'säljare' | 'egenvårdsrådgivare';
          pharmacy_name: string;
          pharmacy_manager_name: string;// Enum or text check constraint
          hourly_rate: number | null; // Numeric or float
          description: string | null; // Text
          experience: string[] | null; // Array of text (text[])
          systems: string[] | null; // Array of text (text[])
          profile_picture_url: string | null; // Text (URL to storage)
          created_at: string; // Timestamptz
          updated_at: string; // Timestamptz
          // Pharmacist specific (nullable)
          license_verified: boolean | null; // Boolean
          license_document: string | null; // Text (path in storage)
          // license_expiry: string | null; // REMOVED (was Date or Timestamptz)
        };
        Insert: { // Structure for inserting new rows
          id: string; // Must match auth.users id
          email: string;
          full_name: string;
          role: 'employer' | 'pharmacist' | 'admin' | 'säljare' | 'egenvårdsrådgivare';
          hourly_rate?: number | null;
          description?: string | null;
          experience?: string[] | null;
          systems?: string[] | null;
          profile_picture_url?: string | null;
          created_at?: string; // Default value in DB usually handles this
          updated_at?: string; // Default value in DB usually handles this
          license_number?: string | null;
          license_verified?: boolean | null; // Default usually false
          license_document?: string | null;
          // license_expiry?: string | null; // REMOVED
        };
        Update: { // Structure for updating rows (all fields optional)
          id?: string; // Usually not updated
          email?: string;
          full_name?: string;
          role?: 'employer' | 'pharmacist' | 'admin' | 'säljare' | 'egenvårdsrådgivare';
          hourly_rate?: number | null;
          description?: string | null;
          experience?: string[] | null;
          systems?: string[] | null;
          profile_picture_url?: string | null;
          updated_at?: string; // Trigger usually handles this
          license_number?: string | null;
          license_verified?: boolean | null;
          license_document?: string | null;
          // license_expiry?: string | null; // REMOVED
        };
      }; // End profiles table

      // --- SHIFT NEEDS TABLE --- 
      shift_needs: {
        Row: {
          id: string; // UUID, primary key
          employer_id: string; // UUID, foreign key to profiles(id)
          title: string; // Text
          description: string; // Text
          date: string; // Date
          start_time: string; // Time without timezone
          end_time: string; // Time without timezone
          required_experience: string[] | null; // Array of text (text[])
          status: 'open' | 'filled' | 'cancelled' | 'completed'; // Enum or text check constraint
          required_role: 'pharmacist' | 'säljare' | 'egenvårdsrådgivare' | null; // Role enum or text check constraint
          created_at: string; // Timestamptz
          updated_at: string; // Timestamptz
          location: string | null; // Text
          lunch: string | null; // Interval (or text representing interval like '00:30:00')
          hourly_rate: number | null; // Rate specific to this shift (optional)
          is_urgent: boolean;
          urgent_pay_adjustment: number | null; 
        };
        Insert: {
          id?: string; // Default value in DB usually handles this
          employer_id: string;
          title: string;
          description: string;
          date: string;
          start_time: string;
          end_time: string;
          required_experience?: string[] | null;
          status?: 'open' | 'filled' | 'cancelled' | 'completed'; // Default usually 'open'
          required_role: 'pharmacist' | 'säljare' | 'egenvårdsrådgivare' | null;
          created_at?: string;
          updated_at?: string;
          location?: string | null;
          lunch?: string | null;
          hourly_rate?: number | null;
          is_urgent?: boolean;
          urgent_pay_adjustment?: number | null;
        };
        Update: {
          id?: string;
          employer_id?: string;
          title?: string;
          description?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          required_experience?: string[] | null;
          is_urgent: boolean;
          urgent_pay_adjustment: number | null;
          status?: 'open' | 'filled' | 'cancelled' | 'completed';
          required_role?: 'pharmacist' | 'säljare' | 'egenvårdsrådgivare' | null;
          updated_at?: string;
          location?: string | null;
          lunch?: string | null;
          hourly_rate?: number | null; 
        };
      }; // End shift_needs table

      job_postings: {
        Row: { // Structure corresponding to your database columns
          id: string; // uuid, primary key
          employer_id: string; // uuid, foreign key to profiles(id)
          title: string; // text
          description: string; // text
          required_role: 'pharmacist' | 'säljare' | 'egenvårdsrådgivare'; // text check constraint
          required_experience: string[] | null; // text[]
          location: string | null; // text
          period_start_date: string; // date (YYYY-MM-DD string)
          period_end_date: string; // date (YYYY-MM-DD string)
          estimated_hours: string | null; // text
          salary_description: string | null; // text
          status: 'open' | 'filled' | 'cancelled'; // text check constraint
          created_at: string; // timestamptz string
          updated_at: string; // timestamptz string
  hourly_rate: number | null;
  schedules: Schedule[] | null;
          specific_dates: string[] | null; // <-- ADD THIS
        };
        Insert: { // Structure for inserting new rows
          id?: string; // Default value in DB usually handles this
          employer_id: string; // Required
          title: string; // Required
          description: string; // Required
          required_role: 'pharmacist' | 'säljare' | 'egenvårdsrådgivare'; // Required
          required_experience?: string[] | null; // Optional
          location?: string | null; // Optional
          period_start_date: string; // Required (YYYY-MM-DD string)
          period_end_date: string; // Required (YYYY-MM-DD string)
          estimated_hours?: string | null; // Optional
          salary_description?: string | null; // Optional
          status?: 'open' | 'filled' | 'cancelled'; // Default usually 'open'
          created_at?: string; // Default in DB
          updated_at?: string; // Default/Trigger in DB
          hourly_rate: number | null;
          days_of_week: number[] | null;
          start_time: string | null;
          end_time: string | null;
           schedules: Schedule[] | null;
          specific_dates: string[] | null; // <-- ADD THIS
        };
        Update: { // Structure for updating rows (all fields optional)
          id?: string; // Usually not updated
          employer_id?: string; // Usually not updated
          title?: string;
          description?: string;
          required_role?: 'pharmacist' | 'säljare' | 'egenvårdsrådgivare';
          required_experience?: string[] | null;
          location?: string | null;
          period_start_date?: string;
          period_end_date?: string;
          estimated_hours?: string | null;
          salary_description?: string | null;
          status?: 'open' | 'filled' | 'cancelled';
          updated_at?: string; // Trigger usually handles this
          hourly_rate: number | null;
          days_of_week: number[] | null;
          start_time: string | null;
          end_time: string | null;
              schedules: Schedule[] | null;
          specific_dates: string[] | null; // <-- ADD THIS
        };
      }; // End job_postings table

      export interface Contract {
      id: string;
      employer_id: string;
      employee_email: string;
      document_name: string;
      document_storage_path: string;
      status: 'draft' | 'sent' | 'signed' | 'declined';
      signing_provider?: string;
      signing_request_id?: string;
      signed_at?: string;
      created_at: string;
      updated_at: string;
    }


      // --- SHIFT APPLICATIONS TABLE ---
      shift_applications: {
          Row: {
              id: string; // UUID, primary key
              shift_id: string; // UUID, foreign key to shift_needs(id)
              applicant_id: string; // UUID, foreign key to profiles(id) (employee)
              status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; // Enum or text check constraint
              notes: string | null; // Text, applicant notes
              created_at: string; // Timestamptz
              updated_at: string; // Timestamptz
          };
          Insert: {
              id?: string;
              shift_id: string;
              applicant_id: string;
              status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; // Default 'pending'
              notes?: string | null;
              created_at?: string;
              updated_at?: string;
          };
          Update: {
              id?: string;
              shift_id?: string;
              applicant_id?: string;
              status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
              notes?: string | null;
              updated_at?: string;
          };
      }; // End shift_applications table

      // --- NOTIFICATIONS TABLE ---
      notifications: {
          Row: {
              id: string; // UUID, primary key
              user_id: string; // UUID, foreign key to profiles(id) (recipient)
              title: string; // Text
              message: string; // Text
              type: string; // Text (e.g., 'new_application', 'status_update', 'message')
              read: boolean; // Boolean
              created_at: string; // Timestamptz
              related_id: string | null; // UUID (optional link to related entity like shift_id or conversation_id)
          };
          Insert: {
              id?: string;
              user_id: string;
              title: string;
              message: string;
              type: string;
              read?: boolean; // Default false
              created_at?: string;
              related_id?: string | null;
          };
          Update: {
              id?: string;
              read?: boolean;
          };
      }; // End notifications table

      // --- CONVERSATIONS TABLE ---
      conversations: {
          Row: {
              id: string; // UUID, primary key
              created_at: string; // Timestamptz
              // Add other relevant fields if needed, e.g., last_message_timestamp
          };
          Insert: {
              id?: string;
              created_at?: string;
          };
          Update: {
              // Maybe update last_message_timestamp?
          };
      }; // End conversations table

      // --- CONVERSATION PARTICIPANTS TABLE ---
      conversation_participants: {
          Row: {
              conversation_id: string; // UUID, foreign key to conversations(id)
              user_id: string; // UUID, foreign key to profiles(id)
              joined_at: string; // Timestamptz
              // Primary key likely (conversation_id, user_id)
          };
          Insert: {
              conversation_id: string;
              user_id: string;
              joined_at?: string;
          };
          Update: {
              // Unlikely to update this table directly
          };
      }; // End conversation_participants table

      // --- MESSAGES TABLE ---
      messages: {
          Row: {
              id: string; // UUID, primary key
              conversation_id: string; // UUID, foreign key to conversations(id)
              sender_id: string; // UUID, foreign key to profiles(id)
              content: string; // Text
              created_at: string; // Timestamptz
              read: boolean; // Boolean (indicates if *other* participants have read it)
          };
          Insert: {
              id?: string;
              conversation_id: string;
              sender_id: string;
              content: string;
              created_at?: string;
              read?: boolean; // Default false
          };
          Update: {
              id?: string;
              read?: boolean; // Main update action
          };
      }; // End messages table

    }; // End Tables
    Functions: { // Define your RPC functions here
        get_employee_profiles_for_employer: { // Match function name
            Args: { // Arguments the function takes
                p_requesting_employer_id: string; // UUID
                p_search_term?: string | null;
                p_role?: string | null;
                p_worked_for_employer?: boolean | null;
                p_min_experience?: string[] | null;
                p_systems?: string[] | null;
            };
            Returns: // Structure of the returned rows (matches EmployeeProfileData)
              {
                id: string; // UUID
                email: string;
                full_name: string;
                role: string;
                description: string | null;
                experience: string[] | null;
                systems: string[] | null;
                profile_picture_url: string | null;
                license_number: string | null;
                license_verified: boolean | null;
                // license_expiry: string | null; // REMOVED
                has_worked_for_employer: boolean;
              }[]; // Indicates it returns an array of these objects
          };
          // Add other RPC function definitions here...
          create_conversation: {
              Args: { user1_id: string; user2_id: string };
              Returns: string; // Assuming it returns the conversation_id (UUID as string)
          };
           get_conversation_participants: {
               Args: { conversation_id: string };
               Returns: { user_id: string; full_name: string; role: string }[]; // Example return
           };
           check_pharmacist_availability: {
               Args: { pharmacist_id: string[]; shift_start: string; shift_end: string }; // Corrected arg names
               Returns: { pharmacist_id: string }[]; // Example: returns IDs of available pharmacists
           };

      // --- NEW JOB POSTING FUNCTIONS ---
      create_job_posting: {
        Args: { // Match the SQL function parameters
          p_title: string;
          p_description: string;
          p_required_role: string; // 'pharmacist' | 'säljare' | 'egenvårdsrådgivare'
          p_period_start_date: string; // YYYY-MM-DD
          p_period_end_date: string; // YYYY-MM-DD
          p_required_experience?: string[] | null;
          p_location?: string | null;
          p_estimated_hours?: string | null;
          p_salary_description?: string | null;
          p_status?: string; // 'open' | 'filled' | 'cancelled'
        };
        Returns: { // Corresponds to the JSONB returned by the function
            id: string;
            employer_id: string;
            title: string;
            description: string;
            required_role: string;
            required_experience: string[] | null;
            location: string | null;
            period_start_date: string;
            period_end_date: string;
            estimated_hours: string | null;
            salary_description: string | null;
            status: string;
            created_at: string;
            updated_at: string;
          } | { error: string }; // Can return the object or an error object
      };

      get_employer_job_postings: {
        Args: Record<string, never>; // No arguments needed
        Returns: Database['public']['Tables']['job_postings']['Row'][]; // Returns array of postings
      };

      get_available_job_postings: {
        Args: {
           p_required_role?: string | null; // Optional filter argument
        };
        Returns: Database['public']['Tables']['job_postings']['Row'][]; // Returns array of postings
      };

      update_job_posting: {
         Args: {
            p_posting_id: string; // uuid
            p_title?: string | null;
            p_description?: string | null;
            p_required_role?: string | null;
            p_period_start_date?: string | null; // YYYY-MM-DD
            p_period_end_date?: string | null; // YYYY-MM-DD
            p_required_experience?: string[] | null;
            p_location?: string | null;
            p_estimated_hours?: string | null;
            p_salary_description?: string | null;
            p_status?: string | null; // 'open' | 'filled' | 'cancelled'
         };
         Returns: boolean; // Indicates success/failure
      };

      delete_job_posting: {
          Args: {
              p_posting_id: string; // uuid
          };
          Returns: boolean; // Indicates success/failure
      };
      // --- NEW JOB POSTING APPLICATION FUNCTIONS ---
      create_job_posting_application: {
        Args: {
          p_posting_id: string; // uuid
          p_notes?: string | null;
        };
        Returns: { // Corresponds to the JSONB returned by the function
          id: string;
          job_posting_id: string;
          applicant_id: string;
          status: string;
          notes: string | null;
          created_at: string;
        } | { error: string }; // Can return the object or an error object
      };

      get_posting_applications: {
        Args: {
          p_posting_id: string; // uuid
        };
        Returns: { // Matches the TABLE() definition in the SQL function
          application_id: string; // uuid
          applicant_id: string; // uuid
          application_status: string; // text
          application_notes: string | null; // text
          applied_at: string; // timestamptz
          applicant_full_name: string | null; // text
          applicant_email: string | null; // text
          applicant_role: string | null; // text
          applicant_profile_picture_url: string | null; // text
        }[]; // Returns an array of these objects
      };

      get_my_posting_applications: {
        Args: Record<string, never>; // No arguments
        Returns: { // Matches the TABLE() definition in the SQL function
            application_id: string; // uuid
            job_posting_id: string; // uuid
            application_status: string; // text
            application_notes: string | null; // text
            applied_at: string; // timestamptz
            posting_title: string | null; // text
            posting_period_start: string | null; // date
            posting_period_end: string | null; // date
            posting_location: string | null; // text
            posting_status: string | null; // text
            employer_id: string | null; // uuid
            employer_name: string | null; // text
        }[]; // Returns an array of these objects
      };

      accept_posting_application: {
        Args: {
          p_application_id: string; // uuid
        };
        Returns: boolean;
      };

      reject_posting_application: {
        Args: {
          p_application_id: string; // uuid
        };
        Returns: boolean;
      };

      withdraw_posting_application: {
        Args: {
          p_application_id: string; // uuid
        };
        Returns: boolean;
      };


           // Add other RPCs like accept_application, reject_application, etc.
           accept_application: {
                Args: { p_application_id: string, p_shift_id: string };
                Returns: boolean; // Or void/status code
           };
            reject_application: {
                Args: { p_application_id: string };
                Returns: boolean; // Or void/status code
            };
            withdraw_application: {
                Args: { p_application_id: string };
                Returns: boolean;
            };
             mark_notification_read: {
                Args: { p_notification_id: string };
                Returns: boolean;
            };
            mark_all_notifications_read: {
                Args: Record<string, never>; // No arguments expected
                Returns: number; // Count of notifications marked read
            };
            get_unread_notifications: {
                 Args: Record<string, never>;
                 Returns: any[]; // Define more specific Notification type if possible
            };
             get_shift_stats: {
                Args: { user_id: string };
                Returns: { open_shifts: number; filled_shifts: number }[]; // Example return
            };
    }; // End Functions
   
  }; // End public schema
} // End Database interface
