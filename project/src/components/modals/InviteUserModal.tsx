import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, UserPlus, Mail, Send } from 'lucide-react';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteUserModal = ({ isOpen, onClose }: InviteUserModalProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: 'userInvitation',
          payload: { inviteeEmail: email.trim().toLowerCase() },
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.details || 'Ett okänt fel inträffade.');
      }
      
      toast.success('Inbjudan har skickats!');
      setSuccess(`En inbjudan har skickats till ${email.trim()}.`);
      setEmail('');
      // Close the modal after a short delay
      setTimeout(onClose, 2500);
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
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors">
          <X size={24} />
        </button>
        <div className="flex items-center mb-4">
          <div className="bg-green-100 p-2 rounded-full mr-3">
            <UserPlus className="text-green-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Bjud in en kollega</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Bjud in en vän eller kollega till Farmispoolen. De kommer att få ett mail med en länk för att skapa ett konto.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="user-invite-email" className="block text-sm font-medium text-gray-700 mb-1">E-postadress</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                id="user-invite-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kollega@domän.se"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          {success && <p className="text-green-600 text-sm text-center">{success}</p>}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Skickar...' : <><Send size={16} className="mr-2"/> Skicka Inbjudan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};