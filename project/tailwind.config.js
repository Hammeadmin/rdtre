// hammeadmin/new-projekt/new-projekt-d3c09ad53be8372598100322f6da2929998ff3b9/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html", // Make sure index.html is scanned by Tailwind
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
       primary: {
          50: '#f0f9f8',
          100: '#d9f2ef',
          200: '#b7e6e2',
          300: '#8dd9d3',
          400: '#62c6c1',
          500: '#4bb8b3',
          DEFAULT: '#3aa9a4',
          600: '#3aa9a4',
          700: '#2f8a85',
          800: '#256c68',
          900: '#1d5350',
          950: '#10302e',
        },
       brandBeige: '#fdfbf7', // A slightly warmer beige
        secondary: {
          50: '#f5f5f4',
          100: '#e7e5e4',
          200: '#d7d2d0',
          300: '#c2b9b5',
          400: '#a69a94',
          500: '#8e7f78',
          DEFAULT: '#786a63',
          600: '#786a63',
          700: '#61544f',
          800: '#4d433f',
          900: '#3c3431',
          950: '#2c2523',
        },
        accent: { // Your existing accent green, seems fine
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#60a561', 500: '#50c878', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d', 950: '#052e16',
        },
        warm: { // Your existing warm ambers, seems fine
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f', 950: '#451a03',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)',
        'modal': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}