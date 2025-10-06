import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Briefcase, Calendar, Eye, ListChecks, MapPin, User } from 'lucide-react';
import type { JobPosting } from '../../types';

// Extend the type to ensure it can hold the applicant's name
interface CompletedPosting extends JobPosting {
    applicant_name?: string | null;
}

interface CompletedPostingsListProps {
    postings: CompletedPosting[];
    onViewDetails: (posting: CompletedPosting) => void;
}

export function CompletedPostingsList({ postings, onViewDetails }: CompletedPostingsListProps) {

    const formatDateRange = (start?: string | null, end?: string | null) => {
        if (!start || !end) return 'Period ej angiven';
        try {
            const startDate = parseISO(start);
            const endDate = parseISO(end);
            if (!isValid(startDate) || !isValid(endDate)) return 'Ogiltiga datum';
            
            // Example of responsive date formatting
            const isSameYear = startDate.getFullYear() === endDate.getFullYear();
            const startFormat = isSameYear ? 'd MMM' : 'd MMM yyyy';
            return `${format(startDate, startFormat, { locale: sv })} - ${format(endDate, 'd MMM yyyy', { locale: sv })}`;
        } catch {
            return 'Datumfel';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Slutförda Uppdrag</h3>
            </div>

            <div className="divide-y divide-gray-200">
                {postings.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <ListChecks className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="font-medium">Inga slutförda uppdrag</p>
                        <p className="text-sm mt-1">När ett tillsatt uppdrag är avslutat visas det här.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {postings.map((posting) => (
                            <li key={posting.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-800">{posting.title}</h4>
                                        <div className="mt-2 space-y-1.5 text-sm text-gray-600">
                                            <p className="flex items-center">
                                                <User size={14} className="mr-2 text-gray-400 flex-shrink-0"/>
                                                Tillsatt av: <strong className="ml-1.5">{posting.applicant_name || 'Okänd'}</strong>
                                            </p>
                                            <p className="flex items-center">
                                                <Calendar size={14} className="mr-2 text-gray-400 flex-shrink-0"/>
                                                Period: <span className="ml-1.5">{formatDateRange(posting.period_start_date, posting.period_end_date)}</span>
                                            </p>
                                            <p className="flex items-center">
                                                <MapPin size={14} className="mr-2 text-gray-400 flex-shrink-0"/>
                                                Plats: <span className="ml-1.5">{posting.location || 'Ej angiven'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 self-end sm:self-center">
                                        <button onClick={() => onViewDetails(posting)} className="btn btn-secondary btn-sm">
                                            <Eye className="h-4 w-4 mr-1.5" /> Visa
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}