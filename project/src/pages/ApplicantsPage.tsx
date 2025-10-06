// src/pages/ApplicantsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    getPendingApplicationDetails,
    acceptApplication,
    rejectApplication,
    PendingApplicationDetail // This type is from lib/shifts.ts and should now include application_notes
} from '../lib/shifts';
import type { JobPosting, UserProfile, ShiftNeed, UserRole } from '../types';

import { toast } from 'react-hot-toast';
import { Check, X, Loader2, User, Mail, Briefcase, Calendar, MessageCircle, Users as UsersIcon, Eye as EyeIcon, FileText as FileTextIcon, MessageSquareText } from 'lucide-react'; // Added MessageSquareText
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { MessageButton } from '../components/Messages/MessageButton';
import { ManagePostingApplicantsModal } from '../components/postings/ManagePostingApplicantsModal';
import { EmployeeProfileDetailsModal } from '../components/Profile/EmployeeProfileDetailsModal';
import { ShiftDetailsModal as ShiftInfoModal } from '../components/Shifts/ShiftDetailsModal';
import { PostingDetailsModal as JobPostingInfoModal } from '../components/postings/PostingDetailsModal';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

type ActiveTab = 'shiftApplications' | 'jobPostingApplications';

function ApplicantsPage() {
    const { profile: currentUserProfile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialTabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<ActiveTab>(
        initialTabFromUrl === 'jobPostingApplications' ? 'jobPostingApplications' : 'shiftApplications'
    );

    const [shiftApplications, setShiftApplications] = useState<PendingApplicationDetail[]>([]);
    const [loadingShiftApps, setLoadingShiftApps] = useState(true);
    const [errorShiftApps, setErrorShiftApps] = useState<string | null>(null);

    const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
    const [selectedPostingForAppsManagement, setSelectedPostingForAppsManagement] = useState<JobPosting | null>(null);
    const [loadingJobPostings, setLoadingJobPostings] = useState(true);
    const [errorJobPostings, setErrorJobPostings] = useState<string | null>(null);

    const [selectedApplicantProfile, setSelectedApplicantProfile] = useState<UserProfile | null>(null);
    const [selectedShiftInfo, setSelectedShiftInfo] = useState<ShiftNeed | null>(null);
    const [selectedJobPostingInfo, setSelectedJobPostingInfo] = useState<JobPosting | null>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const getUser = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (!isMounted) return;
            if (authError) {
                const authErrMessage = "Användarautentisering misslyckades.";
                setErrorShiftApps(authErrMessage); setErrorJobPostings(authErrMessage);
                setLoadingShiftApps(false); setLoadingJobPostings(false);
            } else if (user) {
                setUserId(user.id);
            } else {
                const notAuthMessage = "Användare ej autentiserad.";
                setErrorShiftApps(notAuthMessage); setErrorJobPostings(notAuthMessage);
                setLoadingShiftApps(false); setLoadingJobPostings(false);
                setUserId(null);
            }
        };
        getUser();
        return () => { isMounted = false; };
    }, []);

    const loadShiftApplications = useCallback(async () => {
        if (!userId) {
            setLoadingShiftApps(false);
            setShiftApplications([]);
            return;
        }
        setLoadingShiftApps(true);
        setErrorShiftApps(null);
        try {
            const { data, error: fetchError } = await getPendingApplicationDetails(userId);
            if (fetchError) {
                setErrorShiftApps(fetchError || "Okänt fel vid hämtning av skiftansökningar");
                setShiftApplications([]);
                toast.error(`Kunde inte ladda skiftansökningar: ${fetchError || "Okänt fel"}`);
            } else {
                setShiftApplications((data as PendingApplicationDetail[]) || []);
            }
        } catch (err: any) {
             setErrorShiftApps(err.message || "Ett oväntat fel inträffade vid hämtning av skiftansökningar.");
             setShiftApplications([]);
             toast.error(err.message || "Ett oväntat fel inträffade.");
        } finally {
            setLoadingShiftApps(false);
        }
    }, [userId]);

    const loadJobPostings = useCallback(async () => {
        if (!userId) {
            setLoadingJobPostings(false);
            setJobPostings([]);
            return;
        }
        setLoadingJobPostings(true);
        setErrorJobPostings(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('job_postings')
                .select('*, employer:employer_id(full_name, pharmacy_name)')
                .eq('employer_id', userId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const postingsWithEmployerName = (data || []).map(p => ({
                ...p,
                employer_name: p.employer?.pharmacy_name || p.employer?.full_name || 'Okänd Arbetsgivare'
            }));
            setJobPostings(postingsWithEmployerName as JobPosting[]);
        } catch (err: any) {
            const errMsg = err.message || "Kunde inte ladda tjänsteannonser.";
            setErrorJobPostings(errMsg); toast.error(errMsg); setJobPostings([]);
        } finally {
            setLoadingJobPostings(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            if (activeTab === 'shiftApplications') {
                loadShiftApplications();
            } else if (activeTab === 'jobPostingApplications') {
                loadJobPostings();
            }
        } else {
            setLoadingShiftApps(false);
            setShiftApplications([]);
            setLoadingJobPostings(false);
            setJobPostings([]);
        }
    }, [userId, activeTab, loadShiftApplications, loadJobPostings]);

    const handleAcceptShiftApp = async (applicationId: string, shiftId: string) => {
        if (processingId) return; setProcessingId(applicationId);
        const toastId = toast.loading('Accepterar skiftansökan...');
        try {
            const { success, error: acceptError } = await acceptApplication(applicationId, shiftId);
            if (success) {
                toast.success('Ansökan accepterad!', { id: toastId });
                loadShiftApplications();
            } else {
                toast.error(acceptError || 'Kunde inte acceptera ansökan.', { id: toastId });
            }
        } catch (err) {
            toast.error('Ett oväntat fel inträffade.', { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectShiftApp = async (applicationId: string) => {
        if (processingId) return; setProcessingId(applicationId);
        const toastId = toast.loading('Avvisar skiftansökan...');
        try {
            const { success, error: rejectError } = await rejectApplication(applicationId);
            if (success) {
                toast.success('Skiftansökan avvisad!', { id: toastId });
                loadShiftApplications();
            } else {
                toast.error(rejectError || 'Kunde inte avvisa skiftansökan.', { id: toastId });
            }
        } catch (err) {
            toast.error('Ett oväntat fel inträffade.', { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleOpenManagePostingApplicantsModal = (posting: JobPosting) => {
        setSelectedPostingForAppsManagement(posting);
    };

    const viewApplicantProfileHandler = async (applicantId: string) => {
        if (!applicantId) { toast.error("Sökandens ID saknas."); return; }
        setSelectedApplicantProfile(null);
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', applicantId).single();
            if (error) throw error;
            if (!data) throw new Error("Sökandens profil hittades inte.");
            setSelectedApplicantProfile(data as UserProfile);
        } catch (err: any) {
            toast.error("Kunde inte ladda sökandeprofil: " + (err.message || "Okänt fel"));
        }
    };

    const handleViewShiftInfo = (app: PendingApplicationDetail) => {
        const shiftDataForModal: ShiftNeed = {
            id: app.shift_id,
            employer_id: userId || '',
            title: app.shift_title || 'Skiftinformation',
            description: app.shift_description,
            date: app.shift_date,
            start_time: app.shift_start_time,
            end_time: app.shift_end_time,
            lunch: app.shift_lunch,
            location: app.shift_location,
            status: (app.shift_status as ShiftNeed['status']) || 'open',
            required_role: (app.shift_required_role as UserRole) || null,
            required_experience: app.shift_required_experience || [],
            is_urgent: app.shift_is_urgent || false,
            urgent_pay_adjustment: app.shift_urgent_pay_adjustment || null,
            employer_name: currentUserProfile?.pharmacy_name || currentUserProfile?.full_name || app.employer_name || 'Min Organisation',
            created_at: app.shift_created_at || new Date().toISOString(),
        };
        setSelectedShiftInfo(shiftDataForModal);
    };

    const handleViewJobPostingInfo = (posting: JobPosting) => {
        setSelectedJobPostingInfo(posting);
    };

    const switchTab = (tab: ActiveTab) => {
        setActiveTab(tab);
        setSearchParams({ tab: tab }, { replace: true });
    };

    const renderShiftApplications = () => {
        if (loadingShiftApps) return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /><span className="ml-2 text-gray-600">Laddar pass-ansökningar...</span></div>;
        if (errorShiftApps) return <div className="p-4 text-red-600 bg-red-100 rounded-md border border-red-200">Fel: {errorShiftApps}</div>;
        if (!shiftApplications || shiftApplications.length === 0) return <div className="text-center py-10 bg-white rounded-lg shadow border border-gray-200"><Briefcase className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Inga väntande pass-ansökningar</h3><p className="mt-1 text-sm text-gray-500">Inga nya pass-ansökningar att granska.</p></div>;

        return (
            <ul role="list" className="space-y-4">
                {shiftApplications.map((app) => (
                    <li key={app.application_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-gray-100 mb-4">
                                <div className="flex items-center mb-3 sm:mb-0">
                                    <span className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 mr-3">
                                        <User className="h-6 w-6 text-indigo-600" />
                                    </span>
                                    <div>
                                        <button onClick={() => viewApplicantProfileHandler(app.applicant_id)} className="text-lg font-semibold text-indigo-700 hover:text-indigo-900 hover:underline truncate text-left">
                                            {app.applicant_name || 'Okänd'}
                                        </button>
                                        <p className="text-sm text-gray-500 flex items-center"><Mail className="h-3 w-3 mr-1 text-gray-400" />{app.applicant_email || 'Ingen e-post'}</p>
                                        {app.applicant_role && (<p className="text-xs text-gray-500 capitalize mt-0.5">Roll: {app.applicant_role}</p>)}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 sm:mt-0 sm:text-right flex-shrink-0">Ansökte:<br />{app.applied_at ? format(parseISO(app.applied_at), 'PPpp', { locale: sv }) : 'N/A'}</div>
                            </div>
                            <div className="mb-4">
                                <p className="text-sm font-medium text-gray-500 mb-1">Ansökan till pass:</p>
                                <button onClick={() => handleViewShiftInfo(app)} className="text-md font-semibold text-gray-800 hover:text-blue-600 hover:underline text-left">
                                    {app.shift_title || 'Namnlöst skift'}
                                </button>
                                <div className="mt-2 flex items-center text-sm text-gray-600">
                                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
                                    {app.shift_date && isValid(parseISO(app.shift_date)) ? format(parseISO(app.shift_date), 'PPP', { locale: sv }) : (app.shift_date || 'Ogiltigt datum')}
                                </div>
                                {/* Display Applicant Notes for Shifts */}
                                {app.application_notes && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 mb-0.5 flex items-center">
                                            <MessageSquareText size={13} className="mr-1 text-gray-400"/> Sökandens meddelande:
                                        </p>
                                        <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-md border border-gray-200 whitespace-pre-wrap">{app.application_notes}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-end sm:items-center sm:flex-wrap gap-3 pt-4 border-t border-gray-100">
                                {app.applicant_role && (
                                    <MessageButton recipientId={app.applicant_id} recipientRole={app.applicant_role as UserRole} size="sm" buttonClassName="w-full sm:w-auto"/>
                                )}
                                <button onClick={() => handleRejectShiftApp(app.application_id)} disabled={!!processingId && processingId === app.application_id} className="btn btn-secondary btn-sm w-full sm:w-auto" title="Avvisa Ansökan">
                                    {processingId === app.application_id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <X className="h-4 w-4 mr-1.5 text-red-500" />}Avvisa
                                </button>
                                <button onClick={() => handleAcceptShiftApp(app.application_id, app.shift_id)} disabled={!!processingId && processingId === app.application_id} className="btn btn-success btn-sm w-full sm:w-auto" title="Acceptera Ansökan">
                                    {processingId === app.application_id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}Acceptera
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    const renderJobPostingListForManagement = () => {
        if (loadingJobPostings) return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /><span className="ml-2 text-gray-600">Laddar annonser...</span></div>;
        if (errorJobPostings) return <div className="p-4 text-red-600 bg-red-100 rounded-md border border-red-200">Fel: {errorJobPostings}</div>;
        if (!jobPostings || jobPostings.length === 0) return <div className="text-center py-10 bg-white rounded-lg shadow border border-gray-200"><FileTextIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Inga annonser</h3><p className="mt-1 text-sm text-gray-500">Du har inte skapat några annonser än.</p></div>;

        return (
            <div className="space-y-4">
                {jobPostings.map((posting) => (
                    <div key={posting.id} className="bg-white shadow rounded-lg border border-gray-200 p-4 hover:shadow-md">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                            <div className="flex-grow">
                                <button onClick={() => handleViewJobPostingInfo(posting)} className="text-lg font-semibold text-gray-800 hover:text-blue-600 hover:underline text-left">
                                    {posting.title}
                                </button>
                                <p className="text-sm text-gray-500 capitalize">Roll: {posting.required_role}</p>
                                <p className="text-xs text-gray-400">Status: <span className={`font-medium ${posting.status === 'open' ? 'text-green-600' : 'text-gray-600'}`}>{posting.status}</span></p>
                            </div>
                            <button
                                onClick={() => handleOpenManagePostingApplicantsModal(posting)}
                                className="btn btn-primary btn-sm mt-2 sm:mt-0 w-full sm:w-auto"
                                disabled={posting.status !== 'open'}
                                title={posting.status !== 'open' ? "Kan ej hantera sökande för stängda annonser" : "Hantera Sökande"}
                            >
                                <UsersIcon className="h-4 w-4 mr-1.5" /> Hantera sökande
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Ansökningar</h1>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button
                        onClick={() => switchTab('shiftApplications')}
                        className={`whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 font-medium text-sm sm:text-base ${activeTab === 'shiftApplications' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Passansökningar
                    </button>
                    <button
                        onClick={() => switchTab('jobPostingApplications')}
                        className={`whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 font-medium text-sm sm:text-base ${activeTab === 'jobPostingApplications' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Ansökningar till uppdrag
                    </button>
                </nav>
            </div>

            {activeTab === 'shiftApplications' && renderShiftApplications()}
            {activeTab === 'jobPostingApplications' && renderJobPostingListForManagement()}

            {selectedPostingForAppsManagement && (
                <ManagePostingApplicantsModal
                    posting={selectedPostingForAppsManagement}
                    onClose={() => setSelectedPostingForAppsManagement(null)}
                    onUpdate={() => { loadJobPostings(); }}
                    onViewApplicantProfile={viewApplicantProfileHandler}
                />
            )}
            {selectedApplicantProfile && (
                <EmployeeProfileDetailsModal
                    profile={selectedApplicantProfile}
                    onClose={() => setSelectedApplicantProfile(null)}
                />
            )}
            {selectedShiftInfo && currentUserProfile && (
                <ShiftInfoModal
                    shift={selectedShiftInfo}
                    onClose={() => setSelectedShiftInfo(null)}
                    // onUpdate could be added if actions in modal should refresh this page
                />
            )}
            {selectedJobPostingInfo && currentUserProfile && (
                <JobPostingInfoModal
                    posting={selectedJobPostingInfo}
                    currentUserRole={currentUserProfile.role as UserRole}
                    onClose={() => setSelectedJobPostingInfo(null)}
                    onViewEmployerProfile={(empId) => { console.log("View employer profile from JobPostingInfoModal:", empId); /* Implement if needed */ }}
                />
            )}

            <style jsx global>{`
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-sm { @apply px-3 py-1.5 text-sm; }
                .btn-xs { @apply px-2.5 py-1.5 text-xs; }
            `}</style>
        </div>
    );
}

export default ApplicantsPage;