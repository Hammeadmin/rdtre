// src/components/UI/SearchableCityDropdown.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

const swedishCities = [
  "Alingsås", "Arboga", "Arvika", "Askersund", "Avesta", "Boden", "Bollnäs", "Borgholm", "Borlänge", "Borås", "Båstad", "Eksjö", "Enköping", "Eskilstuna", "Eslöv", "Fagersta", "Falkenberg", "Falköping", "Falsterbo", "Falun", "Filipstad", "Flen", "Gränna", "Gävle", "Göteborg", "Hagfors", "Halmstad", "Haparanda", "Hedemora", "Helsingborg", "Hjo", "Hudiksvall", "Huskvarna", "Härnösand", "Hässleholm", "Höganäs", "Jönköping", "Kalmar", "Karlshamn", "Karlskoga", "Karlskrona", "Karlstad", "Katrineholm", "Kiruna", "Kramfors", "Kristianstad", "Kristinehamn", "Kumla", "Kungsbacka", "Kungälv", "Köping", "Laholm", "Landskrona", "Lidköping", "Lindesberg", "Linköping", "Ljungby", "Ludvika", "Luleå", "Lund", "Lycksele", "Lysekil", "Malmö", "Mariefred", "Mariestad", "Marstrand", "Mjölby", "Motala", "Mölndal", "Nora", "Norrköping", "Norrtälje", "Nybro", "Nyköping", "Nynäshamn", "Nässjö", "Oskarshamn", "Oxelösund", "Piteå", "Ronneby", "Sala", "Sandviken", "Sigtuna", "Simrishamn", "Skara", "Skellefteå", "Skänninge", "Skövde", "Sollefteå", "Stockholm", "Strängnäs", "Strömstad", "Sundsvall", "Säffle", "Säter", "Sävsjö", "Söderhamn", "Söderköping", "Södertälje", "Sölvesborg", "Tidaholm", "Torshälla", "Tranås", "Trelleborg", "Trollhättan", "Trosa", "Uddevalla", "Ulricehamn", "Umeå", "Uppsala", "Vadstena", "Varberg", "Vetlanda", "Vimmerby", "Visby", "Vänersborg", "Värnamo", "Västervik", "Västerås", "Växjö", "Ystad", "Åhus", "Åmål", "Ängelholm", "Örebro", "Öregrund", "Örnsköldsvik", "Östersund", "Östhammar"
].sort();

interface SearchableCityDropdownProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
  disabled?: boolean;
}

export const SearchableCityDropdown: React.FC<SearchableCityDropdownProps> = ({ selectedCity, onCityChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCities = swedishCities.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCity = (city: string) => {
    onCityChange(city);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`form-input text-left w-full flex justify-between items-center ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <span className={selectedCity ? 'text-gray-900' : 'text-gray-500'}>
          {selectedCity || '-- Välj en stad --'}
        </span>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white shadow-lg border rounded-md max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Sök stad..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full form-input text-sm"
            />
          </div>
          <ul className="overflow-y-auto flex-grow p-1">
            {filteredCities.length > 0 ? (
              filteredCities.map(city => (
                <li
                  key={city}
                  onClick={() => handleSelectCity(city)}
                  className="p-2 text-sm text-gray-800 rounded-md hover:bg-blue-50 cursor-pointer"
                >
                  {city}
                </li>
              ))
            ) : (
              <li className="p-2 text-center text-sm text-gray-500">Inga städer matchar.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};