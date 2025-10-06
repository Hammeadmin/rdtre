// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContractsPage } from './pages/ContractsPage'; // Import the new page
import { ProfilePage } from './pages/ProfilePage';
import { ShiftsPage } from './pages/ShiftsPage';
import { LandingPage } from './pages/LandingPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { Layout } from './components/Layout';
import { Navbar } from './components/Layout/Navbar';
import type { Database } from './types/database';
import IntegritetspolicyPage from './pages/IntegritetspolicyPage';
import PriserPage from './pages/PriserPage';
import MyPayrollPage from './pages/MyPayrollPage';
import ForApotekare from './pages/ForApotekare';
import ForApotek from './pages/ForApotek';
import Kontakt from './pages/Kontakt';
import { EmployerDashboard } from './components/employer/EmployerDashboard';
import ApplicantsPage from './pages/ApplicantsPage';
import PayrollPage from './pages/PayrollPage';
import EmployeeProfilesPage from './pages/EmployeeProfilesPage';
import { MessagesPanel } from './components/Messages/MessagesPanel';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import EmployerDirectoryPage from './pages/EmployerDirectoryPage';
import MySchedulePage from './pages/MySchedulePage';
import { CheckEmailPage } from './pages/CheckEmailPage';
import AvailablePostingsPage from './pages/AvailablePostingsPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { useAuth } from './context/AuthContext';
import IntranetPage from './pages/IntranetPage';
import ForKonsultforetag from './pages/ForKonsultforetag';
import { TermsOfServicePage } from './pages/TermsOfServicePage'; // ADD THIS
import { FaqPage } from './pages/FaqPage'; // ADD THIS

type Profile = Database['public']['Tables']['profiles']['Row'];

function App() {
  const { session, profile, loading } = useAuth();

  const isAdmin = () => profile?.role === 'admin';
  const isStrictlyEmployer = () => profile?.role === 'employer';
  const isEmployee = () => ['pharmacist', 'säljare', 'egenvårdsrådgivare'].includes(profile?.role || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brandBeige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-primary-700">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/for-apotekare" element={<ForApotekare />} />
          <Route path="/for-apotek" element={<ForApotek />} />
          <Route path="/for-konsultforetag" element={<ForKonsultforetag />} />
          <Route path="/privacy" element={<IntegritetspolicyPage />} />
          <Route path="/priser" element={<PriserPage />} />
          <Route path="/kontakt" element={<Kontakt />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} /> {/* ADD THIS ROUTE */}
          <Route path="/faq" element={<FaqPage />} /> {/* ADD THIS ROUTE */}


          {/* --- AUTH ROUTES --- */}
          <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage type="login" />} />
          <Route path="/register" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage type="register" />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          {/* --- PROTECTED ROUTES --- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isAdmin() || isEmployee() ? <DashboardPage /> : <Navigate to="/employer/dashboard" replace />}
              </ProtectedRoute>
            }
          />
          <Route path="/profile/:tab?" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPanel /></ProtectedRoute>} />
          <Route path="/intranet" element={<ProtectedRoute allowedRoles={['employer', 'admin']}><IntranetPage /></ProtectedRoute>} />
         <Route path="/employees" element={<ProtectedRoute allowedRoles={['employer', 'admin', 'pharmacist', 'säljare', 'egenvårdsrådgivare']}><EmployeeProfilesPage /></ProtectedRoute>} />
          
          {/* Employer Routes */}
          <Route path="/employer/dashboard" element={<ProtectedRoute allowedRoles={['employer', 'admin']}><EmployerDashboard /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} /> {/* Add this route */}
          <Route path="/employer/applicants" element={<ProtectedRoute allowedRoles={['employer', 'admin']}><ApplicantsPage /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute allowedRoles={['employer', 'admin']}><PayrollPage /></ProtectedRoute>} />

          {/* Employee Routes */}
          <Route path="/my-payroll" element={<ProtectedRoute allowedRoles={['pharmacist', 'säljare', 'egenvårdsrådgivare', 'admin']}><MyPayrollPage /></ProtectedRoute>} />
          <Route path="/shifts" element={<ProtectedRoute allowedRoles={['pharmacist', 'säljare', 'egenvårdsrådgivare', 'admin']}><ShiftsPage /></ProtectedRoute>} />
          <Route path="/job-postings" element={<ProtectedRoute allowedRoles={['pharmacist', 'säljare', 'egenvårdsrådgivare', 'admin']}><AvailablePostingsPage /></ProtectedRoute>} />
          <Route path="/my-schedule" element={<ProtectedRoute allowedRoles={['pharmacist', 'säljare', 'egenvårdsrådgivare', 'admin']}><MySchedulePage /></ProtectedRoute>} />
          <Route path="/pharmacies" element={<ProtectedRoute allowedRoles={['pharmacist', 'säljare', 'egenvårdsrådgivare', 'admin']}><EmployerDirectoryPage /></ProtectedRoute>} />
          
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;

