import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { UserProfile } from '@/types';
import { MOCK_TUTOR, MOCK_TUTOR_2, MOCK_STUDENT_USER } from '@/lib/store';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes('placeholder') || url.includes('your-project') || url.includes('your-supabase')) {
    return false;
  }
  return true;
}

/**
 * Gets the current authenticated user and profile from Supabase session / cookies.
 * Provides fallback seed user if Supabase environment variables are in dev/placeholder mode.
 */
export async function getAuthUser(): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (!error && user) {
        // Fetch user profile from public.users table
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          return profile as UserProfile;
        }

        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: (user.user_metadata?.role as 'tutor' | 'student') || 'tutor',
        };
      }
    } catch (err) {
      console.warn('Supabase auth getAuthUser caught error, checking demo cookies:', err);
    }
  }

  // Check for seed session cookies when demo_user_email is set
  try {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get('demo_user_email')?.value;
    if (demoEmail === 'david@tutorflow.com') return MOCK_TUTOR_2;
    if (demoEmail === 'student@tutorflow.com') return MOCK_STUDENT_USER;
    if (demoEmail === 'tutor@tutorflow.com') return MOCK_TUTOR;
  } catch (cookieErr) {
    console.warn('Error reading demo session cookies:', cookieErr);
  }

  return null;
}


