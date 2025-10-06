// src/components/intranet/IntranetFeed.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { IntranetPostCard } from './IntranetPostCard';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const IntranetFeed = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // State to manage which filter is active. Can be a category or 'admin'.
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [hasNewAdminPost, setHasNewAdminPost] = useState(false);

    const fetchFeed = useCallback(async () => {
        setLoading(true);
        try {
            // Determine which RPC parameter to use based on the active filter
            const rpcParams = {
                category_filter: activeFilter !== 'admin' ? activeFilter : null,
                author_role_filter: activeFilter === 'admin' ? 'admin' : null,
            };

            const { data, error } = await supabase.rpc('get_intranet_feed', rpcParams);
            if (error) throw error;
            setPosts(data || []);

            // After fetching, mark the new posts as viewed
            const newPostIds = (data || []).filter(p => p.is_new).map(p => p.post_id);
            if (newPostIds.length > 0 && user) {
                const viewRecords = newPostIds.map(postId => ({ post_id: postId, user_id: user.id }));
                await supabase.from('intranet_post_views').upsert(viewRecords);
                // If we just viewed the admin posts, turn off the new post indicator
                if (activeFilter === 'admin') {
                    setHasNewAdminPost(false);
                }
            }

        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch feed.');
        } finally {
            setLoading(false);
        }
    }, [activeFilter, user]);
    
    // Effect to check for new admin posts specifically for the notification dot
    useEffect(() => {
        const checkNewAdminPosts = async () => {
            const { data, error } = await supabase.rpc('get_intranet_feed', { author_role_filter: 'admin' });
            if (error) return;
            if (data?.some(post => post.is_new)) {
                setHasNewAdminPost(true);
            }
        };
        checkNewAdminPosts();
    }, [posts]); // Re-check when the main post list changes

    useEffect(() => {
        fetchFeed();
        const channel = supabase.channel('intranet_posts_feed_v2').on('postgres_changes', { event: '*', schema: 'public', table: 'intranet_posts' }, () => fetchFeed()).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchFeed]);

    const categories = [
        { value: null, label: 'Alla' },
        { value: 'admin', label: 'System/Admin' }, // New Admin Filter Button
        { value: 'news', label: 'Nyheter' },
        { value: 'education', label: 'Utbildning' },
        { value: 'routines_documents', label: 'Rutiner' },
        { value: 'blog', label: 'Inlägg' },
    ];

    return (
        <div>
            <div className="mb-4">
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex space-x-2 whitespace-nowrap">
                        {categories.map(cat => (
                            <button
                                key={cat.label}
                                onClick={() => setActiveFilter(cat.value)}
                                className={`relative px-3 py-1 text-sm rounded-full transition-colors ${
                                    activeFilter === cat.value
                                        ? 'bg-primary-600 text-white font-semibold'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {cat.label}
                                {cat.value === 'admin' && hasNewAdminPost && activeFilter !== 'admin' && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
            ) : posts.length === 0 ? (
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-gray-700">Inga inlägg hittades.</h3>
                    <p className="text-sm text-gray-500">Prova en annan kategori eller kom tillbaka senare.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map(post => (
                        <IntranetPostCard key={post.post_id} post={post} onPostUpdated={fetchFeed} />
                    ))}
                </div>
            )}
        </div>
    );
};