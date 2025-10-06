// src/components/employer/EmployerDashboard.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isValid, startOfDay, formatISO, setHours, setMinutes, setSeconds, addDays, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
    Plus, Clock, Users, FilteText, User, profile, CheckCircle, Filter, Search, X, Eye, Edit2, Trash2, Copy, Loader2, Calendar as CalendarIcon, List, AlertTriangle, Building2, MapPin, Briefcase, RefreshCw, DollarSign, CalendarPlus, Info, BarChart as ChartBar, UserCog, FileText, Shield, CheckSquare, Square, Menu as MenuIcon, Award, Download
} from 'lucide-react'; // Bell icon was removed as it's in navbar
import { InviteEmployeeModal } from './InviteEmployeeModal'; // Adjust path if needed
import { UserPlus } from 'lucide-react'; // Import an icon for the button


import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import fcSvLocale from '@fullcalendar/core/locales/sv';

import { CreateShiftForm } from '../Shifts/CreateShiftForm';
import EmployerSidebar from './EmployerSidebar';
import ManageApplicationsModal from "../Shifts/ManageApplicationsModal";
import CompletedShiftsList from "../Shifts/CompletedShiftsList";
import { ShiftDetailsModal } from '../Shifts/ShiftDetailsModal';
import { CompletedPostingsList } from '../postings/CompletedPostingsList';
import { CreatePostingForm } from '../postings/CreatePostingForm';
import { PostingDetailsModal } from '../postings/PostingDetailsModal';
import { EditPostingModal } from '../postings/EditPostingModal';
import { ManagePostingApplicantsModal } from '../postings/ManagePostingApplicantsModal';

import { ScheduleGenerator } from './ScheduleGenerator';

import {
    deleteShift as deleteShiftHelper,
    duplicateShift as duplicateShiftHelper, fetchEmployerShifts
} from '../../lib/shifts';
import {
    fetchEmployerPostings,
    deletePosting as deletePostingHelper,
  updatePosting
    // updatePostingStatus, // Ensure this is implemented in lib/postings.ts if you plan to use it
} from '../../lib/postings';
import type { Database } from '../../types/database'; // For precise update data type


import type { ShiftNeed, JobPosting, UserRole } from '../../types';
import { EmployerPostingsView } from '../postings/EmployerPostingsView'; // Ensure this path is correct
import { ContractManagement } from '../Contracts/ContractManagement';


type EmployerPostingUpdateData = Partial<Omit<Database['public']['Tables']['job_postings']['Update'], 'id' | 'employer_id' | 'created_at' | 'updated_at'>>;

 const handleEmployerUpdatePosting = async (postingId: string, updateData: EmployerPostingUpdateData) => {
    const result = await updatePosting(postingId, updateData); // Use the standard updatePosting for employers
    if (result.success) {
      // The onSuccess prop of EditPostingModal will handle the success toast and data refresh.
    } else {
      toast.error(`Uppdatering misslyckades: ${result.error || 'Okänt fel'}`);
   }
    return result; // Return the result for EditPostingModal
  };

type ShiftData = ShiftNeed;
type EmployerDashboardTab = 'overview' | 'postings' | 'schedule' | 'completed' | 'contracts';



function formatInterval(intervalString: string | null | undefined): string | null {
    if (!intervalString || typeof intervalString !== 'string') { return null; }
    const parts = intervalString.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return intervalString;
        const totalMinutes = hours * 60 + minutes;
        if (totalMinutes === 0) return null;
        return `${totalMinutes} min`;
    }
    return intervalString;
}

const fetchStats = async (employerId: string) => {
    try {
        const [openShiftCountRes, filledShiftCountRes, pendingAppsCountRes, openPostingCountRes] = await Promise.all([
            supabase.from('shift_needs').select('id', { count: 'exact', head: true }).eq('employer_id', employerId).eq('status', 'open'),
            supabase.from('shift_needs').select('id', { count: 'exact', head: true }).eq('employer_id', employerId).eq('status', 'filled'),
            supabase.rpc('get_employer_pending_applications_count', { p_employer_id: employerId }),
            supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('employer_id', employerId).eq('status', 'open')
        ]);

        if (openShiftCountRes.error) throw new Error(`Öppna Pass: ${openShiftCountRes.error.message}`);
        if (filledShiftCountRes.error) throw new Error(`Tillsatta Pass: ${filledShiftCountRes.error.message}`);
        if (pendingAppsCountRes.error) throw new Error(`Väntande Ansökningar: ${pendingAppsCountRes.error.message}`);
        if (openPostingCountRes.error) throw new Error(`Öppna Annonser: ${openPostingCountRes.error.message}`);

        return {
            openShifts: openShiftCountRes.count ?? 0,
            filledShifts: filledShiftCountRes.count ?? 0,
            pendingApplications: typeof pendingAppsCountRes.data === 'number' ? pendingAppsCountRes.data : 0,
            openPostings: openPostingCountRes.count ?? 0
        };
    } catch (error) {
        console.error("Fel vid hämtning av statistik:", error);
        throw error;
    }
};

const StatCard = ({ icon: Icon, label, value, color, onClick }: { icon: React.ElementType, label: string, value: number | string, color: string, onClick?: () => void }) => (
    <div 
        className={`dashboard-stat-card p-5 flex items-center ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} bg-white rounded-lg shadow-card border border-gray-100`} 
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color} flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 overflow-hidden">
            <p className="text-sm text-gray-500 truncate">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
    </div>
);

interface EmployerShiftCardProps {
    shift: ShiftData;
    onManageApplicants: (shift: ShiftData) => void;
    onViewDetails: (shift: ShiftData) => void;
    onDelete: (shiftId: string) => void;
    onDuplicate: (shift: ShiftData) => void;
    applicantCount?: number;
    isSelected: boolean;
    onToggleSelect: (shiftId: string) => void;
}

const roleDisplayMap: Record<string, string> = {
    pharmacist: 'Farmaceut',
    säljare: 'Säljare',
    egenvårdsrådgivare: 'Egenvårdsrådgivare'
};


