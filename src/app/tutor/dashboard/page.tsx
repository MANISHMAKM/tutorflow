'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { NewStudentModal } from '@/components/NewStudentModal';
import { NewSessionModal } from '@/components/NewSessionModal';
import { StudentProfile, Session, UserProfile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Users, Calendar, ArrowRight, BookOpen, Clock, Loader2 } from 'lucide-react';

export default function TutorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Fetch students via API (validates auth server-side via getAuthUser)
        const studentsRes = await fetch('/api/students');
        if (!studentsRes.ok) {
          router.push('/login');
          return;
        }

        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);

        // Fetch sessions via API
        const sessionsRes = await fetch('/api/sessions');
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData.sessions || []);
        }

        // Fetch user profile from Supabase or demo cookie
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            setUser(profile as UserProfile);
          } else {
            setUser({
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || 'Tutor',
              role: 'tutor',
            });
          }
        } else {
          const demoCookie = typeof document !== 'undefined'
            ? document.cookie.split('; ').find(r => r.startsWith('demo_user_email='))?.split('=')[1]
            : null;
          const decodedEmail = demoCookie ? decodeURIComponent(demoCookie) : 'tutor@tutorflow.com';

          setUser({
            id: decodedEmail === 'david@tutorflow.com' ? 'tutor-2' : 'tutor-1',
            email: decodedEmail,
            name: decodedEmail === 'david@tutorflow.com' ? 'Prof. David Vance' : 'Dr. Sarah Jenkins',
            role: 'tutor',
          });
        }
      } catch (err) {
        console.error('Error loading tutor dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  const handleStudentCreated = (newStudent: StudentProfile & { temp_password?: string }) => {
    setStudents(prev => [newStudent, ...prev]);
  };

  const handleSessionCreated = (newSession: Session) => {
    setSessions(prev => [newSession, ...prev]);
  };

  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return s.status === 'completed' || s.status === 'ai_reviewed';
    return s.status === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Loading Tutor Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar currentRole="tutor" userName={user?.name || 'Tutor'} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Tutor Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {user?.name || 'Tutor'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage your 1-on-1 students, schedule sessions, and run AI-assisted lesson plans & debriefs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NewStudentModal onStudentCreated={handleStudentCreated} />
            <NewSessionModal students={students} onSessionCreated={handleSessionCreated} />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs font-medium text-slate-400">Total Active Students</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-white">{students.length}</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs font-medium text-slate-400">Total Sessions</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-white">{sessions.length}</span>
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs font-medium text-slate-400">AI Debriefs Generated</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-white">
                {sessions.filter(s => s.status === 'ai_reviewed').length}
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid: My Students & Session Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: My Students */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                My Students ({students.length})
              </h2>
            </div>

            {students.length === 0 ? (
              <div className="p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                No students created yet. Click &quot;Add Student&quot; to onboard your first student.
              </div>
            ) : (
              <div className="space-y-3">
                {students.map(st => (
                  <div key={st.id} className="glass-card p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">{st.name}</h3>
                        <p className="text-xs text-indigo-400 font-medium">{st.subject} • {st.current_level}</p>
                      </div>
                      <Link
                        href={`/tutor/students/${st.id}`}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {st.weak_areas && st.weak_areas.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Target Weak Areas</span>
                        <div className="flex flex-wrap gap-1">
                          {st.weak_areas.slice(0, 2).map((wa, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                              {wa}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2 & 3: Sessions List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                Tutoring Sessions ({filteredSessions.length})
              </h2>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
                {(['all', 'scheduled', 'in_progress', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Cards */}
            {filteredSessions.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                No sessions found for this status tab.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map(session => {
                  const student = students.find(s => s.id === session.student_id) || (typeof session.student === 'object' ? session.student : null);
                  const studentName = student?.name || 'Student';
                  const studentSubject = student?.subject || '';

                  const formattedDate = new Date(session.scheduled_at).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={session.id}
                      className="glass-card p-5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={session.status} />
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formattedDate} ({session.duration_minutes || 60}m)
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-100">{session.topic}</h3>
                        <p className="text-xs text-slate-400">
                          Student: <strong className="text-slate-200">{studentName}</strong> {studentSubject ? `• ${studentSubject}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/tutor/sessions/${session.id}`}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                        >
                          Enter Workspace
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
