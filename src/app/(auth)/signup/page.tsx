"use client"

import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '@/context/ThemeContext';
import LeftPanel from '@/components/auth/LeftPanel';

const signUpSchema = z.object({
  fullName: z.string()
    .min(3, { message: 'الاسم قصير جداً' })
    .regex(/^[a-zA-Z]+\s+[a-zA-Z]+$/, { message: 'الاسم يجب أن يكون من مقطعين بالإنجليزية' }),
  email: z.string()
    .min(1, { message: 'البريد الإلكتروني مطلوب' })
    .email({ message: 'صيغة البريد غير صحيحة' }),
  password: z.string()
    .min(8, { message: '8 خانات على الأقل' })
    .regex(/[A-Z]/, { message: 'حرف كبير واحد على الأقل' })
    .regex(/[a-z]/, { message: 'حرف صغير واحد على الأقل' })
    .regex(/[0-9]/, { message: 'رقم واحد على الأقل' })
    .regex(/^[a-zA-Z0-9]*$/, { message: 'أحرف وأرقام إنجليزية فقط' }),
});
type SignUpFormValues = z.infer<typeof signUpSchema>;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function SignUpPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
  });

  const onSubmit = (data: SignUpFormValues) => {
    console.log('Account Creation Data:', data);
  };

  const bg        = isDark ? '#0d1117'  : '#F9F9F3';
  const inputBg   = isDark ? '#080f1e'  : '#ffffff';
  const textMain  = isDark ? '#e6edf3'  : '#1a1a2e';
  const textMuted = isDark ? '#64748b'  : '#94a3b8';
  const borderIdle  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.10)';
  const borderFocus = 'rgba(69,132,130,0.7)';
  const borderErr   = 'rgba(239,68,68,0.6)';

  const inputCls = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    background: inputBg,
    border: `1px solid ${hasError ? borderErr : borderIdle}`,
    color: textMain,
    padding: '1rem 3rem',
    borderRadius: '1rem',
    outline: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'border-color 0.2s, background 0.2s',
  });

  const fields = [
    {
      id: 'fullName' as const,
      label: 'Full Name',
      icon: User,
      type: 'text',
      placeholder: 'John Doe',
      error: errors.fullName,
    },
    {
      id: 'email' as const,
      label: 'Work Email',
      icon: Mail,
      type: 'email',
      placeholder: 'name@jowhar.com',
      error: errors.email,
    },
  ];

  return (
    <div
      className="min-h-screen flex overflow-hidden relative font-sans select-none"
      style={{ background: bg, color: textMain }}
    >
      <LeftPanel subtitle="Welcome to" />

      {/* Right panel */}
      <div className="w-full lg:w-[58%] flex items-center justify-center p-8 relative z-10">

        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #458482 0%, transparent 70%)' }} />

        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-sm relative">

          {/* Header */}
          <motion.div variants={item} className="mb-10 text-center lg:text-left">
            <h2 className="text-[2.4rem] font-bold tracking-tight mb-2 leading-tight"
              style={{ fontFamily: "'Georgia', serif", color: textMain }}>
              Join the Studio
            </h2>
            <p className="text-sm font-medium" style={{ color: textMuted }}>
              Create your artist account today
            </p>
          </motion.div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

            {/* Full Name + Email */}
            {fields.map(({ id, label, icon: Icon, type, placeholder, error }) => (
              <motion.div key={id} variants={item} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: textMuted }}>
                    {label}
                  </label>
                  {error && (
                    <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3"/> {error.message}
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: error ? '#f87171' : textMuted }} />
                  <input {...register(id)} type={type} placeholder={placeholder}
                    style={inputCls(!!error)}
                    onFocus={e => e.currentTarget.style.borderColor = error ? borderErr : borderFocus}
                    onBlur={e  => e.currentTarget.style.borderColor = error ? borderErr : borderIdle}
                  />
                </div>
              </motion.div>
            ))}

            {/* Password */}
            <motion.div variants={item} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: textMuted }}>
                  Password
                </label>
                {errors.password && (
                  <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.password.message}
                  </span>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                  style={{ color: errors.password ? '#f87171' : textMuted }} />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  style={inputCls(!!errors.password)}
                  onFocus={e => e.currentTarget.style.borderColor = errors.password ? borderErr : borderFocus}
                  onBlur={e  => e.currentTarget.style.borderColor = errors.password ? borderErr : borderIdle}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 transition-colors duration-150 cursor-pointer"
                  style={{ color: textMuted }}>
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
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
                  boxShadow: '0 8px 32px rgba(69,132,130,0.25), 0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)' }} />
                <span className="relative">{isSubmitting ? 'Creating...' : 'Create Artist Account'}</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </motion.div>
          </form>

          <motion.p variants={item} className="mt-8 text-center text-sm" style={{ color: textMuted }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#5ea8a4] hover:text-white transition-colors duration-150">
              Sign In
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}