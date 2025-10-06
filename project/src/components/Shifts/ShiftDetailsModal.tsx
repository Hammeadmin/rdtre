// src/components/Shifts/ShiftDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, MapPin, Info, Save, Edit, Edit2, Trash2, X, AlertTriangle, Briefcase, DollarSign, User, ShieldCheck, Loader2 } from 'lucide-react';
import { format, isValid, parseISO, isPast, startOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';
import { supabase } from '../../lib/supabase'; // Ensure this path is correct
import { toast } from 'react-hot-toast';
import type { ShiftNeed, UserRole, Database } from '../../types';
import { updateShift, markShiftCompleted } from '../../lib/shifts'; // Ensure this path is correct
import { updateShiftStatus } from '../../lib/shifts';
import { reportSickForShift } from '../../lib/shifts'; // Add this import if not present

// --- TYPE DEFINITIONS ---
interface ShiftDataForModal extends Omit<ShiftNeed, 'required_role' | 'required_experience' | 'date'> {
    id: string;
    employer_id?: string;
    title: string;
    description?: string | null;
    required_role: string | null;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    lunch?: string | null;
    location?: string | null;
    status: string;
    required_experience?: string[] | null;
    is_urgent?: boolean | null;
    urgent_pay_adjustment?: number | null;
    payroll_processed?: boolean;
}

interface ShiftDetailsModalProps {
    shift: (ShiftDataForModal & { applicant_name?: string }) | null;
    onClose: () => void;
    // MODIFIED: onUpdate can now accept data, making it flexible.
    onUpdate?: (updatedData?: Partial<ShiftDataForModal>) => void;
    currentUserRole?: UserRole | 'anonymous';
}


// --- HELPER FUNCTIONS ---
function formatLunchDuration(intervalString: string | null | undefined): string | null {
     if (!intervalString || typeof intervalString !== 'string') { return null; }
     const parts = intervalString.split(':');
     if (parts.length >= 2) {
         const hours = parseInt(parts[0], 10);
         const minutes = parseInt(parts[1], 10);
         if (!isNaN(hours) && !isNaN(minutes)) {
             const totalMinutes = hours * 60 + minutes;
             if (totalMinutes === 0) return null;
             if (hours > 0) {
                 return `${hours}t ${minutes}min`; // Swedish 't' for hour
             } else {
                 return `${minutes}min`;
             }
         }
     }
     const minutesOnly = parseInt(intervalString, 10);
     if (!isNaN(minutesOnly) && minutesOnly > 0 && !intervalString.includes(':')) {
         return `${minutesOnly} min`;
     }
     return intervalString;
}

const extractRoleString = (role: any): string => {
  if (typeof role === 'string') return role;
  if (Array.isArray(role) && role.length > 0) {
    return String(role[0]);
  }
  return '';
};




//--- COMPONENT ---
export function ShiftDetailsModal({ shift, onClose, onUpdate, currentUserRole }: ShiftDetailsModalProps) {
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingPayroll, setProcessingPayroll] = useState(false);
   const [isReportingSick, setIsReportingSick] = useState(false);

    const [formData, setFormData] = useState({
        title: '', description: '', date: '', start_time: '', end_time: '',
        required_experience: [] as string[], status: 'open', lunch: '', location: '',
        required_role: '', is_urgent: false, urgent_pay_adjustment: '',
    });

    useEffect(() => {
        setError(null);
        if (shift) {
            const roleString = extractRoleString(shift.required_role);
            setFormData({
                title: shift.title ?? '',
                description: shift.description ?? '',
                date: shift.date ?? '',
                start_time: shift.start_time?.slice(0, 5) ?? '',
                end_time: shift.end_time?.slice(0, 5) ?? '',
                required_experience: shift.required_experience ?? [],
                status: shift.status ?? 'open',
                lunch: shift.lunch ?? '',
                location: shift.location ?? '',
                required_role: roleString,
                is_urgent: shift.is_urgent ?? false,
                urgent_pay_adjustment: shift.urgent_pay_adjustment?.toString() ?? '',
            });
            setEditing(false);
        } else {
            setFormData({
                title: '', description: '', date: '', start_time: '', end_time: '',
                required_experience: [], status: 'open', lunch: '', location: '',
                required_role: '', is_urgent: false, urgent_pay_adjustment: ''
            });
            setEditing(false);
        }
    }, [shift]);


    let displayFormattedDate = 'Datum N/A';
    if (formData.date) {
        try {
            const dateObj = parseISO(formData.date + 'T00:00:00');
            if (isValid(dateObj)) {
                displayFormattedDate = format(dateObj, 'd MMMM yyyy', { locale: sv });
            }
        } catch (e) { console.error("Error formatting display date:", e); }
    }
    const displayStartTime = formData.start_time || 'N/A';
    const displayEndTime = formData.end_time || 'N/A';
    const displayFormattedLunch = formatLunchDuration(formData.lunch);
    const displayUrgentPay = formData.is_urgent && formData.urgent_pay_adjustment
        ? `+ ${parseFloat(formData.urgent_pay_adjustment).toFixed(2)} SEK/timme (Brådskande)`
        : null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => {
                const newState = { ...prev, [id]: checked };
                if (id === 'is_urgent' && !checked) {
                    newState.urgent_pay_adjustment = '';
                }
                return newState;
            });
        } else if (id === 'urgent_pay_adjustment') {
            const numericValue = value.replace(/[^0-9.]/g, '');
            if ((numericValue.match(/\./g) || []).length <= 1) {
                setFormData(prev => ({ ...prev, [id]: numericValue }));
            }
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleExperienceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const experienceArray = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, required_experience: experienceArray }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shift) {
            console.error("handleSubmit: No shift data available.");
            return;
        }
        setError(null);

        if (!formData.title.trim()) { toast.error("Titel är obligatoriskt."); return; }
        if (!formData.required_role) { toast.error("Krävd Roll måste väljas."); return; }
        try {
            const dateObjForValidation = parseISO(formData.date + 'T00:00:00');
            if (isNaN(dateObjForValidation.getTime())) throw new Error("Invalid date provided.");
        } catch { toast.error("Ogiltigt datumformat. Använd ÅÅÅÅ-MM-DD."); return; }
        if (!formData.start_time || !formData.end_time) { toast.error("Start- och sluttid är obligatoriska."); return; }
        if (formData.start_time >= formData.end_time) { toast.error("Sluttiden måste vara efter starttiden."); return; }
        if (formData.is_urgent) {
            if (!formData.urgent_pay_adjustment.trim()) { toast.error('Ersättningstillägg är obligatoriskt när passet är markerat som brådskande.'); return; }
            const adjustmentNum = parseFloat(formData.urgent_pay_adjustment);
            if (isNaN(adjustmentNum) || adjustmentNum <= 0) { toast.error('Ersättningstillägg måste vara ett positivt tal.'); return; }
        }

        setLoading(true);

        const adjustment = formData.is_urgent && formData.urgent_pay_adjustment ? parseFloat(formData.urgent_pay_adjustment) : null;
        
        // ** THIS IS THE KEY CHANGE **
        // Check if the onUpdate function has parameters. If so, it's the new version
        // from ScheduleGenerator. If not, it's the old version from other pages.
        const isScheduleGenerator = onUpdate && onUpdate.length > 0;

        const updateData: Partial<ShiftDataForModal> = {
            id: shift.id, // Always include the ID
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            date: formData.date,
            start_time: `${formData.start_time}:00`,
            end_time: `${formData.end_time}:00`,
            required_role: formData.required_role,
            required_experience: formData.required_experience.length > 0 ? formData.required_experience : null,
            status: formData.status,
            lunch: formData.lunch || null,
            location: formData.location.trim() || null,
            is_urgent: formData.is_urgent,
            urgent_pay_adjustment: adjustment,
        };
        
        if (isScheduleGenerator) {
            // New behavior: Just call onUpdate with the data and let the parent handle it.
            if (onUpdate) {
                onUpdate(updateData);
            }
            // The parent component will now handle toast messages and closing the modal.
            setLoading(false);
            return; // Stop execution here
        }

        // --- Original Behavior (for other parts of the site) ---
        try {
            const { success, error: updateError } = await updateShift(shift.id, updateData);
            if (!success) {
                throw new Error(updateError || 'Uppdatering misslyckades');
            }
            toast.success('Passet uppdaterades!');
            setEditing(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Misslyckades med att uppdatera passet';
            setError(message); toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelShift = async () => {
        if (!shift || shift.status === 'cancelled') {
            toast.error('Passet är redan avbokat eller kan inte hittas.'); return;
        }
        if (!window.confirm('Är du säker på att du vill avboka detta pass? Åtgärden kan inte ångras.')) return;
        setLoading(true); setError(null);
        try {
            const { success, error: cancelError } = await updateShift(shift.id, { status: 'cancelled' });
            if (!success) throw new Error(cancelError || 'Avbokning misslyckades');
            toast.success('Passet avbokades!');
            if (typeof onUpdate === 'function') onUpdate();
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Misslyckades med att avboka passet';
            setError(message); toast.error(message);
        } finally { setLoading(false); }
    };

    const handleMarkAsCompleted = async () => {
    if (!shift?.id) return;

    if (!window.confirm("Är du säker på att du vill markera detta pass som slutfört?")) {
        return;
    }

    setProcessingPayroll(true); // We can re-use this state for loading
    const toastId = toast.loading("Märker pass som slutfört...");

    try {
        // Use our new, simple helper function
        const result = await updateShiftStatus(shift.id, 'completed');

        if (result.success) {
            toast.success("Passet har markerats som slutfört!", { id: toastId });
            if (onUpdate) onUpdate(); // Refresh the dashboard data
            onClose();               // Close the modal
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast.error(`Misslyckades: ${error.message}`, { id: toastId });
    } finally {
        setProcessingPayroll(false);
    }
};
    
    const isEmployer = currentUserRole === 'employer' || currentUserRole === 'admin';
    const canMarkComplete = shift?.date && isValid(parseISO(shift.date)) ? (isEmployer && shift?.status === 'filled' && isPast(startOfDay(parseISO(shift.date)))) : false;



    if (!shift) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 px-6 pt-6 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        {editing ? 'Redigera Pass' : 'Passdetaljer'}
                        {!editing && formData.is_urgent && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <AlertTriangle className="-ml-0.5 mr-1 h-4 w-4" /> Brådskande
                            </span>
                        )}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Stäng">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2" role="alert">
                        <AlertTriangle className="h-5 w-5 text-red-600"/>
                        <span>{error}</span>
                    </div>
                )}

                <form id="shift-details-form" onSubmit={handleSubmit} className={`px-6 pb-6 overflow-y-auto flex-grow ${editing ? 'space-y-5' : 'space-y-3'}`}>
                    {!editing && (
                        <dl className="space-y-4">
                               {isEmployer && (shift.status === 'filled' || shift.status === 'completed' || shift.status === 'processed') && shift.applicant_name && (
                                   <div className="grid grid-cols-3 gap-x-4 items-center bg-green-50 p-3 rounded-lg">
                                       <dt className="text-sm font-medium text-green-700 col-span-1 flex items-center">
                                          <ShieldCheck className="inline-flex align-middle h-5 w-5 mr-1.5 text-green-600" /> Tillsatt av
                                      </dt>
                                       <dd className="text-green-900 font-bold col-span-2 text-base">{shift.applicant_name}</dd>
                                   </div>
                               )}
                            <div className="grid grid-cols-3 gap-x-4 items-start">
                                <dt className="text-sm font-medium text-gray-500 col-span-1 pt-1">Titel</dt>
                                <dd className="text-gray-900 col-span-2">{formData.title}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4 items-start">
                                <dt className="text-sm font-medium text-gray-500 col-span-1 pt-1">Krävd Roll</dt>
                                <dd className="text-gray-900 col-span-2">{formData.required_role || <span className="text-gray-500 italic">Ej specificerad</span>}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4">
                                <dt className="text-sm font-medium text-gray-500 col-span-1 self-start pt-1">Beskrivning</dt>
                                <dd className="text-gray-900 col-span-2 whitespace-pre-wrap min-h-[2em]">{formData.description || <span className="text-gray-500 italic">N/A</span>}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4 items-start">
                                <dt className="text-sm font-medium text-gray-500 col-span-1 pt-1 flex items-center"><MapPin className="inline-flex align-middle h-4 w-4 mr-1 text-gray-400" /> Plats</dt>
                                <dd className="text-gray-900 col-span-2">{formData.location || <span className="text-gray-500 italic">Ej specificerad</span>}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4 items-center">
                                <dt className="text-sm font-medium text-gray-500 col-span-1 flex items-center"><Calendar className="inline-flex align-middle h-4 w-4 mr-1 text-gray-400" /> Datum</dt>
                                <dd className="text-gray-900 col-span-2">{displayFormattedDate}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4 items-center">
                                <dt className="text-sm font-medium text-gray-500 col-span-1 flex items-center"><Clock className="inline-flex align-middle h-4 w-4 mr-1 text-gray-400" /> Tid</dt>
                                <dd className="text-gray-900 col-span-2">{displayStartTime} - {displayEndTime}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4 items-center">
                                <dt className="text-sm font-medium text-gray-500 col-span-1">Lunch</dt>
                                <dd className="text-gray-900 col-span-2">{displayFormattedLunch || <span className="text-gray-500 italic">Ej specificerad</span>}</dd>
                            </div>
                            {displayUrgentPay && (
                                <div className="grid grid-cols-3 gap-x-4 items-center bg-orange-50 p-2 rounded-md">
                                    <dt className="text-sm font-medium text-orange-700 col-span-1 flex items-center"><DollarSign className="inline-flex align-middle h-4 w-4 mr-1 text-orange-600" /> Ersättningstillägg</dt>
                                    <dd className="text-orange-900 font-semibold col-span-2">{displayUrgentPay}</dd>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-x-4 items-start">
                                <dt className="text-sm font-medium text-gray-500 col-span-1 pt-1">Erfarenhet</dt>
                                <dd className="text-gray-900 col-span-2 flex flex-wrap gap-1 items-center min-h-[2rem]">
                                    {formData.required_experience && formData.required_experience.length > 0 ? (
                                        formData.required_experience.map((exp, i) => (
                                            <span key={i} className="tag-style"> {exp} </span>
                                        ))
                                    ) : ( <span className="text-gray-500 italic text-sm">Ej specificerad</span> )}
                                </dd>
                            </div>
                             {shift?.payroll_processed && (
                                <div className="grid grid-cols-3 gap-x-4 items-center bg-green-50 p-2 rounded-md">
                                    <dt className="text-sm font-medium text-green-700 col-span-1 flex items-center"><CheckCircle className="inline-flex align-middle h-4 w-4 mr-1 text-green-600" /> Löneunderlag</dt>
                                    <dd className="text-green-900 font-semibold col-span-2">Skapat</dd>
                                </div>
                            )}
                        </dl>
                    )}
                    {editing && (
                        <>
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                                <input id="title" type="text" value={formData.title} onChange={handleInputChange} required className="w-full input-style" />
                            </div>
                            <div>
                                <label htmlFor="required_role" className="block text-sm font-medium text-gray-700 mb-1">Krävd Roll <span className="text-red-500">*</span></label>
                                <select id="required_role" name="required_role" value={formData.required_role} onChange={handleInputChange} required className="w-full input-style bg-white">
                                    <option value="" disabled>-- Välj Roll --</option>
                                    <option value="pharmacist">Farmaceut</option>
                                    <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                                    <option value="säljare">Säljare</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                                <textarea id="description" value={formData.description ?? ''} onChange={handleInputChange} className="w-full input-style" rows={3} />
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Plats</label>
                                <input type="text" id="location" value={formData.location ?? ''} onChange={handleInputChange} className="w-full input-style" placeholder="T.ex., Stora Apoteket, Storgatan 1, Stad" />
                            </div>
                            <div className="space-y-4 p-4 border border-orange-300 bg-orange-50 rounded-lg">
                                <div className="flex items-center">
                                    <input type="checkbox" id="is_urgent" name="is_urgent" checked={formData.is_urgent} onChange={handleInputChange} className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"/>
                                    <label htmlFor="is_urgent" className="ml-3 block text-sm font-medium text-orange-800"> Markera passet som BRÅDSKANDE <AlertTriangle className="inline h-4 w-4 ml-1 text-orange-600"/></label>
                                </div>
                                {formData.is_urgent && (
                                    <div>
                                        <label htmlFor="urgent_pay_adjustment" className="block text-sm font-medium text-gray-700 mb-1"> Brådskande Ersättningstillägg (SEK/timme extra) <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                            <input type="text" inputMode="decimal" id="urgent_pay_adjustment" name="urgent_pay_adjustment" value={formData.urgent_pay_adjustment} onChange={handleInputChange} required={formData.is_urgent} className="pl-10 w-full input-style" placeholder="T.ex., 50.00"/>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Ange det extra beloppet per timme för detta brådskande pass.</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="lunch" className="block text-sm font-medium text-gray-700 mb-1">Lunchrast</label>
                                <select id="lunch" value={formData.lunch || ''} onChange={handleInputChange} className="w-full input-style bg-white">
                                    <option value="">Ej specificerad</option> <option value="00:15:00">15 min</option>
                                    <option value="00:30:00">30 min</option> <option value="00:45:00">45 min</option>
                                    <option value="01:00:00">1 timme</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Datum</label><input id="date" type="date" value={formData.date ?? ''} onChange={handleInputChange} required className="w-full input-style" /></div>
                                <div><label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">Starttid</label><input id="start_time" type="time" value={formData.start_time} onChange={handleInputChange} required className="w-full input-style" /></div>
                                <div><label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">Sluttid</label><input id="end_time" type="time" value={formData.end_time} onChange={handleInputChange} required className="w-full input-style" /></div>
                            </div>
                            <div>
                                <label htmlFor="required_experience" className="block text-sm font-medium text-gray-700 mb-1">Krävd Erfarenhet (kommaseparerad)</label>
                                <input type="text" id="required_experience" value={Array.isArray(formData.required_experience) ? formData.required_experience.join(', ') : ''} onChange={handleExperienceChange} className="w-full input-style" placeholder="Ange färdigheter (kommaseparerade)" />
                            </div>
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Pass Status</label>
                                <select id="status" value={formData.status} onChange={handleInputChange} className="w-full input-style bg-white" disabled={shift?.status === 'cancelled' || shift?.status === 'completed'}>
                                    <option value="open">Öppet</option>
                                    <option value="filled">Tillsatt</option>
                                    {shift?.status === 'cancelled' && <option value="cancelled" disabled>Avbokat</option>}
                                    {shift?.status === 'completed' && <option value="completed" disabled>Slutfört</option>}
                                </select>
                            </div>
                        </>
                    )}
                </form>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200 px-6 pb-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {!editing && shift?.status !== 'cancelled' && shift?.status !== 'completed' && !shift?.payroll_processed && (
                            <button type="button" onClick={handleCancelShift} disabled={loading || processingPayroll} className="btn btn-danger-outline">
                                <AlertTriangle className="h-4 w-4 mr-2" /> Avboka Pass
                            </button>
                        )}
                        <span className={`status-badge status-${formData.status.toLowerCase()}`}>
                           {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                        </span>
                         {editing && (shift?.status === 'cancelled' || shift?.status === 'completed') && (
                            <span className="text-sm text-red-600 italic">Kan inte redigera ett avbokat eller slutfört pass.</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {editing ? (
                            <>
                                <button type="button" onClick={() => { setEditing(false); }} disabled={loading} className="btn btn-secondary"> Avbryt </button>
                                <button 
                                    type="submit" 
                                    form="shift-details-form" 
                                    disabled={loading || shift?.status === 'cancelled' || shift?.status === 'completed'} 
                                    className="btn btn-primary min-w-[130px]" 
                                    title={(shift?.status === 'cancelled' || shift?.status === 'completed') ? 'Kan inte spara ett avbokat eller slutfört pass' : 'Spara Ändringar'}
                                >
                                    {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />} Spara Ändringar
                                </button>
                            </>
                        ) : (
                            <>
                                {isEmployer && canMarkComplete && !shift?.payroll_processed && (
                                   <button
    type="button"
    onClick={handleMarkAsCompleted} // Use the new handler
    disabled={processingPayroll || loading}
    className="btn btn-success"
>
    {processingPayroll ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle className="h-5 w-5 mr-2" />}
    Markera som Slutfört
</button>
                                )}
                                             
                      

            <button type="button" onClick={onClose} className="btn btn-secondary">
                Stäng
            </button>
                            
                                {shift?.status !== 'cancelled' && shift?.status !== 'completed' && !shift?.payroll_processed && (
                                    <button 
                                        type="button" 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
                                            setTimeout(() => { setEditing(true); }, 0);
                                        }} 
                                        className="btn btn-indigo"
                                        disabled={processingPayroll || loading}
                                    >
                                        <Edit2 className="h-5 w-5 mr-2" /> Redigera Pass
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            {/* Styling */}
            <style jsx>{`
                .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out; }
                .btn-primary { @apply border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500; }
                .btn-indigo { @apply border-transparent text-white bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-500; }
                .btn-success { @apply border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500; }
                .btn-danger-outline { @apply border-red-500 text-red-600 bg-white hover:bg-red-50 hover:text-red-700 focus:ring-red-500; }
                .status-badge { @apply px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize; }
                .status-open { @apply bg-blue-100 text-blue-800 border-blue-300; }
                .status-filled { @apply bg-green-100 text-green-800 border-green-300; }
                .status-completed { @apply bg-purple-100 text-purple-800 border-purple-300; }
                .status-cancelled { @apply bg-red-100 text-red-800 border-red-300; }
                .status-unknown { @apply bg-gray-100 text-gray-800 border-gray-300; }
                .tag-style { @apply inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800; }
            `}</style>
        </div>
    );
}

export default ShiftDetailsModal;