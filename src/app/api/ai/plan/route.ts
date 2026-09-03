import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTutorOwnsSession, AuthorizationError } from '@/lib/auth-guards';
import { generatePreSessionPlan } from '@/lib/ai/service';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_STUDENTS_LIST, MOCK_STUDENT, MOCK_DEBRIEFS, MOCK_PLANS } from '@/lib/store';
import { StudentProfile, Debrief } from '@/types';

export async function POST(req: Request) {
  try {
    const { session_id, student_id, topic } = await req.json();

    if (!session_id || !student_id) {
      return NextResponse.json({ error: 'Missing session_id or student_id' }, { status: 400 });
    }

    // Require tutor ownership server-side
    await requireTutorOwnsSession(session_id);

    let student: StudentProfile | null = null;
    let pastDebriefs: Debrief[] = [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('id', student_id)
          .single();

        if (!studentError && studentData) {
          student = studentData as StudentProfile;
        }

        const { data: pastSessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('student_id', student_id)
          .neq('id', session_id);

        if (pastSessions && pastSessions.length > 0) {
          const pastIds = pastSessions.map(s => s.id);
          const { data: debriefs } = await supabase
            .from('debriefs')
            .select('*')
            .in('session_id', pastIds);
          if (debriefs && debriefs.length > 0) pastDebriefs = debriefs as Debrief[];
        }
      } catch (err) {
        console.warn('Supabase plan query error:', err);
      }
    }

    if (!student) {
      student = MOCK_STUDENTS_LIST.find(s => s.id === student_id) || MOCK_STUDENT;
      pastDebriefs = Object.values(MOCK_DEBRIEFS);
    }

    // Call AI Service with student context
    const planOutput = await generatePreSessionPlan(student, topic || 'General Topic', pastDebriefs);

    const planRecord = {
      session_id,
      objectives: planOutput.objectives,
      lesson_outline: planOutput.lesson_outline,
      practice_questions: planOutput.practice_questions,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from('session_plans').upsert(planRecord);
      } catch (dbErr) {
        console.warn('Error saving session plan to Supabase:', dbErr);
      }
    }

    MOCK_PLANS[session_id] = planRecord;

    return NextResponse.json({ success: true, plan: planRecord });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error generating pre-session plan:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'AI Generation error' }, { status: 500 });
  }
}
