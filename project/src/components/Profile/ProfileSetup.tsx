// src/components/Profile/ProfileSetup.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types';
import { toast } from 'react-hot-toast';
import {
    Loader2, Save, Building, UserCircle, Mail, Phone,
    Briefcase, UploadCloud, FileText, Plus, Trash2, Edit3, X,
    ClockIcon, CheckCircle, AlertTriangle, AlertCircle
} from 'lucide-react';
import { ProfilePicture } from './ProfilePicture';
import { MyReviews } from './MyReviews';
import { SearchableCityDropdown } from '../UI/SearchableCityDropdown';

const swedishCities = [
  "Alingsås", "Arboga", "Arvika", "Askersund", "Avesta", "Boden", "Bollnäs", "Borgholm", "Borlänge", "Borås", "Båstad", "Eksjö", "Enköping", "Eskilstuna", "Eslöv", "Fagersta", "Falkenberg", "Falköping", "Falsterbo", "Falun", "Filipstad", "Flen", "Gränna", "Gävle", "Göteborg", "Hagfors", "Halmstad", "Haparanda", "Hedemora", "Helsingborg", "Hjo", "Hudiksvall", "Huskvarna", "Härnösand", "Hässleholm", "Höganäs", "Jönköping", "Kalmar", "Karlshamn", "Karlskoga", "Karlskrona", "Karlstad", "Katrineholm", "Kiruna", "Kramfors", "Kristianstad", "Kristinehamn", "Kumla", "Kungsbacka", "Kungälv", "Köping", "Laholm", "Landskrona", "Lidköping", "Lindesberg", "Linköping", "Ljungby", "Ludvika", "Luleå", "Lund", "Lycksele", "Lysekil", "Malmö", "Mariefred", "Mariestad", "Marstrand", "Mjölby", "Motala", "Mölndal", "Nora", "Norrköping", "Norrtälje", "Nybro", "Nyköping", "Nynäshamn", "Nässjö", "Oskarshamn", "Oxelösund", "Piteå", "Ronneby", "Sala", "Sandviken", "Sigtuna", "Simrishamn", "Skara", "Skellefteå", "Skänninge", "Skövde", "Sollefteå", "Stockholm", "Strängnäs", "Strömstad", "Sundsvall", "Säffle", "Säter", "Sävsjö", "Söderhamn", "Söderköping", "Södertälje", "Sölvesborg", "Tidaholm", "Torshälla", "Tranås", "Trelleborg", "Trollhättan", "Trosa", "Uddevalla", "Ulricehamn", "Umeå", "Uppsala", "Vadstena", "Varberg", "Vetlanda", "Vimmerby", "Visby", "Vänersborg", "Värnamo", "Västervik", "Västerås", "Växjö", "Ystad", "Åhus", "Åmål", "Ängelholm", "Örebro", "Öregrund", "Örnsköldsvik", "Östersund", "Östhammar"
].sort(); // Sort alphabetically for easier selection


// --- Interfaces ---
interface WorkHistoryEntry {
    id: string;
    company: string;
    title: string;
    start_date: string;
    end_date: string;
}

interface OperatingHourLine {
    id?: string;
    tempId?: string;
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
}

const DAYS_OF_WEEK = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

const initialOperatingHours = (): OperatingHourLine[] =>
    DAYS_OF_WEEK.map((_, index) => ({
        tempId: `temp-${index}-${Date.now()}`,
        day_of_week: index,
        open_time: '09:00',
        close_time: '17:00',
        is_closed: index >= 5,
    }));

