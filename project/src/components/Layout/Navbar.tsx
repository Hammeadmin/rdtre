// src/components/Layout/Navbar.tsx
import React, {  useState, useEffect, useCallback, useRef } from 'react'; // Removed Fragment as it's not used directly
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Pill, User, LogOut, Users, CalendarIcon, Home, Calendar, MessageCircle, Info, Briefcase, Phone, Users as ApplicantsIcon, Building2, DollarSign,
  FileText, Menu as MenuIcon, X as XIcon, ChevronDown, Settings, Newspaper, BarChart2, UserCog, Plus // Added Settings, BarChart2, UserCog, Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { UserRole } from '../../types';
import { NotificationBell } from '../Notifications/NotificationBell';

const newHeaderLogo = '/assets/newHeaderLogo.png'

type Profile = Database['public']['Tables']['profiles']['Row'];

interface NavbarProps {
  session: any;
  profile: Profile | null;
}

const employeeRoles: UserRole[] = ['pharmacist', 'säljare', 'egenvårdsrådgivare'];

export function Navbar({ session, profile }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!session;
  const userType = profile?.role as UserRole | undefined;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase.rpc('get_total_unread_messages_count', {
        p_user_id: profile.id
      });
      if (error) throw error;
      setUnreadMessages(data || 0);
    } catch (error) {
      console.error("Error fetching unread message count:", error);
    }
  }, [profile?.id]);

  // --- ADD THIS USEEFFECT TO FETCH AND SUBSCRIBE ---
  useEffect(() => {
    // Fetch the count initially when the component loads
    fetchUnreadCount();

    // Set up a real-time listener for new messages
    const messageChannel = supabase
      .channel(`new_messages_for_${profile?.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // When a new message comes in, just refetch the count.
          // We add a small delay to ensure the database has fully updated.
          setTimeout(fetchUnreadCount, 500);
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [profile?.id, fetchUnreadCount]);

  // --- Navigation Item Definitions ---
  const employerNavItems = [
    { path: '/employer/dashboard', icon: Home, label: 'Översikt', description: 'Hantera pass och schema' },
    { path: '/employer/applicants', icon: ApplicantsIcon, label: 'Sökande', description: 'Hantera ansökningar' },
        { 
      path: '/messages', 
      icon: MessageCircle, 
      label: (
        <span className="flex items-center justify-between w-full">
          Meddelanden
          {unreadMessages > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadMessages}
            </span>
          )}
        </span>
      ), 
      description: 'Kommunicera med personal' 
    },
    { path: '/payroll', icon: FileText, label: 'Lönehantering', description: 'Hantera löner och utbetalningar' }, // Employer sees their payroll
    { path: '/profile', icon: User, label: 'Profil', description: 'Hantera din profil' },
    { path: '/intranet', icon: Newspaper, label: 'Intranät', description: 'Företagsnyheter och info' },
  ];

  const employeeNavItems = [
    { path: '/dashboard', icon: Home, label: 'Översikt', description: 'Din personliga dashboard' },
    { path: '/my-schedule', icon: CalendarIcon, label: 'Mitt schema', description: 'Se ditt personliga schema' },
    { path: '/shifts', icon: Calendar, label: 'Tillgängliga pass', description: 'Hitta och ansök om pass' },
     { path: '/job-postings', icon: Briefcase, label: 'Uppdrag', description: 'Konsult / Längre uppdrag' },
    { path: '/pharmacies', icon: Building2, label: 'Arbetsgivare', description: 'Utforska arbetsgivare' },
    { 
      path: '/messages', 
      icon: MessageCircle, 
      label: (
        <span className="flex items-center justify-between w-full">
          Meddelanden
          {unreadMessages > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadMessages}
            </span>
          )}
        </span>
      ), 
      description: 'Kommunicera med personal' 
    },
    { path: '/my-payroll', icon: FileText, label: 'Min lön', description: 'Se din lönehistorik' },
    { path: '/profile/profile', icon: User, label: 'Profil', description: 'Hantera din profil' },
    { path: '/profile/settings', icon: Settings, label: 'Inställningar', description: 'Hantera konto & notiser' },
    { path: '/employees', icon: ApplicantsIcon, label: 'Kollegor', description: 'Se andra anställda i nätverket' },
  ];
  
  const adminNavItems = [
    { path: '/dashboard', icon: BarChart2, label: 'Admin Dashboard', description: 'Systemöversikt och statistik' },
     { path: '/intranet', icon: Newspaper, label: 'Intranät', description: 'Skapa och hantera inlägg' },
    // Links from AdminDashboard tabs can be added here if you make them separate routes
    // For now, admin accesses these via the AdminDashboard's internal tabs:
    // { path: '/admin/users', icon: UserCog, label: 'User Management', description: 'Hantera alla användare' },
    // { path: '/admin/create-shift-admin', icon: Plus, label: 'Skapa Pass (Admin)', description: 'Skapa pass åt arbetsgivare'},
    // { path: '/admin/reports', icon: FileText, label: 'Systemrapporter', description: 'Se systemövergripande rapporter'},
    
    { path: '/payroll', icon: FileText, label: 'Lönehantering (Admin)', description: 'Full tillgång till lönesystemet' },
    { path: '/my-payroll', icon: FileText, label: 'Visa "Min Lön" (Test)', description: 'Se lönesidan som anställd' },
    { path: '/shifts', icon: Calendar, label: 'Se tillgängliga pass', description: 'Se publika pass (som anställd)' },
    { path: '/job-postings', icon: Briefcase, label: 'Konsult / Längre uppdrag', description: 'Se publika uppdrag' },
    { path: '/employer/dashboard', icon: Building2, label: 'Arbetsgivarvy', description: 'Åtkomst till arbetsgivarfunktioner' },
    { path: '/messages', icon: MessageCircle, label: 'Meddelanden', description: 'Kommunikation' },
    { path: '/profile', icon: User, label: 'Min adminprofil', description: 'Hantera ditt adminkonto' },
    // { path: '/settings', icon: Settings, label: 'Systeminställningar', description: 'Konfigurera systemet' }, // Add if you have an admin settings page
  ];

  const publicNavItems = [
    
    { path: '/for-apotekare', icon: Briefcase, label: 'För personal', description: 'Information för personal' },
    { path: '/for-apotek', icon: Building2, label: 'För apotek', description: 'Information för arbetsgivare' },
    { path: '/for-konsultforetag', icon: Users, label: 'För konsultföretag', description: 'Lösningar för konsultbolag' },
    { path: '/priser', icon: DollarSign, label: 'Priser', description: 'Se våra priser och planer' },
    { path: '/about', icon: Info, label: 'Om oss', description: 'Lär känna Farmispoolen' },
    { path: '/kontakt', icon: Phone, label: 'Kontakt', description: 'Kontakta oss' },
  ];

  let currentNavItems = publicNavItems;
  if (isAuthenticated) {
    if (userType === 'admin') { // Admin gets their specific menu
      currentNavItems = adminNavItems;
    } else if (userType === 'employer') {
      currentNavItems = employerNavItems;
    } else if (userType && employeeRoles.includes(userType)) {
      currentNavItems = employeeNavItems;
    }
    // If there are other roles, they would default to publicNavItems unless handled
  }

  const handleLogout = async () => {
    setIsMainMenuOpen(false); // Close dropdown on logout
    setIsMobileMenuOpen(false); // Close mobile menu on logout
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
    navigate('/login'); // Navigate to login after sign out
  };

  const toggleMainMenu = () => {
    setIsMainMenuOpen(!isMainMenuOpen);
  };
  
  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mainMenuRef.current && !mainMenuRef.current.contains(event.target as Node)) {
        setIsMainMenuOpen(false);
      }
    };
    if (isMainMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMainMenuOpen]);

  // Close dropdown on navigation
  useEffect(() => {
    setIsMainMenuOpen(false);
    setIsMobileMenuOpen(false); // Also close mobile menu on navigation
  }, [location.pathname]);


  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
  <img src={newHeaderLogo} alt="Farmispoolen" className="h-8 w-auto mr-2" /> {/* Adjust h-8 and w-auto as needed */}
  <span className="text-xl font-bold text-primary-700 font-display">Farmispoolen</span>
</Link>
          </div>

          {/* Center Area: Main Menu Dropdown Trigger (Desktop) */}
          {isAuthenticated && (
            <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end hidden md:flex">
              <div className="relative" ref={mainMenuRef}>
                <button
                  type="button"
                  onClick={toggleMainMenu}
                  // UPDATED: Use theme colors for button, e.g., secondary or a light primary variant
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-primary-700 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  aria-expanded={isMainMenuOpen}
                  aria-haspopup="true"
                >
                  <MenuIcon className="h-5 w-5 mr-2 text-primary-600" /> {/* UPDATED icon color */}
                  Meny
                  <ChevronDown className="h-5 w-5 ml-2 -mr-1 text-gray-400" />
                </button>

                {isMainMenuOpen && (
                  <div
                    className="origin-top-right absolute right-0 md:left-0 mt-2 w-72 rounded-lg shadow-modal bg-white ring-1 ring-black ring-opacity-5 focus:outline-none py-2 divide-y divide-gray-100 max-h-[80vh] overflow-y-auto"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="main-menu-button"
                  >
                    {currentNavItems.map((item, index) => (
                      <div key={item.path + '-' + userType + '-' + index} className={`px-1 py-1`} role="none">
                        <Link
                          to={item.path}
                          onClick={() => setIsMainMenuOpen(false)}
                          className={`flex flex-col px-4 py-3 rounded-md transition-colors duration-150 ease-in-out w-full
                            ${location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/') 
                              ? 'bg-primary-50 border-l-4 border-primary-600' // Active state uses primary
                              : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700 border-l-4 border-transparent' // Hover uses primary shades
                            }
                          `}
                        >
                          <div className="flex items-center">
                            <item.icon className={`h-5 w-5 mr-3 flex-shrink-0 ${location.pathname.startsWith(item.path) ? 'text-primary-600' : 'text-gray-500'}`} />
                            <span className={`font-medium ${location.pathname.startsWith(item.path) ? 'text-primary-600' : 'text-gray-800'}`}>{item.label}</span>
                          </div>
                          {item.description && (
                            <span className="text-xs text-gray-500 mt-1 ml-8">{item.description}</span>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="hidden md:flex md:ml-6 md:space-x-4 lg:space-x-6 xl:space-x-8 items-center">
                {publicNavItems.slice(0, 5).map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
                            ${location.pathname === item.path
                                ? 'text-primary-600 font-semibold' // Active uses primary
                                : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50' // Hover uses primary
                            }`}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>
          )}

          {/* Right side items */}
          <div className={`flex items-center ${isAuthenticated ? 'ml-auto pl-4' : 'md:ml-auto'} space-x-2`}>
            {isAuthenticated && profile && (
              <div className="hidden sm:flex items-center mr-2">
                <span className="text-sm text-primary-700 mr-2">Hej, {profile.full_name?.split(' ')[0] || 'Användare'}</span> {/* UPDATED text color */}
                {profile.profile_picture_url ? (
                  <img 
                    src={profile.profile_picture_url} 
                    alt={profile.full_name || 'Profilbild'} 
                    className="h-8 w-8 rounded-full object-cover border-2 border-primary-200" /* UPDATED border */
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600"> {/* Uses primary */}
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            )}
            
            {isAuthenticated && (
             <Link
    to="/messages"
    className="hidden md:flex relative p-2 text-primary-600 hover:text-primary-700 rounded-full hover:bg-primary-50 transition-colors"
    title="Meddelanden"
  >
    <MessageCircle className="h-6 w-6" />
    {unreadMessages > 0 && (
      <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
    )}
  </Link>
            )}

            {isAuthenticated && (
              <div className="hidden md:block"> 
                <NotificationBell />
              </div>
            )}
            
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                title="Logga ut"
              >
                <LogOut className="h-6 w-6" />
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors" // Uses primary
              >
                Logga in
              </Link>
            )}
            
            <div className="md:hidden flex items-center">
                {isAuthenticated && <NotificationBell />} 
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="ml-2 p-2 text-gray-500 hover:text-primary-600 focus:outline-none" /* UPDATED hover */
                  aria-controls="mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  <span className="sr-only">Öppna huvudmenyn</span>
                  {isMobileMenuOpen ? (
                    <XIcon className="h-6 w-6" />
                  ) : (
                    <MenuIcon className="h-6 w-6" />
                  )}
                </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900 bg-opacity-75 md:hidden" id="mobile-menu">
          <div className="bg-white h-full w-full max-w-sm overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center">
    <img src={newHeaderLogo} alt="Farmispoolen" className="h-8 w-auto mr-2" /> {/* Adjust classes as needed */}
    <span className="ml-2 text-xl font-bold text-primary-700">FarmisPoolen</span>
</div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-500 hover:text-primary-700" /* UPDATED */
              >
                <span className="sr-only">Stäng menyn</span>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {currentNavItems.map((item) => (
                <Link
                  key={item.path + '-mobile-' + userType}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-base font-medium rounded-md transition-colors duration-150 ease-in-out w-full
                    ${location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/') 
                      ? 'text-primary-600 bg-primary-50 font-semibold' // Active uses primary
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600' // Hover uses primary
                    }
                  `}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            
            <div className="border-t border-gray-200 p-4">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logga ut
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors" // Uses primary
                >
                  Logga in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
