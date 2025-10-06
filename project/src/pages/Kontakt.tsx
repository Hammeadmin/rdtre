// src/pages/Kontakt.tsx
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, AlertCircle, HelpCircle, User, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast'; // Added missing import

export default function Kontakt() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{success: boolean; message: string} | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: 'contactForm',
          payload: {
            name: formData.name,
            email: formData.email,
            message: formData.message,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to send message.');
      }

      toast.success('Tack för ditt meddelande! Vi återkommer så snart som möjligt.');
      
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Ett okänt fel uppstod.';
      toast.error(`Kunde inte skicka meddelande: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-brandBeige min-h-screen">
      {/* --- Hero Section --- */}
      <div className="bg-gradient-to-br from-primary-50 via-brandBeige to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Kontakta oss
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Har du frågor, funderingar eller vill du veta mer? Vi finns här för att hjälpa dig.
          </p>
        </div>
      </div>
      
      {/* --- Main Content --- */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column: Information */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-md border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="h-5 w-5 text-primary-600 mr-2" />
                Svar på vanliga frågor
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-gray-700"><strong>För arbetsgivare:</strong> <Link to="/priser" className="text-primary-600 hover:underline">Hur fungerar prissättningen?</Link></p>
                <p className="text-gray-700"><strong>För personal:</strong> <Link to="/for-apotekare" className="text-primary-600 hover:underline">Hur kommer jag igång?</Link></p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border">
               <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600"><Mail /></div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">E-post</h3>
                    <p className="mt-1 text-gray-600 hover:text-primary-600 cursor-pointer">support@farmispoolen.se</p>
                  </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600"><Phone /></div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Telefon</h3>
                  <p className="mt-1 text-gray-600">+46 (0)8-123 45 67</p>
                  <p className="text-sm text-gray-500">Vardagar 09:00 - 17:00</p>
                </div>
              </div>
            </div>
            
          </div>

          {/* Right Column: Contact Form */}
          <div className="bg-white rounded-xl shadow-lg p-8 border">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Skicka ett meddelande</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                <div className="relative">
                   <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                   <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Meddelande</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
                  <textarea id="message" name="message" rows={5} value={formData.message} onChange={handleChange} required className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>
              
              <div>
                <button type="submit" disabled={isSubmitting} className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Skickar...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Skicka meddelande
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
