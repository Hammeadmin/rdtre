// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Database } from '../types/database';
import type { Session } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    fetchProfile: (userId: string) => Promise<void>; // Keep if manual refresh is needed elsewhere
    user: any; // Supabase user object
    userId: string | null | undefined;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    profile: null,
    loading: true,
    fetchProfile: async () => {},
    user: null,
    userId: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfileCallback = useCallback(async (userId: string) => {
        console.log('[AuthContext] Fetching profile for user:', userId);
        try {
            const { data, error, status } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && status !== 406) throw error; // 406 means no rows found, not an error for .single()

            setProfile(data || null);
            console.log('[AuthContext] Profile data:', data);
        } catch (err) {
            toast.error('Misslyckades med att ladda profilen'); // Swedish
            console.error('Error in fetchProfileCallback:', err);
            setProfile(null);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        let authListenerSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;

        const initializeAuth = async () => {
            console.log('[AuthContext] Initializing Auth...');
            setLoading(true);
            try {
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
                if (!mounted) return;

                if (sessionError) {
                    console.error('[AuthContext] Error getting initial session:', sessionError);
                    toast.error("Fel vid kontroll av inloggningsstatus."); // Swedish
                    setSession(null);
                    setProfile(null);
                } else {
                    console.log('[AuthContext] Initial session:', initialSession);
                    setSession(initialSession);
                    if (initialSession?.user) {
                        await fetchProfileCallback(initialSession.user.id);
                    } else {
                        setProfile(null);
                    }
                }

                const { data: listener } = supabase.auth.onAuthStateChange(
                    async (_event, currentSession) => {
                        if (!mounted) return;
                        console.log('[AuthContext] Auth state changed:', _event, currentSession);
                        setSession(currentSession);

                        if (_event === 'SIGNED_IN' && currentSession?.user) {
                            console.log('[AuthContext] SIGNED_IN event, fetching profile...');
                            setLoading(true); // Show loading while profile fetches post-signin
                            await fetchProfileCallback(currentSession.user.id);
                            setLoading(false); // Profile fetch complete
                        } else if (_event === 'SIGNED_OUT') {
                            console.log('[AuthContext] SIGNED_OUT event, clearing profile.');
                            setProfile(null);
                            // Loading state will be false due to the finally block or if already false
                        } else if (_event === 'USER_UPDATED' && currentSession?.user) {
                            console.log('[AuthContext] USER_UPDATED event, fetching profile...');
                            await fetchProfileCallback(currentSession.user.id);
                        }
                        // For events like TOKEN_REFRESHED or PASSWORD_RECOVERY, session is updated, profile likely remains.
                    }
                );
                authListenerSubscription = listener?.subscription ?? null;

            } catch (error) {
                 console.error('[AuthContext] Error during auth initialization:', error);
                 toast.error("Ett fel inträffade vid autentiseringsinställningen."); // Swedish
                 setSession(null);
                 setProfile(null);
            } finally {
                 if (mounted) {
                     console.log('[AuthContext] Initialization finished. Setting loading to false.');
                     setLoading(false);
                 }
            }
        };

        initializeAuth();

        return () => {
            console.log('[AuthContext] Cleaning up auth listener.');
            mounted = false;
            if (authListenerSubscription && typeof authListenerSubscription.unsubscribe === 'function') {
                authListenerSubscription.unsubscribe();
            }
        };
    }, [fetchProfileCallback]);

    const user = session?.user ?? null;
    const userId = user?.id;

    return (
        <AuthContext.Provider
            value={{ session, profile, loading, fetchProfile: fetchProfileCallback, user, userId }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};