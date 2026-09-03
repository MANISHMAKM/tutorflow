import { getAuthUser } from '@/lib/auth-helper';
import { createClient } from '@/lib/supabase/server';
import { UserProfile } from '@/types';
import { MOCK_STUDENTS_LIST, MOCK_SESSIONS, MOCK_HOMEWORK } from '@/lib/store';

export class AuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

/**
 * Ensures user is authenticated via Supabase session.
 * Returns user profile or throws AuthorizationError (401).
 */
export async function requireAuth(): Promise<UserProfile> {
  const user = await getAuthUser();
  if (!user) {
    throw new AuthorizationError('Unauthorized: Authentication required', 401);
  }
  return user;
}

/**
 * Ensures authenticated user has 'tutor' role (403).
 */
export async function requireTutor(): Promise<UserProfile> {
  const user = await requireAuth();
  if (user.role !== 'tutor') {
    throw new AuthorizationError('Forbidden: Tutor access required', 403);
  }
  return user;
}

/**
 * Ensures authenticated user has 'student' role (403).
 */
export async function requireStudent(): Promise<UserProfile> {
  const user = await requireAuth();
  if (user.role !== 'student') {
    throw new AuthorizationError('Forbidden: Student access required', 403);
  }
  return user;
}

import { isSameTutor, isSameStudent } from '@/lib/utils';

/**
 * Verifies authenticated tutor owns the requested student record (403/404).
 */
export async function requireTutorOwnsStudent(studentId: string): Promise<UserProfile> {
  const tutor = await requireTutor();

  try {
    const supabase = await createClient();
    const { data: student, error } = await supabase
      .from('students')
      .select('id, tutor_id')
      .eq('id', studentId)
      .single();

    if (!error && student) {
      if (!isSameTutor(tutor, student.tutor_id)) {
        throw new AuthorizationError('Forbidden: You can only access students assigned to your account', 403);
      }
      return tutor;
    }
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
  }

  const mockStudent = MOCK_STUDENTS_LIST.find(s => isSameStudent(studentId, s.id) || s.id === studentId);
  if (mockStudent) {
    if (!isSameTutor(tutor, mockStudent.tutor_id)) {
      throw new AuthorizationError('Forbidden: You can only access students assigned to your account', 403);
    }
    return tutor;
  }

  throw new AuthorizationError('Student profile not found', 404);
}

/**
 * Verifies authenticated tutor owns the requested session record (403/404).
 */
export async function requireTutorOwnsSession(sessionId: string): Promise<UserProfile> {
  const tutor = await requireTutor();

  try {
    const supabase = await createClient();
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, tutor_id')
      .eq('id', sessionId)
      .single();

    if (!error && session) {
      if (!isSameTutor(tutor, session.tutor_id)) {
        throw new AuthorizationError('Forbidden: You can only manage sessions assigned to your account', 403);
      }
      return tutor;
    }
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
  }

  const mockSession = MOCK_SESSIONS.find(s => s.id === sessionId);
  if (mockSession) {
    if (!isSameTutor(tutor, mockSession.tutor_id)) {
      throw new AuthorizationError('Forbidden: You can only manage sessions assigned to your account', 403);
    }
    return tutor;
  }

  throw new AuthorizationError('Session not found', 404);
}

/**
 * Verifies authenticated student owns the requested session record (403/404).
 */
export async function requireStudentOwnsSession(sessionId: string): Promise<UserProfile> {
  const student = await requireStudent();

  try {
    const supabase = await createClient();
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, student_id')
      .eq('id', sessionId)
      .single();

    if (!error && session) {
      if (!isSameStudent(student, session.student_id)) {
        throw new AuthorizationError('Forbidden: You can only view your own session records', 403);
      }
      return student;
    }
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
  }

  const mockSession = MOCK_SESSIONS.find(s => s.id === sessionId);
  if (mockSession) {
    if (!isSameStudent(student, mockSession.student_id)) {
      throw new AuthorizationError('Forbidden: You can only view your own session records', 403);
    }
    return student;
  }

  throw new AuthorizationError('Session not found', 404);
}

/**
 * Verifies authenticated student owns the requested homework item (403/404).
 */
export async function requireStudentOwnsHomework(homeworkId: string): Promise<UserProfile> {
  const student = await requireStudent();

  try {
    const supabase = await createClient();
    const { data: homework, error } = await supabase
      .from('student_homework')
      .select('id, student_id')
      .eq('id', homeworkId)
      .single();

    if (!error && homework) {
      if (!isSameStudent(student, homework.student_id)) {
        throw new AuthorizationError('Forbidden: You can only update homework assigned to your account', 403);
      }
      return student;
    }
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
  }

  const mockHw = MOCK_HOMEWORK.find(h => h.id === homeworkId);
  if (mockHw) {
    if (!isSameStudent(student, mockHw.student_id)) {
      throw new AuthorizationError('Forbidden: You can only update homework assigned to your account', 403);
    }
    return student;
  }

  throw new AuthorizationError('Homework item not found', 404);
}

