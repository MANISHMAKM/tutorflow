# TutorFlow — 1-on-1 Online Tutoring Platform

**TutorFlow** is a full-stack MVP session management platform for 1-on-1 online tutors and students. Built with **Next.js 16 (App Router)**, **Supabase (PostgreSQL & Auth)**, **Resend SDK**, and **Google Gemini API (`gemini-1.5-flash`)**, TutorFlow features strict server-side state machine enforcement, double-booking overlap prevention, 1.5s debounced notes autosaving, scoped homework permissions, multi-tutor data isolation, and 3 contextual AI touchpoints with Zod-validated JSON outputs.

- **Live Production URL:** [https://tutorflow-theta.vercel.app](https://tutorflow-theta.vercel.app)
- **GitHub Repository:** [https://github.com/MANISHMAKM/tutorflow.git](https://github.com/MANISHMAKM/tutorflow.git)

---

## 🔑 1. Test Credentials (Seeded Supabase Auth Accounts)

The database includes pre-configured accounts with strict server-side role and data isolation:

| Role | Name | Email | Password | Assigned Students & Isolation Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Tutor 1 (Sarah)** | Dr. Sarah Jenkins | `tutor@tutorflow.com` | `TutorPass123!` | Manages **Alex Johnson**, **Rahul Sharma**, **Anu Patel**, **Sophia Chen** (AP CS), and **Marcus Vance** (IB Physics HL). Isolated from Tutor 2's roster. |
| **Tutor 2 (David)** | Prof. David Vance | `david@tutorflow.com` | `TutorPass123!` | Manages **Maria Garcia**, **Peter Parker**, and **Emma Watson** (Organic Chemistry). Isolated from Tutor 1's roster. |
| **Student (Alex)** | Alex Johnson | `student@tutorflow.com` | `Student123!` | Student Portal for **Alex Johnson** (assigned to Tutor 1). Accesses only own sessions, notes, debriefs, and homework. |


---

## 🛠️ 2. Tech Stack & Environment Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.3** (App Router, React 19) | Server components, route handlers, dynamic pages |
| **Database & Auth** | **Supabase (PostgreSQL & SSR)** | User authentication, RLS security policies, PL/pgSQL triggers |
| **AI Integration** | **Google Gemini API (`gemini-1.5-flash`)** | Contextual JSON generation for lesson plans, debriefs, and progress reports |
| **Schema Validation** | **Zod (`^4.5.4`)** | Strict runtime validation of AI outputs and API request bodies |
| **Email Service** | **Resend SDK (`^4.1.2`)** | Transactional email notifications upon session scheduling |
| **Styling** | **Tailwind CSS v4** + Lucide React | Modern dark mode UI components and state indicators |

### Environment Variables (`.env.local` / `.env.example`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
```

---

## 🗄️ 3. Database Schema, Relationships & RLS Security Design

The database schema is defined in [`supabase/schema.sql`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/schema.sql) and seeded via [`supabase/seed.sql`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/seed.sql).

```
+----------------+       +-------------------+       +-----------------------+
|  auth.users    | ----> |   public.users    | ----> |    public.students    |
+----------------+       +-------------------+       +-----------------------+
                                  |                              |
                                  v                              v
                         +-----------------------------------------------+
                         |               public.sessions                 |
                         +-----------------------------------------------+
                           |                 |                 |                  |
                           v                 v                 v                  v
                   +---------------+  +-------------+  +------------------+  +------------------+
                   | session_notes |  |  debriefs   |  |  session_plans   |  | student_homework |
                   +---------------+  +-------------+  +------------------+  +------------------+
```

### Table Definitions & Relationships
- **`users`**: Extends `auth.users` (`id` UUID PK, `role` `'tutor' | 'student'`, `name`, `email`).
- **`students`**: Roster profiles assigned to tutors (`id` UUID PK, `tutor_id` UUID references `users.id`, `name`, `subject`, `current_level`, `learning_goals` TEXT[], `weak_areas` TEXT[]).
- **`sessions`**: Scheduled 1-on-1 appointments (`id` UUID PK, `tutor_id` UUID references `users.id`, `student_id` UUID references `students.id`, `scheduled_at` TIMESTAMPTZ, `duration_minutes` INT, `topic` TEXT, `status` `'scheduled' | 'in_progress' | 'completed' | 'ai_reviewed'`).
- **`session_notes`**: 1-to-1 notes table (`session_id` UUID PK references `sessions.id`, `content` TEXT, `updated_at` TIMESTAMPTZ).
- **`debriefs`**: AI-generated post-session summary (`session_id` UUID PK references `sessions.id`, `summary` TEXT, `homework` JSONB, `next_focus` TEXT).
- **`session_plans`**: Pre-session lesson plans (`session_id` UUID PK references `sessions.id`, `objectives` TEXT[], `lesson_outline` TEXT[], `practice_questions` TEXT[]).
- **`student_homework`**: Interactive task checklist (`id` UUID PK, `student_id` UUID references `students.id`, `session_id` UUID references `sessions.id`, `task` TEXT, `completed` BOOLEAN).

### Authentication & Authorization/RLS Design
- **Authentication**: Powered by Supabase Auth with server-side cookie sessions ([`src/lib/auth-helper.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/lib/auth-helper.ts)). No public student signup exists; student accounts are generated exclusively by authenticated tutors.
- **Authorization Guards**: Server-side guards in [`src/lib/auth-guards.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/lib/auth-guards.ts) enforce ownership checks (`requireTutor`, `requireStudent`, `requireTutorOwnsStudent`, `requireTutorOwnsSession`, `requireStudentOwnsHomework`). Client-supplied IDs are never trusted.
- **Row Level Security (RLS)**: PostgreSQL RLS policies in [`supabase/schema.sql`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/schema.sql#L188-L258) restrict read/write access so Tutors can only access their assigned students/sessions, and Students can only view their own assigned data. `PATCH /api/homework/[id]` verifies `student_id === authUser.id`, returning **`HTTP 403 Forbidden`** on cross-student edit attempts.

---

## ⚡ 4. Core Business Rules & System Strategies

### A. Session State Machine Strategy
The lifecycle strictly follows a linear 4-stage sequence:
`scheduled` → `in_progress` → `completed` → `ai_reviewed`
- **Dual Enforcement**: Checked by PostgreSQL trigger [`trg_enforce_session_state`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/schema.sql#L90-L119) and server validation [`validateStateTransition()`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/lib/state-machine.ts#L23-L43).
- Any skipping (e.g. `scheduled → completed`) or rewinding returns **`HTTP 409 Conflict`**.

### B. Double-Booking Overlap Strategy
- Verifies tutor schedule overlap using interval math:
  `(newStart < existingEnd) AND (newEnd > existingStart)`
- Enforced at database trigger level (`trg_check_double_booking`) and server route level ([`/api/sessions/route.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/app/api/sessions/route.ts)), returning **`HTTP 409 Conflict`** on scheduling collisions.

