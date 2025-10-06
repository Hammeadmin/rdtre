// src/components/UI/ScheduleDemo.tsx
import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Loader2, Megaphone, UserCheck, CheckCircle, UserX } from 'lucide-react';
import { InteractiveDemoBadge } from './InteractiveDemoBadge';

const staff = [
  { id: 1, name: 'Erik N.', role: 'Farmaceut' },
  { id: 2, name: 'Maria L.', role: 'Egenvårdsrådgivare' },
  { id: 3, name: 'Johan B.', role: 'Säljare' },
];

const generatedShifts = [
  { time: '08:00 - 16:00', assigned: 'Erik N.', role: 'Farmaceut', status: 'filled' },
  { time: '09:00 - 17:00', assigned: 'Maria L.', role: 'Egenvårdsrådgivare', status: 'filled' },
  { time: '10:00 - 18:00', assigned: null, role: 'Kassapersonal', status: 'unfilled' },
];

export const ScheduleDemo = () => {
  const [step, setStep] = useState(0); // 0: initial, 1: generating, 2: generated, 3: posting, 4: posted
  const [visibleShifts, setVisibleShifts] = useState(0);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    if (step === 1) {
      // Show shifts one by one
      generatedShifts.forEach((_, index) => {
        timeouts.push(setTimeout(() => setVisibleShifts(prev => prev + 1), (index + 1) * 400));
      });
      // Move to next step after shifts are shown
      timeouts.push(setTimeout(() => setStep(2), (generatedShifts.length + 1) * 400));
    } else if (step === 3) {
      // Move to final step after a short delay
      timeouts.push(setTimeout(() => setStep(4), 1000));
    }
    return () => timeouts.forEach(clearTimeout);
  }, [step]);

  const handleGenerateClick = () => {
    if (step === 0 || step === 4) {
      setVisibleShifts(0);
      setStep(1);
    }
  };

  const handlePostClick = () => {
    if (step === 2) {
      setStep(3);
    }
  };

  const getShiftBgColor = (status: string) => {
    if (step === 4 && status === 'unfilled') return 'bg-green-100';
    if (status === 'unfilled') return 'bg-red-100';
    return 'bg-blue-50';
  };

  return (
    <div className="relative bg-white p-4 rounded-xl shadow-lg border border-gray-200 font-sans">
        <InteractiveDemoBadge />
      <div className="grid grid-cols-3 gap-4">
        {/* Left Panel: Staff & Actions */}
        <div className="col-span-1 border-r pr-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center mb-3">
            <Users size={16} className="mr-2 text-gray-500" /> Personal
          </h4>
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="p-2 bg-gray-50 rounded-md text-xs">
                <p className="font-bold text-gray-800">{s.name}</p>
                <p className="text-gray-600">{s.role}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleGenerateClick}
            disabled={step === 1 || step === 3}
            className="w-full btn btn-primary btn-sm mt-4 flex items-center justify-center"
          >
            {step === 1 && <Loader2 size={16} className="mr-2 animate-spin" />}
            {step === 0 || step === 4 ? 'Generera Schema' : 'Genererar...'}
          </button>
        </div>

        {/* Right Panel: Schedule */}
        <div className="col-span-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center mb-3">
            <Calendar size={16} className="mr-2 text-gray-500" /> Vecka 42
          </h4>
          <div className="space-y-2 min-h-[160px]">
            {generatedShifts.slice(0, visibleShifts).map((shift, index) => (
              <div
                key={index}
                className={`p-2 rounded-md transition-all duration-500 ${getShiftBgColor(shift.status)}`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-xs">
                    <p className="font-semibold text-gray-800 flex items-center">
                      <Clock size={12} className="mr-1.5" /> {shift.time}
                    </p>
                    <p className="text-gray-600 mt-1">{shift.role}</p>
                  </div>
                  <div className="text-right">
                    {shift.status === 'unfilled' ? (
                      step < 3 ? (
                        <button
                          onClick={handlePostClick}
                          className="btn bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-1 flex items-center"
                        >
                          <Megaphone size={12} className="mr-1" /> Publicera
                        </button>
                      ) : step === 3 ? (
                        <span className="text-xs font-semibold text-yellow-600 flex items-center"><Loader2 size={12} className="mr-1 animate-spin"/> Publicerar...</span>
                      ) : (
                        <span className="text-xs font-semibold text-green-700 flex items-center"><CheckCircle size={12} className="mr-1"/> Passet har publicerats till poolen!</span>
                      )
                    ) : (
                      <span className="text-xs font-semibold text-blue-800 flex items-center"><UserCheck size={12} className="mr-1"/>{shift.assigned}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {step === 1 && visibleShifts === 0 && (
                 <div className="flex justify-center items-center h-full pt-10">
                    <Loader2 size={24} className="text-gray-400 animate-spin"/>
                 </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
        .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
        .btn-sm { @apply px-3 py-1.5 text-xs; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
      `}</style>
    </div>
  );
};