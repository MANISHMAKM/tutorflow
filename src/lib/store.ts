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

export const MOCK_STUDENT_SOPHIA: StudentProfile = {
  id: 'student-6',
  tutor_id: 'tutor-1',
  name: 'Sophia Chen',
  subject: 'Computer Science & Algorithms',
  current_level: 'Grade 11 / AP CS A',
  learning_goals: [
    'Master Dynamic Programming & Recursion',
    'Build Object-Oriented System Designs',
    'Score 5 on AP Computer Science A Exam',
  ],
  weak_areas: [
    'Recursive call stack tracing',
    'Interface vs Abstract class inheritance',
    'Time complexity analysis (Big-O notation)',
  ],
  user: {
    id: 'student-6',
    role: 'student',
    name: 'Sophia Chen',
    email: 'sophia@tutorflow.com',
  },
};

export const MOCK_STUDENT_MARCUS: StudentProfile = {
  id: 'student-7',
  tutor_id: 'tutor-1',
  name: 'Marcus Vance',
  subject: 'IB Physics HL',
  current_level: 'Grade 12 / IB HL',
  learning_goals: [
    'Master Electromagnetic Induction & Maxwell Equations',
    'Achieve Grade 7 on IB Physics HL Portfolio',
  ],
  weak_areas: [
    'Lenz Law directional vector determination',
    'Quantum wave-particle duality equations',
  ],
  user: {
    id: 'student-7',
    role: 'student',
    name: 'Marcus Vance',
    email: 'marcus@tutorflow.com',
  },
};

export const MOCK_STUDENT_EMMA: StudentProfile = {
  id: 'student-8',
  tutor_id: 'tutor-2',
  name: 'Emma Watson',
  subject: 'Organic Chemistry & Biochemistry',
  current_level: 'Pre-Med / College Prep',
  learning_goals: [
    'Master Reaction Mechanisms (SN1 vs SN2)',
    'Understand Enzyme Catalysis & Kinetics',
  ],
  weak_areas: [
    'Stereochemistry & R/S configuration assignments',
    'Nucleophilic substitution arrow pushing',
  ],
  user: {
    id: 'student-8',
    role: 'student',
    name: 'Emma Watson',
    email: 'emma@tutorflow.com',
  },
};

export const MOCK_STUDENT_DANIEL: StudentProfile = {
  id: 'student-9',
  tutor_id: 'tutor-1',
  name: 'Daniel Kim',
  subject: 'Linear Algebra & Multivariable Calculus',
  current_level: 'College Freshman / AP Math',
  learning_goals: [
    'Master Matrix Eigenvalues & Eigenvectors',
    'Understand Partial Derivatives & Gradient Vectors',
    'Ace Multivariable Calculus Final Exam',
  ],
  weak_areas: [
    'Gram-Schmidt orthogonalization algorithm',
    'Lagrange multiplier constraint setup',
  ],
  user: {
    id: 'student-9',
    role: 'student',
    name: 'Daniel Kim',
    email: 'daniel@tutorflow.com',
  },
};

export const MOCK_STUDENT_CHLOE: StudentProfile = {
  id: 'student-10',
  tutor_id: 'tutor-1',
  name: 'Chloe Dubois',
  subject: 'AP Macroeconomics & Finance',
  current_level: 'Grade 12 / AP Level',
  learning_goals: [
    'Master Aggregate Demand/Supply Curves & Fiscal Policy',
    'Score 5 on AP Macroeconomics Exam',
  ],
  weak_areas: [
    'Money multiplier calculations',
    'Foreign exchange market equilibrium shifts',
  ],
  user: {
    id: 'student-10',
    role: 'student',
    name: 'Chloe Dubois',
    email: 'chloe@tutorflow.com',
  },
};

