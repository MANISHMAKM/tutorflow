import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTutorOwnsSession, AuthorizationError } from '@/lib/auth-guards';
import { validateStateTransition, StateTransitionError } from '@/lib/state-machine';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_SESSIONS, MOCK_STUDENTS_LIST } from '@/lib/store';
import { SessionStatus } from '@/types';
import { sendSessionStartedEmail } from '@/lib/email/service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const { status: newStatus } = body as { status: SessionStatus };

    if (!newStatus) {
      return NextResponse.json({ error: 'Missing target status' }, { status: 400 });
    }

    // Server-side tutor ownership check
    const tutor = await requireTutorOwnsSession(sessionId);

    let currentStatus: SessionStatus = 'scheduled';
    let sessionFound = false;
    let targetTopic = '';
    let targetMeetingLink = '';
    let targetStudentId = '';

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: session, error: fetchError } = await supabase
          .from('sessions')
          .select('status, topic, meeting_link, student_id')
          .eq('id', sessionId)
          .single();

        if (!fetchError && session) {
          currentStatus = session.status as SessionStatus;
          targetTopic = session.topic;
          targetMeetingLink = session.meeting_link;
          targetStudentId = session.student_id;
          sessionFound = true;
        }
      } catch (err) {
        console.warn('Supabase session status query error:', err);
      }
    }

    if (!sessionFound) {
      const mockS = MOCK_SESSIONS.find(s => s.id === sessionId);
      if (mockS) {
        currentStatus = mockS.status;
        targetTopic = mockS.topic;
        targetMeetingLink = mockS.meeting_link || '';
        targetStudentId = mockS.student_id;
        sessionFound = true;
      }
    }

    if (!sessionFound) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // SERVER-SIDE STRICT STATE TRANSITION VALIDATION
    try {
      validateStateTransition(currentStatus, newStatus);
    } catch (err: unknown) {
      if (err instanceof StateTransitionError) {
        return NextResponse.json(
          {
            error: err.message,
            code: 'INVALID_STATE_TRANSITION',
            current_status: currentStatus,
            requested_status: newStatus,
          },
          { status: 409 } // Explicit 409 Conflict
        );
      }
      throw err;
    }

    // Dispatch email notification to student when session starts
    if (newStatus === 'in_progress' && currentStatus !== 'in_progress') {
      const studentMatch = MOCK_STUDENTS_LIST.find(s => s.id === targetStudentId);
      const studentEmail = studentMatch?.user?.email || (studentMatch as { email?: string })?.email || 'student@tutorflow.com';
      const studentName = studentMatch?.name || 'Student';

      sendSessionStartedEmail({
        studentEmail,
        studentName,
        tutorName: tutor.name,
        topic: targetTopic || '1-on-1 Tutoring Session',
        meetingLink: targetMeetingLink,
      }).catch(err => console.warn('Async session started email exception:', err));
    }

    // Execute state update in Supabase DB if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: updatedSession, error: updateError } = await supabase
          .from('sessions')
          .update({ status: newStatus })
          .eq('id', sessionId)
          .select()
          .single();

        if (!updateError && updatedSession) {
          return NextResponse.json({
            success: true,
            previous_status: currentStatus,
            new_status: newStatus,
            session: updatedSession,
          });
        }
      } catch (dbErr) {
        console.warn('Error updating Supabase session status:', dbErr);
      }
    }

    // Update in-memory seed session store
    const mockS = MOCK_SESSIONS.find(s => s.id === sessionId);
    if (mockS) {
      mockS.status = newStatus;
    }

    return NextResponse.json({
      success: true,
      previous_status: currentStatus,
      new_status: newStatus,
      session: mockS ? { ...mockS, status: newStatus } : { id: sessionId, status: newStatus },
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error updating session status:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
