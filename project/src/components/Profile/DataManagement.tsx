// src/components/Profile/DataManagement.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { HardDriveDownload } from 'lucide-react';

export const DataManagement = () => {
  const { profile } = useAuth();

  const handleExportData = () => {
    if (!profile) {
      toast.error('Kunde inte hitta profildata.');
      return;
    }
    try {
      const dataStr = JSON.stringify(profile, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `farmispoolen_data_${profile.id.substring(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Din profildata har laddats ner.');
    } catch (error) {
      toast.error('Ett fel uppstod vid export av data.');
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
        <HardDriveDownload className="w-5 h-5 mr-2 text-gray-500" />
        Datahantering
      </h3>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 pr-4">
          Ladda ner en kopia av din profildata.
        </p>
        <button onClick={handleExportData} className="btn btn-secondary btn-sm">
          Exportera Data
        </button>
      </div>
    </div>
  );
};