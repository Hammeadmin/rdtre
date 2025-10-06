import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Bell, BellOff } from 'lucide-react';

export const NotificationToggle = () => {
  const { profile, user, fetchProfile } = useAuth();
  // Initialize state from the profile, defaulting to false.
  const [isEnabled, setIsEnabled] = useState(profile?.receives_notifications ?? false);
  const [loading, setLoading] = useState(false);

  // Ensure the toggle's state is in sync with the profile data when it loads/changes.
  useEffect(() => {
    if (profile) {
      setIsEnabled(profile.receives_notifications);
    }
  }, [profile]);

  const handleToggle = async () => {
    if (!user || !profile) {
      toast.error("Kunde inte hitta användarprofil.");
      return;
    }

    const newValue = !isEnabled;
    setLoading(true);
    setIsEnabled(newValue); // Optimistically update the UI

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ receives_notifications: newValue })
        .eq('id', user.id);

      if (error) {
        // If the update fails, revert the UI and show an error.
        setIsEnabled(!newValue);
        throw error;
      }

      toast.success('Inställning sparad!');
      // Refresh the profile context to ensure the rest of the app is in sync.
      await fetchProfile(user.id);
    } catch (error) {
      const err = error as Error;
      console.error('Failed to update notification setting:', err);
      toast.error(`Fel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!profile || !['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile.role)) {
    // Only show this setting to relevant user roles.
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
      <div className="flex-grow">
        <h4 className="font-semibold text-gray-800">E-postnotiser</h4>
        <p className="text-gray-600">
          Få ett mail när nya pass eller uppdrag som matchar din profil publiceras.
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        {isEnabled ? <Bell className="w-5 h-5 text-green-600" /> : <BellOff className="w-5 h-5 text-gray-500" />}
        <button
          role="switch"
          aria-checked={isEnabled}
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};