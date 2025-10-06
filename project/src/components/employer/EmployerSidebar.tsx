import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
    LayoutDashboard, 
    Users as ApplicantsIcon, 
    User as ProfilesIcon, 
    FileText, 
    History, 
    Briefcase, 
    CalendarPlus,
    MessageCircle,
    Settings,
    Edit
} from 'lucide-react';

// This is your new logo import
import farmispoolenLogo from '/assets/farmispoolenLogo2.png';

type EmployerDashboardTab = 'overview' | 'postings' | 'schedule' | 'completed' | 'contracts';

interface EmployerSidebarProps {
    activeTab: EmployerDashboardTab;
    onTabChange: (tab: EmployerDashboardTab) => void;
    appliedCount?: number;
}

const EmployerSidebar: React.FC<EmployerSidebarProps> = ({
    activeTab,
    onTabChange,
    appliedCount = 0
}) => {
    const location = useLocation();

    // This is the single, cleaner function for styling all navigation items.
    const getNavItemClassName = (isActive: boolean) => {
      return `flex items-center space-x-3 w-full text-left py-2.5 px-3 rounded-lg transition-colors duration-200 text-sm ${
        isActive
          ? 'bg-primary-600 text-white font-semibold shadow-inner' 
          : 'text-primary-200 hover:bg-primary-700 hover:text-white'
      }`;
    };
    
    // We define the navigation structure here to make the code below cleaner.
    const navSections = [
      {
        title: 'Huvudmeny',
        items: [
          { type: 'tab', id: 'overview', icon: LayoutDashboard, label: 'Passöversikt' },
          { type: 'tab', id: 'postings', icon: Briefcase, label: 'Uppdrag' },
          { type: 'tab', id: 'schedule', icon: CalendarPlus, label: 'Skapa Schema' },
          { type: 'tab', id: 'completed', icon: History, label: 'Historik' },
        ],
      },
      {
        title: 'Hantering',
        items: [
          { type: 'link', path: '/employer/applicants', icon: ApplicantsIcon, label: 'Sökande', count: appliedCount },
          { type: 'link', path: '/employees', icon: ProfilesIcon, label: 'Personalprofiler' },
          { type: 'link', path: '/payroll', icon: FileText, label: 'Lönehantering' },
          { type: 'link', path: '/messages', icon: MessageCircle, label: 'Meddelanden' },
          { type: 'link', path: '/intranet', icon: Edit, label: 'Intranät' },
          { type: 'tab', id: 'contracts', icon: FileText, label: 'Avtal & Kontrakt' },
        ],
      },
      {
        title: 'Konto',
        items: [
          { type: 'link', path: '/profile', icon: ProfilesIcon, label: 'Min Profil' },
          { type: 'link', path: '/profile/settings', icon: Settings, label: 'Inställningar' },
        ],
      },
    ];

    return (
        <div className="w-64 min-h-screen bg-primary-800 text-primary-100 p-4 flex flex-col flex-shrink-0">
            {/* Cleaner Header */}
            <div className="flex items-center mb-6 px-2 py-2">
                <img src={farmispoolenLogo} alt="Farmispoolen Logo" className="h-8 w-auto" />
            </div>
            
            {/* Cleaner Nav Section */}
            <nav className="flex-grow">
              {navSections.map((section, sectionIndex) => (
                <div key={section.title} className={sectionIndex > 0 ? "pt-4 mt-4 border-t border-primary-700/60" : ""}>
                  <h3 className="px-3 mb-2 text-xs font-semibold text-primary-400 uppercase tracking-wider">{section.title}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.label}>
                        {item.type === 'tab' ? (
                          <button onClick={() => onTabChange(item.id as EmployerDashboardTab)} className={getNavItemClassName(activeTab === item.id)}>
                            <item.icon size={18} />
                            <span>{item.label}</span>
                          </button>
                        ) : (
                          <Link to={item.path!} className={getNavItemClassName(location.pathname.startsWith(item.path!))}>
                            <item.icon size={18} />
                            <span>{item.label}</span>
                            {item.count! > 0 && (
                              <span className="ml-auto px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{item.count}</span>
                            )}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            
            <div className="mt-auto pt-4 border-t border-primary-700/80 text-xs text-primary-300 px-3">
                <p>&copy; {new Date().getFullYear()} Farmispoolen</p>
            </div>
        </div>
    );
};

export default EmployerSidebar;