export const MOCK_STUDENT_ZACK: StudentProfile = {
  id: 'student-11',
  tutor_id: 'tutor-2',
  name: 'Zack Snyder',
  subject: 'AP Microeconomics & Game Theory',
  current_level: 'Grade 11 / AP Level',
  learning_goals: [
    'Master Nash Equilibrium & Payoff Matrices',
    'Understand Monopoly vs Oligopoly Market Structures',
  ],
  weak_areas: [
    'Marginal revenue product calculations',
    'Deadweight loss calculation in price ceilings',
  ],
  user: {
    id: 'student-11',
    role: 'student',
    name: 'Zack Snyder',
    email: 'zack@tutorflow.com',
  },
};

export const MOCK_STUDENT_ARIA: StudentProfile = {
  id: 'student-12',
  tutor_id: 'tutor-2',
  name: 'Aria Tanaka',
  subject: 'Genetics & Molecular Biology',
  current_level: 'Grade 11 / AP Biology',
  learning_goals: [
    'Master DNA Replication & CRISPR Gene Editing',
    'Score 780+ on SAT Biology E/M Test',
  ],
  weak_areas: [
    'Pedigree chart probability calculations',
    'Lac operon gene regulation mechanisms',
  ],
  user: {
    id: 'student-12',
    role: 'student',
    name: 'Aria Tanaka',
    email: 'aria@tutorflow.com',
  },
};

