import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { UserProfile, StudentProfile } from '@/types';
import { MOCK_TUTOR, MOCK_TUTOR_2, MOCK_STUDENT_USER, MOCK_STUDENTS_LIST } from '@/lib/store';

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
  let cookieEmail: string | undefined;
  let cookieRole: string | undefined;

  try {
    const cookieStore = await cookies();
    cookieEmail = cookieStore.get('demo_user_email')?.value;
    cookieRole = cookieStore.get('demo_user_role')?.value;
  } catch (err) {
    // Cookie reading in unsupported contexts
  }

  console.log(`[GET_AUTH_USER DIAGNOSTIC] Resolution start: cookieEmail="${cookieEmail || ''}", cookieRole="${cookieRole || ''}", isSupabaseConfigured=${isSupabaseConfigured()}`);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (!authErr && user) {
        console.log(`[GET_AUTH_USER DIAGNOSTIC] Supabase Auth user resolved: id=${user.id}, email=${user.email}`);

        // 1. Fetch user profile from public.users table by id
        const { data: profileById } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileById) {
          console.log(`[GET_AUTH_USER DIAGNOSTIC] Found profile in public.users by ID: id=${profileById.id}, role=${profileById.role}`);
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
            console.log(`[GET_AUTH_USER DIAGNOSTIC] Found profile in public.users by email: id=${profileByEmail.id}, role=${profileByEmail.role}`);
            return profileByEmail as UserProfile;
          }
        }

        const resolvedRole = (user.user_metadata?.role as 'tutor' | 'student') || (user.email?.toLowerCase().includes('student') ? 'student' : 'tutor');

        console.log(`[GET_AUTH_USER DIAGNOSTIC] Using Auth metadata profile: id=${user.id}, role=${resolvedRole}`);
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: resolvedRole,
        };
      } else {
        console.log(`[GET_AUTH_USER DIAGNOSTIC] Supabase Auth getUser returned error or null user: ${authErr?.message || 'No session token'}`);
      }
    } catch (err) {
      console.warn('[GET_AUTH_USER DIAGNOSTIC] Supabase auth resolution exception:', err);
    }
  }

  // Fallback: Resolve via demo session cookie
  if (cookieEmail) {
    const cleanEmail = decodeURIComponent(cookieEmail).toLowerCase().trim();

    if (cleanEmail === 'tutor@tutorflow.com') {
      console.log(`[GET_AUTH_USER DIAGNOSTIC] Resolved MOCK_TUTOR (Dr. Sarah Jenkins) via cookie.`);
      return MOCK_TUTOR;
    }
    if (cleanEmail === 'david@tutorflow.com') {
      console.log(`[GET_AUTH_USER DIAGNOSTIC] Resolved MOCK_TUTOR_2 (Prof. David Vance) via cookie.`);
      return MOCK_TUTOR_2;
    }
    if (cleanEmail === 'student@tutorflow.com') {
      console.log(`[GET_AUTH_USER DIAGNOSTIC] Resolved MOCK_STUDENT_USER (Alex Johnson) via cookie.`);
      return MOCK_STUDENT_USER;
    }

    // Check dynamically created students in mock store
    const mockStudentMatch = MOCK_STUDENTS_LIST.find((s: StudentProfile) => s.user?.email?.toLowerCase() === cleanEmail);
    if (mockStudentMatch) {
      console.log(`[GET_AUTH_USER DIAGNOSTIC] Resolved mock store student profile for email="${cleanEmail}": id=${mockStudentMatch.id}`);
      return {
        id: mockStudentMatch.id,
        email: cleanEmail,
        name: mockStudentMatch.name,
        role: 'student',
      };
    }

    // Construct fallback profile for custom demo emails
    const fallbackRole = (cookieRole as 'tutor' | 'student') || (cleanEmail.includes('student') ? 'student' : 'tutor');
    console.log(`[GET_AUTH_USER DIAGNOSTIC] Resolved dynamic fallback profile for email="${cleanEmail}": role=${fallbackRole}`);
    return {
      id: `demo-${cleanEmail}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      role: fallbackRole,
    };
  }

  console.warn(`[GET_AUTH_USER DIAGNOSTIC] Auth resolution failed: No active Supabase Auth session and no demo_user_email cookie.`);
  return null;
}


