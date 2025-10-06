// src/pages/ForKonsultforetag.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Briefcase,
  CheckCircle,
  ArrowRight,
  Filter,
  PenSquare,
  FileText
} from 'lucide-react';
import { DemoUppdragCard } from '../components/UI/DemoUppdragCard'; // Ensure this import is present
import { DemoProfileBrowser } from '../components/UI/DemoProfileBrowser';

export function ForKonsultforetag() {
  return (
    <div className="bg-brandBeige min-h-screen">
      {/* --- NEW MERGED HERO SECTION --- */}
      {/* --- NEW MERGED HERO SECTION --- */}
<div className="bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="order-2">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          Skala er verksamhet med Sveriges främsta pool av farmaceuter
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Få omedelbar tillgång till ett verifierat nätverk av specialister. Vår plattform ger er verktygen att snabbt hitta och hantera rätt kompetens för era kunduppdrag.
        </p>
        <ul className="mt-8 space-y-2">
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
            <Search className="h-6 w-6 text-accent-600 mr-4 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-primary-800">Avancerad Filtrering</h4>
              <p className="text-primary-700">Sök och filtrera kandidater baserat på specifika kompetenser, erfarenheter och geografisk plats för att hitta den perfekta matchningen.</p>
            </div>
          </li>
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
            <Briefcase className="h-6 w-6 text-accent-600 mr-4 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-primary-800">Anpassade Uppdrag</h4>
              <p className="text-primary-700">Publicera skräddarsydda, längre uppdrag med detaljerade kravspecifikationer för att attrahera rätt talanger.</p>
            </div>
          </li>
        </ul>
      </div>
        <div className="order-1 flex items-center justify-center">
          <DemoProfileBrowser />
        </div>
    </div>
  </div>
</div>

      {/* Interactive Demo Section */}
      <div className="py-16 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="lg:pr-8">
                <DemoUppdragCard />
              </div>
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-semibold text-gray-800">Se det i praktiken</h3>
                <p className="mt-2 text-gray-600">
                  Upplev hur enkelt det är att publicera ett uppdrag och se kvalificerade sökande direkt i plattformen. Vår interaktiva demo visar processen från start till mål.
                </p>
              </div>
          </div>
        </div>
      </div>

           {/* --- REPLACED: How It Works Section with new Advantage Section --- */}
<div className="bg-white py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
      <div className="order-2 lg:order-1 mt-10 lg:mt-0">
        <img
          src="https://media.istockphoto.com/id/1902034840/photo/electronic-document-management-system-concept-searching-and-business-managing-files-online.webp?a=1&b=1&s=612x612&w=0&k=20&c=NdUSTRgKVAg6p9wtbFQ805MAoSZKK_sseJ1xSbHEMOk="
          alt="Person signing a digital contract on a tablet"
          className="rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="order-1 lg:order-2">
        <div className="flex items-center text-primary-600">
          <PenSquare className="h-8 w-8 mr-3" />
          <h2 className="text-3xl font-bold text-gray-900">Digital Avtalshantering</h2>
        </div>
        <p className="mt-4 text-lg text-gray-600">
         Skicka, signera och hantera alla era anställnings- och konsultavtal direkt i plattformen med säker digital signering via BankID.
        </p>
        <ul className="mt-8 space-y-2">
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-gray-50">
            <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
            <div>
             <h4 className="font-semibold text-gray-800">Säker Digital Signering</h4>
              <p className="text-gray-600">Skicka avtal som enkelt och säkert kan signeras digitalt av båda parter.</p>
            </div>
          </li>
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-gray-50">
            <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-800">Anpassade Mallar</h4>
              <p className="text-gray-600">Använd våra inbyggda standardavtal eller ladda upp era egna PDF-mallar för full flexibilitet.</p>
            </div>
          </li>
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-gray-50">
            <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-800">Professionell Branding</h4>
              <p className="text-gray-600">Lägg till er företagslogotyp på alla avtal som genereras via plattformen för ett professionellt intryck.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>

     {/* How It Works Section */}
<div className="bg-white py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold text-gray-900">Enkel process i tre steg</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      <div className="bg-primary-50/50 p-8 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white font-bold text-2xl mb-4 mx-auto">1</div>
        <h3 className="text-xl font-semibold text-gray-800">Publicera Uppdrag</h3>
        <p className="mt-2 text-gray-600">Skapa en detaljerad annons med era specifika krav för uppdraget.</p>
      </div>
      <div className="bg-primary-50/50 p-8 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white font-bold text-2xl mb-4 mx-auto">2</div>
        <h3 className="text-xl font-semibold text-gray-800">Hitta & Välj Personal</h3>
        <p className="mt-2 text-gray-600">Sök i vår databas eller granska ansökningar från kvalificerade kandidater.</p>
      </div>
      <div className="bg-primary-50/50 p-8 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white font-bold text-2xl mb-4 mx-auto">3</div>
        <h3 className="text-xl font-semibold text-gray-800">Hantera & Administrera</h3>
        <p className="mt-2 text-gray-600">Kommunicera, schemalägg och hantera löner direkt i plattformen.</p>
      </div>
    </div>
  </div>
</div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Effektivisera er konsultverksamhet idag
          </h2>
          <p className="mt-4 text-xl text-primary-100 max-w-2xl mx-auto">
            Registrera ert företag och få omedelbar tillgång till verktygen som hjälper er att växa.
          </p>
          <div className="mt-8">
            <Link
              to="/register?userType=employer"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 shadow-md transition-colors"
            >
              Kom igång
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForKonsultforetag;