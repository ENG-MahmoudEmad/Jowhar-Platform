//src\components\dashboard\profile\ProfileHero.tsx

"use client"

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Camera, Shield, Calendar, Lock, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang }  from '@/context/LangContext';

/* ─── Types ─── */
interface ProfileHeroProps {
  name:           string;
  /** المسمّى الوظيفي — نص حر من `profiles.job_title_*`، مش قائمة ثابتة */
  jobTitle?:      string;
  jobTitleAr?:    string;
  avatarUrl?:     string | null;
  joinedDate:     string;
  /** لون العضو — يحدده الأدمن، وهو مصدر اللون الوحيد بكل المنصة */
  memberColor:    string;
  isAdmin?:       boolean;
  canEditAvatar?: boolean;
  uploading?:     boolean;
  /** موجود فقط لو الشخص بيقدر يغيّر الصورة فعليًا */
  onAvatarSelect?: (file: File) => void;
}

/* ─── Helpers ─── */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatJoinDate(iso: string, lang: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(
    lang === 'ar' ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
}

/* ══════════════════════════════════════════════ */
export default function ProfileHero({
  name,
  jobTitle,
  jobTitleAr,
  avatarUrl,
  joinedDate,
  memberColor,
  isAdmin       = false,
  canEditAvatar = true,
  uploading     = false,
  onAvatarSelect,
}: ProfileHeroProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  /* ── palette ── */
  const bg        = isDark ? 'var(--card)'           : '#ffffff';
  const border    = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)';
  const headerBg  = isDark ? 'var(--background-alt)' : '#f5f5ef';
  const divider   = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)';
  const textMain  = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';

  /*
    اللون كان بيتشتق من خريطة أدوار مكتوبة بالكود. الأدوار صارت نص حر
    (`job_title_*`)، واللون صار عمود مستقل يحدده الأدمن — فأي خريطة هون
    كانت رح تعطي لون لأدوار معروفة وتفشل بالباقي.
  */
  const accent      = memberColor;
  const displayRole = (lang === 'ar' ? jobTitleAr : jobTitle) || jobTitle || jobTitleAr;
  const avatarSrc   = preview ?? avatarUrl ?? null;

  /* ── translations ── */
  const tx = {
    adminBadge:  lang === 'ar' ? 'مشرف'          : 'Admin',
    changePhoto: lang === 'ar' ? 'تغيير الصورة'  : 'Change photo',
    photoLocked: lang === 'ar' ? 'الصورة مقفلة'  : 'Photo locked',
    uploading:   lang === 'ar' ? 'جاري الرفع…'   : 'Uploading…',
    memberSince: lang === 'ar' ? 'عضو منذ'       : 'Member since',
  };

  /* ── avatar upload handler ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // معاينة فورية — الرفع الفعلي بيصير بالأب
    setPreview(URL.createObjectURL(file));
    onAvatarSelect?.(file);

    // تصفير القيمة عشان اختيار نفس الملف مرة تانية يشغّل الحدث
    e.target.value = '';
  };

  const canUpload = canEditAvatar && Boolean(onAvatarSelect);
  const triggerUpload = () => {
    if (canUpload && !uploading) fileInputRef.current?.click();
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {/* ── Banner strip ── */}
      <div
        className="relative h-28 sm:h-36 w-full overflow-hidden"
        style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}
      >
        {/* Decorative gradient accent */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse 70% 120% at ${isRTL ? '80%' : '20%'} 50%, ${accent}55 0%, transparent 70%)`,
          }}
        />
        {/* Subtle grid dots */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)`,
            backgroundSize:  '24px 24px',
          }}
        />

        {/* Label top-corner */}
        <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} flex items-center gap-1.5`}>
          {displayRole && (
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                background: `${accent}22`,
                color:      accent,
                border:     `1px solid ${accent}44`,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}
            >
              {displayRole}
            </span>
          )}
          {isAdmin && (
            <span
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                background: '#10b98122',
                color:      '#10b981',
                border:     '1px solid #10b98144',
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}
            >
              <Shield className="w-2.5 h-2.5" />
              {tx.adminBadge}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 sm:px-8 pb-7">

        {/* Avatar — overlaps the banner */}
        <div className="relative -mt-12 mb-4" style={{ width: 'fit-content' }}>
          <div
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden group"
            style={{
              border:     `3px solid ${bg}`,
              boxShadow:  `0 4px 20px rgba(0,0,0,0.25)`,
              background: accent,
              cursor:     canUpload ? 'pointer' : 'default',
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onClick={triggerUpload}
          >
            {avatarSrc ? (
              preview ? (
                /*
                  معاينة محلية مؤقتة (blob: URL) قبل ما الرفع يخلص —
                  next/image ما بيدعم روابط blob: رسميًا (مش بتطابق
                  remotePatterns)، وهي أصلاً تعرض لثواني بس لحد ما
                  avatarUrl الحقيقي يوصل من الأب، فمو مهمة للأداء.
                */
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={name} className="w-full h-full object-cover" />
              ) : (
                <Image
                  src={avatarSrc}
                  alt={name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
                style={{ fontFamily: 'inherit' }}
              >
                {getInitials(name)}
              </div>
            )}

            {/* Uploading overlay — أولوية على الهوفر */}
            {uploading && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span
                  className="text-[8px] font-bold text-white"
                  style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {tx.uploading}
                </span>
              </div>
            )}

            {/* Hover overlay */}
            <AnimatePresence>
              {hovering && !uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                >
                  {canUpload ? (
                    <>
                      <Camera className="w-5 h-5 text-white" />
                      <span
                        className="text-[8px] font-bold text-white text-center leading-tight px-1"
                        style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                      >
                        {tx.changePhoto}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-white opacity-70" />
                      <span
                        className="text-[8px] font-bold text-white opacity-70 text-center leading-tight px-1"
                        style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                      >
                        {tx.photoLocked}
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hidden file input — الأنواع مطابقة لحدود الـ bucket */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Name + meta */}
        <div className="flex flex-col gap-1.5">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight leading-none"
              style={{ color: textMain, fontFamily: 'inherit' }}
            >
              {name}
            </h1>
          </motion.div>

          {/* Member color block */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2"
          >
            <div
              className="w-5 h-5 rounded-md shrink-0"
              style={{
                background: accent,
                boxShadow:  `0 0 0 3px ${accent}30, 0 2px 8px ${accent}60`,
              }}
            />
            <span
              className="text-xs font-bold"
              style={{ color: accent, fontFamily: 'monospace' }}
            >
              {accent.toUpperCase()}
            </span>
          </motion.div>

          {/* Join date */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-1.5 mt-1"
          >
            <Calendar className="w-3 h-3 shrink-0" style={{ color: textMuted }} />
            <span
              className="text-xs"
              style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {tx.memberSince} {formatJoinDate(joinedDate, lang)}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}