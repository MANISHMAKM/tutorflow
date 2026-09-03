'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SessionStatus } from '@/types';
import { isNotesEditable } from '@/lib/state-machine';
import { Lock, FileText, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  sessionId: string;
  initialContent: string;
  sessionStatus: SessionStatus;
  onSave?: (content: string) => Promise<void>;
  onUnlock?: () => Promise<void>;
}

export function NotesEditor({ sessionId, initialContent, sessionStatus, onSave, onUnlock }: Props) {
  const [content, setContent] = useState(initialContent || '');
  const [prevInitial, setPrevInitial] = useState(initialContent);

  // Sync state if prop changes during render
  if (initialContent !== prevInitial) {
    setPrevInitial(initialContent);
    setContent(initialContent || '');
  }

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const isEditable = isNotesEditable(sessionStatus);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleQuickUnlock = async () => {
    setIsUnlocking(true);
    setErrorDetails(null);
    try {
      if (onUnlock) {
        await onUnlock();
      } else {
        const res = await fetch(`/api/sessions/${sessionId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_progress' }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to unlock session');
        }
      }
    } catch (err: unknown) {
      console.error('Notes quick unlock failed:', err);
      setErrorDetails(err instanceof Error ? err.message : 'Unlock error');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isEditable) return;

    const newText = e.target.value;
    setContent(newText);
    setSaveStatus('saving');
    setErrorDetails(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 1.5s Debounced Autosave
    debounceTimerRef.current = setTimeout(async () => {
      try {
        if (onSave) {
          await onSave(newText);
        } else {
          const res = await fetch(`/api/sessions/${sessionId}/notes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newText }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to save notes');
          }
        }
        setSaveStatus('saved');
      } catch (err: unknown) {
        console.error('Notes autosave failed:', err);
        setSaveStatus('error');
        setErrorDetails(err instanceof Error ? err.message : 'Save error');
      }
    }, 1500);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-slate-100">Session Notes</h3>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          {isEditable ? (
            saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Autosaving...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Saved (~1.5s debounce)
              </span>
            ) : saveStatus === 'error' ? (
              <span className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                <AlertCircle className="w-3 h-3" />
                Save Failed
              </span>
            ) : (
              <span className="text-slate-400">Live Editor Active</span>
            )
          ) : (
            <span className="flex items-center gap-1.5 text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              <Lock className="w-3 h-3 text-slate-400" />
              Read-Only Locked ({sessionStatus})
            </span>
          )}
        </div>
      </div>

      {/* Editor Box */}
      <div className="relative">
        <textarea
          disabled={!isEditable}
          value={content}
          onChange={handleChange}
          rows={8}
          placeholder={
            isEditable
              ? "Type raw session notes here... (autosaves every 1.5s). Capture key concepts discussed, problem areas, student performance, and insights."
              : "Session notes are read-only locked when session is not in_progress."
          }
          className={`w-full p-4 rounded-xl text-sm font-mono leading-relaxed transition-all resize-y focus:outline-none ${
            isEditable
              ? 'bg-slate-900/90 border border-slate-700/80 text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              : 'bg-slate-900/40 border border-slate-800/80 text-slate-300 cursor-not-allowed opacity-90'
          }`}
        />

        {!isEditable && sessionStatus === 'scheduled' && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
            <div className="flex items-center gap-2 text-indigo-200">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Notes are locked in <strong>scheduled</strong> status. Click below to start the session and unlock live notes.</span>
            </div>
            <button
              onClick={handleQuickUnlock}
              disabled={isUnlocking}
              className="px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 shrink-0 transition-all"
            >
              {isUnlocking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  ⚡ Start Session & Unlock Notes
                </>
              )}
            </button>
          </div>
        )}

        {!isEditable && sessionStatus !== 'scheduled' && (
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 italic">
            <Lock className="w-3.5 h-3.5" />
            Notes editing is strictly disabled for sessions with status &apos;{sessionStatus}&apos;.
          </div>
        )}
      </div>

      {errorDetails && (
        <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
          {errorDetails}
        </p>
      )}
    </div>
  );
}
