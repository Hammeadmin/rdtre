// src/components/Shifts/ManageApplicationsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { ShiftNeed, UserRole } from '../../types';
import { X, Check, UserX, Loader2, Mail /* Import Mail icon */ } from 'lucide-react'; // Added Mail
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { MessageButton } from '../Messages/MessageButton'; // <<< ADD IMPORT (Adjust path if needed)
import { acceptApplication, rejectApplication } from '../../lib/shifts'; // Import library functions


// Keep ApplicationWithProfile interface...
interface ApplicationWithProfile {
  id: string; // Application ID
  applicant_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  notes: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    role: UserRole | null;
    profile_picture_url: string | null;
  } | null;
}


interface ManageApplicationsModalProps {
  shift: ShiftNeed;
  closeModal: () => void;
  onUpdate: () => void;
}

const ManageApplicationsModal: React.FC<ManageApplicationsModalProps> = ({ shift, closeModal, onUpdate }) => {
  // Keep existing state and functions (useState, useEffect, handleAccept, handleReject, fetchApplications) ...
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
      // ... fetch logic ...
      setLoading(true);
      setError(null);
      try {
          const { data, error: fetchError } = await supabase
              .from('shift_applications')
              .select(`
                  id, applicant_id, status, notes, created_at,
                  profiles ( full_name, email, role, profile_picture_url )
              `)
              .eq('shift_id', shift.id)
              .order('created_at', { ascending: true });
          if (fetchError) throw fetchError;
          setApplications((data as ApplicationWithProfile[]) || []);
      } catch (err: any) {
          console.error("Error fetching applications:", err);
          setError(err.message || "Failed to load applications.");
          toast.error("Failed to load applications.");
          setApplications([]);
      } finally {
          setLoading(false);
      }
  }, [shift.id]);

  useEffect(() => {
      fetchApplications();
  }, [fetchApplications]);

   const handleAccept = async (applicationId: string, applicantId: string) => {
    setProcessingId(applicationId);
    const toastId = toast.loading("Accepterar ansökan...");
    try {
      const result = await acceptApplication(applicationId, shift.id);
      
      if (result.error || !result.success) {
        throw new Error(result.error || 'Acceptance failed');
      }
      
      toast.success("Ansökan accepterad!", { id: toastId });

      // ** NOTIFICATION LOGIC ADDED HERE **
      await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailType: 'shiftApplicationAccepted',
      payload: {
        userEmail: userEmail,
        shiftTitle: shift.title,
      },
    }),
  }).catch(e => console.error("Failed to send acceptance email:", e));
      // ** END OF NOTIFICATION LOGIC **

      onUpdate();
      closeModal();
    } catch (err: any) {
      console.error("Error accepting application:", err);
      toast.error(`Fel: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  // --- MODIFIED handleReject FUNCTION ---
  const handleReject = async (applicationId: string, applicantId: string) => {
    setProcessingId(applicationId);
    const toastId = toast.loading("Avvisar ansökan...");
    try {
      const result = await rejectApplication(applicationId);

      if (result.error || !result.success) {
        throw new Error(result.error || 'Rejection failed');
      }
      toast.success("Ansökan avvisad.", { id: toastId });

      // ** NOTIFICATION LOGIC ADDED HERE **
      await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailType: 'shiftApplicationRejected',
      payload: {
        userEmail: userEmail,
        shiftTitle: shift.title,
      },
    }),
  }).catch(e => console.error("Failed to send rejection email:", e));

      // ** END OF NOTIFICATION LOGIC **

      fetchApplications();
      onUpdate();
    } catch (err: any) {
      console.error("Error rejecting application:", err);
      toast.error(`Fel: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="modal-backdrop"> {/* Use global style */}
      <div className="modal-content max-w-3xl relative"> {/* Use global style */}
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200 flex-shrink-0">
          {/* ... header content ... */}
          <div>
             <h2 className="text-xl font-semibold text-gray-900">Hantera sökande</h2>
             <p className="text-sm text-gray-500">{shift.title} - {shift.date ? format(parseISO(shift.date), 'PP', { locale: sv }) : 'Invalid Date'}</p>
          </div>
           <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
               <X className="h-6 w-6" />
           </button>
        </div>
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          {/* ... loading/error/empty states ... */}
          {loading ? (
             <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" /></div>
          ) : error ? (
             <div className="p-4 text-red-600 bg-red-50 rounded text-center">{error}</div>
          ) : applications.length === 0 ? (
             <p className="text-center text-gray-500 py-10 italic">Inga ansökningar gjorda på detta pass än.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {applications.map((app) => (
                <li key={app.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Applicant Info */}
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* ... img, name, email ... */}
                     <img
                         className="h-10 w-10 rounded-full object-cover flex-shrink-0 bg-gray-200"
                         src={app.profiles?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.profiles?.full_name || 'N A')}&background=random`}
                         alt={app.profiles?.full_name || 'Applicant'}
                         onError={(e) => {
                             // Fallback if avatar URL fails
                             const target = e.target as HTMLImageElement;
                             target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.profiles?.full_name || 'N A')}&background=random`;
                         }}
                     />
                     <div className="min-w-0 flex-1">
                         <p className="text-sm font-medium text-gray-900 truncate">
                             {app.profiles?.full_name || 'Unknown Applicant'}
                         </p>
                         <p className="text-sm text-gray-500 truncate">{app.profiles?.email || 'No email'}</p>
                     </div>
                  </div>
                  {/* Status & Actions */}
                  <div className="flex items-center space-x-2 mt-3 sm:mt-0 flex-shrink-0 self-end sm:self-center">
                     {/* Status Badge */}
                    <span className={`status-badge whitespace-nowrap ${ /* Use status-badge class */
                      app.status === 'pending' ? 'status-pending' : /* Define status classes if needed */
                      app.status === 'accepted' ? 'status-accepted' :
                      app.status === 'rejected' ? 'status-rejected' :
                      'status-unknown'
                    }`}>
                      {app.status}
                    </span>

                    {/* Accept/Reject Buttons */}
                     {app.status === 'pending' && (
                      <>
                        <button onClick={() => handleAccept(app.id, app.applicant_id)} disabled={!!processingId} className="btn btn-success btn-xs disabled:opacity-50">
                          {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                          <span className="ml-1 hidden sm:inline">Acceptera</span>
                        </button>
                        <button onClick={() => handleReject(app.id, app.applicant_id)} disabled={!!processingId} className="btn btn-danger btn-xs disabled:opacity-50">
                          {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserX className="h-4 w-4" />}
                          <span className="ml-1 hidden sm:inline">Avslå</span>
                        </button>
                      </>
                    )}
                    {app.profiles?.role && (
                      <MessageButton
                        recipientId={app.applicant_id}
                        recipientRole={app.profiles.role}
                        size="xs"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Footer */}
        <div className="flex justify-end items-center px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button onClick={closeModal} type="button" className="btn btn-secondary"> Stäng </button>
        </div>
      </div>
    </div>
  );
};

export default ManageApplicationsModal;