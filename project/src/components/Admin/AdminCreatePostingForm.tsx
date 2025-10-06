// src/components/Admin/AdminCreatePostingForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase'; // Adjust path
import { adminCreatePosting } from '../../lib/postings'; // Adjust path
import type { UserRole } from '../../types'; // Adjust path
import { Loader2, Save, X, Briefcase, MapPin, Calendar, Clock, DollarSign, ListChecks, Building2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface AdminCreatePostingFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

interface EmployerOption {
  id: string;
  display_name: string;
}

interface AdminPostingFormData {
  target_employer_id: string; // New field for admin
  title: string;
  description: string;
  required_role: UserRole | '';
  location: string;
  period_start_date: string;
  period_end_date: string;
  estimated_hours: string;
  salary_description: string;
  required_experience_str: string;
  status: 'open' | 'filled' | 'cancelled';
}

export function AdminCreatePostingForm({ onSuccess, onClose }: AdminCreatePostingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // Renamed from 'error' to avoid conflict
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [loadingEmployers, setLoadingEmployers] = useState(true);

  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);

  const [formData, setFormData] = useState<AdminPostingFormData>({
    target_employer_id: '',
    title: '',
    description: '',
    required_role: '',
    location: '',
    period_start_date: format(today, 'yyyy-MM-dd'),
    period_end_date: format(nextMonth, 'yyyy-MM-dd'),
    estimated_hours: '',
    salary_description: '',
    required_experience_str: '',
    status: 'open',
  });

  const fetchEmployersList = useCallback(async () => {
    setLoadingEmployers(true);
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
        display_name: emp.pharmacy_name || emp.full_name || `Arbetsgivare ${emp.id.substring(0, 6)}`
      })) || []);
    } catch (err) {
      toast.error("Kunde inte ladda arbetsgivarlistan.");
      console.error("Error fetching employers for admin form:", err);
    } finally {
      setLoadingEmployers(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployersList();
  }, [fetchEmployersList]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.target_employer_id) return 'Du måste välja en arbetsgivare.';
    if (!formData.title.trim()) return 'Titel är obligatoriskt.';
    if (!formData.required_role) return 'Önskad roll måste väljas.';
    if (!formData.description.trim()) return 'Beskrivning är obligatoriskt.';
    if (!formData.period_start_date) return 'Startdatum för perioden är obligatoriskt.';
    if (!formData.period_end_date) return 'Slutdatum för perioden är obligatoriskt.';
    if (formData.period_start_date > formData.period_end_date) {
      return 'Slutdatum måste vara samma dag som eller efter startdatum.';
    }
    if (!['open', 'filled', 'cancelled'].includes(formData.status)) {
        return 'Ogiltig status vald.';
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    toast.dismiss();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);

    const experienceArray = formData.required_experience_str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

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
      status: formData.status,
    };

    try {
      const { data: createdPosting, error: createError } = await adminCreatePosting(formData.target_employer_id, payload);

      if (createError) throw new Error(createError);

      toast.success(`Jobbannons skapad för ${employers.find(e => e.id === formData.target_employer_id)?.display_name || 'vald arbetsgivare'}!`);
      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (err) {
      console.error('Error creating job posting as admin:', err);
      const message = err instanceof Error ? err.message : 'Ett oväntat fel inträffade.';
      setFormError(message);
      toast.error(`Misslyckades: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Skapa Ny Jobbannons (Admin)</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Stäng">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {formError && (
        <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2" role="alert">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="target_employer_id" className="label-style">Arbetsgivare <span className="text-red-500">*</span></label>
          <div className="relative">
            <Building2 className="input-icon" />
            <select
              id="target_employer_id" name="target_employer_id" required
              value={formData.target_employer_id} onChange={handleChange}
              disabled={loadingEmployers}
              className="input-style pl-10 bg-white"
            >
              <option value="" disabled>{loadingEmployers ? 'Laddar arbetsgivare...' : '-- Välj Arbetsgivare --'}</option>
              {employers.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.display_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="title" className="label-style">Titel <span className="text-red-500">*</span></label>
          <input id="title" name="title" type="text" required value={formData.title} onChange={handleChange} className="input-style" placeholder="t.ex., Farmaceut Sommarvikariat"/>
        </div>

        <div>
          <label htmlFor="required_role" className="label-style">Önskad Roll <span className="text-red-500">*</span></label>
          <div className="relative">
            <Briefcase className="input-icon" />
            <select id="required_role" name="required_role" required value={formData.required_role} onChange={handleChange} className="input-style pl-10 bg-white">
              <option value="" disabled>-- Välj Roll --</option>
              <option value="pharmacist">Farmaceut</option>
              <option value="egenvårdsrådgivare">Egenvårdsrådgivare</option>
              <option value="säljare">Säljare</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label-style">Beskrivning <span className="text-red-500">*</span></label>
          <textarea id="description" name="description" required value={formData.description} onChange={handleChange} className="input-style" rows={3} placeholder="Beskriv arbetsuppgifter, krav och förmåner..."/>
        </div>

        <div>
          <label htmlFor="location" className="label-style">Plats (Valfritt)</label>
          <div className="relative">
            <MapPin className="input-icon" />
            <input id="location" name="location" type="text" value={formData.location} onChange={handleChange} className="input-style pl-10" placeholder="t.ex., Stockholm City"/>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="period_start_date" className="label-style">Period Start <span className="text-red-500">*</span></label>
            <input id="period_start_date" name="period_start_date" type="date" required value={formData.period_start_date} onChange={handleChange} className="input-style"/>
          </div>
          <div>
            <label htmlFor="period_end_date" className="label-style">Period Slut <span className="text-red-500">*</span></label>
            <input id="period_end_date" name="period_end_date" type="date" required value={formData.period_end_date} min={formData.period_start_date} onChange={handleChange} className="input-style"/>
          </div>
        </div>

        <div>
          <label htmlFor="estimated_hours" className="label-style">Beräknade Timmar (Valfritt)</label>
          <div className="relative">
            <Clock className="input-icon" />
            <input id="estimated_hours" name="estimated_hours" type="text" value={formData.estimated_hours} onChange={handleChange} className="input-style pl-10" placeholder="t.ex., Heltid, 20 tim/vecka"/>
          </div>
        </div>

        <div>
          <label htmlFor="salary_description" className="label-style">Lön/Ersättning (Valfritt)</label>
          <div className="relative">
            <DollarSign className="input-icon" />
            <input id="salary_description" name="salary_description" type="text" value={formData.salary_description} onChange={handleChange} className="input-style pl-10" placeholder="t.ex., Månadslön, Enligt överenskommelse"/>
          </div>
        </div>

        <div>
          <label htmlFor="required_experience_str" className="label-style">Erfarenhetskrav (Valfritt, komma-separerat)</label>
          <div className="relative">
            <ListChecks className="input-icon" />
            <input id="required_experience_str" name="required_experience_str" type="text" value={formData.required_experience_str} onChange={handleChange} className="input-style pl-10" placeholder="t.ex., Apodos, Detaljhandel"/>
          </div>
        </div>

         <div>
            <label htmlFor="status" className="label-style">Status <span className="text-red-500">*</span></label>
            <select id="status" name="status" required value={formData.status} onChange={handleChange} className="input-style bg-white">
                <option value="open">Öppen</option>
                <option value="filled">Tillsatt</option>
                <option value="cancelled">Avbokad</option>
            </select>
        </div>

        <div className="flex justify-end gap-4 pt-4 mt-6 border-tborder-gray-200">
          {onClose && (
            <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary">
              Avbryt
            </button>
          )}
          <button type="submit" disabled={loading || loadingEmployers} className="btn btn-primary min-w-[160px]">
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            {loading ? 'Skapar...' : 'Skapa Annons'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .label-style { @apply block text-sm font-medium text-gray-700 mb-1; }
        .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100; }
        .input-icon { @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none; }
        .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
        .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
        .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
      `}</style>
    </div>
  );
}