// Combined Student Store
export const MOCK_STUDENTS_LIST: StudentProfile[] = [
  MOCK_STUDENT,
  MOCK_STUDENT_RAHUL,
  MOCK_STUDENT_ANU,
  MOCK_STUDENT_SOPHIA,
  MOCK_STUDENT_MARCUS,
  MOCK_STUDENT_DANIEL,
  MOCK_STUDENT_CHLOE,
  MOCK_STUDENT_MARIA,
  MOCK_STUDENT_PETER,
  MOCK_STUDENT_EMMA,
  MOCK_STUDENT_ZACK,
  MOCK_STUDENT_ARIA,
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
    meeting_link: 'https://meet.google.com/abc-defg-hij',
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
    meeting_link: 'https://meet.google.com/abc-defg-hij',
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
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    student: MOCK_STUDENT,
  },
  {
    id: 'session-104',
    tutor_id: 'tutor-1',
    student_id: 'student-6',
    scheduled_at: new Date(Date.now() + 86400000 * 1).toISOString(),
    duration_minutes: 60,
    topic: 'Recursion, Call Stack Tracing & Binary Tree Traversal',
    status: 'scheduled',
    meeting_link: 'https://meet.google.com/cs-tree-call',
    student: MOCK_STUDENT_SOPHIA,
  },
  {
    id: 'session-105',
    tutor_id: 'tutor-1',
    student_id: 'student-6',
    scheduled_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    duration_minutes: 60,
    topic: 'Object-Oriented Inheritance & Polymorphism in Java',
    status: 'ai_reviewed',
    meeting_link: 'https://meet.google.com/cs-oop-java',
    student: MOCK_STUDENT_SOPHIA,
  },
  {
    id: 'session-106',
    tutor_id: 'tutor-1',
    student_id: 'student-7',
    scheduled_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    duration_minutes: 60,
    topic: 'Electromagnetic Induction & Faraday-Lenz Law Vectors',
    status: 'scheduled',
    meeting_link: 'https://meet.google.com/phys-em-ind',
    student: MOCK_STUDENT_MARCUS,
  },
  {
    id: 'session-107',
    tutor_id: 'tutor-1',
    student_id: 'student-9',
    scheduled_at: new Date(Date.now() + 86400000 * 4).toISOString(),
    duration_minutes: 60,
    topic: 'Eigenvalues, Eigenvectors & Diagonalization Matrix Transformations',
    status: 'scheduled',
    meeting_link: 'https://meet.google.com/math-eigen-diag',
    student: MOCK_STUDENT_DANIEL,
  },
  {
    id: 'session-109',
    tutor_id: 'tutor-1',
    student_id: 'student-10',
    scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    duration_minutes: 60,
    topic: 'Central Bank Monetary Policy & Money Supply Expansion',
    status: 'scheduled',
    meeting_link: 'https://meet.google.com/econ-monetary-policy',
    student: MOCK_STUDENT_CHLOE,
  },
  {
    id: 'session-201',
    tutor_id: 'tutor-2',
    student_id: 'student-4',
    scheduled_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    duration_minutes: 60,
    topic: 'Rotational Dynamics & Moment of Inertia',
    status: 'scheduled',
    meeting_link: 'https://meet.google.com/xyz-uvwx-rst',
    student: MOCK_STUDENT_MARIA,
  },
  {
    id: 'session-202',
    tutor_id: 'tutor-2',
    student_id: 'student-8',
    scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    duration_minutes: 60,
    topic: 'Nucleophilic Substitution Mechanisms (SN1 vs SN2 Kinetics)',
    status: 'scheduled',
    meeting_link: 'https://meet.google.com/chem-sn1-sn2',
    student: MOCK_STUDENT_EMMA,
  },
  {
    id: 'session-203',
    tutor_id: 'tutor-2',
    student_id: 'student-11',
    scheduled_at: new Date(Date.now() + 86400000 * 1).toISOString(),
    duration_minutes: 60,
    topic: 'Game Theory, Prisoner Dilemma & Nash Equilibrium Matrices',
    status: 'scheduled',
    meeting_link: 'https://meet.google.com/econ-game-nash',
    student: MOCK_STUDENT_ZACK,
  },
  {
    id: 'session-204',
    tutor_id: 'tutor-2',
    student_id: 'student-12',
    scheduled_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    duration_minutes: 60,
    topic: 'CRISPR-Cas9 Mechanism & Recombinant DNA Technology',
    status: 'ai_reviewed',
    meeting_link: 'https://meet.google.com/bio-crispr-cas9',
    student: MOCK_STUDENT_ARIA,
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
  'session-105': {
    session_id: 'session-105',
    content: `Reviewed abstract classes vs interfaces in Java. Sophia built a clean animal hierarchy example. Handled method overriding correctly, but needed clarification on default interface methods.`,
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
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
  'session-105': {
    session_id: 'session-105',
    summary: 'Sophia mastered the core differences between interface implementation and abstract class extension. Demonstrates strong OOP architecture skills.',
    homework: [
      { task: 'Java OOP Design Challenge', description: 'Design a PaymentProcessor interface with CreditCard and PayPal implementations.' },
      { task: 'Tracing Exercise', description: 'Trace polymorphism behavior in nested subclass arrays.' },
    ],
    next_focus: 'Recursion Base Cases & Dynamic Memory Allocation',
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
  'session-104': {
    session_id: 'session-104',
    objectives: [
      'Understand recursive call stack execution and stack frame allocation.',
      'Implement binary tree pre-order, in-order, and post-order traversals.',
      'Identify and avoid infinite recursion base case bugs.',
    ],
    lesson_outline: [
      '1. Call Stack Warm-up (10 min): Visualizing factorial(5) execution stack.',
      '2. Binary Tree Setup (15 min): Node structure and recursive subtree traversal logic.',
      '3. Live Coding (25 min): Implementing in-order traversal and calculating tree depth.',
      '4. Exit Ticket (10 min): Tracing a complex recursive tree print method.',
    ],
    practice_questions: [
      'Write a recursive function in Java to find the height of a binary tree given root Node.',
      'Trace the exact call stack order for inOrderTraversal on a 5-node balanced binary search tree.',
      'Convert a recursive Fibonacci implementation into a memoized top-down dynamic programming function.',
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
  {
    id: 'hw-3',
    student_id: 'student-6',
    session_id: 'session-105',
    task: 'Design a PaymentProcessor interface with CreditCard and PayPal implementations',
    completed: false,
  },
  {
    id: 'hw-4',
    student_id: 'student-6',
    session_id: 'session-105',
    task: 'Trace polymorphism behavior in nested subclass arrays',
    completed: true,
  },
];

