"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Camera, User, Lock, Unlock, ChevronDown,
  Check, X, AlertTriangle, Trash2, Clock, Mail, Pipette, Palette,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang }  from '@/context/LangContext'


  declare global {
    interface Window {
      EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
    }
  }

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
export type MemberRole =
  | 'animator-pro'
  | 'lead-animator'
  | '3d-modeler'
  | 'vfx-artist'
  | 'concept-artist'
  | 'supervisor'
  | 'admin'

export interface AdminPermissions {
  canAddPlatform:    boolean
  canManageMembers:  boolean
  canPublishNews:    boolean
  canManageArchive:  boolean
}

export interface MemberRestrictions {
  avatarLocked: boolean
  nameLocked:   boolean
}

export type BanDuration = '1d' | '3d' | '7d' | '30d' | 'custom'

interface PendingEmailChange {
  newEmail:    string
  requestedAt: string // ISO
}

interface AdminControlsProps {
  memberId:           number
  memberName:         string
  currentRole:        MemberRole
  memberColor?:       string
  permissions:        AdminPermissions
  restrictions:       MemberRestrictions
  isBanned?:          boolean
  banExpiresAt?:      string
  pendingEmail?:      PendingEmailChange
  onRoleChange:       (role: MemberRole)            => void
  onColorChange:      (color: string)               => void
  onPermissionToggle: (key: keyof AdminPermissions)  => void
  onRestrictionToggle:(key: keyof MemberRestrictions)=> void
  onApproveEmail:     ()                            => void
  onRejectEmail:      ()                            => void
  onBan:              (duration: BanDuration, customDays?: number, reason?: string) => void
  onUnban:            ()                            => void
  onDelete:           ()                            => void
}

/* ══════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════ */
const ROLES: { value: MemberRole; labelEn: string; labelAr: string; color: string }[] = [
  { value: 'animator-pro',   labelEn: 'Animator Pro',   labelAr: 'محرك محترف',      color: '#458482' },
  { value: 'lead-animator',  labelEn: 'Lead Animator',  labelAr: 'محرك رئيسي',      color: '#a855f7' },
  { value: '3d-modeler',     labelEn: '3D Modeler',     labelAr: 'مصمم ثلاثي',      color: '#f59e0b' },
  { value: 'vfx-artist',     labelEn: 'VFX Artist',     labelAr: 'فنان مؤثرات',     color: '#ef4444' },
  { value: 'concept-artist', labelEn: 'Concept Artist', labelAr: 'فنان مفاهيمي',    color: '#3b82f6' },
  { value: 'supervisor',     labelEn: 'Supervisor',     labelAr: 'مشرف',            color: '#10b981' },
  { value: 'admin',          labelEn: 'Admin',          labelAr: 'مشرف عام',        color: '#f97316' },
]

