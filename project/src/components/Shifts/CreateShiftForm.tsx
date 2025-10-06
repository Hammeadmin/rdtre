// src/components/Shifts/CreateShiftForm.tsx

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, FileText, Plus, X, MapPin, Loader2, Save, AlertTriangle, DollarSign } from 'lucide-react';
import { format, addDays, eachDayOfInterval, parseISO, getDay } from 'date-fns';
import { createShift } from '../../lib/shifts';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import type { UserRole, ShiftDate } from '../../types'; // Ensure ShiftDate is imported
import { useAuth } from '../../context/AuthContext';

// --- Helper Function to Parse Lunch Input ---
function parseLunchInputToInterval(input: string | null | undefined): string | null {
    if (!input) {
        return null; // Treat empty string as null
    }
    const trimmedInput = input.trim().toLowerCase();

    if (trimmedInput === '' || trimmedInput === '0' || trimmedInput === 'none' || trimmedInput === 'not specified') {
        return null;
    }

    // Case 1: Just a number (assume minutes)
    const numberMatch = trimmedInput.match(/^(\d+)$/);
    if (numberMatch) {
        const minutes = parseInt(numberMatch[1], 10);
        if (!isNaN(minutes) && minutes > 0) {
            const mm = String(minutes % 60).padStart(2, '0');
            const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
            return `${hh}:${mm}:00`; // Format as HH:MM:SS
        }
    }

    // Case 2: Number followed by "min" or "minute"
    const minMatch = trimmedInput.match(/^(\d+)\s*m(in)?(ute)?s?$/);
    if (minMatch) {
        const minutes = parseInt(minMatch[1], 10);
         if (!isNaN(minutes) && minutes > 0) {
            const mm = String(minutes % 60).padStart(2, '0');
            const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
            return `${hh}:${mm}:00`; // Format as HH:MM:SS
        }
    }

     // Case 3: Number followed by "h" or "hour"
    const hourMatch = trimmedInput.match(/^(\d+(\.\d+)?)\s*h(our)?s?$/);
    if (hourMatch) {
        const hoursDecimal = parseFloat(hourMatch[1]);
        if (!isNaN(hoursDecimal) && hoursDecimal > 0) {
            const totalMinutes = Math.round(hoursDecimal * 60);
             const mm = String(totalMinutes % 60).padStart(2, '0');
            const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            return `${hh}:${mm}:00`; // Format as HH:MM:SS
        }
    }

     // Case 4: Time format H:MM or HH:MM
    const timeMatch = trimmedInput.match(/^(\d{1,2}):(\d{2})$/);
     if (timeMatch) {
         const hh = String(timeMatch[1]).padStart(2, '0');
         const mm = String(timeMatch[2]).padStart(2, '0');
         return `${hh}:${mm}:00`; // Add seconds
     }

     // Case 5: Already in HH:MM:SS format
     const intervalMatch = trimmedInput.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (intervalMatch) {
        // Optional: Could add validation here if needed
        return trimmedInput; // Return as is
    }

    // If none of the above matched, return null or handle as error
    console.warn(`Could not parse lunch duration: "${input}". Setting to null.`);
    // Toast moved to validateForm/handleSubmit for better flow control
    return null; // Default to null if parsing fails
}

// --- Interfaces ---
interface CreateShiftFormProps {
    onSuccess?: () => void;
    onClose?: () => void;
}

interface FormDataState {
    title: string;
    description: string;
    location: string;
    required_role: UserRole | ''; // This refers to the state variable 'requiredRole', not directly in formData
    lunch: string;
    dates: Array<ShiftDate>; // Use ShiftDate type { date: string; start_time: string; end_time: string; }
    required_experience: string[];
    is_urgent: boolean;
    urgent_pay_adjustment: string;
    hourly_rate: string;
}

