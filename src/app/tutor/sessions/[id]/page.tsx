'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { StateStepper } from '@/components/StateStepper';
import { NotesEditor } from '@/components/NotesEditor';
import { AIPlanModal } from '@/components/AIPlanModal';
import { AIDebriefCard } from '@/components/AIDebriefCard';
import { AIProgressModal } from '@/components/AIProgressModal';
import { Session, SessionStatus, Debrief, SessionPlan, StudentProfile, UserProfile } from '@/types';
import { MOCK_SESSIONS, MOCK_STUDENT, MOCK_NOTES, MOCK_PLANS, MOCK_DEBRIEFS } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Clock, User, BookOpen, AlertCircle, Loader2 } from 'lucide-react';

export default function SessionWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [tutorUser, setTutorUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [notesContent, setNotesContent] = useState<string>('');
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [plan, setPlan] = useState<SessionPlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const supabase = createClient();
        let currentAuthUser = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          currentAuthUser = user;
        } catch (e) {
          console.warn('Supabase auth check bypassed on workspace:', e);
        }

        const demoCookie = typeof document !== 'undefined'
          ? document.cookie.split('; ').find(r => r.startsWith('demo_user_email='))?.split('=')[1]
          : null;
        const decodedEmail = demoCookie ? decodeURIComponent(demoCookie) : null;

        if (!currentAuthUser && !decodedEmail) {
          const checkRes = await fetch('/api/sessions');
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

        // Fetch session from Supabase or fallback seed store
        let activeSession: Session | null = null;
        let activeStudent: StudentProfile | null = null;

        try {
          const { data: sessionData, error: sessionErr } = await supabase
            .from('sessions')
            .select('*, student:students(*)')
            .eq('id', sessionId)
            .single();

          if (!sessionErr && sessionData) {
            activeSession = sessionData as Session;
            activeStudent = (sessionData.student as unknown as StudentProfile) || null;
          }
        } catch (err) {}

        if (!activeSession) {
          const mockS = MOCK_SESSIONS.find(s => s.id === sessionId);
          if (mockS) {
            activeSession = mockS;
            activeStudent = mockS.student || MOCK_STUDENT;
          }
        }

        if (!activeSession || !activeStudent) {
          setApiError('Session not found or access denied.');
          setLoading(false);
          return;
        }

        setSession(activeSession);
        setStudent(activeStudent);

        // Fetch notes
        try {
          const { data: notesData } = await supabase
            .from('session_notes')
            .select('content')
            .eq('session_id', sessionId)
            .single();
          if (notesData) {
            setNotesContent(notesData.content || '');
          } else if (MOCK_NOTES[sessionId]) {
            setNotesContent(MOCK_NOTES[sessionId].content || '');
          }
        } catch (e) {
          if (MOCK_NOTES[sessionId]) setNotesContent(MOCK_NOTES[sessionId].content || '');
        }

        // Fetch plan
        try {
          const { data: planData } = await supabase
            .from('session_plans')
            .select('*')
            .eq('session_id', sessionId)
            .single();
          if (planData) {
            setPlan(planData as SessionPlan);
          } else if (MOCK_PLANS[sessionId]) {
            setPlan(MOCK_PLANS[sessionId]);
          }
        } catch (e) {
          if (MOCK_PLANS[sessionId]) setPlan(MOCK_PLANS[sessionId]);
        }

        // Fetch debrief
        try {
          const { data: debriefData } = await supabase
            .from('debriefs')
            .select('*')
            .eq('session_id', sessionId)
            .single();
          if (debriefData) {
            setDebrief(debriefData as Debrief);
          } else if (MOCK_DEBRIEFS[sessionId]) {
            setDebrief(MOCK_DEBRIEFS[sessionId]);
          }
        } catch (e) {
          if (MOCK_DEBRIEFS[sessionId]) setDebrief(MOCK_DEBRIEFS[sessionId]);
        }

      } catch (err) {
        console.error('Error loading session workspace data:', err);
        setApiError('Failed to load session workspace.');
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      loadWorkspaceData();
    }
  }, [sessionId, router]);

  // Handle State Machine Transition request
  const handleStatusChange = async (newStatus: SessionStatus) => {
    setUpdatingStatus(true);
    setApiError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Transition rejected (${res.status} Conflict)`);
      }

      setSession(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Invalid state transition rejected');
      throw err;
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Loading Session Workspace...</p>
      </div>
    );
  }

  if (apiError && !session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
        <Navbar currentRole="tutor" userName={tutorUser?.name || 'Tutor'} />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-6">
          <Link
            href="/tutor/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-3">
            <div className="flex items-center gap-2 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              Access Denied / Session Not Found
            </div>
            <p className="text-xs">{apiError}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!session || !student) return null;

  const formattedDate = new Date(session.scheduled_at).toLocaleString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar currentRole="tutor" userName={tutorUser?.name || 'Tutor'} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/tutor/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <AIPlanModal
              sessionId={sessionId}
              studentId={student.id}
              topic={session.topic}
              existingPlan={plan}
              onPlanGenerated={setPlan}
            />
            <AIProgressModal studentId={student.id} studentName={student.name} />
          </div>
        </div>

        {/* Session Header Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={session.status} size="lg" />
                <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
                  <Clock className="w-3.5 h-3.5" />
                  {formattedDate} ({session.duration_minutes || 60} min)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{session.topic}</h1>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
                Student: <Link href={`/tutor/students/${student.id}`} className="text-indigo-400 font-bold hover:underline">{student.name}</Link>
                <span>•</span>
                <span>{student.subject} ({student.current_level})</span>
              </p>
            </div>
          </div>
        </div>

        {/* State Machine Transition Stepper */}
        <StateStepper
          sessionId={sessionId}
          currentStatus={session.status}
          onStatusChange={handleStatusChange}
          isLoading={updatingStatus}
        />

        {/* API Error Toast Banner if any */}
        {apiError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <strong className="block text-rose-200">Server State Guard Exception (409 Conflict):</strong>
              {apiError}
            </div>
          </div>
        )}

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Notes Editor */}
          <div className="lg:col-span-2 space-y-6">
            <NotesEditor
              sessionId={sessionId}
              initialContent={notesContent}
              sessionStatus={session.status}
              onUnlock={() => handleStatusChange('in_progress')}
            />

            {/* AI Post-Session Debrief Section */}
            <AIDebriefCard
              sessionId={sessionId}
              studentId={student.id}
              topic={session.topic}
              sessionStatus={session.status}
              existingDebrief={debrief}
              onDebriefGenerated={(d) => {
                setDebrief(d);
                setSession(prev => prev ? { ...prev, status: 'ai_reviewed' } : null);
              }}
            />
          </div>

          {/* Right Column: Student Snapshot & AI Plan Quick View */}
          <div className="space-y-6">
            {/* Student Profile Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Student Profile Context
              </h3>

              <div className="space-y-2 text-slate-300">
                <p><strong>Name:</strong> {student.name}</p>
                <p><strong>Subject:</strong> {student.subject}</p>
                <p><strong>Level:</strong> {student.current_level}</p>

                {student.weak_areas && student.weak_areas.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <strong className="text-slate-400 block text-[10px] uppercase">Weak Areas</strong>
                    <div className="flex flex-wrap gap-1">
                      {student.weak_areas.map((wa, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-amber-950/30 text-amber-300 border border-amber-500/20">
                          {wa}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pre-Session Lesson Plan Card if generated */}
            {plan && (
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  Lesson Plan Objectives
                </h3>
                <ul className="space-y-1.5 text-slate-300">
                  {plan.objectives?.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 mt-1"></span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
