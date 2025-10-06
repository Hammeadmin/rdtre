// src/pages/AvailablePostingsPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // <-- Make sure useMemo is imported
import { NotificationToggle } from '../components/Profile/NotificationToggle'; // <-- 1. Import


import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
    fetchAvailablePostings, 
    // applyForPosting, // Application is handled by JobPostingApplicationModal
    fetchMyAppliedPostingIds, fetchMyAcceptedPostings,
    adminUpdatePosting, 
    adminDeletePosting  
} from '../lib/postings'; 
import type { JobPosting, UserRole, UserProfile } from '../types'; 
import type { Database } from '../../types/database'; 
import { PostingCard } from '../components/postings/PostingCard'; 
import { PostingDetailsModal } from '../components/postings/PostingDetailsModal'; 
import { EmployerProfileViewModal } from '../components/employer/EmployerProfileViewModal'; 
import { JobPostingApplicationModal } from '../components/postings/JobPostingApplicationModal'; 
import { MyJobApplicationsView } from '../components/postings/MyJobApplicationsView'; 
import { EditPostingModal } from '../components/postings/EditPostingModal'; 
import { supabase } from '../lib/supabase'; 

import {
    Loader2, Search, MapPin, RefreshCw, ListChecks, Filter, CalendarDays, DollarSign, XCircle,
    ChevronDown, ChevronUp, ShieldCheck, AlertTriangle 
} from 'lucide-react';

type PostingUpdateData = Partial<Omit<Database['public']['Tables']['job_postings']['Update'], 'id' | 'employer_id' | 'created_at' | 'updated_at'>>;

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
                    <p className="text-sm">{message} Du kommer inte kunna söka uppdrag förrän detta är gjort.</p>
                </div>
            </div>
        </div>
    );
};

// Updated canApplyForPosting function
const canApplyForPosting = (
    profile: UserProfile | null | undefined,
    postingRequiredRole: UserRole
): { canApply: boolean; reason?: string } => {
    if (!profile || !profile.role || profile.role === 'anonymous' || profile.role === 'admin' || profile.role === 'employer') {
        return { canApply: false, reason: "Endast sökande roller (farmaceut, säljare, egenvårdsrådgivare) kan ansöka." };
    }
    if (profile.is_active === false) {
        return { canApply: false, reason: "Ditt konto är inte aktivt." };
    }

    // Universal verification check (license_verified is used for all applicable roles)
    if (profile.license_verified !== true) {
        return { canApply: false, reason: "Ditt konto måste vara verifierat av en administratör innan du kan ansöka." };
    }

    // Role compatibility check
    switch (profile.role as UserRole) {
        case 'pharmacist':
            if (!['pharmacist', 'egenvårdsrådgivare', 'säljare'].includes(postingRequiredRole)) {
                return { canApply: false, reason: `Din roll (Farmaceut) matchar inte den krävda rollen (${postingRequiredRole}).` };
            }
            break;
        case 'egenvårdsrådgivare':
            if (!['egenvårdsrådgivare', 'säljare'].includes(postingRequiredRole)) {
                return { canApply: false, reason: `Din roll (Egenvårdsrådgivare) matchar inte den krävda rollen (${postingRequiredRole}).` };
            }
            break;
        case 'säljare':
            if (postingRequiredRole !== 'säljare') {
                return { canApply: false, reason: `Din roll (Säljare) kan endast söka Säljare-roller.` };
            }
            break;
        default: // Should ideally not be reached if the first check on profile.role passes
            return { canApply: false, reason: "Okänd sökanderoll eller rollen kan inte ansöka." };
    }
    return { canApply: true };
};


