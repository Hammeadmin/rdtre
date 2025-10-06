// src/components/Profile/SubscriptionStatus.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { differenceInDays, fromUnixTime } from 'date-fns';
import { Clock, Star, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

// Custom hook to fetch subscription data from the secure view
const useSubscription = () => {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch subscription data if the user is an employer
    if (profile?.role !== 'employer') {
        setLoading(false);
        return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      // Querying the secure, user-specific view created by the migration
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
      } else {
        setSubscription(data);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [profile?.role]);

  return { subscription, loading };
};

export const SubscriptionStatus = () => {
  const { profile } = useAuth();
  const { subscription, loading } = useSubscription();
  const [isCheckoutLoading, setCheckoutLoading] = useState(false);

  const handleChoosePlan = async () => {
    setCheckoutLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: import.meta.env.VITE_STRIPE_STANDARD_PRICE_ID,
          // Use the new /profile/subscription path for success
          success_url: `${window.location.origin}/profile/subscription?success=true`,
          cancel_url: window.location.href,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Could not create checkout session.');
      }

      const { url: checkoutUrl } = await response.json();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Checkout URL not found.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
      setCheckoutLoading(false);
    }
  };

  if (profile?.role !== 'employer') {
      return null; // Don't render anything for non-employers
  }

  if (loading) {
    return (
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mt-2"></div>
      </div>
    );
  }

  const status = subscription?.subscription_status;
  const periodEnd = subscription?.current_period_end;

  if (status === 'trialing' && periodEnd) {
    const trialEndDate = fromUnixTime(periodEnd);
    const daysRemaining = differenceInDays(trialEndDate, new Date());

    if (daysRemaining < 0) {
      return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg mb-8">
          <h3 className="font-bold">Din provperiod har gått ut</h3>
          <p className="mt-2 text-sm">Välj en plan för att fortsätta publicera pass och hantera din personal.</p>
          <button onClick={handleChoosePlan} disabled={isCheckoutLoading} className="btn btn-primary mt-4">
            {isCheckoutLoading ? 'Laddar...' : <>Välj plan <ArrowRight className="ml-2 h-4 w-4" /></>}
          </button>
        </div>
      );
    }

    return (
      <div className="bg-primary-50 border-l-4 border-primary-500 text-primary-800 p-4 rounded-r-lg mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="font-bold flex items-center"><Clock className="h-5 w-5 mr-2" /> Din kostnadsfria provperiod</h3>
            <p className="mt-2 text-sm">Du har <strong className="text-lg">{daysRemaining}</strong> dagar kvar. Välj en plan för att undvika avbrott.</p>
          </div>
          <button onClick={handleChoosePlan} disabled={isCheckoutLoading} className="btn btn-primary">
            {isCheckoutLoading ? <Loader2 className="animate-spin" /> : <><Star className="mr-2 h-4 w-4"/> Välj plan</>}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'active') {
    return (
      <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg mb-8">
        <h3 className="font-bold flex items-center"><CheckCircle className="h-5 w-5 mr-2" /> Du prenumererar på Standard-planen</h3>
        <p className="mt-2 text-sm">Din prenumeration förnyas den {new Date(periodEnd * 1000).toLocaleDateString('sv-SE')}.</p>
      </div>
    );
  }

  // Default case for no active subscription or trial
  return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg mb-8">
        <h3 className="font-bold">Aktivera din prenumeration</h3>
        <p className="mt-2 text-sm">Välj en plan för att få full tillgång till plattformen.</p>
          <button onClick={handleChoosePlan} disabled={isCheckoutLoading} className="btn btn-primary mt-4">
            {isCheckoutLoading ? 'Laddar...' : <>Välj plan <ArrowRight className="ml-2 h-4 w-4" /></>}
          </button>
      </div>
  );
};
