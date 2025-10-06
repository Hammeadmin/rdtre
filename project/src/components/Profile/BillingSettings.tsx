// src/components/Profile/BillingSettings.tsx
import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SubscriptionStatus } from './SubscriptionStatus';
import { supabase } from '../../lib/supabase';

export const BillingSettings = () => {
  const [isPortalLoading, setPortalLoading] = useState(false);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          // The URL the user will be redirected to after they are done
          return_url: window.location.href,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Could not open customer portal.');
      }

      const { url: portalUrl } = await response.json();
      if (portalUrl) {
        window.location.href = portalUrl;
      } else {
        throw new Error("Portal URL not found.");
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* This will display the status banner (trial, active, expired, etc.) */}
      <SubscriptionStatus />

      {/* This section contains the management tools */}
      <div className="p-4 bg-gray-50 rounded-lg border">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
          Hantera Abonnemang & Fakturering
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white rounded-md border">
            <div>
              <p className="text-sm font-medium text-gray-900">Hantera abonnemang</p>
              <p className="text-xs text-gray-500">Ändra din plan eller uppdatera betalningsmetod.</p>
            </div>
            <button 
              className="btn btn-secondary btn-sm w-40" 
              onClick={handleOpenPortal}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? <Loader2 className="animate-spin" /> : 'Öppna kundportal'}
            </button>
          </div>
          <div className="p-3 bg-white rounded-md border">
            <p className="text-sm font-medium text-gray-900 mb-2">Fakturor</p>
            <p className="text-xs text-gray-500">Din fakturahistorik visas i kundportalen.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
