// src/components/Postings/EmployerPostingsView.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    Loader2, PlusCircle, Eye, Trash2, Edit3, XCircle, Search, RefreshCw, Briefcase, MapPin, CalendarDays, DollarSign, ListChecks, CheckCircle, ChevronUp, ChevronDown
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { sv, Locale as DateFnsLocale } from 'date-fns/locale';
import type { JobPosting, UserRole, UserProfile } from '../../types';
import { deletePosting, updatePosting, fetchEmployerPostings as fetchEmployerPostingsLib } from '../../lib/postings';
import { CreatePostingForm } from './CreatePostingForm';
import { PostingDetailsModal } from './PostingDetailsModal';
import { EmployerProfileViewModal } from '../employer/EmployerProfileViewModal';
import { EditPostingModal } from './EditPostingModal';
import { useAuth } from '../../context/AuthContext';

const roleDisplayMap: Record<string, string> = {
    pharmacist: 'Farmaceut',
    säljare: 'Säljare',
    egenvårdsrådgivare: 'Egenvårdsrådgivare'
};


const formatDateSafe = (dateString: string | null | undefined, formatStr: string = 'd MMM yy', locale: DateFnsLocale = sv): string => {
    if (!dateString) return 'N/A';
    try {
        const dateObj = parseISO(dateString);
        return isValid(dateObj) ? format(dateObj, formatStr, { locale }) : 'Ogiltigt Datum';
    } catch (e) { return 'Datumfel'; }
};

type SortDirection = 'ascending' | 'descending';
interface SortConfig<T> { key: keyof T | null; direction: SortDirection; }

