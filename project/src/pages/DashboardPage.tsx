// src/pages/DashboardPage.tsx
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from '../components/Dashboard/AdminDashboard';
import { EmployeeDashboard } from '../components/Dashboard/EmployeeDashboard'; // <-- UPDATED IMPORT
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
  const { profile, loading } = useAuth();

  // Show a full-page loading indicator while fetching the user's profile
  if (loading || !profile) {
    return (
      <div className="min-h-[calc(100vh-150px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-500">Laddar din översikt...</p>
        </div>
      </div>
    );
  }

  // This function selects the correct dashboard component based on the user's role
  const renderDashboardByRole = () => {
    const userRole = profile.role;

    if (userRole === 'admin') {
      return <AdminDashboard />;
    }

    // --- UPDATED LOGIC ---
    // All three employee roles will now render the same component.
    // The specific content will be handled inside EmployeeDashboard.
    if (userRole === 'pharmacist' || userRole === 'säljare' || userRole === 'egenvårdsrådgivare') {
      return <EmployeeDashboard />;
    }

    // Fallback for any other roles or unexpected states
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg">
        Okänd användarroll. Kontakta support om detta är ett misstag.
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {renderDashboardByRole()}
    </div>
  );
}
