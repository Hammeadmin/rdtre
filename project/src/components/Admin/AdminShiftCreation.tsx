// src/components/Admin/AdminShiftCreation.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, FileText, Plus, MapPin, AlertTriangle, DollarSign, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { UserRole } from '../../types'; // Assuming UserRole is defined in your types

// Helper function to parse lunch input
function parseLunchInputToInterval(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmedInput = input.trim().toLowerCase();
    if (trimmedInput === '' || trimmedInput === '0' || trimmedInput === 'none') return null;

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
        return trimmedInput; // Return as is
    }
    
    // If input is provided but doesn't match known formats for parsing to interval
    if (trimmedInput) {
      toast.error(`Invalid lunch format: "${input}". Use minutes (e.g., 30) or time (HH:MM).`);
    }
    return null; // Default to null if parsing fails or input is empty/invalid
}


interface AdminShiftFormData {
  employer_id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  required_experience: string[];
  status: 'open' | 'filled' | 'cancelled';
  location: string;
  required_role: UserRole | '';
  lunch: string; 
  is_urgent: boolean;
  urgent_pay_adjustment: string;
}

export function AdminShiftCreation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employers, setEmployers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [formData, setFormData] = useState<AdminShiftFormData>({
    employer_id: '',
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
    required_experience: [],
    status: 'open',
    location: '',
    required_role: '',
    lunch: '',
    is_urgent: false,
    urgent_pay_adjustment: '',
    hourly_rate: '',
  });

  useEffect(() => {
    fetchEmployers();
  }, []);

  const fetchEmployers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, pharmacy_name')
        .eq('role', 'employer')
        .order('pharmacy_name', { ascending: true, nullsFirst: false })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployers(data?.map(emp => ({ 
        id: emp.id, 
        display_name: emp.pharmacy_name || emp.full_name || `Employer ID: ${emp.id.substring(0,8)}` 
      })) || []);
    } catch (err) {
      console.error('Error fetching employers:', err);
      toast.error('Kunde inte hämta arbetsgivare');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: checked,
            ...(name === 'is_urgent' && !checked && { urgent_pay_adjustment: '' })
        }));
    } else if (name === 'urgent_pay_adjustment') {
        const numericValue = value.replace(/[^0-9.]/g, '');
        if ((numericValue.match(/\./g) || []).length <= 1) {
            setFormData(prev => ({ ...prev, [name]: numericValue }));
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    toast.dismiss();

    if (!formData.employer_id) { setError("Arbetsgivare måste väljas."); toast.error("Arbetsgivare måste väljas."); return; }
    if (!formData.title.trim()) { setError("Titel är obligatoriskt."); toast.error("Titel är obligatoriskt."); return; }
    if (!formData.required_role) { setError("Önskad roll måste väljas."); toast.error("Önskad roll måste väljas."); return; }
    if (formData.is_urgent && (!formData.urgent_pay_adjustment.trim() || parseFloat(formData.urgent_pay_adjustment) <= 0)) {
        setError("Brådskande ersättningstillägg måste vara ett positivt tal när passet är brådskande.");
        toast.error("Brådskande ersättningstillägg måste vara ett positivt tal.");
        return;
    }
    if (formData.start_time >= formData.end_time) {
        setError("Sluttid måste vara efter starttid.");
        toast.error("Sluttid måste vara efter starttid.");
        return;
    }

    const parsedLunch = parseLunchInputToInterval(formData.lunch);
    if (formData.lunch.trim() && parsedLunch === null) {
        setError("Ogiltigt format för lunchrast. Ange minuter (t.ex. 30) eller tid (HH:MM).");
        // Toast is already shown by parseLunchInputToInterval if input was provided
        return; 
    }

    setLoading(true);

    try {
      const rpcParams = {
        p_employer_id: formData.employer_id,
        p_title: formData.title.trim(),
        p_description: formData.description.trim() || null, // Send null if empty
        p_date: formData.date,
        p_start_time: `${formData.start_time}:00`, // Append seconds for TIME type
        p_end_time: `${formData.end_time}:00`,   // Append seconds for TIME type
        p_lunch: parsedLunch, 
        p_required_experience: formData.required_experience.filter(exp => exp.trim() !== ''),
        p_status: formData.status,
        p_location: formData.location.trim() || null,
        p_required_role: formData.required_role as UserRole,
        p_is_urgent: formData.is_urgent,
        p_urgent_pay_adjustment: formData.is_urgent && formData.urgent_pay_adjustment.trim() ? parseFloat(formData.urgent_pay_adjustment) : null,
        p_hourly_rate: parseFloat(formData.hourly_rate),
      };

      const { data: createdShiftData, error: rpcError } = await supabase.rpc('admin_create_shift', rpcParams);

      if (rpcError) {
        console.error("RPC Error creating shift:", rpcError);
        throw new Error(rpcError.message || 'Ett databasfel inträffade vid skapande av pass.');
      }
      
      if (!createdShiftData || (Array.isArray(createdShiftData) && createdShiftData.length === 0)) {
        console.warn("RPC admin_create_shift succeeded but returned no data or an empty set.");
        // This might not be a hard error if the RPC is defined to return SETOF and nothing matches the final RETURN QUERY
        // However, since it's an INSERT RETURNING, it should return the inserted row.
        toast.success('Pass skapat (men ingen data returnerades för bekräftelse).');
      } 

      navigate('/dashboard');
    } catch (err) {
      console.error('Error in handleSubmit for AdminShiftCreation:', err);
      const displayError = err instanceof Error ? err.message : 'Kunde inte skapa pass. Ett okänt fel inträffade.';
      setError(displayError);
      toast.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Skapa pass (Admin)</h2>

        {error && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
            <p className="font-bold">Fel</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="employer_id" className="block text-sm font-medium text-gray-700 mb-1">Arbetsgivare <span className="text-red-500">*</span></label>
            <select id="employer_id" name="employer_id" required value={formData.employer_id} onChange={handleChange} className="input-field">
              <option value="" disabled>Välj en arbetsgivare</option>
              {employers.map((employer) => (
                <option key={employer.id} value={employer.id}>
                  {employer.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Titel <span className="text-red-500">*</span></label>
            <div className="relative">
              <FileText className="input-icon" />
              <input type="text" id="title" name="title" required value={formData.title} onChange={handleChange} className="input-field pl-10" placeholder="T.ex. Morgonpass Apotekare"/>
            </div>
          </div>
          
          <div>
            <label htmlFor="required_role" className="block text-sm font-medium text-gray-700 mb-1">Önskad Roll <span className="text-red-500">*</span></label>
            <div className="relative">
                <Briefcase className="input-icon" />
                <select id="required_role" name="required_role" required value={formData.required_role} onChange={handleChange} className="input-field pl-10 bg-white">
                    <option value="" disabled>-- Välj Roll --</option>
                    <option value="pharmacist">Farmaceut</option>
                    <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
                    <option value="säljare">Säljare</option>
                </select>
            </div>
          </div>
          <div>
                <label htmlFor="hourly_rate">Timlön (SEK)</label>
                <input
                    id="hourly_rate"
                    name="hourly_rate"
                    type="number"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    required
                    className="your-input-style"
                    placeholder="e.g., 350"
                />
            </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Beskrivning (Valfritt)</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} className="input-field" rows={3} placeholder="Detaljer om passet, specifika uppgifter etc."/>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Plats (Valfritt)</label>
            <div className="relative">
                <MapPin className="input-icon" />
                <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} className="input-field pl-10" placeholder="T.ex. Storgatan 1, Stockholm"/>
            </div>
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Datum <span className="text-red-500">*</span></label>
            <div className="relative">
              <Calendar className="input-icon" />
              <input type="date" id="date" name="date" required value={formData.date} onChange={handleChange} min={format(new Date(), 'yyyy-MM-dd')} className="input-field pl-10"/>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">Starttid <span className="text-red-500">*</span></label>
              <div className="relative">
                <Clock className="input-icon" />
                <input type="time" id="start_time" name="start_time" required value={formData.start_time} onChange={handleChange} className="input-field pl-10"/>
              </div>
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">Sluttid <span className="text-red-500">*</span></label>
              <div className="relative">
                <Clock className="input-icon" />
                <input type="time" id="end_time" name="end_time" required value={formData.end_time} onChange={handleChange} className="input-field pl-10"/>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="lunch" className="block text-sm font-medium text-gray-700 mb-1">Lunchrast (Valfritt)</label>
            <div className="relative">
                <Clock className="input-icon" />
                <input type="text" id="lunch" name="lunch" value={formData.lunch} onChange={handleChange} className="input-field pl-10" placeholder="T.ex. 30 min, 0:45, 1 hour"/>
            </div>
            <p className="mt-1 text-xs text-gray-500">Ange i minuter (t.ex. "30") eller tid (HH:MM, t.ex. "0:45").</p>
          </div>

          {/* Urgent Shift Section */}
          <div className="space-y-3 p-4 border border-orange-300 bg-orange-50 rounded-lg">
            <div className="flex items-center">
                <input type="checkbox" id="is_urgent" name="is_urgent" checked={formData.is_urgent} onChange={handleChange} className="form-checkbox"/>
                <label htmlFor="is_urgent" className="ml-3 block text-sm font-medium text-orange-800"> Markera passet som BRÅDSKANDE <AlertTriangle className="inline h-4 w-4 ml-1 text-orange-600"/></label>
            </div>
            {formData.is_urgent && (
                <div>
                    <label htmlFor="urgent_pay_adjustment" className="block text-sm font-medium text-gray-700 mb-1"> Brådskande Ersättningstillägg (SEK/timme extra) <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <DollarSign className="input-icon" />
                        <input type="text" inputMode="decimal" id="urgent_pay_adjustment" name="urgent_pay_adjustment" value={formData.urgent_pay_adjustment} onChange={handleChange} required={formData.is_urgent} className="input-field pl-10" placeholder="t.ex. 50.00"/>
                    </div>
                </div>
            )}
          </div>

          <div>
            <label htmlFor="required_experience" className="block text-sm font-medium text-gray-700 mb-1">Erfarenhetskrav (Valfritt)</label>
            <input type="text" id="required_experience" name="required_experience" value={formData.required_experience.join(', ')} onChange={(e) => setFormData({ ...formData, required_experience: e.target.value.split(',').map(s => s.trim()).filter(Boolean), })} className="input-field" placeholder="Separera med kommatecken, t.ex. Apodos, Receptarie"/>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Initial Status <span className="text-red-500">*</span></label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} className="input-field bg-white">
              <option value="open">Öppet</option>
              <option value="filled">Tillsatt (om du redan har någon)</option>
              <option value="cancelled">Avbokat (ovanligt vid skapande)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary"> Avbryt </button>
            <button type="submit" disabled={loading} className="btn btn-primary min-w-[120px]">
              {loading ? ( <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Skapar...</> ) : ( <><Plus className="h-5 w-5 mr-1.5" />Skapa pass</> )}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .input-field { @apply w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors; }
        .input-icon { @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none; }
        .form-checkbox { @apply h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500; }
        .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors; }
        .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
        .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
      `}</style>
    </div>
  );
}