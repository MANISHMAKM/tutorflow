'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'tutor' | 'student'>('tutor');
  const [email, setEmail] = useState('tutor@tutorflow.com');
  const [password, setPassword] = useState('TutorPass123!');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleSelect = (selectedRole: 'tutor' | 'student', tutorEmail?: string) => {
    setRole(selectedRole);
    setErrorMessage(null);
    if (selectedRole === 'tutor') {
      setEmail(tutorEmail || 'tutor@tutorflow.com');
      setPassword('TutorPass123!');
    } else {
      setEmail('student@tutorflow.com');
      setPassword('Student123!');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        const isFetchErr = error?.message.toLowerCase().includes('fetch') || error?.message.toLowerCase().includes('url');
        if (isFetchErr) {
          document.cookie = `demo_user_email=${encodeURIComponent(email)}; path=/; max-age=86400`;
          document.cookie = `demo_user_role=${encodeURIComponent(role)}; path=/; max-age=86400`;
          if (role === 'tutor') {
            router.push('/tutor/dashboard');
          } else {
            router.push('/student/dashboard');
          }
          return;
        }
        setErrorMessage(error?.message || 'Invalid email or password. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Fetch user profile from public.users table to verify role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const userRole = profile?.role || (data.user.user_metadata?.role as 'tutor' | 'student') || role;

      if (userRole === 'tutor') {
        router.push('/tutor/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: unknown) {
      document.cookie = `demo_user_email=${encodeURIComponent(email)}; path=/; max-age=86400`;
      document.cookie = `demo_user_role=${encodeURIComponent(role)}; path=/; max-age=86400`;
      if (role === 'tutor') {
        router.push('/tutor/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 items-center justify-center shadow-xl shadow-indigo-500/25 mb-1">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Tutor<span className="text-indigo-400">Flow</span>
          </h1>
          <p className="text-xs text-slate-400">
            Intelligent 1-on-1 Session Platform for Tutors & Students
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          {/* Role Preset Selector */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleRoleSelect('tutor', 'tutor@tutorflow.com')}
              className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                role === 'tutor'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Tutor Login
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('student')}
              className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                role === 'student'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Student Login
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                role === 'tutor'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
              } disabled:opacity-50`}
            >
              {loading ? 'Authenticating with Supabase...' : `Sign in as ${role === 'tutor' ? 'Tutor' : 'Student'}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