### C. Notes Autosave & Lock Strategy
- **1.5s Debounced Autosave**: [`NotesEditor.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/NotesEditor.tsx) uses a 1.5s debounced HTTP PATCH trigger to minimize serverless payload overhead.
- **Read-Only Lock**: Notes are editable ONLY during `in_progress`. Once session transitions to `completed` or `ai_reviewed`, PostgreSQL trigger `trg_enforce_notes_lock` and route guard reject note edits with **`HTTP 409 Conflict`**.

---

## 🤖 5. AI Prompt Strategy & Contextual Rationale

All AI touchpoints in [`src/lib/ai/service.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/lib/ai/service.ts) use Google Gemini API (`gemini-1.5-flash`) with real student profile data rather than generic prompts:

### Why AI is Contextual Rather Than Generic
Generic LLM prompts produce repetitive, one-size-fits-all lesson plans and summaries. By injecting student `subject`, `current_level`, `learning_goals`, `weak_areas`, and previous session history into the system prompt context, the AI functions as a true personalized pedagogical assistant.

1. **AI Pre-Session Plan (`POST /api/ai/plan`)**: Contextualized with student profile + past debriefs. Outputs exactly 3 learning objectives, 4-point outline, and 3 targeted practice questions with solutions using `PreSessionPlanSchema`.
2. **AI Post-Session Debrief (`POST /api/ai/debrief`)**: Injects raw tutor notes + student profile. Synthesizes concise summary, 2–3 homework tasks (inserted into `student_homework`), and next focus (`PostSessionDebriefSchema`). Session advances to `ai_reviewed` ONLY after successful AI generation and DB persistence.
3. **AI Progress Summary (`POST /api/ai/progress`)**: Evaluates learning velocity across all historical debriefs. Uses set-based batch querying (`.in('session_id', sessionIds)`) to eliminate $N+1$ query performance degradation.

