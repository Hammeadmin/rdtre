// src/components/postings/CreatePostingForm.tsx

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createPosting } from '../../lib/postings';
import type { UserRole, Schedule } from '../../types';
import { Loader2, Save, X, MapPin, Calendar, Clock, Info, DollarSign, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAuth } from '../../context/AuthContext';

// --- Interface Definitions ---
interface CreatePostingFormProps {
    onSuccess?: () => void;
    onClose?: () => void;
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
    hourly_rate: string;
}

interface SpecificWorkTime {
    date: Date;
    startTime: string;
    endTime: string;
}

export function CreatePostingForm({ onSuccess, onClose }: CreatePostingFormProps) {
    const [loading, setLoading] = useState(false);
    const { profile } = useAuth();
    const [error, setError] = useState<string | null>(null);

    // --- State Management ---
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    const [formData, setFormData] = useState<PostingFormData>({
        title: '',
        description: '',
        required_role: '',
        location: '',
        period_start_date: format(today, 'yyyy-MM-dd'),
        period_end_date: format(nextMonth, 'yyyy-MM-dd'),
        estimated_hours: '',
        salary_description: '',
        required_experience_str: '',
        hourly_rate: '',
    });
    
    const [scheduleType, setScheduleType] = useState<'none' | 'recurring' | 'specific'>('none');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [specificWorkTimes, setSpecificWorkTimes] = useState<SpecificWorkTime[]>([]);
    
    // Day index: 0=Mån, 1=Tis, ... 6=Sön
    const dayLabels = ['Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör', 'Sön'];

    // --- Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRecurringDayToggle = (dayIndex: number) => {
        const dayNumber = dayIndex + 1; // Convert 0-6 index to 1-7 day number
        const dayExists = schedules.some(s => s.day === dayNumber);
        if (dayExists) {
            setSchedules(prev => prev.filter(s => s.day !== dayNumber));
        } else {
            setSchedules(prev => [...prev, { day: dayNumber, start: '09:00', end: '17:00' }].sort((a, b) => a.day - b.day));
        }
    };

    const handleRecurringTimeChange = (dayNumber: number, field: 'start' | 'end', value: string) => {
        setSchedules(prev => prev.map(s => s.day === dayNumber ? { ...s, [field]: value } : s));
    };

    const handleSpecificDateSelect = (dates: Date[] | undefined) => {
        const selectedDates = dates || [];
        const newWorkTimes = selectedDates.map(d => {
            const existing = specificWorkTimes.find(swt => swt.date.getTime() === d.getTime());
            return existing || { date: d, startTime: '09:00', endTime: '17:00' };
        }).filter(swt => selectedDates.some(d => d.getTime() === swt.date.getTime()));
        setSpecificWorkTimes(newWorkTimes);
    };
    
    const handleSpecificTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const updatedWorkTimes = [...specificWorkTimes];
        updatedWorkTimes[index][field] = value;
        setSpecificWorkTimes(updatedWorkTimes);
    };

    const validateForm = (): string | null => {
        if (!formData.title.trim()) return 'Titel är obligatorisk.';
        if (!formData.required_role) return 'Roll måste väljas.';
        if (formData.period_start_date > formData.period_end_date) return 'Slutdatum måste vara på eller efter startdatum.';
        if (scheduleType !== 'none' && !formData.hourly_rate) return 'Timpris är obligatoriskt när arbetstider anges.';
        return null;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            toast.error(validationError);
            return;
        }
        setLoading(true);

        const experienceArray = formData.required_experience_str.split(',').map(s => s.trim()).filter(Boolean);

        const payload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            required_role: formData.required_role as UserRole,
            location: formData.location.trim() || null,
            period_start_date: formData.period_start_date,
            period_end_date: formData.period_end_date,
            estimated_hours: formData.estimated_hours.trim() || null,
            salary_description: formData.salary_description.trim() || null,
            required_experience: experienceArray.length > 0 ? experienceArray : null,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
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
            const { error: createError } = await createPosting(payload);
            if (createError) throw new Error(createError); 
          // --- NOTIFICATION LOGIC ADDED HERE ---
            // Fire and forget
            fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        emailType: 'newPostingNotification',
        payload: {
            postingTitle: payload.title,
            postingDescription: payload.description,
            postingLocation: payload.location,
            companyName: profile?.pharmacy_name || profile?.full_name || 'Ett Företag', // Assumes 'profile' is available from useAuth()
            hourlyRate: payload.hourly_rate,
        },
    }),
}).catch(e => console.error("Failed to trigger posting notification:", e));

            // --- END OF NOTIFICATION LOGIC ---
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ett oväntat fel inträffade.';
            setError(message);
            toast.error(`Misslyckades: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Skapa nytt uppdrag</h2>
                {onClose && <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full"><X className="h-6 w-6" /></button>}
            </div>

            {error && <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* --- Main Details --- */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Titel <span className="text-red-500">*</span></label>
                    <input id="title" name="title" type="text" required value={formData.title} onChange={handleChange} className="w-full input-style" placeholder="t.ex. Sommarjobb för farmaceut"/>
                </div>
                <div>
                    <label htmlFor="required_role" className="block text-sm font-medium text-gray-700 mb-1">Roll <span className="text-red-500">*</span></label>
                    <select id="required_role" name="required_role" required value={formData.required_role} onChange={handleChange} className="w-full input-style bg-white">
                        <option value="" disabled>-- Välj roll --</option>
                        <option value="pharmacist">Farmaceut</option>
                        <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                        <option value="säljare">Säljare</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} className="w-full input-style" rows={4} placeholder="Beskriv arbetsuppgifterna..."/>
                </div>
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Plats (Valfritt)</label>
                    <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input id="location" name="location" type="text" value={formData.location} onChange={handleChange} className="pl-9 w-full input-style" placeholder="t.ex. Stockholm City"/></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="period_start_date" className="block text-sm font-medium text-gray-700 mb-1">Period från <span className="text-red-500">*</span></label>
                        <input id="period_start_date" name="period_start_date" type="date" required value={formData.period_start_date} onChange={handleChange} className="w-full input-style"/>
                    </div>
                    <div>
                        <label htmlFor="period_end_date" className="block text-sm font-medium text-gray-700 mb-1">Period till <span className="text-red-500">*</span></label>
                        <input id="period_end_date" name="period_end_date" type="date" required value={formData.period_end_date} min={formData.period_start_date} onChange={handleChange} className="w-full input-style"/>
                    </div>
                </div>

                {/* --- Refactored Scheduling Section --- */}
                <div className="border-t pt-5 space-y-4">
                    <label className="block text-sm font-medium text-gray-900">Arbetstider och Lön</label>
                    <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer"><input type="radio" name="scheduleType" value="recurring" checked={scheduleType === 'recurring'} onChange={() => setScheduleType('recurring')} className="form-radio"/><span className="ml-2 text-sm">Återkommande schema</span></label>
                        <label className="flex items-center cursor-pointer"><input type="radio" name="scheduleType" value="specific" checked={scheduleType === 'specific'} onChange={() => setScheduleType('specific')} className="form-radio"/><span className="ml-2 text-sm">Specifika datum</span></label>
                    </div>

                    {scheduleType !== 'none' && (
                        <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                            {scheduleType === 'recurring' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Välj arbetsdagar</label>
                                        <div className="flex flex-wrap gap-2">
                                            {/* --- FIX 1: Correctly check if a day is selected --- */}
                                            {dayLabels.map((label, index) => <button key={index} type="button" onClick={() => handleRecurringDayToggle(index)} className={`px-3 py-1.5 text-xs rounded-full border ${schedules.some(s => s.day === index + 1) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>{label}</button>)}
                                        </div>
                                    </div>
                                    {schedules.map(schedule => (
                                        <div key={schedule.day} className="flex items-center gap-4 p-3 bg-white border rounded-md">
                                            {/* --- FIX 2: Use correct index for the day label --- */}
                                            <span className="font-semibold w-12">{dayLabels[schedule.day - 1]}</span>
                                            <input type="time" value={schedule.start} onChange={(e) => handleRecurringTimeChange(schedule.day, 'start', e.target.value)} className="input-style w-full"/>
                                            <span>-</span>
                                            <input type="time" value={schedule.end} onChange={(e) => handleRecurringTimeChange(schedule.day, 'end', e.target.value)} className="input-style w-full"/>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {scheduleType === 'specific' && (
                                <div className="space-y-4">
                                    <DayPicker mode="multiple" selected={specificWorkTimes.map(swt => swt.date)} onSelect={handleSpecificDateSelect} locale={sv} fromDate={new Date(formData.period_start_date)} toDate={new Date(formData.period_end_date)} />
                                    {specificWorkTimes.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-md font-medium text-gray-800">Ange tider</h4>
                                            {specificWorkTimes.sort((a,b) => a.date.getTime() - b.date.getTime()).map((workTime, index) => (
                                                <div key={index} className="grid grid-cols-3 gap-3 items-center">
                                                    <div className="text-sm font-medium">{format(workTime.date, 'd MMM yyyy', { locale: sv })}</div>
                                                    <input type="time" value={workTime.startTime} onChange={(e) => handleSpecificTimeChange(index, 'startTime', e.target.value)} className="input-style w-full"/>
                                                    <input type="time" value={workTime.endTime} onChange={(e) => handleSpecificTimeChange(index, 'endTime', e.target.value)} className="input-style w-full"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div>
                                <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-1">Timpris (SEK) <span className="text-red-500">*</span></label>
                                <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="number" id="hourly_rate" name="hourly_rate" required value={formData.hourly_rate} onChange={handleChange} className="input-style pl-9 w-full" placeholder="t.ex. 350" step="10"/></div>
                            </div>
                        </div>
                    )}
                </div>

                              <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-base font-medium text-gray-500">Eller</span>
                    </div>
                </div>

                {/* --- Optional Details --- */}
                <div>
                    <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">Uppskattat antal timmar/vecka (Valfritt)</label>
                    <div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input id="estimated_hours" name="estimated_hours" type="text" value={formData.estimated_hours} onChange={handleChange} className="pl-9 w-full input-style" placeholder="t.ex. 40 tim/vecka"/></div>
                </div>
                <div>
                    <label htmlFor="salary_description" className="block text-sm font-medium text-gray-700 mb-1">Kompensation (Valfritt)</label>
                    <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input id="salary_description" name="salary_description" type="text" value={formData.salary_description} onChange={handleChange} className="pl-9 w-full input-style" placeholder="t.ex. Enligt överenskommelse"/></div>
                </div>
                <div>
                    <label htmlFor="required_experience_str" className="block text-sm font-medium text-gray-700 mb-1">Erfarenhet (Valfritt, komma-separerat)</label>
                    <div className="relative"><ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input id="required_experience_str" name="required_experience_str" type="text" value={formData.required_experience_str} onChange={handleChange} className="pl-9 w-full input-style" placeholder="t.ex. Apodos, Försäljning"/></div>
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex justify-end gap-4 pt-4 mt-6 border-t border-gray-200">
                    {onClose && <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary">Avbryt</button>}
                    <button type="submit" disabled={loading} className="btn btn-primary min-w-[150px] flex items-center justify-center">
                        {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <><Save className="h-5 w-5 mr-2" />Skapa uppdrag</>}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .form-radio { @apply h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500; }
            `}</style>
        </div>
    );
}

export default CreatePostingForm;