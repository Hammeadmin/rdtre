// src/components/Notifications/NotificationBell.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, User } from 'lucide-react';
import { Bell, XCircle, CheckCircle, Briefcase, Calendar, MessageSquare, DollarSign, Info, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ShiftDetailsModal } from '../Shifts/ShiftdetailsmodalPharm';
import { EmployeeProfileDetailsModal } from '../Profile/EmployeeProfileDetailsModal';
import toast from 'react-hot-toast';
import type { ShiftNeed, UserRole, ShiftStatus, UserProfile, Notification as NotificationType } from '../../types';
import { applyForShift } from '../../lib/shifts';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Helper function to format Date safely
const formatDateSafe = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return 'Ogiltigt datum'; // Swedish for "Invalid Date"
        // Using Swedish locale for toLocaleString
        return dateObj.toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) { return 'Ogiltigt datumsträng'; } // Swedish for "Invalid Date String"
};

export function NotificationBell() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(true);
    const [errorNotifications, setErrorNotifications] = useState<string | null>(null);
    const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<ShiftNeed | null>(null);
    const [isLoadingShiftDetails, setIsLoadingShiftDetails] = useState(false);
    const [selectedProfileForDetails, setSelectedProfileForDetails] = useState<UserProfile | null>(null);
    const [isLoadingProfileDetails, setIsLoadingProfileDetails] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setNotifications([]);
                return;
            }
            const { data, error: fetchError } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(30);

            if (fetchError) throw fetchError;
            setNotifications(Array.isArray(data) ? data : []);
            if (errorNotifications) setErrorNotifications(null); // Clear previous error if fetch succeeds
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            setErrorNotifications('Kunde inte ladda notifikationer.');
        }
    }, [errorNotifications]); // Dependency on errorNotifications to clear it

    useEffect(() => {
        let isMounted = true;
        let authListenerSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;
        let notificationChannel: ReturnType<typeof supabase.channel> | null = null;

        const initialize = async () => {
            if (!isMounted) return;
            setLoadingNotifications(true);
            setErrorNotifications(null);
            try {
                await fetchNotifications();

                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                    if (!isMounted) return;
                    if (session) {
                        fetchNotifications();
                    } else {
                        setNotifications([]);
                        setShowDropdown(false);
                    }
                });
                authListenerSubscription = subscription;

                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser?.id && isMounted) {
                    notificationChannel = supabase.channel('public:notifications:user-' + currentUser.id)
                        .on<NotificationType>(
                            'postgres_changes',
                            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
                            (payload) => {
                                if (!isMounted) return;
                                setNotifications(prev => [payload.new, ...prev.filter(n => n.id !== payload.new.id)].slice(0, 30));
                                toast('Ny notifikation!', { icon: '🔔' });
                            }
                        )
                        .subscribe((status, err) => {
                            if (err) {
                                console.error('Notification subscription error:', err);
                                if (isMounted) setErrorNotifications("Anslutningsfel för notifikationer.");
                            } else {
                                console.log('Notification subscription status:', status);
                            }
                        });
                }
            } catch (initError) {
                if (isMounted) setErrorNotifications("Initiering av notifikationer misslyckades.");
            } finally {
                if (isMounted) setLoadingNotifications(false);
            }
        };

        initialize();

        return () => {
            isMounted = false;
            authListenerSubscription?.unsubscribe();
            if (notificationChannel) {
                supabase.removeChannel(notificationChannel).catch(console.error);
            }
        };
    }, [fetchNotifications]);

    const markAsRead = useCallback(async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
            if (error) {
                toast.error("Kunde inte markera som läst på servern.");
                // Optionally revert optimistic update if server update fails
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
                console.error('Server error marking as read:', error);
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n)); // Revert
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        const unreadNotifications = notifications.filter(n => !n.read);
        if (unreadNotifications.length === 0) return;

        const originalNotifications = [...notifications];
        setNotifications(p => p.map(n => ({ ...n, read: true })));

        try {
            const { data, error } = await supabase.rpc('mark_all_notifications_read');
            if (error) throw error;
            toast.success(`${data ?? 0} notifikationer markerade som lästa.`);
        } catch (error: any) {
            console.error("Error marking all read:", error);
            toast.error("Misslyckades att markera alla som lästa.");
            setNotifications(originalNotifications); // Revert on error
        }
    }, [notifications]);

    const handleApplyFromNotification = useCallback(async (shiftId: string): Promise<{ success: boolean; error: string | null }> => {
        const result = await applyForShift(shiftId, null); // Assuming applyForShift handles auth check
        if (result.success) {
            toast.success("Ansökan skickad!");
        } else {
            toast.error(result.error || "Kunde inte skicka ansökan.");
        }
        return result;
    }, []);

    const handleNotificationClick = async (notification: NotificationType) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
        setShowDropdown(false);

        if (profile?.role === 'employer') {
            const lowerCaseMessage = notification.message?.toLowerCase() || "";
            const lowerCaseTitle = notification.title?.toLowerCase() || "";

            const isNewShiftApplication =
                notification.type === 'new_shift_application' ||
                (notification.type === 'new_application' && (lowerCaseMessage.includes('shift') || lowerCaseMessage.includes('passansökan') || lowerCaseTitle.includes('shift') || lowerCaseTitle.includes('passansökan')));

            const isNewJobPostingApplication =
                notification.type === 'new_job_application' ||
                notification.type === 'job_application_received' ||
                (notification.type === 'new_application' &&
                    (lowerCaseMessage.includes('job posting') || lowerCaseMessage.includes('job application') || lowerCaseMessage.includes('tjänst') || lowerCaseMessage.includes('annons') ||
                     lowerCaseTitle.includes('job posting') || lowerCaseTitle.includes('job application') || lowerCaseTitle.includes('tjänst') || lowerCaseTitle.includes('annons')));

            if (isNewShiftApplication) {
                navigate('/employer/applicants?tab=shiftApplications');
                return;
            }
            if (isNewJobPostingApplication) {
                navigate('/employer/applicants?tab=jobPostingApplications');
                return;
            }
        }
