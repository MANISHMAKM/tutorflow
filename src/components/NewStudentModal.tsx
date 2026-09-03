'use client';

import React, { useState } from 'react';
import { StudentProfile } from '@/types';
import { UserPlus, AlertCircle } from 'lucide-react';

interface Props {
  onStudentCreated: (student: StudentProfile & { temp_password?: string }) => void;
}

export function NewStudentModal({ onStudentCreated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [goals, setGoals] = useState('');
  const [weakAreas, setWeakAreas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          current_level: currentLevel,
          learning_goals: goals.split(',').map(g => g.trim()).filter(Boolean),
          weak_areas: weakAreas.split(',').map(w => w.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create student');

      onStudentCreated(data.student);
      setIsOpen(false);
      setName('');
      setEmail('');
      setSubject('');
      setCurrentLevel('');
      setGoals('');
      setWeakAreas('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating student account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
      >
        <UserPlus className="w-4 h-4" />
        Add New Student
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700/80 p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Create Student Account</h3>
                  <p className="text-xs text-slate-400">Generates temp login credentials for student</p>
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
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Jordan Smith"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Student Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="jordan@student.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Subject *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. SAT Math / Physics"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Current Level *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Grade 10 AP"
                    value={currentLevel}
                    onChange={e => setCurrentLevel(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Learning Goals (comma separated)</label>
                <input
                  type="text"
                  placeholder="Master Quadratics, Score 700+ SAT, AP Physics A"
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Weak Areas (comma separated)</label>
                <input
                  type="text"
                  placeholder="Polynomial factoring, Word problems, Unit conversion"
                  value={weakAreas}
                  onChange={e => setWeakAreas(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
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
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
