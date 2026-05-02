"use client"

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '@/context/ThemeContext';
import LeftPanel from '@/components/auth/LeftPanel';

const resetSchema = z.object({
  password: z.string()
    .min(8, { message: 'كلمة السر يجب أن تكون 8 خانات على الأقل' }),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'كلمات السر غير متطابقة',
  path: ['confirmPassword'],
});
type ResetFormValues = z.infer<typeof resetSchema>;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function ResetPasswordPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (_data: ResetFormValues) => {
    await new Promise(r => setTimeout(r, 2000));
    setIsSuccess(true);
  };

  /* ── Palette ── */
  const bg         = isDark ? '#0d1117'  : '#F9F9F3';
  const inputBg    = isDark ? '#080f1e'  : '#ffffff';
  const textMain   = isDark ? '#e6edf3'  : '#1a1a2e';
  const textMuted  = isDark ? '#64748b'  : '#94a3b8';
  const borderIdle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.10)';
  const borderFocus = 'rgba(69,132,130,0.7)';
  const cardBg     = isDark ? '#0d1117'  : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const divider    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width:        '100%',
    background:   inputBg,
    border:       `1px solid ${hasError ? 'rgba(239,68,68,0.6)' : borderIdle}`,
    color:        textMain,
    padding:      '1rem 3rem',
    borderRadius: '1rem',
    outline:      'none',
    fontSize:     '0.875rem',
    fontWeight:   500,
    transition:   'border-color 0.2s',
  });

  /* ── Shared button style ── */
  const submitBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg,#4e9996 0%,#3a7472 60%,#2d5c5a 100%)',
    boxShadow:  '0 8px 32px rgba(69,132,130,0.25), 0 2px 8px rgba(0,0,0,0.3)',
  };

  /* ── Success screen ── */
  if (isSuccess) {
    return (
      <div className="min-h-screen flex overflow-hidden relative font-sans select-none"
        style={{ background: bg, color: textMain }}>
        <LeftPanel subtitle="Security & Access" />

        <div className="w-full lg:w-[58%] flex items-center justify-center p-8 relative z-10">
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle,#458482 0%,transparent 70%)' }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm"
          >
            <div className="p-8 rounded-3xl text-center"
              style={{
                background:  cardBg,
                border:      `1px solid ${cardBorder}`,
                boxShadow:   '0 8px 40px rgba(69,132,130,0.08), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}>

              {/* Icon */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'radial-gradient(circle,rgba(69,132,130,0.15) 0%,rgba(69,132,130,0.04) 100%)',
                  border:     '1px solid rgba(94,168,164,0.2)',
                  boxShadow:  '0 0 24px rgba(69,132,130,0.12)',
                }}>
                <CheckCircle2 className="w-7 h-7 text-[#5ea8a4]" />
              </div>

              <h2 className="font-bold text-xl mb-2"
                style={{ fontFamily: "'Georgia', serif", color: textMain }}>
                Password Updated!
              </h2>
              <p className="text-xs leading-relaxed mb-6 px-2" style={{ color: textMuted }}>
                Your password has been changed successfully. You can now sign in with your new credentials.
              </p>

              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 rounded-full" style={{ background: divider }} />
                <div className="w-1 h-1 rounded-full" style={{ background: textMuted, opacity: 0.4 }} />
                <div className="h-px flex-1 rounded-full" style={{ background: divider }} />
              </div>

              <Link href="/login"
                className="relative inline-flex items-center gap-2.5 overflow-hidden text-white font-bold
                  px-8 py-3.5 rounded-2xl text-[11px] uppercase tracking-[0.18em]
                  transition-all duration-200 group active:scale-[0.98]"
                style={submitBtn}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)' }} />
                <span className="relative">Go to Login</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── Form screen ── */
  return (
    <div className="min-h-screen flex overflow-hidden relative font-sans select-none"
      style={{ background: bg, color: textMain }}>
      <LeftPanel subtitle="Security & Access" />

      <div className="w-full lg:w-[58%] flex items-center justify-center p-8 relative z-10">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle,#458482 0%,transparent 70%)' }} />

        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-sm relative">

          {/* Header */}
          <motion.div variants={item} className="mb-10 text-center lg:text-left">
            <h2 className="text-[2.4rem] font-bold tracking-tight mb-2 leading-tight"
              style={{ fontFamily: "'Georgia', serif", color: textMain }}>
              New Password
            </h2>
            <p className="text-sm font-medium" style={{ color: textMuted }}>
              Set your new secure password below
            </p>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* New Password */}
            <motion.div variants={item} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: textMuted }}>New Password</label>
                {errors.password && (
                  <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.password.message}
                  </span>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: errors.password ? '#f87171' : textMuted }} />
                <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  style={inputStyle(!!errors.password)}
                  onFocus={e => e.currentTarget.style.borderColor = errors.password ? 'rgba(239,68,68,0.6)' : borderFocus}
                  onBlur={e  => e.currentTarget.style.borderColor = errors.password ? 'rgba(239,68,68,0.6)' : borderIdle}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 cursor-pointer transition-colors duration-150"
                  style={{ color: textMuted }}>
                  {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </motion.div>

            {/* Confirm Password */}
            <motion.div variants={item} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: textMuted }}>Confirm Password</label>
                {errors.confirmPassword && (
                  <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.confirmPassword.message}
                  </span>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: errors.confirmPassword ? '#f87171' : textMuted }} />
                <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                  style={inputStyle(!!errors.confirmPassword)}
                  onFocus={e => e.currentTarget.style.borderColor = errors.confirmPassword ? 'rgba(239,68,68,0.6)' : borderFocus}
                  onBlur={e  => e.currentTarget.style.borderColor = errors.confirmPassword ? 'rgba(239,68,68,0.6)' : borderIdle}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 cursor-pointer transition-colors duration-150"
                  style={{ color: textMuted }}>
                  {showConfirm ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div variants={item}>
              <button disabled={isSubmitting}
                className="relative w-full overflow-hidden disabled:opacity-50 text-white font-bold
                  py-[14px] rounded-2xl flex items-center justify-center gap-2.5 group text-[11px]
                  cursor-pointer active:scale-[0.98] uppercase tracking-[0.18em] mt-3 select-none"
                style={submitBtn}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)' }} />
                <span className="relative">{isSubmitting ? 'Updating...' : 'Update Password'}</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </motion.div>
          </form>

        </motion.div>
      </div>
    </div>
  );
}