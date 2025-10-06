// src/components/postings/JobPostingApplicationModal.tsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, X, CheckCircle } from 'lucide-react';
import { applyForPosting } from '../../lib/postings'; // Make sure path is correct

interface JobPostingApplicationModalProps {
    postingId: string;
    postingTitle?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function JobPostingApplicationModal({ postingId, postingTitle, onClose, onSuccess }: JobPostingApplicationModalProps) {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [applicationSuccessful, setApplicationSuccessful] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setApplicationSuccessful(false);

        try {
            const { success, error: applyErrorMsg } = await applyForPosting(postingId, notes.trim() || null);

            if (success) {
                setApplicationSuccessful(true);
                toast.success('Application submitted successfully!');
              // --- Start Notification ---
if (posting.employer_id && profile?.full_name) {
    fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            emailType: 'newPostingApplication',
            payload: {
                applicantName: profile.full_name,
                postingTitle: posting.title,
                employerId: posting.employer_id,
            },
        }),
    }).catch(e => console.error("Failed to trigger posting application notification:", e));
}
// --- End Notification ---
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            } else {
                throw new Error(applyErrorMsg || 'Failed to submit application.');
            }
        } catch (err: any) {
            console.error('Error applying for posting:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit application.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900">
                        Apply for Job Posting: {postingTitle || 'Untitled'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 -mr-1" aria-label="Close modal">
                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {applicationSuccessful && (
                        <div className="bg-green-50 text-green-700 p-2 sm:p-3 rounded-md text-sm flex items-center justify-center" role="status">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            <p className="font-semibold">Application submitted successfully!</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-700 p-2 sm:p-3 rounded-md text-xs sm:text-sm" role="alert">
                            {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                            rows={4}
                            placeholder="Add any relevant notes for the employer..."
                            aria-label="Application notes"
                            disabled={loading || applicationSuccessful}
                        />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mt-2 sm:mt-0"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || applicationSuccessful}
                            className="min-w-[100px] sm:min-w-[120px] inline-flex justify-center items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : applicationSuccessful ? 'Submitted!' : 'Submit Application'}
                            {applicationSuccessful && <CheckCircle className="h-4 w-4 ml-2" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}