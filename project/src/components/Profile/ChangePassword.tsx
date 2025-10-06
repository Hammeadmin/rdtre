// src/components/Profile/ChangePassword.tsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ChangePassword = () => {
  const { profile } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

 const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        // This function sends a password reset link to the user's email.
        const { error } = await supabase.auth.resetPasswordForEmail(
            profile.email, // Use the user's email from the auth context
            { redirectTo: `${window.location.origin}/update-password` }
        );

        if (error) throw error;

        toast.success('En länk för att återställa lösenordet har skickats till din e-post.');
    } catch (error: any) {
        toast.error(`Misslyckades: ${error.message}`);
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
        <KeyRound className="w-5 h-5 mr-2 text-gray-500" />
        Ändra lösenord
      </h3>
      <form onSubmit={handlePasswordUpdate} className="space-y-3">
    <p className="text-sm text-gray-600">
        Klicka på knappen nedan för att få en säker länk skickad till din e-postadress för att byta ditt lösenord.
    </p>
    <button type="submit" disabled={loading} className="btn btn-primary w-full sm:w-auto">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {loading ? 'Skickar...' : 'Skicka länk för lösenordsbyte'}
    </button>
</form>
    </div>
  );
};