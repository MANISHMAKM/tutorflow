import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTutorOwnsSession, AuthorizationError } from '@/lib/auth-guards';
import { generatePostSessionDebrief } from '@/lib/ai/service';
import { validateStateTransition } from '@/lib/state-machine';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_SESSIONS, MOCK_STUDENTS_LIST, MOCK_STUDENT, MOCK_NOTES, MOCK_DEBRIEFS } from '@/lib/store';
import { StudentProfile, SessionStatus } from '@/types';

export async function POST(req: Request) {
  try {
    const { session_id, student_id, topic } = await req.json();

    if (!session_id || !student_id) {
      return NextResponse.json({ error: 'Missing session_id or student_id' }, { status: 400 });
    }

    // Require tutor ownership server-side
    await requireTutorOwnsSession(session_id);

    let currentStatus: SessionStatus = 'completed';
    let student: StudentProfile | null = null;
    let rawNotes = 'Session completed. Reviewed core concepts and problem solving techniques.';

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('status')
          .eq('id', session_id)
          .single();

        if (!sessionError && session) {
          currentStatus = session.status as SessionStatus;
        }

        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('id', student_id)
          .single();

        if (studentData) student = studentData as StudentProfile;

        const { data: notesData } = await supabase
          .from('session_notes')
          .select('content')
          .eq('session_id', session_id)
          .single();

        if (notesData?.content) rawNotes = notesData.content;
      } catch (err) {
        console.warn('Supabase debrief query error:', err);
      }
    }

    const mockS = MOCK_SESSIONS.find(s => s.id === session_id);
    if (mockS) currentStatus = mockS.status;
    if (!student) student = MOCK_STUDENTS_LIST.find(s => s.id === student_id) || MOCK_STUDENT;
    if (MOCK_NOTES[session_id]?.content) rawNotes = MOCK_NOTES[session_id].content;

    // Validate state transition completed -> ai_reviewed (throws 409 Conflict if invalid)
    validateStateTransition(currentStatus, 'ai_reviewed');

    // Generate debrief using AI Service
    const debriefOutput = await generatePostSessionDebrief(student, topic || 'Tutoring Session', rawNotes);

    const debriefRecord = {
      session_id,
      summary: debriefOutput.summary,
      homework: debriefOutput.homework,
      next_focus: debriefOutput.next_focus,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from('debriefs').upsert(debriefRecord);

        if (debriefOutput.homework && debriefOutput.homework.length > 0) {
          const homeworkRows = debriefOutput.homework.map(h => ({
            student_id,
            session_id,
            task: `${h.task}: ${h.description}`,
            completed: false,
          }));
          await supabase.from('student_homework').insert(homeworkRows);
        }

        await supabase
          .from('sessions')
          .update({ status: 'ai_reviewed' })
          .eq('id', session_id);
      } catch (dbErr) {
        console.warn('Error persisting debrief in Supabase:', dbErr);
      }
    }

    if (mockS) mockS.status = 'ai_reviewed';
    MOCK_DEBRIEFS[session_id] = debriefRecord;

    return NextResponse.json({
      success: true,
      debrief: debriefRecord,
      new_status: 'ai_reviewed',
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error generating AI debrief:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'AI Debrief generation failed' }, { status: 500 });
  }
}
