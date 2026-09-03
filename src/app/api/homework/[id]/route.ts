import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireStudentOwnsHomework, AuthorizationError } from '@/lib/auth-guards';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: homeworkId } = await params;
    const body = await req.json();
    const { completed } = body;

    if (completed === undefined) {
      return NextResponse.json({ error: 'Missing completed status field' }, { status: 400 });
    }

    // Require student ownership server-side (403 Forbidden if wrong student)
    await requireStudentOwnsHomework(homeworkId);

    const supabase = await createClient();
    const { data: updatedItem, error } = await supabase
      .from('student_homework')
      .update({ completed })
      .eq('id', homeworkId)
      .select()
      .single();

    if (error) {
      console.error('Error updating student homework:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      homework: updatedItem,
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error updating student homework:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
