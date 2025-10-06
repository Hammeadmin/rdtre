import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Upload, FileText, Trash2, Loader2, Plus } from 'lucide-react';
import { ContractTemplate } from '../../types';

export const TemplateManager = () => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    // Form state for new template
    const [file, setFile] = useState<File | null>(null);
    const [templateName, setTemplateName] = useState('');

    const fetchTemplates = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*')
            .eq('employer_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            toast.error("Kunde inte hämta mallar.");
        } else {
            setTemplates(data as ContractTemplate[]);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !templateName) {
            toast.error("Vänligen ange ett namn och välj en PDF-fil.");
            return;
        }
        setIsUploading(true);
        try {
            const filePath = `contract_templates/${user!.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { error: insertError } = await supabase
                .from('contract_templates')
                .insert({
                    employer_id: user!.id,
                    template_name: templateName,
                    storage_path: filePath,
                    template_type: 'custom_pdf'
                });

            if (insertError) throw insertError;

            toast.success("Avtalsmall uppladdad!");
            setFile(null);
            setTemplateName('');
            const fileInput = document.getElementById('template-file-input') as HTMLInputElement | null;
                              if (fileInput) {
                                  fileInput.value = '';
                              }
            fetchTemplates();

        } catch (error: any) {
            toast.error(`Fel: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async (template: ContractTemplate) => {
        if (!window.confirm(`Är du säker på att du vill ta bort mallen "${template.template_name}"?`)) return;

        try {
            // Delete file from storage
            if (template.storage_path) {
                const { error: storageError } = await supabase.storage
                    .from('documents')
                    .remove([template.storage_path]);
                if (storageError) throw storageError;
            }
            
            // Delete record from database
            const { error: dbError } = await supabase
                .from('contract_templates')
                .delete()
                .eq('id', template.id);
            if (dbError) throw dbError;

            toast.success("Mall borttagen.");
            fetchTemplates();

        } catch(error: any) {
            toast.error(`Kunde inte ta bort mallen: ${error.message}`);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <form onSubmit={handleUpload} className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-semibold text-lg">Ladda upp ny mall</h3>
                    <div>
                        <label className="form-label">Namn på mall</label>
                        <input value={templateName} onChange={e => setTemplateName(e.target.value)} className="form-input" placeholder="T.ex. Heltid Farmaceut" required />
                    </div>
                    <div>
                         <label className="form-label">PDF-fil</label>
                         <input id="template-file-input" type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="form-input" accept=".pdf" required />
                    </div>
                    <button type="submit" className="btn btn-primary w-full" disabled={isUploading}>
                        {isUploading ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2"/>}
                        Spara Mall
                    </button>
                </form>
            </div>
            <div className="md:col-span-2">
                 <h3 className="font-semibold text-lg mb-4">Mina sparade mallar</h3>
                 {isLoading ? <Loader2 className="animate-spin"/> :
                 templates.length === 0 ? <p className="text-gray-500">Du har inte laddat upp några egna mallar än.</p> :
                 (
                     <ul className="space-y-3">
                         {templates.map(t => (
                             <li key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                 <div className="flex items-center">
                                     <FileText className="h-5 w-5 mr-3 text-primary-600"/>
                                     <span className="font-medium">{t.template_name}</span>
                                 </div>
                                 <button onClick={() => handleDelete(t)} className="text-red-500 hover:text-red-700">
                                     <Trash2 className="h-5 w-5"/>
                                 </button>
                             </li>
                         ))}
                     </ul>
                 )}
            </div>
        </div>
    );
};
