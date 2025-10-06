// src/components/UI/DemoProfileBrowser.tsx
import React, { useState, useEffect } from 'react';
import { Star, Briefcase, Award, UserCheck, X, ShieldCheck, Download, Building } from 'lucide-react';
import { InteractiveDemoBadge } from './InteractiveDemoBadge';

// Enhanced profile data with more details for the modal
const profiles = [
  {
    name: 'Anna Svensson',
    role: 'Leg. Apotekare',
    rating: 4.9,
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    verified: true,
    workHistory: [
      { role: 'Apotekare', place: 'Apotek Hjärtat', duration: '2020 - 2023' },
      { role: 'Farmaceut', place: 'Kronans Apotek', duration: '2018 - 2020' },
    ]
  },
  {
    name: 'Mikael Lindgren',
    role: 'Egenvårdsrådgivare',
    rating: 4.8,
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e',
    verified: true,
    workHistory: [
      { role: 'Egenvårdsrådgivare', place: ' DOZ Apotek', duration: '2019 - Present' },
    ]
  },
  {
    name: 'Sofia Nordin',
    role: 'Leg. Apotekare',
    rating: 5.0,
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f',
    verified: true,
    workHistory: [
      { role: 'Apotekschef', place: 'Apoteket AB', duration: '2017 - 2022' },
      { role: 'Apotekare', place: 'Apoteket AB', duration: '2015 - 2017' },
    ]
  },
];

// Define a type for a single profile
type Profile = typeof profiles[0];

export const DemoProfileBrowser = () => {
  const [visibleProfiles, setVisibleProfiles] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleProfiles(prev => (prev < profiles.length ? prev + 1 : prev));
      }, 300);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const openModal = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const closeModal = () => {
    setSelectedProfile(null);
  };

  return (
    <>
       <div className="relative bg-white rounded-xl shadow-2xl p-4 border border-gray-200 w-full max-w-sm mx-auto">
        <InteractiveDemoBadge />
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <UserCheck size={16} className="mr-2 text-primary-600"/>
          Bläddra bland verifierade profiler
        </h4>
        <div className="space-y-3 min-h-[300px]">
          {profiles.slice(0, visibleProfiles).map((profile, index) => (
            <button
              key={index}
              onClick={() => openModal(profile)}
              className="w-full text-left p-3 bg-gray-50 rounded-lg flex items-center animate-fade-in-up border hover:bg-primary-50 hover:border-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <img src={profile.avatar} alt={profile.name} className="h-12 w-12 rounded-full object-cover" />
              <div className="ml-3">
                <p className="font-bold text-primary-800 text-sm">{profile.name}</p>
                <p className="text-xs text-gray-600 flex items-center mt-1">
                  <Briefcase size={12} className="mr-1.5" />{profile.role}
                </p>
                 <p className="text-xs text-gray-600 flex items-center mt-1">
                  <Star size={12} className="mr-1.5 text-amber-400 fill-current" />{profile.rating} Omdöme
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 relative">
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
              <div className="flex items-center">
                <img src={selectedProfile.avatar} alt={selectedProfile.name} className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-md" />
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-gray-900">{selectedProfile.name}</h3>
                  <p className="text-sm text-primary-700 font-semibold">{selectedProfile.role}</p>
                   {selectedProfile.verified && (
                    <div className="flex items-center text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full mt-2">
                      <ShieldCheck size={12} className="mr-1.5"/> Legitimation Verifierad
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Arbetshistorik</h4>
                <div className="space-y-3">
                  {selectedProfile.workHistory.map((job, index) => (
                    <div key={index} className="flex items-start">
                      <Building size={16} className="text-gray-400 mr-3 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{job.role}</p>
                        <p className="text-xs text-gray-500">{job.place} • {job.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t">
                 <button className="w-full btn btn-primary flex items-center justify-center">
                    <Download size={16} className="mr-2" />
                    Visa CV (PDF)
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
       <style jsx>{`
        .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
        .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>
    </>
  );
};