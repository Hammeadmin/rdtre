import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
    Calendar as CalendarIcon, Clock, Building2, MapPin, Eye, List,
    Loader2, AlertTriangle, Circle // <-- Import Circle for the legend
} from 'lucide-react';

// --- MODAL AND LIBRARY IMPORTS ---
import { ShiftDetailsModal } from '../components/Shifts/ShiftdetailsmodalPharm';
import { PostingDetailsModal } from '../components/postings/PostingDetailsModal';
import { fetchMyFullSchedule, UnifiedEvent } from '../lib/shifts';
import { fetchSinglePosting } from '../lib/postings';

// --- FULLCALENDAR IMPORTS ---
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import fcSvLocale from '@fullcalendar/core/locales/sv';

// --- TYPE IMPORTS ---
import type { JobPosting } from '../types';


const MySchedulePage: React.FC = () => {
    const { profile, loading: authLoading, userRole } = useAuth();
    
    // ... (All state variables remain the same)
    const [allEvents, setAllEvents] = useState<UnifiedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedShiftEvent, setSelectedShiftEvent] = useState<UnifiedEvent | null>(null);
    const [selectedPostingDetails, setSelectedPostingDetails] = useState<JobPosting | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const calendarRef = useRef<HTMLDivElement>(null);
    const calendarInstanceRef = useRef<Calendar | null>(null);
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<ShiftNeed | null>(null);

    // ... (All functions for data fetching and event handling remain the same)
    const fetchScheduleData = useCallback(async () => {
        if (!allEvents.length) setLoading(true); 
        setError(null);
        try {
            const { data, error: fetchError } = await fetchMyFullSchedule();
            if (fetchError) throw fetchError;
            setAllEvents(data || []);
        } catch (err: any) {
            console.error('Error fetching full schedule:', err);
            setError(err.message || 'Failed to load your schedule');
            toast.error('Failed to load your schedule');
        } finally {
            setLoading(false);
        }
    }, [allEvents.length]);

    useEffect(() => {
        if (!authLoading && profile?.id) {
            fetchScheduleData();
        }

        const channel = supabase.channel('my-schedule-realtime-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications' }, () => fetchScheduleData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_posting_applications' }, () => fetchScheduleData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [authLoading, profile?.id, fetchScheduleData]);

    const filteredEvents = useMemo(() => {
        return allEvents.filter(event => {
            const eventStartDate = format(parseISO(event.start_time), 'yyyy-MM-dd');
            if (dateFromFilter && eventStartDate < dateFromFilter) return false;
            if (dateToFilter && eventStartDate > dateToFilter) return false;
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                if (!event.title?.toLowerCase().includes(lowerQuery) && !event.location?.toLowerCase().includes(lowerQuery)) return false;
            }
            return true;
        });
    }, [allEvents, dateFromFilter, dateToFilter, searchQuery]);

    const calendarEventsForFC = useMemo(() => {
        return filteredEvents.map(event => ({
            id: event.event_id,
            title: event.title,
            start: event.start_time,
            end: event.end_time,
            backgroundColor: event.event_type === 'posting' ? '#2563EB' : '#10B981',
            borderColor: event.event_type === 'posting' ? '#1D4ED8' : '#059669',
            extendedProps: { eventData: event },
        }));
    }, [filteredEvents]);

    const handleEventClick = useCallback(async (event: UnifiedEvent) => {
    setLoadingDetails(true);
    // Clear any previously selected details
    setSelectedShiftDetails(null);
    setSelectedPostingDetails(null);

    if (event.event_type === 'shift') {
        // Fetch the FULL shift details from the database
        const { data, error } = await supabase
            .from('shift_needs')
            .select(`*, employer:employer_id(full_name, pharmacy_name)`)
            .eq('id', event.event_id)
            .single();

        if (error) {
            toast.error("Kunde inte ladda passdetaljer.");
            console.error("Error fetching shift details:", error);
        } else {
            setSelectedShiftDetails(data); // Set the full details in our new state
        }
    } else if (event.event_type === 'posting') {
        const { data, error } = await fetchSinglePosting(event.event_id);
        if (error) {
            toast.error("Kunde inte ladda uppdragsdetaljer.");
        } else {
            setSelectedPostingDetails(data);
        }
    }
    setLoadingDetails(false);
}, []);

const closeModal = () => {
    setSelectedShiftEvent(null); // It's good practice to clear both for now
    setSelectedShiftDetails(null); // <-- ADD THIS LINE
    setSelectedPostingDetails(null);
}

    useEffect(() => {
        if (viewMode !== 'calendar' || !calendarRef.current) {
            calendarInstanceRef.current?.destroy();
            calendarInstanceRef.current = null;
            return;
        }

        const calendarEl = calendarRef.current;
        const calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
            initialView: 'timeGridWeek',
            locale: fcSvLocale,
            events: calendarEventsForFC,
            height: 'auto',
            eventClick: (info) => handleEventClick(info.event.extendedProps.eventData as UnifiedEvent),
            
            // --- NEW: Enhanced Tooltip on Hover ---
            eventMouseEnter: (info) => {
                const event = info.event.extendedProps.eventData as UnifiedEvent;
                const eventTypeDisplay = event.event_type === 'posting' ? 'Uppdrag' : 'Pass';
                let tooltipText = `Typ: ${eventTypeDisplay}\nTitel: ${event.title}`;
                if (event.location) {
                    tooltipText += `\nPlats: ${event.location}`;
                }
                info.el.title = tooltipText;
            },

            eventContent: (arg) => ({ html: `<div class="p-1 truncate" title="${arg.event.title}">${arg.event.title}</div>` })
        });
        calendar.render();
        calendarInstanceRef.current = calendar;

        return () => calendar.destroy();
    }, [viewMode, calendarEventsForFC, handleEventClick]);
    
    if (authLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    if (!profile) return <div className="text-center p-8"><AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" /><h2 className="text-xl font-semibold">Åtkomst nekad</h2><p>Du måste vara inloggad.</p></div>;

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Min Kalender</h1>
            
            <div className="bg-white shadow rounded-lg">
                {/* ... (Filters section remains the same) ... */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    {/* --- NEW: Legend --- */}
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <div className="flex items-center">
                            <Circle className="h-3 w-3 mr-1.5 text-blue-600" fill="currentColor" />
                            <span>Uppdrag</span>
                        </div>
                        <div className="flex items-center">
                            <Circle className="h-3 w-3 mr-1.5 text-green-500" fill="currentColor" />
                            <span>Pass</span>
                        </div>
                    </div>

                    {/* View Mode Selector */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
                        <button onClick={() => setViewMode('list')} title="Listvy" className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-white shadow text-primary-700' : 'text-gray-600'}`}><List className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('calendar')} title="Kalendervy" className={`px-3 py-1 rounded text-sm ${viewMode === 'calendar' ? 'bg-white shadow text-primary-700' : 'text-gray-600'}`}><CalendarIcon className="h-4 w-4" /></button>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin inline-block" /></div>
                ) : filteredEvents.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">Inga händelser hittades.</div>
                ) : viewMode === 'calendar' ? (
                    <div ref={calendarRef} className="p-4 min-h-[70vh]"></div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredEvents.map(event => (
                            <div key={`${event.event_type}-${event.event_id}`} className="p-4 hover:bg-gray-50 flex justify-between items-center gap-4">
                                <div>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${event.event_type === 'posting' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                        {event.event_type === 'posting' ? 'Uppdrag' : 'Pass'}
                                    </span>
                                    <h3 className="font-semibold text-gray-900 mt-1">{event.title}</h3>
                                    <p className="text-sm text-gray-600 flex items-center gap-x-4 mt-1">
                                        <span className="inline-flex items-center"><CalendarIcon className="h-4 w-4 mr-1.5" />{format(parseISO(event.start_time), 'PP', { locale: sv })}</span>
                                        <span className="inline-flex items-center"><Clock className="h-4 w-4 mr-1.5" />{`${format(parseISO(event.start_time), 'HH:mm')} - ${format(parseISO(event.end_time), 'HH:mm')}`}</span>
                                    </p>
                                    {event.location && <p className="text-sm text-gray-500 inline-flex items-center mt-1"><MapPin className="h-4 w-4 mr-1.5" />{event.location}</p>}
                                </div>
                                <button onClick={() => handleEventClick(event)} className="btn btn-secondary btn-xs flex-shrink-0"><Eye className="h-3 w-3 mr-1" />Detaljer</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- Modals --- */}
            {(loadingDetails) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"><Loader2 className="h-12 w-12 text-white animate-spin" /></div>
            )}
            
            {selectedShiftDetails && (
    <ShiftDetailsModal
        shift={selectedShiftDetails}
        profile={profile}
        onClose={closeModal}
        onUpdate={fetchScheduleData}
    />
)}

            {selectedPostingDetails && (
                <PostingDetailsModal
                    posting={selectedPostingDetails}
                    currentUserRole={userRole || 'anonymous'}
                    onClose={closeModal}
                    onViewEmployerProfile={() => {}}
                    canApplyInfo={{ canApply: false, reason: "Du är redan tilldelad detta uppdrag." }}
                />
            )}
        </div>
    );
};

export default MySchedulePage;