const BAN_OPTIONS: { value: BanDuration; labelEn: string; labelAr: string }[] = [
  { value: '1d',     labelEn: '1 Day',    labelAr: 'يوم واحد'   },
  { value: '3d',     labelEn: '3 Days',   labelAr: '3 أيام'     },
  { value: '7d',     labelEn: '7 Days',   labelAr: 'أسبوع'      },
  { value: '30d',    labelEn: '30 Days',  labelAr: 'شهر'        },
  { value: 'custom', labelEn: 'Custom…',  labelAr: 'مخصص…'      },
]

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
  label, sublabel, checked, onChange, accentColor = '#458482', isDark,
}: {
  label:        string
  sublabel?:    string
  checked:      boolean
  onChange:     () => void
  accentColor?: string
  isDark:       boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
        border:     `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
      onClick={onChange}
    >
      <div>
        <p className="text-[12px] font-semibold" style={{ color: 'var(--foreground)' }}>{label}</p>
        {sublabel && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>{sublabel}</p>
        )}
      </div>
      {/* Toggle pill */}
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
  currentRole,
  memberColor,
  permissions,
  restrictions,
  isBanned       = false,
  banExpiresAt,
  pendingEmail,
  onRoleChange,
  onColorChange,
  onPermissionToggle,
  onRestrictionToggle,
  onApproveEmail,
  onRejectEmail,
  onBan,
  onUnban,
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

  /* ── local UI state ── */
  const [roleOpen,      setRoleOpen]      = useState(false)
  const [banOpen,       setBanOpen]       = useState(false)
  const [banDuration,   setBanDuration]   = useState<BanDuration>('7d')
  const [customDays,    setCustomDays]    = useState(14)
  const [banReason,     setBanReason]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [colorVal,      setColorVal]      = useState(memberColor ?? '#458482')
  const [eyedropperSupported, setEyedropperSupported] = useState(false)

  React.useEffect(() => {
  setEyedropperSupported(typeof window !== 'undefined' && !!window.EyeDropper)
}, [])

  const selectedRole = useMemo(
    () => ROLES.find(r => r.value === currentRole) ?? ROLES[0],
    [currentRole]
  )

  /* ── EyeDropper type ── */

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return
    try {
      const dropper = new window.EyeDropper()
      const result  = await dropper.open()
      setColorVal(result.sRGBHex)
      onColorChange(result.sRGBHex)
    } catch { /* user cancelled */ }
  }

  const handleColorHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
      setColorVal(v)
      if (v.length === 7) onColorChange(v)
    }
  }

  /* ── translations ── */
  const tx = {
    title:            lang === 'ar' ? 'صلاحيات الأدمن'            : 'Admin Controls',
    subtitle:         lang === 'ar' ? 'إدارة العضو وصلاحياته'     : 'Manage member & permissions',
    sectionRole:      lang === 'ar' ? 'الدور'                     : 'Role',
    sectionColor:     lang === 'ar' ? 'اللون الشخصي'              : 'Member Color',
    sectionPerms:     lang === 'ar' ? 'الصلاحيات'                 : 'Permissions',
    sectionProfile:   lang === 'ar' ? 'قيود البروفايل'            : 'Profile Restrictions',
    sectionEmail:     lang === 'ar' ? 'طلب تغيير الإيميل'         : 'Email Change Request',
    sectionDanger:    lang === 'ar' ? 'منطقة الخطر'               : 'Danger Zone',
    roleLabel:        lang === 'ar' ? 'الرول الحالي'              : 'Current Role',
    colorHex:         lang === 'ar' ? 'كود اللون'                  : 'Hex color',
    eyedropper:       lang === 'ar' ? 'قطارة اللون'               : 'Eyedropper',
    eyedropperNo:     lang === 'ar' ? 'غير مدعوم في هذا المتصفح'  : 'Not supported in this browser',
    eyedropperNote:   lang === 'ar' ? '⚠️ القطارة تعمل فقط في Chrome وEdge' : '⚠️ Eyedropper only works in Chrome & Edge',
    permAddPlatform:  lang === 'ar' ? 'إضافة منصة'               : 'Add Platform',
    permManageMembers:lang === 'ar' ? 'إدارة الأعضاء'             : 'Manage Members',
    permPublishNews:  lang === 'ar' ? 'نشر أخبار'                 : 'Publish News',
    permManageArchive:lang === 'ar' ? 'إدارة الأرشيف'             : 'Manage Archive',
    lockAvatar:       lang === 'ar' ? 'قفل الصورة الشخصية'        : 'Lock Profile Photo',
    lockAvatarSub:    lang === 'ar' ? 'يمنع العضو من تغيير صورته' : 'Prevents member from changing their photo',
    lockName:         lang === 'ar' ? 'قفل الاسم'                 : 'Lock Name',
    lockNameSub:      lang === 'ar' ? 'يمنع العضو من تغيير اسمه'  : 'Prevents member from editing their name',
    pendingNew:       lang === 'ar' ? 'الإيميل الجديد المطلوب'    : 'Requested new email',
    requestedAt:      lang === 'ar' ? 'طُلب في'                   : 'Requested at',
    approve:          lang === 'ar' ? 'موافقة'                    : 'Approve',
    reject:           lang === 'ar' ? 'رفض'                       : 'Reject',
    banTitle:         lang === 'ar' ? 'إيقاف مؤقت (باند)'         : 'Temporary Ban',
    banActive:        lang === 'ar' ? 'الحساب موقوف حالياً'       : 'Account is currently banned',
    banUntil:         lang === 'ar' ? 'حتى'                       : 'until',
    unban:            lang === 'ar' ? 'رفع الإيقاف'               : 'Lift Ban',
    banReason:        lang === 'ar' ? 'سبب الإيقاف (اختياري)'     : 'Reason (optional)',
    customDays:       lang === 'ar' ? 'عدد الأيام'                : 'Number of days',
    applyBan:         lang === 'ar' ? 'تطبيق الإيقاف'             : 'Apply Ban',
    cancelBan:        lang === 'ar' ? 'إلغاء'                     : 'Cancel',
    deleteTitle:      lang === 'ar' ? 'حذف الحساب'                : 'Delete Account',
    deleteSub:        lang === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone',
    deleteBtn:        lang === 'ar' ? 'حذف الحساب'                : 'Delete Account',
    deleteConfirmMsg: lang === 'ar'
      ? `هل أنت متأكد من حذف حساب ${memberName}؟`
      : `Are you sure you want to delete ${memberName}'s account?`,
    confirmDelete:    lang === 'ar' ? 'نعم، احذف'                 : 'Yes, delete',
    cancelDelete:     lang === 'ar' ? 'إلغاء'                     : 'Cancel',
  }

  const handleApplyBan = () => {
    onBan(banDuration, banDuration === 'custom' ? customDays : undefined, banReason || undefined)
    setBanOpen(false)
    setBanReason('')
  }

  const formatBanExpiry = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

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
          <h2
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {tx.title}
          </h2>
          <p className="text-[11px] mt-0.5"
            style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {tx.subtitle}
          </p>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-6">

        {/* ══ 1. ROLE ══ */}
        <div>
          <SectionHeader icon={<User className="w-3.5 h-3.5" />} label={tx.sectionRole} />
          <div className="relative">
            <button
              onClick={() => setRoleOpen(v => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border:     `1px solid ${selectedRole.color}44`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full" style={{ background: selectedRole.color }} />
                <span className="text-sm font-bold"
                  style={{ color: selectedRole.color, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {lang === 'ar' ? selectedRole.labelAr : selectedRole.labelEn}
                </span>
              </div>
              <motion.div animate={{ rotate: roleOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
              </motion.div>
            </button>

            <AnimatePresence>
              {roleOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  exit={{    opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 w-full rounded-xl overflow-hidden mt-1.5"
                  style={{
                    background: isDark ? '#161b22' : '#ffffff',
                    border:     `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                    boxShadow:  '0 12px 32px rgba(0,0,0,0.3)',
                  }}
                >
                  {ROLES.map(role => (
                    <button
                      key={role.value}
                      onClick={() => { onRoleChange(role.value); setRoleOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-100"
                      style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                      onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: role.color }} />
                      <span className="flex-1 text-[12px] font-semibold text-start"
                        style={{ color: 'var(--foreground)' }}>
                        {lang === 'ar' ? role.labelAr : role.labelEn}
                      </span>
                      {currentRole === role.value && (
                        <Check className="w-3.5 h-3.5" style={{ color: role.color }} />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ══ 2. MEMBER COLOR ══ */}
        <div>
          <SectionHeader icon={<Palette className="w-3.5 h-3.5" />} label={tx.sectionColor} />
          <div className="flex flex-col gap-3">

            {/* Preview + controls row */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Native color input */}
              <input
                type="color"
                value={colorVal.length === 7 ? colorVal : '#458482'}
                onChange={e => { setColorVal(e.target.value); onColorChange(e.target.value) }}
                className="w-10 h-10 rounded-lg cursor-pointer p-0.5 shrink-0"
                style={{
                  background: 'transparent',
                  border:     `2px solid ${colorVal}60`,
                  borderRadius: '10px',
                }}
              />

              {/* Hex input */}
              <input
                type="text"
                value={colorVal}
                onChange={handleColorHexChange}
                placeholder="#458482"
                className="px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all duration-150"
                style={{
                  width:      '110px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
                  color:      'var(--foreground)',
                  fontFamily: 'monospace',
                  direction:  'ltr',
                }}
              />

              {/* EyeDropper */}
              <button
                onClick={handleEyeDropper}
                disabled={!eyedropperSupported}
                title={eyedropperSupported ? tx.eyedropper : tx.eyedropperNo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                style={{
                  background: eyedropperSupported ? 'rgba(69,132,130,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  border:     `1px solid ${eyedropperSupported ? 'rgba(69,132,130,0.35)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                  color:      eyedropperSupported ? '#458482' : 'var(--foreground-muted)',
                  opacity:    eyedropperSupported ? 1 : 0.5,
                  cursor:     eyedropperSupported ? 'pointer' : 'not-allowed',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
                onMouseEnter={e => { if (eyedropperSupported) e.currentTarget.style.background = 'rgba(69,132,130,0.25)' }}
                onMouseLeave={e => { if (eyedropperSupported) e.currentTarget.style.background = 'rgba(69,132,130,0.15)' }}
              >
                <Pipette className="w-3.5 h-3.5" />
                {tx.eyedropper}
              </button>

              {/* Swatch preview */}
              <div
                className="w-10 h-10 rounded-xl shrink-0"
                style={{
                  background: colorVal.length === 7 ? colorVal : '#458482',
                  boxShadow:  `0 4px 12px ${colorVal.length === 7 ? colorVal : '#458482'}50`,
                }}
              />
            </div>

            {!eyedropperSupported && (
              <p className="text-[10px]"
                style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                {tx.eyedropperNote}
              </p>
            )}
          </div>
        </div>

        {/* ══ 3. PERMISSIONS ══ */}
        <div>
          <SectionHeader icon={<Lock className="w-3.5 h-3.5" />} label={tx.sectionPerms} />
          <div className="flex flex-col gap-2">
            <ToggleRow
              label={tx.permAddPlatform}
              checked={permissions.canAddPlatform}
              onChange={() => onPermissionToggle('canAddPlatform')}
              isDark={isDark}
            />
            <ToggleRow
              label={tx.permManageMembers}
              checked={permissions.canManageMembers}
              onChange={() => onPermissionToggle('canManageMembers')}
              isDark={isDark}
            />
            <ToggleRow
              label={tx.permPublishNews}
              checked={permissions.canPublishNews}
              onChange={() => onPermissionToggle('canPublishNews')}
              isDark={isDark}
            />
            <ToggleRow
              label={tx.permManageArchive}
              checked={permissions.canManageArchive}
              onChange={() => onPermissionToggle('canManageArchive')}
              isDark={isDark}
            />
          </div>
        </div>

        {/* ══ 3. PROFILE RESTRICTIONS ══ */}
        <div>
          <SectionHeader icon={<Camera className="w-3.5 h-3.5" />} label={tx.sectionProfile} />
          <div className="flex flex-col gap-2">
            <ToggleRow
              label={tx.lockAvatar}
              sublabel={tx.lockAvatarSub}
              checked={restrictions.avatarLocked}
              onChange={() => onRestrictionToggle('avatarLocked')}
              accentColor="#ef4444"
              isDark={isDark}
            />
            <ToggleRow
              label={tx.lockName}
              sublabel={tx.lockNameSub}
              checked={restrictions.nameLocked}
              onChange={() => onRestrictionToggle('nameLocked')}
              accentColor="#ef4444"
              isDark={isDark}
            />
          </div>
        </div>

        {/* ══ 4. PENDING EMAIL ══ */}
        <AnimatePresence>
          {pendingEmail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{    opacity: 0, height: 0 }}
            >
              <SectionHeader icon={<Mail className="w-3.5 h-3.5" />} label={tx.sectionEmail} />
              <div
                className="px-4 py-3 rounded-xl flex flex-col gap-2"
                style={{ background: '#f59e0b15', border: '1px solid #f59e0b33' }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: '#f59e0b', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                    {tx.pendingNew}
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)', direction: 'ltr' }}>
                    {pendingEmail.newEmail}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                    {tx.requestedAt}: {new Date(pendingEmail.requestedAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onApproveEmail}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                    style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#10b98130' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#10b98120' }}
                  >
                    <Check className="w-3.5 h-3.5" /> {tx.approve}
                  </button>
                  <button
                    onClick={onRejectEmail}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                    style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ef444430' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ef444420' }}
                  >
                    <X className="w-3.5 h-3.5" /> {tx.reject}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ 5. DANGER ZONE ══ */}
        <div>
          <SectionHeader icon={<AlertTriangle className="w-3.5 h-3.5" />} label={tx.sectionDanger} />
          <div className="flex flex-col gap-3">

            {/* Ban / Unban */}
            {isBanned ? (
              <div
                className="px-4 py-3 rounded-xl flex items-center justify-between gap-3"
                style={{ background: '#ef444415', border: '1px solid #ef444433' }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" style={{ color: '#ef4444' }} />
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: '#ef4444', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                      {tx.banActive}
                    </p>
                    {banExpiresAt && (
                      <p className="text-[10px]" style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                        {tx.banUntil} {formatBanExpiry(banExpiresAt)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onUnban}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all shrink-0"
                  style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#10b98130' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#10b98120' }}
                >
                  <Unlock className="w-3.5 h-3.5" /> {tx.unban}
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setBanOpen(v => !v)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-150"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border:     '1px solid #f59e0b44',
                    color:      '#f59e0b',
                    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f59e0b15' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                >
                  <Lock className="w-4 h-4" /> {tx.banTitle}
                </button>

                <AnimatePresence>
                  {banOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{    opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-3 pt-3">
                        {/* Duration pills */}
                        <div className="flex flex-wrap gap-2">
                          {BAN_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setBanDuration(opt.value)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                              style={{
                                background: banDuration === opt.value ? '#f59e0b' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                color:      banDuration === opt.value ? '#ffffff' : 'var(--foreground-muted)',
                                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                              }}
                            >
                              {lang === 'ar' ? opt.labelAr : opt.labelEn}
                            </button>
                          ))}
                        </div>

                        {/* Custom days input */}
                        <AnimatePresence>
                          {banDuration === 'custom' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{    opacity: 0, height: 0 }}
                            >
                              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1"
                                style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                                {tx.customDays}
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={365}
                                value={customDays}
                                onChange={e => setCustomDays(Number(e.target.value))}
                                className="px-3 py-2 rounded-xl text-sm font-medium outline-none w-28"
                                style={{
                                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                  border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
                                  color:      'var(--foreground)',
                                }}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Reason */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest block mb-1"
                            style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                            {tx.banReason}
                          </label>
                          <input
                            type="text"
                            value={banReason}
                            onChange={e => setBanReason(e.target.value)}
                            placeholder={lang === 'ar' ? 'مثال: مخالفة قواعد المجتمع' : 'e.g. Community guideline violation'}
                            className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                              border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
                              color:      'var(--foreground)',
                              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                            }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={handleApplyBan}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                            style={{ background: '#f59e0b', color: '#ffffff', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#d97706' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f59e0b' }}
                          >
                            {tx.applyBan}
                          </button>
                          <button
                            onClick={() => setBanOpen(false)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all shrink-0"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                              color:      'var(--foreground-muted)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.color = '#ef4444' }}
                            onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--foreground-muted)' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Delete */}
            <div>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-150"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border:     '1px solid #ef444444',
                  color:      '#ef4444',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ef444415' }}
                onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
              >
                <Trash2 className="w-4 h-4" /> {tx.deleteBtn}
              </button>
            </div>
          </div>
        </div>
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
                    <h3 className="text-sm font-black" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                      {tx.deleteTitle}
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                      {tx.deleteSub}
                    </p>
                  </div>
                </div>

                <p className="text-[12px] leading-relaxed"
                  style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {tx.deleteConfirmMsg}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => { onDelete(); setDeleteConfirm(false) }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                    style={{ background: '#ef4444', color: '#ffffff', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dc2626' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ef4444' }}
                  >
                    {tx.confirmDelete}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      color:      'var(--foreground-muted)',
                      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
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