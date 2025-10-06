import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft, Building, Briefcase, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import type { UserRole } from '../types';
import { ForgotPasswordForm } from '../components/Auth/ForgotPasswordForm';

const swedishCities = [
  "Alingsås", "Arboga", "Arvika", "Askersund", "Avesta", "Boden", "Bollnäs", "Borgholm", "Borlänge", "Borås", "Båstad", "Eksjö", "Enköping", "Eskilstuna", "Eslöv", "Fagersta", "Falkenberg", "Falköping", "Falsterbo", "Falun", "Filipstad", "Flen", "Gränna", "Gävle", "Göteborg", "Hagfors", "Halmstad", "Haparanda", "Hedemora", "Helsingborg", "Hjo", "Hudiksvall", "Huskvarna", "Härnösand", "Hässleholm", "Höganäs", "Jönköping", "Kalmar", "Karlshamn", "Karlskoga", "Karlskrona", "Karlstad", "Katrineholm", "Kiruna", "Kramfors", "Kristianstad", "Kristinehamn", "Kumla", "Kungsbacka", "Kungälv", "Köping", "Laholm", "Landskrona", "Lidköping", "Lindesberg", "Linköping", "Ljungby", "Ludvika", "Luleå", "Lund", "Lycksele", "Lysekil", "Malmö", "Mariefred", "Mariestad", "Marstrand", "Mjölby", "Motala", "Mölndal", "Nora", "Norrköping", "Norrtälje", "Nybro", "Nyköping", "Nynäshamn", "Nässjö", "Oskarshamn", "Oxelösund", "Piteå", "Ronneby", "Sala", "Sandviken", "Sigtuna", "Simrishamn", "Skara", "Skellefteå", "Skänninge", "Skövde", "Sollefteå", "Stockholm", "Strängnäs", "Strömstad", "Sundsvall", "Säffle", "Säter", "Sävsjö", "Söderhamn", "Söderköping", "Södertälje", "Sölvesborg", "Tidaholm", "Torshälla", "Tranås", "Trelleborg", "Trollhättan", "Trosa", "Uddevalla", "Ulricehamn", "Umeå", "Uppsala", "Vadstena", "Varberg", "Vetlanda", "Vimmerby", "Visby", "Vänersborg", "Värnamo", "Västervik", "Västerås", "Växjö", "Ystad", "Åhus", "Åmål", "Ängelholm", "Örebro", "Öregrund", "Örnsköldsvik", "Östersund", "Östhammar"
].sort();

interface AuthPageProps {
  type: 'login' | 'register';
}

type RegistrationUserType = 'personal' | 'employer';

