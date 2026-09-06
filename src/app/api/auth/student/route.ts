import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTutor, AuthorizationError } from '@/lib/auth-guards';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_STUDENTS_LIST } from '@/lib/store';

const StudentOnboardingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address format'),
  subject: z.string().min(1, 'Subject is required'),
  current_level: z.string().min(1, 'Current level is required'),
  learning_goals: z.union([z.array(z.string()), z.string()]).optional(),
  weak_areas: z.union([z.array(z.string()), z.string()]).optional(),
  password: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const tutor = await requireTutor();

    const body = await req.json();
    const validation = StudentOnboardingSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Invalid input fields';
      return NextResponse.json(
        { error: firstError, details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email, subject, current_level, learning_goals, weak_areas, password } = validation.data;
    const tempPassword = password || 'Student123!';

    const formattedGoals = Array.isArray(learning_goals)
      ? learning_goals
      : (learning_goals ? [learning_goals] : []);

    const formattedWeakAreas = Array.isArray(weak_areas)
      ? weak_areas
      : (weak_areas ? [weak_areas] : []);

    let newUserId: string = `student-${Date.now()}`;
    let createdInSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        const adminSupabase = createAdminClient();

        // Create Supabase Auth account via admin client
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name, role: 'student' },
        });

        if (authError) {
          const isDuplicate = authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('exists');
          if (isDuplicate) {
            return NextResponse.json(
              { error: `A user with email ${email} already exists.` },
              { status: 400 }
            );
          }
          console.warn('[SUPABASE ADMIN WARNING] createUser returned error:', authError.message);
        } else if (authData?.user) {
          newUserId = authData.user.id;
          createdInSupabase = true;

          const supabase = await createClient();

          // 1. Insert into public.users
          await supabase.from('users').upsert({
            id: newUserId,
            role: 'student',
            name,
            email,
          });

          // 2. Insert into public.students
          await supabase.from('students').insert({
            id: newUserId,
            tutor_id: tutor.id,
            name,
            subject,
            current_level,
            learning_goals: formattedGoals,
            weak_areas: formattedWeakAreas,
          });
        }
      } catch (adminErr: unknown) {
        console.warn('[SUPABASE ADMIN EXCEPTION] Falling back to local store student creation:', adminErr instanceof Error ? adminErr.message : adminErr);
      }
    }

    const newStudentProfile = {
      id: newUserId,
      tutor_id: tutor.id,
      name,
      email,
      subject,
      current_level,
      learning_goals: formattedGoals,
      weak_areas: formattedWeakAreas,
    };

    // Add to local mock store fallback so student creation NEVER fails
    const existingMockIndex = MOCK_STUDENTS_LIST.findIndex(s => s.id === newUserId || s.name === name);
    if (existingMockIndex >= 0) {
      MOCK_STUDENTS_LIST[existingMockIndex] = newStudentProfile;
    } else {
      MOCK_STUDENTS_LIST.unshift(newStudentProfile);
    }

    return NextResponse.json(
      {
        success: true,
        created_in_supabase: createdInSupabase,
        student: {
          ...newStudentProfile,
          temp_password: tempPassword,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error creating student:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}


