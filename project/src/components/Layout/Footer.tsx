import React from 'react';
import { Link } from 'react-router-dom';
import farmispoolenLogo2 from '/assets/farmispoolenLogo2.png'; // Make sure this path is correct

export const Footer = () => {
  return (
    <footer className="bg-brandBeige border-t border-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Logo and Slogan */}
          <div>
            <div className="flex items-center">
              <img 
                src={farmispoolenLogo2} 
                alt="FarmisPoolen Logo" 
                className="h-16 w-auto mr-2" 
              />
            </div>
            <p className="mt-4 text-primary-700">
              Kopplar samman arbetsgivare med kvalificerad personal.
            </p>
          </div>

          {/* Column 2: Tjänster (Services) */}
          <div>
            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Tjänster</h3>
            <ul className="mt-4 space-y-4">
              <li><Link to="/for-apotekare" className="text-base text-primary-700 hover:text-primary-600">För personal</Link></li>
              <li><Link to="/for-apotek" className="text-base text-primary-700 hover:text-primary-600">För apotek</Link></li>
              <li><Link to="/for-konsultforetag" className="text-base text-primary-700 hover:text-primary-600">För konsultföretag</Link></li>
              <li><Link to="/priser" className="text-base text-primary-700 hover:text-primary-600">Priser</Link></li>
            </ul>
          </div>

          {/* Column 3: Företaget (The Company) */}
          <div>
            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Företaget</h3>
            <ul className="mt-4 space-y-4">
              <li><Link to="/about" className="text-base text-primary-700 hover:text-primary-600">Om oss</Link></li>
              <li><Link to="/kontakt" className="text-base text-primary-700 hover:text-primary-600">Kontakt</Link></li>
              <li><Link to="/faq" className="text-base text-primary-700 hover:text-primary-600">Vanliga Frågor</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Legal</h3>
            <ul className="mt-4 space-y-4">
              <li><Link to="/terms" className="text-base text-primary-700 hover:text-primary-600">Användarvillkor</Link></li>
              <li><Link to="/privacy" className="text-base text-primary-700 hover:text-primary-600">Integritetspolicy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-primary-100 pt-8">
          <p className="text-base text-primary-700 text-center">
            &copy; {new Date().getFullYear()} Farmispoolen AB. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
};