const EmployerShiftCard: React.FC<EmployerShiftCardProps> = React.memo(({ shift, onManageApplicants, onViewDetails, onDelete, onDuplicate, applicantCount = 0, isSelected, onToggleSelect }) => {
  const displayRole = shift.required_role ? (roleDisplayMap[shift.required_role] || shift.required_role) : 'Ej specificerad';

    const isCancelled = shift.status === 'cancelled';
    const isOpen = shift.status === 'open';
    const isFilled = shift.status === 'filled';
    const shiftDateObj = shift.date ? parseISO(shift.date) : null;
    const isValidDate = shiftDateObj && isValid(shiftDateObj);
    // Check if the day *after* the shift date is past, to ensure shift is truly "past" for actions
    const isShiftDateConsideredPast = isValidDate && !isCancelled && shift.status !== 'completed' && isPast(startOfDay(addDays(shiftDateObj,1)));
    const formatTimeLocal = (time: string | null | undefined) => time ? time.slice(0, 5) : 'N/A';

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
            onViewDetails(shift);
        }
    };
    
    return (
        <div
            className={`dashboard-card relative bg-white p-5 rounded-lg shadow-sm border transition-all duration-150 ease-in-out 
                        ${isSelected ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-1' : 'border-gray-200 hover:border-gray-300'} 
                        ${isCancelled ? 'opacity-60 bg-gray-50' : ''} 
                        ${isShiftDateConsideredPast && isOpen ? 'border-yellow-400 bg-yellow-50' : ''}`} // Highlight past open shifts
            onClick={handleCardClick}
            role="listitem"
        >
            <div className="absolute top-3 left-3 z-10">
                <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                    checked={isSelected}
                    onChange={(e) => { e.stopPropagation(); onToggleSelect(shift.id);}}
                    onClick={(e) => e.stopPropagation()} 
                    aria-label={`Välj pass ${shift.title || 'Namnlöst pass'}`}
                />
            </div>
            <div className="pl-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-grow min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="truncate cursor-pointer hover:underline" onClick={(e)=>{e.stopPropagation(); onViewDetails(shift);}}>{shift.title || 'Namnlöst pass'}</span>
                            <span className={`status-badge status-${shift.status || 'unknown'}`}>{shift.status || 'okänd'}</span>
                            {isShiftDateConsideredPast && isOpen && (<span className="status-badge bg-yellow-100 text-yellow-800 border-yellow-200">Passerat Datum</span>)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1 flex items-center flex-wrap gap-x-3">
                            {shift.required_role && (<span className="inline-flex items-center"><Briefcase className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />{displayRole}</span>)}
                            {shift.location && (<span className="inline-flex items-center"><MapPin className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />{shift.location}</span>)}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                            {isValidDate ? (<span className="flex items-center whitespace-nowrap"><CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />{format(shiftDateObj, 'PP', { locale: sv })}</span>) : (<span className="flex items-center whitespace-nowrap text-red-500"><AlertTriangle className="h-4 w-4 mr-1" /> Ogiltigt Datum</span>)}
                            <span className="flex items-center whitespace-nowrap"><Clock className="h-4 w-4 mr-1 text-gray-400" />{formatTimeLocal(shift.start_time)} - {formatTimeLocal(shift.end_time)}</span>
                            {formatInterval(shift.lunch) && (<span className="flex items-center whitespace-nowrap"><Info className="h-4 w-4 mr-1 text-gray-400" />Lunch: {formatInterval(shift.lunch)}</span>)}
                        </div>
                        {isOpen && !isShiftDateConsideredPast && (<p className="text-sm text-purple-700 font-medium mt-2">{applicantCount} Väntande sökande</p>)}
                      {isFilled && (
                           <p className="text-sm text-green-700 font-medium mt-2">
                               Tillsatt av: <strong>{(shift as any).applicant_name || 'Okänd'}</strong>
                           </p>
                       )}
                    </div>
                    <div className="action-button-area flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 self-start sm:self-center">
                        {isOpen && !isShiftDateConsideredPast && (<button onClick={(e) => { e.stopPropagation(); onManageApplicants(shift); }} className="btn btn-primary btn-xs" title="Hantera Sökande"><Users size={14} className="mr-1" /> Sökande ({applicantCount})</button>)}
                        <button onClick={(e) => { e.stopPropagation(); onViewDetails(shift); }} className="btn btn-secondary btn-xs" title="Visa/Redigera Pass"><Eye size={14} className="mr-1" /> Detaljer</button>
                        {!isCancelled && (<button onClick={(e) => { e.stopPropagation(); onDuplicate(shift); }} className="btn btn-secondary btn-xs" title="Duplicera Pass"><Copy size={14} className="mr-1" /> Duplicera</button>)}
                        {shift.status !== 'completed' && shift.status !== 'cancelled' && ( 
                            <button onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }} className="btn btn-danger btn-xs" title="Ta Bort Pass"><Trash2 size={14} className="mr-1" /> Ta Bort</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
EmployerShiftCard.displayName = 'EmployerShiftCard';

export function EmployerDashboard() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<EmployerDashboardTab>('overview');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const [postedShifts, setPostedShifts] = useState<ShiftData[]>([]);
    const [completedShifts, setCompletedShifts] = useState<ShiftData[]>([]);
    const [filteredPostedShifts, setFilteredPostedShifts] = useState<ShiftData[]>([]);
    const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});
    const [employerPostings, setEmployerPostings] = useState<JobPosting[]>([]);
    const [completedPostings, setCompletedPostings] = useState<JobPosting[]>([]);
    const [postingsView, setPostingsView] = useState<'active' | 'completed'>('active');
    

    const [loadingPostings, setLoadingPostings] = useState(true);
    const [stats, setStats] = useState({ openShifts: 0, filledShifts: 0, pendingApplications: 0, openPostings: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true); // This is your general loading state
    const [isLoadingApplicantDetails, setIsLoadingApplicantDetails] = useState(false); // New state for this specific operation
    const [assignedApplicantId, setAssignedApplicantId] = useState<string | null>(null); // State to hold the fetched applicant ID

    const [error, setError] = useState<string | null>(null);

    const [showCreateShiftForm, setShowCreateShiftForm] = useState(false);
    const [showCreatePostingModal, setShowCreatePostingModal] = useState(false);
    const [showApplicationsModal, setShowApplicationsModal] = useState(false);
    const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);
    const [showPostingDetailsModal, setShowPostingDetailsModal] = useState(false);
    const [showEditPostingModal, setShowEditPostingModal] = useState(false);
    const [showPostingApplicantsModal, setShowPostingApplicantsModal] = useState(false);

    const [selectedApplicationShift, setSelectedApplicationShift] = useState<ShiftData | null>(null);
    const [selectedDetailsShift, setSelectedDetailsShift] = useState<ShiftData | null>(null);
    const [selectedDetailsPosting, setSelectedDetailsPosting] = useState<JobPosting | null>(null);
    const [selectedPostingAssignedApplicantId, setSelectedPostingAssignedApplicantId] = useState<string | null>(null);
    const [selectedPostingForEdit, setSelectedPostingForEdit] = useState<JobPosting | null>(null);
    const [selectedPostingForApps, setSelectedPostingForApps] = useState<JobPosting | null>(null);
    const [historyFilters, setHistoryFilters] = useState({ payrollStatus: 'pending', dateFrom: '', dateTo: '', search: '' });
    const [selectedCompletedShiftIds, setSelectedCompletedShiftIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const [shiftFilters, setShiftFilters] = useState({ status: 'all', dateFrom: '', dateTo: '', role: '', search: '' });
    const [shiftSortBy, setShiftSortBy] = useState<string>('date_asc');
    const [postingFilters, setPostingFilters] = useState({ status: 'all', search: '', role: '' });

    const calendarRef = useRef<HTMLDivElement>(null);
    const calendarInstanceRef = useRef<Calendar | null>(null);

    const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
    const [isDeletingSelected, setIsDeletingSelected] = useState(false);
    const [exportedShiftIds, setExportedShiftIds] = useState<Set<string>>(new Set());


    const loadDashboardStats = useCallback(async () => {
        if (!profile?.id) {
            setStatsLoading(false); setStatsError("Användarprofil ej tillgänglig.");
            setStats({ openShifts: 0, filledShifts: 0, pendingApplications: 0, openPostings: 0 }); return;
        }
        setStatsLoading(true); setStatsError(null);
        try { const data = await fetchStats(profile.id); setStats(data); }
        catch (err: any) { setStatsError(err.message || "Kunde inte hämta statistik."); setStats({ openShifts: 0, filledShifts: 0, pendingApplications: 0, openPostings: 0 });}
        finally { setStatsLoading(false); }
    }, [profile?.id]);


const fetchShifts = useCallback(async () => {
    if (!profile?.id) {
        setLoading(true);
        setError("Användarprofil ej tillgänglig.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
        // --- THIS IS THE MAIN CHANGE ---
        // Replace the old .select() with a call to your new .rpc() function
        const { data: allShifts, error: shiftsError } = await supabase
            .rpc('get_employer_shifts_with_details', {
                p_employer_id: profile.id
            });

        if (shiftsError) {
            // Give a more detailed error message if the RPC fails
            throw new Error(`Database function error: ${shiftsError.message}`);
        }

        const allShiftsData = allShifts || [];
        const nonCompletedShifts: ShiftNeed[] = [];
        const historyShifts: ShiftNeed[] = [];

        // The data processing loop now becomes incredibly simple
        for (const shift of allShiftsData) {
            // The 'applicant_name' now comes directly from the database.
            // We just need to handle the case where it might be null.
            const enrichedShift = { ...shift, applicant_name: shift.applicant_name || 'Okänd' };

            if (shift.status === 'completed' || shift.status === 'processed') {
                historyShifts.push(enrichedShift);
            } else {
                nonCompletedShifts.push(enrichedShift);
            }
        }

        setPostedShifts(nonCompletedShifts);
        setCompletedShifts(historyShifts);

        // The rest of your applicant counting logic can remain exactly the same.
        const openShiftIds = nonCompletedShifts.filter(s => s.status === 'open').map(s => s.id);
        if (openShiftIds.length > 0) {
            const { data: counts, error: countError } = await supabase.rpc('get_open_shift_application_counts', {
                p_shift_ids: openShiftIds
            });
            if (countError) console.error("Error fetching applicant counts:", countError);
            else {
                const countsMap = (counts || []).reduce((acc: any, item: any) => {
                    acc[item.shift_id] = item.applicant_count;
                    return acc;
                }, {});
                setApplicantCounts(countsMap);
            }
        } else {
            setApplicantCounts({});
        }

    } catch (err: any) {
        setError(err.message);
        console.error('Error in fetchShifts:', err);
    } finally {
        setLoading(false);
    }
}, [profile?.id]);

    const fetchMyPostings = useCallback(async () => {
        if (!profile?.id) {
            setLoadingPostings(false);
            setEmployerPostings([]);
            setCompletedPostings([]);
            return;
        }
        setLoadingPostings(true);
        try {
            // Use the new, reliable RPC function
            const { data, error } = await supabase.rpc('get_employer_postings_with_details', {
                p_employer_id: profile.id
            });

            if (error) throw new Error(error.message);

            if (data) {
                const active: JobPosting[] = [];
                const completed: JobPosting[] = [];
                for (const p of data) {
                    if (p.status === 'completed') {
                        completed.push(p as JobPosting);
                    } else {
                        active.push(p as JobPosting);
                    }
                }
                setEmployerPostings(active);
                setCompletedPostings(completed);
            } else {
                setEmployerPostings([]);
                setCompletedPostings([]);
            }
        } catch (err: any) {
            toast.error(`Kunde inte hämta uppdrag: ${err.message}`);
            setEmployerPostings([]);
            setCompletedPostings([]);
        } finally {
            setLoadingPostings(false);
        }
    }, [profile?.id]);

    const handleRefresh = useCallback(() => {
        if (profile?.id) {
            
            Promise.all([loadDashboardStats(), fetchShifts(), fetchMyPostings()])
                .then(() => {
                   
                    setSelectedShiftIds(new Set());
                })
                .catch((error) => {
                    toast.error("Uppdatering misslyckades: " + error.message, { id: refreshToastId });
                });
        } else {
            setLoading(false); setLoadingPostings(false); setStatsLoading(false);
            setError("Användarprofil ej tillgänglig."); setStatsError("Användarprofil ej tillgänglig.");
            setEmployerPostings([]); setPostedShifts([]); setCompletedShifts([]);
            setStats({ openShifts: 0, filledShifts: 0, pendingApplications: 0, openPostings: 0 });
        }
    }, [profile?.id, loadDashboardStats, fetchShifts, fetchMyPostings]);

    useEffect(() => {
        handleRefresh();
        if (!profile?.id) return;

        const channelIdentifier = `employer-dashboard-changes-${profile.id}`;
        const dashboardChannel = supabase.channel(channelIdentifier);
        
        const commonRefresh = () => {
            console.log("Change detected, performing common refresh.");
            loadDashboardStats();
            fetchShifts();
            fetchMyPostings();
        };

        dashboardChannel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_needs', filter: `employer_id=eq.${profile.id}` }, () => { console.log('shift_needs change'); commonRefresh(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_postings', filter: `employer_id=eq.${profile.id}` }, () => { console.log('job_postings change'); commonRefresh(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications' }, () => { 
                console.log('shift_applications change'); 
                loadDashboardStats(); fetchShifts(); 
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_posting_applications' }, () => {
                 console.log('job_posting_applications change'); 
                 loadDashboardStats(); fetchMyPostings();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_records' }, () => { console.log('payroll_records change'); commonRefresh(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posting_payroll_records' }, () => { console.log('posting_payroll_records change'); commonRefresh(); })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`Subscribed to ${channelIdentifier}!`);
                if (status === 'CHANNEL_ERROR' || err) console.error(`Channel error on ${channelIdentifier}:`, err);
                if (status === 'TIMED_OUT') console.warn(`Connection timed out for ${channelIdentifier}.`);
            });

        return () => {
            supabase.removeChannel(dashboardChannel).catch(err => console.error("Error removing dashboard channel:", err));
        };
    }, [profile?.id, handleRefresh, loadDashboardStats, fetchShifts, fetchMyPostings]);

    const applyFiltersAndSorting = useCallback(() => {
        let result = [...postedShifts];
        if (shiftFilters.status !== 'all') {
            result = result.filter(shift => shift.status === shiftFilters.status);
        }
        if (shiftFilters.dateFrom) {
            try {
                const fromDate = startOfDay(parseISO(shiftFilters.dateFrom));
                if (isValid(fromDate)) result = result.filter(shift => shift.date && isValid(parseISO(shift.date)) && startOfDay(parseISO(shift.date)) >= fromDate);
            } catch (e) { console.error("Invalid From Date", e); }
        }
        if (shiftFilters.dateTo) {
            try {
                const toDate = startOfDay(parseISO(shiftFilters.dateTo));
                if (isValid(toDate)) result = result.filter(shift => shift.date && isValid(parseISO(shift.date)) && startOfDay(parseISO(shift.date)) <= toDate);
            } catch (e) { console.error("Invalid To Date", e); }
        }
        if (shiftFilters.role) {
            result = result.filter(shift => shift.required_role === shiftFilters.role);
        }
        if (shiftFilters.search) {
            const searchLower = shiftFilters.search.toLowerCase();
            result = result.filter(shift =>
                (shift.title?.toLowerCase().includes(searchLower)) ||
                (shift.description?.toLowerCase().includes(searchLower)) ||
                (shift.location?.toLowerCase().includes(searchLower))
            );
        }
        result.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0; const dateB = b.date ? new Date(b.date).getTime() : 0;
            if (isNaN(dateA) && !isNaN(dateB)) return 1; if (!isNaN(dateA) && isNaN(dateB)) return -1; if(isNaN(dateA) && isNaN(dateB)) return 0;
            switch (shiftSortBy) {
                case 'date_desc': return dateB - dateA;
                case 'role_asc': return (a.required_role ?? '').localeCompare(b.required_role ?? '');
                case 'role_desc': return (b.required_role ?? '').localeCompare(a.required_role ?? '');
                default: return dateA - dateB;
            }
        });
        setFilteredPostedShifts(result);
    }, [postedShifts, shiftFilters, shiftSortBy]);

    useEffect(() => { applyFiltersAndSorting(); }, [applyFiltersAndSorting]);

    const handleToggleShiftSelection = useCallback((shiftId: string) => {
        setSelectedShiftIds(prev => { const n = new Set(prev); n.has(shiftId) ? n.delete(shiftId) : n.add(shiftId); return n; });
    }, []);

    const handleToggleSelectAllShifts = useCallback(() => {
        const currentVisibleShiftIds = filteredPostedShifts.map(s => s.id);
        const allVisibleSelected = currentVisibleShiftIds.length > 0 && currentVisibleShiftIds.every(id => selectedShiftIds.has(id));
        setSelectedShiftIds(prev => {
            const n = new Set(prev);
            if (allVisibleSelected) currentVisibleShiftIds.forEach(id => n.delete(id));
            else currentVisibleShiftIds.forEach(id => n.add(id));
            return n;
        });
    }, [filteredPostedShifts, selectedShiftIds]);

    const handleDeleteSelectedShifts = useCallback(async () => {
        if (selectedShiftIds.size === 0) { toast.error("Inga pass valda att ta bort."); return; }
        if (!window.confirm(`Är du säker på att du vill ta bort ${selectedShiftIds.size} valda pass? Denna åtgärd kan inte ångras.`)) return;
        if (!profile?.id) { toast.error("Autentiseringsfel."); return; }
        setIsDeletingSelected(true); const tid = toast.loading(`Tar bort ${selectedShiftIds.size} pass...`);
        const results = await Promise.allSettled(Array.from(selectedShiftIds).map(id => deleteShiftHelper(id, profile.id, profile.role as UserRole, profile.id)));
        let s = 0, f = 0;
        results.forEach(r => { if (r.status === 'fulfilled' && r.value.success) s++; else { f++; console.error("Failed to delete shift:", r.status === 'rejected' ? r.reason : r.value.error); } });
        toast.dismiss(tid);
        if (s > 0) toast.success(`${s} pass borttagna.`); if (f > 0) toast.error(`${f} pass kunde inte tas bort.`);
        setSelectedShiftIds(new Set()); await fetchShifts(); await loadDashboardStats(); setIsDeletingSelected(false);
    }, [selectedShiftIds, profile?.id, fetchShifts, loadDashboardStats]);

    const handleShiftCreated = useCallback(async () => { setShowCreateShiftForm(false); await fetchShifts(); await loadDashboardStats(); }, [fetchShifts, loadDashboardStats]);
    const handlePostingCreated = useCallback(async () => { setShowCreatePostingModal(false); toast.success("Annons skapad!"); await fetchMyPostings(); await loadDashboardStats(); }, [fetchMyPostings, loadDashboardStats]);
    const handleDeleteShift = useCallback(async (id: string) => { if (!window.confirm("Är du säker på att du vill ta bort detta pass?")) return; if (!profile?.id) {toast.error("Autentiseringsfel."); return;} const tid = toast.loading("Tar bort pass..."); try { const { success, error } = await deleteShiftHelper(id, profile.id, profile.role as UserRole, profile.id); if (!success || error) throw new Error(error || "Misslyckades ta bort pass"); toast.success("Pass borttaget.", {id:tid}); await fetchShifts(); await loadDashboardStats(); } catch (e:any) { toast.error(e.message, {id:tid}); } }, [profile?.id, fetchShifts, loadDashboardStats]);
    const handleDuplicateShift = useCallback(async (shift: ShiftData) => { if (!profile?.id) {toast.error("Autentiseringsfel."); return;} const tid = toast.loading("Duplicerar pass..."); try { const {data, error} = await duplicateShiftHelper(shift.id, profile.id); if(error || !data) throw new Error(error || "Misslyckades duplicera pass"); toast.success("Pass duplicerat.", {id:tid}); await fetchShifts(); await loadDashboardStats(); } catch(e:any) {toast.error(e.message, {id:tid});}}, [profile?.id, fetchShifts, loadDashboardStats]);
    const handleDeletePosting = useCallback(async (id: string) => { if(!window.confirm("Är du säker på att du vill ta bort denna annons?")) return; if(!profile?.id) {toast.error("Autentiseringsfel."); return;} const tid = toast.loading("Tar bort annons..."); try {const {success, error} = await deletePostingHelper(id); if(!success||error) throw new Error(error || "Misslyckades ta bort annons"); toast.success("Annons borttagen.", {id:tid}); await fetchMyPostings(); await loadDashboardStats();}catch(e:any){toast.error(e.message, {id:tid});}}, [profile?.id, fetchMyPostings, loadDashboardStats]);

  const handleExportForPayroll = useCallback(async () => {
    if (selectedCompletedShiftIds.size === 0) {
        toast.error("Välj minst ett pass att exportera.");
        return;
    }
    setIsProcessing(true);
    const toastId = toast.loading(`Exporterar ${selectedCompletedShiftIds.size} pass...`);
    
    // Call the NEW, correct database function
    const promises = Array.from(selectedCompletedShiftIds).map(shiftId => 
        supabase.rpc('export_shift_to_payroll', { p_shift_id: shiftId })
    );

    const results = await Promise.allSettled(promises);
    
    let successfulExports = 0;
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && (result.value.data === true || !result.value.error)) {
            successfulExports++;
        } else {
            const error = result.status === 'rejected' ? result.reason : (result.value as any).error;
            console.error("Failed to export shift:", error);
        }
    });

    toast.dismiss(toastId);
    if (successfulExports > 0) {
        toast.success(`${successfulExports} pass har exporterats.`);
        // CRITICAL: Refresh all data from the database to show the status change
        handleRefresh(); 
    } else {
        toast.error("Inga pass kunde exporteras. Kontrollera att de inte redan är exporterade.");
    }

    setSelectedCompletedShiftIds(new Set());
    setIsProcessing(false);
}, [selectedCompletedShiftIds, handleRefresh]); // Use handleRefresh from your component

    
    const handleOpenShiftDetails = useCallback((shiftToView: ShiftData) => { setSelectedDetailsShift(shiftToView); setShowShiftDetailsModal(true); }, []);
    const handleCreateShift = useCallback(() => { setShowCreateShiftForm(true); }, []);
    
    // THIS IS THE MISSING HANDLER DEFINITION
    const handleOpenManageApplicants = useCallback((shiftToManage: ShiftData) => {
        setSelectedApplicationShift(shiftToManage);
        setShowApplicationsModal(true);
    }, []); // Dependencies: none, as it only calls setState functions

 const handleOpenPostingDetailsAndFetchApplicant = useCallback(async (posting: JobPosting) => {
        let tempAssignedApplicantId: string | null = null; // Use a temporary variable within the function scope

        if (posting.status === 'filled' && posting.id) {
            console.log("[EmployerDashboard] Posting is 'filled'. Attempting to fetch accepted applicant via RPC.");
            setIsLoadingApplicantDetails(true); // Use the new state setter

            try {
                const { data: rpcApplicantId, error: rpcError } = await supabase.rpc(
                    'get_accepted_applicant_for_posting',
                    { p_posting_id: posting.id }
                );

                console.log("[EmployerDashboard] RPC 'get_accepted_applicant_for_posting' response:", {
                    postingId: posting.id,
                    rpcApplicantId,
                    rpcError
                });

                if (rpcError) {
                    console.error("[EmployerDashboard] Error fetching accepted applicant via RPC:", rpcError);
                    toast.error(rpcError.message || "Kunde inte hämta information om tilldelad sökande.");
                } else if (rpcApplicantId) {
                    tempAssignedApplicantId = rpcApplicantId; // Set the temporary variable
                    console.log("[EmployerDashboard] Found assigned applicant ID via RPC:", tempAssignedApplicantId);
                } else {
                    console.log("[EmployerDashboard] No accepted applicant found for this posting via RPC (RPC returned null).");
                }
            } catch (e: any) {
                console.error("[EmployerDashboard] Exception while fetching applicant info via RPC:", e);
                toast.error("Ett oväntat fel inträffade vid hämtning av sökandeinformation.");
            } finally {
                setIsLoadingApplicantDetails(false); // Stop loading using the new state setter
            }
        }
        
        // Update the state that controls the modal *after* the async operation
        setAssignedApplicantId(tempAssignedApplicantId); // Set the main state variable for the modal

        // Create the posting object with the assigned applicant ID
        const postingForModal = {
            ...posting,
            // Use tempAssignedApplicantId for the modal here, or ensure selectedDetailsPosting is updated with it.
            // For clarity, it's often better to pass all needed info directly to the modal.
            // PostingDetailsModal already accepts assignedApplicantId separately.
        };
        
        setSelectedDetailsPosting(postingForModal); // This state is used to show the modal
        setShowPostingDetailsModal(true);
    }, [profile?.id]); // Added profile?.id as a dependency if supabase.rpc relies on an authenticated user implicitly


    // --- FILTERED POSTINGS LOGIC ---
    // This now correctly filters only the active postings
    const filteredEmployerPostings = useMemo(() => {
        if (!Array.isArray(employerPostings)) return [];
        return employerPostings.filter(p => {
            if (postingFilters.status !== 'all' && p.status !== postingFilters.status) return false;
            if (postingFilters.role && p.required_role !== postingFilters.role) return false;
            if (postingFilters.search) {
                const s = postingFilters.search.toLowerCase();
                return (p.title?.toLowerCase().includes(s) || 
                        p.description?.toLowerCase().includes(s) || 
                        p.location?.toLowerCase().includes(s));
            }            
            return true;
        }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [employerPostings, postingFilters]);


  const filteredCompletedShifts = useMemo(() => {
    return completedShifts.filter(shift => {
        // Explicitly check the filter status
        if (historyFilters.payrollStatus === 'exported') {
            // Show ONLY processed shifts
            if (shift.status !== 'processed') return false;
        } else if (historyFilters.payrollStatus === 'pending') {
            // Show ONLY shifts that are NOT processed
            if (shift.status === 'processed') return false;
        }
        // If 'all', do not filter by payroll status

        // Other filters remain the same
        if (historyFilters.dateFrom && shift.date && shift.date < historyFilters.dateFrom) return false;
        if (historyFilters.dateTo && shift.date && shift.date > historyFilters.dateTo) return false;
        if ((historyFilters as any).search) {
            const s = (historyFilters as any).search.toLowerCase();
            const titleMatch = shift.title?.toLowerCase().includes(s);
            const applicantNameMatch = (shift as any).applicant_name?.toLowerCase().includes(s);
            return titleMatch || applicantNameMatch;
        }

        return true;
    }).sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });
}, [completedShifts, historyFilters]);

    const calendarEvents = useMemo(() => {
        try {
            return filteredPostedShifts.map(shift => {
                if (!shift.date || !shift.start_time || !shift.end_time) return null;
                try {
                    const baseDate = parseISO(shift.date);
                    if (!isValid(baseDate)) { console.warn(`Ogiltigt datum för pass ${shift.id}: ${shift.date}`); return null; }
                    
                    const [startH, startM] = shift.start_time.split(':').map(Number);
                    const start = setSeconds(setMinutes(setHours(baseDate, startH), startM),0);
                    
                    const [endH, endM] = shift.end_time.split(':').map(Number);
                    let end = setSeconds(setMinutes(setHours(baseDate, endH), endM),0);
                    if (end <= start) end = addDays(end, 1);

                    let color = { bg: '#A855F7', border: '#9333EA', text: '#FFFFFF' };
                    if(shift.status === 'filled') color = {bg: '#22C55E', border: '#16A34A', text: '#FFFFFF'};
                    else if(shift.status === 'cancelled') color = {bg: '#EF4444', border: '#DC2626', text: '#FFFFFF'};
                    else if(shift.status === 'completed') color = {bg: '#6B7280', border: '#4B5563', text: '#FFFFFF'};
                    
                    return {
                        id: shift.id, title: shift.title || 'Namnlöst pass', start: formatISO(start), end: formatISO(end), allDay: false,
                        backgroundColor: color.bg, borderColor: color.border, textColor: color.text,
                        extendedProps: { shift, applicantCount: applicantCounts[shift.id] || 0 }, 
                        classNames: [`shift-status-${shift.status}`, 'cursor-pointer']
                    };
                } catch (e) { console.error(`Fel vid bearbetning av pass ${shift.id} för kalender:`, e); return null; }
            }).filter(Boolean) as any[];
        } catch (e) { console.error('Fel vid skapande av kalenderhändelser:', e); return []; }
    }, [filteredPostedShifts, applicantCounts]);

    useEffect(() => {
        if (activeTab !== 'overview' || viewMode !== 'calendar' || !calendarRef.current) {
            if (calendarInstanceRef.current) { calendarInstanceRef.current.destroy(); calendarInstanceRef.current = null; }
            return;
        }

        if (calendarInstanceRef.current) {
            calendarInstanceRef.current.setOption('events', calendarEvents);
        } else {
            const cal = new Calendar(calendarRef.current, {
                plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
                initialView: 'dayGridMonth',
                locale: fcSvLocale,
                events: calendarEvents,
                height: 'auto', 
                contentHeight: 'auto',
                allDaySlot: false,
                slotMinTime: '06:00:00',
                slotMaxTime: '23:59:59',
                nowIndicator: true,
                eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
                slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
                eventDisplay: 'block',
                eventContent: (arg) => {
                    const s = arg.event.extendedProps.shift as ShiftData;
                    const ac = arg.event.extendedProps.applicantCount || 0;
                    let htmlContent = `<div class="fc-event-main-custom p-1 text-xs overflow-hidden">
                                           <div class="font-semibold truncate" title="${arg.event.title}">${arg.event.title}</div>`;
                    if (s.location) htmlContent += `<div class="text-[0.7rem] opacity-90 truncate"><span role="img" aria-label="Location">📍</span>${s.location}</div>`;
                    if (s.status === 'open' && ac > 0) htmlContent += `<div class="text-[0.7rem] opacity-90"><span role="img" aria-label="Applicants">👥</span>${ac} sökande</div>`;
                    htmlContent += `</div>`;
                    return { html: htmlContent };
                },
                eventClick: (info) => handleOpenShiftDetails(info.event.extendedProps.shift as ShiftData),
                eventMouseEnter: (info) => {
                    const s = info.event.extendedProps.shift as ShiftData;
                    const ac = info.event.extendedProps.applicantCount || 0;
                    let tooltipText = `${info.event.title}\n${info.event.start ? format(info.event.start, 'HH:mm', {locale:sv}) : ''} - ${info.event.end ? format(info.event.end, 'HH:mm', {locale:sv}) : ''}\nStatus: ${s.status}`;
                    if(s.location) tooltipText += `\nPlats: ${s.location}`;
                    if(s.status==='open' && ac > 0) tooltipText += `\nSökande: ${ac}`;
                    info.el.title = tooltipText;
                }
            });
            cal.render();
            calendarInstanceRef.current = cal;
        }
    }, [activeTab, viewMode, calendarEvents, handleOpenShiftDetails]);

    return (
        <div className="dashboard-container bg-gray-50 min-h-screen flex">
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <EmployerSidebar activeTab={activeTab} onTabChange={setActiveTab} appliedCount={stats.pendingApplications} />
            </div>

          {<InviteEmployeeModal
    isOpen={isInviteModalOpen}
    onClose={() => setIsInviteModalOpen(false)}
    employerProfile={profile}
/>}

           

            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsMobileSidebarOpen(false)}></div>
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button 
                                type="button" 
                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" 
                                onClick={() => setIsMobileSidebarOpen(false)}
                            >
                                <span className="sr-only">Stäng sidofält</span> <X className="h-6 w-6 text-white" aria-hidden="true" />
                            </button>
                        </div>
                        <EmployerSidebar 
                            activeTab={activeTab} 
                            onTabChange={(tab) => { setActiveTab(tab); setIsMobileSidebarOpen(false);}} 
                            appliedCount={stats.pendingApplications} 
                        />
                    </div>
                </div>
            )}
            
            <div className={`flex-1 flex flex-col overflow-hidden md:pl-64`}> 
                <div className="md:hidden sticky top-0 z-30 flex-shrink-0 flex h-16 bg-white shadow-sm items-center px-4 justify-between">
                    <button 
                        type="button" 
                        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden" 
                        onClick={() => setIsMobileSidebarOpen(true)}
                    >
                        <span className="sr-only">Öppna sidofält</span> <MenuIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <div className="flex-1"></div> {/* This pushes items to the right if any */}
                </div>

                <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 bg-white p-4 sm:p-6 rounded-lg shadow-card border border-gray-200 gap-3 sm:gap-0">
                         <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {activeTab === 'overview' && 'Passöversikt'}
                            {activeTab === 'postings' && 'Uppdrag'}
                            {activeTab === 'schedule' && 'Skapa Schema'}
                            {activeTab === 'completed' && 'Historik & Rapporter'}
                            {activeTab === 'contracts' && 'Avtalshantering'}
                        </h1>
                        <div className="flex items-center gap-2 sm:gap-4 self-start sm:self-center">
                             <button 
                                onClick={handleRefresh} 
                                className="btn btn-secondary btn-sm" 
                                disabled={statsLoading || loading || loadingPostings || isDeletingSelected}
                            >
                                <RefreshCw className={`h-4 w-4 mr-1.5 ${statsLoading || loading || loadingPostings || isDeletingSelected ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Uppdatera</span>
                                <span className="sm:hidden">Ladda om</span>
                            </button>
                        </div>
                    </div>

                    {activeTab === 'overview' && (
                         <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                                {statsLoading ? ( <div className="col-span-full flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div> )
                                : statsError ? ( <div className="col-span-full bg-red-100 text-red-700 p-4 rounded-lg border border-red-300 flex items-center"><AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" /> {statsError}</div> )
                                : ( <>
                                        <StatCard icon={Clock} label="Öppna Pass" value={stats.openShifts} color="bg-blue-600" onClick={() => { setShiftFilters(prev => ({ ...prev, status: 'open' })); setViewMode('list'); }} />
                                        <StatCard icon={CheckCircle} label="Tillsatta Pass" value={stats.filledShifts} color="bg-green-600" onClick={() => { setShiftFilters(prev => ({ ...prev, status: 'filled' })); setViewMode('list'); }} />
                                        <StatCard icon={Users} label="Väntande Ansökningar" value={stats.pendingApplications} color="bg-purple-600" onClick={() => navigate('/employer/applicants')} />
                                        <StatCard icon={FileText} label="Aktiva Annonser" value={stats.openPostings} color="bg-orange-500" onClick={() => setActiveTab('postings')} />
                                    </> )}
                            </div>
                             <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-6 items-center">
                               <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="btn btn-secondary-outline"
                                >
                                    <UserPlus className="h-5 w-5 mr-2" />
                                    Bjud in Anställd
                                </button>
                                <button onClick={handleCreateShift} className="btn btn-primary w-full sm:w-auto"> <Plus className="h-5 w-5 mr-2" /> Skapa Nytt Pass </button>
                                <div className="flex-grow hidden sm:block"></div>

                                
                                {viewMode === 'list' && filteredPostedShifts.length > 0 && (
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                                    {selectedShiftIds.size > 0 && (
                                        <button onClick={handleDeleteSelectedShifts} className="btn btn-danger btn-sm" disabled={isDeletingSelected}>
                                            {isDeletingSelected ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/> : <Trash2 className="h-4 w-4 mr-1.5" />}
                                            Ta bort ({selectedShiftIds.size})
                                        </button>
                                    )}
                                    <button onClick={handleToggleSelectAllShifts} className="btn btn-secondary btn-sm flex items-center" title={selectedShiftIds.size === filteredPostedShifts.length && filteredPostedShifts.length > 0 ? 'Avmarkera alla synliga pass' : 'Markera alla synliga pass'}>
                                        {selectedShiftIds.size === filteredPostedShifts.length && filteredPostedShifts.length > 0 ? <CheckSquare size={16} className="mr-1.5" /> : <Square size={16} className="mr-1.5" /> }
                                        <span className="hidden xs:inline">{selectedShiftIds.size === filteredPostedShifts.length && filteredPostedShifts.length > 0 ? 'Avmarkera Alla' : 'Markera Alla'}</span>
                                    </button>
                                    </div>
                                )}
                                <div className="flex gap-2 w-full sm:w-auto justify-start sm:justify-end mt-2 sm:mt-0">
                                    <button onClick={() => setViewMode('list')} className={`btn-icon p-2 rounded-md ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Listvy"> <List className="h-5 w-5" /> </button>
                                    <button onClick={() => setViewMode('calendar')} className={`btn-icon p-2 rounded-md ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Kalendervy"> <CalendarIcon className="h-5 w-5" /> </button>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div> <label htmlFor="sFStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label> <select id="sFStatus" value={shiftFilters.status} onChange={e=>setShiftFilters(p=>({...p, status:e.target.value}))} className="form-select w-full"><option value="all">Alla Statusar</option><option value="open">Öppna</option><option value="filled">Tillsatta</option><option value="cancelled">Avbokade</option></select> </div>
                                    <div> <label htmlFor="sFRole" className="block text-sm font-medium text-gray-700 mb-1">Roll</label> <select id="sFRole" value={shiftFilters.role} onChange={e=>setShiftFilters(p=>({...p, role:e.target.value}))} className="form-select w-full"><option value="">Alla Roller</option><option value="pharmacist">Farmaceut</option><option value="egenvårdsrådgivare">Egenvårdsrådgivare</option><option value="säljare">Säljare</option></select> </div>
                                    <div> <label htmlFor="sFFrom" className="block text-sm font-medium text-gray-700 mb-1">Från Datum</label> <input type="date" id="sFFrom" value={shiftFilters.dateFrom} onChange={e=>setShiftFilters(p=>({...p, dateFrom:e.target.value}))} className="form-input w-full"/> </div>
                                    <div> <label htmlFor="sFTo" className="block text-sm font-medium text-gray-700 mb-1">Till Datum</label> <input type="date" id="sFTo" value={shiftFilters.dateTo} onChange={e=>setShiftFilters(p=>({...p, dateTo:e.target.value}))} className="form-input w-full"/> </div>
                                    <div className="md:col-span-2 lg:col-span-3"> <label htmlFor="sFSearch" className="block text-sm font-medium text-gray-700 mb-1">Sök</label> <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> <input type="text" id="sFSearch" placeholder="Sök på titel, beskrivning, plats..." value={shiftFilters.search} onChange={e=>setShiftFilters(p=>({...p, search:e.target.value}))} className="form-input pl-10 w-full"/></div></div>
                                    <div> <label htmlFor="sFSort" className="block text-sm font-medium text-gray-700 mb-1">Sortera Efter</label> <select id="sFSort" value={shiftSortBy} onChange={e=>setShiftSortBy(e.target.value)} className="form-select w-full"><option value="date_asc">Datum (Stigande)</option><option value="date_desc">Datum (Fallande)</option><option value="role_asc">Roll (A-Ö)</option><option value="role_desc">Roll (Ö-A)</option></select> </div>
                                </div>
                            </div>
                            {loading ? ( <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div> )
                            : error ? ( <div className="bg-red-100 text-red-700 p-4 rounded-lg border border-red-300 flex items-center"><AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" /> Fel: {error}</div> )
                            : filteredPostedShifts.length === 0 && viewMode === 'list' ? (
                                <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
                                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Inga pass hittades</h3>
                                    <p className="text-gray-500 mb-4">Inga pass matchar dina filter eller så har du inte skapat några pass ännu.</p>
                                    <button onClick={handleCreateShift} className="btn btn-primary"> <Plus className="h-5 w-5 mr-2" /> Skapa Ditt Första Pass </button>
                                </div>
                            ) : viewMode === 'list' ? (
                                <div className="space-y-4"> {filteredPostedShifts.map(s => <EmployerShiftCard key={s.id} shift={s} onManageApplicants={handleOpenManageApplicants} onViewDetails={handleOpenShiftDetails} onDelete={handleDeleteShift} onDuplicate={handleDuplicateShift} applicantCount={applicantCounts[s.id]||0} isSelected={selectedShiftIds.has(s.id)} onToggleSelect={handleToggleShiftSelection} />)} </div>
                            ) : ( <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"> <div ref={calendarRef} className="min-h-[600px] sm:min-h-[650px] md:min-h-[700px]"></div> </div> )}
                        </div>
                    )}

                                            {activeTab === 'postings' && (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-center sm:justify-between">
                <button onClick={() => setShowCreatePostingModal(true)} className="btn btn-primary w-full sm:w-auto">
                    <Plus className="h-5 w-5 mr-2"/>Skapa nytt uppdrag
                </button>
                {/* Responsive Tab-like switcher */}
                <div className="p-1 bg-gray-200 rounded-lg flex gap-1 w-full sm:w-auto">
                    <button
                        onClick={() => setPostingsView('active')}
                        className={`w-1/2 sm:w-auto px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${postingsView === 'active' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-600'}`}
                    >
                        Aktiva
                    </button>
                    <button
                        onClick={() => setPostingsView('completed')}
                        className={`w-1/2 sm:w-auto px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${postingsView === 'completed' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-600'}`}
                    >
                        Slutförda ({completedPostings.length})
                    </button>
                </div>
            </div>
            
            {postingsView === 'active' ? (
                <>
                    {/* --- Active Postings View --- */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        {/* Use a responsive grid for filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label htmlFor="pFStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select id="pFStatus" value={postingFilters.status} onChange={e=>setPostingFilters(p=>({...p,status:e.target.value}))} className="form-select w-full">
                                    <option value="all">Alla Aktiva</option>
                                    <option value="open">Öppen</option>
                                    <option value="filled">Tillsatt</option>
                                    <option value="cancelled">Avbokad</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="pFRole" className="block text-sm font-medium text-gray-700 mb-1">Roll</label>
                                <select id="pFRole" value={postingFilters.role} onChange={e=>setPostingFilters(p=>({...p,role:e.target.value}))} className="form-select w-full">
                                    <option value="">Alla Roller</option>
                                    <option value="pharmacist">Farmaceut</option>
                                    <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                                    <option value="säljare">Säljare</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 md:col-span-1">
                                <label htmlFor="pFSearch" className="block text-sm font-medium text-gray-700 mb-1">Fritextsökning</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                    <input type="text" id="pFSearch" placeholder="Sök uppdrag..." value={postingFilters.search} onChange={e=>setPostingFilters(p=>({...p,search:e.target.value}))} className="form-input pl-10 w-full"/>
                                </div>
                            </div>
                        </div>
                    </div>
                     {loadingPostings ? (<div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>)
                    : filteredEmployerPostings.length === 0 ? (
                        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
                            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Inga aktiva uppdrag hittades</h3>
                            <p className="text-gray-500 mb-4 text-sm">Prova att justera dina filter eller skapa ett nytt uppdrag.</p>
                        </div>
                    ) : (
                        // Your existing responsive grid for displaying posting cards
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredEmployerPostings.map(p => (
                                // This is your existing posting card. It should already be responsive.
                                // We now pass the applicant_name to it directly from our RPC call.
                                <div key={p.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                    <div className="p-5 flex-grow">
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h3 className="text-lg font-semibold text-gray-900 flex-1 truncate cursor-pointer hover:underline" title={p.title} onClick={() => handleOpenPostingDetailsAndFetchApplicant(p)}>{p.title}</h3>
                                            <span className={`status-badge status-${p.status}`}>{p.status}</span>
                                        </div>
                                        {/* Display assigned person if filled */}
                                        {p.status === 'filled' && (p as any).applicant_name && (
                                            <p className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                                                <User size={14} className="mr-1.5"/> Tillsatt: {(p as any).applicant_name}
                                            </p>
                                        )}
                                        <div className="text-sm text-gray-500 space-y-1.5 mb-4">
                                            {p.location && (<p className="flex items-center"><MapPin className="h-4 w-4 mr-1.5 text-gray-400 shrink-0"/>{p.location}</p>)}
                                            {p.period_start_date && (<p className="flex items-center"><CalendarIcon className="h-4 w-4 mr-1.5 text-gray-400 shrink-0"/>{format(new Date(p.period_start_date),'d MMM yyyy',{locale:sv})}</p>)}
                                            <p className="flex items-center"><Briefcase className="h-4 w-4 mr-1.5 text-gray-400 shrink-0"/>{p.required_role}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-gray-200 bg-gray-50/75 rounded-b-lg">
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <button onClick={() => handleOpenPostingDetailsAndFetchApplicant(p)} className="btn btn-secondary btn-xs"><Eye className="h-3.5 w-3.5 mr-1"/>Visa</button>
                                            <button onClick={()=>{setSelectedPostingForEdit(p);setShowEditPostingModal(true);}} className="btn btn-secondary btn-xs" disabled={p.status==='cancelled' || p.status === 'completed'}><Edit2 className="h-3.5 w-3.5 mr-1"/>Redigera</button>
                                            <button onClick={()=>{setSelectedPostingForApps(p);setShowPostingApplicantsModal(true);}} className="btn btn-primary btn-xs" disabled={p.status !== 'open'}><Users className="h-3.5 w-3.5 mr-1"/>Sökande</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* --- Completed Postings View --- */}
                    <CompletedPostingsList 
                       postings={completedPostings}
                       onViewDetails={(posting) => handleOpenPostingDetailsAndFetchApplicant(posting as JobPosting)}
                   />
                </>
            )}
        </div>
    )}

                    {activeTab === 'schedule' && (<ScheduleGenerator />)}
                    {activeTab === 'contracts' && (
    <div className="space-y-6">
        <ContractManagement />
    </div>
)}
                   {activeTab === 'completed' && (
    <div className="space-y-6">
        {/* Filtering UI for the History Tab */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Payroll Status Filter */}
                <div>
                    <label htmlFor="hFStatus" className="block text-sm font-medium text-gray-700 mb-1">
                        Lönestatus
                    </label>
                    <select
                        id="hFStatus"
                        value={historyFilters.payrollStatus}
                        onChange={e => setHistoryFilters(p => ({ ...p, payrollStatus: e.target.value }))}
                        className="form-select w-full"
                    >
                        <option value="all">Alla</option>
                        <option value="exported">Exporterad</option>
                        <option value="pending">Ej Exporterad</option>
                    </select>
                </div>

                {/* Date From Filter */}
                <div>
                    <label htmlFor="hFFrom" className="block text-sm font-medium text-gray-700 mb-1">
                        Från Datum
                    </label>
                    <input
                        type="date"
                        id="hFFrom"
                        value={historyFilters.dateFrom}
                        onChange={e => setHistoryFilters(p => ({ ...p, dateFrom: e.target.value }))}
                        className="form-input w-full"
                    />
                </div>

                {/* Date To Filter */}
                <div>
                    <label htmlFor="hFTo" className="block text-sm font-medium text-gray-700 mb-1">
                        Till Datum
                    </label>
                    <input
                        type="date"
                        id="hFTo"
                        value={historyFilters.dateTo}
                        onChange={e => setHistoryFilters(p => ({ ...p, dateTo: e.target.value }))}
                        className="form-input w-full"
                    />
                </div>
                
                {/* Search Filter */}
                <div className="md:col-span-2 lg:col-span-1">
                     <label htmlFor="hFSearch" className="block text-sm font-medium text-gray-700 mb-1">
                        Sök
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            id="hFSearch"
                            placeholder="Sök på titel, anställd..."
                            value={(historyFilters as any).search || ''}
                            onChange={e => setHistoryFilters(p => ({ ...p, search: e.target.value }))}
                            className="form-input pl-10 w-full"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Loading and Error States */}
        {loading ? (
            <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
        ) : error ? (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
        ) : (
            // The list component with the corrected props
            <CompletedShiftsList
                shifts={filteredCompletedShifts}
                onViewShiftDetails={(shift) => {
                    // Correctly sets the state to open the details modal
                    setSelectedDetailsShift(shift as ShiftData);
                    setShowShiftDetailsModal(true);
                }}
                onRefreshData={handleRefresh}
            />
        )}
    </div>
)}
                </main>
             </div>

            {showCreateShiftForm && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8"><CreateShiftForm onSuccess={handleShiftCreated} onClose={()=>setShowCreateShiftForm(false)}/></div></div>)}
            {showCreatePostingModal && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8"><CreatePostingForm onSuccess={handlePostingCreated} onClose={()=>setShowCreatePostingModal(false)}/></div></div>)}
            
            {showApplicationsModal && selectedApplicationShift && (
                <ManageApplicationsModal 
                    shift={selectedApplicationShift} 
                    closeModal={()=>{setShowApplicationsModal(false);setSelectedApplicationShift(null);}} 
                    onUpdate={handleRefresh}
                />
            )}
            {showShiftDetailsModal && selectedDetailsShift && (
                <ShiftDetailsModal 
                    shift={selectedDetailsShift} 
                    onClose={()=>{setShowShiftDetailsModal(false);setSelectedDetailsShift(null);}} 
                    onUpdate={handleRefresh}
                    currentUserRole={profile?.role as UserRole | 'anonymous'}
                />
            )}
                {showPostingDetailsModal && selectedDetailsPosting && (
        <PostingDetailsModal
            posting={selectedDetailsPosting}
            currentUserRole={profile?.role as UserRole | 'anonymous'}
            assignedApplicantId={assignedApplicantId} // Pass the state variable here
            onClose={() => {
                setShowPostingDetailsModal(false);
                setSelectedDetailsPosting(null);
                setAssignedApplicantId(null); // Reset when closing
            }}
            onViewEmployerProfile={() => { /* Implement if needed */ }}
            onUpdate={handleRefresh}
            canApplyInfo={{ canApply: false }}
        />
    )}
            {showEditPostingModal && selectedPostingForEdit && (
                <EditPostingModal 
                    posting={selectedPostingForEdit} 
                    onClose={()=>{setShowEditPostingModal(false);setSelectedPostingForEdit(null);}} 
                    onSuccess={() => { handleRefresh(); toast.success("Annons uppdaterad!"); }}
                  onSave={handleEmployerUpdatePosting}
                  currentUserRole={profile.role as UserRole | 'anonymous'}
                />
            )}
            {showPostingApplicantsModal && selectedPostingForApps && (
                <ManagePostingApplicantsModal 
                    posting={selectedPostingForApps} 
                    onClose={()=>{setShowPostingApplicantsModal(false);setSelectedPostingForApps(null);}} 
                    onUpdate={() => { handleRefresh(); }}
                />
            )}
            <style jsx global>{`
                .dashboard-stat-card {}
                .dashboard-card {}
                .status-badge { @apply inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap; }
                .status-open { @apply bg-blue-100 text-blue-800 border-blue-300; }
                .status-filled { @apply bg-green-100 text-green-800 border-green-300; }
                .status-completed { @apply bg-purple-100 text-purple-800 border-purple-300; }
                .status-cancelled { @apply bg-red-100 text-red-800 border-red-300; }
                .status-unknown { @apply bg-gray-100 text-gray-800 border-gray-300; }
                .status-pending { @apply bg-yellow-100 text-yellow-800 border-yellow-300;}

                .form-input, .form-select, .form-textarea { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed; }
                .form-checkbox { @apply h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500; }

                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out; }
                .btn-xs { @apply px-2.5 py-1 text-xs; }
                .btn-sm { @apply px-3 py-1.5 text-sm; }
                .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
                .btn-primary-outline { @apply border-primary-500 text-primary-600 bg-white hover:bg-primary-50 focus:ring-primary-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-400; }
                .btn-danger { @apply border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500; }
                .btn-danger-outline { @apply border-red-500 text-red-600 bg-white hover:bg-red-50 focus:ring-red-500; }
                .btn-icon { @apply p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500; }
                .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500; }

                .shadow-card { @apply shadow-sm; }
                .hover\:shadow-card-hover:hover { @apply shadow-lg; }

                .fc { width: 100%; max-width: 100%; }
                .fc table { table-layout: fixed; width: 100%; }
                .fc .fc-toolbar.fc-header-toolbar { flex-wrap: wrap; padding-bottom: 0.5rem; }
                .fc .fc-toolbar-chunk { display: flex; flex-wrap: wrap; align-items: center; margin-bottom: 0.25rem; }
                .fc-event-main-custom { line-height: 1.3; font-size: 0.8rem; }
                .fc-daygrid-event { white-space: normal !important; align-items: flex-start !important; }
                .fc-event-time { font-weight: 500; }
                .fc-button { text-transform: capitalize !important; }

                .modal-content-scrollable::-webkit-scrollbar { width: 8px; }
                .modal-content-scrollable::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
                .modal-content-scrollable::-webkit-scrollbar-thumb { background: #c5c5c5; border-radius: 10px; }
                .modal-content-scrollable::-webkit-scrollbar-thumb:hover { background: #a5a5a5; }
            `}</style>
        </div>
    );
}

export default EmployerDashboard;