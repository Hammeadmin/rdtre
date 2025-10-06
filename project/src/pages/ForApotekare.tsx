import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Clock,
  CheckCircle,
  Calendar,
  DollarSign,
  ArrowRight,
  Heart
} from 'lucide-react';
import { DemoShiftFinder } from '../components/UI/DemoShiftFinder';

export default function ForPersonal() {
  return (
    <div className="bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50 min-h-screen">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Ta kontroll över din karriär
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Upptäck friheten med flexibelt arbete. Vi erbjuder allt från enstaka pass till längre konsultuppdrag, anpassade efter dina önskemål och din livsstil.
          </p>
        </div>
      </div>

            {/* --- REPLACED: Benefits Section --- */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Arbeta på dina villkor</h2>
              <p className="mt-4 text-lg text-gray-600">
                Vi tror på att ge dig verktygen och möjligheterna att skapa en arbetsvardag som passar just dig.
              </p>
              <ul className="mt-8 space-y-2">
                <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-800">Total Flexibilitet</h4>
                    <p className="text-gray-600">Välj själv när och hur mycket du vill arbeta. Perfekt att kombinera med studier eller annan anställning.</p>
                  </div>
                </li>
                <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-800">Konkurrenskraftig Lön</h4>
                    <p className="text-gray-600">Få rättvis ersättning för din kompetens med transparenta och punktliga utbetalningar.</p>
                  </div>
                </li>
                <li className="flex items-start p-4 rounded-lg transition-colors duration-300 hover:bg-primary-50">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-800">Varierande Uppdrag</h4>
                    <p className="text-gray-600">Utvecklas professionellt genom att arbeta i olika apoteksmiljöer och bredda ditt nätverk.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="mt-10 lg:mt-0">
              <img
                src="https://plus.unsplash.com/premium_photo-1661777752178-fa6055526eb8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cGhhcm1hY2lzdHxlbnwwfHwwfHx8MA%3D%3D"
                alt="En glad farmaceut som hjälper en kund på ett ljust och modernt apotek"
                className="rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </div>

       {/* --- Interactive Demo Section --- */}
      <div className="py-16 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:pr-8">
              <DemoShiftFinder />
            </div>
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900">Upptäck & Ansök på Minuter</h2>
              <p className="mt-4 text-lg text-gray-600">
                Vår plattform gör det enkelt att hitta arbetspass som passar dig. Sök baserat på plats, filtrera på roll och ansök med ett enda klick.
              </p>
            </div>
          </div>
        </div>
      </div>

     {/* --- How It Works Section --- */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Så enkelt kommer du igång</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {/* Step 1 */}
            <div className="bg-primary-50/50 p-8 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white font-bold text-2xl mb-4 mx-auto">1</div>
              <h3 className="text-xl font-semibold text-gray-800">Skapa din profil</h3>
              <p className="mt-2 text-gray-600">Registrera dig och fyll i din profil med kvalifikationer och erfarenhet.</p>
            </div>
            {/* Step 2 */}
            <div className="bg-primary-50/50 p-8 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white font-bold text-2xl mb-4 mx-auto">2</div>
              <h3 className="text-xl font-semibold text-gray-800">Bli Verifierad</h3>
              <p className="mt-2 text-gray-600">Vi kontrollerar din legitimation så att du snabbt kan börja söka uppdrag.</p>
            </div>
            {/* Step 3 */}
            <div className="bg-primary-50/50 p-8 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-600 text-white font-bold text-2xl mb-4 mx-auto">3</div>
              <h3 className="text-xl font-semibold text-gray-800">Arbeta & Få Betalt</h3>
              <p className="mt-2 text-gray-600">Ansök till pass, slutför ditt arbete och få betalt smidigt via plattformen.</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- What We Offer Section --- */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 mt-10 lg:mt-0">
              <img
                src="https://media.istockphoto.com/id/1424988699/photo/businessman-contemplating-in-the-office-looking-through-the-window.webp?a=1&b=1&s=612x612&w=0&k=20&c=Cda7RNOD_zvdJNWYUw1mDsQ7xcOt8ziO3CJLpd6H4_k="
                alt="En person som arbetar flexibelt på sin laptop i en bekväm miljö"
                className="rounded-xl shadow-lg"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900">Möjligheter för alla</h2>
              <p className="mt-4 text-lg text-gray-600">
                Oavsett om du söker extra inkomst eller en ny karriärväg, har vi uppdragen för dig.
              </p>
              <div className="mt-8 space-y-6">
                <div>
                  <h4 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Clock className="h-6 w-6 mr-3 text-primary-600" />
                    Enstaka Pass
                  </h4>
                  <p className="text-gray-600 mt-2">
                    Perfekt för dig som vill tjäna extra pengar vid sidan av studier eller annan anställning. Ta ett morgonpass, helgpass eller hoppa in vid akuta behov.
                  </p>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Calendar className="h-6 w-6 mr-3 text-primary-600" />
                    Längre Uppdrag
                  </h4>
                  <p className="text-gray-600 mt-2">
                    Söker du mer stabilitet? Ta dig an längre konsultuppdrag eller sommarvikariat. En utmärkt chans att utveckla dina färdigheter i en ny miljö.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
                  {/* --- Students Section --- */}
      <div className="bg-primary-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Är du student?</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Perfekt för dig som studerar till farmaceut eller apotekstekniker och vill erhålla relevant erfarenhet. Extrajobba på apotek, bygg ditt CV och få en fot in i branschen – allt på dina villkor.
            </p>
            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-colors"
              >
                Börja din resa här <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- CTA Section --- */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Redo att hitta ditt nästa pass?
          </h2>
          <p className="mt-4 text-xl text-primary-100 max-w-2xl mx-auto">
            Gå med tusentals kollegor som redan använder Farmispoolen för en flexiblare arbetsdag.
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 shadow-md transition-colors"
            >
              Skapa din profil
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}