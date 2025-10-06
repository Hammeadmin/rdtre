// src/components/UI/DemoShiftFinder.tsx
import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Search, Send, CheckCircle, Loader2 } from 'lucide-react';
import { InteractiveDemoBadge } from './InteractiveDemoBadge';

const allShifts = [
  { id: 1, title: 'Leg. Apotekare', city: 'Stockholm', time: '09:00 - 17:00', rate: '260 kr/tim' },
  { id: 2, title: 'Egenvårdsrådgivare', city: 'Göteborg', time: '10:00 - 18:00', rate: '215 kr/tim' },
  { id: 3, title: 'Kassapersonal', city: 'Stockholm', time: '12:00 - 20:00', rate: '195 kr/tim' },
];

export const DemoShiftFinder = () => {
  const [search, setSearch] = useState('');
  const [filteredShifts, setFilteredShifts] = useState(allShifts);
  const [appliedShift, setAppliedShift] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setAppliedShift(null);
    setConfirmed(false);
    const searchLower = search.toLowerCase();
    if (searchLower === '') {
      setFilteredShifts(allShifts);
    } else {
      setFilteredShifts(
        allShifts.filter(shift => shift.city.toLowerCase().includes(searchLower))
      );
    }
  }, [search]);

  const handleApply = (id: number) => {
    setAppliedShift(id);
    setTimeout(() => {
      setConfirmed(true);
    }, 1200);
  };
  
  const handleReset = () => {
    setSearch('');
    setAppliedShift(null);
    setConfirmed(false);
  }

  return (
    <div className="relative bg-white p-4 rounded-xl shadow-lg border border-gray-200 font-sans w-full max-w-md mx-auto">
      <InteractiveDemoBadge />
      <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Hitta ditt nästa pass</h4>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Sök på stad (t.ex. Stockholm)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 p-2 border rounded-md text-sm"
        />
      </div>

      <div className="space-y-2 min-h-[220px]">
        {filteredShifts.map(shift => (
          <div key={shift.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-primary-800">{shift.title}</p>
                <p className="text-xs text-gray-600 flex items-center mt-1">
                  <MapPin size={12} className="mr-1.5" /> {shift.city}
                </p>
                <p className="text-xs text-gray-600 flex items-center mt-1">
                  <Clock size={12} className="mr-1.5" /> {shift.time}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-700">{shift.rate}</p>
                 <button
                    onClick={() => handleApply(shift.id)}
                    disabled={appliedShift !== null}
                    className="btn btn-primary btn-xs mt-2"
                 >
                    {appliedShift === shift.id && !confirmed && <Loader2 size={12} className="animate-spin" />}
                    {appliedShift === shift.id && confirmed && <CheckCircle size={12} />}
                    {appliedShift !== shift.id && <Send size={12} />}
                    <span className="ml-1.5">{appliedShift === shift.id ? (confirmed ? 'Ansökt!' : 'Skickar...') : 'Ansök'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
         {filteredShifts.length === 0 && (
            <div className="text-center pt-10">
                <p className="text-sm text-gray-500">Inga pass matchade din sökning.</p>
            </div>
        )}
      </div>
      {confirmed && (
          <button onClick={handleReset} className="w-full btn btn-secondary btn-sm mt-3">Rensa och sök igen</button>
      )}
       <style jsx>{`
        .btn { @apply inline-flex items-center justify-center px-3 py-1.5 border text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors; }
        .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
        .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
        .btn-xs { @apply px-2.5 py-1 text-[10px] leading-tight; }
      `}</style>
    </div>
  );
};