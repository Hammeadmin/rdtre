// src/pages/AboutPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Heart, Headset, Cpu, Target, Users, UserCheck, Building2, ShieldCheck, Pill, ArrowRight, Lightbulb, CheckCircle } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="bg-white">
      {/* --- Hero Section --- */}
      <div className="relative bg-primary-800 text-white">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2940&auto=format&fit=crop" 
            alt="Modern pharmacy background" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
            Historien om en smartare apoteksbemanning
          </h1>
          <p className="mt-6 text-xl text-primary-200 max-w-3xl mx-auto">
            Vi såg ett problem i hjärtat av svensk apoteksvård och bestämde oss för att bygga lösningen med teknik, passion och branschkunskap.
          </p>
        </div>
      </div>

      {/* --- Our Story Section --- */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Från frustration till innovation</h2>
              <div className="mt-6 text-gray-600 space-y-4 text-lg">
                <p>
                  Farmispoolen grundades 2024 av apotekare som själva upplevt bemanningsutmaningarna på nära håll och visste att det måste finnas ett bättre sätt.
                </p>
                <p>
                  Vi såg apotek tvingas till ineffektiva lösningar för att täcka akuta luckor, samtidigt som anställda sökte efter mer flexibilitet och kontroll över sin karriär. Klyftan var tydlig, och vi bestämde oss för att överbrygga den.
                </p>
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2940&auto=format&fit=crop" 
                alt="Two professionals collaborating"
                className="rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

     {/* --- Vårt åtagande för kvalitet och tillväxt --- */}
      <div className="bg-primary-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Vårt åtagande för kvalitet och tillväxt</h2>
            <p className="mt-4 text-lg text-gray-600">
              Vi bygger en starkare framtid för apoteksbranschen, en anslutning i taget.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white mb-4 mx-auto">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Stärk ert apotek</h3>
              <p className="mt-2 text-gray-600">
                Få tillgång till ett nätverk av verifierade farmaceuter och egenvårdsrådgivare. Tillsätt pass snabbt, hantera scheman enkelt och säkerställ att ni alltid har den kompetens ni behöver för att möta era kunders behov.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white mb-4 mx-auto">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Utveckla din karriär</h3>
              <p className="mt-2 text-gray-600">
                Hitta meningsfulla uppdrag som matchar din kompetens och dina ambitioner. Med Farmispoolen får du flexibiliteten att styra över din egna tid och möjligheten att växa i din roll på dina villkor.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white mb-4 mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">En bransch i utveckling</h3>
              <p className="mt-2 text-gray-600">
                Vi tror på att höja standarden for hela branschen. Genom att förenkla bemanning och främja kompetensutbyte bidrar vi till en mer hållbar, effektiv och patientfokuserad apoteksvård i Sverige.
              </p>
            </div>
          </div>
        </div>
      </div>
      
{/* --- The Farmispoolen Advantage Section (Replaces Founders) --- */}
      <div className="bg-primary-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Varför välja Farmispoolen?</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Vi kombinerar teknik med en djup förståelse för apoteksbranschen för att leverera en välbehövlig tjänst.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Advantage 1: Technology */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
                  <Cpu className="h-6 w-6" />
                </div>
                <h3 className="ml-4 text-xl font-semibold text-gray-900">Smart Teknologi</h3>
              </div>
              <p className="text-gray-600">
                Vår intuitiva plattform gör det enkelt att publicera pass, hitta personal och hantera scheman – allt på ett ställe.
              </p>
            </div>
            {/* Advantage 2: Quality */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
                  <UserCheck className="h-6 w-6" />
                </div>
                <h3 className="ml-4 text-xl font-semibold text-gray-900">Verifierad Kvalitet</h3>
              </div>
              <p className="text-gray-600">
                Varje farmaceut och rådgivare i vår pool är noggrant verifierad för att garantera högsta kompetens och professionalitet.
              </p>
            </div>
            {/* Advantage 3: Support */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
                  <Headset className="h-6 w-6" />
                </div>
                <h3 className="ml-4 text-xl font-semibold text-gray-900">Personlig Support</h3>
              </div>
              <p className="text-gray-600">
                Bakom tekniken finns ett dedikerat team av branschexperter redo att hjälpa dig när du behöver det.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- CTA Section --- */}
      <div className="bg-primary-50">
        <div className="max-w-4xl mx-auto text-center py-16 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Bli en del av vår resa
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Oavsett om du är ett apotek som söker personal eller en anställd som söker nya möjligheter, är vi här för att hjälpa.
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-md"
            >
              Kom igång nu <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
