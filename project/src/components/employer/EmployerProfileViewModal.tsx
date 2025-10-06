// src/components/employer/EmployerProfileViewModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { UserProfile } from '../../types';
import { Loader2, X, MapPin, Building2, Phone, Mail, Clock, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PharmacyHourLine {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface EmployerProfileForView extends UserProfile {
  operating_hours?: PharmacyHourLine[];
}

interface EmployerProfileViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employerId: string | null;
}

const DAYS_OF_WEEK_DISPLAY = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']; // Monday first

export const EmployerProfileViewModal: React.FC<EmployerProfileViewModalProps> = ({
  isOpen,
  onClose,
  employerId,
}) => {
  const [employerProfile, setEmployerProfile] = useState<EmployerProfileForView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure your Google Maps API Key is correctly sourced, preferably from environment variables
  const Maps_API_KEY = import.meta.env.VITE_Maps_API_KEY;


  const fetchEmployerDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'employer')
        .single();

      if (profileError) {
        console.error("[EmployerProfileViewModal] Profile fetch error:", profileError);
        if (profileError.code === 'PGRST116') throw new Error("Employer profile not found or role is incorrect.");
        throw profileError;
      }
      // No need to check !profileData here as .single() would error if not found.

      const { data: hoursData, error: hoursError } = await supabase
        .from('pharmacy_operating_hours')
        .select('*')
        .eq('employer_id', id)
        .order('day_of_week', { ascending: true });

      if (hoursError) {
        console.warn("[EmployerProfileViewModal] Could not fetch operating hours:", hoursError.message);
      }

      const fullProfileData: EmployerProfileForView = {
        ...(profileData as UserProfile),
        operating_hours: (hoursData as PharmacyHourLine[] | null) || [],
      };
      setEmployerProfile(fullProfileData);

    } catch (err) {
      console.error("[EmployerProfileViewModal] Error fetching employer details:", err);
      const message = err instanceof Error ? err.message : "Could not load pharmacy details.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);


  const getMapEmbedUrlForProfile = useCallback(() => {
    if (!Maps_API_KEY) {
      console.warn("[EmployerProfileViewModal] Google Maps API Key is missing. Map will not load.");
      return '';
    }
    if (employerProfile?.street_address && employerProfile?.city) {
      const addressParts = [
        employerProfile.street_address,
        employerProfile.city,
        employerProfile.postal_code,
        employerProfile.country
      ].filter(Boolean).join(', ');
      const query = encodeURIComponent(addressParts);
      return `https://www.google.com/maps/embed/v1/place?key=${Maps_API_KEY}&q=${query}`;
    }
    return '';
  }, [employerProfile, Maps_API_KEY]);

  const mapUrl = getMapEmbedUrlForProfile();

  useEffect(() => {
    if (isOpen && employerId) {
      fetchEmployerDetails(employerId);
    } else if (!isOpen) {
      setEmployerProfile(null);
      setError(null);
    }
  }, [isOpen, employerId, fetchEmployerDetails]);


  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[999] p-4 transition-opacity duration-300 ease-in-out" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            {employerProfile?.profile_picture_url ? (
              <img src={employerProfile.profile_picture_url} alt={employerProfile.pharmacy_name || employerProfile.full_name || "Pharmacy"} className="h-10 w-10 rounded-full object-cover mr-3 border" />
            ) : (
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            )}
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {loading ? 'Loading Pharmacy...' : employerProfile?.pharmacy_name || employerProfile?.full_name || 'Pharmacy Details'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-4 sm:space-y-5">
          {loading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-10">
              <Info size={40} className="mx-auto text-red-500 mb-2" />
              <p className="text-red-600">Error: {error}</p>
              <button onClick={() => employerId && fetchEmployerDetails(employerId)} className="mt-4 text-sm text-blue-600 hover:underline">
                Try again
              </button>
            </div>
          )}
          {!loading && !error && employerProfile && (
            <>
              {employerProfile.description && (
                <div className="pb-3 sm:pb-4 border-b border-gray-100">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">About</h3>
                  <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line">{employerProfile.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2 flex items-center">
                    <MapPin size={14} className="mr-1.5 text-gray-400" />Address
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700">{employerProfile.street_address || 'N/A'}</p>
                  <p className="text-xs sm:text-sm text-gray-700">{employerProfile.postal_code || ''} {employerProfile.city || 'N/A'}</p>
                  <p className="text-xs sm:text-sm text-gray-700">{employerProfile.country || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2">Contact</h3>
                  {employerProfile.pharmacy_phone && (
                    <p className="text-xs sm:text-sm text-gray-700 flex items-center mb-1">
                      <Phone size={14} className="mr-1.5 text-gray-400 flex-shrink-0" /> {employerProfile.pharmacy_phone}
                    </p>
                  )}
                  {employerProfile.email && ( // Use the general email if pharmacy_contact_email is missing
                    <p className="text-xs sm:text-sm text-gray-700 flex items-center break-all">
                      <Mail size={14} className="mr-1.5 text-gray-400 flex-shrink-0" /> {employerProfile.pharmacy_contact_email || employerProfile.email}
                    </p>
                  )}
                  {!employerProfile.pharmacy_phone && !employerProfile.email && !employerProfile.pharmacy_contact_email &&(
                    <p className="text-xs sm:text-sm text-gray-500 italic">No contact information provided.</p>
                  )}
                </div>
              </div>

              {mapUrl && (
                <div className="mt-4 sm:mt-5">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2">Location Map</h3>
                  <iframe
                    width="100%"
                    height="200"
                    style={{ border: 0, borderRadius: '8px' }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapUrl}
                    title="Pharmacy Location"
                  ></iframe>
                </div>
              )}

              <div className="mt-4 sm:mt-5">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2 flex items-center">
                  <Clock size={14} className="mr-1.5 text-gray-400" />Operating Hours
                </h3>
                {employerProfile.operating_hours && employerProfile.operating_hours.length > 0 ? (
                  <ul className="space-y-1 text-sm text-gray-700">
                    {DAYS_OF_WEEK_DISPLAY.map((dayName, index) => {
                      const dayHours = employerProfile.operating_hours?.find(h => h.day_of_week === index); // Monday is 0 if your DB stores 0-6 for Mon-Sun
                      return (
                        <li key={index} className="flex justify-between py-0.5">
                          <span className="text-xs sm:text-sm">{dayName}:</span>
                          <span className="text-xs sm:text-sm">
                            {dayHours?.is_closed || (!dayHours?.open_time && !dayHours?.close_time)
                              ? 'Closed'
                              : `${dayHours?.open_time?.slice(0, 5) || 'N/A'} - ${dayHours?.close_time?.slice(0, 5) || 'N/A'}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500 italic">Operating hours not specified.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 text-right flex-shrink-0">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm sm:btn-md"
          >
            Close
          </button>
        </div>
      </div>
      <style jsx>{`
        .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
        .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
        .btn-sm { @apply px-3 py-1.5 text-xs; }
        .btn-md { /* Default size if needed, or adjust btn class */ }
      `}</style>
    </div>
  );
};