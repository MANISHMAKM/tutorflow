import React from 'react';
import { SessionStatus } from '@/types';
import { Clock, PlayCircle, CheckCircle2, Sparkles } from 'lucide-react';

interface Props {
  status: SessionStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const config = {
    scheduled: {
      label: 'Scheduled',
      className: 'status-scheduled',
      icon: Clock,
    },
    in_progress: {
      label: 'In Progress',
      className: 'status-in_progress',
      icon: PlayCircle,
    },
    completed: {
      label: 'Completed',
      className: 'status-completed',
      icon: CheckCircle2,
    },
    ai_reviewed: {
      label: 'AI Reviewed',
      className: 'status-ai_reviewed',
      icon: Sparkles,
    },
  };

  const current = config[status] || config.scheduled;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs font-medium gap-1.5',
    lg: 'px-3 py-1.5 text-sm font-semibold gap-2',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClasses[size]} ${current.className}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {current.label}
    </span>
  );
}
