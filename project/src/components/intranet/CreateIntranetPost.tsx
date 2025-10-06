// src/components/intranet/CreateIntranetPost.tsx
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2, Send, Paperclip, X, Megaphone, Image as ImageIcon, File as FileIcon } from 'lucide-react';

interface CreateIntranetPostProps {
  onPostCreated: () => void;
  onClose: () => void;
}

export const CreateIntranetPost: React.FC<CreateIntranetPostProps> = ({ onPostCreated, onClose }) => {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'news' | 'education' | 'routines_documents' | 'blog'>('blog');
  const [isUrgent, setIsUrgent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendAsEmail, setSendAsEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Creating post...');

    try {
      // 1. Insert the post
      const { data: postData, error: postError } = await supabase
        .from('intranet_posts')
        .insert({
          author_id: profile?.id,
          title: title.trim(),
          content: content.trim(),
          category: category,
          is_urgent: profile?.role === 'admin' ? isUrgent : false,
        })
        .select()
        .single();
      if (postError) throw postError;

      // 2. Upload attachments if any
      if (files.length > 0) {
        for (const file of files) {
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const filePath = `${profile?.id}/${postData.id}/${cleanFileName}`;
          const { error: uploadError } = await supabase.storage
            .from('intranet-attachments')
            .upload(filePath, file);
          if (uploadError) throw uploadError;

          // 3. Link attachments to the post
          const { error: attachmentError } = await supabase
            .from('intranet_post_attachments')
            .insert({
              post_id: postData.id,
              file_path: filePath,
              file_type: file.type,
            });
          if (attachmentError) throw attachmentError;
        }
      }

       if (profile?.role === 'admin' && sendAsEmail) {
            try {
                await fetch('/api/send-intranet-post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: postData.title,
                        content: postData.content, // Ensure this content is markdown or simple text
                    }),
                });
                toast.success('Post successfully sent as an email to all users.', {
                  icon: '📧',
                });
            } catch (emailError) {
                console.error("Failed to trigger email send:", emailError);
                // This error is not shown to the user to avoid confusion,
                // as the post itself was created successfully.
                toast.error('Post was created, but failed to send as an email.');
            }
        }

      toast.success('Post created successfully!', { id: toastId });
      onPostCreated();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error.message || 'Failed to create post.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-xl max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Skapa ett nytt inlägg</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full p-2 border rounded">
            <option value="blog">Inlägg</option>
            <option value="news">Nyheter</option>
            <option value="education">Utbildning</option>
            <option value="routines_documents">Rutiner & Dokument</option>
        </select>
        <input type="text" placeholder="Post Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded" required />
        <textarea placeholder="Share something..." value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 border rounded h-32" required />
        
        {profile?.role === 'admin' && (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="h-4 w-4 text-amber-500 border-gray-300 rounded focus:ring-amber-400" />
            <span className="text-sm font-medium text-amber-600 flex items-center"><Megaphone size={16} className="mr-1"/>Mark as Urgent Notice</span>
          </label>
        )}
        {profile?.role === 'admin' && (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input 
      type="checkbox" 
      checked={sendAsEmail} 
      onChange={e => setSendAsEmail(e.target.checked)} 
      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
    />
    <span className="text-sm font-medium text-primary-700 flex items-center">
      <Send size={16} className="mr-1"/>
      Skicka som e-post till alla användare
    </span>
  </label>
)}
        
        <div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:underline flex items-center">
            <Paperclip size={16} className="mr-1"/> Lägg till bilder/bilagor
          </button>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <div className="mt-2 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm">
                <span className="flex items-center">
                  {file.type.startsWith('image/') ? <ImageIcon size={16} className="mr-2 text-gray-500"/> : <FileIcon size={16} className="mr-2 text-gray-500"/>}
                  {file.name}
                </span>
                <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400">
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />}
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};