import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTutor, AuthorizationError } from '@/lib/auth-guards';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_STUDENTS_LIST } from '@/lib/store';
import { isSameTutor, isSameStudent } from '@/lib/utils';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tutor = await requireTutor();
    const { id: studentId } = await params;

    let targetStudent = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single();

        if (!error && student) {
          targetStudent = student;
        }
      } catch (dbErr) {
        console.warn(`Supabase single student query exception for ${studentId}:`, dbErr);
      }
    }

    if (!targetStudent) {
      targetStudent = MOCK_STUDENTS_LIST.find(
        s => s.id === studentId || isSameStudent(studentId, s.id)
      ) || null;
    }

    if (!targetStudent) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    if (!isSameTutor(tutor, targetStudent.tutor_id)) {
      return NextResponse.json(
        { error: 'Forbidden: You can only view students assigned to your account' },
        { status: 403 }
      );
    }

    return NextResponse.json({ student: targetStudent });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
