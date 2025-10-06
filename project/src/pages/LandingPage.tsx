// src/pages/LandingPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  // Pill icon is replaced by the image logo, so it can be removed if not used elsewhere.
  Calendar,
  Users,
  Building2,
  CheckCircle,
  ArrowRight,
  Clock,
  Heart,
  ShieldCheck,
  Search,
  Briefcase
} from 'lucide-react';
// Import your new logo


const farmispoolenLogo = '/assets/farmispoolenLogo.png'
const farmispoolenLogo2 = '/assets/farmispoolenLogo2.png'

export function LandingPage() {
  const [demoApplicationSent, setDemoApplicationSent] = useState(false);

  // Handler for when demo-ansökan skickas
  const handleDemoApply = () => {
    setDemoApplicationSent(true);
    // Optional: Scrolla till "Application Accepted Card"
    // document.getElementById('application-accepted-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              {/* === IMAGE REPLACEMENT FOR HERO TEXT === */}
                <div className="mb-1">
                  <img
                    src={farmispoolenLogo}
                    alt="Farmispoolen - Kopplar samman apotek med kvalificerad personal"
                    className="w-full max-w-lg h-auto mx-auto lg:mx-0 rounded-lg" // This line is updated
                  />
                </div>
              {/* === END IMAGE REPLACEMENT === */}
              
              <p className="mt-1 text-xl text-primary-700 max-w-2xl mx-auto lg:mx-0">
                Farmispoolen förenklar apoteksbemanning genom att koppla samman apotek med en stor pool av legitimerade farmaceuter, egenvårdsrådgivare och kassapersonal. Hitta arbetspass som passar ditt schema eller bemanna ditt apotek med verifierad kompetens när behovet uppstår.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/for-apotek"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-colors"
                >
                  <Building2 className="mr-2 h-5 w-5" />
                  För arbetsgivare
                </Link>
                <Link
                  to="/for-apotekare" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-primary-600 text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 hover:border-primary-700 shadow-md transition-colors"
                >
                  <Briefcase className="mr-2 h-5 w-5" />
                  För personal
                </Link>
              </div>
            </div>
            
            {/* Interactive Demo Card */}
            <div className="relative mt-10 lg:mt-0">
              <div className="bg-white rounded-xl shadow-xl p-6 space-y-6 max-w-md mx-auto lg:ml-auto">
                <div className="absolute -top-4 -right-4 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Demo
                </div>
                
                {/* Available Shift Card */}
                <div className={`border rounded-lg p-4 bg-primary-50 ${!demoApplicationSent ? 'hover:shadow-md' : 'opacity-70'} transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-primary-800">Morgonpass - Stadsapoteket</h3>
                    <span className={`px-2 py-1 ${demoApplicationSent ? 'bg-warm-100 text-warm-800' : 'bg-accent-100 text-accent-800'} rounded-full text-xs font-semibold transition-colors`}>
                      {demoApplicationSent ? 'Väntar...' : 'Tillgängligt'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-primary-700 mb-2">
                    <Clock className="h-4 w-4 mr-1 text-primary-400" />
                    <span>08:00 - 16:00</span>
                  </div>
                  <div className="flex items-center text-sm text-primary-700 mb-4">
                    <Building2 className="h-4 w-4 mr-1 text-primary-400" />
                    <span>Stockholm Centrum</span>
                  </div>
                  <button
                    onClick={handleDemoApply}
                    disabled={demoApplicationSent}
                    className={`w-full text-white rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      demoApplicationSent
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    {demoApplicationSent ? 'Ansökan Skickad!' : 'Ansök om pass'}
                  </button>
                </div>

                {/* Application Accepted Card */}
                <div
                  id="application-accepted-card"
                  className={`border rounded-lg p-4 ${
                    demoApplicationSent
                      ? 'bg-accent-100 ring-2 ring-accent-500 shadow-xl scale-105 opacity-100'
                      : 'bg-gray-100 opacity-40 scale-95' 
                  } transition-all duration-500 ease-in-out`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium ${demoApplicationSent ? 'text-accent-800' : 'text-gray-700'}`}>
                      {demoApplicationSent ? 'Ansökan godkänd!' : 'Exempel: Godkänd Ansökan'}
                    </h3>
                    <CheckCircle className={`h-5 w-5 ${demoApplicationSent ? 'text-accent-600 animate-pulse' : 'text-gray-400'} transition-colors duration-500`} />
                  </div>
                  <p className={`text-sm mb-2 ${demoApplicationSent ? 'text-accent-700' : 'text-gray-600'}`}>
                    {demoApplicationSent
                      ? 'Din ansökan för morgonpasset har godkänts!'
                      : 'Så här kan det se ut när din ansökan godkänns.'}
                  </p>
                  <div className={`flex items-center text-sm ${demoApplicationSent ? 'text-accent-700' : 'text-gray-600'}`}>
                    <Calendar className={`h-4 w-4 mr-1 ${demoApplicationSent ? 'text-accent-500' : 'text-gray-400'}`} />
                    <span>Måndag, 15 maj 2025</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary-900">Hur Farmispoolen fungerar</h2>
            <p className="mt-4 text-lg text-primary-700 max-w-2xl mx-auto">
              En enkel process för både apotek och apotekspersonal
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-primary-50 rounded-xl p-8 shadow-md transform hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-primary-800 mb-6 flex items-center">
                <Building2 className="h-6 w-6 text-primary-600 mr-3" />
                För arbetsgivare
              </h3>
              <ol className="space-y-6">
                <li className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary-200 text-primary-700 font-bold text-lg">1</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary-800">Hantera all personal</h4>
                    <p className="mt-1 text-primary-700">Lägg till både fast personal och publicera enstaka pass eller längre uppdrag för vikarier</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary-200 text-primary-700 font-bold text-lg">2</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary-800">Skapa scheman</h4>
                    <p className="mt-1 text-primary-700">Generera kompletta scheman för hela perioder med några få klick</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary-200 text-primary-700 font-bold text-lg">3</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary-800">Hantera bemanning</h4>
                    <p className="mt-1 text-primary-700">Publicera lediga pass eller uppdrag och granska ansökningar från en pool av kvalificerad personal</p>
                  </div>
                </li>
              </ol>
            </div>
             <div className="bg-primary-50 rounded-xl p-8 shadow-md transform hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-primary-800 mb-6 flex items-center">
                <Briefcase className="h-6 w-6 text-primary-600 mr-3" />
                För personal
              </h3>
              <ol className="space-y-6">
                <li className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary-200 text-primary-700 font-bold text-lg">1</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary-800">Hitta tillgängliga pass & uppdrag</h4>
                    <p className="mt-1 text-primary-700">Bläddra bland annonser som matchar dina färdigheter och tillgänglighet</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary-200 text-primary-700 font-bold text-lg">2</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary-800">Ansök med ett klick</h4>
                    <p className="mt-1 text-primary-700">Skicka enkelt in ansökningar för pass du är intresserad av</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary-200 text-primary-700 font-bold text-lg">3</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary-800">Arbeta & få betalt</h4>
                    <p className="mt-1 text-primary-700">Slutför pass och få betalning genom vår plattform</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* --- Role Showcase Section --- */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary-900">En plattform för hela apoteksteamet</h2>
            <p className="mt-4 text-lg text-primary-700 max-w-3xl mx-auto">
              Oavsett din roll på apoteket, har vi uppdragen och personalen som passar dina behov. Vi välkomnar alla från legitimerade farmaceuter till engagerade egenvårdsrådgivare och serviceinriktad kassapersonal.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {/* Card 1: Farmaceuter */}
            <div className="bg-primary-50 p-8 rounded-xl shadow-md border border-gray-100 transform hover:-translate-y-2 transition-transform duration-300">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white mb-4 mx-auto">
                <Briefcase className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Farmaceuter</h3>
              <p className="mt-2 text-gray-600">
                Hitta givande uppdrag som legitimerad eller receptarie. Ta kontroll över din karriär med flexibla arbetspass.
              </p>
            </div>
            {/* Card 2: Egenvårdsrådgivare */}
            <div className="bg-primary-50 p-8 rounded-xl shadow-md border border-gray-100 transform hover:-translate-y-2 transition-transform duration-300">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white mb-4 mx-auto">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Egenvårdsrådgivare</h3>
              <p className="mt-2 text-gray-600">
                Dela din expertis och hjälp kunder med receptfria läkemedel. Perfekt för dig med passion för hälsa och service.
              </p>
            </div>
            {/* Card 3: Kassapersonal */}
            <div className="bg-primary-50 p-8 rounded-xl shadow-md border border-gray-100 transform hover:-translate-y-2 transition-transform duration-300">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white mb-4 mx-auto">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Kassapersonal & Studenter</h3>
              <p className="mt-2 text-gray-600">
                Är du serviceinriktad eller studerande? Vinn värdefull erfarenhet från apoteksbranschen och tjäna extra.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- The Farmispoolen Advantage Section --- */}
      <div className="py-16 bg-brandBeige">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary-900">En Tjänst Byggd För Framtidens Apotek</h2>
            <p className="mt-4 text-lg text-primary-700 max-w-2xl mx-auto">
              Vi kombinerar teknik med djup branschkunskap för att ge dig ett kraftfullt verktyg.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Advantage 1: Quality & Trust */}
           <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 transform hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary-600 mb-4 mx-auto">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-primary-800 text-center mb-2">Trygghet & Kvalitet</h3>
              <p className="text-primary-700 text-center">
                Varje konsult i vår pool är noggrant verifierad. Få tillgång till garanterad kompetens och arbeta med personal du kan lita på, varje gång.
              </p>
            </div>
            {/* Advantage 2: Full Control */}
           <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 transform hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary-600 mb-4 mx-auto">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-primary-800 text-center mb-2">Full Kontroll, Mindre Admin</h3>
              <p className="text-primary-700 text-center">
                Hantera scheman för både fast personal och vikarier på ett och samma ställe. Vårt intuitiva system minimerar pappersarbete och maximerar er effektivitet.
              </p>
            </div>
            {/* Advantage 3: A True Partnership */}
           <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 transform hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary-600 mb-4 mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-primary-800 text-center mb-2">Mer Än Bara en Plattform</h3>
              <p className="text-primary-700 text-center">
                Vi är er partner inom bemanning. Få personlig support från branschexperter som förstår era unika utmaningar och hjälper er att lyckas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"> 
                <span className="block">Redo att förenkla din personalhantering?</span>
                <span className="block text-primary-200">Allt-i-ett-lösning för apotek</span>
              </h2>
              <p className="mt-4 text-lg text-primary-100 max-w-xl">
                Skapa ditt konto nu och få tillgång till schemaläggning, personalhantering och flexibla bemanningslösningar.
              </p>
            </div>
            <div className="mt-8 lg:mt-0 lg:flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 shadow-md transition-colors"
                >
                  Skapa Konto
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/about" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-primary-700 shadow-md transition-colors"
                >
                  Läs Mer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}