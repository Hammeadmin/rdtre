// src/components/Shifts/ShiftdetailsmodalPharm.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Building2, Briefcase, AlertTriangle, DollarSign, Send, Info as InfoIcon, UserX, Loader2, Check, Timer } from 'lucide-react';
import { format, isValid, parseISO, isPast, startOfDay as dateIsToday, intervalToDuration } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { UserRole, ShiftNeed, UserProfile } from '../../types';
import { MessageButton } from '../Messages/MessageButton';
import { EmployerProfileViewModal } from '../employer/EmployerProfileViewModal';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase'; // Import supabase client
import { reportSickForShift } from '../../lib/shifts'; // Import the library function
import { useAuth } from '../../context/AuthContext';

const ROLE_DISPLAY_NAMES: { [key in UserRole]?: string } = {
    pharmacist: 'Farmaceut',
    säljare: 'Säljare',
    egenvårdsrådgivare: 'Egenvårdsrådgivare',
};

function formatLunchDuration(minutes: number | null | undefined): string | null {
    if (minutes === null || minutes === undefined || minutes === 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let durationStr = '';
    if (hours > 0) durationStr += `${hours}t `;
    if (mins > 0) durationStr += `${mins}min`;
    return durationStr.trim() || null;
}

function formatDateSafe(dateString: string | null | undefined, formatPattern: string = 'eeee d MMMM yyyy'): string {
  if (!dateString) return 'N/A';
  try {
    const dateObj = parseISO(dateString);
    if (isValid(dateObj)) {
      return format(dateObj, formatPattern, { locale: sv });
    }
  } catch (e) { console.error("Error formatting date:", dateString, e); }
  return 'Ogiltigt Datum';
}

const canApplyForShift = (
    profile: UserProfile | null | undefined,
    shiftRequiredRole: UserRole | null | undefined
): { canApply: boolean; reason?: string } => {
    if (!profile || !profile.role || !['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile.role)) {
        return { canApply: false, reason: "Endast sökande roller kan ansöka." };
    }
    if (profile.is_active === false) { return { canApply: false, reason: "Ditt konto är inte aktivt." }; }
    if (profile.license_verified !== true) { return { canApply: false, reason: "Ditt konto måste vara verifierat." }; }
    if (shiftRequiredRole) {
        switch (profile.role as UserRole) {
            case 'pharmacist': if (!['pharmacist', 'egenvårdsrådgivare', 'säljare'].includes(shiftRequiredRole)) return { canApply: false, reason: `Din roll (Farmaceut) matchar inte den krävda rollen (${shiftRequiredRole}).` }; break;
            case 'egenvårdsrådgivare': if (!['egenvårdsrådgivare', 'säljare'].includes(shiftRequiredRole)) return { canApply: false, reason: `Din roll (Egenvårdsrådgivare) matchar inte den krävda rollen (${shiftRequiredRole}).` }; break;
            case 'säljare': if (shiftRequiredRole !== 'säljare') return { canApply: false, reason: `Din roll (Säljare) kan endast söka Säljare-roller.` }; break;
            default: return { canApply: false, reason: "Din roll kan inte söka detta pass." };
        }
    }
    return { canApply: true };
};

interface ShiftDetailsModalPharmProps {
  shift: ShiftNeed | null;
  onClose: () => void;
  onApply?: (shift: ShiftNeed) => Promise<void>; // Make onApply return a promise
  hasApplied?: boolean;
  profile: UserProfile | null | undefined;
  onUpdate?: () => void;
}

export function ShiftDetailsModal({
  shift,
  onClose,
  onApply,
  hasApplied,
  profile,
  onUpdate
}: ShiftDetailsModalPharmProps) {
  const [isEmployerModalOpen, setIsEmployerModalOpen] = useState(false);
  const [isReportingSick, setIsReportingSick] = useState(false);
   const { profile: contextProfile } = useAuth();
  // --- NEW ---: State for the apply button's dynamic behavior
  type ApplyState = 'idle' | 'loading' | 'success';
  const [applyState, setApplyState] = useState<ApplyState>('idle');
  // --- NEW ---: State for the countdown timer
  const [countdown, setCountdown] = useState<string>('');

  // --- NEW ---: Effect for the live countdown timer
  useEffect(() => {
    if (!shift?.date || !shift.start_time) {
      setCountdown('');
      return;
    }

    const shiftStartDateTime = parseISO(`${shift.date}T${shift.start_time}`);
    if (!isValid(shiftStartDateTime) || isPast(shiftStartDateTime)) {
        setCountdown('Passet har redan startat');
        return;
    }

    const timer = setInterval(() => {
      const duration = intervalToDuration({ start: new Date(), end: shiftStartDateTime });
      const parts = [];
      if (duration.days && duration.days > 0) parts.push(`${duration.days}d`);
      if (duration.hours && duration.hours > 0) parts.push(`${duration.hours}t`);
      if (duration.minutes && duration.minutes > 0) parts.push(`${duration.minutes}m`);
      if (duration.seconds && duration.seconds > 0) parts.push(`${duration.seconds}s`);
      
      if (parts.length > 0) {
        setCountdown(`Startar om: ${parts.join(' ')}`);
      } else {
        setCountdown('Startar nu!');
        clearInterval(timer);
      }
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, [shift]);


  const handleOpenEmployerModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (shift?.employer_id) setIsEmployerModalOpen(true);
  };
    const handleCloseEmployerModal = () => setIsEmployerModalOpen(false);

    // ** ADDED SICK REPORT HANDLER **
    const handleReportSick = async () => {
    // This initial check is good.
    if (!shift || !profile) {
        console.error("handleReportSick stopped: 'shift' or 'profile' is missing.");
        return;
    }

    const confirmationMessage = "Är du säker på att du vill sjukanmäla dig?\n\n" +
                                "Åtgärden kan inte ångras.\n\n" +
                                "Observera: Upprepade sjukanmälningar kan leda till en varning eller avstängning från plattformen.";

    if (!window.confirm(confirmationMessage)) {
        console.log("User cancelled sick report.");
        return;
    }

    setIsReportingSick(true);
    const toastId = toast.loading("Registrerar sjukanmälan...");
    console.log(`[1] User confirmed. Starting sick report for shift ID: ${shift.id}`);

    try {
        const result = await reportSickForShift(shift.id);
        console.log("[2] Received result from reportSickForShift:", result);

        if (result.error) {
            // This will now catch errors from the database and library function
            throw new Error(result.error);
        }

        // If we reach here, the database function was successful.
        toast.success("Sjukanmälan har registrerats. Passet har återpublicerats.", { id: toastId });

        // --- Safely trigger email notification ---
        const shiftTime = (shift.start_time && shift.end_time)
            ? `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`
            : 'Tid ej specificerad';

        fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailType: 'sickReport',
                payload: {
                    shiftTitle: shift.title,
                    shiftDate: shift.date,
                    shiftTime: shiftTime,
                    employeeName: profile.full_name || 'En anställd',
                    employerId: shift.employer_id
                }
            }),
        }).catch(e => console.error("Non-critical error: Failed to trigger sick report email:", e));

          // --- END OF NOTIFICATION LOGIC ---
            
            if (result.recent_sick_leave_count && result.recent_sick_leave_count >= 1) {
                const warningToastMessage = result.recent_sick_leave_count > 1 
                    ? `Du har nu ${result.recent_sick_leave_count} sjukanmälningar under den senaste perioden. Vänligen notera att detta kan påverka din status på plattformen.`
                    : "Detta är din första sjukanmälan under den senaste månaden. Notera att upprepade anmälningar kan påverka din status.";

                toast.custom((t) => (
                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-yellow-100 border border-yellow-300 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 pt-0.5"><AlertTriangle className="h-10 w-10 text-yellow-500" /></div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-medium text-yellow-800">Observera</p>
                                    <p className="mt-1 text-sm text-yellow-700">{warningToastMessage}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-l border-yellow-200">
                            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-yellow-600 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500">Stäng</button>
                        </div>
                    </div>
                ), { duration: 10000 });
            }
            if (onUpdate) onUpdate();
        onClose();
        console.log("[3] Process completed successfully.");

    } catch (err: any) {
        // If ANY part of the process fails, it will be caught here.
        console.error("!!! CRITICAL ERROR in handleReportSick:", err);
        // We use the existing toastId to show the error.
        toast.error(`Ett fel uppstod: ${err.message}`, { id: toastId });
    } finally {
        // This 'finally' block GUARANTEES the loading state is turned off,
        // no matter if the function succeeded or failed.
        console.log("[4] Sick report process finished. Resetting UI state.");
        setIsReportingSick(false);
    }
};

    if (!shift) return null;

    const employerDisplayName = shift.employer?.pharmacy_name || shift.employer?.full_name || null;
    const formattedDate = formatDateSafe(shift.date);
    const displayStartTime = shift.start_time?.slice(0, 5) ?? 'N/A';
    const displayEndTime = shift.end_time?.slice(0, 5) ?? 'N/A';
    const formattedLunch = formatLunchDuration(shift.lunch_break_minutes);
    const displayUrgentPay = shift.is_urgent && shift.urgent_pay_adjustment != null ? `+ ${shift.urgent_pay_adjustment.toFixed(2)} SEK/hr` : null;
  const totalRate = (shift.hourly_rate || 0) + (shift.urgent_pay_adjustment || 0);

    const shiftDateObj = shift.date ? parseISO(shift.date) : null;
    const isShiftPast = shiftDateObj ? (isPast(shiftDateObj) && !dateIsToday(shiftDateObj)) : false;
    const eligibility = canApplyForShift(profile, shift.required_role);
    const handleApplyClick = async () => {
    if (!onApply || !eligibility.canApply || hasApplied || applyState !== 'idle') return;

    setApplyState('loading');
    try {
      await onApply(shift);
      setApplyState('success');
      // --- Start Notification ---
if (shift.employer_id && user?.user_metadata?.full_name) {
    fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            emailType: 'newShiftApplication',
            payload: {
                applicantName: user.user_metadata.full_name,
                shiftTitle: shift.title,
                employerId: shift.employer_id,
            },
        }),
    }).catch(e => console.error("Failed to trigger application notification:", e));
}
// --- End Notification ---
      // Optionally close modal after a delay
      setTimeout(() => {
        onClose();
        if(onUpdate) onUpdate();
      }, 1500);
    } catch (error) {
      console.error("Application failed:", error);
      toast.error("Ansökan misslyckades. Försök igen.");
      setApplyState('idle'); // Reset on failure
    }
  };
    const showApplyButton = profile?.role && ['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile.role) && shift.status === 'open' && !isShiftPast && onApply;
    
    // ** ADDED LOGIC TO DETERMINE IF 'REPORT SICK' BUTTON SHOULD BE VISIBLE **
    const currentUserId = profile?.id;
    const isEmployee = profile?.role && ['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile.role);
const canReportSick = isEmployee && shift.status === 'filled' && !isShiftPast;

    const encodedLocation = shift.location ? encodeURIComponent(shift.location) : '';
    const googleMapsUrl = encodedLocation ? `https://www.google.com/maps/search/?api=1&query=${encodedLocation}` : '#';

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[70] p-2 sm:p-4 transition-opacity duration-300" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden transition-all duration-300 transform scale-95 opacity-0 animate-scale-in" onClick={(e) => e.stopPropagation()}>        
                    <div className="flex justify-between items-start border-b px-4 sm:px-6 py-3 sm:py-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                                {shift.title || `Pass ${shift.required_role || ''}`}
                                {shift.is_urgent && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><AlertTriangle className="-ml-0.5 mr-1 h-3.5 w-3.5" />Brådskande</span>}
                            </h2>
                          {countdown && (
              <div className="bg-blue-50 text-blue-800 font-semibold text-sm px-4 py-2 rounded-lg flex items-center justify-center">
                <Timer size={16} className="mr-2"/> {countdown}
              </div>
            )}
                            {employerDisplayName && (
                                <div className="text-xs sm:text-sm text-gray-500 flex items-center mt-1">
                                    <Building2 className="h-4 w-4 mr-1.5 text-gray-400" /><span>{employerDisplayName}</span>
                                    {shift.employer_id && <button onClick={handleOpenEmployerModal} className="ml-2 text-xs text-blue-600 hover:underline p-0.5 flex items-center"><InfoIcon size={12} className="mr-0.5" /> Visa Profil</button>}
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full"><X className="h-5 w-5" /></button>
                    </div>

                    <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-4">
                        <div className="pb-4 border-b border-gray-100">
                            {shift.description ? <p className="text-sm text-gray-600 whitespace-pre-line">{shift.description}</p> : <p className="text-sm text-gray-500 italic">Ingen ytterligare beskrivning.</p>}
                        </div>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                           <div className="flex items-center"><Briefcase className="icon-style" /><span>Roll: <span className="font-medium">{shift.required_role ? ROLE_DISPLAY_NAMES[shift.required_role] || shift.required_role : 'N/A'}</span></span></div>
                            <div className="flex items-center"><MapPin className="icon-style" />{shift.location ? (googleMapsUrl !== '#' ? <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{shift.location}</a> : <span>{shift.location}</span>) : <span className="text-gray-500 italic">Plats ej specifierad</span>}</div>
                            <div className="flex items-center"><Calendar className="icon-style" /><time dateTime={shift.date ?? undefined}>{formattedDate}</time></div>
                            <div className="flex items-center"><Clock className="icon-style" /><span>{displayStartTime} - {displayEndTime}</span></div>
                            {formattedLunch && <div className="flex items-center"><Clock className="icon-style" /><span>Lunch: {formattedLunch}</span></div>}
                            <div className="flex items-center md:col-span-2 font-semibold text-lg text-gray-900 bg-gray-50 p-3 rounded-lg">
                                <DollarSign className="icon-style text-gray-500"/>
                                <span>Ersättning: {totalRate.toFixed(2)} SEK/timme</span>
                                {shift.is_urgent && <span className="ml-2 text-xs font-medium text-orange-700">(inkl. akut-tillägg)</span>}
                            </div>
                            {displayUrgentPay && <div className="flex items-center text-orange-700 font-medium md:col-span-2 bg-orange-50 p-2 rounded-md"><DollarSign className="h-4 w-4 mr-1.5" /><span>Brådskande Tillägg: {displayUrgentPay}</span></div>}
                            <div className="md:col-span-2"><span className="font-medium text-gray-500">Status:</span> <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${shift.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{shift.status}</span></div>
                        </dl>
                    </div>

                    <div className="px-4 sm:px-6 py-3 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-2">
                        {shift.employer_id && <MessageButton recipientId={shift.employer_id} recipientRole="employer" />}
                        <div className="flex gap-3 w-full sm:w-auto justify-end">
                            <button onClick={onClose} type="button" className="btn btn-secondary flex-1 sm:flex-none">Stäng</button>
                            {showApplyButton && (
                    <div className="relative group flex-1 sm:flex-none">
                        {/* --- UPDATED ---: Dynamic Apply Button */}
                        <button 
                          onClick={handleApplyClick} 
                          disabled={hasApplied || !eligibility.canApply || applyState !== 'idle'} 
                          className={`btn w-full ${hasApplied || applyState === 'success' ? 'btn-success' : (eligibility.canApply ? 'btn-primary animate-pulse-slow' : 'btn-disabled-custom')}`} 
                          title={!eligibility.canApply ? eligibility.reason : (hasApplied ? "Redan ansökt" : "Ansök nu")}
                        >
                          {applyState === 'loading' && <><Loader2 size={16} className="mr-2 animate-spin"/>Ansöker...</>}
                          {applyState === 'success' && <><Check size={16} className="mr-2"/>Ansökt!</>}
                          {applyState === 'idle' && (hasApplied ? 'Redan Ansökt' : eligibility.canApply ? <><Send size={16} className="mr-2"/>Ansök Nu</> : 'Ej Behörig')}
                        </button>
                        {!hasApplied && !eligibility.canApply && eligibility.reason && <div className="absolute hidden group-hover:block bottom-full mb-1.5 w-max max-w-xs bg-black text-white text-xs rounded py-1 px-2 z-20"><AlertTriangle className="inline h-3 w-3 mr-1" />{eligibility.reason}</div>}
                    </div>
                            )}
                            {/* ** ADDED BUTTON RENDER LOGIC ** */}
                            {canReportSick && (
                                <button type="button" onClick={handleReportSick} disabled={isReportingSick} className="btn btn-warning flex-1 sm:flex-none">
                                    {isReportingSick ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
                                    Anmäl Sjuk
                                </button>
                            )}
                            {hasApplied && !showApplyButton && <button disabled type="button" className="btn btn-success-outline flex-1 sm:flex-none">Redan Ansökt</button>}
                        </div>
                    </div>
                </div>
            </div>
            {isEmployerModalOpen && shift.employer_id && <EmployerProfileViewModal isOpen={isEmployerModalOpen} onClose={handleCloseEmployerModal} employerId={shift.employer_id} />}
            <style jsx>{`
        .btn-success { border-color: transparent; color: white; background-color: #16A34A; }
        .animate-pulse-slow { animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 50% { opacity: .8; } }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
                .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-width: 1px; font-weight: 500; border-radius: 0.375rem; transition: all 0.15s ease-in-out; }
                .btn:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-primary { border-color: transparent; color: white; background-color: #2563EB; } .btn-primary:hover:not(:disabled) { background-color: #1D4ED8; }
                .btn-secondary { border-color: #D1D5DB; color: #374151; background-color: white; } .btn-secondary:hover { background-color: #F9FAFB; }
                .btn-success-outline { border-color: #16A34A; color: #15803D; background-color: white; } .btn-success-outline:hover { background-color: #F0FDF4; }
                .btn-warning { border-color: transparent; color: white; background-color: #F97316; } .btn-warning:hover:not(:disabled) { background-color: #EA580C; }
                .btn-disabled-custom { background-color: #E5E7EB; color: #6B7280; border-color: #D1D5DB; }
                .icon-style { @apply h-5 w-5 mr-2 text-gray-400 flex-shrink-0; }
            `}</style>
        </>
    );
}

// NOTE: The original file had a default export for ShiftDetailsModal. 
// Assuming this is a shared convention, keeping it.
// If this file should be named ShiftdetailsmodalPharm, the export should be named accordingly.
export default ShiftDetailsModal; // Renaming the export to match the filename