### Failure & Resilience Handling
If `GEMINI_API_KEY` is unconfigured, rate-limited, timed out, or produces schema validation errors, the service logs the exception and returns a deterministic, high-quality fallback template. The frontend modals ([`AIPlanModal.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/AIPlanModal.tsx), [`AIDebriefCard.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/AIDebriefCard.tsx), [`AIProgressModal.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/AIProgressModal.tsx)) receive structured data seamlessly.

---

## ⚖️ 6. Architectural Decisions & Tradeoffs

1. **No Open Public Registration**: Public self-registration forms are intentionally excluded from the login interface ([`src/app/login/page.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/app/login/page.tsx)). Student accounts are generated exclusively by authenticated tutors via [`POST /api/auth/student`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/app/api/auth/student/route.ts) under their own `tutor_id`. This guarantees strict data privacy and prevents unmanaged accounts.
2. **Structured Array Data (`TEXT[]`) for Goals & Weak Areas**: `learning_goals` and `weak_areas` are stored as PostgreSQL `TEXT[]` arrays in `public.students`. This structured storage enables bulleted rendering in the UI and precise list formatting in OpenAI system prompts, while [`NewStudentModal.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/NewStudentModal.tsx) parses free-text comma-separated user inputs into array elements seamlessly.
3. **Dual-Layer Guarding (Database Triggers + Server Guards)**: State machine transitions, double-booking checks, and notes read-only locks are checked in both PostgreSQL PL/pgSQL triggers and Next.js route handlers to guarantee 100% data integrity even during direct DB operations.
4. **1.5s Debounced HTTP PATCH Autosave**: Selected a 1.5s debounced PATCH interval to balance low network payload volume, low serverless invocation costs, and reliable read-only lock enforcement.
5. **Extra Scope Features (Video Links & Email)**: Added integrated Google Meet/Zoom meeting links (with generator helpers) and Resend transactional email dispatches beyond the minimum requirements to provide a complete real-world user experience.

---

## 🔮 7. What I Would Build Next

With one additional day, I would first integrate real-time collaborative whiteboarding directly into the live session workspace for interactive problem solving. Second, I would build an interactive student homework submission portal allowing students to upload completed assignments for AI pre-grading and tutor review. Third, I would introduce automated SMS and email reminders via Twilio and Resend to minimize student no-shows before scheduled sessions. Fourth, I would implement live audio transcription via the OpenAI Whisper API to automatically generate initial draft session notes directly from session voice recordings. Fifth, I would add tutor scheduling availability calendars and subscription billing analytics powered by Stripe Connect.

---

## 💻 8. Local Development Instructions (Optional)

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and set required credentials.
3. **Initialize Database & Seed Data**:
   - Execute [`supabase/schema.sql`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/schema.sql) in your Supabase SQL Editor.
   - Execute [`supabase/seed.sql`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/seed.sql) to populate seed accounts.
4. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

## 📝 9. Tutor Workspace Audit & Fixes (Changelog)

- **Backend Triage & Identity Matching (`src/lib/utils.ts`, `src/lib/auth-helper.ts`)**:
  - **Root Cause**: `isSameTutor` and `isSameStudent` contained a check (`if (!userA || !userB) return true`) that returned `true` on `null`/`undefined` arguments, causing unintended ownership validation bypasses. In addition, `getAuthUser()` previously did not fallback to checking `public.users` by email if auth user ID differed from seed UUIDs.
  - **Fix**: Updated `isSameTutor` and `isSameStudent` to evaluate `if (!userA || !userB) return false`. Enhanced `getAuthUser()` to perform secondary email lookup in `public.users` and correctly default `role` to `'student'` for student accounts.
- **Session Workspace Authorization (`src/app/tutor/sessions/[id]/page.tsx`)**:
  - **Root Cause**: The workspace checked only tutor ownership (`isSameTutor`), blocking legitimate student access to their assigned sessions with a generic access denied error.
  - **Fix**: Updated workspace authorization to check role-specific ownership (`isSameStudent` for students, `isSameTutor` for tutors). Allowed assigned students (`student@tutorflow.com`) to view their session details in read-only mode, while denying access (`HTTP 403 / Access Denied`) if a student attempts to open another student's session (e.g. Maria Garcia `student-4` or Rahul Sharma `student-2`).
- **Student Dashboard Query & Homework Persistence (`src/app/api/sessions/route.ts`, `src/app/api/homework/[id]/route.ts`)**:
  - **Root Cause**: Student session query did not resolve dynamic student record IDs when auth user IDs differed, returning zero sessions. `PATCH /api/homework/[id]` threw an uncaught error when Supabase environment variables were unconfigured.
  - **Fix**: Updated `GET /api/sessions` to resolve student IDs via `public.students` table lookup. Added `isSupabaseConfigured()` check and fallback store persistence to `PATCH /api/homework/[id]`.
- **AI Progress Authorization Guard (`src/app/api/ai/progress/route.ts`)**:
  - **Root Cause**: `POST /api/ai/progress` validated general authentication (`requireAuth()`) but lacked student/tutor ownership verification.
  - **Fix**: Added explicit ownership guards (`requireTutorOwnsStudent` for tutors, `isSameStudent` for students) to prevent cross-account progress summary access.

