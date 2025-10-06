// src/pages/FaqPage.tsx
import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

const faqData = {
  general: [
    { q: "Vad är Farmispoolen?", a: "Farmispoolen är en digital plattform som kopplar samman apotek och andra arbetsgivare med kvalificerad apotekspersonal för både korta och långa uppdrag." },
    { q: "Är det gratis att skapa ett konto?", a: "Ja, det är helt kostnadsfritt för personal att skapa ett konto och söka uppdrag. För arbetsgivare har vi olika prisplaner beroende på behov." }
  ],
  employers: [
    { q: "Hur publicerar jag ett pass?", a: "Efter att du har skapat ett konto och loggat in, navigerar du till din kontrollpanel där du enkelt kan skapa och publicera nya pass med detaljerade krav." },
    { q: "Hur fungerar betalning och fakturering?", a: "Du betalar en fast månadsavgift enligt din valda prisplan. Ersättning till personalen kan hanteras smidigt och säkert direkt via plattformen, eller skickas som en specifikation till lönekontoret." },
    { q: "Vad händer om jag behöver avboka ett pass?", a: "Våra avbokningsregler är flexibla men rättvisa. Du kan hantera avbokningar direkt från din kontrollpanel. Vänligen se våra användarvillkor för detaljer." }
  ],
  personnel: [
    { q: "Hur blir jag verifierad?", a: "För legitimerade yrken laddar du upp en kopia av din legitimation direkt i din profil. För övriga roller verifieras du automatiskt när din profil är komplett." },
    { q: "När och hur får jag betalt?", a: "Efter att ett pass är slutfört och godkänt av arbetsgivaren, betalas din ersättning ut månadsvis. Du kan spåra alla dina lönespecifikationer i din profil." },
    { q: "Är jag anställd av Farmispoolen?", a: "Nej, du agerar som en oberoende konsult eller anställd direkt av apoteket för det specifika passet. Farmispoolen är plattformen som förmedlar kontakten." }
  ]
};

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-4 text-left font-semibold text-gray-800"
      >
        <span>{q}</span>
        <ChevronDown className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-4 text-gray-600">
          <p>{a}</p>
        </div>
      )}
    </div>
  );
};

export function FaqPage() {
  return (
    <div className="bg-brandBeige min-h-screen">
      {/* --- Hero Section --- */}
      <div className="bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <HelpCircle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Vanliga Frågor
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Här har vi samlat svar på de vanligaste frågorna. Hittar du inte det du söker? Kontakta oss gärna.
          </p>
        </div>
      </div>
      
      {/* --- Main Content --- */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 space-y-12">
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Allmänt</h2>
            {faqData.general.map((item, index) => <FaqItem key={`gen-${index}`} {...item} />)}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">För Arbetsgivare</h2>
            {faqData.employers.map((item, index) => <FaqItem key={`emp-${index}`} {...item} />)}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">För Personal</h2>
            {faqData.personnel.map((item, index) => <FaqItem key={`per-${index}`} {...item} />)}
          </div>

        </div>
      </div>
    </div>
  );
}

export default FaqPage;
