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
  if (!userA || !userB) return false;

  const idA = typeof userA === 'string' ? userA : userA.id || '';
  const emailA = typeof userA === 'string' ? (userA.includes('@') ? userA : '') : userA.email || '';

  const idB = typeof userB === 'string' ? userB : userB.id || '';
  const emailB = typeof userB === 'string' ? (userB.includes('@') ? userB : '') : userB.email || '';

  const isT1_A = idA === 'tutor-1' || idA === '00000000-0000-0000-0000-000000000001' || emailA.toLowerCase() === 'tutor@tutorflow.com';
  const isT1_B = idB === 'tutor-1' || idB === '00000000-0000-0000-0000-000000000001' || emailB.toLowerCase() === 'tutor@tutorflow.com';

  const isT2_A = idA === 'tutor-2' || idA === '00000000-0000-0000-0000-000000000002' || emailA.toLowerCase() === 'david@tutorflow.com';
  const isT2_B = idB === 'tutor-2' || idB === '00000000-0000-0000-0000-000000000002' || emailB.toLowerCase() === 'david@tutorflow.com';

  if (isT1_A && (isT1_B || !idB || idB === 'tutor-1' || idB === '00000000-0000-0000-0000-000000000001')) return true;
  if (isT1_B && (isT1_A || !idA || idA === 'tutor-1' || idA === '00000000-0000-0000-0000-000000000001')) return true;

  if (isT2_A && (isT2_B || !idB || idB === 'tutor-2' || idB === '00000000-0000-0000-0000-000000000002')) return true;
  if (isT2_B && (isT2_A || !idA || idA === 'tutor-2' || idA === '00000000-0000-0000-0000-000000000002')) return true;

  if (idA !== '' && idA === idB) return true;
  if (emailA !== '' && emailA.toLowerCase() === emailB.toLowerCase()) return true;

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
  if (!userA || !userB) return false;

  const idA = typeof userA === 'string' ? userA : userA.id || '';
  const emailA = typeof userA === 'string' ? (userA.includes('@') ? userA : '') : userA.email || '';

  const idB = typeof userB === 'string' ? userB : userB.id || '';
  const emailB = typeof userB === 'string' ? (userB.includes('@') ? userB : '') : userB.email || '';

  // Student 1 (Alex Johnson)
  const isS1_A = idA === 'student-1' || idA === '00000000-0000-0000-0000-000000000003' || emailA.toLowerCase() === 'student@tutorflow.com';
  const isS1_B = idB === 'student-1' || idB === '00000000-0000-0000-0000-000000000003' || emailB.toLowerCase() === 'student@tutorflow.com';
  if (isS1_A && isS1_B) return true;

  // Student 2 (Rahul Sharma)
  const isS2_A = idA === 'student-2' || idA === '00000000-0000-0000-0000-000000000004' || emailA.toLowerCase() === 'rahul@tutorflow.com';
  const isS2_B = idB === 'student-2' || idB === '00000000-0000-0000-0000-000000000004' || emailB.toLowerCase() === 'rahul@tutorflow.com';
  if (isS2_A && isS2_B) return true;

  // Student 3 (Anu Patel)
  const isS3_A = idA === 'student-3' || idA === '00000000-0000-0000-0000-000000000005' || emailA.toLowerCase() === 'anu@tutorflow.com';
  const isS3_B = idB === 'student-3' || idB === '00000000-0000-0000-0000-000000000005' || emailB.toLowerCase() === 'anu@tutorflow.com';
  if (isS3_A && isS3_B) return true;

  // Student 4 (Maria Garcia)
  const isS4_A = idA === 'student-4' || idA === '00000000-0000-0000-0000-000000000006' || emailA.toLowerCase() === 'maria@tutorflow.com';
  const isS4_B = idB === 'student-4' || idB === '00000000-0000-0000-0000-000000000006' || emailB.toLowerCase() === 'maria@tutorflow.com';
  if (isS4_A && isS4_B) return true;

  // Student 5 (Peter Parker)
  const isS5_A = idA === 'student-5' || idA === '00000000-0000-0000-0000-000000000007' || emailA.toLowerCase() === 'peter@tutorflow.com';
  const isS5_B = idB === 'student-5' || idB === '00000000-0000-0000-0000-000000000007' || emailB.toLowerCase() === 'peter@tutorflow.com';
  if (isS5_A && isS5_B) return true;

  if (idA !== '' && idA === idB) return true;

  return false;
}