export const ProfileSetup: React.FC = () => {
    // --- Hooks and State ---
    const { user, profile: currentProfile, loading: authLoading, fetchProfile } = useAuth();
    const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
    const [operatingHours, setOperatingHours] = useState<OperatingHourLine[]>(initialOperatingHours());
    const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState<'cv' | 'license' | null>(null);
    const [activeTab, setActiveTab] = useState('details');
    const [systemInput, setSystemInput] = useState(''); // New state for the system input field
    const [isEditing, setIsEditing] = useState(false);

    // --- Role-based Flags ---
    const isEmployer = currentProfile?.role === 'employer';
    const isEmployee = ['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(currentProfile?.role as string);
    const isPharmacist = currentProfile?.role === 'pharmacist';

    // --- Data Fetching and State Initialization ---
    const initializeState = useCallback((profileToSet: UserProfile) => {
        if (!user) return;
        setLoading(true);
        setError(null);

        setProfileData({
            ...profileToSet,
            // Note: We no longer use the 'experience' field in the UI, but we keep it in state
            // to avoid data loss if it exists, until it's fully deprecated.
            experience: profileToSet.experience || [],
            systems: profileToSet.systems || [],
        });

        if (isEmployee) {
            const initialWorkHistory = (profileToSet.work_history || []).map((entry: any, index: number) => ({
                ...entry,
                id: `existing-${index}`
            }));
            setWorkHistory(initialWorkHistory);
        }

        if (profileToSet.role === 'employer') {
            supabase.from('pharmacy_operating_hours').select('*').eq('employer_id', user.id).order('day_of_week')
                .then(({ data, error }) => {
                    if (error) {
                        toast.error("Kunde inte ladda öppettider.");
                    } else if (data && data.length > 0) {
                        const fetchedHours = DAYS_OF_WEEK.map((_, index) => {
                            const dbHour = data.find(h => h.day_of_week === index);
                            return {
                                id: dbHour?.id,
                                tempId: dbHour ? undefined : `new-${index}`,
                                day_of_week: index,
                                open_time: dbHour?.open_time?.slice(0, 5) || '09:00',
                                close_time: dbHour?.close_time?.slice(0, 5) || '17:00',
                                is_closed: dbHour?.is_closed ?? (index >= 5),
                            };
                        });
                        setOperatingHours(fetchedHours);
                    } else {
                        setOperatingHours(initialOperatingHours());
                    }
                });
        }
        setLoading(false);
    }, [user, isEmployee]);


    useEffect(() => {
        if (currentProfile) {
            initializeState(currentProfile);
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [currentProfile, authLoading, initializeState]);

    // --- Event Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setProfileData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === "systems") { // Removed 'experience' from this logic
            setProfileData(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()).filter(Boolean) }));
        } else {
            setProfileData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleWorkHistoryChange = (index: number, field: keyof Omit<WorkHistoryEntry, 'id'>, value: string) => {
        const n = [...workHistory]; n[index][field] = value; setWorkHistory(n);
    };
    const addWorkExperience = () => setWorkHistory([...workHistory, { id: `new-${Date.now()}`, company: '', title: '', start_date: '', end_date: '' }]);
    const removeWorkExperience = (id: string) => setWorkHistory(workHistory.filter(e => e.id !== id));
    const handleOperatingHoursChange = (index: number, field: keyof OperatingHourLine, value: string | boolean) => setOperatingHours(prev => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'cv' | 'license') => {
        if (!event.target.files?.[0] || !user) return;
        const file = event.target.files[0];
        const bucket = type === 'cv' ? 'resumes' : 'license-documents';
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${type}_${Date.now()}.${fileExt}`;
        setUploading(type);
        const toastId = toast.loading(`Laddar upp ${type === 'cv' ? 'CV' : 'licens'}...`);
        try {
            await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
            const updateField = type === 'cv' ? { resume_url: filePath } : { license_document: filePath, license_verified: false };
            await supabase.from('profiles').update(updateField).eq('id', user.id);
            if (fetchProfile) await fetchProfile(user.id);
            toast.success(`${type === 'cv' ? 'CV' : 'Licens'} uppladdad!`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        } finally {
            setUploading(null);
            event.target.value = '';
        }
    };
  const handleAddSystem = () => {
        if (systemInput && !profileData.systems?.includes(systemInput.trim())) {
            const updatedSystems = [...(profileData.systems || []), systemInput.trim()];
            setProfileData(prev => ({ ...prev, systems: updatedSystems }));
        }
        setSystemInput(''); // Clear input after adding
    };

    const handleRemoveSystem = (systemToRemove: string) => {
        const updatedSystems = profileData.systems?.filter(s => s !== systemToRemove) || [];
        setProfileData(prev => ({ ...prev, systems: updatedSystems }));
    };

    const handleSystemInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            handleAddSystem();
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        setError(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, email, role, created_at, updated_at, ...updateData } = profileData;
            const finalPayload: Partial<UserProfile> = { ...updateData, updated_at: new Date().toISOString() };
            if (isEmployee) {
                finalPayload.work_history = workHistory.map(({ id, ...rest }) => rest) as any;
            }
            const { error: profileError } = await supabase.from('profiles').update(finalPayload).eq('id', user.id);
            if (profileError) throw profileError;
            if (isEmployer) {
                const hoursToUpsert = operatingHours.map(h => ({
                    ...(h.id && { id: h.id }),
                    employer_id: user.id,
                    day_of_week: h.day_of_week,
                    open_time: h.is_closed ? null : `${h.open_time}:00`,
                    close_time: h.is_closed ? null : `${h.close_time}:00`,
                    is_closed: h.is_closed,
                }));
                const { error: hoursError } = await supabase.from('pharmacy_operating_hours').upsert(hoursToUpsert, { onConflict: 'employer_id,day_of_week' });
                if (hoursError) throw hoursError;
            }
            toast.success("Profilen har sparats!");
            if (fetchProfile) await fetchProfile(user.id);
          setIsEditing(false); // This will switch the view back to the display state

        } catch (e: any) {
            const message = e.message || "Ett fel uppstod.";
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };


    // --- Render Logic ---
    if (loading || authLoading) return <div className="flex justify-center p-10"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
    if (!user || !currentProfile) return (
        <div className="text-center p-8 bg-white shadow-md rounded-lg max-w-md mx-auto mt-10">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Ej Autentiserad</h3>
            <p className="mt-1 text-sm text-gray-600">Vänligen logga in för att se och redigera din profil.</p>
        </div>
    );

    const descriptionLabel = isEmployer ? "Beskrivning" : "Om mig";
    const descriptionPlaceholder = isEmployer ? "Berätta lite om ditt apotek/organisation..." : "Beskriv kort din expertis, dina ambitioner och vad som gör dig till en värdefull medarbetare...";

    const getPublicUrl = (path: string | null | undefined, bucket: string) => {
        if (!path) return '#';
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    };

    // --- MAIN RETURN ---
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
            <form onSubmit={handleSaveProfile} className="space-y-6">

                {/* ================================================================== */}
                {/* EMPLOYER VIEW - THIS BLOCK IS IDENTICAL TO YOUR ORIGINAL CODE     */}
                {/* ================================================================== */}
                {isEmployer && (
                    <div className="bg-white shadow-xl rounded-lg p-4 sm:p-6 md:p-8">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 border-b pb-3 sm:pb-4">
                            Redigera Profil (Arbetsgivare)
                        </h1>
                        {error && (
                            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-100 text-red-700 border border-red-300 rounded-md flex items-center text-sm">
                                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-start">
                            <div className="md:col-span-1 flex justify-center md:block">
                                <ProfilePicture
                                    url={profileData.profile_picture_url || null}
                                    userId={user.id}
                                    onUpdate={(newUrl) => {
                                        setProfileData(prev => ({ ...prev, profile_picture_url: newUrl }));
                                        toast.success("Profilbild uppdaterad! Spara profilen för att verkställa.");
                                    }}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-4 sm:space-y-6">
                                <div><label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Fullständigt Namn</label><div className="relative rounded-md shadow-sm"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserCircle className="h-5 w-5 text-gray-400" /></div><input type="text" name="full_name" id="full_name" value={profileData.full_name || ''} onChange={handleInputChange} className="input-form pl-10" required /></div></div>
                                <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-post</label><div className="relative rounded-md shadow-sm"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div><input type="email" name="email" id="email" value={profileData.email || user.email || ''} className="input-form-disabled pl-10" disabled /></div></div>
                            </div>
                        </div>
                        <>
                            <div className="border-t border-gray-200 pt-4 sm:pt-6 space-y-4 sm:space-y-6 mt-6">
                                <h2 className="text-lg font-semibold text-gray-700 flex items-center"><Building className="h-5 w-5 mr-2 text-blue-600" />Uppgifter om organisation</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
        <label htmlFor="pharmacy_name" className="block text-sm font-medium text-gray-700 mb-1">Apotekets/företagets namn</label>
        <input type="text" name="pharmacy_name" id="pharmacy_name" value={profileData.pharmacy_name || ''} onChange={handleInputChange} className="input-form" />
    </div>
    <div>
        <label htmlFor="organization_number" className="block text-sm font-medium text-gray-700 mb-1">Organisationsnummer</label>
        <input type="text" name="organization_number" id="organization_number" value={profileData.organization_number || ''} onChange={handleInputChange} className="input-form" placeholder="555555-5555"/>
    </div>
    <div className="md:col-span-2">
        <label htmlFor="pharmacy_manager_name" className="block text-sm font-medium text-gray-700 mb-1">Ansvarig Chef</label>
        <input type="text" name="pharmacy_manager_name" id="pharmacy_manager_name" value={profileData.pharmacy_manager_name || ''} onChange={handleInputChange} className="input-form" />
    </div>
</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label htmlFor="street_address" className="block text-sm font-medium text-gray-700 mb-1">Gatuadress</label><input type="text" name="street_address" id="street_address" value={profileData.street_address || ''} onChange={handleInputChange} className="input-form" /></div>
                                    <div><label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label><input type="text" name="postal_code" id="postal_code" value={profileData.postal_code || ''} onChange={handleInputChange} className="input-form" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Stad <span className="text-red-500">*</span></label>
    <select
        name="city"
        id="city"
        value={profileData.city || ''}
        onChange={handleInputChange}
        className="input-form"
        required
    >
        <option value="" disabled>-- Välj en stad --</option>
        {swedishCities.map(city => (
            <option key={city} value={city}>{city}</option>
        ))}
    </select>
</div>
                                    <div><label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Land</label><input type="text" name="country" id="country" value={profileData.country || 'Sverige'} onChange={handleInputChange} className="input-form" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label htmlFor="pharmacy_phone" className="block text-sm font-medium text-gray-700 mb-1">Telefon</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-gray-400" /></div><input type="tel" name="pharmacy_phone" id="pharmacy_phone" value={profileData.pharmacy_phone || ''} onChange={handleInputChange} className="input-form pl-10" /></div></div>
                                    <div><label htmlFor="pharmacy_contact_email" className="block text-sm font-medium text-gray-700 mb-1">Kontakt-Epost</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div><input type="email" name="pharmacy_contact_email" id="pharmacy_contact_email" value={profileData.pharmacy_contact_email || ''} onChange={handleInputChange} className="input-form pl-10" /></div></div>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 pt-6 space-y-4 mt-6">
                                <h2 className="text-lg font-semibold text-gray-700 flex items-center"><ClockIcon className="h-5 w-5 mr-2 text-blue-600" />Öppettider</h2>
                                {operatingHours.map((hour, index) => (
                                    <div key={hour.id || hour.tempId} className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-2 items-center p-3 border rounded-md bg-gray-50">
                                        <label htmlFor={`day-${index}`} className="text-sm font-medium text-gray-700 sm:col-span-1">{DAYS_OF_WEEK[hour.day_of_week]}</label>
                                        <div className="sm:col-span-1"><label htmlFor={`open-${index}`} className="sr-only">Öppnar</label><input type="time" id={`open-${index}`} name="open_time" value={hour.open_time || ''} onChange={(e) => handleOperatingHoursChange(index, 'open_time', e.target.value)} disabled={hour.is_closed} className="input-form-sm w-full" /></div>
                                        <div className="sm:col-span-1"><label htmlFor={`close-${index}`} className="sr-only">Stänger</label><input type="time" id={`close-${index}`} name="close_time" value={hour.close_time || ''} onChange={(e) => handleOperatingHoursChange(index, 'close_time', e.target.value)} disabled={hour.is_closed} className="input-form-sm w-full" /></div>
                                        <div className="flex items-center sm:col-span-1 sm:justify-end"><input type="checkbox" id={`closed-${index}`} name="is_closed" checked={hour.is_closed} onChange={(e) => handleOperatingHoursChange(index, 'is_closed', e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2" /><label htmlFor={`closed-${index}`} className="text-sm text-gray-700">Stängt</label></div>
                                    </div>
                                ))}
                            </div>
                        </>
                        <div className="border-t border-gray-200 pt-6 mt-6">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Edit3 className="h-4 w-4 mr-1.5 text-gray-500" /> {descriptionLabel}
                            </label>
                            <textarea name="description" id="description" value={profileData.description || ''} onChange={handleInputChange} rows={4} className="input-form" placeholder={descriptionPlaceholder}></textarea>
                        </div>
                        <div className="pt-4 sm:pt-6 border-t border-gray-200 flex justify-end mt-6">
                            <button type="submit" disabled={saving} className="btn btn-primary w-full sm:w-auto text-sm">
                                {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                {saving ? 'Sparar...' : 'Spara Profil'}
                            </button>
                        </div>
                    </div>
                )}


                {/* ============================================== */}
                {/* EMPLOYEE VIEW - NEW CLEANER INTERFACE        */}
                {/* ============================================== */}
                {isEmployee && (
  <>
    {/* Header Section with Edit/Display States */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

      {/* --- COLUMN 1: MAIN PROFILE CARD --- */}
      <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        {/* Card Header with Edit/Save Buttons */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">Din Profil</h3>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    // Here you could add logic to revert changes if needed
                    setIsEditing(false);
                    if (currentProfile) initializeState(currentProfile); // Revert changes
                  }} 
                  className="btn btn-secondary btn-sm"
                >
                  <X size={16} className="mr-1.5"/> Avbryt
                </button>
                 <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                    {saving ? <Loader2 size={16} className="animate-spin mr-1.5"/> : <Save size={16} className="mr-1.5"/>}
                    Spara
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEditing(true)} className="btn btn-primary btn-sm">
                <Edit3 size={16} className="mr-1.5"/> Redigera Profil
              </button>
            )}
          </div>
        </div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Profile Picture */}
          <div className="md:col-span-1 flex justify-center">
            <ProfilePicture
              url={profileData.profile_picture_url || null}
              userId={user.id}
              onUpdate={(newUrl) => { setProfileData(p => ({ ...p, profile_picture_url: newUrl })); toast.success("Profilbild uppdaterad!"); }}
            />
          </div>
          {/* Basic Info Fields */}
          <div className="md:col-span-2 grid grid-cols-1 gap-5">
            <div>
              <label className="form-label-display">Namn</label>
              {isEditing ? (
               <input type="text" name="full_name" value={profileData.full_name || ''} onChange={handleInputChange} className="input-form mt-1" />
              ) : (
                <p className="form-text-display">{profileData.full_name || '-'}</p>
              )}
            </div>
            <div>
              <label className="form-label-display">Email</label>
              <p className="form-text-display text-gray-500">{user?.email || '-'}</p>
            </div>
          </div>
        </div>

        {/* Address & Contact Fields */}
        <div className="border-t border-gray-200 pt-5 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <label className="form-label-display">Telefon</label>
              {isEditing ? (
                <input type="tel" name="phone_number" value={profileData.phone_number || ''} onChange={handleInputChange} className="input-form" />
              ) : (
                <p className="form-text-display">{profileData.phone_number || '-'}</p>
              )}
            </div>
            <div>
              <label className="form-label-display">Gatuadress</label>
              {isEditing ? (
                 <input type="text" name="street_address" value={profileData.street_address || ''} onChange={handleInputChange} className="input-form" />
              ) : (
                <p className="form-text-display">{profileData.street_address || '-'}</p>
              )}
            </div>
            <div>
              <label className="form-label-display">Stad</label>
              {isEditing ? (
                <SearchableCityDropdown
                  selectedCity={profileData.city || ''}
                  onCityChange={(city) => setProfileData(prev => ({ ...prev, city }))}
                  disabled={!isEditing}
                />
              ) : (
                 <p className="form-text-display">{profileData.city || '-'}</p>
              )}
            </div>
            <div>
              <label className="form-label-display">Postnummer</label>
              {isEditing ? (
                <input type="text" name="postal_code" value={profileData.postal_code || ''} onChange={handleInputChange} className="input-form" />
              ) : (
                 <p className="form-text-display">{profileData.postal_code || '-'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- COLUMN 2: MY REVIEWS COMPONENT --- */}
      <div className="lg:col-span-1">
        <MyReviews />
      </div>
    </div>

                        {/* Tabs and Content Section */}
                        <div className="bg-white shadow-lg rounded-lg p-6">
                            <div className="border-b border-gray-200 mb-6">
                                <nav className="-mb-px flex space-x-2 sm:space-x-4">
                                    <button type="button" onClick={() => setActiveTab('details')} className={`tab-button ${activeTab === 'details' && 'active'}`}>Allmänt</button>
                                    <button type="button" onClick={() => setActiveTab('work')} className={`tab-button ${activeTab === 'work' && 'active'}`}>Arbetshistorik</button>
                                    <button type="button" onClick={() => setActiveTab('documents')} className={`tab-button ${activeTab === 'documents' && 'active'}`}>Dokument</button>
                                </nav>
                            </div>
                            
                            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border-red-300 rounded-md flex items-center text-sm"><AlertCircle className="h-5 w-5 mr-2" /><span>{error}</span></div>}

                                                        {activeTab === 'details' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <label htmlFor="description" className="form-label text-lg font-semibold flex items-center">
                                            <Edit3 className="h-5 w-5 mr-2 text-gray-500" />{descriptionLabel}
                                        </label>
                                        <textarea name="description" id="description" value={profileData.description || ''} onChange={handleInputChange} rows={5} className="input-form" placeholder={descriptionPlaceholder}></textarea>
                                    </div>
                                    
                                    {isPharmacist && (
                                        <div>
                                            <h3 className="form-label font-semibold">Specialisering</h3>
                                            <div className="flex gap-6 mt-2">
                                                <label className="flex items-center"><input type="radio" name="pharmacist_type" value="Apotekare" checked={profileData.pharmacist_type === 'Apotekare'} onChange={handleInputChange} className="form-radio" /> <span className="ml-2">Apotekare</span></label>
                                                <label className="flex items-center"><input type="radio" name="pharmacist_type" value="Receptarie" checked={profileData.pharmacist_type === 'Receptarie'} onChange={handleInputChange} className="form-radio" /> <span className="ml-2">Receptarie</span></label>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- NEW Systemkännedom Section --- */}
                                    <div>
                                        <label htmlFor="systems" className="form-label">Systemkännedom</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="systems"
                                                type="text"
                                                value={systemInput}
                                                onChange={(e) => setSystemInput(e.target.value)}
                                                onKeyDown={handleSystemInputKeyDown}
                                                className="input-form flex-grow"
                                                placeholder="t.ex. Agera, Kronex..."
                                            />
                                            <button type="button" onClick={handleAddSystem} className="btn btn-secondary flex-shrink-0">Lägg till</button>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {profileData.systems && profileData.systems.map(system => (
                                                <span key={system} className="inline-flex items-center gap-x-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                                                    {system}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSystem(system)}
                                                        className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-blue-600/20"
                                                    >
                                                        <X className="h-3.5 w-3.5 text-blue-700 group-hover:text-white" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'work' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-semibold text-gray-800">Arbetshistorik</h2>
                                        <button type="button" onClick={addWorkExperience} className="btn btn-secondary btn-sm"><Plus size={16} className="mr-1" />Lägg till erfarenhet</button>
                                    </div>
                                    <div className="space-y-6">
                                        {workHistory.length > 0 ? workHistory.map((entry, index) => (
                                            <div key={entry.id} className="bg-gray-50/70 border border-gray-200 rounded-lg p-5 shadow-sm relative">
                                                <button type="button" onClick={() => removeWorkExperience(entry.id)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label="Ta bort erfarenhet"><Trash2 size={16} /></button>
                                                <div className="space-y-4">
                                                    {/* Row for Title and Company */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="form-label">Befattning</label>
                                                            <input type="text" value={entry.title} onChange={e => handleWorkHistoryChange(index, 'title', e.target.value)} className="input-form" placeholder="t.ex. Apotekschef" />
                                                        </div>
                                                        <div>
                                                            <label className="form-label">Företag</label>
                                                            <input type="text" value={entry.company} onChange={e => handleWorkHistoryChange(index, 'company', e.target.value)} className="input-form" placeholder="t.ex. Apoteket AB" />
                                                        </div>
                                                    </div>
                                                    {/* Row for Dates */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="form-label">Startdatum</label>
                                                            <input type="month" value={entry.start_date} onChange={e => handleWorkHistoryChange(index, 'start_date', e.target.value)} className="input-form" />
                                                        </div>
                                                        <div>
                                                            <label className="form-label">Slutdatum</label>
                                                            <input type="month" value={entry.end_date} onChange={e => handleWorkHistoryChange(index, 'end_date', e.target.value)} className="input-form" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : <p className="text-center text-gray-500 py-6 bg-gray-50 rounded-md">Ingen arbetshistorik tillagd.</p>}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'documents' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div>
                                        <label className="form-label text-lg font-semibold">CV / Meritförteckning</label>
                                        <p className="text-xs text-gray-500 mb-3">Ladda upp ditt CV. Accepterade format: PDF, DOC, DOCX. Max 5MB.</p>
                                        <div className="flex items-center gap-4">
                                            <input type="file" id="cv-upload" onChange={(e) => handleFileUpload(e, 'cv')} className="hidden" accept=".pdf,.doc,.docx" disabled={uploading === 'cv'} />
                                            <label htmlFor="cv-upload" className="btn btn-secondary cursor-pointer">{uploading === 'cv' ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} Ladda upp CV</label>
                                            {profileData.resume_url && <a href={getPublicUrl(profileData.resume_url, 'resumes')} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><FileText size={16} /> Visa nuvarande CV</a>}
                                        </div>
                                    </div>
                                    {isPharmacist && (
                                        <div className="pt-6 border-t">
                                            <label className="form-label text-lg font-semibold">Farmaceutlegitimation</label>
                                            <p className="text-xs text-gray-500 mb-3">Ladda upp din legitimation. Verifiering sker manuellt.</p>
                                            <div className="flex items-center gap-4">
                                                <input type="file" id="licenseUpload" onChange={(e) => handleFileUpload(e, 'license')} className="hidden" accept=".pdf,.jpg,.png,.jpeg" disabled={uploading === 'license'} />
                                                <label htmlFor="licenseUpload" className="btn btn-secondary cursor-pointer">{uploading === 'license' ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} Ladda upp Licens</label>
                                                {profileData.license_document && <a href={getPublicUrl(profileData.license_document, 'license-documents')} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><FileText size={16} /> Visa licens</a>}
                                            </div>
                                            <div className="mt-3">
                                                {profileData.license_verified ?
                                                    <p className="text-sm font-medium text-green-600 flex items-center"><CheckCircle size={16} className="mr-1.5" /> Verifierad</p> :
                                                    <p className="text-sm font-medium text-yellow-600 flex items-center"><AlertTriangle size={16} className="mr-1.5" /> Väntar på verifiering</p>
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="pt-6 flex justify-end">
                            <button type="submit" disabled={saving || uploading !== null} className="btn btn-primary w-full sm:w-auto">
                                {saving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                {saving ? 'Sparar...' : 'Spara Ändringar'}
                            </button>
                        </div>
                    </>
                )}
            </form>
            <style jsx>{`
                .form-label { @apply block text-sm font-medium text-gray-700 mb-1.5; }
                .input-icon { @apply absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-full w-5 text-gray-400; }
                .input-form { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm; }
                .input-form-disabled { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm; }
                .input-form-sm { @apply block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm; }
                .form-radio { @apply h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150; }
                .btn-primary { @apply text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed; }
                .form-label-display {
  @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1;
}
.form-text-display {
  @apply text-base text-gray-800 pb-2;
}
                .btn-secondary { @apply text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500; }
                .btn-outline { @apply text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-sm { @apply px-3 py-1.5 text-xs; }
                .tab-button { @apply px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 text-gray-600 hover:bg-gray-100; }
                .tab-button.active { @apply bg-blue-600 text-white shadow-sm; }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ProfileSetup;