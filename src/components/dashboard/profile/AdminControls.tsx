//src\components\dashboard\profile\AdminControls.tsx
"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Camera, Lock, ChevronRight,
  Check, X, AlertTriangle, Trash2, Mail, Pipette, Palette, Briefcase, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import { useLang }  from '@/context/LangContext'
import ImageColorPicker from './ImageColorPicker'

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
export interface MemberRestrictions {
  avatarLocked: boolean
  nameLocked:   boolean
}

export interface PendingEmailChange {
  newEmail:    string
  requestedAt: string // ISO
  stage:       'pending_admin' | 'pending_email_verification'
}

interface AdminControlsProps {
  memberId:     string
  memberName:   string
  memberColor:  string
  jobTitleEn:   string
  jobTitleAr:   string
  restrictions: MemberRestrictions
  pendingEmail?: PendingEmailChange | null
  /** الدور والصلاحيات والإيقاف كلهم بـ Admin Control — هذا رابط لهناك */
  canEditIdentity: boolean
  /** بروفايلك أنت: الهوية بس، بدون أقفال ولا حذف ولا رابط الأدوار */
  isSelf?: boolean
  /** لالتقاط لون من صورة العضو مباشرة */
  avatarUrl?: string | null
  onColorChange:       (color: string) => Promise<void>
  onJobTitleChange:    (en: string, ar: string) => Promise<void>
  onRestrictionToggle: (key: keyof MemberRestrictions, value: boolean) => Promise<void>
  onApproveEmail:      () => Promise<void>
  onRejectEmail:       () => Promise<void>
  onDelete:            () => Promise<void>
}

/* ══════════════════════════════════════════════
   Small helpers
   ══════════════════════════════════════════════ */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="opacity-60">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: 'var(--foreground-muted)' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
    </div>
  )
}

