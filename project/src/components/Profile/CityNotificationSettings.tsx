import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MapPin, Save, Loader2, ChevronDown, X } from 'lucide-react';


const swedishCities = [
  "Alingsås", "Arboga", "Arvika", "Askersund", "Avesta", "Boden", "Bollnäs", "Borgholm", "Borlänge", "Borås", "Båstad", "Eksjö", "Enköping", "Eskilstuna", "Eslöv", "Fagersta", "Falkenberg", "Falköping", "Falsterbo", "Falun", "Filipstad", "Flen", "Gränna", "Gävle", "Göteborg", "Hagfors", "Halmstad", "Haparanda", "Hedemora", "Helsingborg", "Hjo", "Hudiksvall", "Huskvarna", "Härnösand", "Hässleholm", "Höganäs", "Jönköping", "Kalmar", "Karlshamn", "Karlskoga", "Karlskrona", "Karlstad", "Katrineholm", "Kiruna", "Kramfors", "Kristianstad", "Kristinehamn", "Kumla", "Kungsbacka", "Kungälv", "Köping", "Laholm", "Landskrona", "Lidköping", "Lindesberg", "Linköping", "Ljungby", "Ludvika", "Luleå", "Lund", "Lycksele", "Lysekil", "Malmö", "Mariefred", "Mariestad", "Marstrand", "Mjölby", "Motala", "Mölndal", "Nora", "Norrköping", "Norrtälje", "Nybro", "Nyköping", "Nynäshamn", "Nässjö", "Oskarshamn", "Oxelösund", "Piteå", "Ronneby", "Sala", "Sandviken", "Sigtuna", "Simrishamn", "Skara", "Skellefteå", "Skänninge", "Skövde", "Sollefteå", "Stockholm", "Strängnäs", "Strömstad", "Sundsvall", "Säffle", "Säter", "Sävsjö", "Söderhamn", "Söderköping", "Södertälje", "Sölvesborg", "Tidaholm", "Torshälla", "Tranås", "Trelleborg", "Trollhättan", "Trosa", "Uddevalla", "Ulricehamn", "Umeå", "Uppsala", "Vadstena", "Varberg", "Vetlanda", "Vimmerby", "Visby", "Vänersborg", "Värnamo", "Västervik", "Västerås", "Växjö", "Ystad", "Åhus", "Åmål", "Ängelholm", "Örebro", "Öregrund", "Örnsköldsvik", "Östersund", "Östhammar"
].sort();

export const CityNotificationSettings = () => {
  const { profile, user, fetchProfile } = useAuth();
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.notification_cities) {
      setSelectedCities(profile.notification_cities);
    }
  }, [profile]);

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCityToggle = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const handleSave = async () => {
    if (!user) return toast.error("Användare hittades inte.");
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_cities: selectedCities })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Dina stadsval har sparats!');
      await fetchProfile(user.id);
      setIsOpen(false); // Close dropdown on save
    } catch (err) {
      toast.error(`Fel: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredCities = swedishCities.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDisplayValue = () => {
    if (selectedCities.length === 0) return "Välj städer...";
    if (selectedCities.length > 2) {
      return `${selectedCities.slice(0, 2).join(', ')} + ${selectedCities.length - 2} till`;
    }
    return selectedCities.join(', ');
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
        <MapPin className="w-5 h-5 mr-2 text-gray-500" />
        Notiser för städer
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Välj de städer du vill få notiser om nya pass ifrån.
      </p>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="form-input w-full flex justify-between items-center text-left"
        >
          <span className="truncate pr-2">{getDisplayValue()}</span>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border rounded-md max-h-72 overflow-hidden flex flex-col">
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Sök stad..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full form-input text-sm"
              />
            </div>
            <div className="overflow-y-auto flex-grow p-1">
              {filteredCities.length > 0 ? (
                filteredCities.map(city => (
                  <label key={city} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-blue-50">
                    <input
                      type="checkbox"
                      checked={selectedCities.includes(city)}
                      onChange={() => handleCityToggle(city)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{city}</span>
                  </label>
                ))
              ) : (
                <p className="text-center text-sm text-gray-500 p-3">Inga städer matchar din sökning.</p>
              )}
            </div>
            <div className="p-2 border-t bg-gray-50 flex justify-end">
              <button onClick={handleSave} disabled={loading} className="btn btn-primary btn-sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Spara val
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};