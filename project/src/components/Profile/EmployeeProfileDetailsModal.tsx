// src/components/Profile/EmployeeProfileDetailsModal.tsx

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    X, Mail, Briefcase, Settings, Award, CheckCircle, XCircle, Info, 
    Building, Calendar, FileText, Phone, UserSquare 
} from 'lucide-react';
import type { EmployeeProfileData, WorkHistoryEntry } from '../../lib/profiles';
import { EmployeeReviewSection } from './EmployeeReviewSection';

interface EmployeeProfileDetailsModalProps {
    profile: EmployeeProfileData | null;
    onClose: () => void;
}

export const EmployeeProfileDetailsModal: React.FC<EmployeeProfileDetailsModalProps> = ({ profile, onClose }) => {
    const [isImageEnlarged, setIsImageEnlarged] = useState(false);

    if (!profile) {
        return null;
    }

    const getPublicUrl = (filePath: string | null, bucket: 'resumes' | 'license-documents') => {
        if (!filePath) return null;
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    };

    const formatMonthYear = (dateStr: string | null | undefined) => {
        if (!dateStr || dateStr.toLowerCase() === 'nuvarande') return 'Nuvarande';
        try {
            const [year, month] = dateStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });
        } catch (error) {
            return dateStr;
        }
    };

    const renderListItem = (label: string, value: React.ReactNode, icon?: React.ReactNode) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }
        return (
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                <dt className="text-sm font-medium text-gray-500 flex items-center">{icon}{label}</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value}</dd>
            </div>
        );
    };

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'N A')}&background=random&color=fff`;

    return (
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] transition-opacity duration-300 ease-in-out"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center flex-wrap gap-2">
                            <img 
                                src={profile.profile_picture_url || defaultAvatar}
                                onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
                                alt={profile.full_name || 'Profil'}
                                className="h-10 w-10 rounded-full object-cover mr-3 border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setIsImageEnlarged(true)}
                            />
                            {profile.full_name}
                            <span className="text-sm font-medium capitalize px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{profile.role}</span>
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 -mr-1" aria-label="Stäng">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
                        <dl className="divide-y divide-gray-200">
                            
                            {renderListItem('Sammanfattning', <p className="text-gray-800 whitespace-pre-wrap">{profile.description}</p>, <Info size={14} className="text-gray-400 mr-2" />)}
                            
                            <div className="py-4 sm:py-5">
                                <dt className="text-sm font-medium text-gray-500 flex items-center">
                                    <UserSquare size={14} className="text-gray-400 mr-2" />
                                    Kontakt & Rollinformation
                                </dt>
                                <dd className="mt-2 text-sm text-gray-900 sm:mt-1 sm:col-span-2 space-y-2">
                                    {profile.phone_number && (
                                        <div className="flex items-center">
                                            <Phone size={13} className="text-gray-400 mr-2.5 flex-shrink-0" />
                                            <span>{profile.phone_number}</span>
                                        </div>
                                    )}
                                    {profile.email && (
                                        <div className="flex items-center">
                                            <Mail size={13} className="text-gray-400 mr-2.5 flex-shrink-0" />
                                            <span>{profile.email}</span>
                                        </div>
                                    )}
                                    {profile.role === 'pharmacist' && profile.pharmacist_type && (
                                        <div className="flex items-center">
                                        <Award size={13} className="text-gray-400 mr-2.5 flex-shrink-0" />
                                        <span className="capitalize">{profile.pharmacist_type}</span>
                                    </div>
                                    )}
                                </dd>
                            </div>

                            {(profile.work_history && profile.work_history.length > 0) && (
                                <div className="py-4 sm:py-5">
                                    <dt className="text-sm font-medium text-gray-500 flex items-center mb-3">
                                        <Briefcase size={14} className="text-gray-400 mr-2" />
                                        Arbetshistorik
                                    </dt>
                                    <dd className="mt-1 text-sm sm:mt-0 space-y-4">
                                        {profile.work_history.map((job, index) => (
                                            <div key={index} className="flex gap-4">
                                                <div className="mt-1 flex-shrink-0">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                                        <Building className="h-5 w-5 text-gray-500" />
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{job.title}</p>
                                                    <p className="text-gray-700">{job.company}</p>
                                                    <p className="text-xs text-gray-500 flex items-center mt-1">
                                                        <Calendar size={12} className="mr-1.5" />
                                                        {formatMonthYear(job.start_date)} – {formatMonthYear(job.end_date)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </dd>
                                </div>
                            )}

                            {renderListItem('Systemkännedom', <div className="flex flex-wrap gap-2">{profile.systems?.map((item, index) => <span key={index} className="tag-style">{item}</span>)}</div>, <Settings size={14} className="text-gray-400 mr-2" />)}
                            
                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                                <dt className="text-sm font-medium text-gray-500 flex items-center">
                                    <Award size={14} className="text-gray-400 mr-2" /> Dokument & Verifiering
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 space-y-3">
                                    {profile.resume_url ? (
                                        <a
                                            href={getPublicUrl(profile.resume_url, 'resumes') || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-outline w-full sm:w-auto"
                                        >
                                            <FileText size={16} className="mr-2" />
                                            Visa CV
                                        </a>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">Inget CV uppladdat.</p>
                                    )}
                                    {profile.role === 'pharmacist' && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.license_verified ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {profile.license_verified ? <CheckCircle size={14} className="-ml-0.5 mr-1.5" /> : <XCircle size={14} className="-ml-0.5 mr-1.5" />}
                                            Licens {profile.license_verified ? 'Verifierad' : 'Ej verifierad'}
                                        </span>
                                    )}
                                </dd>
                            </div>
                           <EmployeeReviewSection employeeId={profile.id} />
                        </dl>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end items-center px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0 gap-2">
                        <button onClick={onClose} type="button" className="btn btn-secondary w-full sm:w-auto">
                            Stäng
                        </button>
                    </div>
                </div>
            </div>

            {isImageEnlarged && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1100] cursor-pointer animate-fade-in"
                    onClick={() => setIsImageEnlarged(false)}
                >
                    <button
                        onClick={() => setIsImageEnlarged(false)}
                        className="absolute top-4 right-6 text-white text-4xl font-light hover:text-gray-300 transition-colors"
                        aria-label="Stäng förstorad bild"
                    >
                        &times;
                    </button>
                    <img
                        src={profile.profile_picture_url || defaultAvatar}
                        alt={`Förstorad profilbild för ${profile.full_name}`}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            
            <style jsx global>{`
                .tag-style { @apply inline-block bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full; }
                .btn { @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150; }
                .btn-secondary { @apply text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500; }
                .btn-outline { @apply text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 focus:ring-blue-500; }
                
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </>
    );
};