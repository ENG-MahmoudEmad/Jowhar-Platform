"use client"

import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '@/context/ThemeContext';
import LeftPanel from '@/components/auth/LeftPanel';

const loginSchema = z.object({
  email: z.string()
    .min(1, { message: 'البريد الإلكتروني مطلوب' })
    .email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  password: z.string()
    .min(6, { message: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApprovalError(null);
    await new Promise(r => setTimeout(r, 1200));
    const mockStatus = 'pending_approval';
    if (mockStatus === 'pending_approval') {
      setApprovalError('عذراً، حسابك بانتظار تفعيل المسؤول. يرجى مراجعة الإدارة.');
    }
  };

  const bg       = isDark ? '#0d1117'   : '#F9F9F3';
  const cardBg   = isDark ? '#0d1117'   : '#F9F9F3';
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
            Don't have an account?{' '}
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







// "use client"

// import React, { useState } from 'react';
// import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
// import { motion } from 'framer-motion';
// import Link from 'next/link';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import * as z from 'zod';

// const loginSchema = z.object({
//   email: z.string()
//     .min(1, { message: "البريد الإلكتروني مطلوب" })
//     .email({ message: "يرجى إدخال بريد إلكتروني صحيح" }),
//   password: z.string()
//     .min(6, { message: "كلمة السر يجب أن تكون 6 أحرف على الأقل" })
// });

// type LoginFormValues = z.infer<typeof loginSchema>;

// /* ─── Stagger animation variants ─── */
// const container = {
//   hidden: {},
//   show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
// };
// const item = {
//   hidden: { opacity: 0, y: 14 },
//   show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
// };

// export default function LoginPage() {
//   const [showPassword, setShowPassword] = useState(false);

//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isSubmitting }
//   } = useForm<LoginFormValues>({
//     resolver: zodResolver(loginSchema),
//     mode: "onTouched"
//   });

//   const onSubmit = (data: LoginFormValues) => {
//     console.log("Form Data Sent:", data);
//   };

//   /* ─── Shared input class builder ─── */
//   const inputCls = (hasError: boolean) =>
//     `w-full bg-[#080f1e] border ${hasError
//       ? 'border-red-500/60 focus:border-red-500'
//       : 'border-white/[0.07] focus:border-[#458482]/70'
//     } text-white placeholder:text-slate-600 px-12 py-4 rounded-2xl outline-none transition-all duration-200 text-sm font-medium focus:ring-2 ${hasError ? 'focus:ring-red-500/10' : 'focus:ring-[#458482]/10'} focus:bg-[#0b1525]`;

//   return (
//     <div className="min-h-screen flex bg-[#020617] text-white overflow-hidden relative font-sans select-none">

//       {/* ─── Left Panel ─── */}
//       <div className="hidden lg:flex lg:w-[42%] relative items-center justify-center overflow-hidden z-20">

//         {/* Base teal fill */}
//         <div className="absolute inset-0 bg-[#2d5c5a]" />

//         {/* Radial light source from top-left */}
//         <div className="absolute inset-0"
//           style={{ background: 'radial-gradient(ellipse 80% 70% at 20% 15%, rgba(99,180,170,0.45) 0%, transparent 65%)' }} />

//         {/* Subtle bottom shadow */}
//         <div className="absolute inset-0"
//           style={{ background: 'linear-gradient(to top, rgba(2,6,23,0.5) 0%, transparent 50%)' }} />

//         {/* Geometric accent lines */}
//         <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
//           <line x1="0" y1="20%" x2="100%" y2="80%" stroke="white" strokeWidth="0.8" />
//           <line x1="0" y1="70%" x2="100%" y2="30%" stroke="white" strokeWidth="0.5" />
//           <circle cx="70%" cy="25%" r="120" fill="none" stroke="white" strokeWidth="0.6" />
//           <circle cx="25%" cy="75%" r="80" fill="none" stroke="white" strokeWidth="0.5" />
//           <rect x="65%" y="55%" width="200" height="200" rx="4"
//             fill="none" stroke="white" strokeWidth="0.5"
//             transform="rotate(-15 70% 65%)" />
//         </svg>

//         {/* Grain overlay */}
//         <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none">
//           <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
//             <filter id="g">
//               <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
//               <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
//             </filter>
//             <rect width="100%" height="100%" filter="url(#g)" />
//           </svg>
//         </div>

//         {/* Brand content */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
//           className="relative z-10 text-center px-12"
//         >
//           <p className="text-[11px] font-bold opacity-60 uppercase tracking-[0.55em] text-white/80 mb-5">
//             Welcome back to
//           </p>
//           <h1
//             className="text-[4.5rem] font-black tracking-[0.22em] uppercase text-white drop-shadow-xl leading-none mb-5"
//             style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.18em' }}
//           >
//             JOWHAR
//           </h1>

//           {/* Divider with dots */}
//           <div className="flex items-center justify-center gap-3 mb-7">
//             <div className="h-px w-10 bg-white/30 rounded-full" />
//             <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
//             <div className="h-px w-10 bg-white/30 rounded-full" />
//           </div>

//           <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.5em] text-white/80">
//             Animation Studio Workspace
//           </p>
//         </motion.div>
//       </div>

//       {/* ─── Right Panel ─── */}
//       <div className="w-full lg:w-[58%] flex items-center justify-center p-8 relative z-10">

//         {/* Subtle ambient glow behind form */}
//         <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
//           style={{ background: 'radial-gradient(circle, #458482 0%, transparent 70%)' }} />

//         <motion.div
//           variants={container}
//           initial="hidden"
//           animate="show"
//           className="w-full max-w-sm relative"
//         >
//           {/* Header */}
//           <motion.div variants={item} className="mb-10 text-center lg:text-left">
//             <h2
//               className="text-[2.4rem] font-bold tracking-tight text-white mb-2 leading-tight"
//               style={{ fontFamily: "'Georgia', serif" }}
//             >
//               Welcome Back
//             </h2>
//             <p className="text-slate-500 text-sm font-medium">Access your creative dashboard</p>
//           </motion.div>

//           <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

//             {/* Email */}
//             <motion.div variants={item} className="space-y-2">
//               <div className="flex justify-between items-center">
//                 <label className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.18em]">
//                   Email Address
//                 </label>
//                 {errors.email && (
//                   <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
//                     <AlertCircle className="w-3 h-3" /> {errors.email.message}
//                   </span>
//                 )}
//               </div>
//               <div className="relative group">
//                 <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${errors.email ? 'text-red-400' : 'text-slate-600 group-focus-within:text-[#5ea8a4]'}`} />
//                 <input
//                   {...register("email")}
//                   type="email"
//                   placeholder="name@jowhar.com"
//                   className={inputCls(!!errors.email)}
//                 />
//               </div>
//             </motion.div>

//             {/* Password */}
//             <motion.div variants={item} className="space-y-2">
//               <div className="flex justify-between items-center">
//                 <label className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.18em]">
//                   Password
//                 </label>
//                 {errors.password ? (
//                   <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
//                     <AlertCircle className="w-3 h-3" /> {errors.password.message}
//                   </span>
//                 ) : (
//                   <Link
//                     href="/forgot-password"
//                     className="text-[10px] font-semibold text-slate-600 hover:text-[#5ea8a4] transition-colors duration-150 uppercase tracking-[0.12em]"
//                   >
//                     Forgot Password?
//                   </Link>
//                 )}
//               </div>
//               <div className="relative group">
//                 <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${errors.password ? 'text-red-400' : 'text-slate-600 group-focus-within:text-[#5ea8a4]'}`} />
//                 <input
//                   {...register("password")}
//                   type={showPassword ? "text" : "password"}
//                   placeholder="••••••••"
//                   className={inputCls(!!errors.password)}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 p-1 cursor-pointer transition-colors duration-150"
//                 >
//                   {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                 </button>
//               </div>
//             </motion.div>

//             {/* Submit */}
//             <motion.div variants={item}>
//               <button
//                 disabled={isSubmitting}
//                 className="relative w-full overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-[14px] rounded-2xl transition-all duration-200 flex items-center justify-center gap-2.5 group text-[11px] cursor-pointer active:scale-[0.98] uppercase tracking-[0.18em] mt-3 select-none"
//                 style={{
//                   background: 'linear-gradient(135deg, #4e9996 0%, #3a7472 60%, #2d5c5a 100%)',
//                   boxShadow: '0 8px 32px rgba(69,132,130,0.25), 0 2px 8px rgba(0,0,0,0.4)',
//                 }}
//               >
//                 {/* Shimmer layer */}
//                 <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
//                   style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }} />
//                 <span className="relative">
//                   {isSubmitting ? "Checking..." : "Sign In to Dashboard"}
//                 </span>
//                 <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
//               </button>
//             </motion.div>
//           </form>

//           {/* Footer links */}
//           <motion.p variants={item} className="mt-8 text-center text-sm text-slate-600">
//             Don't have an account?{' '}
//             <Link href="/signup" className="text-[#5ea8a4] font-semibold hover:text-white transition-colors duration-150">
//               Sign Up
//             </Link>
//           </motion.p>

//           <motion.footer variants={item} className="mt-16 text-center text-slate-600 text-[10px] uppercase tracking-[0.5em] font-bold opacity-30 select-none">
//             © 2026 Jowhar Studio
//           </motion.footer>
//         </motion.div>
//       </div>
//     </div>
//   );
// }