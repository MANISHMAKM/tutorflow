import { StudentProfile, Session, SessionNotes, Debrief, SessionPlan, StudentHomeworkItem, UserProfile } from '@/types';

// Seed Tutors for Data Isolation Demonstration
export const MOCK_TUTOR: UserProfile = {
  id: 'tutor-1',
  role: 'tutor',
  name: 'Dr. Sarah Jenkins (Tutor John)',
  email: 'tutor@tutorflow.com',
};

export const MOCK_TUTOR_2: UserProfile = {
  id: 'tutor-2',
  role: 'tutor',
  name: 'Prof. David Vance (Tutor David)',
  email: 'david@tutorflow.com',
};

// Seed Students for Tutor 1 (Dr. Sarah Jenkins / John)
export const MOCK_STUDENT_USER: UserProfile = {
  id: 'student-1',
  role: 'student',
  name: 'Alex Johnson',
  email: 'student@tutorflow.com',
};

export const MOCK_STUDENT: StudentProfile = {
  id: 'student-1',
  tutor_id: 'tutor-1',
  name: 'Alex Johnson',
  subject: 'Mathematics & Physics',
  current_level: 'Grade 11 / AP Level',
  learning_goals: [
    'Score 750+ on SAT Math section',
    'Master Kinematics & Quadratic Optimization',
    'Build problem-solving confidence for exams',
  ],
  weak_areas: [
    'Factoring complex polynomials',
    'Kinematic equation selection under timed conditions',
    'Word problem translation into systems of equations',
  ],
  user: MOCK_STUDENT_USER,
};

export const MOCK_STUDENT_RAHUL: StudentProfile = {
  id: 'student-2',
  tutor_id: 'tutor-1',
  name: 'Rahul Sharma',
  subject: 'Calculus AB',
  current_level: 'Grade 12 / AP',
  learning_goals: ['Master Derivatives & Integrals', 'Score 5 on AP Calculus Exam'],
  weak_areas: ['Chain rule substitution', 'Integration by parts'],
  user: {
    id: 'student-2',
    role: 'student',
    name: 'Rahul Sharma',
    email: 'rahul@tutorflow.com',
  },
};

export const MOCK_STUDENT_ANU: StudentProfile = {
  id: 'student-3',
  tutor_id: 'tutor-1',
  name: 'Anu Patel',
  subject: 'Algebra II',
  current_level: 'Grade 10',
  learning_goals: ['Build strong foundation in linear functions', 'Improve test speed'],
  weak_areas: ['Matrix multiplication', 'Logarithmic properties'],
  user: {
    id: 'student-3',
    role: 'student',
    name: 'Anu Patel',
    email: 'anu@tutorflow.com',
  },
};

// Seed Students for Tutor 2 (Prof. David Vance / David)
export const MOCK_STUDENT_MARIA: StudentProfile = {
  id: 'student-4',
  tutor_id: 'tutor-2',
  name: 'Maria Garcia',
  subject: 'AP Physics C',
  current_level: 'Grade 12',
  learning_goals: ['Master Rotational Mechanics', 'Prepare for Physics Olympiad'],
  weak_areas: ['Angular momentum conservation', 'Torque calculations'],
  user: {
    id: 'student-4',
    role: 'student',
    name: 'Maria Garcia',
    email: 'maria@tutorflow.com',
  },
};

export const MOCK_STUDENT_PETER: StudentProfile = {
  id: 'student-5',
  tutor_id: 'tutor-2',
  name: 'Peter Parker',
  subject: 'Chemistry & Biology',
  current_level: 'Grade 11',
  learning_goals: ['Score 780+ on SAT Subject Test', 'Master Organic Chemistry'],
  weak_areas: ['Stoichiometry', 'Reaction kinetics'],
  user: {
    id: 'student-5',
    role: 'student',
    name: 'Peter Parker',
    email: 'peter@tutorflow.com',
  },
};

// Combined Student Store
export const MOCK_STUDENTS_LIST: StudentProfile[] = [
  MOCK_STUDENT,
  MOCK_STUDENT_RAHUL,
  MOCK_STUDENT_ANU,
  MOCK_STUDENT_MARIA,
  MOCK_STUDENT_PETER,
];

