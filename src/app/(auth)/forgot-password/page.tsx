"use client"

import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '@/context/ThemeContext';
import LeftPanel from '@/components/auth/LeftPanel';

const forgotSchema = z.object({
  email: z.string()
    .min(1, { message: 'البريد الإلكتروني مطلوب' })
    .email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
});
type ForgotFormValues = z.infer<typeof forgotSchema>;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: ForgotFormValues) => {
    console.log('Reset link requested for:', data.email);
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitted(true);
  };

  const bg          = isDark ? '#0d1117'  : '#F9F9F3';
  const inputBg     = isDark ? '#080f1e'  : '#ffffff';
  const textMain    = isDark ? '#e6edf3'  : '#1a1a2e';
  const textMuted   = isDark ? '#64748b'  : '#94a3b8';
  const borderIdle  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.10)';
  const borderFocus = 'rgba(69,132,130,0.7)';
  const borderErr   = 'rgba(239,68,68,0.6)';
  const cardBg      = isDark ? '#0d1117'  : '#ffffff';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const divider     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    background:   inputBg,
    border:       `1px solid ${errors.email ? borderErr : borderIdle}`,
    color:        textMain,
    padding:      '1rem 3rem',
    borderRadius: '1rem',
    outline:      'none',
    fontSize:     '0.875rem',
    fontWeight:   500,
    transition:   'border-color 0.2s, background 0.2s',
  };

  return (
    <div
      className="min-h-screen flex overflow-hidden relative font-sans select-none"
      style={{ background: bg, color: textMain }}
    >
      <LeftPanel subtitle="Security & Access" />

      {/* Right panel */}
      <div className="w-full lg:w-[58%] flex items-center justify-center p-8 relative z-10">

        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle,#458482 0%,transparent 70%)' }} />

        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-sm relative">

          {/* Back link + Header */}
          <motion.div variants={item} className="mb-10">
            <Link href="/login"
              className="inline-flex items-center gap-2 mb-7 group transition-colors duration-150"
              style={{ color: '#5ea8a4' }}
              onMouseEnter={e => e.currentTarget.style.color = textMain}
              onMouseLeave={e => e.currentTarget.style.color = '#5ea8a4'}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Back to Login</span>
            </Link>

            <h2 className="text-[2.4rem] font-bold tracking-tight mb-2 leading-tight"
              style={{ fontFamily: "'Georgia', serif", color: textMain }}>
              Reset Password
            </h2>
            <p className="text-sm font-medium" style={{ color: textMuted }}>
              Enter your email and we'll send you a recovery link
            </p>
          </motion.div>

          {!isSubmitted ? (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

              {/* Email */}
              <motion.div variants={item} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: textMuted }}>
                    Email Address
                  </label>
                  {errors.email && (
                    <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3"/> {errors.email.message}
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: errors.email ? '#f87171' : textMuted }} />
                  <input {...register('email')} type="email" placeholder="name@jowhar.com"
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = errors.email ? borderErr : borderFocus}
                    onBlur={e  => e.currentTarget.style.borderColor = errors.email ? borderErr : borderIdle}
                  />
                </div>
              </motion.div>

              {/* Submit */}
              <motion.div variants={item}>
                <button disabled={isSubmitting}
                  className="relative w-full overflow-hidden disabled:opacity-50 text-white font-bold
                    py-[14px] rounded-2xl flex items-center justify-center gap-2.5 group text-[11px]
                    cursor-pointer active:scale-[0.98] uppercase tracking-[0.18em] mt-3 select-none"
                  style={{
                    background: 'linear-gradient(135deg,#4e9996 0%,#3a7472 60%,#2d5c5a 100%)',
                    boxShadow:  '0 8px 32px rgba(69,132,130,0.25), 0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)' }} />
                  <span className="relative">{isSubmitting ? 'Sending...' : 'Send Reset Link'}</span>
                  <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </motion.div>
            </form>

          ) : (
            /* ─── Success state ─── */
            <motion.div variants={item}
              className="p-7 rounded-3xl text-center"
              style={{
                background:  cardBg,
                border:      `1px solid ${cardBorder}`,
                boxShadow:   '0 8px 40px rgba(69,132,130,0.08), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'radial-gradient(circle,rgba(69,132,130,0.15) 0%,rgba(69,132,130,0.04) 100%)',
                  border:     '1px solid rgba(94,168,164,0.2)',
                  boxShadow:  '0 0 24px rgba(69,132,130,0.12)',
                }}>
                <CheckCircle2 className="w-7 h-7 text-[#5ea8a4]" />
              </div>

              <h3 className="font-bold text-lg mb-2"
                style={{ fontFamily: "'Georgia', serif", color: textMain }}>
                Check your inbox
              </h3>
              <p className="text-xs leading-relaxed mb-6 px-2" style={{ color: textMuted }}>
                We've sent a password recovery link to your email. Check your spam folder if you don't see it.
              </p>

              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 rounded-full" style={{ background: divider }} />
                <div className="w-1 h-1 rounded-full" style={{ background: textMuted, opacity: 0.4 }} />
                <div className="h-px flex-1 rounded-full" style={{ background: divider }} />
              </div>

              <button onClick={() => setIsSubmitted(false)}
                className="text-[10px] font-bold uppercase tracking-widest transition-colors duration-150 cursor-pointer"
                style={{ color: '#5ea8a4' }}
                onMouseEnter={e => e.currentTarget.style.color = textMain}
                onMouseLeave={e => e.currentTarget.style.color = '#5ea8a4'}
              >
                Try another email
              </button>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  );
}