import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'farmispoolen-auth',
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  },
  global: {
    headers: {
      'x-application-name': 'farmispoolen'
    }
  },
  db: {
    schema: 'public'
  }
});

// Connection check with retry
export async function checkSupabaseConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Supabase connection successful');
        return true;
      }

      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (!error) {
        console.log('Supabase connection successful');
        return true;
      }

      console.warn(`Connection attempt ${i + 1} failed:`, error);
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    } catch (err) {
      console.error(`Connection attempt ${i + 1} error:`, err);
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  console.error('Failed to connect to Supabase after', retries, 'attempts');
  return false;
}

// Health check function
export async function getSupabaseHealth() {
  try {
    const start = Date.now();
    const { data: { user } } = await supabase.auth.getUser();
    const latency = Date.now() - start;

    return {
      isHealthy: !!user,
      latency,
      error: null
    };
  } catch (err) {
    return {
      isHealthy: false,
      latency: 0,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}