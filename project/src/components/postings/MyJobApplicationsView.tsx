// src/components/Postings/MyJobApplicationsView.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { fetchMyPostingApplications, withdrawPostingApplication } from '../../lib/postings';
import type { JobPosting, UserRole } from '../../types'; // Ensure JobPosting and UserRole are correctly imported
import {
    Loader2, CalendarDays, Building2, MapPin, Briefcase, Eye, XCircle, AlertTriangle
} from 'lucide-react';
import { format, parseISO, isValid, Locale } from 'date-fns';
import { sv } from 'date-fns/locale';
import { PostingDetailsModal } from './PostingDetailsModal';
import { EmployerProfileViewModal } from '../employer/EmployerProfileViewModal';

// Re-using the format date function for consistency
const formatDateSafe = (dateString: string | null | undefined, formatStr: string = 'd MMMM yy', locale: Locale = sv): string => {
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') return 'N/A';
    try {
        const dateObj = parseISO(dateString);
        if (dateObj && isValid(dateObj)) {
            return format(dateObj, formatStr, { locale });
        }
    } catch (e) {
        try {
            const dateObj = new Date(dateString);
            if (dateObj && isValid(dateObj)) {
                return format(dateObj, formatStr, { locale });
            }
        } catch (err) {
            console.error("Error formatting date:", dateString, err);
        }
    }
    return 'Invalid Date';
};

// --- UPDATED INTERFACE to match your RPC's RETURNS TABLE exactly ---
interface MyPostingApplicationDisplay {
    application_id: string;
    job_posting_id: string;
    application_status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    application_notes: string | null; // Matches RPC: application_notes
    applied_at: string;             // Matches RPC: applied_at
    posting_title: string;
    posting_period_start: string;
    posting_period_end: string;
    posting_location: string | null;
    posting_status: 'open' | 'filled' | 'cancelled';
    employer_id: string;
    employer_name: string | null;
    // Missing fields from JobPosting that this RPC doesn't return:
    // description: string;
    // required_role: UserRole; // RPC returns text, need to cast or define specifically
    // required_experience: string[] | null;
    // estimated_hours: string | null;
    // salary_description: string | null;
    // created_at: string;
    // updated_at: string;
}

