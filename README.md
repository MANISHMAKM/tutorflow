# TutorFlow — 1-on-1 Online Tutoring Platform

**TutorFlow** is a working full-stack MVP session platform for 1-on-1 online tutors and students. Built with **Next.js 16 (App Router)**, **Supabase (PostgreSQL & Auth)**, **Resend SDK**, and **OpenAI API (`gpt-4o-mini`)**, TutorFlow features strict server-side state machine enforcement, double-booking overlap prevention, 1.5s debounced notes autosaving, scoped homework permissions, multi-tutor data isolation, and 3 contextual AI touchpoints with Zod-validated JSON outputs.

---

## 🚀 How to Test (Reviewer Guide)

> [!NOTE]
> **Live Deployed Production URL:** `https://your-vercel-deployment.vercel.app` *(Replace with your live Vercel URL after deployment)*  
> No local environment setup or installation is required for code evaluation. You can test the full end-to-end platform using the seeded Supabase credentials below.

### 🔑 Test Credentials (Seeded Supabase Auth Accounts)

The database includes pre-configured accounts with strict server-side role and data isolation:

| Role | Name | Email | Password | Assigned Students & Isolation Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Tutor 1 (Sarah)** | Dr. Sarah Jenkins | `tutor@tutorflow.com` | `TutorPass123!` | Manages **Alex Johnson**, **Rahul Sharma**, and **Anu Patel**. Isolated from Tutor 2's roster. |
| **Tutor 2 (David)** | Prof. David Vance | `david@tutorflow.com` | `TutorPass123!` | Manages **Maria Garcia** and **Peter Parker**. Isolated from Tutor 1's roster. |
| **Student (Alex)** | Alex Johnson | `student@tutorflow.com` | `Student123!` | Student Portal for **Alex Johnson** (assigned to Tutor 1). Accesses only own sessions, notes, debriefs, and homework. |

---

## 🗄️ Database Schema & Security Controls

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

### Table Definitions
- **`users`**: Extended profile table (`id` UUID PK references auth.users, `role` `'tutor' | 'student'`, `name`, `email`).
- **`students`**: Roster profiles assigned to tutors (`id` UUID PK, `tutor_id` UUID, `name`, `subject`, `current_level`, `learning_goals` text array, `weak_areas` text array).
- **`sessions`**: Scheduled 1-on-1 appointments (`id` UUID PK, `tutor_id` UUID, `student_id` UUID, `scheduled_at` TIMESTAMPTZ, `duration_minutes` INT, `topic` TEXT, `status` `'scheduled' | 'in_progress' | 'completed' | 'ai_reviewed'`).
- **`session_notes`**: 1-to-1 notes table (`session_id` UUID PK, `content` TEXT, `updated_at` TIMESTAMPTZ).
- **`debriefs`**: AI-generated post-session summary (`session_id` UUID PK, `summary` TEXT, `homework` JSONB, `next_focus` TEXT).
- **`session_plans`**: Pre-session lesson plans (`session_id` UUID PK, `objectives` TEXT[], `lesson_outline` TEXT[], `practice_questions` TEXT[]).
- **`student_homework`**: Interactive task checklist (`id` UUID PK, `student_id` UUID, `session_id` UUID, `task` TEXT, `completed` BOOLEAN).

