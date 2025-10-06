import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { X, Mail, Users } from 'lucide-react';
import type { UserProfile } from '../../types';

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employerProfile: UserProfile | null;
}

export const InviteEmployeeModal = ({ isOpen, onClose, employerProfile }: InviteEmployeeModalProps) => {
  const [email, setEmail] = useState('');
  const [relationshipType, setRelationshipType] = useState('timkontrakt'); // Valid default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRelationshipType('timkontrakt'); // Reset to a valid default
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: 'employeeInvitation',
          payload: {
            employerId: employerProfile?.id,
            inviteeEmail: email.trim().toLowerCase(),
            relationshipType: relationshipType, // This now sends a valid Swedish term
          },
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.details || 'Ett okänt fel inträffade.');
      }
      
      toast.success('Inbjudan har skickats!');
      setSuccess(`En inbjudan har skickats till ${email.trim()}.`);
      setEmail('');

    } catch (err) {
      const e = err as Error;
      toast.error(`Kunde inte skicka inbjudan: ${e.message}`);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
          <X size={24} />
        </button>
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-2 rounded-full mr-3">
            <Users className="text-blue-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Bjud in Anställd</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-postadress</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exempel@domän.se"
              required
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="relationshipType" className="block text-sm font-medium text-gray-700 mb-1">Typ av anställning</label>
            <select
              id="relationshipType"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              required
              className="w-full bg-white px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {/* --- THESE ARE THE CORRECT VALUES --- */}
              <option value="timkontrakt">Timanställd</option>
              <option value="heltidsanställd">Heltidsanställd</option>
              <option value="deltidskontrakt">Deltidsanställd</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? 'Skickar...' : 'Skicka Inbjudan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};