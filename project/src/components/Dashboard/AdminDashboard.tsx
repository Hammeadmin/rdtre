// src/components/Dashboard/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust path if needed
import { toast } from 'react-hot-toast';
import {
    Shield,
    Users,
    Building2,
    Calendar,
    BarChart2,
    UserCog,
    Plus,
    FileText,
    Loader2,
    Info,
    Briefcase // Added for Job Postings
} from 'lucide-react';

import { AnalyticsPanel } from '../Analytics/AnalyticsPanel'; // Adjust path
import { UserManagement } from '../Admin/UserManagement'; // Adjust path
import { AdminShiftCreation } from '../Admin/AdminShiftCreation'; // Adjust path
import { AdminCreatePostingForm } from '../Admin/AdminCreatePostingForm'; // Import the new form

// Updated specific types for analytics data
interface MonthlyShiftStat {
  month: string;
  total_shifts: number;
  filled_shifts: number;
}

interface ApplicationTrendStat {
  date: string;
  applications: number;
}

interface AdminAnalyticsData {
    monthlyStats: MonthlyShiftStat[];
    applicationStats: ApplicationTrendStat[];
}

export function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'create-items' | 'reports'>('overview'); // Renamed 'create-shift' to 'create-items'
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalEmployers: 0,
        totalPharmacists: 0,
        totalSaljare: 0,
        totalEgenvardsradgivare: 0,
        totalShifts: 0,
        // Add totalJobPostings if you want to display it
    });
    const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsData>({
        monthlyStats: [],
        applicationStats: [],
    });
    const [loading, setLoading] = useState(true);
    const [showAdminCreatePostingForm, setShowAdminCreatePostingForm] = useState(false);


    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const { count: totalUsersCount, error: usersError } = await supabase
                    .from('profiles').select('*', { count: 'exact', head: true });
                if (usersError) throw new Error(`Användare: ${usersError.message}`);

                const { count: totalEmployersCount, error: employersError } = await supabase
                    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employer');
                if (employersError) throw new Error(`Arbetsgivare: ${employersError.message}`);

                const { count: totalPharmacistsCount, error: pharmacistsError } = await supabase
                    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pharmacist');
                if (pharmacistsError) throw new Error(`Farmaceuter: ${pharmacistsError.message}`);
                
                const { count: totalSaljareCount, error: saljareError } = await supabase
                    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'säljare');
                if (saljareError) throw new Error(`Säljare: ${saljareError.message}`);

                const { count: totalEgenvardsradgivareCount, error: egenvardsError } = await supabase
                    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'egenvårdsrådgivare');
                if (egenvardsError) throw new Error(`Egenvårdsrådgivare: ${egenvardsError.message}`);

                const { count: totalShiftsCount, error: shiftsError } = await supabase
                    .from('shift_needs').select('*', { count: 'exact', head: true });
                if (shiftsError) throw new Error(`Pass: ${shiftsError.message}`);
                
                // Optionally, fetch total job postings count
                // const { count: totalJobPostingsCount, error: postingsError } = await supabase
                // .from('job_postings').select('*', { count: 'exact', head: true });
                // if (postingsError) throw new Error(`Jobbannonser: ${postingsError.message}`);


                setStats({
                    totalUsers: totalUsersCount || 0,
                    totalEmployers: totalEmployersCount || 0,
                    totalPharmacists: totalPharmacistsCount || 0,
                    totalSaljare: totalSaljareCount || 0,
                    totalEgenvardsradgivare: totalEgenvardsradgivareCount || 0,
                    totalShifts: totalShiftsCount || 0,
                    // totalJobPostings: totalJobPostingsCount || 0,
                });

                const { data: monthlyData, error: monthlyError } = await supabase.rpc('get_admin_monthly_shift_stats');
                if (monthlyError) throw new Error(`Månadsstatistik: ${monthlyError.message}`);
                
                const { data: appData, error: appError } = await supabase.rpc('get_admin_application_trends');
                if (appError) throw new Error(`Ansökningstrender: ${appError.message}`);
                
                setAnalyticsData({
                    monthlyStats: (monthlyData as MonthlyShiftStat[] || []),
                    applicationStats: (appData as ApplicationTrendStat[] || []),
                });

            } catch (error) {
                console.error('Error fetching admin dashboard data:', error);
                toast.error(error instanceof Error ? error.message : "Failed to load admin dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        if (activeTab === 'overview') {
            fetchDashboardData();
        } else {
            setLoading(false); 
        }
    }, [activeTab]);
    
    const handlePostingCreatedAdmin = () => {
        setShowAdminCreatePostingForm(false);
        toast.success("Jobbannons skapad av admin!");
        // Optionally re-fetch stats if you add totalJobPostings to stats
        // if (activeTab === 'overview') fetchDashboardData(); 
    };


    const GranularReportsPlaceholder: React.FC = () => (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Avancerad Analys & Rapportering</h3>
            <p className="text-gray-600 mb-2">
                Denna sektion kan utökas för att inkludera mer detaljerade rapporter och analyser, såsom:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-4">
                <li>Tillsättningsgrad för pass (per apotek, per roll, över tid).</li>
                <li>Arbetsgivares annonseringsfrekvens och framgångsgrad.</li>
                <li>Trender för användarregistrering och rollfördelning.</li>
                <li>Systemloggar för viktiga åtgärder (kräver backend-loggning).</li>
            </ul>
            <p className="text-gray-600">
                Implementering av dessa skulle vanligtvis innebära mer komplexa SQL-frågor, potentiellt nya databasvyer eller tabeller för aggregerad data,
                och dedikerade diagramkomponenter.
            </p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                    <Info size={16} className="inline mr-2" />
                    <strong>Utvecklarnotering:</strong> Backend-utveckling skulle krävas för att skapa nödvändiga datakällor och API:er för dessa avancerade rapporter.
                </p>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-brandBeige">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-card border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">Admin Översikt</h1>
                <Shield className="h-8 w-8 text-primary-600" />
            </div>

            <div className="mb-8 bg-white p-4 rounded-lg shadow-card border border-gray-100">
                <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2">
                    {[
                        { id: 'overview', label: 'Översikt', icon: BarChart2 },
                        { id: 'users', label: 'Användarhantering', icon: UserCog },
                        { id: 'create-items', label: 'Skapa Innehåll', icon: Plus }, // Changed label
                        { id: 'reports', label: 'Rapporter', icon: FileText }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'overview' | 'users' | 'create-items' | 'reports')}
                            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center
                                ${activeTab === tab.id ? 'bg-primary-100 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        >
                            <tab.icon className="h-5 w-5 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {loading && activeTab === 'overview' && (
                 <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /> <span className="ml-2">Laddar översikt...</span></div>
            )}

            {activeTab === 'overview' && !loading && (
                <>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
                        <div className="bg-white overflow-hidden shadow-card rounded-lg p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-primary-100 rounded-full p-3"><Users className="h-6 w-6 text-primary-600" /></div>
                                <div className="ml-4">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Totala Användare</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</dd>
                                </div>
                            </div>
                        </div>
                         <div className="bg-white overflow-hidden shadow-card rounded-lg p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-accent-100 rounded-full p-3"><Building2 className="h-6 w-6 text-accent-600" /></div>
                                <div className="ml-4">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Arbetsgivare</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalEmployers}</dd>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow-card rounded-lg p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-secondary-100 rounded-full p-3"><Users className="h-6 w-6 text-secondary-600" /></div>
                                <div className="ml-4">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Farmaceuter</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalPharmacists}</dd>
                                </div>
                            </div>
                        </div>
                         <div className="bg-white overflow-hidden shadow-card rounded-lg p-5">
                             <div className="flex items-center">
                                <div className="flex-shrink-0 bg-warm-100 rounded-full p-3"><Users className="h-6 w-6 text-warm-600" /></div>
                                <div className="ml-4">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Säljare</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalSaljare}</dd>
                                </div>
                            </div>
                        </div>
                         <div className="bg-white overflow-hidden shadow-card rounded-lg p-5">
                             <div className="flex items-center">
                                <div className="flex-shrink-0 bg-accent-100 rounded-full p-3"><Users className="h-6 w-6 text-accent-600" /></div>
                                <div className="ml-4">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Egenvårdsrådgivare</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalEgenvardsradgivare}</dd>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow-card rounded-lg p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-warm-100 rounded-full p-3"><Calendar className="h-6 w-6 text-warm-600" /></div>
                                <div className="ml-4">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Totala Pass</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalShifts}</dd>
                                </div>
                            </div>
                        </div>
                        {/* Placeholder for Total Job Postings if added to stats
                        <div className="bg-white overflow-hidden shadow-card rounded-lg p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-purple-100 rounded-full p-3"><Briefcase className="h-6 w-6 text-purple-600" /></div>
                                <div className="ml-4">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Totala Jobbannonser</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalJobPostings}</dd>
                                </div>
                            </div>
                        </div>
                        */}
                    </div>
                    <div className="mb-8">
                        <AnalyticsPanel data={analyticsData} />
                    </div>
                </>
            )}

            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'create-items' && (
                <div className="space-y-8">
                    <AdminShiftCreation />
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Skapa Jobbannons (Admin)</h3>
                        <p className="text-gray-600 mb-4">Här kan du som administratör skapa en ny jobbannons åt en specifik arbetsgivare.</p>
                        <button 
                            onClick={() => setShowAdminCreatePostingForm(true)} 
                            className="btn btn-primary inline-flex items-center"
                        >
                           <Briefcase className="mr-2 h-5 w-5" /> Skapa Ny Jobbannons
                        </button>
                    </div>
                </div>
            )}
            {activeTab === 'reports' && <GranularReportsPlaceholder />}
            
            {showAdminCreatePostingForm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]"> {/* Ensure z-index is high enough */}
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                    <AdminCreatePostingForm 
                      onSuccess={handlePostingCreatedAdmin} 
                      onClose={() => setShowAdminCreatePostingForm(false)} 
                    />
                  </div>
                </div>
            )}
            
            <style jsx global>{`
                .shadow-card { @apply shadow-sm; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
                .btn-secondary { @apply border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-primary { @apply border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500; }
                .btn-sm { @apply px-3 py-1.5 text-xs; }
            `}</style>
        </div>
    );
}

export default AdminDashboard;