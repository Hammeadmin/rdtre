import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2, Eye, Send } from 'lucide-react';
import type { ContractTemplate } from '../../types';

interface SendContractViewProps {
  templates: ContractTemplate[];
  onContractSent: () => void;
}

export const SendContractView: React.FC<SendContractViewProps> = ({ templates = [], onContractSent }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeSsn, setEmployeeSsn] = useState('');
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [hourlySalary, setHourlySalary] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [workDuties, setWorkDuties] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // --- NEW: State to track if a preview has been successfully generated ---
  const [isPreviewGenerated, setIsPreviewGenerated] = useState(false);

  const { session } = useAuth();
  const isBuiltInTemplate = selectedTemplate.startsWith('builtin_');

  // When form fields change, reset the preview state
  const handleInputChange = <T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<T>) => {
      setter(e.target.value);
      setIsPreviewGenerated(false); // Reset preview status on any change
  };

  const getDynamicData = () => ({
    employee_name: employeeName,
    employee_ssn: employeeSsn,
    employee_address: employeeAddress,
    start_date: startDate,
    salary_hourly: hourlySalary,
    job_title: jobTitle,
    work_duties: workDuties,
    end_date: endDate,
  });

  const resetForm = () => {
    setSelectedTemplate('');
    setEmployeeEmail('');
    setEmployeeName('');
    setEmployeeSsn('');
    setEmployeeAddress('');
    setStartDate('');
    setHourlySalary('');
    setJobTitle('');
    setWorkDuties('');
    setIsPreviewGenerated(false);
    setEndDate('');
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !employeeEmail || (isBuiltInTemplate && !employeeName)) {
      toast.error('Vänligen fyll i alla obligatoriska fält.');
      return;
    }

    setIsPreviewLoading(true);
    setIsPreviewGenerated(false);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-and-send-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'preview',
          template_id: selectedTemplate,
          employee_email: employeeEmail,
          dynamic_data: getDynamicData(),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kunde inte skapa förhandsgranskning.');
      
      // --- THIS IS THE KEY CHANGE ---
      // Open the preview in a new tab instead of a modal
      window.open(result.previewUrl, '_blank');
      setIsPreviewGenerated(true); // Enable the "Send" button

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-and-send-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'send',
          template_id: selectedTemplate,
          employee_email: employeeEmail,
          dynamic_data: getDynamicData(),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Avtalet kunde inte skickas.');
      
      toast.success('Avtalet har skickats för signering!');
      onContractSent();
      resetForm();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Skicka nytt avtal</h3>
      <form onSubmit={handlePreview} className="space-y-4">
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">Välj avtalsmall</label>
          <select id="template" value={selectedTemplate} onChange={handleInputChange(setSelectedTemplate)} required className="form-select w-full">
            <option value="" disabled>Välj en mall...</option>
            <optgroup label="Inbyggda Mallar">
              <option value="builtin_hourly">Anställningsavtal Timlön (Standard)</option>
              <option value="builtin_consultant_employee">Konsult - Visstidsanställning</option>
              <option value="builtin_consultant_company">Konsultavtal - Företag (B2B)</option>
            </optgroup>
            {templates.length > 0 && (
              <optgroup label="Mina Egna Mallar">
                {templates.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Mottagarens E-post</label>
          <input type="email" id="email" value={employeeEmail} onChange={handleInputChange(setEmployeeEmail)} required placeholder="exempel@foretag.se" className="form-input w-full" />
        </div>

        {isBuiltInTemplate && (
          <>
            <h4 className="text-md font-medium text-gray-600 pt-4 border-t mt-6">Fyll i avtalsinformation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                  <input type="text" id="employeeName" value={employeeName} onChange={handleInputChange(setEmployeeName)} required className="form-input w-full" />
                </div>
                <div>
                  <label htmlFor="employeeSsn" className="block text-sm font-medium text-gray-700 mb-1">Person-/Org.nummer</label>
                  <input type="text" id="employeeSsn" value={employeeSsn} onChange={handleInputChange(setEmployeeSsn)} required className="form-input w-full" />
                </div>
            </div>
             <div>
                <label htmlFor="employeeAddress" className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
                <input type="text" id="employeeAddress" value={employeeAddress} onChange={handleInputChange(setEmployeeAddress)} required className="form-input w-full" />
            </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                <input type="date" id="startDate" value={startDate} onChange={handleInputChange(setStartDate)} required className="form-input w-full" />
            </div>
            <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Slutdatum (valfritt)</label>
                <input type="date" id="endDate" value={endDate} onChange={handleInputChange(setEndDate)} className="form-input w-full" />
            </div>
            <div className="sm:col-span-2">
                <label htmlFor="hourlySalary" className="block text-sm font-medium text-gray-700 mb-1">Timlön / Arvode (SEK)</label>
                <input type="number" id="hourlySalary" value={hourlySalary} onChange={handleInputChange(setHourlySalary)} required placeholder="ex. 150" className="form-input w-full" />
            </div>
        </div>

            {selectedTemplate === 'builtin_hourly' && (
                 <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">Befattning / Titel</label>
                    <input type="text" id="jobTitle" value={jobTitle} onChange={handleInputChange(setJobTitle)} required placeholder="t.ex. Apotekstekniker" className="form-input w-full" />
                </div>
            )}
           
            <div>
                <label htmlFor="workDuties" className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedTemplate === 'builtin_consultant' ? 'Beskrivning av uppdraget' : 'Huvudsakliga arbetsuppgifter'}
                </label>
                <textarea id="workDuties" value={workDuties} onChange={handleInputChange(setWorkDuties)} required rows={3} className="form-textarea w-full"></textarea>
            </div>
          </>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button type="submit" className="btn btn-secondary w-full" disabled={isPreviewLoading}>
            {isPreviewLoading ? <Loader2 className="animate-spin mr-2" /> : <Eye className="mr-2 h-4 w-4" />}
            Granska Avtal
          </button>
           <button type="button" onClick={handleSend} className="btn btn-primary w-full" disabled={!isPreviewGenerated || isSending}>
            {isSending ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
            Skicka för Signering
          </button>
        </div>
         {isPreviewGenerated && (
            <p className="text-sm text-center text-green-700">Förhandsgranskning skapad. Kontrollera dokumentet i den nya fliken och klicka sedan på "Skicka för Signering".</p>
        )}
      </form>
    </div>
  );
};

