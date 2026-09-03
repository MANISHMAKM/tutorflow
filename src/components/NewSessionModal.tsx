'use client';

import React, { useState } from 'react';
import { StudentProfile, Session } from '@/types';
import { CalendarPlus, AlertTriangle } from 'lucide-react';

interface Props {
  students: StudentProfile[];
  onSessionCreated: (session: Session) => void;
  preselectedStudentId?: string;
}

export function NewSessionModal({ students, onSessionCreated, preselectedStudentId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState(preselectedStudentId || (students[0]?.id || ''));
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
          duration_minutes: parseInt(durationMinutes, 10),
          topic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule session');
      }

      onSessionCreated(data.session);
      setIsOpen(false);
      setTopic('');
      setScheduledAt('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error scheduling session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
      >
        <CalendarPlus className="w-4 h-4" />
        Schedule Session
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700/80 p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Schedule 1-on-1 Session</h3>
                  <p className="text-xs text-slate-400">Strict double-booking overlap guard enabled</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-200">Validation Error (409 Conflict):</p>
                  <p className="mt-0.5 text-rose-300/90">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Select Student *</label>
                <select
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.subject} ({st.current_level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Session Topic / Focus *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Quadratic Optimization & SAT Math Review"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Scheduled Date & Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Duration (Minutes)</label>
                  <select
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes (Standard)</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                >
                  {loading ? 'Validating Overlap...' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
