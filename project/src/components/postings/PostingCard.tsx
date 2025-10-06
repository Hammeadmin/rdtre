// src/components/postings/PostingCard.tsx
import React from 'react';
import { MapPin, CalendarDays, Building2, Eye, Briefcase, Info as InfoIcon, Send, Edit3, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { JobPosting, UserRole } from '../../types';
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'react-hot-toast';


const roleDisplayMap: Record<string, string> = {
    pharmacist: 'Farmaceut',
    säljare: 'Säljare',
    egenvårdsrådgivare: 'Egenvårdsrådgivare'
};


const getDisplayStatus = (posting: JobPosting, context?: 'my-postings') => {
    const now = new Date();
    // Ensure dates are valid Date objects
    const startDate = new Date(posting.period_start_date);
    const endDate = new Date(posting.period_end_date);
  
    // For the "Mina uppdrag" / my-postings context
    if (context === 'my-postings') {
        if (posting.status === 'completed' || endDate < now) {
            return { text: 'Slutfört', color: 'bg-gray-200 text-gray-800' };
        }
        if (startDate > now) {
            return { text: 'Kommande', color: 'bg-blue-200 text-blue-800' };
        }
        if (startDate <= now && endDate >= now) {
            return { text: 'Pågående', color: 'bg-green-200 text-green-800' };
        }
    }

    // Default behavior for all other views
    switch (posting.status) {
        case 'open':
            return { text: 'Öppen', color: 'bg-yellow-200 text-yellow-800' };
        case 'filled':
            // If it's filled but the end date is in the past, it's effectively completed.
            if (endDate < now) return { text: 'Slutfört', color: 'bg-gray-200 text-gray-800' };
            return { text: 'Tillsatt', color: 'bg-red-200 text-red-800' };
        case 'completed':
            return { text: 'Slutfört', color: 'bg-gray-200 text-gray-800' };
        case 'cancelled':
            return { text: 'Inställd', color: 'bg-pink-200 text-pink-800' };
        default:
            return { text: posting.status, color: 'bg-gray-200 text-gray-800' };
    }
};


interface PostingCardProps {
  posting: JobPosting & { employer?: { full_name?: string | null } | null };
  onViewDetails: (postingId: string) => void;
  currentUserRole: UserRole | 'anonymous';
  onViewEmployerProfile: (employerId: string) => void;
  onApply?: () => void; 
  hasApplied?: boolean;
  onAdminEdit?: (postingToEdit: JobPosting) => void;
  onAdminDelete?: (postingId: string) => void;
  canApplyInfo: { canApply: boolean; reason?: string }; // Updated
  // profileVerified is implicitly handled by canApplyInfo now
}

const formatDateSafe = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const dateObj = parseISO(dateString);
        if (isValid(dateObj)) return format(dateObj, 'd MMM yy', { locale: sv });
    } catch (e) { console.error("Error formatting date:", dateString, e); }
    return dateString; 
};

const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'filled': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

