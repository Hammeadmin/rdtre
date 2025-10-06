import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

export const ContractSettings = () => {
    const { user, profile, fetchProfile } = useAuth();
    const [logoUrl, setLogoUrl] = useState<string | null>(profile?.company_logo_url || null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setLogoUrl(profile?.company_logo_url || null);
    }, [profile]);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        
        const file = event.target.files[0];
        if (!file.type.startsWith('image/')) {
            toast.error("Vänligen välj en bildfil.");
            return;
        }
        setIsUploading(true);

        try {
            const filePath = `logos/${user!.id}/${Date.now()}_${file.name}`;
            
            // Upsert handles both new uploads and overwriting existing logo
            const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
                upsert: true,
                // vvv ADD THIS LINE vvv
                contentType: file.type
            });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ company_logo_url: publicUrl })
                .eq('id', user!.id);
            
            if (profileError) throw profileError;

            setLogoUrl(publicUrl);
            fetchProfile(user!.id); // Refresh profile context
            toast.success("Logotyp uppdaterad!");

        } catch (error: any) {
            toast.error(`Kunde inte ladda upp logotyp: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Företagslogotyp</h3>
            <p className="text-sm text-gray-600 mb-4">Ladda upp din företagslogotyp här. Den kommer att användas på de standardavtal som genereras av plattformen.</p>
            
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center border">
                    {isUploading ? <Loader2 className="animate-spin"/> : 
                     logoUrl ? <img src={logoUrl} alt="Företagslogotyp" className="object-contain h-full w-full rounded-md"/> : 
                     <ImageIcon className="h-8 w-8 text-gray-400"/>}
                </div>
                <label className="btn btn-secondary">
                    <Upload className="mr-2 h-4 w-4"/>
                    <span>Byt logotyp</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                </label>
            </div>
        </div>
    );
};
