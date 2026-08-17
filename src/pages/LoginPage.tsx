import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Lock, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Fixed account email — hidden from user, used internally
const ACCOUNT_EMAIL = 'ayanahmedsootwala@gmail.com';

export default function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Never allow browser autofill to pre-populate
  useEffect(() => {
    const t = setTimeout(() => {
      if (inputRef.current) inputRef.current.value = '';
      setPassword('');
    }, 50);
    return () => clearTimeout(t);
  }, []);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { toast.error('Enter the access key'); return; }
    setSubmitting(true);
    const { error } = await signIn(ACCOUNT_EMAIL, password);
    setSubmitting(false);
    if (error) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error('Access denied.');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* ── Atmospheric background ───────────────────────────────────── */}
      {/* Deep vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 100%, #1a0000 0%, transparent 70%)',
      }} />
      {/* Top darkness */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 100% 40% at 50% 0%, #000 0%, transparent 100%)',
      }} />
      {/* Red spotlight from above */}
      <div className="absolute pointer-events-none" style={{
        top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: '60%', height: '80%',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(180,0,0,0.18) 0%, transparent 70%)',
      }} />
      {/* Subtle grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Film grain overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px',
      }} />

      {/* ── Decorative corner accents ──────────────────────────────────── */}
      <div className="absolute top-8 left-8 pointer-events-none opacity-20">
        <div className="w-12 h-12 border-l-2 border-t-2 border-red-700" />
      </div>
      <div className="absolute top-8 right-8 pointer-events-none opacity-20">
        <div className="w-12 h-12 border-r-2 border-t-2 border-red-700" />
      </div>
      <div className="absolute bottom-8 left-8 pointer-events-none opacity-20">
        <div className="w-12 h-12 border-l-2 border-b-2 border-red-700" />
      </div>
      <div className="absolute bottom-8 right-8 pointer-events-none opacity-20">
        <div className="w-12 h-12 border-r-2 border-b-2 border-red-700" />
      </div>

      {/* ── Main card ────────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Card glow border */}
        <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(180,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(180,0,0,0.2) 100%)',
        }} />

        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #141414 0%, #0d0d0d 50%, #111010 100%)',
            border: '1px solid rgba(180,0,0,0.25)',
            boxShadow: '0 0 60px rgba(140,0,0,0.2), 0 0 120px rgba(100,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Top red accent line */}
          <div className="h-0.5 w-full" style={{
            background: 'linear-gradient(90deg, transparent, rgba(200,0,0,0.8) 30%, rgba(200,0,0,0.8) 70%, transparent)',
          }} />

          <div className="px-10 py-12">
            {/* ── Brand mark ─────────────────────────────────────────── */}
            <motion.div
              className="flex flex-col items-center mb-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* Skull icon in red glow */}
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full blur-2xl" style={{
                  background: 'rgba(180,0,0,0.35)',
                  transform: 'scale(1.5)',
                }} />
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #1f0000 0%, #2a0000 100%)',
                    border: '1px solid rgba(200,0,0,0.5)',
                    boxShadow: '0 0 20px rgba(160,0,0,0.4)',
                  }}
                >
                  <Skull className="w-7 h-7" style={{ color: '#cc0000' }} />
                </div>
              </div>

              {/* Title */}
              <h1
                className="text-3xl font-black tracking-[0.15em] uppercase text-center"
                style={{
                  color: '#f0f0f0',
                  textShadow: '0 0 30px rgba(200,0,0,0.4), 0 2px 4px rgba(0,0,0,0.8)',
                  fontFamily: '"Arial Black", "Impact", sans-serif',
                  letterSpacing: '0.18em',
                }}
              >
                Wulfrayn
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="h-px w-8" style={{ background: 'rgba(180,0,0,0.6)' }} />
                <p
                  className="text-[10px] font-bold tracking-[0.35em] uppercase"
                  style={{ color: 'rgba(180,0,0,0.85)' }}
                >
                  Restricted Access
                </p>
                <div className="h-px w-8" style={{ background: 'rgba(180,0,0,0.6)' }} />
              </div>
            </motion.div>

            {/* ── Form ───────────────────────────────────────────────── */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5"
              animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              {/* Password field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: 'rgba(180,0,0,0.9)' }}
                >
                  <Lock className="w-3 h-3" />
                  Access Key
                </label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="password"
                    name="access-key-no-autofill"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter access key"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-form-type="other"
                    required
                    className="pr-11 h-12 text-sm font-mono tracking-widest"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(180,0,0,0.3)',
                      color: '#e8e8e8',
                      caretColor: '#cc0000',
                      outline: 'none',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.border = '1px solid rgba(200,0,0,0.7)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(160,0,0,0.15)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.border = '1px solid rgba(180,0,0,0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 opacity-50"
                    style={{ color: '#888' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 font-black tracking-[0.25em] uppercase text-sm relative overflow-hidden"
                style={{
                  background: submitting
                    ? 'rgba(100,0,0,0.5)'
                    : 'linear-gradient(135deg, #8b0000 0%, #cc0000 50%, #8b0000 100%)',
                  border: '1px solid rgba(200,0,0,0.5)',
                  color: '#fff',
                  boxShadow: submitting ? 'none' : '0 0 20px rgba(160,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                <AnimatePresence mode="wait">
                  {submitting ? (
                    <motion.span
                      key="loading"
                      className="flex items-center justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Verifying...
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Enter
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.form>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <p
              className="text-center text-[10px] mt-8 tracking-[0.15em] uppercase"
              style={{ color: 'rgba(255,255,255,0.12)' }}
            >
              Unauthorized access is prohibited
            </p>
          </div>

          {/* Bottom red accent line */}
          <div className="h-0.5 w-full" style={{
            background: 'linear-gradient(90deg, transparent, rgba(200,0,0,0.5) 30%, rgba(200,0,0,0.5) 70%, transparent)',
          }} />
        </div>
      </motion.div>
    </div>
  );
}
