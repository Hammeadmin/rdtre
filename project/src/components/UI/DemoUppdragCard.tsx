// src/components/UI/DemoUppdragCard.tsx
import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, Calendar, Loader2, Send, CheckCircle, User, Star } from 'lucide-react';
import { InteractiveDemoBadge } from './InteractiveDemoBadge';

const applicants = [
  { name: 'Johanna K.', role: 'Leg. Apotekare', rating: 4.8 },
  { name: 'Martin E.', role: 'Leg. Apotekare', rating: 5.0 },
];

export const DemoUppdragCard = () => {
  const [step, setStep] = useState(0); // 0: form, 1: submitting, 2: submitted, 3: applicants showing
  const [visibleApplicants, setVisibleApplicants] = useState(0);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    if (step === 2) {
      timeouts.push(setTimeout(() => setStep(3), 1200));
    }
    if (step === 3) {
      timeouts.push(setTimeout(() => setVisibleApplicants(1), 500));
      timeouts.push(setTimeout(() => setVisibleApplicants(2), 1000));
    }
    return () => timeouts.forEach(clearTimeout);
  }, [step]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) {
      setStep(1);
      setTimeout(() => setStep(2), 1500);
    }
  };

  const handleReset = () => {
    setStep(0);
    setVisibleApplicants(0);
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6 relative border border-gray-200">
      <InteractiveDemoBadge />
      {step < 2 && (
        <>
          <h4 className="text-lg font-bold text-gray-800 mb-4">Skapa ett nytt uppdrag</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Titel</label>
              <div className="flex items-center p-2 border rounded-md mt-1">
                <Briefcase size={16} className="text-gray-400 mr-2" />
                <p className="text-sm text-gray-700">Apotekare för långtidsuppdrag</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Plats</label>
                <div className="flex items-center p-2 border rounded-md mt-1">
                  <MapPin size={16} className="text-gray-400 mr-2" />
                  <p className="text-sm text-gray-700">Uppsala</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Period</label>
                <div className="flex items-center p-2 border rounded-md mt-1">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <p className="text-sm text-gray-700">3 månader</p>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={step === 1}
              className="w-full btn btn-primary mt-4 flex items-center justify-center"
            >
              {step === 1 ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
              {step === 1 ? 'Publicerar...' : 'Publicera Uppdrag'}
            </button>
          </form>
        </>
      )}

      {step >= 2 && (
        <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-500"/>
            <h4 className="text-lg font-bold text-gray-800 mt-4">Uppdrag Publicerat!</h4>
            <p className="text-sm text-gray-600">Kvalificerade kandidater meddelas nu.</p>
            
            <div className="mt-6 text-left">
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Nya Sökande:</h5>
                <div className="space-y-2 min-h-[140px]">
                    {applicants.slice(0, visibleApplicants).map((app, i) => (
                        <div key={i} className="bg-blue-50 p-3 rounded-lg flex items-center justify-between animate-fade-in">
                            <div>
                                <p className="font-semibold text-blue-800">{app.name}</p>
                                <p className="text-xs text-blue-700">{app.role}</p>
                            </div>
                            <div className="flex items-center text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                <Star size={12} className="mr-1 fill-current"/> {app.rating.toFixed(1)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <button
              onClick={handleReset}
              className="w-full btn btn-secondary mt-4"
            >
              Skapa ett till uppdrag
            </button>
        </div>
      )}
      <style jsx>{`
        .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
        .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
        .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};