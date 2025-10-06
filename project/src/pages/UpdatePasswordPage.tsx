// src/pages/UpdatePasswordPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
// CORRECT: Import the logo's path as a variable
import farmispoolenLogo from '/assets/farmispoolenLogo.png'; 

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // This event confirms the user is ready to update their password.
      }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
        setError("Lösenordet måste vara minst 6 tecken långt.");
        toast.error("Lösenordet måste vara minst 6 tecken långt.");
        return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError("Kunde inte uppdatera lösenordet. Länken kan ha gått ut eller så var lösenordet ogiltigt. Försök igen.");
      toast.error("Kunde inte uppdatera lösenordet.");
    } else {
      toast.success('Ditt lösenord har uppdaterats! Du kan nu logga in.');
      navigate('/login'); // Redirect to login page on success
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* CORRECT: Use a standard <img> tag with the imported logo path */}
        <img src={farmispoolenLogo} alt="Farmispoolen Logotyp" className="mx-auto h-12 w-auto" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Ange nytt lösenord
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <label htmlFor="new-password" className="label-style">
                Nytt lösenord
              </label>
              <div className="mt-1">
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-style"
                  placeholder="Minst 6 tecken"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Spara nytt lösenord'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
          .label-style { @apply block text-sm font-medium text-gray-700; }
          .input-style { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm; }
          .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
          .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
      `}</style>
    </div>
  );
}