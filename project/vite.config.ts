import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Define the Content Security Policy string once to ensure consistency
const contentSecurityPolicy =
  "default-src 'self' https://*.supabase.co wss://*.supabase.co; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  // Allow images from Google domains, including the Embed API and general Google APIs
  "img-src 'self' data: https: https://*.googleapis.com https://www.google.com/maps/search/?api=1&query=... https://*.google.com; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  // Allow connections to Google APIs
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://www.google.com/maps/search/?api=1&query=... https://*.google.com; " +
  // Specifically allow iframes from the Google Maps Embed API domain (googleusercontent.com) and your own domain ('self')
  "frame-src 'self' https://www.google.com/maps/search/?api=1&query=... blob:;";

export default defineConfig({
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    open: true,
    headers: {
      'Content-Security-Policy': contentSecurityPolicy
    }
  },
  preview: {
    port: 3000,
    host: true,
    // Apply the same CSP to the preview server headers
    headers: {
      'Content-Security-Policy': contentSecurityPolicy
    }
  }
});
