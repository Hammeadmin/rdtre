// src/pages/TermsOfServicePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield } from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <div className="bg-brandBeige min-h-screen">
      {/* --- Hero Section --- */}
      <div className="bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <FileText className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Användarvillkor
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Regler och riktlinjer för användning av Farmispoolens plattform och tjänster.
          </p>
        </div>
      </div>
      
      {/* --- Main Content --- */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12">
          <div className="prose prose-lg max-w-none prose-h2:font-bold prose-h2:text-gray-800 prose-a:text-primary-600 hover:prose-a:text-primary-700">
            <p className="lead text-gray-600">
              Senast uppdaterad: 22 september 2025
            </p>

            <h2>1. Godkännande av villkor</h2>
            <p>
              Genom att registrera ett konto eller använda Farmispoolens tjänster ("Tjänsten"), godkänner du att vara bunden av dessa Användarvillkor ("Villkoren"). Om du inte godkänner dessa villkor, vänligen använd inte Tjänsten.
            </p>

            <h2>2. Tjänstens omfattning</h2>
            <p>
              Farmispoolen tillhandahåller en digital plattform där apotek och andra arbetsgivare ("Arbetsgivare") kan publicera lediga arbetspass och där kvalificerade yrkespersoner ("Personal") kan ansöka om dessa pass. Farmispoolen är en teknisk mellanhand och är inte part i något anställningsavtal mellan Arbetsgivare och Personal.
            </p>

            <h2>3. Användarkonton och ansvar</h2>
            <p>
              Du är ansvarig för att all information du anger i din profil är korrekt och uppdaterad. Du är även ansvarig för att skydda dina inloggningsuppgifter. Personal som är legitimerade yrkesutövare är skyldiga att ladda upp giltig legitimation för verifiering.
            </p>

            <h2>4. Betalningsvillkor</h2>
            <p>
              Arbetsgivare debiteras en månadsavgift enligt gällande <Link to="/priser">prislista</Link>. Ersättning till Personal för utförda pass kan hanteras via plattformen. Betalningsvillkor för ersättning specificeras i varje enskilt pass.
            </p>
            
            <h2>5. Avbokningspolicy</h2>
            <p>
              Regler för avbokning av pass specificeras i samband med bokning. Brott mot avbokningspolicyn kan leda till varningar eller avstängning från plattformen.
            </p>

            <h2>6. Ansvarsbegränsning</h2>
            <p>
              Farmispoolen ansvarar inte för kvaliteten på det arbete som utförs av Personal, eller för handlingar eller underlåtenhet från någon användare av Tjänsten. Vi ansvarar inte för direkta eller indirekta skador som uppstår till följd av användandet av Tjänsten.
            </p>

            <h2>7. Ändringar i villkoren</h2>
            <p>
              Vi förbehåller oss rätten att när som helst ändra dessa villkor. Vid väsentliga ändringar kommer vi att meddela dig via e-post eller direkt på plattformen.
            </p>

            <h2>8. Tillämplig lag och tvistlösning</h2>
            <p>
              Dessa villkor ska tolkas i enlighet med svensk lag. Tvister som uppstår i anledning av dessa villkor ska i första hand lösas i samförstånd och i andra hand av allmän domstol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsOfServicePage;
