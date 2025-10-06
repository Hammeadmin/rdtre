// src/pages/ShiftsPage.tsx
import { NotificationToggle } from '../components/Profile/NotificationToggle'; // <-- 1. Import

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ShiftList } from '../components/Shifts/ShiftList';
import { ApplicationModal } from '../components/Shifts/ApplicationModal';
import {
    Search, MapPin, Briefcase, Building2, Loader2, Filter as FilterIcon, RefreshCw,
    List as ListIcon, Calendar as CalendarIcon, XCircle, ShieldCheck, AlertTriangle, Flame
} from 'lucide-react';
import {
    fetchAvailableShifts,
    fetchAllShiftsForAdmin,
    deleteShift
} from '../lib/shifts';
import type { ShiftNeed, UserRole, UserProfile } from '../types';
// import type { Database } from '../types/database'; // Not directly used here

import EmployeeShiftDetailsModal from '../components/Shifts/ShiftdetailsmodalPharm';
import AdminEmployerShiftDetailsModal from '../components/Shifts/ShiftDetailsModal';

const VerificationInfoBox = ({ profile }: { profile: UserProfile | null }) => {
    if (!profile || profile.license_verified) {
        return null;
    }

    let message = '';
    switch (profile.role) {
        case 'pharmacist':
            message = "För att bli verifierad, vänligen ladda upp din legitimation på din profilsida.";
            break;
        case 'säljare':
        case 'egenvårdsrådgivare':
            message = "För att bli verifierad, se till att din profil är fullständigt ifylld.";
            break;
        default:
            message = "Ditt konto väntar på att bli verifierat av en administratör.";
    }

    return (
        <div className="p-4 mb-6 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg">
            <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mr-3" />
                <div>
                    <p className="font-bold">Ditt konto är inte verifierat</p>
                    <p className="text-sm">{message} Du kommer inte kunna söka pass förrän detta är gjort.</p>
                </div>
            </div>
        </div>
    );
};

