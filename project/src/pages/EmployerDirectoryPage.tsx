// src/pages/EmployerDirectoryPage.tsx
import React, { useState, useEffect } from 'react';
import { fetchAllEmployerProfiles } from '../lib/profiles';
import type { UserProfile } from '../types';
import { Loader2, Building2, MapPin, Mail, Phone, ExternalLink } from 'lucide-react';
import { EmployerProfileViewModal } from '../components/employer/EmployerProfileViewModal'; // Re-use for detailed view

// Optional: Create a specific card component for employers if layout differs significantly
const EmployerCard: React.FC<{ employer: UserProfile; onViewDetails: (employerId: string) => void }> = ({ employer, onViewDetails }) => (
  <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
    <div className="flex items-center mb-4">
      {employer.profile_picture_url ? (
        <img src={employer.profile_picture_url} alt={employer.pharmacy_name || employer.full_name} className="h-16 w-16 rounded-full object-cover mr-4 border" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mr-4">
          <Building2 size={32} />
        </div>
      )}
      <div>
        <h3 className="text-xl font-semibold text-gray-800">{employer.pharmacy_name || employer.full_name}</h3>
        {employer.city && <p className="text-sm text-gray-500 flex items-center"><MapPin size={14} className="mr-1 text-gray-400" />{employer.city}</p>}
      </div>
    </div>
    {employer.description && <p className="text-sm text-gray-600 mb-3 line-clamp-3">{employer.description}</p>}
    <button
      onClick={() => onViewDetails(employer.id)}
      className="w-full btn btn-secondary btn-sm mt-auto"
    >
      <ExternalLink size={14} className="mr-2" /> Visa hela profilen & öppettider
    </button>
  </div>
);

export function EmployerDirectoryPage() {
  const [employers, setEmployers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);

  useEffect(() => {
    const loadEmployers = async () => {
      setLoading(true);
      const { data, error: fetchError } = await fetchAllEmployerProfiles();
      if (fetchError) {
        setError(fetchError);
      } else {
        setEmployers(data || []);
      }
      setLoading(false);
    };
    loadEmployers();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  if (error) return <div className="p-4 text-center text-red-600 bg-red-50 rounded-md">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Arbetsgivare</h1>
      {employers.length === 0 ? (
        <p className="text-center text-gray-500">Inga arbetsgivare tillgängliga för tillfället.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {employers.map(employer => (
            <EmployerCard key={employer.id} employer={employer} onViewDetails={setSelectedEmployerId} />
          ))}
        </div>
      )}
      {selectedEmployerId && (
        <EmployerProfileViewModal
          isOpen={!!selectedEmployerId}
          onClose={() => setSelectedEmployerId(null)}
          employerId={selectedEmployerId}
        />
      )}
    </div>
  );
}

export default EmployerDirectoryPage;