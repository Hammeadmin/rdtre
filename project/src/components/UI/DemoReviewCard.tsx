import React, { useState } from 'react';
import { Star, ThumbsUp, ArrowRight, Briefcase, RotateCcw } from 'lucide-react'; // 1. Import RotateCcw icon
import { InteractiveDemoBadge } from './InteractiveDemoBadge';

export const DemoReviewCard = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // State 1: Application Notification
  if (!showProfile) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 relative max-w-sm mx-auto border border-gray-200 animate-fade-in">
        <InteractiveDemoBadge />
        <div className="text-center">
            <div className="flex items-center justify-center">
                <img
                    src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                    alt="Exempel Farmaceut"
                    className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-md"
                />
                <div className="ml-[-1rem] bg-primary-500 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm border-2 border-white">1</div>
            </div>
          <h3 className="text-lg font-bold text-gray-800 mt-4">Ny sökande till ditt pass!</h3>
          <p className="text-sm text-gray-600 mt-1">Anna S. har sökt passet "Apotekare 08-17" på Lejonet Apotek.</p>
          <button
            onClick={() => setShowProfile(true)}
            className="mt-4 w-full bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
          >
            Granska profil <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // State 2: Profile and Review Card
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 relative max-w-sm mx-auto border border-gray-200 animate-fade-in">
      {/* 2. Add the reset button here */}
      <button
        onClick={() => setShowProfile(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-primary-600 transition-colors z-10 p-1"
        aria-label="Återställ demo"
      >
        <RotateCcw className="h-5 w-5" />
      </button>

      <div className="flex items-center">
        <img
          src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
          alt="Exempel Farmaceut"
          className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-md"
        />
        <div className="ml-4">
          <h4 className="text-lg font-bold text-gray-800">Anna Svensson</h4>
          <p className="text-sm text-primary-600 font-semibold">Leg. Apotekare</p>
          <div className="flex items-center mt-1">
            <Star className="w-4 h-4 text-amber-400 fill-current" />
            <span className="text-sm text-gray-600 font-bold ml-1">4.9</span>
            <span className="text-xs text-gray-500 ml-1">(14 omdömen)</span>
          </div>
        </div>
      </div>

      {/* Work History Section */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <h5 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
          <Briefcase className="h-5 w-5 mr-2 text-primary-600" />
          Arbetshistorik
        </h5>
        <ul className="space-y-3">
          <li className="flex items-center text-sm">
            <span className="font-semibold text-gray-700 w-2/3">Apotek Hjärtat</span>
            <span className="text-gray-500">2020 - 2023</span>
          </li>
          <li className="flex items-center text-sm">
            <span className="font-semibold text-gray-700 w-2/3">Kronans Apotek</span>
            <span className="text-gray-500">2018 - 2020</span>
          </li>
        </ul>
      </div>

      {/* Review Section */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="relative">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ThumbsUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <h5
                className="text-sm font-semibold text-gray-700 underline decoration-dotted cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                Omdöme från Apoteksgruppen
              </h5>
              <p className="text-sm text-gray-600 mt-1 italic">"Anna är exceptionellt kunnig och en fröjd att arbeta med. Hon tog initiativ och våra kunder älskade henne. Rekommenderas starkt!"</p>
            </div>
          </div>
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-gray-800 text-white text-xs rounded-md py-1.5 px-3 z-10 shadow-lg animate-fade-in">
              Arbetsgivare lämnar omdömen efter varje avslutat pass.
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 transform rotate-45" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};