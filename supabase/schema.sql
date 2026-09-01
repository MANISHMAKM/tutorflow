-- TutorFlow Database Schema & Security Script
-- Execute this script in your Supabase SQL Editor

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('tutor', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'ai_reviewed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Public Users Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Student Profiles Table (Managed by Tutors)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  current_level TEXT NOT NULL,
  learning_goals TEXT[] DEFAULT '{}',
  weak_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  topic TEXT NOT NULL,
  status session_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Session Notes Table (One row per session)
CREATE TABLE IF NOT EXISTS public.session_notes (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Debriefs Table (Post-session AI output)
CREATE TABLE IF NOT EXISTS public.debriefs (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  homework JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_focus TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Pre-Session Plans Table (Pre-session AI output)
CREATE TABLE IF NOT EXISTS public.session_plans (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  objectives TEXT[] NOT NULL DEFAULT '{}',
  lesson_outline TEXT[] NOT NULL DEFAULT '{}',
  practice_questions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Student Homework Status Table (Interactive checklist)
CREATE TABLE IF NOT EXISTS public.student_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- GUARD FUNCTIONS & TRIGGERS
--------------------------------------------------------------------------------

-- Guard 1: Strict Session State Machine Enforcement
CREATE OR REPLACE FUNCTION enforce_session_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is not changing, allow update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Allowed Transitions:
  -- scheduled -> in_progress
  -- in_progress -> completed
  -- completed -> ai_reviewed
  IF OLD.status = 'scheduled' AND NEW.status = 'in_progress' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    RETURN NEW;
  ELSIF OLD.status = 'completed' AND NEW.status = 'ai_reviewed' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid session state transition from % to %. Status must follow: scheduled -> in_progress -> completed -> ai_reviewed.', OLD.status, NEW.status
      USING ERRCODE = '22000'; -- Custom state conflict code mapped to 409 Conflict
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_session_state ON public.sessions;
CREATE TRIGGER trg_enforce_session_state
  BEFORE UPDATE OF status ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_session_state_transition();


-- Guard 2: No Double-Booking Overlap Prevention Function
CREATE OR REPLACE FUNCTION check_tutor_double_booking()
RETURNS TRIGGER AS $$
DECLARE
  new_end TIMESTAMPTZ;
  overlap_count INT;
BEGIN
  new_end := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::INTERVAL;

  SELECT COUNT(*) INTO overlap_count
  FROM public.sessions
  WHERE tutor_id = NEW.tutor_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- Check time overlap: (StartA < EndB) AND (EndA > StartB)
      scheduled_at < new_end
      AND (scheduled_at + (duration_minutes || ' minutes')::INTERVAL) > NEW.scheduled_at
    );

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Double-booking detected! Tutor is already booked during the requested time slot (%).', NEW.scheduled_at
      USING ERRCODE = '23P01'; -- Exclusion violation code
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_double_booking ON public.sessions;
CREATE TRIGGER trg_check_double_booking
  BEFORE INSERT OR UPDATE OF scheduled_at, duration_minutes ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION check_tutor_double_booking();


-- Guard 3: Notes Read-Only when not in_progress
CREATE OR REPLACE FUNCTION enforce_notes_in_progress_only()
RETURNS TRIGGER AS $$
DECLARE
  current_status session_status;
BEGIN
  SELECT status INTO current_status
  FROM public.sessions
  WHERE id = NEW.session_id;

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Session does not exist.';
  END IF;

  IF current_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Session notes can only be modified while session is in_progress (current status: %).', current_status
      USING ERRCODE = '22000';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_notes_lock ON public.session_notes;
CREATE TRIGGER trg_enforce_notes_lock
  BEFORE INSERT OR UPDATE ON public.session_notes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_notes_in_progress_only();

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_homework ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Users viewable by self or tutor of student" ON public.users
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.students WHERE id = public.users.id AND tutor_id = auth.uid()
  ));

CREATE POLICY "Users updateable by self" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 2. Students policies
CREATE POLICY "Tutors manage their own students" ON public.students
  FOR ALL USING (auth.uid() = tutor_id);

CREATE POLICY "Students view their own profile" ON public.students
  FOR SELECT USING (auth.uid() = id);

-- 3. Sessions policies
CREATE POLICY "Tutors manage their sessions" ON public.sessions
  FOR ALL USING (auth.uid() = tutor_id);

CREATE POLICY "Students view their sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = student_id);

-- 4. Session Notes policies
CREATE POLICY "Tutors manage notes for their sessions" ON public.session_notes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sessions WHERE id = public.session_notes.session_id AND tutor_id = auth.uid()
  ));

CREATE POLICY "Students view notes for their completed/ai_reviewed sessions" ON public.session_notes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sessions WHERE id = public.session_notes.session_id AND student_id = auth.uid() AND status IN ('completed', 'ai_reviewed')
  ));

-- 5. Debriefs policies
CREATE POLICY "Tutors manage debriefs for their sessions" ON public.debriefs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sessions WHERE id = public.debriefs.session_id AND tutor_id = auth.uid()
  ));

CREATE POLICY "Students view debriefs for their sessions" ON public.debriefs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sessions WHERE id = public.debriefs.session_id AND student_id = auth.uid()
  ));

-- 6. Session Plans policies
CREATE POLICY "Tutors manage plans" ON public.session_plans
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sessions WHERE id = public.session_plans.session_id AND tutor_id = auth.uid()
  ));

-- 7. Student Homework policies
CREATE POLICY "Tutors manage homework" ON public.student_homework
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.students WHERE id = public.student_homework.student_id AND tutor_id = auth.uid()
  ));

CREATE POLICY "Students view and update their homework" ON public.student_homework
  FOR ALL USING (auth.uid() = student_id);