export const EmployerPostingsView: React.FC = () => {
    const { profile: currentUserProfile } = useAuth();
    const [postings, setPostings] = useState<JobPosting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    
    const [selectedPostingForModal, setSelectedPostingForModal] = useState<(JobPosting & { assigned_applicant_id?: string | null }) | null>(null);
    
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('open');
    const [sortConfig, setSortConfig] = useState<SortConfig<JobPosting>>({ key: 'created_at', direction: 'descending' });
    
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);

    const [employerProfileModalOpen, setEmployerProfileModalOpen] = useState(false);
    const [viewingEmployerId, setViewingEmployerId] = useState<string | null>(null);

    const fetchPostings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        if (!currentUserProfile?.id) {
            setError("Användare ej autentiserad.");
            setPostings([]);
            setIsLoading(false);
            return;
        }
        try {
            const { data, error: fetchError } = await fetchEmployerPostingsLib();
            if (fetchError) throw new Error(fetchError);

            let fetchedData = data || [];
            // Apply client-side filters
            if (statusFilter && statusFilter !== 'all') {
                fetchedData = fetchedData.filter(p => p.status === statusFilter);
            }
            if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                fetchedData = fetchedData.filter(p =>
                    p.title?.toLowerCase().includes(searchLower) ||
                    p.description?.toLowerCase().includes(searchLower) ||
                    p.location?.toLowerCase().includes(searchLower)
                );
            }
            setPostings(fetchedData as JobPosting[]);
        } catch (err: any) {
            setError(err.message || "Misslyckades med att ladda jobbannonser.");
            toast.error(err.message || "Misslyckades med att ladda jobbannonser.");
            setPostings([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentUserProfile?.id, statusFilter, searchTerm]);

    useEffect(() => {
        if (currentUserProfile?.id) {
           fetchPostings();
        }
    }, [fetchPostings, currentUserProfile?.id]);

     useEffect(() => {
        if (!currentUserProfile?.id) return;
        const channel = supabase.channel(`employer-postings-view-realtime-${currentUserProfile.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_postings', filter: `employer_id=eq.${currentUserProfile.id}` },
                (payload) => { console.log('Job posting change detected in EmployerPostingsView!', payload); fetchPostings(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_posting_applications'},
                (payload) => { console.log('Job posting application change, might affect EmployerPostingsView!', payload); fetchPostings(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUserProfile?.id, fetchPostings]);

    const sortedPostings = useMemo(() => {
        let sortableItems = [...postings];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];
                if (aValue == null && bValue == null) return 0;
                if (aValue == null) return sortConfig.direction === 'ascending' ? 1 : -1;
                if (bValue == null) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [postings, sortConfig]);

    const requestSort = (key: keyof JobPosting) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof JobPosting) => {
        if (sortConfig.key !== key) return <ListChecks size={14} className="ml-1 text-gray-400 opacity-50" />;
        return sortConfig.direction === 'ascending' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />;
    };

    const handleCreateSuccess = () => {
        setShowCreateForm(false);
        fetchPostings();
       
    };

    const handleEditSuccess = () => {
        setShowEditForm(false);
        setEditingPosting(null);
        fetchPostings();
    };

const handleViewDetails = useCallback(async (posting: JobPosting) => {
    console.log("[EmployerPostingsView] Opening details. Posting ID:", posting.id, "Status:", posting.status);
    
    let assignedApplicantId: string | null = null;

    if (posting.status === 'filled' && posting.id) {
        console.log("[EmployerPostingsView] Posting is 'filled'. Attempting to fetch accepted applicant.");
        setIsLoading(true);
        
        try {
            const { data: application, error: appError } = await supabase
                .from('job_posting_applications')
                .select('applicant_id')
                .eq('job_posting_id', posting.id)
                .eq('status', 'accepted')
                .limit(1)
                .maybeSingle();
            
            console.log("[EmployerPostingsView] DB query for accepted application:", {
                postingId: posting.id,
                application,
                error: appError
            });

            if (appError) {
                if (appError.code !== 'PGRST116') { // Not a "no rows found" error
                    console.error("[EmployerPostingsView] Error fetching accepted applicant:", appError);
                    toast.error("Kunde inte hämta information om tilldelad sökande.");
                }
            } else if (application?.applicant_id) {
                assignedApplicantId = application.applicant_id;
                console.log("[EmployerPostingsView] Found assigned applicant ID:", assignedApplicantId);
            } else {
                console.log("[EmployerPostingsView] No accepted application found for this filled posting.");
            }
        } catch (e: any) {
            console.error("[EmployerPostingsView] Exception while fetching applicant info:", e);
            toast.error("Ett oväntat fel inträffade vid hämtning av sökandeinformation.");
        } finally {
            setIsLoading(false);
        }
    }
    
    // Create the posting object with the assigned applicant ID
    const postingForModal = {
        ...posting,
        assigned_applicant_id: assignedApplicantId
    };
    
    console.log("[EmployerPostingsView] Setting modal data:", {
        postingId: postingForModal.id,
        status: postingForModal.status,
        assigned_applicant_id: postingForModal.assigned_applicant_id
    });
    
    setSelectedPostingForModal(postingForModal);
    setShowDetailsModal(true);
}, [currentUserProfile?.id]);

    const handleDeletePosting = async (postingId: string) => {
        if (!window.confirm('Är du säker på att du vill ta bort denna jobbannons? Denna åtgärd kan inte ångras.')) return;
        const toastId = toast.loading('Tar bort annons...');
        const { error: deleteError } = await deletePosting(postingId);
        if (deleteError) {
            toast.error(`Misslyckades med att ta bort: ${deleteError}`, { id: toastId });
        } else {
            toast.success('Annons borttagen!', { id: toastId });
            fetchPostings();
        }
    };

    const handleUpdateStatus = async (postingId: string, newStatus: 'open' | 'filled' | 'cancelled' | 'completed') => {
        if (newStatus === 'filled') {
            toast("För att markera en annons som 'Tillsatt' och koppla en anställd för lön, vänligen acceptera en sökande via 'Hantera Sökande' från din Dashboard eller när du ser annonsdetaljerna.", {duration: 8000});
            // Optionally, you could open the ManagePostingApplicantsModal here if you pass the full posting object
            // For now, just informing the user.
            return;
        }
        if (!window.confirm(`Är du säker på att du vill ändra status för denna annons till '${newStatus}'?`)) return;
        
        const toastId = toast.loading(`Uppdaterar status till '${newStatus}'...`);
        const { success, error: updateError } = await updatePosting(postingId, { status: newStatus });
        if (!success || updateError) {
            toast.error(`Misslyckades med att uppdatera status: ${updateError}`, { id: toastId });
        } else {
            toast.success(`Annonsstatus uppdaterad till '${newStatus}'!`, { id: toastId });
            fetchPostings();
        }
    };
    
    const handleOpenEditModal = (postingToEdit: JobPosting) => {
        setEditingPosting(postingToEdit);
        setShowEditForm(true);
    };

    const handleViewEmployerProfile = useCallback((employerId: string) => {
        setViewingEmployerId(employerId);
        setEmployerProfileModalOpen(true);
    }, []);

    const handleCloseEmployerProfileModal = useCallback(() => {
        setEmployerProfileModalOpen(false);
        setViewingEmployerId(null);
    }, []);

    if (showCreateForm) { /* ... (same as before) ... */ 
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
                    <CreatePostingForm onSuccess={handleCreateSuccess} onClose={() => setShowCreateForm(false)} />
                </div>
            </div>
        );
    }

    if (showEditForm && editingPosting) { /* ... (same as before) ... */ 
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
                    <EditPostingModal
                        posting={editingPosting}
                        onClose={() => { setShowEditForm(false); setEditingPosting(null); }}
                        onSuccess={handleEditSuccess}
                        onSave={async (id, data) => updatePosting(id, data)} // Ensure updatePosting is correctly passed
                        currentUserRole={currentUserProfile?.role as UserRole | 'anonymous'}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="p-3 sm:p-4 md:p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-5">Dina uppdrag</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-end mb-4">
                    <div>
                        <label htmlFor="statusFilterPostingsView" className="label-style">Status</label>
                        <select id="statusFilterPostingsView" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select w-full">
                            <option value="all">Alla Statusar</option>
                            <option value="open">Öppen</option>
                            <option value="filled">Tillsatt</option>
                            <option value="completed">Slutförd</option>
                            <option value="cancelled">Avbokad</option>
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="searchTermPostingsView" className="label-style">Sök</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" id="searchTermPostingsView" placeholder="Titel, plats..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input w-full pl-9"/>
                        </div>
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t ">
                    <button onClick={fetchPostings} disabled={isLoading} className="btn btn-secondary btn-sm mb-2 sm:mb-0 w-full sm:w-auto">
                        <RefreshCw size={14} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Sök / Uppdatera
                    </button>
                    <button onClick={() => setShowCreateForm(true)} className="btn btn-primary btn-sm w-full sm:w-auto">
                        <PlusCircle size={16} className="mr-2" /> Skapa Ny Annons
                    </button>
                </div>
            </div>

            {isLoading && <div className='text-center p-10'><Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600"/><p className="mt-2 text-gray-500">Laddar uppdrag...</p></div>}
            {error && <div className="text-red-700 bg-red-100 p-4 rounded-md border border-red-300 shadow-sm my-4">Fel: {error}</div>}

            {!isLoading && !error && (
                <div className="overflow-x-auto shadow-md border border-gray-200 sm:rounded-lg bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 whitespace-nowrap">
                            <tr>
                                {([
                                    { label: 'Titel', key: 'title' as keyof JobPosting },
                                    { label: 'Roll', key: 'required_role' as keyof JobPosting },
                                    { label: 'Plats', key: 'location' as keyof JobPosting },
                                    { label: 'Period Start', key: 'period_start_date' as keyof JobPosting },
                                    { label: 'Period Slut', key: 'period_end_date' as keyof JobPosting },
                                    { label: 'Status', key: 'status' as keyof JobPosting },
                                    { label: 'Åtgärder', sortable: false }
                                ] as Array<{ label: string; key?: keyof JobPosting; sortable?: boolean }>).map(header => (
                                    <th key={header.label} className="th-cell" onClick={() => (header.sortable !== false && header.key) && requestSort(header.key as keyof JobPosting)}>
                                        <div className={`flex items-center ${(header.sortable !== false && header.key) ? 'cursor-pointer' : ''}`}>
                                            {header.label}
                                            {(header.sortable !== false && header.key) && getSortIcon(header.key as keyof JobPosting)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedPostings.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic text-lg">Inga uppdrag att visa.</td></tr>
                            ) : (
                                sortedPostings.map((posting) => {
            // This is the corrected placement for the variable
            const displayRole = roleDisplayMap[posting.required_role] || posting.required_role;

            return (
                <tr key={posting.id} className="hover:bg-slate-50 transition-colors">
                    <td className="td-cell font-medium text-gray-800 max-w-xs truncate" title={posting.title}>{posting.title}</td>
                    <td className="td-cell capitalize">{displayRole}</td>
                    <td className="td-cell max-w-[120px] truncate" title={posting.location || undefined}>{posting.location || 'N/A'}</td>
                    <td className="td-cell whitespace-nowrap">{formatDateSafe(posting.period_start_date)}</td>
                    <td className="td-cell whitespace-nowrap">{formatDateSafe(posting.period_end_date)}</td>
                    <td className="td-cell whitespace-nowrap">
                        <span className={`status-badge-sm capitalize ${
                            posting.status === 'open' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            posting.status === 'filled' ? 'bg-green-100 text-green-800 border-green-300' :
                            posting.status === 'completed' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                            posting.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-300' :
                            'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                            {posting.status}
                        </span>
                    </td>
                    <td className="td-cell text-right">
                        <div className="flex flex-col xs:flex-row gap-1 justify-end">
                            <button onClick={() => handleViewDetails(posting)} className="btn btn-tertiary btn-xs"> <Eye size={14} className="mr-1"/> Visa </button>
                            {(posting.status === 'open' || posting.status === 'filled') &&
                                <button onClick={() => handleOpenEditModal(posting)} className="btn btn-secondary-outline btn-xs"> <Edit3 size={14} className="mr-1"/> Redigera </button>
                            }
                            {posting.status === 'open' &&
                                <button onClick={() => handleUpdateStatus(posting.id, 'filled')} className="btn btn-success-outline btn-xs"> <CheckCircle size={14} className="mr-1"/> Markera Tillsatt </button>
                            }
                            {posting.status !== 'completed' && posting.status !== 'cancelled' &&
                                <button onClick={() => handleUpdateStatus(posting.id, 'cancelled')} className="btn btn-warning-outline btn-xs"> <XCircle size={14} className="mr-1"/> Avboka </button>
                            }
                            <button onClick={() => handleDeletePosting(posting.id)} className="btn btn-danger-outline btn-xs"> <Trash2 size={14} className="mr-1"/> Ta bort </button>
                        </div>
                    </td>
                </tr>
            );
        })
    )}
