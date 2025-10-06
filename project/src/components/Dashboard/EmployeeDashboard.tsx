
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'; // Added useRef
import {
     Calendar as CalendarIconLucide,
    Clock, Building2, CheckCircle, DollarSign, Eye, EyeOff, List, Filter, Search, UserPlus, Trash2, X, MapPin, Briefcase, Loader2, CalendarX2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ShiftDetailsModal } from '../Shifts/ShiftdetailsmodalPharm';

import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { withdrawApplication as withdrawAppHelper } from '../../lib/shifts';
import { format, parseISO, isValid, formatISO, setHours, setMinutes, setSeconds, addDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { InviteUserModal } from '../modals/InviteUserModal'; // <-- 1. IMPORT THE NEW MODAL


import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import fcSvLocale from '@fullcalendar/core/locales/sv';
import PendingInvitations from './PendingInvitations'; // <-- 1. IMPORT THE NEW COMPONENT
import { IntranetFeed } from '../intranet/IntranetFeed';




interface EmployeeApplication {
    id: string; // The application's ID
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; // The application's status

    // All shift details are now nested inside this object
    shift: {
        id: string;
        title: string;
        description: string;
        date: string;
        start_time: string;
        end_time: string;
        location: string | null;
        status: 'open' | 'filled' | 'completed' | 'cancelled' | string;
        employer_id: string;
        required_role: UserRole;
        is_urgent?: boolean;
        hourly_rate?: number; // The missing piece!
        urgent_pay_adjustment?: number;
        lunch_break_minutes?: number;
        employer: {
            pharmacy_name?: string | null;
            full_name?: string | null;
            email?: string | null;
        } | null;
    } | null;
}

function formatInterval(intervalString: string | null | undefined): string | null {
    if (!intervalString || typeof intervalString !== 'string') { return null; }
    const parts = intervalString.split(':');
    if (parts.length === 3) {
        const hours = parseInt(parts[0], 10); const minutes = parseInt(parts[1], 10);
        const totalMinutes = hours * 60 + minutes;
        if (totalMinutes === 0) return null;
        return `${totalMinutes} min`;
    }
    return intervalString;
}

const SkeletonCard = () => (
  <div className="p-4 bg-white rounded-lg shadow border border-gray-200 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="space-y-3 flex-grow">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded-full ml-4"></div>
    </div>
  </div>
);


const useCountUp = (end: number, duration = 1500) => {
    const [count, setCount] = useState(0);
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);

    useEffect(() => {
        let frame = 0;
        const counter = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            const currentCount = Math.round(end * progress);
            setCount(currentCount);

            if (frame === totalFrames) {
                clearInterval(counter);
            }
        }, frameRate);

        return () => clearInterval(counter);
    }, [end, duration, frameRate, totalFrames]);

    return count;
};

const AnimatedStatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode, title: string, value: number, colorClass: string }) => {
    const animatedValue = useCountUp(value);
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 transform hover:-translate-y-1 transition-transform duration-300">
            <div className="p-5 flex items-center">
                <div className={`flex-shrink-0 ${colorClass} rounded-md p-3`}>
                    {icon}
                </div>
                <div className="ml-5 w-0 flex-1">
                    <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{animatedValue}</dd>
                    </dl>
                </div>
            </div>
        </div>
    );
};

