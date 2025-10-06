// src/pages/IntranetPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreateIntranetPost } from '../components/intranet/CreateIntranetPost';
import { IntranetFeed } from '../components/intranet/IntranetFeed';
import { PlusCircle } from 'lucide-react';
import { Modal } from '../components/UI/Modal'; // Assuming you have a reusable Modal component

export const IntranetPage = () => {
  const { profile } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canCreatePost = profile?.role === 'admin' || profile?.role === 'employer';

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Intranätet</h1>
        {canCreatePost && (
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
            <PlusCircle size={20} className="mr-2" />
            Skapa inlägg
          </button>
        )}
      </div>
      
      <IntranetFeed />

      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Intranet Post">
            <CreateIntranetPost 
                onPostCreated={() => {
                    setIsCreateModalOpen(false);
                    // The feed will auto-update via the real-time subscription
                }}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </Modal>
      )}
    </div>
  );
};

export default IntranetPage;