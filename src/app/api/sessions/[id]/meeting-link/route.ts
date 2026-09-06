import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTutorOwnsSession, AuthorizationError } from '@/lib/auth-guards';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_SESSIONS } from '@/lib/store';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const { meeting_link } = body as { meeting_link: string };

    if (typeof meeting_link !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid meeting_link string' }, { status: 400 });
    }

    // Require tutor ownership of session
    await requireTutorOwnsSession(sessionId);

    const formattedLink = meeting_link.trim();

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: updatedSession, error: updateError } = await supabase
          .from('sessions')
          .update({ meeting_link: formattedLink })
          .eq('id', sessionId)
          .select()
          .single();

        if (!updateError && updatedSession) {
          return NextResponse.json({ success: true, session: updatedSession });
        }
      } catch (err) {
        console.warn('Error updating Supabase session meeting link:', err);
      }
    }

    // Fallback in-memory update
    const mockS = MOCK_SESSIONS.find(s => s.id === sessionId);
    if (mockS) {
      mockS.meeting_link = formattedLink;
    }

    return NextResponse.json({
      success: true,
      session: mockS ? { ...mockS, meeting_link: formattedLink } : { id: sessionId, meeting_link: formattedLink },
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error updating meeting link:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
