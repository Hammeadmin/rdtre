// src/components/intranet/IntranetPostCard.tsx
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Paperclip, Download, Building2, Megaphone, Heart, MessageSquare, Send, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';


// --- Type Definitions ---
interface Attachment {
  file_path: string;
  file_type: string;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    author_id: string;
    author_name: string;
}

interface IntranetPost {
  post_id: string;
  author_name: string;
  author_pharmacy_name?: string;
  title: string;
  content: string;
  is_urgent: boolean;
  category: 'news' | 'education' | 'routines_documents' | 'blog';
  created_at: string;
  attachments: Attachment[] | null;
  like_count: number;
  is_liked_by_user: boolean;
  comments: Comment[] | null;
}

interface IntranetPostCardProps {
  post: IntranetPost;
  onPostUpdated: () => void; // Callback to refresh the feed
}

const CategoryBadge = ({ category }: { category: IntranetPost['category'] }) => {
    const styles = {
        news: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Nyheter' },
        education: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Utbildning' },
        routines_documents: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Rutiner & Dokument' },
        blog: { bg: 'bg-green-100', text: 'text-green-800', label: 'Inlägg' },
    };
    const style = styles[category] || styles.blog;
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>{style.label}</span>;
};

export const IntranetPostCard: React.FC<IntranetPostCardProps> = ({ post, onPostUpdated }) => {
  const { profile } = useAuth();
  const [isLiked, setIsLiked] = useState(post.is_liked_by_user);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const getPublicUrl = (filePath: string) => supabase.storage.from('intranet-attachments').getPublicUrl(filePath).data?.publicUrl;

  // --- FIX IS HERE ---
  // These variable definitions were missing.
  const imageAttachments = post.attachments?.filter(att => att.file_type.startsWith('image/')) || [];
  const fileAttachments = post.attachments?.filter(att => !att.file_type.startsWith('image/')) || [];
  // --- END OF FIX ---
  
  const handleLikeToggle = async () => {
    if (!profile) return toast.error('You must be logged in to like posts.');
    
    const originalLikeState = isLiked;
    setIsLiked(!isLiked);
    setLikeCount(prev => originalLikeState ? prev - 1 : prev + 1);

    try {
        if (originalLikeState) {
            const { error } = await supabase.from('intranet_post_likes').delete().match({ post_id: post.post_id, user_id: profile.id });
            if (error) throw error;
        } else {
            const { error } = await supabase.from('intranet_post_likes').insert({ post_id: post.post_id, user_id: profile.id });
            if (error) throw error;
        }
    } catch (error: any) {
        setIsLiked(originalLikeState);
        setLikeCount(post.like_count);
        toast.error(error.message || 'Could not update like.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;
    setIsCommenting(true);
    try {
        const { error } = await supabase.from('intranet_post_comments').insert({
            post_id: post.post_id,
            author_id: profile.id,
            content: newComment.trim(),
        });
        if (error) throw error;
        setNewComment('');
        onPostUpdated(); // Refresh the whole feed to get the new comment
    } catch (error: any) {
        toast.error(error.message || 'Failed to post comment.');
    } finally {
        setIsCommenting(false);
    }
  };

  return (
    <article className={`bg-white rounded-xl shadow-lg border ${post.is_urgent ? 'border-amber-400' : 'border-gray-200'}`}>
      {post.is_urgent && (
        <div className="bg-amber-400 text-amber-900 px-4 py-2 rounded-t-lg flex items-center">
          <Megaphone className="h-5 w-5 mr-2" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Systemmeddelande</h3>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
              <Building2 className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{post.author_pharmacy_name || post.author_name}</p>
              <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: sv })}</p>
            </div>
          </div>
          <CategoryBadge category={post.category} />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h2>
        <div className="prose prose-sm max-w-none text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
        
        {imageAttachments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {imageAttachments.map((att, index) => (
              <a key={index} href={getPublicUrl(att.file_path)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                <img src={getPublicUrl(att.file_path)} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300" />
              </a>
            ))}
          </div>
        )}

        {fileAttachments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Attachments</h4>
            <div className="space-y-2">
              {fileAttachments.map((att, index) => (
                <a key={index} href={getPublicUrl(att.file_path)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-2 rounded-md transition-colors">
                  <div className="flex items-center">
                    <Paperclip className="h-4 w-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-800 truncate">{att.file_path.split('/').pop()}</span>
                  </div>
                  <Download className="h-4 w-4 text-gray-500" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-gray-500">
            <div className="flex items-center space-x-4">
                <button onClick={handleLikeToggle} className="flex items-center space-x-1.5 hover:text-red-500 transition-colors">
                    <Heart size={20} className={isLiked ? 'text-red-500 fill-current' : ''} />
                    <span className="text-sm font-medium">{likeCount}</span>
                </button>
                <div className="flex items-center space-x-1.5">
                    <MessageSquare size={20} />
                    <span className="text-sm font-medium">{post.comments?.length || 0}</span>
                </div>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t">
            <div className="space-y-3">
                {post.comments?.map(comment => (
                    <div key={comment.id} className="flex items-start space-x-2 text-sm">
                        <div className="font-semibold text-gray-800">{comment.author_name}:</div>
                        <p className="text-gray-600 flex-1">{comment.content}</p>
                    </div>
                ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="mt-3 flex items-center space-x-2">
                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 p-2 border rounded-full text-sm" disabled={isCommenting} />
                <button type="submit" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-400" disabled={isCommenting || !newComment.trim()}>
                    {isCommenting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
                </button>
            </form>
        </div>
      </div>
    </article>
  );
};