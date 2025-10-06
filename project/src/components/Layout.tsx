import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { ScrollToTop } from './UI/ScrollToTop';
import { Footer } from './Layout/Footer';


export const Layout = () => {
  const { session, profile } = useAuth();

  return (
    <div className="min-h-screen bg-brandBeige">
      <ScrollToTop /> {/* Ensures navigation scrolls to top */}
      <Navbar session={session} profile={profile} />
      <main>
        <Outlet /> {/* Renders the current page's content */}
      </main>
      <Footer />
    </div>
  );
};
