import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, AuthorizationError } from '@/lib/auth-guards';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_SESSIONS, MOCK_STUDENTS_LIST, MOCK_STUDENT } from '@/lib/store';
import { isSameTutor, isSameStudent } from '@/lib/utils';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id: sessionId } = await params;

    let activeSession: any = null;
    let activeStudent: any = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*, student:students(*)')
          .eq('id', sessionId)
          .single();

        if (!error && sessionData) {
          activeSession = sessionData;
          if (sessionData.student && typeof sessionData.student === 'object' && 'name' in sessionData.student) {
            activeStudent = sessionData.student;
          } else if (sessionData.student_id) {
            const { data: studentDb } = await supabase
              .from('students')
              .select('*')
              .eq('id', sessionData.student_id)
              .single();
            if (studentDb) activeStudent = studentDb;
          }
        }
      } catch (dbErr) {
        console.warn(`Supabase query for session ${sessionId} failed:`, dbErr);
      }
    }

    if (!activeSession) {
      const mockS = MOCK_SESSIONS.find(s => s.id === sessionId);
      if (mockS) {
        activeSession = mockS;
        activeStudent = mockS.student || MOCK_STUDENTS_LIST.find(s => s.id === mockS.student_id) || MOCK_STUDENT;
      }
    }

    if (!activeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!activeStudent) {
      activeStudent = MOCK_STUDENTS_LIST.find(s => s.id === activeSession.student_id || isSameStudent(activeSession.student_id, s.id)) || MOCK_STUDENT;
    }

    // Role-based ownership check
    if (authUser.role === 'student') {
      if (!isSameStudent(authUser, activeSession.student_id)) {
        return NextResponse.json(
          { error: 'Forbidden: You can only view your own assigned sessions' },
          { status: 403 }
        );
      }
    } else {
      if (!isSameTutor(authUser, activeSession.tutor_id)) {
        return NextResponse.json(
          { error: 'Forbidden: You can only view sessions assigned to your account' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      session: activeSession,
      student: activeStudent,
    });
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
