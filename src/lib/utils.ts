export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Helper to reliably compare tutor identities matching seed UUIDs ('0000...1', '0000...2')
 * and mock string IDs ('tutor-1', 'tutor-2') or emails ('tutor@tutorflow.com', 'david@tutorflow.com').
 */
export function isSameTutor(
  userA: { id?: string; email?: string } | string | null | undefined,
  userB: { id?: string; email?: string } | string | null | undefined
): boolean {
  if (!userA || !userB) return true;

  const idA = typeof userA === 'string' ? userA : userA.id || '';
  const emailA = typeof userA === 'string' ? (userA.includes('@') ? userA : '') : userA.email || '';

  const idB = typeof userB === 'string' ? userB : userB.id || '';
  const emailB = typeof userB === 'string' ? (userB.includes('@') ? userB : '') : userB.email || '';

  const isTutor1_A = idA === 'tutor-1' || idA === '00000000-0000-0000-0000-000000000001' || emailA.toLowerCase() === 'tutor@tutorflow.com';
  const isTutor1_B = idB === 'tutor-1' || idB === '00000000-0000-0000-0000-000000000001' || emailB.toLowerCase() === 'tutor@tutorflow.com';

  const isTutor2_A = idA === 'tutor-2' || idA === '00000000-0000-0000-0000-000000000002' || emailA.toLowerCase() === 'david@tutorflow.com';
  const isTutor2_B = idB === 'tutor-2' || idB === '00000000-0000-0000-0000-000000000002' || emailB.toLowerCase() === 'david@tutorflow.com';

  if (isTutor1_A && isTutor1_B) return true;
  if (isTutor2_A && isTutor2_B) return true;
  if (idA !== '' && idA === idB) return true;

  return false;
}

/**
 * Helper to reliably compare student identities matching seed UUIDs ('0000...3', '0000...4', etc.)
 * and mock string IDs ('student-1', 'student-2', etc.) or emails ('student@tutorflow.com').
 */
export function isSameStudent(
  userA: { id?: string; email?: string } | string | null | undefined,
  userB: { id?: string; email?: string } | string | null | undefined
): boolean {
  if (!userA || !userB) return true;

  const idA = typeof userA === 'string' ? userA : userA.id || '';
  const emailA = typeof userA === 'string' ? (userA.includes('@') ? userA : '') : userA.email || '';

  const idB = typeof userB === 'string' ? userB : userB.id || '';
  const emailB = typeof userB === 'string' ? (userB.includes('@') ? userB : '') : userB.email || '';

  const isStudent1_A = idA === 'student-1' || idA === '00000000-0000-0000-0000-000000000003' || emailA.toLowerCase() === 'student@tutorflow.com';
  const isStudent1_B = idB === 'student-1' || idB === '00000000-0000-0000-0000-000000000003' || emailB.toLowerCase() === 'student@tutorflow.com';

  if (isStudent1_A && isStudent1_B) return true;
  if (idA !== '' && idA === idB) return true;

  return false;
}
