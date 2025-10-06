// src/components/postings/ManagePostingApplicantsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { fetchPostingApplications, acceptPostingApplication, rejectPostingApplication } from '../../lib/postings';
import type { JobPosting, UserRole, UserProfile } from '../../types'; // Added UserProfile for clarity
import { Loader2, X, Check, UserX, Mail, User as UserIcon, Eye as EyeIcon } from 'lucide-react'; // Added EyeIcon
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { MessageButton } from '../Messages/MessageButton';

// This type should match the structure returned by your `get_posting_applications` RPC
// which is called by `WorkspacePostingApplications`.
export type PostingApplicationWithDetails = {
  application_id: string;
  applicant_id: string; // Crucial for fetching full profile
  application_status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | string; // Allow string for flexibility
  application_notes: string | null;
  applied_at: string;
  // Applicant details fetched by the RPC:
  applicant_full_name: string | null;
  applicant_email: string | null;
  applicant_role: UserRole | null;
  applicant_profile_picture_url: string | null;
};

interface ManagePostingApplicantsModalProps {
  posting: JobPosting;
  onClose: () => void;
  onUpdate?: () => void;
  onViewApplicantProfile: (applicantId: string) => void; // Prop to trigger profile view in parent
}

export function ManagePostingApplicantsModal({ posting, onClose, onUpdate, onViewApplicantProfile }: ManagePostingApplicantsModalProps) {
  const [applications, setApplications] = useState<PostingApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null); // For disabling buttons

  const loadApplicants = useCallback(async () => {
    if (!posting?.id) return;
    setLoading(true); setError(null);
    try {
      // fetchPostingApplications should call your `get_posting_applications` RPC
      const { data, error: fetchErrorMsg } = await fetchPostingApplications(posting.id);
      if (fetchErrorMsg) { throw new Error(fetchErrorMsg); }

      // Ensure the data matches PostingApplicationWithDetails
      if (Array.isArray(data) && data.every(item => typeof item.application_id === 'string' && typeof item.applicant_id === 'string')) {
        setApplications(data as PostingApplicationWithDetails[]);
      } else {
        console.warn("Fetched data for posting applicants doesn't match expected structure:", data);
        setApplications([]);
        if (data !== null && data !== undefined) {
          throw new Error("Mottog oväntad datastruktur för sökande till tjänst.");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunde inte ladda sökande.";
      setError(message); toast.error(message); setApplications([]);
    } finally { setLoading(false); }
  }, [posting?.id]);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);

  const handleAccept = async (applicationId: string) => {
    if (processingId) return;
    setProcessingId(applicationId);
    const toastId = toast.loading("Accepterar ansökan...");
    try {
      const { success, error: acceptError } = await acceptPostingApplication(applicationId);
      if (!success) throw new Error(acceptError || "Acceptera misslyckades");
      toast.success("Ansökan accepterad!", { id: toastId });
      await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailType: 'shiftApplicationAccepted', // You can reuse this or create a new 'postingApplicationAccepted' type
      payload: {
        userEmail: userEmail,
        shiftTitle: posting.title, // or postingTitle
      },
    }),
  }).catch(e => console.error("Failed to send acceptance email:", e));
      if (onUpdate) onUpdate(); // To refresh posting list if status changes (e.g., to 'filled')
      onClose(); // Close this modal as the primary action (accept) is done for this posting usually.
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunde inte acceptera";
      toast.error(message, { id: toastId }); console.error("Acceptera fel:", err);
    } finally { setProcessingId(null); }
  };

  const handleReject = async (applicationId: string) => {
    if (processingId) return;
    setProcessingId(applicationId);
    const toastId = toast.loading("Avvisar ansökan...");
    try {
      const { success, error: rejectError } = await rejectPostingApplication(applicationId);
      if (!success) throw new Error(rejectError || "Avvisa misslyckades");
      toast.success("Ansökan avvisad.", { id: toastId });
      await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailType: 'shiftApplicationRejected', // You can reuse this or create a new 'postingApplicationRejected' type
      payload: {
        userEmail: userEmail,
        shiftTitle: posting.title, // or postingTitle
      },
    }),
  }).catch(e => console.error("Failed to send rejection email:", e));

      loadApplicants(); // Refresh list within this modal
      if (onUpdate) onUpdate(); // To refresh main posting list if needed
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunde inte avvisa";
      toast.error(message, { id: toastId }); console.error("Avvisa fel:", err);
    } finally { setProcessingId(null); }
  };

  function formatDateSafe(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const dateObj = parseISO(dateString);
      if (isValid(dateObj)) { return format(dateObj, 'PPpp', { locale: sv }); }
    } catch (e) { console.error("Fel vid formatering av datum:", dateString, e); }
    return 'Ogiltigt datum';
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-3xl relative"> {/* Adjusted max-width */}
        <div className="flex justify-between items-start px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Hantera Sökande till Tjänst</h2>
            <p className="text-sm text-gray-500 truncate" title={posting.title}>För: {posting.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 -mr-1" aria-label="Stäng">
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          {loading ? (
            <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" /></div>
          ) : error ? (
            <div className="p-4 text-red-600 bg-red-50 rounded text-center">{error}</div>
          ) : applications.length === 0 ? (
            <p className="text-center text-gray-500 py-10 italic">Inga ansökningar mottagna än.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {applications.map((app) => (
                <li key={app.application_id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-0 flex-grow">
                    <img
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0 bg-gray-200"
                      src={app.applicant_profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant_full_name || 'N A')}&background=random&color=fff`}
                      alt={app.applicant_full_name || 'Sökande'}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant_full_name || 'N A')}&background=random&color=fff`; }}
                    />
                    <div className="min-w-0 flex-1">
                      {/* Button to view applicant's profile */}
                      <button
                        onClick={() => onViewApplicantProfile(app.applicant_id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline truncate text-left block"
                        title={`Visa profil för ${app.applicant_full_name || 'sökande'}`}
                      >
                        {app.applicant_full_name || 'Okänd Sökande'}
                      </button>
                      <p className="text-xs text-gray-500 truncate flex items-center"><Mail size={12} className="mr-1.5 flex-shrink-0"/>{app.applicant_email || 'Ingen e-post'}</p>
                      {app.applicant_role && <p className="text-xs text-gray-500 capitalize mt-0.5">Roll: {app.applicant_role}</p>}
                      {app.application_notes && ( <p className="mt-1 text-xs text-gray-600 italic bg-gray-50 p-1.5 rounded border border-gray-200 max-w-xs sm:max-w-md line-clamp-2" title={app.application_notes}>Notering: {app.application_notes}</p> )}
                      <p className="text-xs text-gray-400 mt-1">Ansökte: {formatDateSafe(app.applied_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mt-3 sm:mt-0 flex-shrink-0 self-start sm:self-center sm:self-auto">
                    <span className={`status-badge whitespace-nowrap ${
                      app.application_status === 'pending' ? 'status-pending' :
                      app.application_status === 'accepted' ? 'status-accepted' :
                      app.application_status === 'rejected' ? 'status-rejected' :
                      app.application_status === 'withdrawn' ? 'status-withdrawn' : 'status-unknown'
                    }`}>
                      {app.application_status}
                    </span>
                    {posting.status === 'open' && app.application_status === 'pending' && (
                      <>
                        <button onClick={() => handleAccept(app.application_id)} disabled={!!processingId} className="btn btn-success btn-xs" title="Acceptera ansökan">
                          {processingId === app.application_id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                          <span className="ml-1 hidden sm:inline">Acceptera</span>
                        </button>
                        <button onClick={() => handleReject(app.application_id)} disabled={!!processingId} className="btn btn-danger btn-xs" title="Avvisa ansökan">
                          {processingId === app.application_id ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserX className="h-4 w-4" />}
                          <span className="ml-1 hidden sm:inline">Avvisa</span>
                        </button>
                      </>
                    )}
                    {app.applicant_role && (
                        <MessageButton
                             recipientId={app.applicant_id}
                             recipientRole={app.applicant_role}
                             size="xs"
                         />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end items-center px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button onClick={onClose} type="button" className="btn btn-secondary">Stäng</button>
        </div>
      </div>
       <style jsx global>{`
           .modal-backdrop { @apply fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm; }
           .modal-content { @apply bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto flex flex-col; }
           .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
           .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
           .btn-danger { @apply border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500; }
           .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500; }
           .btn-info { /* For View Profile button */ @apply border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-500; }
           .btn-xs { @apply px-2.5 py-1.5 text-xs; }
           .status-badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border; }
           .status-pending { @apply bg-yellow-100 text-yellow-800 border-yellow-200; }
           .status-accepted { @apply bg-green-100 text-green-800 border-green-200; }
           .status-rejected { @apply bg-red-100 text-red-800 border-red-200; }
           .status-withdrawn { @apply bg-gray-100 text-gray-500 border-gray-200; }
           .status-unknown { @apply bg-gray-100 text-gray-800 border-gray-200; }
       `}</style>
    </div>
  );
}