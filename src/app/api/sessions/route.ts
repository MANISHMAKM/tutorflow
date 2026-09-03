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

    if (!isSupabaseConfigured()) {
      let fallback = MOCK_SESSIONS;
      if (authUser.role === 'student') {
        fallback = fallback.filter(s => isSameStudent(authUser, s.student_id));
      } else if (authUser.role === 'tutor') {
        fallback = fallback.filter(s => isSameTutor(authUser, s.tutor_id));
      }
      return NextResponse.json({ sessions: fallback });
    }

    try {
      const supabase = await createClient();
      let query = supabase.from('sessions').select(`
        *,
        student:students(*),
        notes:session_notes(*)
      `).order('scheduled_at', { ascending: true });

      if (authUser.role === 'student') {
        query = query.eq('student_id', authUser.id);
      } else if (authUser.role === 'tutor') {
        query = query.eq('tutor_id', authUser.id);
      }

      const { data: sessions, error } = await query;
      if (!error && sessions && sessions.length > 0) {
        return NextResponse.json({ sessions });
      }
      if (error) {
        console.warn(`[DB WARNING] Supabase sessions query returned error: ${error.message}`);
      }
    } catch (dbErr) {
      console.warn('Supabase sessions query caught error, returning seed fallback:', dbErr);
    }

    let fallback = MOCK_SESSIONS;
    if (authUser.role === 'student') {
      fallback = fallback.filter(s => isSameStudent(authUser, s.student_id));
    } else if (authUser.role === 'tutor') {
      fallback = fallback.filter(s => isSameTutor(authUser, s.tutor_id));
    }
    return NextResponse.json({ sessions: fallback });
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
    const { student_id, scheduled_at, duration_minutes = 60, topic } = body;

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

    const supabase = await createClient();

    // Check overlap for this tutor in Supabase
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('id, scheduled_at, duration_minutes, topic')
      .eq('tutor_id', tutor.id);

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

    // Create session record in Supabase
    const newSessionData = {
      tutor_id: tutor.id,
      student_id,
      scheduled_at: newStart.toISOString(),
      duration_minutes,
      topic,
      status: 'scheduled' as const,
    };

    const { data: createdSession, error: insertError } = await supabase
      .from('sessions')
      .insert(newSessionData)
      .select(`
        *,
        student:students(*)
      `)
      .single();

    if (insertError) {
      if (insertError.code === '23P01' || insertError.message.includes('Double-booking')) {
        return NextResponse.json(
          { error: insertError.message, code: 'DOUBLE_BOOKING_CONFLICT' },
          { status: 409 }
        );
      }
      console.error('Error inserting session:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Initialize session notes row
    await supabase.from('session_notes').insert({
      session_id: createdSession.id,
      content: '',
    });

    // Fetch target student email for non-blocking notification dispatch
    const { data: studentRecord } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', student_id)
      .single();

    // Async Resend email dispatch (non-blocking)
    sendSessionScheduledEmail({
      studentEmail: studentRecord?.email || 'student@tutorflow.com',
      studentName: studentRecord?.name || 'Student',
      tutorName: tutor.name,
      topic: newSessionData.topic,
      scheduledAt: newSessionData.scheduled_at,
      durationMinutes: newSessionData.duration_minutes,
    }).catch(err => console.warn('Email notification async exception:', err));

    return NextResponse.json({ success: true, session: createdSession }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error creating session:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