export const MOCK_SESSIONS: Session[] = [
  {
    id: 'session-101',
    tutor_id: 'tutor-1',
    student_id: 'student-1',
    scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    duration_minutes: 60,
    topic: 'Quadratic Optimization & Vertex Form Applications',
    status: 'scheduled',
    student: MOCK_STUDENT,
  },
  {
    id: 'session-102',
    tutor_id: 'tutor-1',
    student_id: 'student-1',
    scheduled_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    duration_minutes: 60,
    topic: 'Polynomial Factoring & Synthetic Division',
    status: 'completed',
    student: MOCK_STUDENT,
  },
  {
    id: 'session-103',
    tutor_id: 'tutor-1',
    student_id: 'student-1',
    scheduled_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    duration_minutes: 60,
    topic: 'Introduction to Kinematics & Motion Graphs',
    status: 'ai_reviewed',
    student: MOCK_STUDENT,
  },
  {
    id: 'session-201',
    tutor_id: 'tutor-2',
    student_id: 'student-4',
    scheduled_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    duration_minutes: 60,
    topic: 'Rotational Dynamics & Moment of Inertia',
    status: 'scheduled',
    student: MOCK_STUDENT_MARIA,
  },
];

export const MOCK_NOTES: Record<string, SessionNotes> = {
  'session-102': {
    session_id: 'session-102',
    content: `Covered synthetic division vs polynomial long division. Alex initially struggled with negative remainder sign changes. Solved 4 example problems together. Alex correctly identified rational roots test rule on final practice set.`,
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  'session-103': {
    session_id: 'session-103',
    content: `Introduced 1D kinematics equations (v = u + at, s = ut + 0.5at^2). Analyzed velocity-time graphs. Alex excelled at slope calculation but required guidance setting up acceleration equations.`,
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
};

export const MOCK_DEBRIEFS: Record<string, Debrief> = {
  'session-103': {
    session_id: 'session-103',
    summary: 'Alex demonstrated strong mathematical intuition when interpreting velocity-time graphs. Foundation established for 1D kinematic motion equations.',
    homework: [
      { task: 'Kinematics Practice Sheet #2', description: 'Solve problems 1 through 5 on constant acceleration.' },
      { task: 'Graphing Challenge', description: 'Sketch position vs time graph from given velocity profile.' },
    ],
    next_focus: '2D Projectile Motion & Vector Resolution',
  },
};

export const MOCK_PLANS: Record<string, SessionPlan> = {
  'session-101': {
    session_id: 'session-101',
    objectives: [
      'Understand vertex form f(x) = a(x-h)^2 + k and its geometric transformations.',
      'Apply vertex formula to maximum/minimum real-world optimization problems.',
      'Solve 3 exam-style SAT quadratic word problems.',
    ],
    lesson_outline: [
      '1. Diagnostic (10 min): Review completing the square on simple quadratics.',
      '2. Concept Breakdown (15 min): Deriving vertex coordinates (h, k) and parabola axis of symmetry.',
      '3. Guided Optimization (20 min): Solving real-world revenue and projectile vertex problems.',
      '4. Exit Challenge (15 min): Independent timed problem solving.',
    ],
    practice_questions: [
      'Find the vertex and max height for h(t) = -16t^2 + 64t + 80.',
      'Convert f(x) = 2x^2 - 12x + 11 into vertex form.',
      'A company model shows Profit P(x) = -5x^2 + 200x - 1000. Find production quantity x for max profit.',
    ],
  },
};

export const MOCK_HOMEWORK: StudentHomeworkItem[] = [
  {
    id: 'hw-1',
    student_id: 'student-1',
    session_id: 'session-103',
    task: 'Kinematics Practice Sheet #2 (Problems 1-5)',
    completed: true,
  },
  {
    id: 'hw-2',
    student_id: 'student-1',
    session_id: 'session-103',
    task: 'Sketch position vs time graph from given velocity profile',
    completed: false,
  },
];
