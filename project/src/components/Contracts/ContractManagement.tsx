import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SendContractView } from './SendContractView';
import { TemplateManager } from './TemplateManager';
import { ContractSettings } from './ContractSettings';
import { ContractListView } from './ContractListView'; // Import the new component
import { Loader2, Send, List, FileText, Settings } from 'lucide-react';
import type { ContractTemplate } from '../../types';

type ContractTab = 'send' | 'list' | 'templates' | 'settings';

export const ContractManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ContractTab>('send');
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchTemplates = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*')
            .eq('employer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching templates:", error);
        } else {
            setTemplates(data || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const TABS: { id: ContractTab; label: string; icon: React.ElementType }[] = [
        { id: 'send', label: 'Skicka Avtal', icon: Send },
        { id: 'list', label: 'Skickade Avtal', icon: List },
        { id: 'templates', label: 'Avtalsmallar', icon: FileText },
        { id: 'settings', label: 'Inställningar', icon: Settings },
    ];

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${
                                activeTab === tab.id
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>
                {loading && activeTab !== 'send' ? (
                     <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>
                ) : (
                    <>
                        {activeTab === 'send' && <SendContractView templates={templates} onContractSent={() => { /* Consider refreshing the list view */ }} />}
                        {activeTab === 'list' && <ContractListView />}
                        {activeTab === 'templates' && <TemplateManager templates={templates} onTemplateChange={fetchTemplates} />}
                        {activeTab === 'settings' && <ContractSettings />}
                    </>
                )}
            </div>
        </div>
    );
};

