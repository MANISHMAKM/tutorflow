'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { AIProgressModal } from '@/components/AIProgressModal';
import { NewSessionModal } from '@/components/NewSessionModal';
import { StudentProfile, Session, UserProfile } from '@/types';
import { MOCK_STUDENTS_LIST, MOCK_SESSIONS } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Target, Award, Calendar, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [tutorUser, setTutorUser] = useState<UserProfile | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentDetail() {
      try {
        const supabase = createClient();
        let currentAuthUser = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          currentAuthUser = user;
        } catch (e) {}

        const demoCookie = typeof document !== 'undefined'
          ? document.cookie.split('; ').find(r => r.startsWith('demo_user_email='))?.split('=')[1]
          : null;
        const decodedEmail = demoCookie ? decodeURIComponent(demoCookie) : null;

        if (!currentAuthUser && !decodedEmail) {
          const checkRes = await fetch('/api/students');
          if (!checkRes.ok) {
            router.push('/login');
            return;
          }
        }

        const activeEmail = currentAuthUser?.email || decodedEmail || 'tutor@tutorflow.com';

        if (currentAuthUser) {
          try {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', currentAuthUser.id)
              .single();
            if (profile) setTutorUser(profile as UserProfile);
          } catch (e) {}
        } else {
          setTutorUser({
            id: activeEmail === 'david@tutorflow.com' ? 'tutor-2' : 'tutor-1',
            email: activeEmail,
            name: activeEmail === 'david@tutorflow.com' ? 'Prof. David Vance' : 'Dr. Sarah Jenkins',
            role: 'tutor',
          });
        }

        // Fetch target student profile from Supabase or seed store
        const { data: studentData, error: studentErr } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single();

        let activeStudent: StudentProfile | null = studentData as StudentProfile | null;

        if (studentErr || !studentData) {
          const mockSt = MOCK_STUDENTS_LIST.find(s => s.id === studentId);
          if (mockSt) activeStudent = mockSt;
        }

        if (!activeStudent) {
          setErrorMessage('Student profile not found or access denied.');
          setLoading(false);
          return;
        }

        setStudent(activeStudent);

        // Fetch sessions for this student
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('*')
          .eq('student_id', studentId)
          .order('scheduled_at', { ascending: false });

        if (sessionsData && sessionsData.length > 0) {
          setSessions(sessionsData);
        } else {
          const mockSessions = MOCK_SESSIONS.filter(s => s.student_id === studentId);
          setSessions(mockSessions);
        }
      } catch (err) {
        console.error('Error loading student details:', err);
        setErrorMessage('Failed to load student details.');
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      loadStudentDetail();
    }
  }, [studentId, router]);

  const handleSessionCreated = (newSession: Session) => {
    setSessions(prev => [newSession, ...prev]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Loading Student Profile...</p>
      </div>
    );
  }

  if (errorMessage || !student) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
        <Navbar currentRole="tutor" userName={tutorUser?.name || 'Tutor'} />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-6">
          <Link
            href="/tutor/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tutor Dashboard
          </Link>
          <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-3">
            <div className="flex items-center gap-2 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              Access Denied / Not Found
            </div>
            <p className="text-xs">{errorMessage || 'Unable to access student profile.'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar currentRole="tutor" userName={tutorUser?.name || 'Tutor'} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Back Link */}
        <div>
          <Link
            href="/tutor/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tutor Dashboard
          </Link>
        </div>

        {/* Student Profile Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {student.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                {student.current_level}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">{student.name}</h1>
            <p className="text-xs text-slate-400">Account ID: {student.id}</p>
          </div>

          <div className="flex items-center gap-3">
            <AIProgressModal studentId={student.id} studentName={student.name} />
            <NewSessionModal students={[student]} onSessionCreated={handleSessionCreated} preselectedStudentId={student.id} />
          </div>
        </div>

        {/* Goals & Weak Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Learning Goals
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {(student.learning_goals || []).map((goal, i) => (
                <li key={i} className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Target Weak Areas
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {(student.weak_areas || []).map((wa, i) => (
                <li key={i} className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {wa}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sessions History for this Student */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Session History & Debriefs ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <div className="p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
              No sessions scheduled for this student yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const formattedDate = new Date(session.scheduled_at).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={session.id} className="glass-card p-5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={session.status} />
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formattedDate}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-100">{session.topic}</h4>
                    </div>

                    <Link
                      href={`/tutor/sessions/${session.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      Open Workspace
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
