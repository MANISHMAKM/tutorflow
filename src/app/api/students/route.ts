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

    let dbStudents: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: students, error } = await supabase
          .from('students')
          .select('*')
          .eq('tutor_id', tutor.id)
          .order('created_at', { ascending: false });

        if (!error && students) {
          dbStudents = students;
        } else if (error) {
          console.warn(`[DB WARNING] Supabase students query error: ${error.message}`);
        }
      } catch (dbErr) {
        console.warn('Supabase students query caught error:', dbErr);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ students: dbStudents });
    }

    const dbIds = new Set(dbStudents.map(s => s.id));
    const fallback = MOCK_STUDENTS_LIST.filter(s => isSameTutor(tutor, s.tutor_id) && !dbIds.has(s.id));
    
    return NextResponse.json({ students: [...dbStudents, ...fallback] });
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

