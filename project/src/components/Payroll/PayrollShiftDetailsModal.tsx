// src/components/Payroll/PayrollShiftDetailsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust path
import type { ShiftNeed } from '../../types'; // Assuming ShiftNeed is your detailed shift type
import { Loader2, X, Calendar, Clock, MapPin, Briefcase, UserCircle, DollarSign, Info as InfoIcon, Building2 } from 'lucide-react';
import { format, parseISO, isValid, differenceInHours, differenceInMinutes } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface PayrollShiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string | null;
}

// Define a more detailed shift type if needed, or enhance ShiftNeed
interface DetailedShiftNeed extends ShiftNeed {
    employer_name?: string | null; // From joining with profiles
    employer_pharmacy_name?: string | null;
    // Add any other fields you expect from fetchShiftById
}


const formatDateSafe = (dateString: string | null | undefined, formatStr: string = 'PPPP', locale = sv): string => {
    if (!dateString) return 'N/A';
    try {
        const date = parseISO(dateString);
        if (isValid(date)) {
            return format(date, formatStr, { locale });
        }
        return 'Invalid Date';
    } catch (e) {
        console.error("Error formatting date in modal:", dateString, e);
        return 'Date Error';
    }
};

const formatTimeSafe = (timeString: string | null | undefined, dateString?: string | null | undefined): string => {
    if (!timeString) return 'N/A';
    try {
        // If a date string is provided, combine them for accurate parsing, otherwise parse time directly
        const dateTimeString = dateString ? `${dateString.split('T')[0]}T${timeString}` : timeString;
        const date = parseISO(dateTimeString);
        if (isValid(date)) {
            return format(date, 'HH:mm', { locale: sv });
        }
        return 'Invalid Time';
    } catch (e) {
        console.error("Error formatting time in modal:", timeString, e);
        return 'Time Error';
    }
};


// This function should ideally be in src/lib/shifts.ts
async function fetchShiftById(id: string): Promise<{ data: DetailedShiftNeed | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('shift_needs')
            .select(`
                *,
                employer:employer_id (
                    full_name,
                    pharmacy_name,
                    profile_picture_url
                )
            `)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { data: null, error: 'Shift not found.' };

        // Transform data to match DetailedShiftNeed if necessary
        const detailedData: DetailedShiftNeed = {
            ...data,
            employer_name: data.employer?.full_name ?? null,
            employer_pharmacy_name: data.employer?.pharmacy_name ?? null,
        };

        return { data: detailedData, error: null };
    } catch (err) {
        console.error('Error fetching shift by ID:', err);
        const message = err instanceof Error ? err.message : 'Failed to fetch shift details.';
        return { data: null, error: message };
    }
}


