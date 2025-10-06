import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, MessageCircle, CreditCard, Settings } from 'lucide-react';
import { ProfileSetup } from '../components/Profile/ProfileSetup';
import { MessagesPanel } from '../components/Messages/MessagesPanel';
import { useEffect } from 'react'; 
import { NotificationToggle } from '../components/Profile/NotificationToggle'; // <-- 1. Import
import { ChangePassword } from '../components/Profile/ChangePassword';
import { AppearanceSettings } from '../components/Profile/AppearanceSettings';
import { BillingSettings } from '../components/Profile/BillingSettings';
import { DataManagement } from '../components/Profile/DataManagement';
import { CityNotificationSettings } from '../components/Profile/CityNotificationSettings';
import { useParams, useNavigate } from 'react-router-dom';
import { MyReviews } from '../components/Profile/MyReviews';
import { SubscriptionStatus } from '../components/Profile/SubscriptionStatus';


type TabType = 'profile' | 'subscription' | 'settings';

export function ProfilePage() {
  const { tab } = useParams<{ tab: TabType }>();
  const navigate = useNavigate();
   const [activeTab, setActiveTab] = useState<TabType>(tab || 'profile');
  const { profile, fetchProfile, session } = useAuth();
  const isEmployee = ['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile.role);
   const isEmployer = profile?.role === 'employer';

useEffect(() => {
  // Sync URL with the active tab state
  if (tab !== activeTab) {
    navigate(`/profile/${activeTab}`, { replace: true });
  }
}, [activeTab, navigate, tab]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  } 

  const handleUpdate = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

const tabs = [
  { id: 'profile', label: 'Profil', icon: User },
  ...(isEmployer ? [{ id: 'subscription', label: 'Prenumeration', icon: CreditCard }] : []),
  { id: 'settings', label: 'Inställningar', icon: Settings },
];

  return (
    <div className="p-4">
      <div className="flex space-x-4 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
    <button
      key={id}
      // The className logic can stay the same
      className={`px-4 py-2 rounded ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      // Update the onClick to just set the state
      onClick={() => setActiveTab(id as TabType)}
    >
      <Icon className="inline mr-2" />
      {label}
    </button>
  ))}
      </div>

     <div>
  {activeTab === 'profile' && <ProfileSetup onUpdate={handleUpdate} />}
       {/* New tab content for subscription, only for employers */}
      {activeTab === 'subscription' && isEmployer && (
  <div className="max-w-4xl mx-auto">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Abonnemang & Fakturering</h2>
    {/* This single component now handles everything */}
    <BillingSettings />
  </div>
)}

  {/* --- THIS IS THE FIX --- */}
  {/* The settings content is now correctly wrapped in its own conditional block */}
  {activeTab === 'settings' && (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Inställningar</h2>
      <div className="space-y-8">
        {/* == General Settings for ALL Users == */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Allmänt</h3>
          <div className="space-y-4">
            <NotificationToggle />
            {isEmployee && <CityNotificationSettings />}
          </div>
        </div>

        {/* == Security and Account Management for ALL Users == */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Säkerhet</h3>
          <ChangePassword />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-600 mb-4 border-b pb-2">Kontohantering</h3>
          <div className="space-y-4">
            <DataManagement />
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                Kontakta support på <a href="mailto:support@farmispoolen.se" className="font-semibold underline hover:text-red-900">support@farmispoolen.se</a> för att begära borttagning av ditt konto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
      </div>
    </div>
  );
}