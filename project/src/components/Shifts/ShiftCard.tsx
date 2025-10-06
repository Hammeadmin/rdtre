// src/components/Shifts/ShiftCard.tsx
import React from 'react';
import type { ShiftNeed, UserRole, UserProfile } from '../../types';
import { format, parseISO, isPast, isToday, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
    MapPin, Calendar, Clock, Briefcase, Building2, DollarSign, Eye, Send,
    Edit3, Trash2, Flame, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';


const roleDisplayMap: Record<string, string> = {
    pharmacist: 'Farmaceut',
    säljare: 'Säljare',
    egenvårdsrådgivare: 'Egenvårdsrådgivare'
};
// --- All helper functions are preserved exactly as they were ---
const canApplyForShift = (
    profile: UserProfile | null | undefined,
    shiftRequiredRole: UserRole | null | undefined
): { canApply: boolean; reason?: string } => {
    if (!profile || !profile.role || !['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile.role as UserRole)) {
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

function formatLunchDuration(minutes: number | null | undefined): string | null {
    if (minutes === null || minutes === undefined || minutes === 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let durationStr = '';
    if (hours > 0) durationStr += `${hours}h `;
    if (mins > 0) durationStr += `${mins}min`;
    return durationStr.trim() || null;
}

const formatDateSafe = (dateString: string | null | undefined, formatPattern: string = 'd MMM yy'): string => {
    if (!dateString) return 'N/A';
    try {
        const dateObj = parseISO(dateString);
        if (isValid(dateObj)) {
            return format(dateObj, formatPattern, { locale: sv });
        }
        return 'Ogiltigt Datum';
    } catch (e) {
        return 'Datumfel';
    }
};

interface ShiftCardProps {
    shift: ShiftNeed;
    onViewDetails: (shift: ShiftNeed) => void;
    onApply?: (shift: ShiftNeed) => void;
    currentUserRole: UserRole | 'anonymous';
    hasApplied?: boolean;
    profile: UserProfile | null | undefined;
    onAdminEdit?: (shiftToEdit: ShiftNeed) => void;
    onAdminDelete?: (shiftId: string) => void;
}

// DetailItem sub-component for a clean and consistent layout
const DetailItem = ({ icon, children }: { icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-start text-sm text-gray-600">
        <div className="w-5 mr-3 text-gray-400 flex-shrink-0 pt-0.5">{icon}</div>
        <div className="truncate">{children}</div>
    </div>
);


export function ShiftCard({
    shift, onViewDetails, onApply, currentUserRole, hasApplied,
    profile, onAdminEdit, onAdminDelete
}: ShiftCardProps) {

  const displayRole = shift.required_role ? (roleDisplayMap[shift.required_role] || shift.required_role) : 'Ej specificerad';


    // --- All your logic for calculating state is preserved ---
    const shiftDateObj = shift.date ? parseISO(shift.date) : null;
    const isValidShiftDate = shiftDateObj && isValid(shiftDateObj);
    const isShiftPast = isValidShiftDate ? (isPast(shiftDateObj) && !isToday(shiftDateObj)) : false;
    const applicantRoles: UserRole[] = ['pharmacist', 'säljare', 'egenvårdsrådgivare'];
    const isApplicant = currentUserRole && applicantRoles.includes(currentUserRole as UserRole);
    const isAdmin = currentUserRole === 'admin';
    const isShiftOwner = currentUserRole === 'employer' && profile?.id === shift.employer_id;
    const eligibility = canApplyForShift(profile, shift.required_role);
    const showApplyButton = isApplicant && shift.status === 'open' && !isShiftPast && typeof onApply === 'function';
    const showManagementActions = (isAdmin || isShiftOwner) && onAdminEdit && onAdminDelete;
    const formattedLunchDisplay = formatLunchDuration(shift.lunch_duration_minutes);
    const displayDate = formatDateSafe(shift.date, 'eeee d MMMM yy');
    const totalRate = (shift.hourly_rate || 0) + (shift.urgent_pay_adjustment || 0);
    const encodedLocation = shift.location ? encodeURIComponent(shift.location) : '';
    const googleMapsUrl = encodedLocation ? `https://www.google.com/maps/search/?api=1&query=${encodedLocation}` : '#';

    // --- Click handlers with stopPropagation are preserved ---
    const handleViewDetailsClick = (e: React.MouseEvent) => { e.stopPropagation(); onViewDetails(shift); };
    const handleApplyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onApply) {
            if (eligibility.canApply) onApply(shift);
            else toast.error(eligibility.reason || "Du kan inte söka detta pass.", { duration: 4000 });
        }
    };
    const handleAdminEditClick = (e: React.MouseEvent) => { e.stopPropagation(); if(onAdminEdit) onAdminEdit(shift); };
    const handleAdminDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); if(onAdminDelete) onAdminDelete(shift.id); };

    // --- Redesigned conditional styling for the card border and text ---
    const statusStyles = {
        open: { border: 'border-gray-200', text: 'text-gray-800' },
        filled: { border: 'border-green-300', text: 'text-green-800' },
        cancelled: { border: 'border-red-300', text: 'text-red-800' },
        completed: { border: 'border-gray-300', text: 'text-gray-500' }
    };
    const currentStyle = statusStyles[shift.status] || statusStyles.open;

    return (
        <div
            onClick={handleViewDetailsClick}
            className={`card-interactive relative flex flex-col h-full bg-white ${currentStyle.border}`}
            role="listitem"
        >  
            {/* --- FIX: Urgent banner moved to the top-right --- */}
            {shift.is_urgent && (
                <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center z-10">
                    <Flame size={14} className="mr-1.5" />
                    <span>AKUT</span>
                </div>
            )}
            
            <div className="p-5 flex-grow flex flex-col">
                <div className="flex-grow">
                    {/* --- FIX: Added right-padding to title to avoid overlap with banner --- */}
                    <h3 className={`text-lg font-bold pr-16 ${currentStyle.text}`}>
                        {shift.title || `Pass för ${shift.required_role || 'personal'}`}
                    </h3>

                    <div className="flex items-center text-sm text-gray-500 mt-1 mb-4">
                        <Building2 size={14} className="mr-2 flex-shrink-0" />
                        <span>{shift.employer?.pharmacy_name || 'Apotek'}</span>
                    </div>
                    
                    <div className="space-y-3 border-t pt-4">
                        <DetailItem icon={<Calendar size={14} />}>{displayDate}</DetailItem>
                        <DetailItem icon={<Clock size={14} />}>
                            {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                            {formattedLunchDisplay && <span className="text-xs ml-2 text-gray-500">({formattedLunchDisplay} lunch)</span>}
                        </DetailItem>
                        <DetailItem icon={<MapPin size={14} />}>
                            {shift.location ? (
                                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                    {shift.location}
                                </a>
                            ) : (
                                'Ej specificerad'
                            )}
                        </DetailItem>
                        {/* Use the new displayRole variable here */}
                        <DetailItem icon={<Briefcase size={14} />}>Krävd roll: {displayRole}</DetailItem>
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t flex justify-between items-center">
                    <div className="font-bold text-lg text-gray-800">
                        {totalRate > 0 ? `${totalRate.toFixed(0)} kr/tim` : 'Pris N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                        {showApplyButton && (
                            <button onClick={handleApplyClick} disabled={hasApplied || !eligibility.canApply} className="btn btn-primary btn-sm">
                                {hasApplied ? <><CheckCircle size={14} className="mr-1.5"/>Ansökt</> : 'Ansök'}
                            </button>
                        )}
                        {showManagementActions && (
                            <>
                                <button onClick={handleAdminEditClick} className="btn btn-secondary btn-sm p-2" title="Redigera"><Edit3 size={14} /></button>
                                <button onClick={handleAdminDeleteClick} className="btn btn-danger-outline btn-sm p-2" title="Ta bort"><Trash2 size={14} /></button>
                            </>
                        )}
                         {!showApplyButton && !showManagementActions && (
                             <button onClick={handleViewDetailsClick} className="btn btn-secondary btn-sm">
                                 <Eye size={14} className="mr-1.5"/> Visa
                             </button>
                         )}
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 ease-in-out; }
                .btn:not(:disabled):hover { @apply -translate-y-px shadow-md; }
                .btn-sm { @apply px-3 py-1.5 text-xs; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-danger-outline { @apply border-red-300 text-red-600 bg-white hover:bg-red-50 focus:ring-red-500; }
            `}</style>
        </div>
    );
}