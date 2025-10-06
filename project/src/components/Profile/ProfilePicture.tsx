import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Camera, Loader } from 'lucide-react';

interface ProfilePictureProps {
  url: string | null;
  userId: string;
  onUpdate: (url: string) => void;
}

export function ProfilePicture({ url, userId, onUpdate }: ProfilePictureProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);

      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size should be less than 5MB');
      }

      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onUpdate(publicUrl);
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {url ? (
          <img
            src={url}
            alt="Profile"
            className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
          />
        ) : (
          <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading ? (
            <Loader className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Upload className="h-5 w-5 text-white" />
          )}
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <p className="text-sm text-gray-500">
        Klicka på kamera-ikonen för att ladda upp en profilbild
      </p>
    </div>
  );
}
export default ProfilePicture