export function AuthPage({ type: typeFromProp }: AuthPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const userTypeFromQuery = queryParams.get('userType') as RegistrationUserType | null;
  
  // State to switch between login/register and forgot password views
  const [showForgotPassword, setShowForgotPassword] = useState(false); 

  const [selectedUserType, setSelectedUserType] = useState<RegistrationUserType>(userTypeFromQuery || 'personal');
  const typeFromQuery = queryParams.get('type') as 'login' | 'register' | null;
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(typeFromQuery || typeFromProp || 'login');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    pharmacy_name: '',
    organization_number: '',
    city: '',
    role: 'pharmacist' as UserRole,
  });

  useEffect(() => {
    const newMode = typeFromQuery || typeFromProp || 'login';
    if (newMode !== currentMode) {
      setCurrentMode(newMode);
    }
  }, [typeFromProp, typeFromQuery, currentMode]);

  useEffect(() => {
    if (userTypeFromQuery) {
      setSelectedUserType(userTypeFromQuery);
    } else {
      setSelectedUserType('personal');
    }
  }, [userTypeFromQuery]);

  useEffect(() => {
    if (currentMode === 'register') {
      if (selectedUserType === 'employer') {
        setFormData(prev => ({ ...prev, role: 'employer', pharmacy_name: prev.pharmacy_name || '' }));
      } else {
        setFormData(prev => {
          if (!['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(prev.role)) {
            return { ...prev, role: 'pharmacist' };
          }
          return prev;
        });
      }
    }
  }, [selectedUserType, currentMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormData({ ...formData, role: newRole });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (currentMode === 'register') {
        if (!formData.full_name.trim()) {
          throw new Error(selectedUserType === 'employer' ? "Kontaktpersonens namn är obligatoriskt." : "Fullständigt namn är obligatoriskt.");
        }
        if (selectedUserType === 'employer' && !formData.pharmacy_name.trim()) {
          throw new Error("Apotekets namn är obligatoriskt för apoteksregistrering.");
        }

        if (selectedUserType === 'employer' && !formData.city) {
          throw new Error("Du måste välja en stad för att registrera dig som arbetsgivare.");
        }

        const signUpOptions = {
          data: {
            full_name: formData.full_name.trim(),
            role: formData.role,
            ...(formData.role === 'employer' && { 
                pharmacy_name: formData.pharmacy_name.trim(), 
                city: formData.city,
                organization_number: formData.organization_number.trim() // <-- ADD THIS
            }),
          },
        };
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: signUpOptions,
        });

        if (signUpError) throw signUpError;
        
        if (data.user && !data.session) {
          toast.success('Registrering lyckades! Kontrollera din e-post för att bekräfta ditt konto.');
          navigate('/check-email', { state: { email: formData.email } });
        } else {
          toast.success('Registrering lyckades! Du är nu inloggad.');
          navigate('/dashboard');
        }

      } else { // Login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ett oväntat fel inträffade.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const employeeRoles: { value: UserRole, label: string }[] = [
    { value: 'pharmacist', label: 'Farmaceut' },
    { value: 'egenvårdsrådgivare', label: 'Egenvårdsrådgivare' },
    { value: 'säljare', label: 'Säljare/Kassapersonal' },
  ];

  // If showForgotPassword is true, render the password reset form.
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-100">
           <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} />
        </div>
      </div>
    );
  }

  // Otherwise, render the main login/register component.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-100">
        <div className="flex justify-start">
          <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tillbaka till startsidan
          </Link>
        </div>
        
        <div>
          <h2 className="mt-4 text-center text-2xl sm:text-3xl font-bold text-gray-900">
            {currentMode === 'login' ? 'Logga In' : 'Skapa Konto'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {currentMode === 'login' ? (
              <>
                Ny på Farmispoolen?{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  Skapa ett konto
                </Link>
              </>
            ) : (
              <>
                Har du redan ett konto?{' '}
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                  Logga in
                </Link>
              </>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 sm:p-4 rounded-md" role="alert">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {currentMode === 'register' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Jag registrerar mig som:</label>
              <div className="flex border border-gray-300 rounded-md overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setSelectedUserType('personal')}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium focus:outline-none focus:z-10 focus:ring-2 focus:ring-primary-500 transition-colors ${
                    selectedUserType === 'personal'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Briefcase className="inline h-4 w-4 mr-1.5 align-text-bottom" /> Personal
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserType('employer')}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium focus:outline-none focus:z-10 focus:ring-2 focus:ring-primary-500 transition-colors border-l border-gray-300 ${
                    selectedUserType === 'employer'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Building className="inline h-4 w-4 mr-1.5 align-text-bottom" /> Arbetsgivare
                </button>
              </div>
            </div>
          )}

          {currentMode === 'register' && (
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                {selectedUserType === 'employer' ? 'Kontaktpersonens Namn' : 'Fullständigt Namn'} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input id="full_name" name="full_name" type="text" required value={formData.full_name} onChange={handleInputChange} className="input-field pl-10" placeholder={selectedUserType === 'employer' ? 'Namn på kontaktperson' : 'Ditt fullständiga namn'} />
              </div>
            </div>
          )}

          {currentMode === 'register' && selectedUserType === 'employer' && (
  <>
    {/* --- This is your existing pharmacy name field --- */}
    <div>
      <label htmlFor="pharmacy_name" className="block text-sm font-medium text-gray-700">
        Apoteks/organisations Namn <span className="text-red-500">*</span>
      </label>
      <div className="mt-1 relative">
        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input id="pharmacy_name" name="pharmacy_name" type="text" required={formData.role === 'employer'} value={formData.pharmacy_name} onChange={handleInputChange} className="input-field pl-10" placeholder="Officiellt namn på apoteket" />
      </div>
    </div>

    <div>
        <label htmlFor="organization_number" className="block text-sm font-medium text-gray-700">
            Organisationsnummer <span className="text-gray-500 text-xs">(valfritt)</span>
        </label>
        <div className="mt-1 relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input id="organization_number" name="organization_number" type="text" value={formData.organization_number} onChange={handleInputChange} className="input-field pl-10" placeholder="555555-5555" />
        </div>
    </div>

    {/* --- ADD THE CITY DROPDOWN RIGHT HERE --- */}
    <div>
      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
        Stad <span className="text-red-500">*</span>
      </label>
      <div className="mt-1 relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <select
          id="city"
          name="city"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          required
          className="input-field pl-10"
        >
          <option value="" disabled>-- Välj en stad --</option>
          {swedishCities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>
    </div>
  </>
)}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-post <span className="text-red-500">*</span></label>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange} className="input-field pl-10" placeholder="din.email@example.com" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Lösenord <span className="text-red-500">*</span></label>
                {currentMode === 'login' && (
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm font-medium text-primary-600 hover:text-primary-500">
                        Glömt lösenord?
                    </button>
                )}
            </div>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input id="password" name="password" type="password" autoComplete={currentMode === 'login' ? 'current-password' : 'new-password'} required value={formData.password} onChange={handleInputChange} className="input-field pl-10" placeholder="Minst 6 tecken" minLength={6} />
            </div>
          </div>

          {currentMode === 'register' && selectedUserType === 'personal' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Jag är en: <span className="text-red-500">*</span></label>
              {employeeRoles.map(roleInfo => (
                <label key={roleInfo.value} className="flex items-center p-3 border border-gray-300 rounded-md hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer has-[:checked]:bg-primary-50 has-[:checked]:border-primary-600 has-[:checked]:ring-1 has-[:checked]:ring-primary-600">
                  <input type="radio" name="role" value={roleInfo.value} checked={formData.role === roleInfo.value} onChange={() => handleRoleChange(roleInfo.value)} className="form-radio h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-400" />
                  <span className="ml-3 text-sm text-gray-800">{roleInfo.label}</span>
                </label>
              ))}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full btn btn-primary">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (currentMode === 'login' ? 'Logga In' : 'Skapa Konto')}
          </button>
        </form>
        <style jsx>{`
          .input-field { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm; }
          .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
          .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
        `}</style>
      </div>
    </div>
  );
}