export const PayrollShiftDetailsModal: React.FC<PayrollShiftDetailsModalProps> = ({
  isOpen,
  onClose,
  shiftId,
}) => {
  const [shiftDetails, setShiftDetails] = useState<DetailedShiftNeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShiftDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchShiftById(id);
    if (fetchError) {
      setError(fetchError);
      toast.error(`Failed to load shift details: ${fetchError}`);
    } else {
      setShiftDetails(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && shiftId) {
      loadShiftDetails(shiftId);
    } else if (!isOpen) {
      setShiftDetails(null); // Clear details when modal closes
      setError(null);
    }
  }, [isOpen, shiftId, loadShiftDetails]);

  if (!isOpen) return null;

  const calculateDuration = () => {
    if (shiftDetails?.date && shiftDetails.start_time && shiftDetails.end_time) {
        try {
            const startDate = parseISO(`${shiftDetails.date}T${shiftDetails.start_time}`);
            let endDate = parseISO(`${shiftDetails.date}T${shiftDetails.end_time}`);
            if (endDate <= startDate) { // Handle overnight shifts
                endDate = new Date(endDate.setDate(endDate.getDate() + 1));
            }
            const hours = differenceInHours(endDate, startDate);
            const minutes = differenceInMinutes(endDate, startDate) % 60;
            let durationStr = `${hours}h`;
            if (minutes > 0) durationStr += ` ${minutes}m`;

            if(shiftDetails.lunch){
                // Assuming lunch is an interval string like "PT30M" or "00:30:00"
                let lunchMinutes = 0;
                if (typeof shiftDetails.lunch === 'string') {
                    if (shiftDetails.lunch.startsWith("PT") && shiftDetails.lunch.endsWith("M")) {
                        lunchMinutes = parseInt(shiftDetails.lunch.substring(2, shiftDetails.lunch.length -1), 10);
                    } else if (shiftDetails.lunch.includes(":")) {
                        const parts = shiftDetails.lunch.split(':').map(Number);
                        if(parts.length === 2) lunchMinutes = parts[0] * 60 + parts[1];
                        if(parts.length === 3) lunchMinutes = parts[0] * 3600 + parts[1] * 60 + parts[2] / 60; // simplified
                    }
                } else if (typeof shiftDetails.lunch === 'object' && shiftDetails.lunch !== null && 'minutes' in shiftDetails.lunch) {
                    // If lunch is an object like { minutes: 30 }
                    lunchMinutes = (shiftDetails.lunch as { minutes: number }).minutes;
                }


                if (lunchMinutes > 0) {
                    durationStr += ` (incl. ${lunchMinutes}m lunch)`;
                }
            }
            return durationStr;
        } catch (e) {
            console.error("Error calculating duration:", e);
            return "Error";
        }
    }
    return 'N/A';
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[70] p-4 transition-opacity duration-300 ease-in-out" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden" 
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">
            Pass (detaljer)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 -mr-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          {loading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">
              Error: {error}
              <button onClick={() => shiftId && loadShiftDetails(shiftId)} className="mt-3 text-sm text-blue-600 hover:underline">
                Prova igen
              </button>
            </div>
          )}
          {!loading && !error && shiftDetails && (
            <dl className="space-y-4">
              <div className="space-y-1">
                <dt className="text-xs font-medium text-gray-500 uppercase">Titel</dt> 
                <dd className="mt-0.5 text-sm sm:text-md text-gray-900 font-semibold">{shiftDetails.title || 'N/A'}</dd>
              </div>

              {shiftDetails.employer_pharmacy_name && (
                <div className="space-y-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase">Arbetsgivare</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm text-gray-700 flex items-center flex-wrap">
                        <Building2 size={14} className="mr-1.5 text-gray-400" />
                        {shiftDetails.employer_pharmacy_name}
                        {shiftDetails.employer_name && shiftDetails.employer_name !== shiftDetails.employer_pharmacy_name && (
                            <span className="text-gray-500 ml-1">({shiftDetails.employer_name})</span>
                        )}
                    </dd>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-gray-500 uppercase flex items-center"><Calendar size={13} className="mr-1.5"/>Datum</dt>
                  <dd className="mt-0.5 text-sm text-gray-700">{formatDateSafe(shiftDetails.date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase flex items-center"><Clock size={13} className="mr-1.5"/>Tid</dt>
                  <dd className="mt-0.5 text-sm text-gray-700">
                    {formatTimeSafe(shiftDetails.start_time, shiftDetails.date)} - {formatTimeSafe(shiftDetails.end_time, shiftDetails.date)}
                  </dd>
                </div>
              </div>
               <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase flex items-center"><InfoIcon size={13} className="mr-1.5"/>Timmar</dt>
                  <dd className="mt-0.5 text-xs sm:text-sm text-gray-700">{calculateDuration()}</dd>
              </div>


              {shiftDetails.location && (
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-gray-500 uppercase flex items-center"><MapPin size={13} className="mr-1.5"/>Plats</dt>
                  <dd className="mt-0.5 text-xs sm:text-sm text-gray-700 break-words">{shiftDetails.location}</dd>
                </div>
              )}
              <div className="space-y-1">
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center"><Briefcase size={13} className="mr-1.5"/>Roll</dt>
                <dd className="mt-0.5 text-xs sm:text-sm text-gray-700 capitalize">{shiftDetails.required_role || 'N/A'}</dd>
              </div>

              {shiftDetails.description && (
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Beskrivning</dt>
                  <dd className="mt-0.5 text-xs sm:text-sm text-gray-700 whitespace-pre-line">{shiftDetails.description}</dd>
                </div>
              )}

              {shiftDetails.required_experience && shiftDetails.required_experience.length > 0 && (
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Erfarenhet</dt>
                  <dd className="mt-0.5 text-xs sm:text-sm text-gray-700">
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      {shiftDetails.required_experience.map((exp, i) => <li key={i}>{exp}</li>)}
                    </ul>
                  </dd>
                </div>
              )}
                {shiftDetails.is_urgent && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <dt className="text-xs font-medium text-yellow-700 uppercase">Akut pass</dt>
                        {shiftDetails.urgent_pay_adjustment && ( 
                             <dd className="mt-0.5 text-xs sm:text-sm text-yellow-800">Extra lön: {shiftDetails.urgent_pay_adjustment.toFixed(2)} SEK/hour</dd>
                        )}
                    </div>
                )}

            </dl>
          )}
           {!loading && !error && !shiftDetails && (
            <div className="text-center py-10 text-gray-500">Shift details could not be loaded.</div>
           )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            type="button"
            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
