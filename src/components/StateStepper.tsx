'use client';

import React, { useState } from 'react';
import { SessionStatus } from '@/types';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  sessionId: string;
  currentStatus: SessionStatus;
  onStatusChange: (newStatus: SessionStatus) => Promise<void>;
  isLoading?: boolean;
}

const STEPS: { status: SessionStatus; label: string; desc: string }[] = [
  { status: 'scheduled', label: '1. Scheduled', desc: 'Pre-session plan ready' },
  { status: 'in_progress', label: '2. In Progress', desc: 'Live notes autosaving' },
  { status: 'completed', label: '3. Completed', desc: 'Notes locked, debrief ready' },
  { status: 'ai_reviewed', label: '4. AI Reviewed', desc: 'Debrief & homework generated' },
];

export function StateStepper({ currentStatus, onStatusChange, isLoading = false }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<SessionStatus | null>(null);

  const getStepIndex = (status: SessionStatus) => {
    return STEPS.findIndex(s => s.status === status);
  };

  const currentIndex = getStepIndex(currentStatus);

  const handleStepClick = async (targetStatus: SessionStatus) => {
    if (targetStatus === currentStatus || isLoading) return;
    setErrorMsg(null);
    setPendingStatus(targetStatus);
    try {
      await onStatusChange(targetStatus);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid state transition rejected with 409 Conflict');
    } finally {
      setPendingStatus(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Visual Stepper */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {STEPS.map((step, idx) => {
            const isCurrent = step.status === currentStatus;
            const isCompleted = idx < currentIndex;
            const isNext = idx === currentIndex + 1;
            const isPrev = idx === currentIndex - 1;
            const isClickable = (isNext || isPrev) && !isLoading;
            const isUpdatingThisStep = pendingStatus === step.status && isLoading;

            return (
              <React.Fragment key={step.status}>
                <div
                  onClick={() => isClickable && handleStepClick(step.status)}
                  className={`flex-1 p-4 rounded-xl border transition-all ${
                    isClickable ? 'cursor-pointer hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10' : ''
                  } ${
                    isCurrent
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : isCompleted
                      ? 'bg-slate-800/40 border-slate-700/60 opacity-90'
                      : isNext
                      ? 'bg-slate-900/80 border-indigo-500/50 hover:bg-slate-900'
                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Step {idx + 1}
                    </span>
                    {isCurrent && (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-100 mt-1">{step.label}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>

                  {/* Transition Actions */}
                  {isCurrent && (
                    <div className="mt-3 py-1 px-2.5 rounded-lg text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5 w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Active State
                    </div>
                  )}

                  {isNext && (
                    <button
                      disabled={isLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStepClick(step.status);
                      }}
                      className="mt-3 w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                      {isUpdatingThisStep ? 'Updating...' : `Advance to ${step.label.replace(/^\d+\.\s*/, '')}`}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isPrev && (
                    <button
                      disabled={isLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStepClick(step.status);
                      }}
                      className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    >
                      {isUpdatingThisStep ? 'Reverting...' : `Revert to ${step.label.replace(/^\d+\.\s*/, '')}`}
                    </button>
                  )}
                </div>

                {idx < STEPS.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error / Invalid Transition Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">State Machine Guard Violation (409 Conflict):</p>
            <p className="mt-0.5 text-rose-300/90">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