// --- NEW: Empty State Component ---
const EmptyState = ({ onButtonClick }: { onButtonClick: () => void }) => (
    <div className="text-center py-16 px-6">
        <CalendarX2 className="mx-auto h-16 w-16 text-gray-300" />
        <h3 className="mt-4 text-lg font-semibold text-gray-800">Inga pass här än</h3>
        <p className="mt-2 text-sm text-gray-500">Det ser ut som att du inte har några pass i den här vyn. Varför inte hitta ett nytt?</p>
        <div className="mt-6">
            <Link to="/shifts" className="btn btn-primary">
                <Search size={16} className="mr-2"/> Hitta Nya Pass
            </Link>
        </div>
    </div>
);

  export function EmployeeDashboard() {
    const { profile } = useAuth();
    const [isIntranetVisible, setIsIntranetVisible] = useState(true); 
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // <-- 2. ADD STATE FOR THE MODAL


    // --- NEW: Role-specific configuration --- 
    const dashboardConfig = useMemo(() => {
        const role = profile?.role;
        switch (role) {
            case 'pharmacist':
                return { title: 'Min Översikt', channel: 'pharmacist-dashboard-applications' };
            case 'säljare':
                return { title: 'Säljare/Kassapersonal Översikt', channel: 'saljare-dashboard-applications' };
            case 'egenvårdsrådgivare':
                return { title: 'Egenvårdsrådgivare Översikt', channel: 'egenvard-dashboard-applications' };
            default:
                return { title: 'Min Översikt', channel: 'generic-dashboard-applications' };
        }
    }, [profile?.role]);    
    const [myApplications, setMyApplications] = useState<PharmacistApplication[]>([]);
    const [completedApplications, setCompletedApplications] = useState<PharmacistApplication[]>([]);
    const [stats, setStats] = useState({ totalApplications: 0, acceptedApplications: 0, shiftsCompleted: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedShiftDetails, setSelectedShiftDetails] = useState<any | null>(null); // Renamed from selectedShift to avoid confusion
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const calendarRef = useRef<HTMLDivElement>(null);
    const calendarInstanceRef = useRef<Calendar | null>(null);

const fetchMyApplications = useCallback(async () => {
    setError(null);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not found");

        // --- NEW, MORE ROBUST QUERY ---
        const { data, error: fetchError } = await supabase
            .from('shift_applications') // Start from the applications table
            .select(`
                id, 
                status,
                shift:shift_id (
                    *,
                    employer:employer_id (
                        full_name,
                        email,
                        pharmacy_name
                    )
                )
            `)
            .eq('applicant_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const allApps = (data || [])
            .map(app => ({...app, application_status: app.status})) // Ensure status is consistent
            .filter(app => app.shift) as EmployeeApplication[]; // Filter out any apps with missing shifts

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingAndPending: EmployeeApplication[] = [];
        const history: EmployeeApplication[] = [];

        allApps.forEach(app => {
            if (!app.shift) return;
            const shiftDate = parseISO(app.shift.date);
            const isFutureOrToday = isValid(shiftDate) && shiftDate >= today;
            if ((app.application_status === 'accepted' || app.application_status === 'pending') && isFutureOrToday) {
                upcomingAndPending.push(app);
            } else {
                history.push(app);
            }
        });

        setMyApplications(upcomingAndPending.sort((a, b) => new Date(a.shift!.date).getTime() - new Date(b.shift!.date).getTime()));
        setCompletedApplications(history.sort((a, b) => new Date(b.shift!.date).getTime() - new Date(a.shift!.date).getTime()));
    } catch (err: any) {
        toast.error('Failed to load applications');
        setError(err.message || 'Failed to fetch applications.');
    }
}, []);

    const fetchStats = useCallback(async () => {
        if (!profile?.id) return;
        setStatsLoading(true);
        setStatsError(null);
        try {
            const userId = profile.id;

            const { count: totalCount, error: totalError } = await supabase
                .from('shift_applications')
                .select('*', { count: 'exact', head: true })
                .eq('applicant_id', userId);
            if (totalError) throw totalError;

            const { count: acceptedCount, error: acceptedError } = await supabase
                .from('shift_applications')
                .select('*', { count: 'exact', head: true })
                .eq('applicant_id', userId)
                .eq('status', 'accepted');
            if (acceptedError) throw acceptedError;

            const { data: completedShiftsData, error: completedError } = await supabase.rpc('get_user_completed_accepted_shifts', {
                p_applicant_id: userId
            });

            if (completedError) {
                console.error("Error fetching completed shifts via RPC:", completedError);
                throw completedError;
            }

            const completedCount = completedShiftsData ? completedShiftsData.length : 0;

            setStats({
                totalApplications: totalCount ?? 0,
                acceptedApplications: acceptedCount ?? 0,
                shiftsCompleted: completedCount
            });

        } catch (err: any) {
            console.error("Error fetching stats:", err);
            toast.error('Failed to load statistics');
            setStatsError(err.message || 'Failed to fetch stats.');
            setStats({ totalApplications: 0, acceptedApplications: 0, shiftsCompleted: 0 });
        } finally {
            setStatsLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        if (!profile?.id) { setLoading(false); return; }
        let isMounted = true;
        let applicationSub: any = null;

        const initialize = async () => {
            setLoading(true);
            setError(null);
            await Promise.all([fetchMyApplications(), fetchStats()]);
            if (!isMounted) return;

            applicationSub = supabase.channel(dashboardConfig.channel) // <-- DYNAMIC CHANNEL
                .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications', filter: `applicant_id=eq.${profile.id}` },
                    () => { if (isMounted) { fetchMyApplications(); fetchStats(); } }
                ).subscribe();
            
            setLoading(false);
        };

        initialize();
        return () => {
            isMounted = false;
            if (applicationSub) supabase.removeChannel(applicationSub).catch(console.error);
        };
    }, [profile?.id, fetchMyApplications, fetchStats, dashboardConfig]); // <-- ADDED dashboardConfig

const filteredApplications = useMemo(() => {
        const source = activeTab === 'upcoming' ? myApplications : completedApplications;
        return source.filter(app => {
            if (!app.shift) return false;
            if (statusFilter !== 'all' && app.application_status !== statusFilter) return false;
            if (dateFromFilter && app.shift.date < dateFromFilter) return false;
            if (dateToFilter && app.shift.date > dateToFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return app.shift.title?.toLowerCase().includes(q) ||
                       app.shift.employer?.pharmacy_name?.toLowerCase().includes(q) ||
                       app.shift.employer?.full_name?.toLowerCase().includes(q) ||
                       app.shift.location?.toLowerCase().includes(q);
            }
            return true;
        });
    }, [myApplications, completedApplications, activeTab, statusFilter, dateFromFilter, dateToFilter, searchQuery]);

    const nextUpcomingShift = useMemo(() => {
        return myApplications
          .filter(app => app.application_status === 'accepted' && app.shift)
          .sort((a, b) => new Date(a.shift!.date).getTime() - new Date(b.shift!.date).getTime())[0] || null;
    }, [myApplications]);

    const calendarEvents = useMemo(() => {
        const sourceApps = activeTab === 'upcoming' ? filteredApplications : [];
        return sourceApps.map(app => {
            if (!app.shift || !app.shift.date || !app.shift.start_time || !app.shift.end_time) return null;
            try {
                const baseDate = parseISO(app.shift.date);
                if (!isValid(baseDate)) return null;
                const [startHours, startMinutes] = app.shift.start_time.split(':').map(Number);
                const startDateWithTime = setSeconds(setMinutes(setHours(baseDate, startHours), startMinutes), 0);
                const [endHours, endMinutes] = app.shift.end_time.split(':').map(Number);
                let endDateWithTime = setSeconds(setMinutes(setHours(baseDate, endHours), endMinutes), 0);
                if (endDateWithTime <= startDateWithTime) {
                    endDateWithTime = addDays(endDateWithTime, 1);
                }
                const startIso = formatISO(startDateWithTime);
                const endIso = formatISO(endDateWithTime);
                let bgColor, borderColor, textColor = '#FFFFFF';
                switch(app.application_status) {
                    case 'pending': bgColor = '#F59E0B'; borderColor = '#D97706'; break;
                    case 'accepted': bgColor = '#10B981'; borderColor = '#059669'; break;
                    default: bgColor = '#EF4444'; borderColor = '#DC2626';
                }
                return {
                    id: app.id, title: `${app.shift.title} (${app.application_status})`, start: startIso, end: endIso,
                    allDay: false, backgroundColor: bgColor, borderColor: borderColor, textColor: textColor,
                    extendedProps: { applicationData: app, type: 'employeeApplication' },
                    classNames: [`event-app-status-${app.application_status}`]
                };
            } catch (e) { console.error("Error processing app for calendar:", app.id, e); return null; }
        }).filter((event): event is NonNullable<typeof event> => event !== null);
    }, [filteredApplications, activeTab]);

    const handleViewDetails = useCallback((application: EmployeeApplication) => {
        if (!application.shift) return;
        const shiftForModal = {
            ...application.shift,
            id: application.shift.id,
            application_id: application.id,
            
            
        };
        setSelectedShiftDetails(shiftForModal);
    }, []);

    const handleWithdrawApplication = useCallback(async (applicationId: string) => {
        if (!window.confirm('Are you sure you want to withdraw this application?')) return;
        const toastId = toast.loading('Withdrawing application...');
        try {
            const { success, error: withdrawError } = await withdrawAppHelper(applicationId);
            if (success) {
                toast.success('Application withdrawn.', { id: toastId }); fetchMyApplications(); fetchStats();
            } else {
                toast.error(withdrawError || 'Failed to withdraw. It might have been processed.', { id: toastId });
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message || 'Failed to withdraw'}`, { id: toastId });
        }
    }, [fetchMyApplications, fetchStats]);

    // *** IMPORTANT: FullCalendar Initialization useEffect ***
    useEffect(() => {
        if (activeTab !== 'upcoming' || viewMode !== 'calendar' || !calendarRef.current) {
            if (calendarInstanceRef.current) { calendarInstanceRef.current.destroy(); calendarInstanceRef.current = null; }
            return;
        }

        const initializeCalendar = () => {
            const calendarEl = calendarRef.current;
            if (!calendarEl) return;

            // Define responsive header toolbar options
            const getHeaderToolbarOptions = () => {
                const isMobile = window.innerWidth < 768; // Tailwind's 'md' breakpoint
                if (isMobile) {
                    return {
                        left: 'prev,next',
                        center: 'title',
                        right: 'listWeek,timeGridDay' // More compact views for mobile
                    };
                }
                return {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek'
                };
            };

            // Define responsive views
            const getResponsiveViews = () => {
                return {
                    timeGridDay: { // Ensure timeGridDay is defined if used in mobile header
                        type: 'timeGridDay',
                        buttonText: 'Day'
                    },
                    listWeek: { // Ensure listWeek is defined if used in mobile header
                        type: 'listWeek',
                        buttonText: 'List'
                    },
                    listDay: {
                        type: 'listDay',
                        buttonText: 'Day List'
                    }
                };
            };

            const calendar = new Calendar(calendarEl, {
                plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
                headerToolbar: getHeaderToolbarOptions(), // Use responsive header
                initialView: window.innerWidth < 768 ? 'listWeek' : 'timeGridWeek', // Start with list view on mobile
                views: getResponsiveViews(), // Define custom and responsive views
                locale: fcSvLocale,
                events: calendarEvents,
                height: 'auto', // Keep auto height for responsiveness
                allDaySlot: true,
                slotMinTime: '06:00:00',
                slotMaxTime: '23:00:00',
                nowIndicator: true,
                eventTimeFormat: {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                },
                slotLabelFormat: {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                },
                eventDisplay: 'block',
                eventContent: function(arg) {
                    const app = arg.event.extendedProps.applicationData as PharmacistApplication;
                    let html = `<div class="fc-event-main-custom">`;
                    html += `<div class="font-semibold" title="${arg.event.title}">${arg.event.title}</div>`;
                    html += `<div class="text-[0.7rem]"><span class="inline-block w-3 h-3 mr-1">🏢</span> ${app.employer_name}</div>`;
                    if (app.shift_location) {
                        html += `<div class="text-[0.7rem]"><span class="inline-block w-3 h-3 mr-1">📍</span> ${app.shift_location}</div>`;
                    }
                    html += `</div>`;
                    return { html: html };
                },
                eventClick: function(info) {
                    const app = info.event.extendedProps.applicationData as PharmacistApplication;
                    if (app) handleViewDetails(app);
                },
                eventMouseEnter: (info) => {
                    const app = info.event.extendedProps.applicationData as PharmacistApplication;
                    let tooltipText = `${info.event.title}\n`;
                    tooltipText += `${app.shift_start_time?.slice(0,5) || ''} - ${app.shift_end_time?.slice(0,5) || ''}\n`;
                    tooltipText += `Employer: ${app.employer_name}\n`;
                    if(app.shift_location) tooltipText += `Location: ${app.shift_location}\n`;
                    info.el.title = tooltipText.trim();
                },
            });

            calendar.render();
            calendarInstanceRef.current = calendar;
        };

        // If calendar instance already exists, just update events.
        // Otherwise, initialize it.
        if (calendarInstanceRef.current) {
            calendarInstanceRef.current.setOption('events', calendarEvents);
            // Re-apply headerToolbar and initialView on re-render to ensure responsiveness
            calendarInstanceRef.current.setOption('headerToolbar', getHeaderToolbarOptions());
            calendarInstanceRef.current.changeView(window.innerWidth < 768 ? 'listWeek' : 'timeGridWeek');
        } else {
            initializeCalendar();
        }

        // Add a resize listener to re-render calendar on orientation change or window resize
        const handleResize = () => {
            if (calendarInstanceRef.current) {
                calendarInstanceRef.current.setOption('headerToolbar', getHeaderToolbarOptions());
                calendarInstanceRef.current.changeView(window.innerWidth < 768 ? 'listWeek' : 'timeGridWeek'); // Change view on resize
            }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function for useEffect
        return () => {
            if (calendarInstanceRef.current) {
                calendarInstanceRef.current.destroy();
                calendarInstanceRef.current = null;
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [activeTab, viewMode, calendarEvents, handleViewDetails]);

    // Add styles for calendar events
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .event-app-status-pending {
                border-left: 3px solid #D97706 !important;
            }

            .event-app-status-accepted {
                border-left: 3px solid #059669 !important;
            }

            .event-app-status-rejected, .event-app-status-withdrawn {
                border-left: 3px solid #DC2626 !important;
                opacity: 0.7;
            }
            /* FullCalendar Mobile Adjustments */
            .fc .fc-toolbar.fc-header-toolbar {
                flex-direction: column;
                align-items: flex-start;
            }
            .fc .fc-toolbar-chunk {
                margin-bottom: 0.5rem; /* Space between chunks on mobile */
            }
            .fc .fc-button-group {
                flex-wrap: wrap; /* Allow buttons to wrap */
            }
            .fc .fc-button {
                padding: 0.5em 0.8em; /* Adjust button padding */
                font-size: 0.85em; /* Smaller font size */
                margin-bottom: 0.25em; /* Space between buttons */
            }
            .fc-daygrid-event-harness, .fc-timegrid-event-harness {
                margin-bottom: 1px; /* Reduce spacing between events if too tight */
            }
            .fc-event-main-custom {
                padding: 2px 4px; /* Adjust padding inside custom event content */
                font-size: 0.75rem; /* Smaller text within event bubbles */
                line-height: 1.2;
            }
            .fc-event-main-custom .font-semibold {
                font-size: 0.85rem;
            }
            /* Adjustments for list view events */
            .fc-list-event {
                padding: 0.5rem;
                border-left-width: 4px;
            }
            .fc-list-event-title {
                font-size: 0.9rem;
            }
            .fc-list-event-time {
                font-size: 0.8rem;
            }
            @media (max-width: 767px) { /* Adjust for screens smaller than 'md' */
                .fc .fc-toolbar-chunk {
                    width: 100%;
                    display: flex;
                    justify-content: center; /* Center toolbar chunks */
                    margin-bottom: 0.5rem;
                }
                .fc .fc-button-group {
                    justify-content: center; /* Center button groups */
                    width: 100%;
                }
                .fc .fc-button {
                    flex-grow: 1; /* Allow buttons to grow and fill space */
                    margin: 0.15em; /* Smaller margins for buttons */
                    font-size: 0.8em;
                }
                .fc-daygrid-body, .fc-timegrid-body {
                    font-size: 0.9em; /* Smaller font for calendar cells */
                }
                .fc-daygrid-day-number, .fc-col-header-cell-cushion {
                    padding: 0.2em; /* Reduce padding in day grid */
                }
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

   if (loading) {
  return (
    <div className="space-y-6">
      {/* Skeleton for Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
      {/* Skeleton for Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
      {/* Skeleton for Application List */}
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
    if (error && !loading) return <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">Error: {error}</div>;

    return (
<div className="space-y-6 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{dashboardConfig.title}</h1>
                    <p className="mt-1 text-md text-gray-500">Välkommen tillbaka, {profile?.full_name?.split(' ')[0]}!</p>
                </div>
                <div className="flex items-center gap-2">
                   {!isIntranetVisible && (
            <button
                onClick={() => setIsIntranetVisible(true)}
                className="btn btn-secondary"
                title="Visa intranätflödet"
            >
                <Eye size={16} className="mr-2"/>
                Visa intranät
            </button>
        )}
                <button
            onClick={() => setIsInviteModalOpen(true)}
            className="btn btn-secondary"
          >
            <UserPlus size={16} className="mr-2"/> 
            Bjud in kollega
          </button>
          <Link to="/shifts" className="btn btn-primary">
            <Search size={16} className="mr-2"/> Hitta Nya Pass
          </Link>
         <PendingInvitations />      
             </div>
            </div>

  {/* ADD THIS NEW GRID WRAPPER */}
<div className={`grid grid-cols-1 ${isIntranetVisible ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>

    {/* --- Main Content Column (spans 2 of 3 columns on large screens) --- */}
     <div className={`${isIntranetVisible ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-6`}>




            {/* --- UPDATED: Stats Cards Section --- */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {statsLoading ? (
                    <p className="col-span-full text-center py-4 text-gray-500">Laddar statistik...</p>
                ) : statsError ? (
                    <p className="col-span-full text-center py-4 text-red-500">Kunde inte ladda statistik.</p>
                ) : (
                    <>
                        <AnimatedStatCard icon={<Briefcase className="h-6 w-6 text-blue-600" />} title="Totala Ansökningar" value={stats.totalApplications} colorClass="bg-blue-100" />
                        <AnimatedStatCard icon={<CheckCircle className="h-6 w-6 text-green-600" />} title="Accepterade Pass" value={stats.acceptedApplications} colorClass="bg-green-100" />
                        <AnimatedStatCard icon={<Clock className="h-6 w-6 text-indigo-600" />} title="Genomförda Pass" value={stats.shiftsCompleted} colorClass="bg-indigo-100" />
                    </>
                )}
            </div>

          {/* --- NEW: Next Upcoming Shift Card --- */}
    {activeTab === 'upcoming' && nextUpcomingShift && nextUpcomingShift.shift && (
                <div className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white p-5 rounded-lg shadow-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h3 className="font-bold text-lg flex items-center"><CalendarIconLucide size={20} className="mr-2 opacity-80"/>Ditt Nästa Pass</h3>
                        <p className="mt-1 text-2xl font-semibold">{nextUpcomingShift.shift.title}</p>
                        <p className="text-sm opacity-90 mt-1">{format(parseISO(nextUpcomingShift.shift.date), "'På' EEEE, d MMMM 'kl.' HH:mm", { locale: sv })}</p>
                    </div>
                    <button onClick={() => handleViewDetails(nextUpcomingShift)} className="btn bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold mt-2 sm:mt-0 self-start sm:self-center"><Eye size={16} className="mr-2"/> Visa Detaljer</button>
                </div>
            )}

            <div className="bg-white shadow rounded-lg border border-gray-200">
                <div className="px-4 md:px-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('upcoming')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'upcoming' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Kommande & Väntande</button>
                        <button onClick={() => setActiveTab('completed')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Historik</button>
                    </nav>
                </div>
                
                <div className="p-4 bg-gray-50/70 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                            <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full input-style bg-white">
                                <option value="all">Alla Statusar</option>
                                {activeTab === 'upcoming' && (<> <option value="pending">Väntande</option> <option value="accepted">Accepterad</option> </>)}
                                {activeTab === 'completed' && (<>
                                    <option value="rejected">Avvisad</option>
                                    <option value="withdrawn">Återkallad</option>
                                    <option value="completed">Slutförd</option>
                                    <option value="cancelled">Avbokad</option>
                                </>)}
                            </select>
                            <input id="dateFromFilter" type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} className="w-full input-style" />
                            <input id="dateToFilter" type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} className="w-full input-style" />
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input id="searchQuery" type="text" placeholder="Sök apotek, titel..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 input-style" />
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <div className="flex gap-1 bg-gray-200 p-1 rounded-md">
                                <button onClick={() => setViewMode('list')} title="Listvy" className={`px-3 py-1 rounded text-sm transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:bg-gray-300'}`}><List className="h-4 w-4"/></button>
                                {activeTab === 'upcoming' && (
                                    <button onClick={() => setViewMode('calendar')} title="Kalendervy" className={`px-3 py-1 rounded text-sm transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:bg-gray-300'}`}><CalendarIconLucide className="h-4 w-4"/></button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {viewMode === 'calendar' && activeTab === 'upcoming' ? (
                    <div ref={calendarRef} className="p-4 min-h-[60vh]"></div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredApplications.length === 0 ? <EmptyState /> : (
                            filteredApplications.map((application) => {
                                if (!application.shift) return null;
                                return (
                                <div key={application.id} className={`p-4 transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] border-l-4 ${application.application_status === 'accepted' ? 'border-green-500' : 'border-yellow-500'}`} style={{ animation: 'fadeInUp 0.5s ease-out' }}>
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                                        <div className="flex-grow min-w-0">
                                            <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-x-2">
                                                <span className="truncate">{application.shift.title}</span>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ application.application_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800' }`}>{application.application_status}</span>
                                            </h3>
                                            <div className="mt-1 text-sm text-gray-500 space-y-1">
                                                <p className="flex items-center gap-x-1.5"><Building2 className="h-4 w-4"/>{application.shift.employer?.pharmacy_name || application.shift.employer?.full_name || 'Arbetsgivare ej angivet'}</p>
                                                {application.shift.location && (<p className="flex items-center gap-x-1.5"><MapPin className="h-4 w-4"/> {application.shift.location}</p>)}
                                                <p className="flex items-center gap-x-1.5"><CalendarIconLucide className="h-4 w-4"/> {format(parseISO(application.shift.date), 'd MMMM yy', { locale: sv })}<Clock className="h-4 w-4 ml-2"/> {application.shift.start_time?.slice(0, 5)} - {application.shift.end_time?.slice(0, 5)}</p>
                                                {application.shift.hourly_rate && (
                                                    <p className="flex items-center gap-x-1.5 font-medium text-gray-600"><DollarSign className="h-4 w-4 text-gray-400"/> {application.shift.hourly_rate} kr/tim</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0 mt-2 sm:mt-0">
                                            <button onClick={() => handleViewDetails(application)} className="btn btn-secondary btn-xs"><Eye className="h-4 w-4 mr-1"/> Visa</button>
                                            {activeTab === 'upcoming' && application.application_status === 'pending' && (<button onClick={() => handleWithdrawApplication(application.id)} className="btn btn-danger-secondary btn-xs"><X className="h-4 w-4 mr-1"/> Dra Tillbaka</button>)}
                                        </div>
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                )}
              </div>
            </div>

  {/* Intranet Feed Sidebar */}
  {isIntranetVisible && (
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
               <div className="flex justify-between items-center mb-4">
            
            <button
                onClick={() => setIsIntranetVisible(!isIntranetVisible)}
                className="text-sm text-gray-500 hover:text-primary-600 flex items-center transition-colors"
                title={isIntranetVisible ? 'Dölj flödet' : 'Visa flödet'}
            >
                {isIntranetVisible ? (
                    <>
                        Dölj <EyeOff size={16} className="ml-1" />
                    </>
                ) : (
                    <>
                        Visa <Eye size={16} className="ml-1" />
                    </>
                )}
            </button>
        </div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Senaste nytt</h2>
                <div className="max-h-[800px] overflow-y-auto pr-2">
                    <IntranetFeed />
                </div>
            </div>
        </div>
  )}
        
    </div>
               
            
            {selectedShiftDetails && (
                <ShiftDetailsModal
                    shift={selectedShiftDetails}
                    onClose={() => setSelectedShiftDetails(null)}
                  profile={profile}
                />
            )}
  <InviteUserModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
            
            <style jsx>{`
              .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
              .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
              .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500; }
              .btn-danger-secondary { @apply border-red-200 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500; }
              .btn-xs { @apply px-2.5 py-1.5 text-xs; }
              .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm; }
              @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
            `}</style>
        </div>
    );
}