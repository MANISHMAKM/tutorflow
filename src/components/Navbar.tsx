'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Calendar, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  currentRole?: 'tutor' | 'student';
  userName?: string;
}

export function Navbar({ currentRole = 'tutor', userName = 'User' }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isTutor = currentRole === 'tutor';

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      router.push('/login');
    }
  };

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link href={isTutor ? "/tutor/dashboard" : "/student/dashboard"} className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
              Tutor<span className="text-indigo-400">Flow</span>
            </span>
          </Link>

          <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            1-on-1 Session Platform
          </span>
        </div>

        {/* Navigation links */}
        <nav className="hidden sm:flex items-center space-x-1">
          {isTutor ? (
            <Link
              href="/tutor/dashboard"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname.startsWith('/tutor/dashboard')
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Dashboard & Sessions
            </Link>
          ) : (
            <Link
              href="/student/dashboard"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname.startsWith('/student/dashboard')
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student Portal
            </Link>
          )}
        </nav>

        {/* User Profile & Sign Out */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {initials}
            </div>
            <span className="hidden lg:inline text-xs font-medium text-slate-300 max-w-[140px] truncate">
              {userName}
            </span>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
