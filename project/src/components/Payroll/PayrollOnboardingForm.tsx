// src/components/Payroll/PayrollOnboardingForm.tsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Loader2, Save, AlertCircle } from 'lucide-react';

interface PayrollOnboardingFormProps {
  userId: string;
  onComplete: () => void;
}

export const PayrollOnboardingForm: React.FC<PayrollOnboardingFormProps> = ({ userId, onComplete }) => {
  const [formData, setFormData] = useState({
    birth_date: '',
    tax_percentage: 32,
    bank_name: '',
    clearing_number: '',
    account_number: '',
    address: '',
    postal_code: '',
    city: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    for (const [key, value] of Object.entries(formData)) {
      if (value === '' || (typeof value === 'number' && isNaN(value))) {
        setError(`Fältet "${key}" får inte vara tomt.`);
        setIsLoading(false);
        toast.error(`Vänligen fyll i alla fält.`);
        return;
      }
    }

    try {
      const { error: insertError } = await supabase
        .from('payroll_information')
        .insert({
          id: userId, // Link to the user's profile ID
          ...formData,
          tax_percentage: Number(formData.tax_percentage),
        });

      if (insertError) throw insertError;

      toast.success('Dina uppgifter har sparats!');
      onComplete(); // Trigger the parent component to refresh its data
    } catch (e: any) {
      console.error("Error saving payroll information:", e);
      setError('Ett fel inträffade. Kontrollera dina uppgifter och försök igen.');
      toast.error('Kunde inte spara uppgifterna.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white rounded-xl shadow-2xl border">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Komplettera din profil</h1>
        <p className="text-slate-600 mt-2">För att vi ska kunna betala ut din lön behöver du fylla i dina bank- och personuppgifter nedan.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information Section */}
        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <legend className="text-lg font-semibold text-gray-700 col-span-full border-b pb-2 mb-2">Personuppgifter</legend>
          <div>
            <label htmlFor="birth_date" className="form-label">Personnummer</label>
            <input type="text" id="birth_date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="form-input" required placeholder="ÅÅÅÅMMDD-XXXX" />
          </div>
           <div>
            <label htmlFor="tax_percentage" className="form-label">Preliminär skattesats (%)</label>
            <input type="number" id="tax_percentage" name="tax_percentage" value={formData.tax_percentage} onChange={handleChange} className="form-input" min="0" max="100" required />
            <p className="text-xs text-gray-500 mt-1">Standard är 30%. Ändra om du har fått ett annat besked från Skatteverket.</p>
          </div>
        </fieldset>

        {/* Address Section */}
        <fieldset className="grid grid-cols-1 gap-6">
           <legend className="text-lg font-semibold text-gray-700 col-span-full border-b pb-2 mb-2">Adress</legend>
            <div>
              <label htmlFor="address" className="form-label">Gatuadress</label>
              <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className="form-input" required />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                <div className="sm:col-span-2">
                    <label htmlFor="postal_code" className="form-label">Postnummer</label>
                    <input type="text" id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleChange} className="form-input" required />
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="city" className="form-label">Stad</label>
                    <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} className="form-input" required />
                </div>
            </div>
        </fieldset>

        {/* Bank Information Section */}
        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <legend className="text-lg font-semibold text-gray-700 col-span-full border-b pb-2 mb-2">Bankuppgifter</legend>
          <div>
            <label htmlFor="bank_name" className="form-label">Bankens namn</label>
            <input type="text" id="bank_name" name="bank_name" value={formData.bank_name} onChange={handleChange} className="form-input" required />
          </div>
          <div>
            <label htmlFor="clearing_number" className="form-label">Clearingnummer</label>
            <input type="text" id="clearing_number" name="clearing_number" value={formData.clearing_number} onChange={handleChange} className="form-input" required />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="account_number" className="form-label">Kontonummer</label>
            <input type="text" id="account_number" name="account_number" value={formData.account_number} onChange={handleChange} className="form-input" required />
          </div>
        </fieldset>

        {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center">
                <AlertCircle size={18} className="mr-2" />
                <span>{error}</span>
            </div>
        )}

        <div className="pt-4 border-t text-right">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            Spara uppgifter
          </button>
        </div>
      </form>
    </div>
  );
};