else if (notification.type === 'payroll_reminder') {
        // This reminder is for employees (pharmacist, säljare, egenvårdsrådgivare)
        if (profile?.role === 'pharmacist' || profile?.role === 'säljare' || profile?.role === 'egenvårdsrådgivare') {
            navigate('/my-payroll'); // Navigate employee to their payroll page
            return; // Stop further processing after navigating
        }
    } else if (notification.type === 'payroll_reminder_employer') {
         // This reminder is specifically for employers
         if (profile?.role === 'employer') {
            navigate('/payroll'); // Navigate employer to their payroll management page
            return; // Stop further processing after navigating
        }
    }

        if (!notification.related_id) {
            toast(notification.message || notification.title || "Notifikationsinformation.");
            return;
        }

        setSelectedShiftForDetails(null);
        setSelectedProfileForDetails(null);

        const isPotentiallyJobPostingRelatedModal = (
            notification.type?.includes('job_posting') ||
            notification.type === 'new_job_application' ||
            notification.type === 'job_application_received' ||
            notification.type === 'new_application' ||
            notification.message?.toLowerCase().includes('job posting') ||
            notification.message?.toLowerCase().includes('job application') ||
            notification.title?.toLowerCase().includes('job posting') ||
            notification.title?.toLowerCase().includes('job application')
        );

        if (isPotentiallyJobPostingRelatedModal) {
            const applicationId = notification.related_id;
            setIsLoadingProfileDetails(true);
            try {
                const { data: appDetails, error: appError } = await supabase
                    .from('job_posting_applications')
                    .select('id, applicant_id, job_posting_id')
                    .eq('id', applicationId)
                    .maybeSingle();
                if (appError) throw appError;
                if (!appDetails) throw new Error(`Jobbansökan ${applicationId} hittades inte.`);
                if (!appDetails.applicant_id) throw new Error(`Sökande-ID saknas för jobbansökan ${applicationId}.`);

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', appDetails.applicant_id)
                    .single();
                if (profileError) throw profileError;
                if (!profileData) throw new Error(`Sökandeprofil ${appDetails.applicant_id} hittades inte.`);
                setSelectedProfileForDetails(profileData as UserProfile);
            } catch (err: any) {
                toast.error(err.message || "Kunde inte ladda detaljer för denna notifikation.");
            } finally {
                setIsLoadingProfileDetails(false);
            }
        } else {
            setIsLoadingShiftDetails(true);
            try {
                let shiftDataForModal: ShiftNeed | null = null;
                const currentUser = (await supabase.auth.getUser()).data.user;
                if (!currentUser) throw new Error("Användare ej autentiserad");

                const isApplicationStatusChangeForEmployee =
                    ['application_accepted', 'application_rejected'].includes(notification.type) &&
                    profile?.id === currentUser.id &&
                    profile?.role !== 'employer';

                if (isApplicationStatusChangeForEmployee) {
                    const applicationId = notification.related_id;
                    const { data: appViewData, error: viewError } = await supabase
                        .from('user_applications')
                        .select(`*, shift_required_experience, shift_is_urgent, shift_urgent_pay_adjustment, shift_created_at`)
                        .eq('id', applicationId)
                        .eq('applicant_id', currentUser.id)
                        .maybeSingle();
                    if (viewError) throw new Error(`Vyfel: ${viewError.message}`);
                    if (!appViewData || !appViewData.shift_id) throw new Error("Ansökan/Skiftdetaljer hittades inte.");
                    shiftDataForModal = {
                        id: appViewData.shift_id, title: appViewData.shift_title ?? 'Namnlöst Skift', description: appViewData.shift_description ?? null,
                        date: appViewData.shift_date ?? '', start_time: appViewData.shift_start_time ?? '', end_time: appViewData.shift_end_time ?? '',
                        lunch: appViewData.shift_lunch ?? null, location: appViewData.shift_location ?? null, status: (appViewData.shift_status as ShiftStatus) ?? 'unknown',
                        required_role: (appViewData.shift_required_role as UserRole) ?? null, required_experience: appViewData.shift_required_experience ?? [],
                        is_urgent: appViewData.shift_is_urgent ?? false, urgent_pay_adjustment: appViewData.shift_urgent_pay_adjustment ?? null,
                        created_at: appViewData.shift_created_at ?? '', employer_id: appViewData.employer_id ?? '', employer_name: appViewData.employer_name ?? 'Okänd arbetsgivare',
                    };
                } else {
                    const shiftIdToFetch = notification.related_id;
                    const { data: shiftDetails, error: shiftError } = await supabase
                        .from('shift_needs').select(`*, employer:employer_id (full_name, pharmacy_name)`).eq('id', shiftIdToFetch).maybeSingle();
                    if (shiftError) throw new Error(`Skiftfel: ${shiftError.message}`);
                    if (!shiftDetails) throw new Error(`Skift ${shiftIdToFetch} hittades inte.`);
                    shiftDataForModal = {
                        id: shiftDetails.id, title: shiftDetails.title ?? 'Namnlöst Skift', description: shiftDetails.description ?? null,
                        date: shiftDetails.date ?? '', start_time: shiftDetails.start_time ?? '', end_time: shiftDetails.end_time ?? '',
                        required_experience: shiftDetails.required_experience ?? [], status: (shiftDetails.status as ShiftStatus) ?? 'unknown',
                        required_role: (shiftDetails.required_role as UserRole) ?? null, location: shiftDetails.location ?? null,
                        lunch: shiftDetails.lunch ?? null, is_urgent: shiftDetails.is_urgent ?? false, urgent_pay_adjustment: shiftDetails.urgent_pay_adjustment ?? null,
                        employer_id: shiftDetails.employer_id ?? '', employer_name: shiftDetails.employer?.pharmacy_name || shiftDetails.employer?.full_name || 'Okänd arbetsgivare', created_at: shiftDetails.created_at ?? '',
                    };
                }
                if (shiftDataForModal) { setSelectedShiftForDetails(shiftDataForModal); }
                else { throw new Error("Kunde inte förbereda skiftdata för modalen."); }
            } catch (err: any) {
                toast.error(err.message || "Kunde inte visa detaljer.");
            } finally {
                setIsLoadingShiftDetails(false);
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="relative p-2.5 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
                    aria-label={`Notifieringar (${unreadCount} olästa)`}
                    aria-expanded={showDropdown}
                    aria-haspopup="true"
                >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-2 ring-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-900">Notifieringar</h3>
                            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline focus:outline-none">Markera alla som lästa</button>}
                        </div>
                        <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y divide-gray-100">
                            {loadingNotifications ? ( <div className="text-center p-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" /></div> )
                            : errorNotifications ? ( <div className="text-center text-red-500 p-4 text-sm">{errorNotifications}</div> )
                            : notifications.length === 0 ? ( <div className="text-center text-gray-500 p-4 text-sm">Inga notifieringar</div> )
                            : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        role="button" tabIndex={0}
                                        className={`px-4 py-3 block w-full text-left cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors duration-150 ${!notification.read ? 'bg-blue-50 font-medium' : 'bg-white'}`}
                                        onClick={() => handleNotificationClick(notification)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
                                    >
                                        <p className={`text-sm flex items-center gap-1.5 ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {notification.type === 'urgent_shift' && <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />}
                                            {(notification.type === 'new_application' || notification.type === 'new_shift_application' || notification.type?.includes('job_posting') || notification.type === 'new_job_application' || notification.type === 'job_application_received') && <Briefcase className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                                            {notification.type === 'application_accepted' && <User className="h-4 w-4 text-green-500 flex-shrink-0" />}
                                            {notification.type === 'application_rejected' && <User className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                           {(notification.type === 'payroll_reminder' || notification.type === 'payroll_reminder_employer') && <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />}
                                          {notification.type === 'sick_report' && <XCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />}
                                            <span className="flex-1 break-words">{notification.title}</span>
                                        </p>
                                        <p className={`text-xs mt-0.5 break-words ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>{notification.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{formatDateSafe(notification.created_at)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedShiftForDetails && (
                <ShiftDetailsModal
                    shift={selectedShiftForDetails}
                    onClose={() => setSelectedShiftForDetails(null)}
                    onApply={(profile?.role !== 'employer' && profile?.role !== 'admin') ? () => handleApplyFromNotification(selectedShiftForDetails.id) : undefined}
                    // Add hasApplied prop if ShiftDetailsModal uses it
                    // hasApplied={selectedShiftForDetails ? appliedShiftIds.has(selectedShiftForDetails.id) : false} 
                />
            )}
            {selectedProfileForDetails && (
                <EmployeeProfileDetailsModal
                    profile={selectedProfileForDetails}
                    onClose={() => setSelectedProfileForDetails(null)}
                />
            )}

            {isLoadingShiftDetails && (
                <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[60]" aria-live="polite" aria-busy="true">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" /><span className="sr-only">Laddar skiftdetaljer...</span>
                </div>
            )}
            {isLoadingProfileDetails && (
                <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[60]" aria-live="polite" aria-busy="true">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" /><span className="sr-only">Laddar profildetaljer...</span>
                </div>
            )}
        </>
    );
}