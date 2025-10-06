import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
// Import BOTH the original function for employers and the new one for employees
import { fetchEmployeeProfilesForEmployer, fetchAllEmployeeProfiles } from '../lib/profiles'; 
import type { UserRole, EmployeeProfileData, EmployeeProfileFilters, RelationshipType } from '../types';
import { toast } from 'react-hot-toast';
import {
    Loader2, Search, Filter, User, Mail, Briefcase, CheckSquare, Square, Users, UserPlus, RefreshCw, X, Image as ImageIcon,
    Info, Settings, Award, Eye, MessageCircle, Link2
} from 'lucide-react';
import { EmployeeProfileDetailsModal } from '../components/Profile/EmployeeProfileDetailsModal';
import { MessageButton } from '../components/Messages/MessageButton';
import { supabase } from '../lib/supabase';
import { MinimalReviewDisplay } from '../components/Profile/MinimalReviewDisplay';
import { AddEmployeeModal } from '../components/employer/AddEmployeeModal';

// ProfileCard component is restored from your original code
const roleDisplayMap: Record<string, string> = {
    pharmacist: 'Farmaceut',
    säljare: 'Säljare',
    egenvårdsrådgivare: 'Egenvårdsrådgivare'
};
interface ProfileCardProps {
    profile: EmployeeProfileData;
    onViewDetails: (profile: EmployeeProfileData) => void;
    isEmployerView: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onViewDetails, isEmployerView }) => {
 let displayRole = roleDisplayMap[profile.role as string] || (profile.role as string);
    // If the role is pharmacist and a specific type exists, use that instead.
    if (profile.role === 'pharmacist' && profile.pharmacist_type) {
        displayRole = profile.pharmacist_type;
    }
    return (
        <div onClick={() => onViewDetails(profile)} className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-500 transition-all duration-200 flex flex-col h-full cursor-pointer">
            <div className="flex flex-col items-center text-center mb-4">
                <div className="relative mb-3">
                    <img src={profile.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'N A')}&background=random&color=fff`} onError={(e) => { (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'N A')}&background=random&color=fff`); }} alt={profile.full_name || 'Profile'} className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg" loading="lazy" />
                    {profile.license_verified && (<div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" title="Verifierad"><CheckSquare className="h-5 w-5 text-green-600" /></div>)}
                </div>
               <h3 className="text-lg font-semibold text-gray-800 truncate w-full">{profile.full_name}</h3>
<div className="flex items-center justify-center gap-2 mt-1">
    <p className="text-sm text-blue-600 font-medium">{displayRole}</p>
    {/* The review component is only rendered if it's an employer's view */}
    {isEmployerView && <MinimalReviewDisplay employeeId={profile.id} />}
</div>
                <p className="text-sm text-blue-600 font-medium">{displayRole}</p>            
            </div>
            <p className="text-sm text-gray-600 line-clamp-3 flex-grow mb-4">{profile.description || <span className="italic text-gray-400">Ingen beskrivning tillgänglig.</span>}</p>
            {(profile.systems && profile.systems.length > 0) && (
                <div className="mb-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Systemkännedom</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {profile.systems.slice(0, 3).map((sys, i) => (<span key={`sys-${i}`} className="tag-style">{sys}</span>))}
                        {profile.systems.length > 3 && (<span className="tag-style">+{profile.systems.length - 3} mer</span>)}
                    </div>
                </div>
            )}
            <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center">
                {isEmployerView ? (<span className={`text-xs font-medium px-2 py-0.5 rounded-full ${profile.has_worked_for_employer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{profile.has_worked_for_employer ? 'Jobbat här' : 'Inga tidigare pass'}</span>) : <div />}
                <MessageButton recipientId={profile.id} recipientRole={profile.role as UserRole} size="xs" />
            </div>
        </div>
    );
};


const EmployeeProfilesPage: React.FC = () => {
    // Restore user from useAuth
    const { profile: currentUserProfile, user, loading: authLoading } = useAuth();
    const isEmployerView = currentUserProfile?.role === 'employer' || currentUserProfile?.role === 'admin';

    const [profiles, setProfiles] = useState<EmployeeProfileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfileForDetails, setSelectedProfileForDetails] = useState<EmployeeProfileData | null>(null);

    const [filters, setFilters] = useState<EmployeeProfileFilters>({ searchTerm: '', role: '', workedForEmployer: false, relationshipType: '' });
    const [experienceInput, setExperienceInput] = useState<string>('');
    const [systemsInput, setSystemsInput] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'myEmployees'>('search');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<EmployeeProfileData | null>(null); // Use a more descriptive name


    useEffect(() => {
        if (window.innerWidth >= 768) setShowFilters(true);
    }, []);

    const loadProfiles = useCallback(async () => {
    if (authLoading || !currentUserProfile) {
        return;
    }
    setLoading(true);
    setError(null);

    let result;

    if (isEmployerView) {
        // --- THIS IS THE CORRECTED LOGIC ---
        // First, check which tab is active for the employer.
        if (activeTab === 'myEmployees') {
            // On the "My Employees" tab, fetch only their linked employees.
            // No complex filters are needed here.
            const { data, error: rpcError } = await supabase.rpc('get_employer_employees', {
                p_employer_id: currentUserProfile.id
            });
            result = { data, error: rpcError?.message };
        } else {
            // On the "Search" tab, use the original, full-featured search function with all filters.
            const parseInputToArray = (input: string): string[] | undefined => {
                const arr = input.split(',').map(s => s.trim()).filter(s => s !== '');
                return arr.length > 0 ? arr : undefined;
            };
            const filtersToPass: EmployeeProfileFilters = {
                ...filters,
                minExperience: parseInputToArray(experienceInput),
                systems: parseInputToArray(systemsInput)
            };
            result = await fetchEmployeeProfilesForEmployer(filtersToPass);
        }
    } else {
        // For non-employer users, the logic remains the same.
        const parseInputToArray = (input: string): string[] | undefined => {
            const arr = input.split(',').map(s => s.trim()).filter(s => s !== '');
            return arr.length > 0 ? arr : undefined;
        };
        const filtersToPass: EmployeeProfileFilters = {
            ...filters,
            minExperience: parseInputToArray(experienceInput),
            systems: parseInputToArray(systemsInput)
        };
        result = await fetchAllEmployeeProfiles(filtersToPass);
    }
    // --- END OF CORRECTION ---

    if (result.error) {
        setError(result.error);
        setProfiles([]);
        toast.error(`Kunde inte ladda profiler: ${result.error}`);
    } else {
        setProfiles(result.data || []);
    }
    setLoading(false);
}, [
    activeTab, // The function now correctly depends on the active tab
    filters,
    experienceInput,
    systemsInput,
    currentUserProfile,
    authLoading,
    isEmployerView
]);

  useEffect(() => {
    if (currentUserProfile) {
        loadProfiles();
    }
}, [loadProfiles, currentUserProfile]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'systemsInput') setSystemsInput(value);
        else if (name === 'experienceInput') setExperienceInput(value);
        else if (type === 'checkbox') { const { checked } = e.target as HTMLInputElement; setFilters(prev => ({ ...prev, [name]: checked })); }
        else {
            setFilters(prev => ({ ...prev, [name]: value as EmployeeProfileFilters[keyof EmployeeProfileFilters] }));
        }
    };

    const resetFilters = () => {
        setFilters({ searchTerm: '', role: '', workedForEmployer: false, relationshipType: '' });
        setSystemsInput('');
        setExperienceInput('');
    };
    
    const handleViewDetails = (profile: EmployeeProfileData) => setSelectedProfileForDetails(profile);
    const handleCloseDetailsModal = () => setSelectedProfileForDetails(null);

    if (authLoading) {
        return <div className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" /></div>;
    }

    // Restore original access check
    if (!currentUserProfile) {
        return <div className="p-6 text-center text-red-600 bg-red-50 rounded">Du måste vara inloggad för att se denna sida.</div>;
    }
    
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">{isEmployerView ? 'Personalprofiler' : 'Nätverket'}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary text-sm" aria-expanded={showFilters}><Filter className="h-4 w-4 mr-1" />{showFilters ? 'Dölj filter' : 'Visa filter'}</button>
                    <button onClick={loadProfiles} disabled={loading} className="btn btn-secondary text-sm" aria-label="Uppdatera"><RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Uppdatera</button>
                </div>
              {isEmployerView && (
   <div className="p-1.5 bg-gray-100 rounded-lg flex space-x-2">
    <button onClick={() => setActiveTab('search')} className={`tab-button ${activeTab === 'search' ? 'tab-active' : 'tab-inactive'}`}>
        <Search className="h-5 w-5 mr-2" /> Sök Personal
    </button>
    <button onClick={() => setActiveTab('myEmployees')} className={`tab-button ${activeTab === 'myEmployees' ? 'tab-active' : 'tab-inactive'}`}>
        <Users className="h-5 w-5 mr-2" /> Mina Anställda
    </button>
</div>
)}
            </div>

            {activeTab === 'myEmployees' && isEmployerView && (
    <div className="flex justify-end">
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            <UserPlus className="h-4 w-4 mr-2" /> Lägg till ny anställd
        </button>
    </div>
)}

{/* Conditionally render the filter UI ONLY on the 'search' tab */}
{activeTab === 'search' && showFilters && (
    <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
            {/* Search Term Input */}
            <div><label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">Sök</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" id="searchTerm" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Namn, e-post..." className="pl-10 w-full input-style" /></div></div>
            {/* Role Dropdown */}
            <div><label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Roll</label><select id="role" name="role" value={filters.role} onChange={handleFilterChange} className="w-full input-style bg-white"><option value="">Alla roller</option><option value="pharmacist">Farmaceut</option><option value="säljare">Säljare</option><option value="egenvårdsrådgivare">Egenvårdsrådgivare</option></select></div>

            {/* "Mina anställda" dropdown is now REMOVED */}

            {/* "Har jobbat här" Checkbox */}
            {isEmployerView && (
                <div className="flex items-center pt-6"><input type="checkbox" id="workedForEmployer" name="workedForEmployer" checked={filters.workedForEmployer} onChange={handleFilterChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" /><label htmlFor="workedForEmployer" className="text-sm font-medium text-gray-700">Har jobbat här</label></div>
            )}
            {/* Experience Input */}
            <div><label htmlFor="experienceInput" className="block text-sm font-medium text-gray-700 mb-1">Erfarenhet</label><div className="relative"><Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" id="experienceInput" name="experienceInput" value={experienceInput} onChange={handleFilterChange} placeholder="Kompetens..." title="Komma-separerad" className="pl-10 w-full input-style" /></div></div>
            {/* Systems Input */}
            <div><label htmlFor="systemsInput" className="block text-sm font-medium text-gray-700 mb-1">System</label><div className="relative"><Settings className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" id="systemsInput" name="systemsInput" value={systemsInput} onChange={handleFilterChange} placeholder="Apodos..." title="Komma-separerad" className="pl-10 w-full input-style" /></div></div>
            {/* Reset Button */}
            <div className="self-end"><button onClick={resetFilters} className="btn btn-secondary w-full text-sm"><X className="h-4 w-4 mr-1"/>Rensa</button></div>
        </div>
    </div>
)}

            <div>
                {loading ? (<div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" /></div>
                ) : error ? (<div className="p-4 text-red-600 bg-red-50 rounded">{error}</div>
                ) : profiles.length === 0 ? (<div className="p-6 text-center text-gray-500 bg-gray-50 rounded">Inga profiler matchar de nuvarande filtren.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {profiles.map((profile) => (
                            <ProfileCard key={profile.id} profile={profile} onViewDetails={handleViewDetails} isEmployerView={isEmployerView} />
                        ))}
                    </div>
                )}
            </div>

            {selectedProfileForDetails && <EmployeeProfileDetailsModal profile={selectedProfileForDetails} onClose={handleCloseDetailsModal} />}
          <AddEmployeeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onEmployeeAdded={loadProfiles} />


            <style jsx>{`
                .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
                .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
                .tab-button { @apply flex-1 flex items-center justify-center py-2 px-4 rounded-md font-medium text-sm transition-colors duration-200 ease-in-out; }
                .tab-active { @apply bg-white text-primary-600 shadow-sm; }
                .tab-inactive { @apply text-gray-500 hover:bg-gray-200 hover:text-gray-700; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-xs { @apply px-2.5 py-1.5 text-xs; }
                .tag-style { @apply inline-block bg-gray-100 text-gray-700 text-xs font-medium mr-1 mb-1 px-2 py-0.5 rounded-full; }
            `}</style>
        </div>
    );
};

export default EmployeeProfilesPage;