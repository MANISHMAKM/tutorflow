'use client';

import React, { useState } from 'react';
import { Debrief, SessionStatus } from '@/types';
import { Sparkles, BookOpen, CheckSquare, Target, RefreshCw } from 'lucide-react';

interface Props {
  sessionId: string;
  studentId: string;
  topic: string;
  sessionStatus: SessionStatus;
  existingDebrief?: Debrief | null;
  onDebriefGenerated?: (debrief: Debrief) => void;
}

export function AIDebriefCard({
  sessionId,
  studentId,
  topic,
  sessionStatus,
  existingDebrief,
  onDebriefGenerated,
}: Props) {
  const [debrief, setDebrief] = useState<Debrief | null>(existingDebrief || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDebrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, student_id: studentId, topic }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate debrief');

      setDebrief(data.debrief);
      if (onDebriefGenerated) onDebriefGenerated(data.debrief);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI Debrief generation failed');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = sessionStatus === 'completed' || sessionStatus === 'ai_reviewed';

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Post-Session AI Debrief</h3>
            <p className="text-xs text-slate-400">Contextual synthesis from raw tutor notes</p>
          </div>
        </div>

        {sessionStatus === 'completed' && !debrief && (
          <button
            disabled={loading}
            onClick={generateDebrief}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all hover:scale-105 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Notes...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate Debrief (Advances to AI Reviewed)
              </>
            )}
          </button>
        )}
      </div>

      {/* States */}
      {!isCompleted && !debrief && (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 italic">
          Post-session AI Debrief becomes available once session status advances to &apos;completed&apos;.
        </div>
      )}

      {error && (
        <div className="p-3.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">AI Debrief Generation Failed:</p>
              <p className="mt-0.5 text-rose-300/90">{error}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={generateDebrief}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Debrief Generation
            </button>
          </div>
        </div>
      )}

      {debrief && (
        <div className="space-y-4 text-xs">
          {/* Summary */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1">
            <h4 className="font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <BookOpen className="w-3.5 h-3.5" />
              Session Summary
            </h4>
            <p className="text-slate-200 leading-relaxed font-sans">{debrief.summary}</p>
          </div>

          {/* Homework Items */}
          <div className="space-y-2">
            <h4 className="font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <CheckSquare className="w-3.5 h-3.5" />
              Extracted Homework Tasks ({debrief.homework?.length || 0})
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {debrief.homework?.map((hw, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-100 block">{hw.task}</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{hw.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next Focus */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 block">Suggested Next Focus</span>
                <span className="text-slate-200 font-semibold">{debrief.next_focus}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