### Server-Side Guards & Security Controls
1. **Strict Session Lifecycle State Machine (`scheduled → in_progress → completed → ai_reviewed`):**
   - Enforced by PostgreSQL trigger [`trg_enforce_session_state`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/schema.sql#L115-L119) and server route guards ([`/api/sessions/[id]/status/route.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/app/api/sessions/[id]/status/route.ts)).
   - Skipping (e.g. `scheduled → completed`) or rewinding is rejected with an explicit **`HTTP 409 Conflict`** response.
2. **Double-Booking Overlap Check:**
   - Enforced by PostgreSQL trigger function `check_tutor_double_booking()` and [`/api/sessions/route.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/app/api/sessions/route.ts).
   - Verifies interval overlap `(scheduled_at < new_end) AND (scheduled_at + duration > new_start)` for the tutor ID, returning **`HTTP 409 Conflict`** on conflict.
3. **Session Notes Read-Only Lock:**
   - Notes are editable via 1.5s debounced PATCH calls ONLY while session status is `'in_progress'`.
   - Once a session transitions to `'completed'` or `'ai_reviewed'`, PostgreSQL trigger `trg_enforce_notes_lock` locks notes against edits (`HTTP 409 Conflict`).
4. **Multi-Tutor Data Isolation & Authorization Guards:**
   - Server-side authorization functions in [`src/lib/auth-guards.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/lib/auth-guards.ts) verify ownership (`requireTutorOwnsStudent`, `requireTutorOwnsSession`, `requireStudentOwnsHomework`). Client-supplied IDs are never trusted.
   - `PATCH /api/homework/[id]` verifies server-side that target homework belongs to the authenticated student (`student_id === authUser.id`), returning **`HTTP 403 Forbidden`** on unauthorized access.

---

## 🤖 AI Prompt Strategy & Resilience

All AI touchpoints utilize real student profile context, produce structured outputs validated by Zod schemas ([`src/lib/ai/service.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/lib/ai/service.ts)), and feature robust failure handling.

### 1. Pre-Session Lesson Plan (`POST /api/ai/plan`)
- **Strategy & Context:** Injects student `subject`, `current_level`, `learning_goals`, `weak_areas`, and past session debrief summaries into system context.
- **Output:** Enforces exactly 3 learning objectives, a 4-point lesson outline, and 3 targeted practice questions with step-by-step solutions using `PreSessionPlanSchema`.

### 2. Post-Session Debrief (`POST /api/ai/debrief`)
- **Strategy & Context:** Injects raw tutor session notes (`session_notes.content`) and student profile.
- **Output:** Synthesizes notes into a concise summary, 2–3 homework tasks (auto-inserted as rows into `student_homework`), and a recommended next focus area (`PostSessionDebriefSchema`). Advances session status `completed → ai_reviewed`.

### 3. Student Progress Summary (`POST /api/ai/progress`)
- **Strategy & Context:** Aggregates past session debriefs across a student's entire timeline to analyze learning velocity and growth trends (`ProgressSummarySchema`).
- **N+1 Optimization:** Avoids query overhead by batch-fetching all student session IDs in a single database query, then querying associated past debriefs in a set-based call (`.in('session_id', sessionIds)`).

### 🛡️ Failure Handling & Retry Architecture
- **Try/Catch Wrapping:** Every OpenAI API call in `src/lib/ai/service.ts` is wrapped in try/catch blocks specifically detecting:
  - **Rate Limit Errors (429):** Formats error message to inform user rate limits were reached.
  - **Connection Timeouts / Network Errors:** Catches timeout/socket failures cleanly.
  - **Zod Validation Mismatch:** Handles non-conforming or malformed JSON payloads.
- **UI Error Boundaries & Retry State:** All frontend AI modals ([`AIPlanModal.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/AIPlanModal.tsx), [`AIDebriefCard.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/AIDebriefCard.tsx), [`AIProgressModal.tsx`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/components/AIProgressModal.tsx)) display a prominent error banner with a dedicated **"Retry Generation"** button, preventing silent failures or blank UI states.

---

## ⚡ Stated Tradeoffs & Assumptions

1. **Dual-Layer Guarding (Database Triggers + Server Guards):** Business rules (state transitions, double-booking, notes lock) are enforced in both PostgreSQL triggers and Next.js server route handlers to guarantee data integrity even during direct database modifications.
2. **1.5s Debounced HTTP PATCH Autosave:** Selected a 1.5s debounced PATCH interval for notes editing to balance low network payload volume, low serverless invocation costs, and reliable read-only lock enforcement.
3. **Structured JSON Mode (`gpt-4o-mini`) + Fallback Generators:** Used OpenAI `gpt-4o-mini` with `response_format: { type: 'json_object' }` for speed and low cost. Contextual fallback generators are integrated so the platform remains 100% functional even when an API key is unconfigured.
4. **Non-Blocking Resend Email Service:** Session creation email dispatch via **Resend SDK** ([`src/lib/email/service.ts`](file:///c:/Users/manis/OneDrive/Desktop/finquo/src/lib/email/service.ts)) is wrapped in async exception handlers so that third-party email outages never roll back session scheduling.

---

## 🔮 What I Would Build Next

With one additional day, I would first integrate real-time collaborative whiteboarding directly into the live session workspace for interactive problem solving. Second, I would build an interactive student homework submission portal allowing students to upload completed assignments for AI pre-grading and tutor review. Third, I would introduce automated SMS and email reminders via Twilio and Resend to minimize student no-shows before scheduled sessions. Fourth, I would implement live audio transcription via the OpenAI Whisper API to automatically generate initial draft session notes directly from session voice recordings. Fifth, I would add tutor scheduling availability calendars and subscription billing analytics powered by Stripe Connect.

---

## 💻 Local Development (Optional)

> [!NOTE]
> This section is optional for contributors who wish to clone and run the project locally.

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and set required credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-key
   RESEND_API_KEY=your-resend-key
   ```

3. **Initialize Database & Seed Data**:
   - Execute [`supabase/schema.sql`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/schema.sql) in your Supabase SQL Editor.
   - Execute [`supabase/seed.sql`](file:///c:/Users/manis/OneDrive/Desktop/finquo/supabase/seed.sql) to populate Auth users and initial rosters.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
