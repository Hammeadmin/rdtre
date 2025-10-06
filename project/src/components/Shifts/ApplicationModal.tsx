// src/components/Shifts/ApplicationModal.tsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, CheckCircle, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface ApplicationModalProps {
    shiftId: string;
    shiftTitle?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ApplicationModal({ shiftId, shiftTitle, onClose, onSuccess }: ApplicationModalProps) {
    const { profile } = useAuth();
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Your SQL function is great! We just need to handle its response correctly.
            const { data, error: rpcError } = await supabase.rpc('create_shift_application', {
                p_shift_id: shiftId,
                p_notes: notes.trim() || null
            });

            // This handles network or permission errors
            if (rpcError) {
                throw new Error(rpcError.message);
            }

            // --- THIS IS THE CRITICAL FIX ---
            // This checks if the SQL function itself found a problem and returned an error message.
            if (data && data.error) {
                throw new Error(data.error);
            }

            // If we get here, the application was successfully created.
            toast.success("Ansökan skickad!");
          // --- Start Notification ---
const { data: shiftData, error: shiftFetchError } = await supabase
    .from('shift_needs')
    .select('employer_id')
    .eq('id', shiftId)
    .single();

if (shiftFetchError) {
    // Log the error but don't block the user, as the application was successful.
    console.error("Could not fetch employer_id for notification:", shiftFetchError);
} else if (shiftData?.employer_id && profile?.full_name) {
    // Now that we have the employer_id and the applicant's name, we can send the email.
    fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            emailType: 'newShiftApplication',
            payload: {
                applicantName: profile.full_name,
                shiftTitle: shiftTitle,
                employerId: shiftData.employer_id, // Use the fetched employer_id
            },
        }),
    }).catch(e => console.error("Failed to trigger application notification:", e));
}
// --- End Notification ---
            onSuccess(); // Refresh the parent page's data
            onClose();   // Close the modal

        } catch (err: any) {
            console.error('Error submitting application:', err);
            const errorMessage = err.message || 'Ett oväntat fel inträffade. Försök igen.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Ansök till pass</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-600">Du är på väg att ansöka till passet:</p>
                        <p className="font-semibold text-gray-900 mt-1">{shiftTitle || `ID: ${shiftId}`}</p>
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                            Meddelande till arbetsgivaren (valfritt)
                        </label>
                        <textarea
                            id="notes" name="notes" rows={3} value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Här kan du skriva ett kort meddelande..."
                            disabled={loading}
                        />
                    </div>

                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
                            Avbryt
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary min-w-[140px]">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Skicka Ansökan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500; }
            `}</style>
        </div>
    );
}