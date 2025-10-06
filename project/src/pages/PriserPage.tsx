// src/pages/PriserPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Check, ArrowLeft, Building2, Briefcase, Shield, Clock, Calendar, HelpCircle } from 'lucide-react';

export function PriserPage() {
  return (
    <div className="bg-brandBeige min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Back button */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tillbaka till startsidan
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Priser & abonnemang
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Transparenta och flexibla prismodeller anpassade för olika behov
          </p>
        </div>

        {/* For Employers Section */}
        <section id="for-employers" className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">För apotek & arbetsgivare</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Plan 1: Standard */}
            {/* ADDED: transform and hover:-translate-y-2 for the jump effect */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 transform transition-all duration-300 hover:shadow-xl hover:border-primary-200 hover:-translate-y-2">
              <div className="p-8 bg-gradient-to-br from-primary-50 to-white">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Standard</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-gray-900">3 990</span>
                  <span className="ml-1 text-xl text-gray-500">kr/mån</span>
                </div>
                <p className="mt-4 text-sm text-gray-600">Perfekt för det enskilda apoteket som vill ha full tillgång till plattformen.</p>
              </div>
              <div className="border-t border-gray-100"></div>
              <div className="p-8 space-y-4">
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /> <span className="ml-3 text-gray-700 font-semibold">Obegränsade pass & uppdrag</span></div>
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Tillgång till hela personalpoolen</span></div>
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Schemaläggning & Lönehantering</span></div>
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Publicera akuta pass</span></div>
              </div>
              <div className="pt-6 p-8">
                <Link to="/register?plan=standard" className="block w-full text-center px-4 py-2 border border-primary-600 text-primary-600 font-medium rounded-md hover:bg-primary-50 transition-colors">
                  Välj Standard
                </Link>
              </div>
            </div>

            {/* Plan 2: Enterprise */}
            {/* ADDED: transform and hover:-translate-y-2 for the jump effect */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-primary-500 relative transform transition-transform duration-300 hover:-translate-y-2">
              <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                FÖR KEDJOR & FÖRETAG
              </div>
              <div className="p-8 bg-gradient-to-br from-primary-100 to-white">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-gray-900">Kontakta oss</span>
                </div>
                <p className="mt-4 text-sm text-gray-600">För kedjor och konsultbolag med flera anslutna apotek.</p>
              </div>
              <div className="border-t border-gray-100"></div>
              <div className="p-8 space-y-4">
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Allt i <strong className="text-primary-600">Standard</strong>, plus:</span></div>
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Volymrabatter</span></div>
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Central administration</span></div>
                <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Dedikerad kontaktperson</span></div>
              </div>
              <div className="pt-6 p-8">
                <Link to="/kontakt" className="block w-full text-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors">
                  Kontakta Sälj
                </Link>
              </div>
            </div>

          </div>

          {/* FAQ Section */}
          <div className="mt-12 bg-primary-50 rounded-lg p-6 max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HelpCircle className="h-5 w-5 text-primary-600 mr-2" />
              Vanliga frågor om prissättning för arbetsgivare
            </h3>
            <div className="space-y-4">
              {/* UPDATED: Added hover effect to individual FAQ items */}
              <div className="p-2 rounded-md transition-colors hover:bg-primary-100/50"><h4 className="font-medium text-gray-900">Ingår alla funktioner i Standard-planen?</h4><p className="text-gray-700 text-sm mt-1">Ja, Standard-planen ger dig full tillgång till alla plattformens kärnfunktioner, inklusive obegränsade pass, schemaläggning och lönehantering för ett apotek.</p></div>
              <div className="p-2 rounded-md transition-colors hover:bg-primary-100/50"><h4 className="font-medium text-gray-900">Vem är Företagsplanen för?</h4><p className="text-gray-700 text-sm mt-1">Vår Företagsplan är skräddarsydd för apotekskedjor, konsultbolag eller organisationer som hanterar bemanning för flera apotek. Vi erbjuder volymrabatter och centraliserade verktyg för att förenkla administrationen.</p></div>
              <div className="p-2 rounded-md transition-colors hover:bg-primary-100/50"><h4 className="font-medium text-gray-900">Finns det någon bindningstid?</h4><p className="text-gray-700 text-sm mt-1">Nej, vårt standardabonnemang löper månadsvis och du kan avsluta när du vill. För företagsplanen skräddarsyr vi ett avtal som passar era behov.</p></div>
            </div>
          </div>
        </section>

        {/* For Professionals Section */}
        <section id="for-professionals" className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">För personal</h2>
          
          {/* ADDED: transform, hover effect and transition to the card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 max-w-3xl mx-auto transform transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
            <div className="p-8 bg-gradient-to-br from-primary-50 to-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Helt kostnadsfritt</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900">0</span>
                    <span className="ml-1 text-xl text-gray-500">kr</span>
                  </div>
                </div>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                  GRATIS
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Som anställd är det helt kostnadsfritt att använda Farmispoolen. Vi tar inga avgifter från dig - våra intäkter kommer från arbetsgivarna.
              </p>
            </div>
            <div className="border-t border-gray-100"></div>
            <div className="p-8 space-y-4">
              <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Skapa och hantera din professionella profil</span></div>
              <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Sök och ansök om tillgängliga pass</span></div>
              <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Hantera ditt schema och tillgänglighet</span></div>
              <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Kommunicera med arbetsgivare</span></div>
              <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="ml-3 text-gray-700">Få betalt direkt genom plattformen</span></div>
              <div className="pt-6">
                <Link to="/register?type=professional" className="block w-full text-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors">
                  Registrera dig nu
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* All Plans Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Vad ingår i alla planer</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* ADDED: transform, hover effect and transition to all cards in this section */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 text-primary-600 mb-4 mx-auto">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Säker plattform</h3>
              <p className="text-gray-600 text-center text-sm">Krypterad kommunikation och säker hantering av personuppgifter enligt GDPR.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 text-primary-600 mb-4 mx-auto">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">24/7 Tillgänglighet</h3>
              <p className="text-gray-600 text-center text-sm">Vår plattform är tillgänglig dygnet runt för att passa dina behov.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 text-primary-600 mb-4 mx-auto">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Schemaläggning</h3>
              <p className="text-gray-600 text-center text-sm">Kraftfulla verktyg för att hantera scheman och tillgänglighet.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 text-primary-600 mb-4 mx-auto">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Betalningshantering</h3>
              <p className="text-gray-600 text-center text-sm">Säker och automatiserad hantering av alla betalningar och löner.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary-600 rounded-xl py-12 px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-6">
            Redo att komma igång?
          </h2>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-8">
            Välj den plan som passar dina behov och börja använda Farmispoolen idag.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=employer"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 shadow-md transition-colors"
            >
              <Building2 className="mr-2 h-5 w-5" />
              Registrera som apotek
            </Link>
            <Link
              to="/register?type=professional"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-primary-100 shadow-md transition-colors"
            >
              <Briefcase className="mr-2 h-5 w-5" />
              Registrera som anställd
            </Link>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Har du frågor om våra priser?</h2>
          <p className="text-gray-600 mb-6">
            Kontakta vårt team för att diskutera dina specifika behov och få ett skräddarsytt erbjudande.
          </p>
          <Link
            to="/kontakt"
            className="inline-flex items-center justify-center px-6 py-3 border border-primary-600 text-base font-medium rounded-md text-primary-600 hover:bg-primary-50 transition-colors"
          >
            Kontakta oss
          </Link>
        </div>

      </div>
    </div>
  );
}

export default PriserPage;
