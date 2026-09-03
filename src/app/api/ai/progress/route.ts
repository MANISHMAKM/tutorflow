import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, AuthorizationError } from '@/lib/auth-guards';
import { generateStudentProgressSummary } from '@/lib/ai/service';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_STUDENTS_LIST, MOCK_STUDENT, MOCK_DEBRIEFS } from '@/lib/store';
import { StudentProfile, Debrief } from '@/types';

export async function POST(req: Request) {
  try {
    const authUser = await requireAuth();
    const { student_id } = await req.json();

    if (!student_id) {
      return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
    }

    let student: StudentProfile | null = null;
    let pastDebriefs: Debrief[] = [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('id', student_id)
          .single();

        if (studentData) student = studentData as StudentProfile;

        const { data: studentSessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('student_id', student_id);

        if (studentSessions && studentSessions.length > 0) {
          const sessionIds = studentSessions.map(s => s.id);
          const { data: debriefs } = await supabase
            .from('debriefs')
            .select('*')
            .in('session_id', sessionIds);
          if (debriefs && debriefs.length > 0) pastDebriefs = debriefs as Debrief[];
        }
      } catch (err) {
        console.warn('Supabase progress query error:', err);
      }
    }

    if (!student) {
      student = MOCK_STUDENTS_LIST.find(s => s.id === student_id) || MOCK_STUDENT;
      pastDebriefs = Object.values(MOCK_DEBRIEFS);
    }

    const progressSummary = await generateStudentProgressSummary(student, pastDebriefs);

    return NextResponse.json({
      success: true,
      progress: progressSummary,
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error generating progress summary:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'AI Progress error' }, { status: 500 });
  }
}
