// src/components/postings/PostingDetailsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Clock, MapPin, Building2, Briefcase, AlertTriangle, CheckCircle, DollarSign, Send, Info as InfoIcon, Award, Loader2, Edit3, Trash2, User as UserIcon } from 'lucide-react';
import { format, parseISO, isValid, isPast, startOfDay, parse } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { JobPosting, UserRole, UserProfile, Schedule } from '../../types';
import { MessageButton } from '../Messages/MessageButton';
import { processPostingForPayroll, getPostingFinancials, PostingFinancials } from '../../lib/postings';
import { toast } from 'react-hot-toast';
import { updatePostingStatus } from '../../lib/postings';
import { EmployeeProfileDetailsModal } from '../Profile/EmployeeProfileDetailsModal';
import { CalendarDays as DayIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom'; // Make sure Link is imported
import { EmployerProfileViewModal } from '../employer/EmployerProfileViewModal';

// Define the shape of the new specific work time object
type SpecificWorkTime = { date: string; startTime: string; endTime: string };
const roleDisplayMap: Record<string, string> = {
    pharmacist: 'Farmaceut',
    säljare: 'Säljare',
    egenvårdsrådgivare: 'Egenvårdsrådgivare'
};

// This is the key change to align with your other components.
// It now expects the employer data to be nested.
type ExtendedJobPosting = JobPosting & {
    employer?: { pharmacy_name?: string | null; full_name?: string | null; } | null;
    employer_name?: string | null; // Keep for fallback
    payroll_processed?: boolean;
    assigned_applicant_id?: string | null;
    hourly_rate: number | null;
    schedules: Schedule[] | null;
    specific_work_times?: SpecificWorkTime[] | null;
};

interface PostingDetailsModalProps {
    posting: ExtendedJobPosting | null;
    currentUserRole: UserRole | 'anonymous';
    assignedApplicantId?: string | null;
    onClose: () => void;
    onViewEmployerProfile: (employerId: string) => void; // Kept for consistency, but Link is used
  onViewApplicantProfile: (applicantId: string) => void;
    onApply?: () => void;
    hasApplied?: boolean;
    onUpdate?: () => void;
    onAdminEdit?: (postingToEdit: JobPosting) => void;
    onAdminDelete?: (postingId: string) => void;
    canApplyInfo: { canApply: boolean; reason?: string };
}

function formatDateSafeModal(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
        const dateObj = parseISO(dateString);
        return isValid(dateObj) ? format(dateObj, 'd MMMM yyyy', { locale: sv }) : 'Ogiltigt Datum';
    } catch (e) { return 'Datumfel'; }
}

