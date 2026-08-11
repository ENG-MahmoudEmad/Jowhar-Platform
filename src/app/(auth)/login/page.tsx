"use client"

import React, { useEffect, useState } from 'react';
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '@/context/ThemeContext';
import LeftPanel from '@/components/auth/LeftPanel';
import { createClient } from '@/lib/supabase/client';

const loginSchema = z.object({
  email: z.string()
    .min(1, { message: 'البريد الإلكتروني مطلوب' })
    .email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  password: z.string()
    .min(6, { message: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * رسالة موحدة لكل حالات الفشل (بيانات غلط / حساب غير موجود / pending / rejected).
 * مقصودة: أي تفصيل إضافي بيكشف إذا كان الإيميل مسجل أصلاً (user enumeration).
 */
const UNIFIED_ERROR = 'بيانات الدخول غير صحيحة أو الحساب غير مفعّل بعد';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function LoginPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showPassword, setShowPassword] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // رسائل قادمة من الـ proxy أو من رابط تأكيد فاشل
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'account_unavailable') {
      setApprovalError('لا يمكن الدخول لهذا الحساب حالياً. يرجى مراجعة الإدارة.');
    } else if (err === 'invalid_confirmation_link') {
      setApprovalError('رابط التفعيل غير صالح أو منتهي الصلاحية.');
    }
  }, [searchParams]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApprovalError(null);
    const supabase = createClient();

    // 1) محاولة الدخول
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error || !authData.user) {
      setApprovalError(UNIFIED_ERROR);
      return;
    }

    // 2) نجح الدخول -> نفحص حالة الحساب الفعلية
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status, is_suspended, suspended_until, deleted_at')
      .eq('id', authData.user.id)
      .single();

    const suspensionActive =
      profile?.is_suspended &&
      (!profile.suspended_until || new Date(profile.suspended_until) > new Date());

    const blocked =
      !profile ||
      profile.deleted_at !== null ||
      suspensionActive ||
      profile.status !== 'active';

    if (blocked) {
      // مهم: نطلع الجلسة فورًا عشان ما تفضل جلسة صالحة لحساب ممنوع
      await supabase.auth.signOut();
      setApprovalError(UNIFIED_ERROR);
      return;
    }

    // 3) دخول واحد بس بأي وقت — نقفل أي جلسة تانية مفتوحة لنفس الحساب
    // (جهاز/متصفح تاني) بدون ما تلمس جلستنا الحالية. best-effort: فشلها
    // ما لازم يمنع تسجيل الدخول الحالي، فبنكمل عادي حتى لو رمت خطأ.
    try {
      await supabase.auth.signOut({ scope: 'others' });
    } catch {
      // تجاهل — الجلسة الحالية سليمة، وهاي مجرد إجراء إضافي
    }

    // 4) حساب نشط -> للداشبورد
    router.push('/dashboard');
    router.refresh(); // يجبر الـ proxy يعيد التقييم بالجلسة الجديدة
  };

  const bg       = isDark ? '#0d1117'   : '#F9F9F3';
  const inputBg  = isDark ? '#080f1e'   : '#ffffff';
  const textMain = isDark ? '#e6edf3'   : '#1a1a2e';
  const textMuted = isDark ? '#64748b'  : '#94a3b8';
  const borderIdle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.10)';
  const borderFocus = 'rgba(69,132,130,0.7)';
  const borderErr   = 'rgba(239,68,68,0.6)';

  const inputCls = (hasError: boolean) => ({
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
  } as React.CSSProperties);

  return (
    <div
      className="min-h-screen flex overflow-hidden relative font-sans select-none"
      style={{ background: bg, color: textMain }}
    >
      <LeftPanel subtitle="Welcome back to" />

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
              Welcome Back
            </h2>
            <p className="text-sm font-medium" style={{ color: textMuted }}>
              Access your creative dashboard
            </p>
          </motion.div>

          {/* Approval error */}
          {approvalError && (
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 rounded-2xl flex items-start gap-3 text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">{approvalError}</p>
            </motion.div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

            {/* Email */}
            <motion.div variants={item} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: textMuted }}>
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
                  autoComplete="email"
                  style={inputCls(!!errors.email)}
                  onFocus={e => e.currentTarget.style.borderColor = errors.email ? borderErr : borderFocus}
                  onBlur={e  => e.currentTarget.style.borderColor = errors.email ? borderErr : borderIdle}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={item} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: textMuted }}>
                  Password
                </label>
                {errors.password ? (
                  <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.password.message}
                  </span>
                ) : (
                  <Link href="/forgot-password"
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150"
                    style={{ color: textMuted }}
                    onMouseEnter={e => e.currentTarget.style.color = '#5ea8a4'}
                    onMouseLeave={e => e.currentTarget.style.color = textMuted}
                  >
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                  style={{ color: errors.password ? '#f87171' : textMuted }} />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  autoComplete="current-password"
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
                className="relative w-full overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed
                  text-white font-bold py-[14px] rounded-2xl flex items-center justify-center gap-2.5
                  group text-[11px] cursor-pointer active:scale-[0.98] uppercase tracking-[0.18em] mt-3 select-none"
                style={{
                  background: 'linear-gradient(135deg,#4e9996 0%,#3a7472 60%,#2d5c5a 100%)',
                  boxShadow: '0 8px 32px rgba(69,132,130,0.25), 0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)' }} />
                <span className="relative">{isSubmitting ? 'Checking Access...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </motion.div>
          </form>

          <motion.p variants={item} className="mt-8 text-center text-sm" style={{ color: textMuted }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#5ea8a4] hover:text-white transition-colors duration-150">
              Sign Up
            </Link>
          </motion.p>

          <motion.footer variants={item}
            className="mt-16 text-center text-[10px] uppercase tracking-[0.5em] font-bold opacity-30 select-none"
            style={{ color: textMuted }}>
            © 2026 Jowhar Studio
          </motion.footer>
        </motion.div>
      </div>
    </div>
  );
}