const canApplyForShift = (
    profile: UserProfile | null | undefined,
    shiftRequiredRole: UserRole | null | undefined
): { canApply: boolean; reason?: string } => {
    if (!profile || !profile.role || !['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile.role as UserRole)) {
        return { canApply: false, reason: "Endast sökande roller (farmaceut, säljare, egenvårdsrådgivare) kan ansöka." };
    }
    if (profile.is_active === false) {
        return { canApply: false, reason: "Ditt konto är inte aktivt." };
    }
    if (profile.license_verified !== true) {
        return { canApply: false, reason: "Ditt konto måste vara verifierat av en administratör innan du kan ansöka." };
    }
    if (shiftRequiredRole) {
        switch (profile.role as UserRole) {
            case 'pharmacist':
                if (!['pharmacist', 'egenvårdsrådgivare', 'säljare'].includes(shiftRequiredRole)) {
                    return { canApply: false, reason: `Din roll (Farmaceut) matchar inte den krävda rollen (${shiftRequiredRole}).` };
                }
                break;
            case 'egenvårdsrådgivare':
                if (!['egenvårdsrådgivare', 'säljare'].includes(shiftRequiredRole)) {
                    return { canApply: false, reason: `Din roll (Egenvårdsrådgivare) matchar inte den krävda rollen (${shiftRequiredRole}).` };
                }
                break;
            case 'säljare':
                if (shiftRequiredRole !== 'säljare') {
                    return { canApply: false, reason: `Din roll (Säljare) kan endast söka Säljare-roller.` };
                }
                break;
            default:
                 return { canApply: false, reason: "Din roll kan inte söka detta pass." };
        }
    }
    return { canApply: true };
};

export function ShiftsPage() {
    const { profile, user, loading: authLoading } = useAuth();
    const userId = user?.id;
    const currentUserRole = profile?.role as UserRole | 'anonymous';
    const isAdmin = currentUserRole === 'admin';
    const isEmployer = currentUserRole === 'employer';
    const applicantRoles: UserRole[] = ['pharmacist', 'säljare', 'egenvårdsrådgivare'];
    const isEmployee = profile?.role && applicantRoles.includes(profile.role as UserRole);

    const [activeTab, setActiveTab] = useState<'available' | 'myApplications'>('available');
    const [allShifts, setAllShifts] = useState<ShiftNeed[]>([]);
    const [loadingShifts, setLoadingShifts] = useState(true);
    const [errorShifts, setErrorShifts] = useState<string | null>(null);
    // const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list'); // Not fully used in current view
    const [selectedShiftIdForApply, setSelectedShiftIdForApply] = useState<string | null>(null);
    const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<ShiftNeed | null>(null);
    const [appliedShiftIds, setAppliedShiftIds] = useState<Set<string>>(new Set());

    const [filters, setFilters] = useState({
        search: '', location: '', employer: '', dateFrom: '', dateTo: '',
        status: 'all', role: 'all', showOnlyUrgent: false,
    });

    const loadData = useCallback(async () => {
        // ... (loadData implementation as you provided, ensuring commonFetchParams is correct) ...
        if (authLoading) return;
        setLoadingShifts(true); setErrorShifts(null);
        try {
            let data: ShiftNeed[] | null = null;
            let fetchErrorObject: { message: string } | string | null = null;
            const commonFetchParams = {
                searchTerm: filters.search || undefined,
                location: filters.location || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
                status: filters.status === 'all' ? undefined : filters.status,
                role: filters.role === 'all' ? undefined : filters.role as UserRole,
                isUrgent: filters.showOnlyUrgent ? true : undefined,
            };

            if (isAdmin || isEmployer) {
                const result = await fetchAllShiftsForAdmin({
                    ...commonFetchParams,
                    employerId: isEmployer && profile?.id ? profile.id : (isAdmin && filters.employer ? filters.employer : undefined),
                });
                data = result.data; fetchErrorObject = result.error;
            } else if (isEmployee) {
                 const employeeResult = await fetchAvailableShifts(currentUserRole as UserRole, commonFetchParams);
                data = employeeResult.data; fetchErrorObject = employeeResult.error;
                if (userId && data) {
                    const { data: applications, error: appError } = await supabase.from('shift_applications').select('shift_id').eq('applicant_id', userId).in('status', ['pending', 'accepted']);
                    if (appError) console.warn("Could not fetch user applications:", appError);
                    setAppliedShiftIds(new Set(applications?.map(app => app.shift_id) || []));
                }
            } else { setAllShifts([]); setLoadingShifts(false); return; }
            if (fetchErrorObject) throw new Error(typeof fetchErrorObject === 'string' ? fetchErrorObject : (fetchErrorObject as { message: string }).message || 'Failed to fetch shifts');
            setAllShifts(data || []);
        } catch (err: any) {
            setErrorShifts(err.message || 'Failed to fetch shifts');
            toast.error(err.message || 'Failed to load shifts');
            setAllShifts([]);
        } finally { setLoadingShifts(false); }
    }, [authLoading, currentUserRole, userId, isAdmin, isEmployer, filters, profile?.id]);


    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const handleDbChanges = (payload: any) => { loadData(); };
        const shiftNeedsSub = supabase.channel('public-shift-needs-list').on('postgres_changes', { event: '*', schema: 'public', table: 'shift_needs' }, handleDbChanges).subscribe();
        let appSub: any;
        if (profile?.id && isEmployee) {
            appSub = supabase.channel(`user-applications-${profile.id}-list`).on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications', filter: `applicant_id=eq.${profile.id}` }, handleDbChanges).subscribe();
        }
        return () => {
            supabase.removeChannel(shiftNeedsSub).catch(err => console.error('Error removing shift_needs channel', err));
            if (appSub) supabase.removeChannel(appSub).catch(err => console.error('Error removing applications channel', err));
        };
    }, [loadData, profile?.id, isEmployee]);

    const filteredShiftsForDisplay = useMemo(() => {
        let processedShifts = [...allShifts];
        // Client-side filtering (if needed, primary filtering should be backend)
        if (!isAdmin && !isEmployer) {
            if (filters.search) {
                const lowerQuery = filters.search.toLowerCase();
                processedShifts = processedShifts.filter(shift =>
                    shift.title?.toLowerCase().includes(lowerQuery) ||
                    shift.employer?.pharmacy_name?.toLowerCase().includes(lowerQuery) ||
                    shift.employer?.full_name?.toLowerCase().includes(lowerQuery)
                );
            }
            if (filters.location) {
                 const lowerLoc = filters.location.toLowerCase();
                 processedShifts = processedShifts.filter(shift => shift.location?.toLowerCase().includes(lowerLoc));
            }
        }
        // Client-side filtering for urgent if backend doesn't support it directly for employees
        // If using `commonFetchParams.isUrgent` in `fetchAvailableShifts`, this client-side filter might be redundant for `showOnlyUrgent`.
        if (filters.showOnlyUrgent && !(isAdmin || isEmployer)) { // Keep for employee if backend `fetchAvailableShifts` doesn't filter urgent
             processedShifts = processedShifts.filter(shift => shift.is_urgent === true);
        }

        processedShifts.sort((a, b) => {
            if (a.is_urgent && !b.is_urgent) return -1;
            if (!a.is_urgent && b.is_urgent) return 1;
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
        });
        return processedShifts;
    }, [allShifts, filters, isAdmin, isEmployer]);

    const handleApplyAttemptShift = (shift: ShiftNeed) => {
        console.log('[ShiftsPage] handleApplyAttemptShift called for shift ID:', shift.id);
        if (!profile || !isEmployee) {
            toast.error("Vänligen logga in som sökande för att ansöka."); return;
        }
        const eligibility = canApplyForShift(profile, shift.required_role);
        if (!eligibility.canApply) {
            toast.error(eligibility.reason || "Du kan inte söka detta pass.", { duration: 5000 });
            return;
        }
        setSelectedShiftForDetails(null); // Close details modal first
        setSelectedShiftIdForApply(shift.id);
        console.log('[ShiftsPage] selectedShiftIdForApply set to:', shift.id);
    };

    const handleApplicationSuccess = () => {
        loadData();
        setSelectedShiftIdForApply(null);
        
    };

    const handleViewDetails = (shift: ShiftNeed) => {
        console.log('[ShiftsPage] handleViewDetails called with shift:', shift.id);
        setSelectedShiftIdForApply(null); // Close application modal if it was open for another shift
        setSelectedShiftForDetails(shift);
    };

    const handleModalShiftUpdate = async () => {
        toast.success(`Pass uppdaterat!`);
        loadData();
        setSelectedShiftForDetails(null);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
    };
    const handleClearFilters = () => setFilters({
        search: '', location: '', employer: '', dateFrom: '', dateTo: '',
        status: 'all', role: 'all', showOnlyUrgent: false
    });

    const handleDeleteShift = async (shiftId: string) => {
        const shiftToDelete = allShifts.find(s => s.id === shiftId) || selectedShiftForDetails;
        if (!shiftToDelete) { toast.error("Passet hittades inte."); return; }
        if (!window.confirm(`Är du säker på att du vill ta bort passet "${shiftToDelete.title || shiftId}"?`)) return;
        const toastId = toast.loading("Tar bort pass...");
        const { success, error } = await deleteShift(shiftId, shiftToDelete.employer_id || '', currentUserRole, profile?.id);
        if (success) {
            toast.success("Pass borttaget!", { id: toastId });
            setSelectedShiftForDetails(null); loadData();
        } else {
            toast.error(`Borttagning misslyckades: ${error || 'Okänt fel'}`, { id: toastId });
        }
    };

    if (authLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary-600" /></div>;
    if (!profile && !authLoading) { // Added check for profile to avoid rendering page for anonymous users if that's not intended
         return ( <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center"> <p className="text-lg text-gray-600">Vänligen logga in för att se denna sida.</p> </div> );
    }
    if (!isAdmin && !isEmployer && !isEmployee && !authLoading) {
         return ( <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center"> <p className="text-lg text-gray-600">Denna sida är endast tillgänglig för relevanta användarroller.</p> </div> );
    }
    
    console.log('[ShiftsPage] Rendering. Role:', currentUserRole, 'isEmployee:', isEmployee);
    console.log('[ShiftsPage] selectedShiftIdForApply:', selectedShiftIdForApply, 'selectedShiftForDetails:', selectedShiftForDetails?.id);


return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        {isAdmin ? 'Alla Arbetspass' : isEmployer ? 'Mina Publicerade Pass' : 'Tillgängliga Arbetspass'}
                    </h1>
                    <p className="mt-1 text-md text-gray-500">Sök, filtrera och hantera arbetspass.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isEmployee && (
                        <div className={`p-2 rounded-md text-sm flex items-center ${profile.license_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
                            {profile.license_verified ? <ShieldCheck className="h-5 w-5 mr-1.5" /> : <AlertTriangle className="h-5 w-5 mr-1.5" />}
                            Kontostatus: {profile.license_verified ? 'Verifierad' : 'Ej Verifierad'}
                        </div>
                    )}
                    <button onClick={loadData} disabled={loadingShifts} className="btn btn-secondary">
                        <RefreshCw className={`h-4 w-4 ${loadingShifts ? 'animate-spin' : ''} mr-2`} />
                        Uppdatera
                    </button>
                </div>
            </div>

           {isEmployee && (
        <div className="mb-6">
          <NotificationToggle />
        </div>
      )}
          <VerificationInfoBox profile={profile} />

            <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                {/* CORRECTED: Using flex-wrap for better responsiveness */}
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-grow min-w-[150px]"><label htmlFor="search" className="label-form">Sök</label><div className="relative"><Search className="icon-form" /><input type="text" id="search" name="search" placeholder={isAdmin || isEmployer ? "Titel, plats..." : "Titel, apotek..."} value={filters.search} onChange={handleFilterChange} className="input-form pl-10" /></div></div>
                    <div className="flex-grow min-w-[150px]"><label htmlFor="location" className="label-form">Plats</label><div className="relative"><MapPin className="icon-form" /><input type="text" id="location" name="location" placeholder="Stad, address..." value={filters.location} onChange={handleFilterChange} className="input-form pl-10" /></div></div>
                    <div className="flex-grow min-w-[120px]"><label htmlFor="dateFrom" className="label-form">Fr.o.m.</label><input type="date" id="dateFrom" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="input-form" /></div>
                    <div className="flex-grow min-w-[120px]"><label htmlFor="dateTo" className="label-form">T.o.m.</label><input type="date" id="dateTo" name="dateTo" value={filters.dateTo} min={filters.dateFrom} onChange={handleFilterChange} className="input-form" /></div>

                    {(isAdmin || isEmployer) && (
                        <>
                            <div className="flex-grow min-w-[120px]"><label htmlFor="status" className="label-form">Status</label><select id="status" name="status" value={filters.status} onChange={handleFilterChange} className="input-form bg-white"><option value="all">Alla</option><option value="open">Öppet</option><option value="filled">Tillsatt</option><option value="completed">Slutfört</option><option value="cancelled">Avbokat</option></select></div>
                            <div className="flex-grow min-w-[120px]"><label htmlFor="role" className="label-form">Krävd Roll</label><select id="role" name="role" value={filters.role} onChange={handleFilterChange} className="input-form bg-white"><option value="all">Alla</option><option value="pharmacist">Farmaceut</option><option value="säljare">Säljare</option><option value="egenvårdsrådgivare">Egenvårdsrådgivare</option></select></div>
                            {isAdmin && <div className="flex-grow min-w-[150px]"><label htmlFor="employer" className="label-form">Arbetsgivare (ID)</label><div className="relative"><Building2 className="icon-form" /><input type="text" id="employer" name="employer" placeholder="Arbetsgivar-ID..." value={filters.employer} onChange={handleFilterChange} className="input-form pl-10" /></div></div>}
                        </>
                    )}
                    
                    <div className="pt-5 flex items-center"><label htmlFor="showOnlyUrgent" className="flex items-center cursor-pointer"><input type="checkbox" id="showOnlyUrgent" name="showOnlyUrgent" checked={filters.showOnlyUrgent} onChange={handleFilterChange} className="form-checkbox" /><Flame className="h-4 w-4 text-orange-500 mx-1" /><span className="text-xs font-medium text-gray-700">Akuta</span></label></div>
                    <div className="pt-5"><button onClick={handleClearFilters} className="btn btn-outline w-full text-sm"><XCircle size={16} className="mr-1.5" /> Rensa</button></div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg border border-gray-200">
                <div className="mt-4">
                    {loadingShifts ? ( <div className="text-center py-20"><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary-600" /></div>
                    ) : errorShifts ? ( <div className="text-center py-20 text-red-600 bg-red-50 p-4 rounded-md">Fel: {errorShifts}</div>
                    ) : (
                        <ShiftList
                            shifts={filteredShiftsForDisplay}
                            onApply={isEmployee ? handleApplyAttemptShift : undefined}
                            onViewDetails={handleViewDetails}
                            currentUserRole={currentUserRole}
                            appliedShiftIds={appliedShiftIds}
                            onRefresh={loadData}
                            profile={profile}
                            onAdminEdit={isAdmin || isEmployer ? handleViewDetails : undefined}
                            onAdminDelete={isAdmin || isEmployer ? handleDeleteShift : undefined}
                        />
                    )}
                </div>
            </div>

            {selectedShiftIdForApply && isEmployee && (
                <ApplicationModal
                    shiftId={selectedShiftIdForApply}
                    shiftTitle={allShifts.find(s => s.id === selectedShiftIdForApply)?.title}
                    onClose={() => setSelectedShiftIdForApply(null)}
                    onSuccess={handleApplicationSuccess}
                />
            )}

            {selectedShiftForDetails && (
                (isAdmin || isEmployer) ? (
                    <AdminEmployerShiftDetailsModal
                        shift={selectedShiftForDetails}
                        onClose={() => setSelectedShiftForDetails(null)}
                        onUpdate={handleModalShiftUpdate}
                        currentUserRole={currentUserRole}
                        onAdminDelete={handleDeleteShift}
                    />
                ) : (
                    <EmployeeShiftDetailsModal
                        shift={selectedShiftForDetails}
                        onClose={() => setSelectedShiftForDetails(null)}
                        onApply={isEmployee ? () => handleApplyAttemptShift(selectedShiftForDetails) : undefined}
                        hasApplied={isEmployee && appliedShiftIds.has(selectedShiftForDetails.id)}
                        profile={profile}
                    />
                )
            )}
            
            <style jsx global>{`
              .label-form { @apply block text-xs font-medium text-gray-600 mb-1; }
              .icon-form { @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none; }
              .input-form { @apply w-full rounded-md border-gray-300 shadow-sm px-2 py-1.5 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors; }
              .form-checkbox { @apply h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500; }
              .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
              .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
              .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500; }
              .btn-outline { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500; }
            `}</style>
        </div>
    );
}

export default ShiftsPage;