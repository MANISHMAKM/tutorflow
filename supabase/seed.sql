-- TutorFlow Seed SQL Script
-- Execute this script in your Supabase SQL Editor AFTER schema.sql
-- Creates 3 Auth accounts and 5 student profiles with strict tutor ownership

-- Enable pgcrypto for password hashing in auth.users
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  tutor1_id UUID := '00000000-0000-0000-0000-000000000001';
  tutor2_id UUID := '00000000-0000-0000-0000-000000000002';
  student1_id UUID := '00000000-0000-0000-0000-000000000003';
  student2_id UUID := '00000000-0000-0000-0000-000000000004';
  student3_id UUID := '00000000-0000-0000-0000-000000000005';
  student4_id UUID := '00000000-0000-0000-0000-000000000006';
  student5_id UUID := '00000000-0000-0000-0000-000000000007';

  tutor1_pass TEXT := extensions.crypt('TutorPass123!', extensions.gen_salt('bf'));
  tutor2_pass TEXT := extensions.crypt('TutorPass123!', extensions.gen_salt('bf'));
  student1_pass TEXT := extensions.crypt('Student123!', extensions.gen_salt('bf'));
BEGIN
  ------------------------------------------------------------------------------
  -- 1. Insert into auth.users (Supabase Auth System Table)
  ------------------------------------------------------------------------------

  -- Tutor 1: Dr. Sarah Jenkins (tutor@tutorflow.com)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (
    tutor1_id,
    '00000000-0000-0000-0000-000000000000',
    'tutor@tutorflow.com',
    tutor1_pass,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Dr. Sarah Jenkins","role":"tutor"}',
    NOW(), NOW(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET encrypted_password = tutor1_pass;

  -- Tutor 2: Prof. David Vance (david@tutorflow.com)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (
    tutor2_id,
    '00000000-0000-0000-0000-000000000000',
    'david@tutorflow.com',
    tutor2_pass,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Prof. David Vance","role":"tutor"}',
    NOW(), NOW(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET encrypted_password = tutor2_pass;

  -- Student 1: Alex Johnson (student@tutorflow.com)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (
    student1_id,
    '00000000-0000-0000-0000-000000000000',
    'student@tutorflow.com',
    student1_pass,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Alex Johnson","role":"student"}',
    NOW(), NOW(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET encrypted_password = student1_pass;


  ------------------------------------------------------------------------------
  -- 2. Insert into public.users
  ------------------------------------------------------------------------------
  INSERT INTO public.users (id, role, name, email) VALUES
    (tutor1_id, 'tutor', 'Dr. Sarah Jenkins', 'tutor@tutorflow.com'),
    (tutor2_id, 'tutor', 'Prof. David Vance', 'david@tutorflow.com'),
    (student1_id, 'student', 'Alex Johnson', 'student@tutorflow.com'),
    (student2_id, 'student', 'Rahul Sharma', 'rahul@tutorflow.com'),
    (student3_id, 'student', 'Anu Patel', 'anu@tutorflow.com'),
    (student4_id, 'student', 'Maria Garcia', 'maria@tutorflow.com'),
    (student5_id, 'student', 'Peter Parker', 'peter@tutorflow.com')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;


  ------------------------------------------------------------------------------
  -- 3. Insert into public.students
  ------------------------------------------------------------------------------
  -- Tutor 1 (Dr. Sarah Jenkins) owns Alex, Rahul, Anu
  INSERT INTO public.students (id, tutor_id, name, subject, current_level, learning_goals, weak_areas) VALUES
    (student1_id, tutor1_id, 'Alex Johnson', 'Mathematics & Physics', 'Grade 11 / AP Level',
     ARRAY['Score 750+ on SAT Math', 'Master Kinematics & Quadratic Optimization', 'Build problem solving speed'],
     ARRAY['Factoring complex polynomials', 'Kinematic equation selection under time', 'Word problem translation']),

    (student2_id, tutor1_id, 'Rahul Sharma', 'Calculus AB', 'Grade 12 / AP',
     ARRAY['Master Derivatives & Integrals', 'Score 5 on AP Calculus Exam'],
     ARRAY['Chain rule substitution', 'Integration by parts']),

    (student3_id, tutor1_id, 'Anu Patel', 'Algebra II', 'Grade 10',
     ARRAY['Build strong foundation in linear functions', 'Improve test speed'],
     ARRAY['Matrix multiplication', 'Logarithmic properties']),

  -- Tutor 2 (Prof. David Vance) owns Maria, Peter
    (student4_id, tutor2_id, 'Maria Garcia', 'AP Physics C', 'Grade 12',
     ARRAY['Master Rotational Mechanics', 'Prepare for Physics Olympiad'],
     ARRAY['Angular momentum conservation', 'Torque calculations']),

    (student5_id, tutor2_id, 'Peter Parker', 'Chemistry & Biology', 'Grade 11',
     ARRAY['Score 780+ on SAT Subject Test', 'Master Organic Chemistry'],
     ARRAY['Stoichiometry', 'Reaction kinetics'])
  ON CONFLICT (id) DO UPDATE SET tutor_id = EXCLUDED.tutor_id, name = EXCLUDED.name;

END $$;
