import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || supabaseUrl.includes('your-project') || !supabaseUrl.startsWith('http')) {
    throw new Error('Supabase URL is missing or unconfigured (NEXT_PUBLIC_SUPABASE_URL placeholder).');
  }

  if (!serviceRoleKey || serviceRoleKey.includes('your-anon-key')) {
    throw new Error('Supabase Service Role / Anon Key is missing or unconfigured (SUPABASE_SERVICE_ROLE_KEY placeholder).');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

