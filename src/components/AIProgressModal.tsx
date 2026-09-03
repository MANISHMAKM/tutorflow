'use client';

import React, { useState } from 'react';
import { ProgressSummaryResult } from '@/types';
import { TrendingUp, Award, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';

interface Props {
  studentId: string;
  studentName: string;
}

export function AIProgressModal({ studentId, studentName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<ProgressSummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch progress');

      setProgress(data.progress);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate progress report');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!progress) {
      fetchProgress();
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 flex items-center gap-2 transition-all hover:scale-105"
      >
        <TrendingUp className="w-4 h-4 text-indigo-400" />
        AI Progress Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700/80 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">AI Student Progress Summary</h3>
                  <p className="text-xs text-slate-400">Comprehensive multi-session trend analysis for {studentName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {loading && (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-sm font-medium text-slate-300">Analyzing all session debriefs for {studentName}...</p>
              </div>
            )}

            {error && (
              <div className="p-3.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-200">AI Progress Analysis Failed:</p>
                    <p className="mt-0.5 text-rose-300/90">{error}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={fetchProgress}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Progress Report
                  </button>
                </div>
              </div>
            )}

            {progress && !loading && (
              <div className="space-y-5 text-xs">
                {/* Summary Paragraph */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">Overall Trajectory</span>
                  <p className="text-slate-200 leading-relaxed font-sans text-sm">{progress.summary}</p>
                </div>

                {/* Key Improvements */}
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Key Improvements & Mastered Concepts
                  </h4>
                  <div className="space-y-1.5">
                    {progress.key_improvements?.map((imp, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {imp}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Persistent Weaknesses */}
                <div className="space-y-2">
                  <h4 className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Areas Needing Continued Reinforcement
                  </h4>
                  <div className="space-y-1.5">
                    {progress.persistent_weaknesses?.map((weak, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        {weak}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Strategy */}
                <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/30 space-y-1">
                  <h4 className="font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <Lightbulb className="w-4 h-4 text-violet-400" />
                    Recommended Pedagogical Strategy
                  </h4>
                  <p className="text-slate-200 leading-relaxed font-sans">{progress.recommended_strategy}</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={fetchProgress}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Close
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
