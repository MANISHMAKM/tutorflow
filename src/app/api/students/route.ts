import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTutor, AuthorizationError } from '@/lib/auth-guards';
import { isSupabaseConfigured } from '@/lib/auth-helper';
import { MOCK_STUDENTS_LIST } from '@/lib/store';

import { isSameTutor } from '@/lib/utils';

export async function GET() {
  try {
    const tutor = await requireTutor();

    console.log(`[AUTH LOG] GET /api/students for tutor: id=${tutor.id}, email=${tutor.email}`);

    if (!isSupabaseConfigured()) {
      const fallback = MOCK_STUDENTS_LIST.filter(s => isSameTutor(tutor, s.tutor_id));
      return NextResponse.json({ students: fallback });
    }

    try {
      const supabase = await createClient();
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('tutor_id', tutor.id)
        .order('created_at', { ascending: false });

      if (!error && students && students.length > 0) {
        return NextResponse.json({ students });
      }
      if (error) {
        console.warn(`[DB WARNING] Supabase students query error: ${error.message}`);
      }
    } catch (dbErr) {
      console.warn('Supabase students query caught error, returning seed fallback:', dbErr);
    }

    const fallback = MOCK_STUDENTS_LIST.filter(s => isSameTutor(tutor, s.tutor_id));
    return NextResponse.json({ students: fallback });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

