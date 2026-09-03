import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTutorOwnsSession, AuthorizationError } from '@/lib/auth-guards';
import { isNotesEditable } from '@/lib/state-machine';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_SESSIONS, MOCK_NOTES } from '@/lib/store';
import { SessionStatus } from '@/types';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const { content } = body;

    if (content === undefined) {
      return NextResponse.json({ error: 'Missing content field' }, { status: 400 });
    }

    // Require tutor ownership server-side
    await requireTutorOwnsSession(sessionId);

    let currentStatus: SessionStatus = 'scheduled';
    let sessionFound = false;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('status')
          .eq('id', sessionId)
          .single();

        if (!sessionError && session) {
          currentStatus = session.status as SessionStatus;
          sessionFound = true;
        }
      } catch (err) {
        console.warn('Supabase notes status query error:', err);
      }
    }

    if (!sessionFound) {
      const mockS = MOCK_SESSIONS.find(s => s.id === sessionId);
      if (mockS) {
        currentStatus = mockS.status;
        sessionFound = true;
      }
    }

    if (!sessionFound) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // READ-ONLY LOCK ENFORCEMENT: Notes only editable when status is in_progress
    if (!isNotesEditable(currentStatus)) {
      return NextResponse.json(
        {
          error: `Session notes are read-only locked. Current session status is '${currentStatus}'. Notes can only be modified while session is 'in_progress'.`,
          code: 'NOTES_READ_ONLY_LOCKED',
          current_status: currentStatus,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Upsert session notes in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: notes, error: notesError } = await supabase
          .from('session_notes')
          .upsert({
            session_id: sessionId,
            content,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!notesError && notes) {
          return NextResponse.json({ success: true, notes });
        }
      } catch (dbErr) {
        console.warn('Error upserting Supabase notes:', dbErr);
      }
    }

    // Fallback seed notes store update
    MOCK_NOTES[sessionId] = {
      session_id: sessionId,
      content,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      notes: MOCK_NOTES[sessionId],
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error updating session notes:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