export function AvailablePostingsPage() {
    const { user, profile, loading: authLoading, fetchProfile } = useAuth(); // Added fetchProfile
    const currentUserRole = profile?.role as UserRole | 'anonymous';
    const isAdmin = currentUserRole === 'admin';
    const applicantRoles: UserRole[] = ['pharmacist', 'säljare', 'egenvårdsrådgivare'];
    const isApplicant = profile?.role && applicantRoles.includes(profile.role as UserRole);
    const [myAcceptedPostings, setMyAcceptedPostings] = useState<JobPosting[]>([]);
    
    const [postings, setPostings] = useState<JobPosting[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filters, setFilters] = useState({ search: '', location: '', role: '', dateFrom: '', dateTo: '', experience: '' });
    const [appliedPostingIds, setAppliedPostingIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'available' | 'myApplications'>('available');
    const [showFilters, setShowFilters] = useState(false);

    const [selectedPostingDetails, setSelectedPostingDetails] = useState<JobPosting | null>(null);
    const [selectedEmployerIdForProfileView, setSelectedEmployerIdForProfileView] = useState<string | null>(null);
    const [showJobPostingApplicationModal, setShowJobPostingApplicationModal] = useState(false);
    const [postingToApplyId, setPostingToApplyId] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);
    const handleMyPostingViewDetails = (postingId: string) => {
    const posting = myAcceptedPostings.find(p => p.id === postingId);
    setSelectedPostingDetails(posting || null);
};

  const { upcomingPostings, completedPostings } = useMemo(() => {
        if (!myAcceptedPostings || myAcceptedPostings.length === 0) {
            return { upcomingPostings: [], completedPostings: [] };
        }

        const now = new Date();
        const upcoming: JobPosting[] = [];
        const completed: JobPosting[] = [];

        // Group postings based on their end date and status
        myAcceptedPostings.forEach(posting => {
            const endDate = new Date(posting.period_end_date);
            if (posting.status === 'completed' || endDate < now) {
                completed.push(posting);
            } else {
                upcoming.push(posting);
            }
        });

        // Sort upcoming postings by start date (soonest first)
        upcoming.sort((a, b) => new Date(a.period_start_date).getTime() - new Date(b.period_start_date).getTime());

        // Sort completed postings by end date (most recent first)
        completed.sort((a, b) => new Date(b.period_end_date).getTime() - new Date(a.period_end_date).getTime());

        return { upcomingPostings: upcoming, completedPostings: completed };
    }, [myAcceptedPostings]); // Dependency array: this code runs only when myAcceptedPostings changes
    
    useEffect(() => { 
        const handleInitialSetShowFilters = () => { if (window.innerWidth >= 768) setShowFilters(true); };
        handleInitialSetShowFilters();
        const handleResize = () => { if (window.innerWidth >= 768) setShowFilters(true); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadMyApplications = useCallback(async () => { 
        if (profile?.id && isApplicant) {
            const { data, error: appError } = await fetchMyAppliedPostingIds(profile.id);
            if (appError) toast.error("Kunde inte ladda din ansökningshistorik.");
            else if (data) setAppliedPostingIds(new Set(data));
        } else {
            setAppliedPostingIds(new Set());
        }
    }, [profile?.id, isApplicant]);

    const loadPostings = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error: fetchErrorMsg } = await fetchAvailablePostings({
                p_required_role: filters.role as UserRole | null || null,
                p_search_query: filters.search.trim() || null,
                p_location_query: filters.location.trim() || null,
                p_date_from: filters.dateFrom || null,
                p_date_to: filters.dateTo || null,
                p_experience_keywords: filters.experience.split(',').map(s => s.trim()).filter(Boolean),
            });
            if (fetchErrorMsg) throw new Error(String(fetchErrorMsg));
            setPostings(data || []);
            if (profile?.id && isApplicant) await loadMyApplications(); // Ensure applied status is fresh
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Misslyckades med att ladda tjänster');
            setPostings([]);
        } finally { setLoading(false); }
    }, [filters, profile?.id, isApplicant, loadMyApplications]);
   const [loadingMyPostings, setLoadingMyPostings] = useState(true);

  useEffect(() => {
        if (activeTab === 'myPostings') {
            setLoadingMyPostings(true);
            fetchMyAcceptedPostings()
                .then(({ data }) => {
                    setMyAcceptedPostings(data || []);
                })
                .finally(() => setLoadingMyPostings(false));
        }
    }, [activeTab]);

    useEffect(() => { 
        if (!authLoading) { // Only load if auth is settled
            if (activeTab === 'available') {
                loadPostings();
            } else if (activeTab === 'myApplications' && isApplicant && profile?.id) { // Ensure profile.id for myApplications
                loadMyApplications();
            }
        }
    }, [authLoading, activeTab, loadPostings, isApplicant, loadMyApplications, profile?.id]);

    useEffect(() => { 
        const handleInserts = (payload: any) => {
            console.log('New posting or application change received', payload);
            if (activeTab === 'available') loadPostings();
            if (isApplicant) loadMyApplications(); // Refresh applied IDs for all tabs if relevant
        };

        const postingsChannel = supabase.channel('custom-job-postings-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_postings' }, handleInserts)
            .subscribe();
            
        let applicationsChannel: any;
        if (profile?.id && isApplicant) {
            applicationsChannel = supabase.channel(`custom-job-posting-applications-channel-${profile.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'job_posting_applications', filter: `applicant_id=eq.${profile.id}` }, handleInserts)
                .subscribe();
        }

        return () => {
            supabase.removeChannel(postingsChannel).catch(console.error);
            if (applicationsChannel) supabase.removeChannel(applicationsChannel).catch(console.error);
        };
    }, [activeTab, loadPostings, loadMyApplications, profile?.id, isApplicant]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleClearFilters = () => setFilters({ search: '', location: '', role: '', dateFrom: '', dateTo: '', experience: '' });
    const handleViewDetails = (postingId: string) => setSelectedPostingDetails(postings.find(p => p.id === postingId) || null);
    const handleClosePostingDetailsModal = () => setSelectedPostingDetails(null);

    const handleApplyAttempt = (postingId: string, postingRequiredRole: UserRole) => {
        if (!profile || !isApplicant) {
            toast.error("Vänligen logga in som sökande för att ansöka."); return;
        }
        const eligibility = canApplyForPosting(profile, postingRequiredRole);
        if (!eligibility.canApply) {
            toast.error(eligibility.reason || "Du kan inte söka denna tjänst för närvarande.", { duration: 5000 });
            return;
        }
      if (selectedPostingDetails) { // Check if selectedPostingDetails state exists and is non-null
             setSelectedPostingDetails(null);
        }
        setPostingToApplyId(postingId);
        setShowJobPostingApplicationModal(true);
    };

    const handleJobPostingApplicationSuccess = () => { 
        setShowJobPostingApplicationModal(false);
        const justAppliedPostingId = postingToApplyId;
        if (justAppliedPostingId) setAppliedPostingIds(prevIds => new Set(prevIds).add(justAppliedPostingId));
        setPostingToApplyId(null);
        if (activeTab === 'myApplications') loadMyApplications(); // Refresh only if on that tab
        handleClosePostingDetailsModal(); // Close details modal if open
    };
    const handleOpenEmployerProfileModal = (employerId: string) => { 
        if (employerId) setSelectedEmployerIdForProfileView(employerId);
        else toast.error("Arbetsgivarinformation saknas.");
    };
    const handleCloseEmployerProfileModal = () => setSelectedEmployerIdForProfileView(null);

    const handleAdminOpenEditModal = (postingToEdit: JobPosting) => { 
        setEditingPosting(postingToEdit); setShowEditModal(true); setSelectedPostingDetails(null); 
    };
    const handleAdminCloseEditModal = () => { 
        setEditingPosting(null); setShowEditModal(false); 
    };
    const handleAdminPerformUpdate = async (postingId: string, updateData: PostingUpdateData) => { 
        const result = await adminUpdatePosting(postingId, updateData);
        if (result.success) {
            toast.success('Jobbannons uppdaterad av admin!');
            loadPostings(); 
            handleAdminCloseEditModal(); 
        } else {
            toast.error(`Adminuppdatering misslyckades: ${result.error || 'Okänt fel'}`);
        }
        return result; 
    };
    const handleAdminDeletePosting = async (postingId: string) => { 
        if (!window.confirm("Är du säker på att du (admin) vill ta bort denna jobbannons permanent?")) return;
        const toastId = toast.loading("Tar bort annons (admin)...");
        const { success, error } = await adminDeletePosting(postingId);
        if (success) {
            toast.success("Jobbannons borttagen av admin!", { id: toastId });
            loadPostings(); 
            setSelectedPostingDetails(null); 
        } else {
            toast.error(`Borttagning misslyckades (admin): ${error || 'Okänt fel'}`, { id: toastId });
        }
    };

    if (authLoading) { // Simplified initial loading check
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tillgängliga uppdrag {isAdmin && "(Adminvy)"}</h1>
                <div className="flex items-center gap-3">
                    {profile && isApplicant && (
                        <div className={`p-2 rounded-md text-sm flex items-center ${profile.license_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
                            {profile.license_verified ? <ShieldCheck className="h-5 w-5 mr-1.5" /> : <AlertTriangle className="h-5 w-5 mr-1.5" />}
                            Kontostatus: {profile.license_verified ? 'Verifierad' : 'Ej Verifierad'}
                        </div>
                    )}
                    <button onClick={activeTab === 'available' ? loadPostings : loadMyApplications} disabled={loading} className="btn btn-secondary btn-sm">
                        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Uppdatera
                    </button>
                </div>
            </div>

           {/* 2. Add the toggle component here */}
        {isApplicant && (
          <div className="mb-6">
            <NotificationToggle />
          </div>
        )}

           <VerificationInfoBox profile={profile} />
            
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Job Postings Tabs">
                    <button onClick={() => setActiveTab('available')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${activeTab === 'available' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Tillgängliga tjänster</button>
                    {isApplicant && (<button onClick={() => setActiveTab('myApplications')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${activeTab === 'myApplications' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Mina Ansökningar</button>)}

                  {/* NEW TAB BUTTON */}
                    <button onClick={() => setActiveTab('myPostings')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${activeTab === 'myPostings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Mina Uppdrag
                    </button>
                </nav>
            </div>
          

            {activeTab === 'available' && (
                <>
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-semibold text-gray-800">Filtrera tjänster</h2>
                            <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1 text-sm" aria-expanded={showFilters} aria-controls="filters-content">
                                {showFilters ? (<> Dölj Filter <ChevronUp className="ml-1 h-4 w-4" /> </>) : (<> Visa Filter <ChevronDown className="ml-1 h-4 w-4" /> </>)}
                            </button>
                        </div>
                        <div id="filters-content" className={`${showFilters ? 'block' : 'hidden'} md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-4`}>
                            <div><label htmlFor="search" className="label-form">Sök</label><div className="relative"><Search className="icon-form" /><input type="text" id="search" name="search" className="input-form pl-10" placeholder="Titel, beskrivning..." value={filters.search} onChange={handleFilterChange} /></div></div>
                            <div><label htmlFor="location" className="label-form">Plats</label><div className="relative"><MapPin className="icon-form" /><input type="text" id="location" name="location" className="input-form pl-10" placeholder="Stad, område..." value={filters.location} onChange={handleFilterChange} /></div></div>
                            <div><label htmlFor="role" className="label-form">Roll</label><div className="relative"><select id="role" name="role" className="input-form bg-white pl-3 pr-10" value={filters.role} onChange={handleFilterChange}><option value="">Alla Roller</option><option value="pharmacist">Farmaceut</option><option value="egenvårdsrådgivare">Egenvårdsrådgivare</option><option value="säljare">Säljare</option></select></div></div>
                            <div><label htmlFor="dateFrom" className="label-form">Period Från</label><div className="relative"><CalendarDays className="icon-form" /><input type="date" id="dateFrom" name="dateFrom" className="input-form pl-10" value={filters.dateFrom} onChange={handleFilterChange} /></div></div>
                            <div><label htmlFor="dateTo" className="label-form">Period Till</label><div className="relative"><CalendarDays className="icon-form" /><input type="date" id="dateTo" name="dateTo" className="input-form pl-10" value={filters.dateTo} min={filters.dateFrom} onChange={handleFilterChange} /></div></div>
                            <div><label htmlFor="experience" className="label-form">Erfarenhet (komma-separerat)</label><div className="relative"><ListChecks className="icon-form" /><input type="text" id="experience" name="experience" className="input-form pl-10" placeholder="t.ex., Apodos, Retail" value={filters.experience} onChange={handleFilterChange} /></div></div>
                            <div className="md:col-span-full flex justify-end pt-2"><button onClick={handleClearFilters} className="btn btn-secondary px-4 py-2"><XCircle className="h-5 w-5 mr-2" /> Rensa Filter</button></div>
                        </div>
                    </div>

                    {loading && postings.length === 0 ? ( 
                         <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /><p className="ml-3 text-gray-600">Laddar tjänster...</p></div>
                    ) : postings.length === 0 ? ( 
                        <div className="text-center py-6 sm:py-10 text-gray-500 bg-gray-50 p-3 sm:p-4 rounded-md border">Inga tjänster hittades som matchar dina filter.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {postings.map(posting => {
                                // Determine eligibility for each card
                                const eligibilityInfo = canApplyForPosting(profile, posting.required_role);
                                return (
                                    <PostingCard
                                        key={posting.id}
                                        posting={posting}
                                        currentUserRole={currentUserRole}
                                        onViewDetails={() => handleViewDetails(posting.id)}
                                        onViewEmployerProfile={handleOpenEmployerProfileModal}
                                        onApply={isApplicant && posting.status === 'open' ? () => handleApplyAttempt(posting.id, posting.required_role) : undefined}
                                        hasApplied={appliedPostingIds.has(posting.id)}
                                        onAdminEdit={isAdmin ? handleAdminOpenEditModal : undefined}
                                        onAdminDelete={isAdmin ? handleAdminDeletePosting : undefined}
                                        // Pass eligibility info to PostingCard
                                        canApplyInfo={eligibilityInfo}
                                        profileVerified={profile?.license_verified === true} // Direct pass of verification
                                    />
                                );
                            })}
                        </div>
                    )}
                </>
            )}

        {activeTab === 'myPostings' && (
    <div className="space-y-8">
        {loadingMyPostings ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="ml-3 text-gray-600">Laddar dina uppdrag...</p>
            </div>
        ) : (
            <>
                {/* Section for Upcoming Postings */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 pb-3 border-b border-gray-200 mb-4">
                        Kommande uppdrag ({upcomingPostings.length})
                    </h2>
                    {upcomingPostings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {upcomingPostings.map(posting => {
                                const eligibilityInfo = canApplyForPosting(profile, posting.required_role);
                                return (
                                    <PostingCard
                                        key={posting.id}
                                        posting={posting}
                                        currentUserRole={currentUserRole}
                                        onViewDetails={() => handleMyPostingViewDetails(posting.id)}
                                        onViewEmployerProfile={handleOpenEmployerProfileModal}
                                        onApply={undefined}
                                        hasApplied={true}
                                        onAdminEdit={isAdmin ? handleAdminOpenEditModal : undefined}
                                        onAdminDelete={isAdmin ? handleAdminDeletePosting : undefined}
                                        canApplyInfo={eligibilityInfo}
                                        profileVerified={profile?.license_verified === true}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 p-4 rounded-md border">
                            Du har inga kommande uppdrag.
                        </div>
                    )}
                </div>

                {/* Section for Completed Postings */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 pb-3 border-b border-gray-200 mb-4">
                        Avslutade uppdrag ({completedPostings.length})
                    </h2>
                    {completedPostings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {completedPostings.map(posting => {
                                const eligibilityInfo = canApplyForPosting(profile, posting.required_role);
                                return (
                                    <PostingCard
                                        key={posting.id}
                                        posting={posting}
                                        currentUserRole={currentUserRole}
                                        onViewDetails={() => handleMyPostingViewDetails(posting.id)}
                                        onViewEmployerProfile={handleOpenEmployerProfileModal}
                                        onApply={undefined}
                                        hasApplied={true}
                                        onAdminEdit={isAdmin ? handleAdminOpenEditModal : undefined}
                                        onAdminDelete={isAdmin ? handleAdminDeletePosting : undefined}
                                        canApplyInfo={eligibilityInfo}
                                        profileVerified={profile?.license_verified === true}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                         <div className="text-center py-6 text-gray-500 bg-gray-50 p-4 rounded-md border">
                            Du har inga slutförda uppdrag än.
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
)}
            

            {activeTab === 'myApplications' && isApplicant && ( <MyJobApplicationsView /> )}

            {selectedPostingDetails && (
                <PostingDetailsModal
                    posting={selectedPostingDetails}
                    currentUserRole={currentUserRole}
                    canApplyInfo={canApplyForPosting(profile, selectedPostingDetails.required_role)} // Pass eligibility
                    profileVerified={profile?.license_verified === true}
                    onClose={handleClosePostingDetailsModal}
                    onViewEmployerProfile={handleOpenEmployerProfileModal}
                    onApply={ isApplicant && selectedPostingDetails.status === 'open' ? () => handleApplyAttempt(selectedPostingDetails.id, selectedPostingDetails.required_role) : undefined }
                    hasApplied={selectedPostingDetails ? appliedPostingIds.has(selectedPostingDetails.id) : false}
                    onAdminEdit={isAdmin ? handleAdminOpenEditModal : undefined}
                    onAdminDelete={isAdmin ? handleAdminDeletePosting : undefined}
                    onUpdate={loadPostings}
                />
            )}

            {showEditModal && editingPosting && ( 
                <EditPostingModal posting={editingPosting} onClose={handleAdminCloseEditModal} onSuccess={() => { handleAdminCloseEditModal(); loadPostings(); }} onSave={handleAdminPerformUpdate} currentUserRole={currentUserRole}/>
            )}
            {showJobPostingApplicationModal && postingToApplyId && ( 
                <JobPostingApplicationModal postingId={postingToApplyId} postingTitle={postings.find(p => p.id === postingToApplyId)?.title || 'Jobbannons'} onClose={() => setShowJobPostingApplicationModal(false)} onSuccess={handleJobPostingApplicationSuccess} />
            )}
            {selectedEmployerIdForProfileView && ( 
                 <EmployerProfileViewModal isOpen={!!selectedEmployerIdForProfileView} onClose={handleCloseEmployerProfileModal} employerId={selectedEmployerIdForProfileView} />
            )}
            <style jsx global>{`
                .label-form { @apply block text-xs font-medium text-gray-600 mb-1; }
                .icon-form { @apply absolute inset-y-0 left-3 h-full w-5 text-gray-400 flex items-center justify-center pointer-events-none; }
                .input-form { @apply w-full rounded-md border-gray-300 shadow-sm px-3 py-2.5 focus:ring-blue-500 focus:border-blue-500 text-sm; }
                .btn { display: inline-flex; align-items: center; justify-center; padding: 0.5rem 1rem; border-width: 1px; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition-colors: background-color 0.15s ease-in-out; }
                .btn:focus { outline: 2px solid transparent; outline-offset: 2px; ring: 2px; ring-offset: 2px; }
                .btn:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-secondary { border-color: #D1D5DB; color: #374151; background-color: white; } .btn-secondary:hover { background-color: #F9FAFB; } .btn-secondary:focus { ring-color: #4F46E5; }
                .btn-secondary.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.7rem; line-height: 1rem; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
            `}</style>
        </div>
    );
}

export default AvailablePostingsPage;