export function PostingCard({
  posting,
  onViewDetails,
  currentUserRole,
  onViewEmployerProfile,
  onApply,
  hasApplied,
  onAdminEdit,
  onAdminDelete,
  canApplyInfo
}: PostingCardProps) {
  const employeeRoles: UserRole[] = ['pharmacist', 'säljare', 'egenvårdsrådgivare'];
  const isEmployee = currentUserRole && employeeRoles.includes(currentUserRole as UserRole);
  const isAdmin = currentUserRole === 'admin';
  const displayRole = posting.required_role ? (roleDisplayMap[posting.required_role] || posting.required_role) : 'Ej specificerad';


  const handleOpenEmployerModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (posting.employer_id) {
      onViewEmployerProfile(posting.employer_id);
    } else {
        toast.error("Arbetsgivarinformation saknas.");
    }
  };
  
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onViewDetails(posting.id);
  };

  const showApplyButton = isEmployee && posting.status === 'open' && onApply;
    const viewContext = (hasApplied && onApply === undefined) ? 'my-postings' : undefined;
    const displayStatus = getDisplayStatus(posting, viewContext);
  return (
    <>
      <div 
        className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group ${isAdmin || !showApplyButton ? 'cursor-default' : 'cursor-pointer'}`}
        onClick={isAdmin || !showApplyButton ? undefined : handleCardClick}
        role="listitem"
        aria-label={`Jobbannons: ${posting.title}`}
      >
        <div className="p-5 flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 
              className={`text-lg font-semibold text-gray-900 transition-colors duration-200 line-clamp-2 ${!isAdmin && showApplyButton ? 'group-hover:text-blue-600' : ''}`}
              onClick={ (e) => { e.stopPropagation(); onViewDetails(posting.id); }}
              style={{cursor: 'pointer'}}
            >
              {posting.title}
            </h3>
            {posting.status && (                     <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${displayStatus.color}`}>
                        {displayStatus.text}
                    </span> )}
          </div>
          {posting.employer_name && ( <div className="flex items-center text-sm text-gray-700 mb-1"> <Building2 size={14} className="mr-2 text-gray-400 flex-shrink-0" /> <span>{posting.employer_name}</span> {(isEmployee || isAdmin) && posting.employer_id && ( <button onClick={handleOpenEmployerModalClick} className="ml-2 text-xs text-blue-600 hover:text-blue-700 hover:underline p-0.5 flex items-center" title="Visa arbetsgivarprofil"> <InfoIcon size={12} className="mr-0.5" /> Profil </button> )} </div> )}
          {posting.location && ( <div className="flex items-center text-sm text-gray-600 mb-1"> <MapPin size={14} className="mr-2 text-gray-400 flex-shrink-0" /> <span>{posting.location}</span> </div> )}
          <div className="flex items-center text-sm text-gray-600 mb-3"> <CalendarDays size={14} className="mr-2 text-gray-400 flex-shrink-0" /> <span> {formatDateSafe(posting.period_start_date)} - {formatDateSafe(posting.period_end_date)} </span> </div>
          {posting.required_role && ( <div className="flex items-center text-sm text-gray-700 mb-3"> <Briefcase size={14} className="mr-2 text-gray-400 flex-shrink-0" /> <span>Roll: <span className="font-medium">{displayRole}</span></span> </div> )}

          {posting.description && ( <p className="text-sm text-gray-600 line-clamp-3 mb-3"> {posting.description} </p> )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button onClick={(e) => { e.stopPropagation(); onViewDetails(posting.id); }} className="w-full sm:w-auto btn btn-secondary"> <Eye size={16} className="mr-2" /> Visa Detaljer </button>
          
          {showApplyButton && (
            <div className="relative group w-full sm:w-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); if (canApplyInfo.canApply && onApply) onApply(); }} 
                disabled={hasApplied || !canApplyInfo.canApply} 
                className={`w-full btn ${ hasApplied ? 'btn-success cursor-not-allowed' : (canApplyInfo.canApply ? 'btn-primary' : 'btn-disabled-custom') }`}
                title={!canApplyInfo.canApply ? canApplyInfo.reason : (hasApplied ? "Redan ansökt" : "Ansök nu")}
              >
                {hasApplied ? 'Ansökt' : canApplyInfo.canApply ? <><Send className="h-4 w-4 mr-2" /> Ansök Nu</> : 'Ej Behörig'}
              </button>
              {!hasApplied && !canApplyInfo.canApply && canApplyInfo.reason && (
                <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-xs bg-black text-white text-xs rounded py-1.5 px-2.5 z-10 shadow-lg text-center">
                  <AlertTriangle className="inline h-4 w-4 mr-1 text-yellow-400" />
                  {canApplyInfo.reason}
                </div>
              )}
            </div>
          )}
          
          {isAdmin && onAdminEdit && onAdminDelete && (
             <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={(e) => { e.stopPropagation(); onAdminEdit(posting); }} className="flex-1 sm:flex-none btn btn-secondary-outline btn-xs" title="Redigera (Admin)"><Edit3 size={14} className="mr-1" /> Redigera</button>
              <button onClick={(e) => { e.stopPropagation(); onAdminDelete(posting.id); }} className="flex-1 sm:flex-none btn btn-danger-outline btn-xs" title="Ta bort (Admin)"><Trash2 size={14} className="mr-1" /> Ta bort</button>
            </div>
          )}
        </div>
      </div>
            <style jsx>{`
            .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-width: 1px; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition-colors: background-color 0.15s ease-in-out; }
            .btn:focus { outline: 2px solid transparent; outline-offset: 2px; ring: 2px; ring-offset: 2px; }
            .btn:disabled { opacity: 0.7; cursor: not-allowed; }
            .btn-xs { @apply px-2.5 py-1.5 text-xs; }
            .btn-primary { border-color: transparent; color: white; background-color: #2563EB; } .btn-primary:hover:not(:disabled) { background-color: #1D4ED8; } .btn-primary:focus { ring-color: #3B82F6; }
            .btn-secondary { border-color: #D1D5DB; color: #374151; background-color: white; } .btn-secondary:hover { background-color: #F9FAFB; } .btn-secondary:focus { ring-color: #4F46E5; }
            .btn-secondary-outline { border-color: #6B7280; color: #4B5563; background-color: white; } .btn-secondary-outline:hover { background-color: #F3F4F6; } .btn-secondary-outline:focus { ring-color: #6B7280; }
            .btn-danger-outline { border-color: #EF4444; color: #DC2626; background-color: white; } .btn-danger-outline:hover { background-color: #FEE2E2; } .btn-danger-outline:focus { ring-color: #EF4444; }
            .btn-success { border-color: transparent; color: white; background-color: #16A34A; } .btn-success:hover:not(:disabled) { background-color: #15803D; } .btn-success:focus { ring-color: #22C55E; }
      `}</style>
    </>
  );
}