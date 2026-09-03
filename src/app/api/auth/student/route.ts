import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTutor, AuthorizationError } from '@/lib/auth-guards';

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

    const adminSupabase = createAdminClient();
    const tempPassword = password || 'Student123!';

    let newUserId: string;

    // Create Supabase Auth account via admin client
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, role: 'student' },
    });

    if (authError || !authData.user) {
      const isDuplicate = authError?.message.toLowerCase().includes('already registered') || authError?.message.toLowerCase().includes('exists');
      return NextResponse.json(
        { error: isDuplicate ? `A user with email ${email} already exists.` : `Failed to create student Auth account: ${authError?.message || 'Unknown error'}` },
        { status: isDuplicate ? 400 : 500 }
      );
    }

    newUserId = authData.user.id;

    const supabase = await createClient();

    // 1. Insert into public.users
    const { error: userError } = await supabase.from('users').upsert({
      id: newUserId,
      role: 'student',
      name,
      email,
    });

    if (userError) {
      console.error('Error creating public.users record:', userError.message);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 2. Insert into public.students
    const studentData = {
      id: newUserId,
      tutor_id: tutor.id,
      name,
      subject,
      current_level,
      learning_goals: Array.isArray(learning_goals) ? learning_goals : (learning_goals ? [learning_goals] : []),
      weak_areas: Array.isArray(weak_areas) ? weak_areas : (weak_areas ? [weak_areas] : []),
    };

    const { error: studentDbError } = await supabase.from('students').insert(studentData);

    if (studentDbError) {
      console.error('Error creating public.students record:', studentDbError.message);
      return NextResponse.json({ error: studentDbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      student: {
        ...studentData,
        email,
        temp_password: tempPassword,
      },
    }, { status: 201 });

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

