import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireTutor, requireTutorOwnsStudent, AuthorizationError } from '@/lib/auth-guards';
import { sendSessionScheduledEmail } from '@/lib/email/service';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_SESSIONS } from '@/lib/store';

import { isSameTutor, isSameStudent } from '@/lib/utils';

export async function GET() {
  try {
    const authUser = await requireAuth();

    console.log(`[AUTH LOG] GET /api/sessions for authUser: id=${authUser.id}, email=${authUser.email}, role=${authUser.role}`);

    let dbSessions: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        let query = supabase.from('sessions').select(`
          *,
          student:students(*),
          notes:session_notes(*)
        `).order('scheduled_at', { ascending: true });

        if (authUser.role === 'student') {
          const { data: studentRecord } = await supabase
            .from('students')
            .select('id')
            .eq('id', authUser.id)
            .single();
          const targetStudentId = studentRecord?.id || authUser.id;
          query = query.eq('student_id', targetStudentId);
        } else if (authUser.role === 'tutor') {
          query = query.eq('tutor_id', authUser.id);
        }

        const { data: sessions, error } = await query;
        if (!error && sessions) {
          dbSessions = sessions;
        } else if (error) {
          console.warn(`[DB WARNING] Supabase sessions query returned error: ${error.message}`);
        }
      } catch (dbErr) {
        console.warn('Supabase sessions query caught error:', dbErr);
      }
    }

    const existingIds = new Set(dbSessions.map(s => s.id));
    let fallback = MOCK_SESSIONS;
    if (authUser.role === 'student') {
      fallback = fallback.filter(s => isSameStudent(authUser, s.student_id));
    } else if (authUser.role === 'tutor') {
      fallback = fallback.filter(s => isSameTutor(authUser, s.tutor_id));
    }
    const extraMock = fallback.filter(s => !existingIds.has(s.id));

    return NextResponse.json({ sessions: [...dbSessions, ...extraMock] });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch sessions' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const tutor = await requireTutor();

    const body = await req.json();
    const { student_id, scheduled_at, duration_minutes = 60, topic, meeting_link } = body;

    if (!student_id || !scheduled_at || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, scheduled_at, topic' },
        { status: 400 }
      );
    }

    // Verify tutor owns the student
    await requireTutorOwnsStudent(student_id);

    // SERVER-SIDE DOUBLE-BOOKING OVERLAP CHECK
    const newStart = new Date(scheduled_at);
    const newEnd = new Date(newStart.getTime() + duration_minutes * 60 * 1000);

    let existingSessions: Array<{ id: string; scheduled_at: string; duration_minutes: number; topic: string }> = [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from('sessions')
          .select('id, scheduled_at, duration_minutes, topic')
          .eq('tutor_id', tutor.id);
        if (data && data.length > 0) {
          existingSessions = data;
        } else {
          existingSessions = MOCK_SESSIONS.filter(s => isSameTutor(tutor, s.tutor_id));
        }
      } catch (err) {
        console.warn('Supabase overlap query failed, checking seed sessions:', err);
        existingSessions = MOCK_SESSIONS.filter(s => isSameTutor(tutor, s.tutor_id));
      }
    } else {
      existingSessions = MOCK_SESSIONS.filter(s => isSameTutor(tutor, s.tutor_id));
    }

    if (existingSessions && existingSessions.length > 0) {
      for (const s of existingSessions) {
        const existStart = new Date(s.scheduled_at);
        const existDuration = s.duration_minutes || 60;
        const existEnd = new Date(existStart.getTime() + existDuration * 60 * 1000);

        if (newStart < existEnd && newEnd > existStart) {
          const formattedExistStart = existStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const formattedExistEnd = existEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return NextResponse.json(
            {
              error: `Double-booking conflict! Tutor is already booked for session "${s.topic}" between ${formattedExistStart} and ${formattedExistEnd}. Please select a different time slot.`,
              code: 'DOUBLE_BOOKING_CONFLICT',
            },
            { status: 409 }
          );
        }
      }
    }

    // Generate fallback Google Meet link if none provided
    const finalMeetingLink = meeting_link && meeting_link.trim().length > 0
      ? meeting_link.trim()
      : `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;

    // Create session record
    const newSessionData = {
      id: `session-${Date.now()}`,
      tutor_id: tutor.id,
      student_id,
      scheduled_at: newStart.toISOString(),
      duration_minutes,
      topic,
      meeting_link: finalMeetingLink,
      status: 'scheduled' as const,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: createdSession, error: insertError } = await supabase
          .from('sessions')
          .insert({
            tutor_id: tutor.id,
            student_id,
            scheduled_at: newStart.toISOString(),
            duration_minutes,
            topic,
            meeting_link: finalMeetingLink,
            status: 'scheduled' as const,
          })
          .select(`
            *,
            student:students(*)
          `)
          .single();

        if (!insertError && createdSession) {
          await supabase.from('session_notes').insert({
            session_id: createdSession.id,
            content: '',
          });
          return NextResponse.json({ success: true, session: createdSession }, { status: 201 });
        }
      } catch (dbErr) {
        console.warn('Supabase session insert failed, returning fallback creation:', dbErr);
      }
    }

    // Non-blocking Resend email dispatch
    sendSessionScheduledEmail({
      studentEmail: 'student@tutorflow.com',
      studentName: 'Student',
      tutorName: tutor.name,
      topic: newSessionData.topic,
      scheduledAt: newSessionData.scheduled_at,
      durationMinutes: newSessionData.duration_minutes,
      meetingLink: finalMeetingLink,
    }).catch(err => console.warn('Email notification async exception:', err));

    MOCK_SESSIONS.push(newSessionData);
    return NextResponse.json({ success: true, session: newSessionData }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error creating session:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
