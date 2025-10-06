// src/pages/IntegritetspolicyPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileText, ArrowLeft } from 'lucide-react';

export function IntegritetspolicyPage() {
  return (
    <div className="bg-brandBeige min-h-screen">
      {/* --- Hero Section --- */}
      <div className="bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <Shield className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Integritetspolicy
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Din integritet är viktig för oss. Här beskriver vi hur vi hanterar och skyddar dina personuppgifter.
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

            <h2>1. Introduktion</h2>
            <p>
              Farmispoolen AB ("vi", "oss", eller "vår") respekterar din integritet och är engagerade i att skydda dina personuppgifter. Denna integritetspolicy informerar dig om hur vi hanterar dina personuppgifter när du besöker vår webbplats eller använder vår plattform, och berättar om dina rättigheter enligt dataskyddslagstiftningen.
            </p>

            <h2>2. Personuppgiftsansvarig</h2>
            <p>
              Farmispoolen AB är personuppgiftsansvarig för de personuppgifter som samlas in och behandlas via vår plattform. Om du har frågor om denna policy eller hur vi hanterar dina uppgifter, vänligen kontakta oss på:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg not-prose">
              <p className="text-gray-700">
                <strong>Farmispoolen AB</strong><br />
                Drottninggatan 123<br />
                111 23 Stockholm<br />
                E-post: <a href="mailto:dataskydd@farmispoolen.se">dataskydd@farmispoolen.se</a>
              </p>
            </div>

            <h2>3. Vilka personuppgifter vi samlar in</h2>
            <p>
              Beroende på din relation till oss (arbetsgivare eller yrkesperson) och hur du använder vår plattform, kan vi samla in och behandla följande typer av personuppgifter:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">För personal:</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Namn och kontaktuppgifter</li>
                  <li>Professionell information (roll, erfarenhet, system)</li>
                  <li>Legitimationsnummer och verifieringsstatus</li>
                  <li>Tillgänglighet och schemapreferenser</li>
                  <li>Arbetshistorik och genomförda pass</li>
                  <li>Bankuppgifter för utbetalningar</li>
                </ul>
              </div>
              <div className="bg-primary-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">För arbetsgivare:</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Företagsnamn och kontaktuppgifter</li>
                  <li>Apoteksuppgifter och adressinformation</li>
                  <li>Kontaktpersoner och deras roller</li>
                  <li>Bemanningsbehov och publicerade pass</li>
                  <li>Faktureringsuppgifter</li>
                </ul>
              </div>
            </div>

            <h2>4. Hur vi använder dina personuppgifter</h2>
            <p>
              Vi behandlar dina personuppgifter för följande ändamål:
            </p>
            <ul>
              <li>Tillhandahålla och administrera vår plattform och tjänster</li>
              <li>Matcha arbetsgivare med lämplig personal</li>
              <li>Hantera användarregistrering och konton</li>
              <li>Verifiera legitimationer och kvalifikationer</li>
              <li>Hantera betalningar och fakturering</li>
              <li>Kommunicera med dig om din användning av plattformen</li>
              <li>Skicka relevanta notifieringar om pass och ansökningar</li>
              <li>Förbättra och utveckla våra tjänster</li>
              <li>Följa lagkrav och förordningar</li>
            </ul>

            <h2>5. Laglig grund för behandling</h2>
            <p>
              Vi behandlar dina personuppgifter baserat på följande lagliga grunder:
            </p>
            <ul>
                <li><strong>Avtal:</strong> För att uppfylla vårt avtal med dig när du använder vår plattform.</li>
                <li><strong>Berättigat intresse:</strong> När vi har ett legitimt affärsintresse som inte åsidosätter dina rättigheter.</li>
                <li><strong>Samtycke:</strong> I vissa fall där vi uttryckligen ber om ditt samtycke.</li>
                <li><strong>Rättslig förpliktelse:</strong> För att uppfylla våra juridiska skyldigheter.</li>
            </ul>

            <h2>6. Delning av personuppgifter</h2>
            <p>
              Vi kan dela dina personuppgifter med följande kategorier av mottagare:
            </p>
            <ul>
                <li>Arbetsgivare och yrkespersoner som använder plattformen (endast relevant information för matchning).</li>
                <li>Betaltjänstleverantörer för att hantera betalningar.</li>
                <li>IT-tjänsteleverantörer som hjälper oss att driva plattformen.</li>
                <li>Myndigheter när det krävs enligt lag.</li>
            </ul>
            <p>
              Vi säljer aldrig dina personuppgifter till tredje part.
            </p>

            <h2>7. Datalagring och säkerhet</h2>
            <p>
              Vi behåller dina personuppgifter endast så länge som är nödvändigt för de ändamål som anges i denna policy, eller för att uppfylla våra juridiska skyldigheter. Vi implementerar lämpliga tekniska och organisatoriska åtgärder för att skydda dina personuppgifter mot obehörig åtkomst, förlust eller skada.
            </p>

            <h2>8. Dina rättigheter</h2>
            <p>
              Enligt dataskyddslagstiftningen har du rätt till tillgång, rättelse, radering, begränsning av behandling, dataportabilitet och att invända mot behandling. För att utöva någon av dessa rättigheter, vänligen kontakta oss via kontaktuppgifterna ovan.
            </p>

            <h2>9. Cookies och liknande tekniker</h2>
            <p>
              Vår webbplats använder cookies för att förbättra din upplevelse. Du kan hantera dina cookie-inställningar i din webbläsare. För mer information, se vår separata cookie-policy (när den finns tillgänglig).
            </p>

            <h2>10. Ändringar i denna policy</h2>
            <p>
              Vi kan uppdatera denna integritetspolicy från tid till annan. Vi kommer att meddela dig om väsentliga ändringar genom att publicera den nya policyn på vår webbplats.
            </p>

            <h2>11. Klagomål</h2>
            <p>
              Om du är missnöjd med hur vi hanterar dina personuppgifter, vänligen kontakta oss först. Du har också rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegritetspolicyPage;
