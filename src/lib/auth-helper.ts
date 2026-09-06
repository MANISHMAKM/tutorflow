import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { UserProfile, StudentProfile } from '@/types';
import { MOCK_TUTOR, MOCK_TUTOR_2, MOCK_STUDENT_USER, MOCK_STUDENTS_LIST } from '@/lib/store';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('placeholder') || url.includes('your-project') || url.includes('your-supabase')) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL PRODUCTION CONFIG ERROR] Missing required Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) in production environment!');
    }
    return false;
  }
  return true;
}

/**
 * Gets the current authenticated user and profile from Supabase session.
 * In production environment, strictly enforces Supabase Auth & public.users database resolution.
 * In local development, falls back to demo cookie session if Supabase is unconfigured.
 */
export async function getAuthUser(): Promise<UserProfile | null> {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, enforce Supabase environment variable presence
  if (isProduction && !isSupabaseConfigured()) {
    throw new Error('Critical Configuration Error: Required Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in production.');
  }

  let cookieEmail: string | undefined;
  let cookieRole: string | undefined;

  try {
    const cookieStore = await cookies();
    cookieEmail = cookieStore.get('demo_user_email')?.value;
    cookieRole = cookieStore.get('demo_user_role')?.value;
  } catch (err) {
    // Cookie reading in unsupported contexts
  }

  console.log(`[GET_AUTH_USER LOG] Resolution start: cookieEmail="${cookieEmail || ''}", isProduction=${isProduction}, isSupabaseConfigured=${isSupabaseConfigured()}`);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (!authErr && user) {
        console.log(`[GET_AUTH_USER LOG] Real Supabase Auth user resolved: id=${user.id}, email=${user.email}`);

        // 1. Fetch user profile from public.users table by id
        const { data: profileById } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileById) {
          console.log(`[GET_AUTH_USER LOG] Found profile in public.users by ID: id=${profileById.id}, role=${profileById.role}`);
          return profileById as UserProfile;
        }

        // 2. Fetch user profile from public.users table by email
        if (user.email) {
          const { data: profileByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email.toLowerCase())
            .single();

          if (profileByEmail) {
            console.log(`[GET_AUTH_USER LOG] Found profile in public.users by email: id=${profileByEmail.id}, role=${profileByEmail.role}`);
            return profileByEmail as UserProfile;
          }
        }

        const resolvedRole = (user.user_metadata?.role as 'tutor' | 'student') || (user.email?.toLowerCase().includes('student') ? 'student' : 'tutor');

        console.log(`[GET_AUTH_USER LOG] Using Auth metadata profile: id=${user.id}, role=${resolvedRole}`);
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: resolvedRole,
        };
      } else {
        console.log(`[GET_AUTH_USER LOG] Supabase Auth getUser returned error or null user: ${authErr?.message || 'No session token'}`);
      }
    } catch (err) {
      console.warn('[GET_AUTH_USER LOG] Supabase auth resolution exception:', err);
    }
  }

  // In production, strictly require Supabase Auth — NEVER degrade silently to demo cookie identity
  if (isProduction) {
    console.warn('[GET_AUTH_USER LOG] Production mode: Unauthenticated request rejected (no active Supabase Auth session).');
    return null;
  }

  // Fallback (Local Dev Only): Resolve via demo session cookie
  if (cookieEmail) {
    const cleanEmail = decodeURIComponent(cookieEmail).toLowerCase().trim();

    if (cleanEmail === 'tutor@tutorflow.com') {
      console.log(`[GET_AUTH_USER LOG] (Dev Mode) Resolved MOCK_TUTOR (Dr. Sarah Jenkins) via cookie.`);
      return MOCK_TUTOR;
    }
    if (cleanEmail === 'david@tutorflow.com') {
      console.log(`[GET_AUTH_USER LOG] (Dev Mode) Resolved MOCK_TUTOR_2 (Prof. David Vance) via cookie.`);
      return MOCK_TUTOR_2;
    }
    if (cleanEmail === 'student@tutorflow.com') {
      console.log(`[GET_AUTH_USER LOG] (Dev Mode) Resolved MOCK_STUDENT_USER (Alex Johnson) via cookie.`);
      return MOCK_STUDENT_USER;
    }

    const mockStudentMatch = MOCK_STUDENTS_LIST.find((s: StudentProfile) => s.user?.email?.toLowerCase() === cleanEmail);
    if (mockStudentMatch) {
      console.log(`[GET_AUTH_USER LOG] (Dev Mode) Resolved mock store student profile for email="${cleanEmail}": id=${mockStudentMatch.id}`);
      return {
        id: mockStudentMatch.id,
        email: cleanEmail,
        name: mockStudentMatch.name,
        role: 'student',
      };
    }

    const fallbackRole = (cookieRole as 'tutor' | 'student') || (cleanEmail.includes('student') ? 'student' : 'tutor');
    console.log(`[GET_AUTH_USER LOG] (Dev Mode) Resolved dynamic fallback profile for email="${cleanEmail}": role=${fallbackRole}`);
    return {
      id: `demo-${cleanEmail}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      role: fallbackRole,
    };
  }

  console.warn(`[GET_AUTH_USER LOG] Auth resolution failed: No active session.`);
  return null;
}


