'use client';

import React, { useState } from 'react';
import { SessionPlan } from '@/types';
import { Sparkles, Target, ListOrdered, HelpCircle, RefreshCw, CheckCircle } from 'lucide-react';

interface Props {
  sessionId: string;
  studentId: string;
  topic: string;
  existingPlan?: SessionPlan | null;
  onPlanGenerated?: (plan: SessionPlan) => void;
}

export function AIPlanModal({ sessionId, studentId, topic, existingPlan, onPlanGenerated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<SessionPlan | null>(existingPlan || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, student_id: studentId, topic }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan');

      setPlan(data.plan);
      if (onPlanGenerated) onPlanGenerated(data.plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI Plan generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
      >
        <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
        {plan ? 'View Pre-Session AI Plan' : 'Generate Pre-Session AI Plan'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700/80 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">AI Pre-Session Lesson Plan</h3>
                  <p className="text-xs text-slate-400">Topic: {topic}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            {!plan && !loading && (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-slate-300">
                  Generate a tailored 4-part lesson plan, 3 key objectives, and practice questions derived from student history and weak areas.
                </p>
                <button
                  onClick={generatePlan}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Plan Now
                </button>
              </div>
            )}

            {loading && (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-sm font-medium text-slate-300">Synthesizing student history & structuring lesson plan...</p>
              </div>
            )}

            {error && (
              <div className="p-3.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-200">AI Plan Generation Failed:</p>
                    <p className="mt-0.5 text-rose-300/90">{error}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={generatePlan}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Generation
                  </button>
                </div>
              </div>
            )}

            {plan && !loading && (
              <div className="space-y-6 text-sm">
                {/* Objectives */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    Key Objectives
                  </h4>
                  <ul className="space-y-1.5">
                    {plan.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-200 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4-point Lesson Outline */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4" />
                    4-Point Lesson Structure
                  </h4>
                  <div className="space-y-2">
                    {plan.lesson_outline.map((step, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 font-mono">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Practice Questions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    3 Targeted Practice Questions
                  </h4>
                  <div className="space-y-2">
                    {plan.practice_questions.map((q, i) => (
                      <div key={i} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200 font-mono">
                        {q}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={generatePlan}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
