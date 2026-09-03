'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { AIProgressModal } from '@/components/AIProgressModal';
import { Session, StudentHomeworkItem, StudentProfile, SessionNotes, Debrief, UserProfile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Calendar, CheckSquare, BookOpen, Clock, Lock, Sparkles, Award, Loader2 } from 'lucide-react';
import { isSameStudent } from '@/lib/utils';
import { MOCK_STUDENTS_LIST } from '@/lib/store';

export default function StudentDashboardPage() {
  const router = useRouter();

  const [studentUser, setStudentUser] = useState<UserProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [homework, setHomework] = useState<StudentHomeworkItem[]>([]);
  const [notesMap, setNotesMap] = useState<Record<string, SessionNotes>>({});
  const [debriefsMap, setDebriefsMap] = useState<Record<string, Debrief>>({});
  const [loading, setLoading] = useState(true);
  const [savingHomeworkId, setSavingHomeworkId] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentData() {
      try {
        // Fetch student's sessions via API (validates auth server-side via getAuthUser)
        const sessionsRes = await fetch('/api/sessions');
        if (!sessionsRes.ok) {
          router.push('/login');
          return;
        }

        const sessionsJson = await sessionsRes.json();
        const list: Session[] = sessionsJson.sessions || [];
        setSessions(list);

        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          console.log(`[AUTH LOG] Student dashboard loaded for authUser: id=${authUser.id}, email=${authUser.email}`);
          const { data: userRecord } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (userRecord) setStudentUser(userRecord as UserProfile);

          const { data: profileRecord, error: profileErr } = await supabase
            .from('students')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profileRecord) {
            setStudentProfile(profileRecord as StudentProfile);
          } else {
            console.warn(`[STUDENT PROFILE FETCH LOG] Supabase profile query error: ${profileErr?.message}. Falling back to seed store.`);
            const mockSt = MOCK_STUDENTS_LIST.find(s => isSameStudent(authUser, s.id));
            if (mockSt) setStudentProfile(mockSt);
          }

          const { data: homeworkData } = await supabase
            .from('student_homework')
            .select('*')
            .eq('student_id', authUser.id)
            .order('created_at', { ascending: false });

          setHomework(homeworkData || []);
        } else {
          // Set seed student profile for local evaluation mode
          const alexProfile: StudentProfile = {
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
            ],
          };
          setStudentUser({
            id: 'student-1',
            role: 'student',
            name: 'Alex Johnson',
            email: 'student@tutorflow.com',
          });
          setStudentProfile(alexProfile);
          setHomework([
            { id: 'hw-1', student_id: 'student-1', session_id: 'session-103', task: 'Kinematics Practice Sheet #2 (Problems 1-5)', completed: true },
            { id: 'hw-2', student_id: 'student-1', session_id: 'session-103', task: 'Sketch position vs time graph from given velocity profile', completed: false },
          ]);
        }

        // Fetch notes and debriefs for past sessions
        const pastIds = list
          .filter(s => s.status === 'completed' || s.status === 'ai_reviewed')
          .map(s => s.id);

        if (pastIds.length > 0) {
          const { data: notesData } = await supabase
            .from('session_notes')
            .select('*')
            .in('session_id', pastIds);

          if (notesData) {
            const nMap: Record<string, SessionNotes> = {};
            notesData.forEach(n => { nMap[n.session_id] = n as SessionNotes; });
            setNotesMap(nMap);
          }

          const { data: debriefsData } = await supabase
            .from('debriefs')
            .select('*')
            .in('session_id', pastIds);

          if (debriefsData) {
            const dMap: Record<string, Debrief> = {};
            debriefsData.forEach(d => { dMap[d.session_id] = d as Debrief; });
            setDebriefsMap(dMap);
          }
        }
      } catch (err) {
        console.error('Error loading student dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, [router]);

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'ai_reviewed');

  const toggleHomework = async (id: string) => {
    const target = homework.find(h => h.id === id);
    if (!target || savingHomeworkId === id) return;
    const newCompleted = !target.completed;

    setSavingHomeworkId(id);
    // Optimistic state update
    setHomework(prev => prev.map(hw => hw.id === id ? { ...hw, completed: newCompleted } : hw));

    try {
      const res = await fetch(`/api/homework/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.warn('Homework update warning:', data.error);
      }
    } catch (err) {
      console.warn('Error persisting homework completion:', err);
    } finally {
      setSavingHomeworkId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Loading Student Portal...</p>
      </div>
    );
  }

  const studentName = studentUser?.name || studentProfile?.name || 'Student';
  const studentSubject = studentProfile?.subject || 'Tutoring';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar currentRole="student" userName={studentName} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Student Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Student Portal
              </span>
              <span className="text-xs text-slate-400 font-medium">{studentSubject}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {studentName} 🎓
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Track your upcoming tutoring sessions, assigned homework, and review notes & AI debriefs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {studentUser && (
              <AIProgressModal studentId={studentUser.id} studentName={studentName} />
            )}
          </div>
        </div>

        {/* Top Cards: Goals & Homework Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Homework Checklist (2 Cols) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                Assigned Homework & Practice ({homework.filter(h => h.completed).length}/{homework.length} Completed)
              </h2>
            </div>

            {homework.length === 0 ? (
              <div className="p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                No active homework assignments found.
              </div>
            ) : (
              <div className="space-y-2">
                {homework.map(hw => (
                  <div
                    key={hw.id}
                    onClick={() => toggleHomework(hw.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      hw.completed
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : 'bg-slate-900/90 border-slate-700/80 hover:border-emerald-500/40'
                    }`}
                  >
                    {savingHomeworkId === hw.id ? (
                      <Loader2 className="mt-0.5 w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={hw.completed}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-800 shrink-0 cursor-pointer"
                      />
                    )}
                    <div className="space-y-0.5 flex-1">
                      <p className={`text-xs font-semibold ${hw.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                        {hw.task}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Goals Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              My Learning Goals
            </h2>
            <ul className="space-y-2 text-xs text-slate-300">
              {(studentProfile?.learning_goals || ['Master core problem solving', 'Build exam confidence']).map((goal, i) => (
                <li key={i} className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Upcoming Sessions Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Upcoming Scheduled Sessions ({upcomingSessions.length})
          </h2>

          {upcomingSessions.length === 0 ? (
            <div className="p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
              No upcoming sessions currently scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map(session => {
                const formattedDate = new Date(session.scheduled_at).toLocaleString([], {
                  weekday: 'long',
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
                          {formattedDate} ({session.duration_minutes || 60}m)
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100">{session.topic}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Sessions with Read-Only Notes & Debriefs */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Past Session Notes & AI Debriefs ({pastSessions.length})
          </h2>

          {pastSessions.length === 0 ? (
            <div className="p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
              No past session notes available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {pastSessions.map(session => {
                const notes = notesMap[session.id];
                const debrief = debriefsMap[session.id];

                const formattedDate = new Date(session.scheduled_at).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={session.id} className="glass-card p-6 rounded-3xl border border-slate-800/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={session.status} />
                          <span className="text-xs text-slate-400">{formattedDate}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-100 mt-1">{session.topic}</h3>
                      </div>
                    </div>

                    {/* Read Only Notes */}
                    {notes && notes.content ? (
                      <div className="space-y-1.5 text-xs">
                        <span className="font-bold text-slate-400 flex items-center gap-1.5 text-[11px]">
                          <Lock className="w-3 h-3 text-slate-500" />
                          Tutor Notes (Read-Only)
                        </span>
                        <p className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 font-mono leading-relaxed">
                          {notes.content}
                        </p>
                      </div>
                    ) : null}

                    {/* AI Debrief */}
                    {debrief ? (
                      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-2 text-xs">
                        <span className="font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Session Debrief
                        </span>
                        <p className="text-slate-200 leading-relaxed font-sans">{debrief.summary}</p>
                        <div className="pt-2 border-t border-purple-500/20 text-slate-300">
                          <strong className="text-indigo-300 block text-[11px]">Next Focus:</strong>
                          {debrief.next_focus}
                        </div>
                      </div>
                    ) : null}
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
