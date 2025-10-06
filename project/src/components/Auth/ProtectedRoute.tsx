// src/components/Auth/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  // 1. Wait until the session and profile are finished loading.
  if (loading) {
    // Show a loading indicator while we verify authentication.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // 2. If not authenticated, redirect to the login page.
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If roles are specified, check if the user's role is in the allowed list.
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = profile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      // If the user's role is not allowed, show an access denied message.
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
          </div>
        </div>
      );
    }
  }

  // 4. If all checks pass, render the requested component.
  return children;
}