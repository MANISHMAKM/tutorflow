import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { UserProfile, StudentProfile } from '@/types';
import { MOCK_TUTOR, MOCK_TUTOR_2, MOCK_STUDENT_USER, MOCK_STUDENTS_LIST } from '@/lib/store';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('placeholder') || url.includes('your-project') || url.includes('your-supabase')) {
    return false;
  }
  return true;
}

/**
 * Gets the current authenticated user and profile from Supabase session.
 * Seamlessly resolves real Supabase Auth session when configured, or falls back
 * to demo session cookies (for pre-configured test credentials on live deployments).
 */
export async function getAuthUser(): Promise<UserProfile | null> {
  let cookieEmail: string | undefined;
  let cookieRole: string | undefined;

  try {
    const cookieStore = await cookies();
    cookieEmail = cookieStore.get('demo_user_email')?.value;
    cookieRole = cookieStore.get('demo_user_role')?.value;
  } catch (err) {
    // Cookie reading in unsupported contexts
  }

  // 1. Attempt Real Supabase Auth resolution if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (!authErr && user) {
        // Fetch user profile from public.users table by id
        const { data: profileById } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileById) {
          return profileById as UserProfile;
        }

        // Fetch user profile from public.users table by email
        if (user.email) {
          const { data: profileByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email.toLowerCase())
            .single();

          if (profileByEmail) {
            return profileByEmail as UserProfile;
          }
        }

        const resolvedRole = (user.user_metadata?.role as 'tutor' | 'student') || (user.email?.toLowerCase().includes('student') ? 'student' : 'tutor');

        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: resolvedRole,
        };
      }
    } catch (err) {
      console.warn('[GET_AUTH_USER LOG] Supabase auth resolution exception:', err);
    }
  }

  // 2. Fallback: Resolve via demo session cookie (for seamless testing on live deployments)
  if (cookieEmail) {
    const cleanEmail = decodeURIComponent(cookieEmail).toLowerCase().trim();

    if (cleanEmail === 'tutor@tutorflow.com') {
      return MOCK_TUTOR;
    }
    if (cleanEmail === 'david@tutorflow.com') {
      return MOCK_TUTOR_2;
    }
    if (cleanEmail === 'student@tutorflow.com') {
      return MOCK_STUDENT_USER;
    }

    const mockStudentMatch = MOCK_STUDENTS_LIST.find((s: StudentProfile) => s.user?.email?.toLowerCase() === cleanEmail);
    if (mockStudentMatch) {
      return {
        id: mockStudentMatch.id,
        email: cleanEmail,
        name: mockStudentMatch.name,
        role: 'student',
      };
    }

    const fallbackRole = (cookieRole as 'tutor' | 'student') || (cleanEmail.includes('student') ? 'student' : 'tutor');
    return {
      id: `demo-${cleanEmail}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      role: fallbackRole,
    };
  }

  return null;
}



