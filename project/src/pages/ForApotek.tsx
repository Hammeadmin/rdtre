import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Target, Users, CheckSquare, PenSquare, Building2, MessageSquare, Calendar, CheckCircle, CalendarPlus, UserPlus, ArrowRight
} from 'lucide-react';
import { DemoReviewCard } from '../components/UI/DemoReviewCard';
import { ScheduleDemo } from '../components/UI/ScheduleDemo';

export default function ForApotek() {
  return (
    <div className="bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50 min-h-screen">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center">
                   <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
  Bemanning på era villkor.
</h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Från enstaka pass till längre uppdrag. Få tillgång till ett verifierat nätverk av apotekspersonal och hantera all er schemaläggning på en och samma plats.
          </p>
        </div>
      </div>

{/* --- REPLACED: Benefits Section --- */}
<div className="bg-white py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div className="order-2 lg:order-1">
        <img
          src="https://plus.unsplash.com/premium_photo-1661769786626-8025c37907ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fHBoYXJtYWN5fGVufDB8fDB8fHww"
          alt="En farmaceut som arbetar i ett modernt och ljust apotek"
          className="rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="order-1 lg:order-2">
        <h2 className="text-3xl font-bold text-gray-900">Allt ni behöver för en smidig bemanning</h2>
        <p className="mt-4 text-lg text-gray-600">
          Vår plattform är byggd för att eliminera administrativt krångel så att ni kan fokusera på det som är viktigt – era kunder.
        </p>
        <ul className="mt-8 space-y-2">
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-800">Kvalificerad personal</h4>
              <p className="text-gray-600">Få tillgång till en verifierad pool av farmaceuter och egenvårdsrådgivare med detaljerade profiler och omdömen.</p>
            </div>
          </li>
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-800">Snabb bemanning</h4>
              <p className="text-gray-600">Publicera pass och fyll luckor snabbt, även med kort varsel, tack vare vårt nätverk och smarta notifieringar.</p>
            </div>
          </li>
          <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
              <Target className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-800">Minskat administrativt arbete</h4>
              <p className="text-gray-600">Från schemaläggning av befintlig personal till att hantera löneunderlag – allt på ett ställe.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
      {/* Verified Professionals with Reviews Section - NEW */}
<div className="py-16 bg-primary-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="order-2 lg:order-1">
        <DemoReviewCard />
      </div>
      <div className="order-1 lg:order-2">
        <h2 className="text-3xl font-bold text-gray-900">Verifierad Personal med Omdömen</h2>
        <p className="mt-4 text-lg text-gray-600">
          Få trygghet i er bemanning. Varje farmaceut och tekniker på vår plattform är noggrant verifierad. Efter varje avslutat pass lämnar arbetsgivare omdömen, vilket bygger en transparent och pålitlig historik.
        </p>
        <ul className="mt-6 space-y-4">
          <li className="flex items-start">
            <CheckSquare className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-800">Kvalitetssäkrad Pool</h4>
              <p className="text-gray-600">Vi verifierar legitimation och erfarenhet för all personal.</p>
            </div>
          </li>
          <li className="flex items-start">
            <MessageSquare className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-800">Transparenta Omdömen</h4>
              <p className="text-gray-600">Läs recensioner från andra apotek för att hitta den perfekta matchningen för ert team.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>

      {/* Schedule Generator Section - NEW */}
<div className="py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold text-gray-900">Kraftfull Schemagenerator</h2>
      <p className="mt-4 text-lg text-gray-600">
        Skapa optimerade scheman på minuter
      </p>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div>
        <h3 className="text-2xl font-semibold text-gray-800">Från Planering till Publicering</h3>
        <p className="mt-4 text-gray-600">
          Vår schemaläggare är mer än bara en kalender. Definiera era behov, lägg till er personal och låt systemet automatiskt generera ett fullständigt schema. Identifiera luckor direkt och publicera dem som tillgängliga pass på plattformen med ett enda klick.
        </p>
        <ul className="mt-6 space-y-3">
          <li className="flex items-center text-gray-700">
            <CheckCircle className="h-5 w-5 text-accent-500 mr-3" />
            Automatisera schemaläggning för fast personal.
          </li>
          <li className="flex items-center text-gray-700">
            <CheckCircle className="h-5 w-5 text-accent-500 mr-3" />
            Identifiera och fyll bemanningsluckor direkt.
          </li>
          <li className="flex items-center text-gray-700">
            <CheckCircle className="h-5 w-5 text-accent-500 mr-3" />
            Publicera obemannade pass med ett klick.
          </li>
        </ul>
      </div>
      <div>
    <ScheduleDemo />
  </div>
    </div>
  </div>
</div>

     {/* --- Digital Contract Management Section --- */}
<div className="bg-white py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
      <div className="mt-10 lg:mt-0">
        <img
          src="https://media.istockphoto.com/id/1349390515/photo/paperless-workplace-idea-e-signing-electronic-signature-document-management-businessman-signs.webp?a=1&b=1&s=612x612&w=0&k=20&c=R8TG0nDs_NWaTK60HAHddQVCk5wxecl2_4GYIHRhhfc="
          alt="Person som signerar ett digitalt dokument på en surfplatta"
          className="rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div>
        <div className="flex items-center text-primary-600">
          <PenSquare className="h-8 w-8 mr-3" />
          <h2 className="text-3xl font-bold text-gray-900">Smidig Avtalshantering</h2>
        </div>
        <p className="mt-4 text-lg text-gray-600">
          Gå från ansökan till anställning på rekordtid. Skicka, signera och arkivera anställningsavtal för era farmaceuter och personal direkt i plattformen.
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
              <h4 className="font-semibold text-gray-800">Anpassade Mallar & Branding</h4>
              <p className="text-gray-600">Använd våra standardmallar eller ladda upp era egna. Addera er logotyp för ett professionellt intryck.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
      {/* How It Works Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Hur det fungerar</h2>
            <p className="mt-4 text-lg text-gray-600">
              En enkel process för att hitta kvalificerad apotekspersonal
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 transform hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg mb-4 mx-auto">
                1
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Skapa ditt konto</h3>
              <p className="text-gray-600 text-center">
                Registrera ditt apotek och fyll i din profil med all relevant information.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 transform hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg mb-4 mx-auto">
                2
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Publicera dina pass</h3>
              <p className="text-gray-600 text-center">
                Skapa detaljerade passannonser med krav, tider och ersättning.
              </p>
            </div>

           <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 transform hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg mb-4 mx-auto">
                3
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Granska sökande</h3>
              <p className="text-gray-600 text-center">
                Bläddra bland ansökningar, granska profiler och välj de bästa kandidaterna för dina pass.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 transform hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg mb-4 mx-auto">
                4
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Bekräfta & slutför</h3>
              <p className="text-gray-600 text-center">
                Godkänn sökande, hantera processen digitalt och hantera betalning genom vår plattform.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Redo att förenkla din personalhantering?
          </h2>
          <p className="mt-4 text-xl text-primary-100 max-w-2xl mx-auto">
            Gå med hundratals apotek som redan använder Farmispoolen för både schemaläggning och bemanning
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 shadow-md transition-colors"
            >
              Registrera ditt apotek
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}