// src/pages/CheckEmailPage.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck } from 'lucide-react';

export function CheckEmailPage() {
  const location = useLocation();
  const email = location.state?.email || 'your email address';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-xl text-center border border-gray-200">
        <MailCheck className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900">
          Kontrollera din e-post
        </h2>
        <p className="mt-2 text-gray-600">
          Vi har skickat ett verifieringsmeddelande till <strong className="font-medium text-gray-800">{email}</strong>.
        </p>
        <p className="mt-2 text-gray-600">
          Klicka på länken i meddelandet för att slutföra din registrering och aktivera ditt konto.
        </p>
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Har du inte fått något meddelande? Kontrollera din skräppost eller{' '}
            <button
              onClick={() => {
                // Add logic to resend confirmation email if needed
                alert('Funktion för att skicka igen är inte implementerad än.');
              }}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              skicka igen
            </button>.
          </p>
        </div>
        <div className="mt-6">
          <Link
            to="/login"
            className="w-full btn btn-primary"
          >
            Tillbaka till Logga In
          </Link>
        </div>
        <style jsx>{`
            .btn { @apply inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ease-in-out; }
            .btn-primary { @apply border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500; }
        `}</style>
      </div>
    </div>
  );
}