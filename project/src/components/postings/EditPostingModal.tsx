import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { JobPosting, UserRole, Schedule, Database } from '../../types';
import { Loader2, Save, X, DollarSign } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { sv } from 'date-fns/locale';
import { format, parseISO, isValid } from 'date-fns';

// This type should align with what the onSave prop expects.
type PostingUpdateData = Partial<Omit<Database['public']['Tables']['job_postings']['Update'], 'id' | 'employer_id' | 'created_at' | 'updated_at'>>;

interface EditPostingModalProps {
    posting: JobPosting;
    onClose: () => void;
    onSuccess: () => void;
    onSave: (postingId: string, updateData: PostingUpdateData) => Promise<{ success: boolean; error: string | null }>;
    currentUserRole: UserRole | 'anonymous';
}

interface PostingFormData {
    title: string;
    description: string;
    required_role: UserRole | '';
    location: string;
    period_start_date: string;
    period_end_date: string;
    estimated_hours: string;
    salary_description: string;
    required_experience_str: string;
    status: 'open' | 'filled' | 'cancelled' | 'completed';
    hourly_rate: string;
}

// Define the shape for a specific work time entry in the state
type SpecificWorkTime = { date: Date; startTime: string; endTime: string };

export function EditPostingModal({ posting, onClose, onSuccess, onSave, currentUserRole }: EditPostingModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for the main form fields
    const [formData, setFormData] = useState<PostingFormData>({
        title: '',
        description: '',
        required_role: '',
        location: '',
        period_start_date: '',
        period_end_date: '',
        estimated_hours: '',
        salary_description: '',
        required_experience_str: '',
        status: 'open',
        hourly_rate: ''
    });

    // State for dynamic scheduling
    const [scheduleType, setScheduleType] = useState<'none' | 'recurring' | 'specific'>('none');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [specificWorkTimes, setSpecificWorkTimes] = useState<SpecificWorkTime[]>([]);
    const dayLabels = ['Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör', 'Sön'];

    // Effect to populate the form when the 'posting' prop changes
    useEffect(() => {
        if (posting) {
            // Populate standard form fields
            setFormData({
                title: posting.title || '',
                description: posting.description || '',
                required_role: posting.required_role || '',
                location: posting.location || '',
                period_start_date: posting.period_start_date ? format(new Date(posting.period_start_date), 'yyyy-MM-dd') : '',
                period_end_date: posting.period_end_date ? format(new Date(posting.period_end_date), 'yyyy-MM-dd') : '',
                estimated_hours: posting.estimated_hours || '',
                salary_description: posting.salary_description || '',
                required_experience_str: (posting.required_experience || []).join(', '),
                status: posting.status as 'open' | 'filled' | 'cancelled' | 'completed' || 'open',
                hourly_rate: posting.hourly_rate?.toString() || ''
            });

            // Populate advanced scheduling state
            if (posting.specific_work_times && posting.specific_work_times.length > 0) {
                setScheduleType('specific');
                const validWorkTimes = posting.specific_work_times
                    .map(swt => ({
                        date: parseISO(swt.date),
                        startTime: swt.startTime || '09:00',
                        endTime: swt.endTime || '17:00'
                    }))
                    .filter(swt => isValid(swt.date));
                setSpecificWorkTimes(validWorkTimes);
                setSchedules([]);
            } else if (posting.schedules && posting.schedules.length > 0) {
                setScheduleType('recurring');
                setSchedules(posting.schedules);
                setSpecificWorkTimes([]);
            } else {
                setScheduleType('none');
                setSchedules([]);
                setSpecificWorkTimes([]);
            }

            setError(null);
        }
    }, [posting]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Scheduling Handlers ---
    const handleRecurringDayToggle = (dayNumber: number) => {
        const dayExists = schedules.some(s => s.day === dayNumber);
        if (dayExists) {
            setSchedules(prev => prev.filter(s => s.day !== dayNumber));
        } else {
            setSchedules(prev => [...prev, { day: dayNumber, start: '09:00', end: '17:00' }].sort((a, b) => a.day - b.day));
        }
    };

    const handleRecurringTimeChange = (dayNumber: number, field: 'start' | 'end', value: string) => {
        setSchedules(prev => prev.map(s =>
            s.day === dayNumber ? { ...s, [field]: value } : s
        ));
    };

    const handleSpecificDateSelect = (dates: Date[] | undefined) => {
        const selectedDates = dates || [];
        const newWorkTimes = selectedDates.map(d => {
            const existing = specificWorkTimes.find(swt => swt.date.getTime() === d.getTime());
            return existing || { date: d, startTime: '09:00', endTime: '17:00' };
        });
        setSpecificWorkTimes(newWorkTimes);
    };
    
    const handleSpecificTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const updatedWorkTimes = [...specificWorkTimes];
        updatedWorkTimes[index][field] = value;
        setSpecificWorkTimes(updatedWorkTimes);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);

        const experienceArray = formData.required_experience_str.split(',').map(s => s.trim()).filter(Boolean);

        const updatePayload: PostingUpdateData = {
            ...formData,
            period_start_date: formData.period_start_date || null,
            period_end_date: formData.period_end_date || null,
            required_experience: experienceArray.length > 0 ? experienceArray : null,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
            // Conditionally set the schedule fields based on the selected type
            schedules: scheduleType === 'recurring' && schedules.length > 0 ? schedules : null,
            specific_work_times: scheduleType === 'specific' && specificWorkTimes.length > 0
                ? specificWorkTimes.map(swt => ({
                    date: format(swt.date, 'yyyy-MM-dd'),
                    startTime: swt.startTime,
                    endTime: swt.endTime,
                }))
                : null,
        };

        try {
            const { success, error: updateErrorMsg } = await onSave(posting.id, updatePayload);
            if (!success) {
                throw new Error(updateErrorMsg || "Uppdatering misslyckades");
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ett oväntat fel inträffade.';
            setError(message);
            toast.error(`Uppdatering misslyckades: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const canBeCompletedByAdmin = posting.status === 'filled' && posting.period_end_date && new Date(posting.period_end_date) < new Date();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-900">Redigera uppdrag {currentUserRole === 'admin' && `(Admin)`}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Stäng">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {error && (
                     <div className="m-6 mb-0 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert">
                        {error}
                     </div>
                )}

                <form onSubmit={handleSubmit} id="edit-posting-form" className="p-6 space-y-5 overflow-y-auto flex-grow">
                    {/* --- Standard Form Fields --- */}
                    <div>
                      <label htmlFor="edit-title" className="label-style">Titel <span className="text-red-500">*</span></label>
                      <input id="edit-title" name="title" type="text" required value={formData.title} onChange={handleChange} className="input-style" />
                    </div>
                    <div>
                       <label htmlFor="edit-required_role" className="label-style">Önskad Roll <span className="text-red-500">*</span></label>
                       <select id="edit-required_role" name="required_role" required value={formData.required_role} onChange={handleChange} className="input-style bg-white">
                           <option value="" disabled>-- Välj Roll --</option>
                           <option value="pharmacist">Farmaceut</option>
                           <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                           <option value="säljare">Säljare</option>
                       </select>
                    </div>
                    <div>
                      <label htmlFor="edit-description" className="label-style">Beskrivning <span className="text-red-500">*</span></label>
                      <textarea id="edit-description" name="description" required value={formData.description} onChange={handleChange} className="input-style" rows={3} />
                    </div>
                    <div>
                        <label htmlFor="edit-location" className="label-style">Plats</label>
                        <input id="edit-location" name="location" type="text" value={formData.location} onChange={handleChange} className="input-style" />
                    </div>
                    
                    {/* --- DYNAMIC SCHEDULING & HOURLY RATE SECTION --- */}
                    <div className="border-t pt-5 space-y-4">
                        <label className="block text-sm font-medium text-gray-900">Arbetstider och Timpris</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <label className="flex items-center cursor-pointer"><input type="radio" name="scheduleType" value="recurring" checked={scheduleType === 'recurring'} onChange={() => setScheduleType('recurring')} className="form-radio"/><span className="ml-2 text-sm">Återkommande</span></label>
                            <label className="flex items-center cursor-pointer"><input type="radio" name="scheduleType" value="specific" checked={scheduleType === 'specific'} onChange={() => setScheduleType('specific')} className="form-radio"/><span className="ml-2 text-sm">Specifika datum</span></label>
                            <label className="flex items-center cursor-pointer"><input type="radio" name="scheduleType" value="none" checked={scheduleType === 'none'} onChange={() => setScheduleType('none')} className="form-radio"/><span className="ml-2 text-sm">Ej specificerat</span></label>
                        </div>

                        {scheduleType !== 'none' && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border space-y-4">
                                {scheduleType === 'recurring' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Arbetsdagar</label>
                                            <div className="flex flex-wrap gap-2">
                                                {dayLabels.map((label, index) => {
                                                    const dayNumber = index + 1;
                                                    const isSelected = schedules.some(s => s.day === dayNumber);
                                                    return <button key={dayNumber} type="button" onClick={() => handleRecurringDayToggle(dayNumber)} className={`px-3 py-1.5 text-xs rounded-full border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>{label}</button>;
                                                })}
                                            </div>
                                        </div>
                                        {schedules.map(schedule => (
                                            <div key={schedule.day} className="flex items-center gap-4 p-3 bg-white border rounded-md">
                                                <span className="font-semibold w-12">{dayLabels[schedule.day - 1]}</span>
                                                <div className="flex-grow"><input type="time" value={schedule.start} onChange={(e) => handleRecurringTimeChange(schedule.day, 'start', e.target.value)} className="input-style w-full" /></div>
                                                <span>-</span>
                                                <div className="flex-grow"><input type="time" value={schedule.end} onChange={(e) => handleRecurringTimeChange(schedule.day, 'end', e.target.value)} className="input-style w-full" /></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {scheduleType === 'specific' && (
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-shrink-0">
                                            <DayPicker
                                                mode="multiple"
                                                min={1} // Allow selecting multiple dates
                                                selected={specificWorkTimes.map(swt => swt.date)}
                                                onSelect={handleSpecificDateSelect}
                                                locale={sv}
                                                fromDate={formData.period_start_date ? new Date(formData.period_start_date) : undefined}
                                                toDate={formData.period_end_date ? new Date(formData.period_end_date) : undefined}
                                                className="bg-white p-2 rounded-md border"
                                            />
                                        </div>
                                        <div className="flex-grow space-y-2 overflow-y-auto max-h-60 pr-2">
                                            {specificWorkTimes.length > 0 ? specificWorkTimes.sort((a,b) => a.date.getTime() - b.date.getTime()).map((workTime, index) => (
                                                <div key={index} className="grid grid-cols-3 gap-3 items-center">
                                                    <div className="text-sm font-medium whitespace-nowrap">{format(workTime.date, 'd MMM', { locale: sv })}</div>
                                                    <input type="time" value={workTime.startTime} onChange={(e) => handleSpecificTimeChange(index, 'startTime', e.target.value)} className="input-style w-full"/>
                                                    <input type="time" value={workTime.endTime} onChange={(e) => handleSpecificTimeChange(index, 'endTime', e.target.value)} className="input-style w-full"/>
                                                </div>
                                            )) : <p className="text-sm text-gray-500 text-center py-4">Välj ett eller flera datum i kalendern.</p>}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="edit_hourly_rate" className="label-style">Timpris (SEK)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                                        <input type="number" id="edit_hourly_rate" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} className="input-style pl-9" placeholder="t.ex. 250"/>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- Other Standard Fields --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-period_start_date" className="label-style">Period Start <span className="text-red-500">*</span></label>
                            <input id="edit-period_start_date" name="period_start_date" type="date" required value={formData.period_start_date} onChange={handleChange} className="input-style" />
                        </div>
                        <div>
                            <label htmlFor="edit-period_end_date" className="label-style">Period Slut <span className="text-red-500">*</span></label>
                            <input id="edit-period_end_date" name="period_end_date" type="date" required value={formData.period_end_date} min={formData.period_start_date} onChange={handleChange} className="input-style" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="edit-estimated_hours" className="label-style">Beräknade Timmar</label>
                        <input id="edit-estimated_hours" name="estimated_hours" type="text" value={formData.estimated_hours} onChange={handleChange} className="input-style" placeholder="t.ex., Heltid, 20 tim/vecka" />
                    </div>
                    <div>
                        <label htmlFor="edit-salary_description" className="label-style">Lön/Ersättning</label>
                        <input id="edit-salary_description" name="salary_description" type="text" value={formData.salary_description} onChange={handleChange} className="input-style" placeholder="t.ex., Månadslön, Enligt överenskommelse" />
                    </div>
                    <div>
                        <label htmlFor="edit-required_experience_str" className="label-style">Erfarenhetskrav (komma-separerat)</label>
                        <input id="edit-required_experience_str" name="required_experience_str" type="text" value={formData.required_experience_str} onChange={handleChange} className="input-style" placeholder="t.ex., Apodos, Detaljhandel" />
                    </div>
                    <div>
                       <label htmlFor="edit-status" className="label-style">Status <span className="text-red-500">*</span></label>
                       <select id="edit-status" name="status" required value={formData.status} onChange={handleChange} className="input-style bg-white"
                               disabled={posting.status === 'cancelled' && currentUserRole !== 'admin'}
                       >
                           <option value="open">Öppen</option>
                           <option value="filled">Tillsatt</option>
                           <option value="cancelled">Avbokad</option>
                           {(currentUserRole === 'admin' || canBeCompletedByAdmin) && <option value="completed">Slutförd</option>}
                       </select>
                       {posting.status === 'cancelled' && currentUserRole !== 'admin' && <p className="text-xs text-red-600 mt-1 italic">Status för en avbokad annons kan inte ändras.</p>}
                    </div>

                </form>

                <div className="flex justify-end items-center px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 space-x-3">
                    <button onClick={onClose} type="button" className="btn btn-secondary">Avbryt</button>
                    <button
                        type="submit"
                        form="edit-posting-form"
                        disabled={loading || (posting.status === 'cancelled' && currentUserRole !== 'admin')}
                        className="btn btn-primary min-w-[130px]"
                        title={(posting.status === 'cancelled' && currentUserRole !== 'admin') ? 'Kan inte spara en avbokad annons' : undefined}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-1" />}
                        Spara Ändringar
                    </button>
                </div>
            </div>
            <style jsx>{`
                .label-style { @apply block text-sm font-medium text-gray-700 mb-1; }
                .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .form-radio { @apply h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500; }
            `}</style>
        </div>
    );
}