export const MyJobApplicationsView: React.FC = () => {
    const { profile } = useAuth();
    const [applications, setApplications] = useState<MyPostingApplicationDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPostingDetails, setSelectedPostingDetails] = useState<JobPosting | null>(null);
    const [employerProfileModalOpen, setEmployerProfileModalOpen] = useState(false);
    const [viewingEmployerId, setViewingEmployerId] = useState<string | null>(null);
  const [selectedEmployerIdForProfileView, setSelectedEmployerIdForProfileView] = useState<string | null>(null);

    const fetchApplications = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Assuming fetchMyPostingApplications in lib/postings.ts is updated
            const { data, error: fetchError } = await fetchMyPostingApplications();
            if (fetchError) throw new Error(fetchError);

            setApplications(data || []);
        } catch (err: any) {
            console.error("Error fetching my job applications:", err);
            setError(err.message || "Failed to load your job applications.");
            toast.error(err.message || "Failed to load your job applications.");
            setApplications([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApplications();
        const applicationsChannel = supabase.channel('my-job-applications-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'job_posting_applications', filter: `applicant_id=eq.${profile?.id}` },
                (payload) => {
                    console.log('Realtime change in job_posting_applications for current user:', payload);
                    fetchApplications();
                }
            )
            .subscribe();

        const postingChannel = supabase.channel('related-job-postings-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'job_postings' },
                (payload) => {
                    const relevantChange = applications.some(app => app.job_posting_id === (payload.old?.id || payload.new?.id));
                    if (relevantChange) {
                        fetchApplications();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(applicationsChannel);
            supabase.removeChannel(postingChannel);
        };
    }, [fetchApplications, profile?.id]);


    const handleWithdrawApplication = async (applicationId: string) => {
        if (!window.confirm('Are you sure you want to withdraw this application?')) {
            return;
        }
        toast.loading('Withdrawing application...', { id: 'withdrawApp' });
        try {
            const { success, error: withdrawError } = await withdrawPostingApplication(applicationId);
            if (success) {
                toast.success('Application withdrawn.', { id: 'withdrawApp' });
                fetchApplications();
            } else {
                toast.error(withdrawError || 'Failed to withdraw application. It might have been processed.', { id: 'withdrawApp' });
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message || 'Failed to withdraw application'}`, { id: 'withdrawApp' });
        }
    };

    const handleViewPostingDetails = (application: MyPostingApplicationDisplay) => {
        // --- UPDATED MAPPING TO JobPosting TYPE ---
        // Some fields might be missing from your RPC.
        // It's best to modify your `get_my_posting_applications` RPC to return all JobPosting fields
        // if you want the full detail modal, or handle missing fields gracefully.
        const posting: JobPosting = {
            id: application.job_posting_id,
            employer_id: application.employer_id,
            title: application.posting_title,
            description: "No description available from this view.", // Placeholder if not in RPC
            required_role: application.posting_title.includes('Pharmacist') ? 'pharmacist' : 'säljare', // Placeholder/guess
            // ^^^ IMPORTANT: Adjust this required_role mapping. It's a guess.
            // Best to return actual required_role from RPC.
            required_experience: null, // Placeholder if not in RPC
            location: application.posting_location,
            period_start_date: application.posting_period_start,
            period_end_date: application.posting_period_end,
            estimated_hours: null, // Placeholder if not in RPC
            salary_description: null, // Placeholder if not in RPC
            status: application.posting_status,
            created_at: application.applied_at, // Using application's applied_at
            updated_at: application.applied_at, // Using application's applied_at as a fallback
            employer_name: application.employer_name,
        };
        setSelectedPostingDetails(posting);
    };

    const handleClosePostingDetailsModal = () => {
        setSelectedPostingDetails(null);
    };

    const handleOpenEmployerProfile = useCallback((employerId: string) => {
        setViewingEmployerId(employerId);
        setEmployerProfileModalOpen(true);
    }, []);

    const handleCloseEmployerProfile = useCallback(() => {
        setEmployerProfileModalOpen(false);
        setViewingEmployerId(null);
    }, []);

    const getStatusColor = (status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
            case 'withdrawn': return 'bg-gray-100 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    if (isLoading) {
        return (
            <div className='text-center p-10'>
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600"/>
                <p className="mt-2 text-gray-500">Loading your job applications...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-700 bg-red-100 p-4 rounded-md border border-red-300 shadow-sm my-4">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Dina ansökningar</h2>

            {applications.length === 0 ? (
                <div className="text-center py-6 sm:py-10 text-gray-500 bg-gray-50 p-3 sm:p-4 rounded-md border">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p>Du har inte ansökt för något uppdrag än.</p>
                    <p className="mt-2">Utforska tillgänliga möjligheter <a href="/postings" className="text-blue-600 hover:underline">här</a>.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 whitespace-nowrap">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Titel uppdrag</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Arbetsgivare</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Plats</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Datum för ansökan</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {applications.map((app) => (
                                <tr key={app.application_id} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out text-xs sm:text-sm">
                                    <td className="px-3 py-2 whitespace-normal font-medium text-gray-800 max-w-[180px] truncate">{app.posting_title}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                        {app.employer_name || 'N/A'}
                                        {app.employer_id && (
                                            <button
                                                onClick={() => handleOpenEmployerProfile(app.employer_id)}
                                                className="ml-2 text-blue-600 hover:underline text-xs"
                                                title="View Employer Profile"
                                            >
                                                (Profil)
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{app.posting_location || 'Any'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{formatDateSafe(app.applied_at)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs leading-tight font-semibold rounded-full capitalize ${getStatusColor(app.application_status)}`}>
                                            {app.application_status}
                                        </span>
                                        {/* Optional: Show posting status if different and relevant */}
                                        {app.posting_status !== 'open' && app.posting_status !== 'filled' && app.application_status !== 'rejected' && app.application_status !== 'withdrawn' && (
                                            <span className="ml-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs leading-tight font-semibold rounded-full capitalize bg-gray-100 text-gray-800 border border-gray-300">
                                                Uppdrag: {app.posting_status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-end">
                                            <button
                                                onClick={() => handleViewPostingDetails(app)}
                                                className="btn btn-tertiary text-xs py-1 px-2"
                                            >
                                                <Eye size={14} className="mr-1"/> Detaljer
                                            </button>
                                            {app.application_status === 'pending' && app.posting_status === 'open' && (
                                                <button
                                                    onClick={() => handleWithdrawApplication(app.application_id)}
                                                    className="btn btn-danger-outline text-xs py-1 px-2"
                                                >
                                                    <XCircle size={14} className="mr-1"/> Återkalla
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedPostingDetails && (
                <PostingDetailsModal
                    posting={selectedPostingDetails}
                    currentUserRole={profile?.role || 'anonymous'}
                    onClose={handleClosePostingDetailsModal}
                    onViewEmployerProfile={handleOpenEmployerProfile}
                    // onApply and hasApplied are not relevant when viewing from "My Applications" tab
                />
            )}

            {employerProfileModalOpen && viewingEmployerId && (
                <EmployerProfileViewModal
                    isOpen={!!selectedEmployerIdForProfileView}
                    onClose={handleCloseEmployerProfile}
                    employerId={viewingEmployerId}
                />
            )}

            <style jsx>{`
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
                .btn-tertiary { @apply border-gray-300 text-gray-600 bg-white hover:bg-gray-100 focus:ring-gray-500; }
                .btn-danger-outline { @apply border-red-500 text-red-600 bg-white hover:bg-red-50 focus:ring-red-500; }
            `}</style>
        </div>
    );
};