function ToggleRow({
  label, sublabel, checked, onChange, accentColor = '#458482', isDark, busy,
}: {
  label:        string
  sublabel?:    string
  checked:      boolean
  onChange:     () => void
  accentColor?: string
  isDark:       boolean
  busy?:        boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
        border:     `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        opacity:    busy ? 0.6 : 1,
      }}
      onClick={() => { if (!busy) onChange() }}
    >
      <div>
        <p className="text-[12px] font-semibold" style={{ color: 'var(--foreground)' }}>{label}</p>
        {sublabel && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>{sublabel}</p>
        )}
      </div>
      <div
        className="relative shrink-0 rounded-full transition-all duration-200"
        style={{
          width:      36,
          height:     20,
          background: checked ? accentColor : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'),
        }}
      >
        <motion.div
          animate={{ x: checked ? 18 : 2 }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          className="absolute top-[2px] w-4 h-4 rounded-full bg-white"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════ */
export default function AdminControls({
  memberId,
  memberName,
  memberColor,
  jobTitleEn,
  jobTitleAr,
  restrictions,
  pendingEmail = null,
  canEditIdentity,
  isSelf = false,
  avatarUrl = null,
  onColorChange,
  onJobTitleChange,
  onRestrictionToggle,
  onApproveEmail,
  onRejectEmail,
  onDelete,
}: AdminControlsProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'

  /* ── palette ── */
  const bg        = isDark ? 'var(--card)'           : '#ffffff'
  const border    = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)'
  const headerBg  = isDark ? 'var(--background-alt)' : '#f5f5ef'
  const divider   = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)'
  const inputBg   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'

  /* ── local UI state ── */
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [countdown,     setCountdown]     = useState(10)
  const [colorVal,      setColorVal]      = useState(memberColor)
  const [titleEn,       setTitleEn]       = useState(jobTitleEn)
  const [titleAr,       setTitleAr]       = useState(jobTitleAr)
  const [savingTitle,   setSavingTitle]   = useState(false)
  const [titleSaved,    setTitleSaved]    = useState(false)
  const [busyLock,      setBusyLock]      = useState<keyof MemberRestrictions | null>(null)
  const [busyEmail,     setBusyEmail]     = useState(false)
  const [eyedropperSupported, setEyedropperSupported] = useState(false)

  React.useEffect(() => {
    setEyedropperSupported(typeof window !== 'undefined' && !!window.EyeDropper)
  }, [])

  /*
    المواصفات: زر الحذف معطّل 10 ثواني مع عد تنازلي — الحذف بيمس تاريخ
    شغل كامل، فالتأخير المتعمّد بيمنع الضغطة الانعكاسية.
  */
  React.useEffect(() => {
    if (!deleteConfirm) { setCountdown(10); return }
    if (countdown === 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [deleteConfirm, countdown])

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return
    try {
      const dropper = new window.EyeDropper()
      const result  = await dropper.open()
      setColorVal(result.sRGBHex)
      void onColorChange(result.sRGBHex)
    } catch { /* user cancelled */ }
  }

  const handleColorHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
      setColorVal(v)
      if (v.length === 7) void onColorChange(v)
    }
  }

  const handleSaveTitle = async () => {
    setSavingTitle(true)
    try {
      await onJobTitleChange(titleEn, titleAr)
      setTitleSaved(true)
      setTimeout(() => setTitleSaved(false), 2000)
    } finally {
      setSavingTitle(false)
    }
  }

  const handleToggleLock = async (key: keyof MemberRestrictions) => {
    setBusyLock(key)
    try {
      await onRestrictionToggle(key, !restrictions[key])
    } finally {
      setBusyLock(null)
    }
  }

  const handleEmailAction = async (action: () => Promise<void>) => {
    setBusyEmail(true)
    try { await action() } finally { setBusyEmail(false) }
  }

  /* ── translations ── */
  const tx = {
    title:            lang === 'ar' ? 'صلاحيات الأدمن'            : 'Admin Controls',
    subtitle:         isSelf
      ? (lang === 'ar' ? 'لونك ومسمّاك الوظيفي' : 'Your color & job title')
      : (lang === 'ar' ? 'إدارة هوية العضو'      : 'Manage member identity'),
    sectionTitle:     lang === 'ar' ? 'المسمّى الوظيفي'           : 'Job Title',
    sectionColor:     lang === 'ar' ? 'اللون الشخصي'              : 'Member Color',
    sectionProfile:   lang === 'ar' ? 'قيود البروفايل'            : 'Profile Restrictions',
    sectionEmail:     lang === 'ar' ? 'طلب تغيير الإيميل'         : 'Email Change Request',
    sectionDanger:    lang === 'ar' ? 'منطقة الخطر'               : 'Danger Zone',
    titleEn:          lang === 'ar' ? 'بالإنجليزية'               : 'English',
    titleAr:          lang === 'ar' ? 'بالعربية'                  : 'Arabic',
    titleNote:        lang === 'ar'
      ? 'الاثنان اختياريان — لو تُرك أحدهما فارغاً يُعرض الآخر بدلاً منه'
      : 'Both optional — if one is empty the other is shown instead',
    save:             lang === 'ar' ? 'حفظ'                       : 'Save',
    saved:            lang === 'ar' ? 'تم الحفظ'                  : 'Saved',
    identityLocked:   lang === 'ar'
      ? 'اللون والمسمّى الوظيفي يحددهما الـ Chief أو الـ Developer فقط'
      : 'Color and job title can only be set by the Chief or Developer',
    eyedropper:       lang === 'ar' ? 'قطارة اللون'               : 'Eyedropper',
    eyedropperNo:     lang === 'ar' ? 'غير مدعوم في هذا المتصفح'  : 'Not supported in this browser',
    eyedropperNote:   lang === 'ar'
      ? '⚠️ القطارة تلتقط من أي مكان بالشاشة، وتعمل في Chrome وEdge فقط. لالتقاط لون من صورة العضو استخدم المربّع على اليمين.'
      : '⚠️ The eyedropper samples anywhere on screen (Chrome & Edge only). To sample from the member photo, use the thumbnail.',
    lockAvatar:       lang === 'ar' ? 'قفل الصورة الشخصية'        : 'Lock Profile Photo',
    lockAvatarSub:    lang === 'ar' ? 'يمنع العضو من تغيير صورته' : 'Prevents member from changing their photo',
    lockName:         lang === 'ar' ? 'قفل الاسم'                 : 'Lock Name',
    lockNameSub:      lang === 'ar' ? 'يمنع العضو من تغيير اسمه'  : 'Prevents member from editing their name',
    pendingNew:       lang === 'ar' ? 'الإيميل الجديد المطلوب'    : 'Requested new email',
    requestedAt:      lang === 'ar' ? 'طُلب في'                   : 'Requested at',
    awaitingVerify:   lang === 'ar'
      ? 'تمت الموافقة — بانتظار تأكيد العضو من الإيميل الجديد'
      : 'Approved — awaiting confirmation from the new inbox',
    approve:          lang === 'ar' ? 'موافقة'                    : 'Approve',
    reject:           lang === 'ar' ? 'رفض'                       : 'Reject',
    rolesElsewhere:   lang === 'ar' ? 'الدور والصلاحيات والإيقاف' : 'Role, permissions & suspension',
    rolesElsewhereSub:lang === 'ar' ? 'تُدار من صفحة Admin Control' : 'Managed from Admin Control',
    goToAdmin:        lang === 'ar' ? 'فتح'                       : 'Open',
    deleteTitle:      lang === 'ar' ? 'حذف الحساب'                : 'Delete Account',
    deleteSub:        lang === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone',
    deleteBtn:        lang === 'ar' ? 'حذف الحساب'                : 'Delete Account',
    deleteConfirmMsg: lang === 'ar'
      ? `سيختفي حساب ${memberName} من كل الواجهات، وتبقى تاسكاته محفوظة في سجل المشاريع. الحذف النهائي بعد 90 يوماً.`
      : `${memberName}'s account will disappear from every view, while their tasks stay in the project history. Permanent removal after 90 days.`,
    confirmDelete:    lang === 'ar' ? 'نعم، احذف'                 : 'Yes, delete',
    waitSeconds:      lang === 'ar' ? 'انتظر'                     : 'Wait',
    cancelDelete:     lang === 'ar' ? 'إلغاء'                     : 'Cancel',
  }

  const arabicFont = lang === 'ar' ? 'var(--font-arabic)' : 'inherit'

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {/* ── Header ── */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#f9741622', border: '1px solid #f9741644' }}
        >
          <Shield className="w-4 h-4" style={{ color: '#f97416' }} />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest"
            style={{ color: 'var(--foreground)', fontFamily: arabicFont }}>
            {tx.title}
          </h2>
          <p className="text-[11px] mt-0.5"
            style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
            {tx.subtitle}
          </p>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-6">

        {/* ══ 1. JOB TITLE ══ */}
        <div>
          <SectionHeader icon={<Briefcase className="w-3.5 h-3.5" />} label={tx.sectionTitle} />
          {canEditIdentity ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
                    {tx.titleEn}
                  </label>
                  <input
                    value={titleEn}
                    onChange={e => setTitleEn(e.target.value)}
                    maxLength={60}
                    placeholder="Lead Animator"
                    className="px-3 py-2 rounded-xl text-sm font-medium outline-none"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: 'var(--foreground)', direction: 'ltr' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
                    {tx.titleAr}
                  </label>
                  <input
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    maxLength={60}
                    placeholder="محرك رئيسي"
                    className="px-3 py-2 rounded-xl text-sm font-medium outline-none"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: 'var(--foreground)', direction: 'rtl', fontFamily: 'var(--font-arabic)' }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all disabled:cursor-not-allowed"
                  style={{ background: '#458482', color: '#fff', opacity: savingTitle ? 0.7 : 1, fontFamily: arabicFont }}
                >
                  {savingTitle
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Check className="w-3.5 h-3.5" />}
                  {tx.save}
                </button>
                <AnimatePresence>
                  {titleSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#10b98122', color: '#10b981', fontFamily: arabicFont }}
                    >
                      {tx.saved}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-[10px]" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
                {tx.titleNote}
              </p>
            </div>
          ) : (
            <p className="text-[11px] px-3 py-2.5 rounded-xl"
              style={{ background: inputBg, color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
              {tx.identityLocked}
            </p>
          )}
        </div>

        {/* ══ 2. MEMBER COLOR ══ */}
        {canEditIdentity && (
          <div>
            <SectionHeader icon={<Palette className="w-3.5 h-3.5" />} label={tx.sectionColor} />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {/*
                  عيّنة من صورة العضو — القطارة الأصلية بتجمّد المتصفح
                  فما بتقدر تسكرول لصورته فوق، وما إلها وجود على الجوال.
                */}
                <ImageColorPicker
                  imageUrl={avatarUrl}
                  onPick={hex => { setColorVal(hex); void onColorChange(hex) }}
                  isDark={isDark}
                />

                <input
                  type="color"
                  value={colorVal.length === 7 ? colorVal : '#458482'}
                  onChange={e => { setColorVal(e.target.value); void onColorChange(e.target.value) }}
                  className="w-10 h-10 rounded-lg cursor-pointer p-0.5 shrink-0"
                  style={{ background: 'transparent', border: `2px solid ${colorVal}60`, borderRadius: '10px' }}
                />

                <input
                  type="text"
                  value={colorVal}
                  onChange={handleColorHexChange}
                  placeholder="#458482"
                  className="px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all duration-150"
                  style={{
                    width: '110px', background: inputBg,
                    border: `1px solid ${inputBorder}`,
                    color: 'var(--foreground)', fontFamily: 'monospace', direction: 'ltr',
                  }}
                />

                <button
                  onClick={handleEyeDropper}
                  disabled={!eyedropperSupported}
                  title={eyedropperSupported ? tx.eyedropper : tx.eyedropperNo}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: eyedropperSupported ? 'rgba(69,132,130,0.15)' : inputBg,
                    border:     `1px solid ${eyedropperSupported ? 'rgba(69,132,130,0.35)' : inputBorder}`,
                    color:      eyedropperSupported ? '#458482' : 'var(--foreground-muted)',
                    opacity:    eyedropperSupported ? 1 : 0.5,
                    cursor:     eyedropperSupported ? 'pointer' : 'not-allowed',
                    fontFamily: arabicFont,
                  }}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  {tx.eyedropper}
                </button>

                <div
                  className="w-10 h-10 rounded-xl shrink-0"
                  style={{
                    background: colorVal.length === 7 ? colorVal : '#458482',
                    boxShadow:  `0 4px 12px ${colorVal.length === 7 ? colorVal : '#458482'}50`,
                  }}
                />
              </div>

              {!eyedropperSupported && (
                <p className="text-[10px]" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
                  {tx.eyedropperNote}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ══ 3. PROFILE RESTRICTIONS ══ */}
        {!isSelf && (
        <div>
          <SectionHeader icon={<Camera className="w-3.5 h-3.5" />} label={tx.sectionProfile} />
          <div className="flex flex-col gap-2">
            <ToggleRow
              label={tx.lockAvatar}
              sublabel={tx.lockAvatarSub}
              checked={restrictions.avatarLocked}
              onChange={() => handleToggleLock('avatarLocked')}
              accentColor="#ef4444"
              isDark={isDark}
              busy={busyLock === 'avatarLocked'}
            />
            <ToggleRow
              label={tx.lockName}
              sublabel={tx.lockNameSub}
              checked={restrictions.nameLocked}
              onChange={() => handleToggleLock('nameLocked')}
              accentColor="#ef4444"
              isDark={isDark}
              busy={busyLock === 'nameLocked'}
            />
          </div>
        </div>
        )}

        {/* ══ 4. PENDING EMAIL ══ */}
        <AnimatePresence>
          {!isSelf && pendingEmail && (
            <motion.div
              id="email-change-request"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SectionHeader icon={<Mail className="w-3.5 h-3.5" />} label={tx.sectionEmail} />
              <div
                className="px-4 py-3 rounded-xl flex flex-col gap-2"
                style={{ background: '#f59e0b15', border: '1px solid #f59e0b33' }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: '#f59e0b', fontFamily: arabicFont }}>
                    {tx.pendingNew}
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)', direction: 'ltr' }}>
                    {pendingEmail.newEmail}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
                    {tx.requestedAt}: {new Date(pendingEmail.requestedAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                </div>

                {/*
                  المرحلة الثانية: الأدمن خلص شغله والكرة بملعب العضو.
                  عرض أزرار موافقة/رفض هون بيوحي إن في قرار لسا مطلوب.
                */}
                {pendingEmail.stage === 'pending_email_verification' ? (
                  <p className="text-[11px] font-semibold" style={{ color: '#f59e0b', fontFamily: arabicFont }}>
                    {tx.awaitingVerify}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEmailAction(onApproveEmail)}
                      disabled={busyEmail}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all disabled:cursor-not-allowed"
                      style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140', opacity: busyEmail ? 0.6 : 1, fontFamily: arabicFont }}
                    >
                      <Check className="w-3.5 h-3.5" /> {tx.approve}
                    </button>
                    <button
                      onClick={() => handleEmailAction(onRejectEmail)}
                      disabled={busyEmail}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all disabled:cursor-not-allowed"
                      style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', opacity: busyEmail ? 0.6 : 1, fontFamily: arabicFont }}
                    >
                      <X className="w-3.5 h-3.5" /> {tx.reject}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ 5. ما يُدار من مكان آخر ══ */}
        {!isSelf && (
        <div>
          <SectionHeader icon={<Lock className="w-3.5 h-3.5" />} label={tx.rolesElsewhere} />
          {/*
            الدور والصلاحيات والإيقاف كلهم بـ Admin Control. تكرارهم هون كان
            بيخلق مكانين بيغيّروا نفس البيانات بقواعد مختلفة — رابط أوضح
            وأأمن من نسخة تانية.
          */}
          <Link
            href="/adminControl"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all"
            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
          >
            <span className="text-[11px] font-semibold" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
              {tx.rolesElsewhereSub}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold shrink-0" style={{ color: '#458482', fontFamily: arabicFont }}>
              {tx.goToAdmin}
              <ChevronRight className="w-3.5 h-3.5" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
            </span>
          </Link>
        </div>
        )}

        {/*
          ══ 6. DANGER ZONE ══
          مخفية ببروفايلك: حذف حسابك بنفسك بيقفلك برّا النظام، و`is_chief`
          ما بينتغيّر إلا بـ SQL يدوي.
        */}
        {!isSelf && (
        <div>
          <SectionHeader icon={<AlertTriangle className="w-3.5 h-3.5" />} label={tx.sectionDanger} />
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-150"
            style={{
              background: inputBg,
              border:     '1px solid #ef444444',
              color:      '#ef4444',
              fontFamily: arabicFont,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ef444415' }}
            onMouseLeave={e => { e.currentTarget.style.background = inputBg }}
          >
            <Trash2 className="w-4 h-4" /> {tx.deleteBtn}
          </button>
        </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={() => setDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.93, opacity: 0, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              dir={isRTL ? 'rtl' : 'ltr'}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: isDark ? '#161b22' : '#ffffff',
                border:     `1px solid #ef444444`,
                boxShadow:  '0 24px 64px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: '#ef444420', border: '1px solid #ef444444' }}>
                    <Trash2 className="w-5 h-5" style={{ color: '#ef4444' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black" style={{ color: 'var(--foreground)', fontFamily: arabicFont }}>
                      {tx.deleteTitle}
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
                      {tx.deleteSub}
                    </p>
                  </div>
                </div>

                <p className="text-[12px] leading-relaxed"
                  style={{ color: 'var(--foreground)', fontFamily: arabicFont }}>
                  {tx.deleteConfirmMsg}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => { void onDelete(); setDeleteConfirm(false) }}
                    disabled={countdown > 0}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: countdown > 0 ? '#ef444455' : '#ef4444',
                      color:      '#ffffff',
                      cursor:     countdown > 0 ? 'not-allowed' : 'pointer',
                      fontFamily: arabicFont,
                    }}
                  >
                    {countdown > 0 ? `${tx.waitSeconds} ${countdown}` : tx.confirmDelete}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      color:      'var(--foreground-muted)',
                      fontFamily: arabicFont,
                    }}
                  >
                    {tx.cancelDelete}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}