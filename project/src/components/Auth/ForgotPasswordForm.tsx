// src/components/auth/ForgotPasswordForm.tsx

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`, // This is the page where users will reset their password
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setMessage('En återställningslänk har skickats till din e-postadress. Kontrollera din inkorg.');
      toast.success('Återställningslänk skickad!');
    }
  };

  return (
    <div className="w-full">
      <button onClick={onBackToLogin} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till inloggning
      </button>
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Glömt lösenord?</h2>
      <p className="text-sm text-gray-600 mb-6">
        Ingen fara. Ange din e-postadress nedan så skickar vi en länk för att återställa ditt lösenord.
      </p>

      {message ? (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-center">
          <p>{message}</p>
        </div>
      ) : (
        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-postadress
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-style"
                placeholder="din.email@exempel.com"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Skicka återställningslänk'}
            </button>
          </div>
        </form>
      )}
       <style jsx>{`
            .label-style { @apply block text-sm font-medium text-gray-700 mb-1; }
            .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm; }
            .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
            .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
        `}</style>
    </div>
  );
}