</tbody>
                    </table>
                </div>
          )}
{showDetailsModal && selectedPostingForModal && (
    <PostingDetailsModal
        posting={selectedPostingForModal}
        currentUserRole={currentUserProfile?.role as UserRole | 'anonymous'}
        assignedApplicantId={selectedPostingForModal.assigned_applicant_id}
        onClose={() => { 
            setSelectedPostingForModal(null); 
            setShowDetailsModal(false); 
        }}
        onViewEmployerProfile={handleViewEmployerProfile}
        onUpdate={fetchPostings}
        canApplyInfo={{ canApply: false }}
    />
)}
            {employerProfileModalOpen && viewingEmployerId && (
                <EmployerProfileViewModal
                    isOpen={employerProfileModalOpen}
                    employerId={viewingEmployerId}
                    onClose={handleCloseEmployerProfileModal}
                />
            )}
            {/* Styles */}
            <style jsx global>{`
                .label-style { @apply block text-xs sm:text-sm font-medium text-gray-700 mb-1; }
                .form-input, .form-select { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100; }
                .th-cell { @apply px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
                .td-cell { @apply px-3 py-3 text-sm text-gray-700; }
                .status-badge-sm { @apply inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
                .btn-xs { @apply px-2.5 py-1 text-xs; }
                .btn-sm { @apply px-3 py-1.5 text-sm; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-secondary-outline { @apply border-indigo-500 text-indigo-600 bg-white hover:bg-indigo-50 focus:ring-indigo-500; }
                .btn-danger-outline { @apply border-red-500 text-red-600 bg-white hover:bg-red-50 focus:ring-red-500; }
                .btn-warning-outline { @apply border-yellow-500 text-yellow-600 bg-white hover:bg-yellow-50 focus:ring-yellow-500; }
                .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500; }
                .btn-success-outline { @apply border-green-500 text-green-600 bg-white hover:bg-green-50 focus:ring-green-500; }
                .btn-tertiary { @apply border-gray-300 text-gray-600 bg-white hover:bg-gray-100 focus:ring-gray-500; }
            `}</style>
        </div>
    );
};