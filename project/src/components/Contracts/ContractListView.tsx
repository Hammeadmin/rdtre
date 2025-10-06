import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Loader2, Inbox, FileText, Download, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Contract } from '../../types';

// Helper to format the status with a corresponding color and text
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'sent':
            return <span className="status-badge status-pending">Skickad</span>;
        case 'signed':
            return <span className="status-badge status-filled">Signerad</span>;
        case 'declined':
            return <span className="status-badge status-cancelled">Nekad</span>;
        case 'draft':
        default:
            return <span className="status-badge status-unknown">Utkast</span>;
    }
};

export const ContractListView = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchContracts = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('employer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching contracts:", error);
                setError('Kunde inte hämta avtal.');
                toast.error('Kunde inte hämta avtal: ' + error.message);
            } else {
                setContracts(data as Contract[]);
            }
            setLoading(false);
        };

        fetchContracts();
    }, [user]);

    const filteredContracts = useMemo(() => {
        if (!searchTerm) return contracts;
        return contracts.filter(c =>
            c.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.employee_email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contracts, searchTerm]);
    
    const handleDownload = async (storagePath: string) => {
        const toastId = toast.loading("Förbereder nedladdning...");
        try {
            const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 300); // 5 min validity
            if (error) throw error;
            window.open(data.signedUrl, '_blank');
            toast.success("Nedladdning startad!", { id: toastId });
        } catch (err: any) {
            toast.error("Kunde inte ladda ner filen: " + err.message, { id: toastId });
        }
    }


    if (loading) {
        return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;
    }
    
    if (error) {
        return <div className="text-center p-10 text-red-600 bg-red-50 rounded-lg">{error}</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Skickade Avtal</h3>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Sök på dokumentnamn eller e-post..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10 w-full max-w-sm"
                />
            </div>

            {filteredContracts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Inbox className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Inga avtal skickade</h3>
                    <p className="mt-1 text-sm text-gray-500">När du skickar ett avtal kommer det att visas här.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokument</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mottagare</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skickat</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Åtgärder</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredContracts.map((contract) => (
                                <tr key={contract.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <FileText className="h-5 w-5 text-gray-400 mr-3 shrink-0" />
                                            <div className="text-sm font-medium text-gray-900 truncate" title={contract.document_name}>
                                                {contract.document_name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" title={contract.employee_email}>{contract.employee_email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getStatusBadge(contract.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(contract.created_at), 'd MMM yyyy, HH:mm', { locale: sv })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleDownload(contract.document_storage_path)} className="btn btn-secondary btn-xs inline-flex items-center">
                                            <Download className="h-3 w-3 mr-1" /> Ladda ner
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
