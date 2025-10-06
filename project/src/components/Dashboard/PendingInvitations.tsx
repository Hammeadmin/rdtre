import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Check, X, Building2, Loader2 } from 'lucide-react';

interface Invitation {
  id: number;
  employer_name: string;
}

const PendingInvitations = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Step 1: Fetch pending relationships
      const { data: relationships, error: relError } = await supabase
        .from('employer_employee_relationships')
        .select('id, employer_id')
        .eq('employee_id', user.id)
        .eq('status', 'pending'); // This query will now succeed

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        // Step 2: Fetch the employer profiles
        const employerIds = relationships.map(rel => rel.employer_id);
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, pharmacy_name')
          .in('id', employerIds);

        if (profError) throw profError;

        // Step 3: Combine the data
        const combinedData = relationships.map(rel => {
          const employerProfile = profiles.find(p => p.id === rel.employer_id);
          return {
            id: rel.id,
            employer_name: employerProfile?.pharmacy_name || 'Okänt Företag'
          };
        });
        setInvitations(combinedData);
      } else {
        setInvitations([]);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Kunde inte hämta inbjudningar.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleUpdateInvitation = async (invitationId: number, newStatus: 'active' | 'declined') => {
    try {
      const { error } = await supabase
        .from('employer_employee_relationships')
        .update({ status: newStatus })
        .eq('id', invitationId);

      if (error) throw error;
      toast.success(newStatus === 'active' ? 'Inbjudan accepterad!' : 'Inbjudan avvisad.');
      fetchInvitations();
    } catch (error) {
      console.error('Error updating invitation:', error);
      toast.error('Kunde inte uppdatera inbjudan.');
    }
  };

  if (!loading && invitations.length === 0) {
    return null;
  }

  // The JSX for this component is already correct and does not need to change.
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-lg mb-6 shadow-lg animate-fade-in">
      <h3 className="font-bold text-lg mb-3 flex items-center"><Building2 className="w-5 h-5 mr-2" /> Du har nya inbjudningar</h3>
      {loading ? (
        <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Laddar inbjudningar...</span>
        </div>
      ) : (
        <ul className="space-y-3">
          {invitations.map((invite) => (
            <li key={invite.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-3 rounded-md shadow-sm gap-3">
              <p className="flex-grow text-gray-700">
                Du har blivit inbjuden att arbeta för{' '}
                <span className="font-semibold text-gray-900">{invite.employer_name}</span>.
              </p>
              <div className="flex-shrink-0 flex items-center space-x-2 self-end sm:self-center">
                <button
                  onClick={() => handleUpdateInvitation(invite.id, 'active')}
                  className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Acceptera
                </button>
                <button
                  onClick={() => handleUpdateInvitation(invite.id, 'declined')}
                  className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Avvisa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PendingInvitations;