export function PostingDetailsModal({
    posting,
    currentUserRole,
    assignedApplicantId,
    onClose,
    onViewEmployerProfile,
    onApply,
    hasApplied,
    onUpdate,
    onAdminEdit,
    onAdminDelete,
    canApplyInfo
}: PostingDetailsModalProps) {
  const navigate = useNavigate();
    const [processingPayroll, setProcessingPayroll] = useState(false);
    const [assignedEmployeeProfile, setAssignedEmployeeProfile] = useState<UserProfile | null>(null);
    const [loadingAssignedEmployee, setLoadingAssignedEmployee] = useState(false);
    const [showApplicantProfileModal, setShowApplicantProfileModal] = useState(false);
    const [financials, setFinancials] = useState<PostingFinancials | null>(null);
    const [loadingFinancials, setLoadingFinancials] = useState(false);
   const { profile } = useAuth();
    const [isCompleting, setIsCompleting] = React.useState(false);
    const [employerProfileModalOpen, setEmployerProfileModalOpen] = useState(false);
    const [viewingEmployerId, setViewingEmployerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchAssignedApplicantProfile = async () => {
            const applicantId = (posting as any).applicant_id;
       if (applicantId && (posting?.status === 'filled' || posting?.status === 'completed')) {
                setLoadingAssignedEmployee(true);
                try {
                   const { data: applicantProfile, error } = await supabase.from('profiles').select('*').eq('id', applicantId).single();
                    if (error) throw error;
                    setAssignedEmployeeProfile(applicantProfile as UserProfile);
                } catch (err) {
                    console.error("Error fetching assigned applicant's profile:", err);
                    toast.error("Kunde inte ladda information om tilldelad sökande.");
                } finally {
                    setLoadingAssignedEmployee(false);
                }
            } else {
                setAssignedEmployeeProfile(null);
            }
        };
        fetchAssignedApplicantProfile();
    }, [posting?.applicant_id, posting?.status]);

    const handleCalculateFinancials = useCallback(async () => {
        if (!posting?.id) return;
        setLoadingFinancials(true);
        const data = await getPostingFinancials(posting.id);
        setFinancials(data);
        setLoadingFinancials(false);
    }, [posting?.id]);

  
     const handleViewEmployerProfile = useCallback((employerId: string) => {
        setViewingEmployerId(employerId);
        setEmployerProfileModalOpen(true);
    }, []);

    const handleCloseEmployerProfileModal = useCallback(() => {
        setEmployerProfileModalOpen(false);
        setViewingEmployerId(null);
    }, []);

  const handleMarkAsCompleted = async () => {
       if (!posting?.id) return;

       if (!window.confirm("Är du säker på att du vill markera detta uppdrag som slutfört?")) {
           return;
       }

       setIsCompleting(true);
       const toastId = toast.loading("Märker uppdrag som slutfört...");
       try {
           const result = await updatePostingStatus(posting.id, 'completed');
                   if (result.success) {
              toast.success("Uppdraget har markerats som slutfört!", { id: toastId });
               if (onUpdate) onUpdate();
               onClose();
           } else {
               throw new Error(result.error ?? "Okänt fel");
           }
       } catch (error: any) {
           toast.error(`Misslyckades: ${error.message}`, { id: toastId });
       } finally {
           setIsCompleting(false);
       }
   };
    
    const handleProcessPostingForPayroll = async () => {
        if (!posting?.id || !assignedApplicantId) {
            toast.error("Information about posting or assigned employee is missing.");
            return;
        }
        if (!window.confirm(`Markera annonsen "${posting.title}" som slutförd och skicka till lönelistan?`)) return;
        setProcessingPayroll(true);
        const toastId = toast.loading("Bearbetar och skapar löneunderlag...");
        try {
            const result = await processPostingForPayroll(posting.id, assignedApplicantId);
            if (result.error) throw new Error(result.error);
            toast.success("Löneunderlag har skapats!", { id: toastId });
            if (onUpdate) onUpdate();
            onClose();
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setProcessingPayroll(false);
        }
    };
    
    if (!posting) return null;

  const handleNavigateToEmployer = (employerId: string) => {
        onClose(); // Close the modal first
        navigate(`/employer/${employerId}`); // Then navigate to the new page
    };

    if (!posting) return null;

    const employeeRoles: UserRole[] = ['pharmacist', 'säljare', 'egenvårdsrådgivare'];
    const isApplicantUserType = employeeRoles.includes(currentUserRole as UserRole);
    const isEmployerUserType = currentUserRole === 'employer';
    const isAdmin = currentUserRole === 'admin';
    const canMarkPostingComplete = (isEmployerUserType || isAdmin) && posting.status === 'filled' && posting.period_end_date && isPast(startOfDay(parseISO(posting.period_end_date))) && !!assignedApplicantId && !posting.payroll_processed;
    const showApplyButton = isApplicantUserType && posting.status === 'open' && onApply;

    const getStatusColor = (status?: string | null) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'filled': return 'bg-green-100 text-green-800 border-green-300';
            case 'completed': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    // --- THIS IS THE ONLY FIX ---
    // This safely finds the employer's name, whether it's nested or not.
    const employerName = posting.employer?.pharmacy_name || posting.employer?.full_name || posting.employer_name || 'Okänd arbetsgivare';

  const displayRole = roleDisplayMap[posting.required_role] || posting.required_role;

    
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-start px-4 sm:px-6 py-3 sm:py-4 border-b">
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">{posting.title}</h2>
                            {/* I have replaced the complex button with a simple Link, which is more reliable */}
                          {currentUserRole !== 'employer' && (
                           <button 
    onClick={(e) => {
    e.stopPropagation(); // This stops the click from closing the parent modal
    handleViewEmployerProfile(posting.employer_id!); // The '!' asserts that employer_id is not null
}}
    className="text-xs sm:text-sm text-gray-500 flex items-center mt-1 hover:text-blue-600 group text-left"
>
                            <Building2 className="icon-style" />
                            <span className="group-hover:underline">{employerName}</span>
                            {(isApplicantUserType || isAdmin) && posting.employer_id && (
                                <InfoIcon size={12} className="ml-2 text-gray-400 group-hover:text-blue-600" />
                            )}
                        </button>
                                  )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full -mr-1"><X className="h-5 w-5 sm:h-6 sm:w-6" /></button>
                    </div>

                    <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-4 sm:space-y-5">
                        <div><span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(posting.status)}`}>Status: {posting.status?.charAt(0).toUpperCase() + posting.status.slice(1)}</span>{posting.payroll_processed && (<span className="ml-2 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-purple-100 text-purple-800">Lön Bearbetad</span>)}</div>
                        
                        {(posting.status === 'filled' || posting.status === 'completed') && assignedEmployeeProfile && (
                             <div className="p-3 bg-green-50 border border-green-200 rounded-md"><h3 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1 flex items-center"><UserIcon size={14} className="mr-1.5" /> Tilldelad:</h3>{loadingAssignedEmployee ? <div className="flex items-center text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Laddar...</div> : assignedEmployeeProfile ? <div className="flex items-center justify-between"><span className="text-sm text-green-900 font-medium">{assignedEmployeeProfile.full_name}</span><button onClick={() => setShowApplicantProfileModal(true)} className="btn btn-secondary-outline btn-xs">Visa Profil</button></div> : <p className="text-sm italic">Kunde inte laddas.</p>}</div> 
                        )}

                        <dl className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4"><dt className="dt-style"><Briefcase className="icon-style" />Sökes Roll</dt><dd className="dd-style col-span-2">{displayRole}</dd></div>
                            {posting.location && <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4"><dt className="dt-style"><MapPin className="icon-style" />Plats</dt><dd className="dd-style col-span-2"><a href={`https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(posting.location)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{posting.location}</a></dd></div>}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4"><dt className="dt-style"><Calendar className="icon-style" />Period</dt><dd className="dd-style col-span-2">{formatDateSafeModal(posting.period_start_date)} - {formatDateSafeModal(posting.period_end_date)}</dd></div>
                            {posting.estimated_hours && <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4"><dt className="dt-style"><Clock className="icon-style" />Omfattning</dt><dd className="dd-style col-span-2">{posting.estimated_hours}</dd></div>}
                            {posting.salary_description && <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4"><dt className="dt-style"><DollarSign className="icon-style" />Lön</dt><dd className="dd-style col-span-2">{posting.salary_description}</dd></div>}
                            
                            <div className="pt-2"><dt className="dt-style mb-1 border-b pb-1 font-semibold text-sm">Beskrivning</dt><dd className="dd-style whitespace-pre-wrap text-gray-700 text-xs sm:text-sm">{posting.description || <span className="italic">...</span>}</dd></div>
                            {posting.required_experience && posting.required_experience.length > 0 && <div className="pt-2"><dt className="dt-style mb-1 border-b pb-1 font-semibold text-sm">Krav Erfarenhet</dt><dd className="dd-style"><ul className="list-disc list-inside">{posting.required_experience.map((exp, i) => <li key={i}>{exp}</li>)}</ul></dd></div>}

                            <div className="pt-3 border-t">
                                <h4 className="dt-style font-semibold mb-2 text-sm">Arbetstider och Timlön</h4>
                                
                                {posting.hourly_rate && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 mb-3"><dt className="dt-style"><DollarSign className="icon-style"/>Timpris</dt><dd className="dd-style col-span-2 font-semibold">{posting.hourly_rate} SEK/timme</dd></div>
                                )}
                                
                                {(posting.specific_work_times && posting.specific_work_times.length > 0) ? (
                                    <div className="space-y-1">
                                        {posting.specific_work_times.map((work, index) => {
                                            const start = parse(work.startTime, 'HH:mm', new Date());
                                            const end = parse(work.endTime, 'HH:mm', new Date());
                                            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                            return (
                                                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                                                    <dt className="dt-style pl-6"><DayIcon className="icon-style -ml-6"/>{formatDateSafeModal(work.date)}</dt>
                                                    <dd className="dd-style col-span-2">{work.startTime} - {work.endTime} ({duration.toFixed(1)} tim)</dd>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (posting.schedules && posting.schedules.length > 0) ? (
                                    <div className="space-y-1">
                                        {posting.schedules.sort((a, b) => a.day - b.day).map((schedule) => (
                                            <div key={schedule.day} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                                                <dt className="dt-style pl-6"><DayIcon className="icon-style -ml-6"/>{['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'][schedule.day-1]}</dt>
                                                <dd className="dd-style col-span-2">{schedule.start} - {schedule.end}</dd>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-gray-500 pl-6">Inga specifika arbetstider angivna.</p>
                                )}
                            </div>
                        </dl>
                        
                        <div className="pt-3 border-t">
                            <div className="flex justify-between items-center"><h4 className="dt-style col-span-3 font-semibold mb-2 text-sm">Beräkna Lön</h4><button onClick={handleCalculateFinancials} disabled={loadingFinancials} className="btn btn-secondary-outline btn-xs">{loadingFinancials ? <Loader2 className="h-4 w-4 animate-spin" /> : "Beräkna"}</button></div>
                            {financials && !financials.error && <dl className="mt-2 space-y-2 text-xs"><div className="grid grid-cols-2 gap-x-4"><dt className="font-medium">Totala timmar:</dt><dd className="text-right">{financials.total_hours} tim</dd></div><div className="grid grid-cols-2 gap-x-4"><dt className="font-medium">Grundlön:</dt><dd className="text-right">{financials.base_pay} SEK</dd></div><div className="grid grid-cols-2 gap-x-4"><dt className="font-medium">Total OB-ersättning:</dt><dd className="text-right">{financials.total_ob_premium} SEK</dd></div><div className="grid grid-cols-2 gap-x-4 pt-1 border-t"><dt className="font-semibold">Beräknad Totallön:</dt><dd className="font-bold text-right">{financials.final_total_pay} SEK</dd></div></dl>}
                            {financials?.error && <p className="text-red-600 text-xs mt-2">Kunde inte beräkna lön: {financials.error}</p>}
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 py-3 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                        <div className="flex-1 flex items-center flex-wrap gap-2">
                            {(isEmployerUserType || isAdmin) && canMarkPostingComplete && <button onClick={handleProcessPostingForPayroll} disabled={processingPayroll || loadingAssignedEmployee} className="btn btn-success btn-sm">{processingPayroll ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Award className="h-4 w-4 mr-2"/>}Markera Slutförd & Skapa Lön</button>}
                            {isAdmin && onAdminEdit && <button onClick={() => onAdminEdit(posting)} className="btn btn-secondary-outline btn-sm"><Edit3 size={14} className="mr-1.5" />Redigera</button>}
                            {isAdmin && onAdminDelete && posting.status !== 'completed' && <button onClick={() => onAdminDelete(posting.id)} className="btn btn-danger-outline btn-sm"><Trash2 size={14} className="mr-1.5" />Ta bort</button>}
                            {isApplicantUserType && posting.employer_id && <MessageButton recipientId={posting.employer_id} recipientRole="employer" size="sm" />}
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto justify-end">
                            <button onClick={onClose} type="button" className="btn btn-secondary flex-1 sm:flex-auto">Stäng</button>

                          {profile?.role === 'employer' && posting.status === 'filled' && (
           <button
               type="button"
               onClick={handleMarkAsCompleted}
               disabled={isCompleting}
               className="btn btn-success"
           >
               {isCompleting ? <Loader2 className="h-5 w-5 mr-1.5 animate-spin" /> : <CheckCircle className="h-5 w-5 mr-1.5" />}
                            Markera som Slutfört
           </button>
       )}
                            {showApplyButton && (
                                <div className="relative group flex-1 sm:flex-auto">
                                    <button onClick={() => { if (canApplyInfo.canApply && onApply) onApply(); }} disabled={hasApplied || !canApplyInfo.canApply} type="button" className={`w-full btn ${hasApplied ? 'btn-success opacity-70' : (canApplyInfo.canApply ? 'btn-primary' : 'btn-disabled-custom')}`} title={!canApplyInfo.canApply ? canApplyInfo.reason : (hasApplied ? "Redan ansökt" : "Ansök nu")}>{hasApplied ? 'Ansökt' : canApplyInfo.canApply ? <><Send className="h-4 w-4 mr-2" />Ansök Nu</> : 'Ej Behörig'}</button>
                                    {!hasApplied && !canApplyInfo.canApply && canApplyInfo.reason && <div className="absolute hidden group-hover:block bottom-full mb-2 w-max max-w-xs bg-black text-white text-xs rounded py-1.5 px-2.5 z-20 shadow-lg text-center"><AlertTriangle className="inline h-4 w-4 mr-1"/>{canApplyInfo.reason}</div>}
                                </div>
                            )}
                            {hasApplied && isApplicantUserType && !onApply && <button disabled type="button" className="btn btn-success opacity-70 flex-1 sm:flex-auto">Ansökt</button>}
                        </div>
                    </div>
                </div>
            </div>
            {showApplicantProfileModal && assignedEmployeeProfile && <EmployeeProfileDetailsModal profile={assignedEmployeeProfile} onClose={() => setShowApplicantProfileModal(false)} />}
         {employerProfileModalOpen && viewingEmployerId && (
                <EmployerProfileViewModal
                    isOpen={employerProfileModalOpen}
                    employerId={viewingEmployerId}
                    onClose={handleCloseEmployerProfileModal}
                />
            )}
            <style jsx>{`
                .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 0.75rem; border-width: 1px; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; transition: all 0.15s ease-in-out; }
                .btn:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-sm { @apply px-3 py-1.5 text-xs; }
                .btn-xs { @apply px-2 py-1 text-[11px]; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500; }
                .btn-secondary-outline { @apply border-gray-400 text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400; }
                .btn-danger-outline { @apply border-red-500 text-red-600 bg-white hover:bg-red-50 focus:ring-2 focus:ring-offset-2 focus:ring-red-500; }
                .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500; }
                .btn-disabled-custom { @apply bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed; }
                .dt-style { @apply text-sm font-medium text-gray-500 col-span-1 flex items-center; }
                .dd-style { @apply text-sm text-gray-900; }
                .icon-style { @apply h-4 w-4 mr-2 text-gray-400 flex-shrink-0; }
            `}</style>
        </>
    );
}