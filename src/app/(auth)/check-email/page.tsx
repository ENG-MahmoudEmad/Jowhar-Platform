"use client"

import React, { useEffect, useRef, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import LeftPanel from '@/components/auth/LeftPanel';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function CheckEmailPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return; // يمنع التنفيذ المزدوج تبع React Strict Mode بالتطوير
    checkedRef.current = true;

    const cameFromSignup = sessionStorage.getItem('jowhar_signup_flow');
    if (cameFromSignup !== 'true') {
      router.replace('/signup');
      return;
    }
    // نمسحها فورًا (single-use) عشان رجوع للصفحة لاحقًا بالرابط ما يشتغل
    sessionStorage.removeItem('jowhar_signup_flow');
    setAllowed(true);
  }, [router]);

  if (!allowed) return null;

  const bg        = isDark ? '#0d1117'  : '#F9F9F3';
  const textMain  = isDark ? '#e6edf3'  : '#1a1a2e';
  const textMuted = isDark ? '#64748b'  : '#94a3b8';

  return (
    <div
      className="min-h-screen flex overflow-hidden relative font-sans select-none"
      style={{ background: bg, color: textMain }}
    >
      <LeftPanel subtitle="Almost there" />

      <div className="w-full lg:w-[58%] flex items-center justify-center p-8 relative z-10">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #458482 0%, transparent 70%)' }} />

        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-sm relative text-center lg:text-left">

          <motion.div variants={item}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto lg:mx-0"
            style={{
              background: 'linear-gradient(135deg,#4e9996 0%,#3a7472 60%,#2d5c5a 100%)',
              boxShadow: '0 8px 32px rgba(69,132,130,0.25)',
            }}
          >
            <MailCheck className="w-7 h-7 text-white" />
          </motion.div>

          <motion.h2 variants={item}
            className="text-[2.4rem] font-bold tracking-tight mb-3 leading-tight"
            style={{ fontFamily: "'Georgia', serif", color: textMain }}>
            تحقق من بريدك
          </motion.h2>

          <motion.p variants={item} className="text-sm font-medium leading-relaxed mb-2" style={{ color: textMuted }}>
            أرسلنا لك رابط تأكيد على بريدك الإلكتروني. اضغط عليه لتفعيل حسابك.
          </motion.p>

          <motion.p variants={item} className="text-xs font-medium leading-relaxed" style={{ color: textMuted }}>
            الرابط صالح لمدة 24 ساعة. لم يصلك شيء؟ تفقد مجلد الرسائل غير المرغوب فيها (Spam).
          </motion.p>

          {/*
            لا نؤكد صراحةً إن الإيميل مسجل مسبقًا (user enumeration) —
            بس نلمّح بشكل عام: لو الشخص أصلاً عنده حساب، ما رح يوصله شي
            هون، فهاد السطر بيوجّهه لمسار بديل بدون ما يكشف معلومة لأي
            طرف يجرّب إيميلات عشوائية.
          */}
          <motion.p variants={item} className="mt-4 text-xs font-medium leading-relaxed" style={{ color: textMuted, opacity: 0.85 }}>
            إذا كان لديك حساب مسبقاً على هذا البريد، جرّب{' '}
            <Link href="/login" className="font-semibold text-[#5ea8a4] hover:text-white transition-colors duration-150">
              تسجيل الدخول
            </Link>{' '}
            بدلاً من ذلك.
          </motion.p>

          <motion.p variants={item} className="mt-10 text-center lg:text-left text-sm" style={{ color: textMuted }}>
            <Link href="/login" className="font-semibold text-[#5ea8a4] hover:text-white transition-colors duration-150">
              العودة لتسجيل الدخول
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}