// --- Component ---
export function CreateShiftForm({ onClose, onSuccess }: CreateShiftFormProps) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requiredRole, setRequiredRole] = useState<UserRole | ''>(''); // Separate state for role selection

    const initialDate = format(new Date(), 'yyyy-MM-dd');
    const [formData, setFormData] = useState<Omit<FormDataState, 'required_role'>>({ // Omit required_role from formData state
        title: '',
        description: '',
        location: '',
        lunch: '',
        dates: [{ date: initialDate, start_time: '09:00', end_time: '17:00' }],
        required_experience: [],
        is_urgent: false,
        urgent_pay_adjustment: '',
        hourly_rate: '',
    });

    // --- NEW: State for Date Range ---
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [rangeStartDate, setRangeStartDate] = useState<string>(todayStr);
    const [rangeEndDate, setRangeEndDate] = useState<string>(todayStr);
    const [excludeWeekends, setExcludeWeekends] = useState<boolean>(false);
    // --- End NEW State ---

    // --- Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            if (name === 'is_urgent') { // Handle urgent checkbox specifically
                setFormData(prev => ({ ...prev, is_urgent: checked }));
                 if (!checked) { // Reset adjustment if unchecked
                    setFormData(prev => ({ ...prev, urgent_pay_adjustment: '' }));
                 }
            } else {
                // Handle other checkboxes if any (none currently)
                 setFormData(prev => ({ ...prev, [name]: checked }));
            }
        } else if (name === 'urgent_pay_adjustment') {
            const numericValue = value.replace(/[^0-9.]/g, '');
             if ((numericValue.match(/\./g) || []).length <= 1) {
                 setFormData(prev => ({ ...prev, [name]: numericValue }));
            }
        } else {
            // Update formData for text, select (excluding role), textarea, lunch input
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setRequiredRole(event.target.value as UserRole | ''); // Update separate role state
    };

    // --- Date Handling ---
    const addDate = () => {
         const lastDate = formData.dates.length > 0 ? formData.dates[formData.dates.length - 1] : { date: todayStr, start_time: '09:00', end_time: '17:00'};
         const nextDate = format(addDays(parseISO(lastDate.date + 'T00:00:00'), 1), 'yyyy-MM-dd');
         setFormData(prev => ({
             ...prev,
             dates: [
                 ...prev.dates,
                 {
                     date: nextDate,
                     start_time: lastDate.start_time,
                     end_time: lastDate.end_time
                 }
             ].sort((a, b) => a.date.localeCompare(b.date)) // Keep sorted
         }));
     };

    const removeDate = (index: number) => {
        // Prevent removing the last date - user should clear/cancel instead
        // if (formData.dates.length > 1) {
            setFormData(prev => ({
                 ...prev,
                 dates: prev.dates.filter((_, i) => i !== index)
            }));
        // } else {
        //     toast.error("Cannot remove the last date. Add another date first or clear the form.");
        // }
    };

    const updateDate = (index: number, field: keyof ShiftDate, value: string) => {
        const newDates = [...formData.dates];
        // Basic time validation example (optional)
        if ((field === 'start_time' || field === 'end_time') && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
            // Optionally show a small warning, but allow intermediate states
            // console.warn("Invalid time format entered");
        }
        newDates[index] = { ...newDates[index], [field]: value };
        setFormData(prev => ({ ...prev, dates: newDates }));
    };

    // --- Date Range Handler ---
     const handleAddDateRange = () => {
        setError(null); // Clear previous form-level errors
        try {
            const start = parseISO(rangeStartDate);
            const end = parseISO(rangeEndDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                toast.error("Please select valid start and end dates for the range.");
                return;
            }

            if (end < start) {
                toast.error("End date cannot be before the start date.");
                return;
            }

             const daysInRange = eachDayOfInterval({ start, end });

            const filteredDays = daysInRange.filter(day => {
                if (!excludeWeekends) {
                    return true; // Include all days
                }
                const dayOfWeek = getDay(day); // 0 = Sunday, 6 = Saturday
                return dayOfWeek !== 0 && dayOfWeek !== 6;
            });

            if (filteredDays.length === 0) {
                 toast.error("No valid dates to add in the selected range (check weekend exclusion).");
                 return;
            }

            const firstExistingDate = formData.dates[0]; // Get template times from first date if available
            const templateStartTime = firstExistingDate?.start_time || '09:00';
            const templateEndTime = firstExistingDate?.end_time || '17:00';

            const formattedDatesToAdd: ShiftDate[] = filteredDays.map(day => ({
                date: format(day, 'yyyy-MM-dd'),
                start_time: templateStartTime,
                end_time: templateEndTime
            }));

             // Prevent adding duplicate dates
             const existingDates = new Set(formData.dates.map(d => d.date));
             const uniqueNewDates = formattedDatesToAdd.filter(d => !existingDates.has(d.date));

             if (uniqueNewDates.length === 0) {
                  toast("All dates in the selected range are already added.");
                  return;
             }

             // Add the new unique dates and sort the array
             setFormData(prev => ({
                 ...prev,
                 dates: [...prev.dates, ...uniqueNewDates]
                         .sort((a, b) => a.date.localeCompare(b.date)) // Keep dates sorted
             }));

             toast.success(`Added ${uniqueNewDates.length} date(s) from the range.`);

        } catch (err) {
            console.error("Error processing date range:", err);
            toast.error("Could not process the date range.");
        }
    };

    // --- Validation ---
    const validateForm = (): string | null => {
        if (!formData.title.trim()) return 'Title is required.';
        if (!requiredRole) return 'Required Role must be selected.';
        if (!formData.description.trim()) return 'Description is required.';
        if (!formData.location.trim()) return 'Location is required.';
        if (!formData.hourly_rate.trim() || parseFloat(formData.hourly_rate) <= 0) return 'Hourly Rate must be a positive number.';
        if (formData.dates.length === 0) return 'At least one shift date is required.';

        const today = new Date(); today.setHours(0, 0, 0, 0); // Use local today

        for (const dateInfo of formData.dates) {
            if (!dateInfo.date || !dateInfo.start_time || !dateInfo.end_time) {
                return `Date, Start Time, and End Time are required for all entries. Entry: ${JSON.stringify(dateInfo)}`;
            }
            try {
                // Use parseISO to handle YYYY-MM-DD correctly
                const selectedDate = parseISO(dateInfo.date);
                 if (isNaN(selectedDate.getTime())) {
                     return `Invalid date format for ${dateInfo.date}. Use YYYY-MM-DD.`;
                 }
                 // Compare dates only, ignore time part for past date check
                 const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                 if (selectedDateOnly < today) {
                    return `Date ${dateInfo.date} cannot be in the past.`;
                }
            } catch (e) {
                 return `Invalid date format for ${dateInfo.date}. Use YYYY-MM-DD.`;
            }

             if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dateInfo.start_time)) {
                 return `Invalid start time format (HH:MM) for date ${dateInfo.date}.`;
             }
             if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dateInfo.end_time)) {
                 return `Invalid end time format (HH:MM) for date ${dateInfo.date}.`;
             }
             if (dateInfo.start_time >= dateInfo.end_time) {
                 return `End time must be after start time for date ${dateInfo.date}.`;
             }
         }

        if (formData.is_urgent) {
            if (!formData.urgent_pay_adjustment.trim()) {
                return 'Urgent Pay Adjustment is required when shift is marked as urgent.';
            }
            const adjustmentNum = parseFloat(formData.urgent_pay_adjustment);
            if (isNaN(adjustmentNum) || adjustmentNum <= 0) {
                return 'Urgent Pay Adjustment must be a positive number.';
            }
        }

         // Validate lunch format *if* input is provided
         if (formData.lunch.trim() && parseLunchInputToInterval(formData.lunch) === null) {
             // The helper function already shows a toast, this provides form-level feedback
             return `Invalid format for Lunch Duration: "${formData.lunch}". Use minutes (e.g., 30) or time (e.g., 0:45).`;
         }

        return null; // No errors
    };

    // --- Submission ---
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        toast.dismiss();
        setError(null); // Clear previous errors

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            toast.error(validationError);
            return;
        }

        // Parse Lunch Input just before submission
        const parsedLunchInterval = parseLunchInputToInterval(formData.lunch);
        // Check again if parsing failed (validateForm might allow intermediate invalid states)
        if (formData.lunch.trim() && parsedLunchInterval === null) {
             const parseErrorMsg = `Invalid format for Lunch Duration: "${formData.lunch}". Could not save.`;
             setError(parseErrorMsg);
             toast.error(parseErrorMsg); // Ensure toast is shown if validation didn't catch it
             return; // Stop submission
        }

        setLoading(true);

        const adjustment = formData.is_urgent && formData.urgent_pay_adjustment
            ? parseFloat(formData.urgent_pay_adjustment)
            : null;

        // Construct the single payload with all dates
        const fullShiftPayload = {
             title: formData.title.trim(),
             description: formData.description.trim(),
             location: formData.location.trim(),
             required_role: requiredRole as UserRole,
             lunch: parsedLunchInterval, // Pass parsed interval string or null
             dates: formData.dates.map(d => ({ // Ensure times have seconds for backend
                date: d.date,
                start_time: `${d.start_time}:00`,
                end_time: `${d.end_time}:00`,
            })),
             required_experience: formData.required_experience.filter(exp => exp.trim() !== ''),
             is_urgent: formData.is_urgent,
             urgent_pay_adjustment: adjustment,
             hourly_rate: parseFloat(formData.hourly_rate),
        };

  
             try {

            console.log("Submitting full shift payload:", fullShiftPayload);

            // Call createShift ONCE

            const { data: createdData, error: createError } = await createShift(fullShiftPayload);
            if (createError) {
               throw new Error(createError);
            }
  toast.success(`${(createdData || []).length} pass har skapats!`);
               // --- NOTIFICATION LOGIC ADDED HERE ---
            // We don't wait for this to finish, just fire and forget
            const firstShiftDate = fullShiftPayload.dates[0];

fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        emailType: 'newShiftNotification',
        payload: {
            shiftTitle: fullShiftPayload.title,
            companyName: profile?.pharmacy_name || profile?.full_name || 'Ett Företag',
            shiftDate: firstShiftDate.date,
            shiftTime: `${firstShiftDate.start_time.slice(0, 5)} - ${firstShiftDate.end_time.slice(0, 5)}`,
            shiftLocation: fullShiftPayload.location,
            shiftDescription: fullShiftPayload.description,
            hourlyRate: fullShiftPayload.hourly_rate,
            is_urgent: fullShiftPayload.is_urgent,
            urgent_pay_adjustment: fullShiftPayload.urgent_pay_adjustment,
            employerId: profile?.id,
        },
    }),
}).catch(e => console.error("Failed to trigger shift notification:", e));

            if (onSuccess) { onSuccess(); }
            if (onClose) { onClose(); }
        } catch (err) {

            console.error('Error creating shifts:', err);
            const message = err instanceof Error ? err.message : 'An unexpected error occurred during shift creation.';
            setError(message);
            toast.error(`Failed to create shifts: ${message}`);
        } finally {
           setLoading(false);
       }
    };

    // --- JSX Return ---
    return (
        <div className="bg-white rounded-xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
            {/* Header */}
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Skapa Nytt Pass</h2>
                {onClose && (
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
                        <X className="h-6 w-6" />
                    </button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2" role="alert">
                    <AlertTriangle className="h-5 w-5 text-red-600"/>
                    <span>{error}</span>
                </div>
             )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        <input
                            type="text" id="title" name="title" required
                            value={formData.title} onChange={handleChange}
                            className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ange passtitel"
                        />
                    </div>
                </div>

                 {/* Required Role */}
                <div>
                    <label htmlFor="requiredRole" className="block text-sm font-medium text-gray-700 mb-1">
                        Önskad Roll <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="requiredRole" name="requiredRole" value={requiredRole} // Bind value to state variable
                        onChange={handleRoleChange} required // Use specific handler
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md input-field"
                    >
                        <option value="" disabled>-- Välj Roll --</option>
                        <option value="pharmacist">Farmaceut</option>
                        <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                        <option value="säljare">Säljare</option>
                    </select>
                 </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                     <textarea
                        id="description" name="description" required value={formData.description}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3} placeholder="Beskriv passkraven..."
                    />
                  </div>

                {/* Location */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        <input
                            type="text" id="location" name="location" required
                            value={formData.location} onChange={handleChange}
                            className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="E.g., Apoteket Hjärtat, City Center"
                        />
                    </div>
                  </div>

                 {/* Lunch Input */}
                 <div>
                    <label htmlFor="lunch" className="block text-sm font-medium text-gray-700 mb-1">
                        Lunch Duration (Optional)
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
                        <input
                            type="text" id="lunch" name="lunch" value={formData.lunch}
                            onChange={handleChange} list="lunch-options"
                            className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="E.g., 30 (for min), 0:45, 1 hour"
                        />
                        <datalist id="lunch-options">
                            <option value="15 min" />
                            <option value="30 min" />
                            <option value="45 min" />
                            <option value="1 hour" />
                        </datalist>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Enter minutes (e.g., "30"), time ("0:45"), or hours ("1 hour").</p>
                </div>

               <div>
                    <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-1">
                        Timlön (SEK) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        <input
                            type="text"
                            inputMode="decimal"
                            id="hourly_rate"
                            name="hourly_rate"
                            required
                            value={formData.hourly_rate}
                            onChange={handleChange}
                            className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="t.ex. 350"
                        />
                    </div>
                </div>

                {/* Urgent Shift Section */}
                  <div className="space-y-4 p-4 border border-orange-300 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <input
                            type="checkbox" id="is_urgent" name="is_urgent" // Use name for handleChange if needed, but direct state update is fine
                            checked={formData.is_urgent}
                            onChange={handleChange} // Re-use general handler
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="is_urgent" className="ml-3 block text-sm font-medium text-orange-800">
                            Markera pass som AKUT <AlertTriangle className="inline h-4 w-4 ml-1 text-orange-600"/>
                        </label>
                    </div>
                    {formData.is_urgent && (
                        <div>
                            <label htmlFor="urgent_pay_adjustment" className="block text-sm font-medium text-gray-700 mb-1">
                                Akut-tillägg (SEK/h extra)
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                <input
                                    type="text" inputMode="decimal" id="urgent_pay_adjustment"
                                    name="urgent_pay_adjustment" value={formData.urgent_pay_adjustment}
                                    onChange={handleChange} required={formData.is_urgent}
                                    className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 50.00"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Lägg till totala tilläg/h.</p>
                         </div>
                     )}
                  </div>

                {/* Dates & Times Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-4">
                        <label className="block text-sm font-medium text-gray-700">Pass Datum & Tider ({formData.dates.length})</label>
                        <button type="button" onClick={addDate} className="btn-secondary btn-sm">
                            <Plus className="h-4 w-4 mr-1" /> Lägg till enstaka datum
                        </button>
                    </div>

                     {/* Date Range Adder */}
                     <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 dark:border-secondary-700 space-y-3">
                         <p className="text-sm font-medium text-gray-600">Lägg till flera datum</p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                            <div>
                                 <label htmlFor="rangeStartDate" className="block text-xs font-medium text-gray-600 mb-1">Start Datum</label>
                                 <input
                                    type="date" id="rangeStartDate" value={rangeStartDate}
                                    min={todayStr}
                                    onChange={(e) => setRangeStartDate(e.target.value)}
                                    className="input-style text-sm" // Ensure input-style is defined
                                 />
                             </div>
                            <div>
                                 <label htmlFor="rangeEndDate" className="block text-xs font-medium text-gray-600 mb-1">Slut Datum</label>
                                 <input
                                    type="date" id="rangeEndDate" value={rangeEndDate}
                                    min={rangeStartDate || todayStr}
                                    onChange={(e) => setRangeEndDate(e.target.value)}
                                    className="input-style text-sm" // Ensure input-style is defined
                                 />
                             </div>
                        </div>
                         <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox" id="excludeWeekends"
                                    checked={excludeWeekends}
                                    onChange={(e) => setExcludeWeekends(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="excludeWeekends" className="ml-2 block text-sm text-gray-700">
                                    Exkludera helger (Lör/Sön)
                                </label>
                            </div>
                            <button type="button" onClick={handleAddDateRange} className="btn-primary btn-sm">
                                 Lägg till datum från period
                             </button>
                         </div>
                    </div>

                    {/* List of Added Dates */}
                    {formData.dates.length === 0 && (
                        <p className="text-center text-gray-500 italic py-4">Inga datum tillagda än.</p>
                    )}
                    {formData.dates.map((dateInfo, index) => (
                        <div key={`${dateInfo.date}-${index}`} className="bg-blue-50 p-4 rounded-lg relative border border-blue-200">
                           <button type="button" onClick={() => removeDate(index)} className="absolute top-1 right-1 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-100" aria-label="Remove Date">
                                <X className="h-5 w-5" />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Date Input */}
                                <div>
                                    <label htmlFor={`date-${index}`} className="block text-xs font-medium text-gray-600 mb-1">Datum</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                        <input id={`date-${index}`} type="date" required value={dateInfo.date} onChange={(e) => updateDate(index, 'date', e.target.value)} min={todayStr} className="input-style pl-9 text-sm" />
                                    </div>
                                </div>
                                {/* Start Time Input */}
                                <div>
                                    <label htmlFor={`start_time-${index}`} className="block text-xs font-medium text-gray-600 mb-1">Starttid</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                        <input id={`start_time-${index}`} type="time" required value={dateInfo.start_time} onChange={(e) => updateDate(index, 'start_time', e.target.value)} className="input-style pl-9 text-sm" />
                                    </div>
                                </div>
                                {/* End Time Input */}
                                <div>
                                    <label htmlFor={`end_time-${index}`} className="block text-xs font-medium text-gray-600 mb-1">Sluttid</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                        <input id={`end_time-${index}`} type="time" required value={dateInfo.end_time} onChange={(e) => updateDate(index, 'end_time', e.target.value)} className="input-style pl-9 text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Required Experience */}
                <div>
                    <label htmlFor="required_experience" className="block text-sm font-medium text-gray-700 mb-1">Erfarenhet (Optional, comma-separated)</label>
                      <input
                        type="text" id="required_experience" name="required_experience"
                        value={formData.required_experience.join(', ')}
                        onChange={(e) => setFormData(prev => ({ ...prev, required_experience: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')}))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="E.g., Kronex, Agera, etc"
                    />
                  </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 mt-6 border-t border-gray-200 dark:border-secondary-700">
                   {onClose && (
                        <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary">
                            Cancel
                        </button>
                     )}
                   <button
                        type="submit" disabled={loading || formData.dates.length === 0}
                        className="btn btn-primary min-w-[140px]"
                        title={formData.dates.length === 0 ? "Add at least one date" : "Create Shift(s)"}
                    >
                       {loading ? (
                            <> <Loader2 className="animate-spin h-5 w-5 mr-2" /> Skapar... </>
                        ) : (
                            <> <Plus className="h-5 w-5 mr-2" /> Skapa pass ({formData.dates.length}) </>
                        )}
                    </button>
                </div>
            </form>

            {/* Add simple button styles if not globally defined */}
            <style jsx>{`
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out; }
                .btn-sm { @apply px-3 py-1.5 text-xs; } /* Smaller buttons */
                .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .input-style { @apply w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed; }
                /* Style for role select to match other inputs */
                .input-field { @apply w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed; }
            `}</style>
        </div>
    );
}

// If this is the primary export:
export default CreateShiftForm;