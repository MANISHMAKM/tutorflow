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
import { isSameTutor, isSameStudent } from '@/lib/utils';
import { Session, SessionStatus, Debrief, SessionPlan, StudentProfile, UserProfile } from '@/types';
import { MOCK_SESSIONS, MOCK_STUDENT, MOCK_STUDENTS_LIST, MOCK_NOTES, MOCK_PLANS, MOCK_DEBRIEFS } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Clock, User, BookOpen, AlertCircle, Loader2, Video, ExternalLink, Copy, Check, Edit3, Link as LinkIcon } from 'lucide-react';

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

  // Meeting Link State
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [editLinkValue, setEditLinkValue] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveMeetingLink = async () => {
    setSavingLink(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/meeting-link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_link: editLinkValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update meeting link');
      }
      setSession(prev => prev ? { ...prev, meeting_link: editLinkValue } : null);
      setIsEditingLink(false);
    } catch (err) {
      console.error('Error updating meeting link:', err);
    } finally {
      setSavingLink(false);
    }
  };

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
        const isStudentRole = currentAuthUser?.user_metadata?.role === 'student' || activeEmail === 'student@tutorflow.com';
        const currentTutorId = currentAuthUser?.id || (activeEmail === 'david@tutorflow.com' ? 'tutor-2' : 'tutor-1');

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
            id: currentTutorId,
            email: activeEmail,
            name: isStudentRole ? 'Alex Johnson' : (activeEmail === 'david@tutorflow.com' ? 'Prof. David Vance' : 'Dr. Sarah Jenkins'),
            role: isStudentRole ? 'student' : 'tutor',
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
            if (sessionData.student && typeof sessionData.student === 'object' && 'name' in sessionData.student) {
              activeStudent = sessionData.student as unknown as StudentProfile;
            } else if (sessionData.student_id) {
              const { data: studentDb } = await supabase
                .from('students')
                .select('*')
                .eq('id', sessionData.student_id)
                .single();
              if (studentDb) activeStudent = studentDb as StudentProfile;
            }
          }
        } catch (err) {
          console.warn('Supabase session fetch error in workspace:', err);
        }

        if (!activeSession) {
          const mockS = MOCK_SESSIONS.find(s => s.id === sessionId);
          if (mockS) {
            activeSession = mockS;
            activeStudent = mockS.student || MOCK_STUDENTS_LIST.find(s => s.id === mockS.student_id) || MOCK_STUDENT;
          }
        }

        if (activeSession && !activeStudent) {
          activeStudent = MOCK_STUDENTS_LIST.find(s => s.id === activeSession.student_id) || MOCK_STUDENT;
        }

        // STRICT ISOLATION GUARD (Supports both Tutor & Student roles)
        if (activeSession) {
          const currentUserRef = { id: currentAuthUser?.id, email: activeEmail };
          if (isStudentRole) {
            if (!isSameStudent(currentUserRef, activeSession.student_id)) {
              setApiError('Access denied: You can only view your own assigned sessions.');
              setSession(null);
              setStudent(null);
              setLoading(false);
              return;
            }
          } else {
            if (!isSameTutor(currentUserRef, activeSession.tutor_id)) {
              setApiError('Access denied: You can only view sessions assigned to your tutor account.');
              setSession(null);
              setStudent(null);
              setLoading(false);
              return;
            }
          }
        }

        if (!activeSession || !activeStudent) {
          setApiError('Access denied or session not found.');
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

  const isStudent = tutorUser?.role === 'student';
  const dashboardLink = isStudent ? '/student/dashboard' : '/tutor/dashboard';

  if (apiError && !session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
        <Navbar currentRole={isStudent ? 'student' : 'tutor'} userName={tutorUser?.name || (isStudent ? 'Student' : 'Tutor')} />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-6">
          <Link
            href={dashboardLink}
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
      <Navbar currentRole={isStudent ? 'student' : 'tutor'} userName={tutorUser?.name || (isStudent ? 'Student' : 'Tutor')} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href={dashboardLink}
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
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

            {/* Video Call Meeting Link Banner & Actions */}
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Online Session Link</span>
                  {session.meeting_link ? (
                    <a
                      href={session.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-400 hover:underline truncate block max-w-[200px]"
                    >
                      {session.meeting_link}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No link added yet</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {session.meeting_link && (
                  <>
                    <a
                      href={session.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0"
                    >
                      <Video className="w-4 h-4" />
                      Join Video Call
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                    <button
                      onClick={() => handleCopyLink(session.meeting_link!)}
                      title="Copy meeting link"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </>
                )}

                {!isStudent && (
                  <button
                    onClick={() => {
                      setEditLinkValue(session.meeting_link || `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`);
                      setIsEditingLink(true);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    {session.meeting_link ? 'Edit' : 'Add Link'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Edit Meeting Link Modal / Drawer */}
          {isEditingLink && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-indigo-400" />
                  Update Session Meeting URL (Google Meet, Zoom, MS Teams, etc.)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const code1 = Math.random().toString(36).substring(2, 5);
                    const code2 = Math.random().toString(36).substring(2, 6);
                    const code3 = Math.random().toString(36).substring(2, 5);
                    setEditLinkValue(`https://meet.google.com/${code1}-${code2}-${code3}`);
                  }}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline"
                >
                  + Generate Google Meet Link
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={editLinkValue}
                  onChange={e => setEditLinkValue(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSaveMeetingLink}
                  disabled={savingLink}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  {savingLink ? 'Saving...' : 'Save Link'}
                </button>
                <button
                  onClick={() => setIsEditingLink(false)}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
