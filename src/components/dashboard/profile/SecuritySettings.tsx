//src\components\dashboard\profile\SecuritySettings.tsx

"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Check, X, Clock, AlertCircle, Loader2, CalendarClock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang }  from '@/context/LangContext';

/* ─── Types ─── */
type PasswordStatus = 'idle' | 'editing' | 'saving' | 'success';

export interface PasswordCooldown {
  lastChangedAt: string | null;
  nextAllowedAt: string | null;
  canChange:     boolean;
}

interface SecuritySettingsProps {
  /** من `auth.users.last_sign_in_at` — بيحتاج service_role فبيجي من السيرفر */
  lastLoginAt: string | null;
  cooldown:    PasswordCooldown;
  onChangePassword: (current: string, next: string) => Promise<void>;
}

/* ─── Helpers ─── */
function formatDateTime(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(
    lang === 'ar' ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );
}

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(
    lang === 'ar' ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
}

function getPasswordStrength(password: string): { score: number; label: string; labelAr: string; color: string } {
  if (password.length === 0) return { score: 0, label: '',       labelAr: '',      color: 'transparent' };
  if (password.length < 8)   return { score: 1, label: 'Weak',   labelAr: 'ضعيف',  color: '#ef4444' };
  if (password.length < 10)  return { score: 2, label: 'Fair',   labelAr: 'مقبول', color: '#f59e0b' };
  const hasUpper  = /[A-Z]/.test(password);
  const hasNum    = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const extras    = [hasUpper, hasNum, hasSymbol].filter(Boolean).length;
  if (extras >= 2)  return { score: 4, label: 'Strong', labelAr: 'قوي',   color: '#10b981' };
  if (extras === 1) return { score: 3, label: 'Good',   labelAr: 'جيد',   color: '#458482' };
  return              { score: 2, label: 'Fair',   labelAr: 'مقبول', color: '#f59e0b' };
}

/* ══════════════════════════════════════════════ */
export default function SecuritySettings({
  lastLoginAt,
  cooldown,
  onChangePassword,
}: SecuritySettingsProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  /* ── field state ── */
  const [oldPassword,  setOldPassword]  = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');
  const [showOld,      setShowOld]      = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [status,       setStatus]       = useState<PasswordStatus>('idle');
  const [errorMsg,     setErrorMsg]     = useState('');

  /* ── palette ── */
  const bg          = isDark ? 'var(--card)'            : '#ffffff';
  const border      = isDark ? 'var(--card-border)'     : 'rgba(0,0,0,0.07)';
  const headerBg    = isDark ? 'var(--background-alt)'  : '#f5f5ef';
  const divider     = isDark ? 'var(--divider)'         : 'rgba(0,0,0,0.06)';
  const textMain    = 'var(--foreground)';
  const textMuted   = 'var(--foreground-muted)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
  const accentColor = '#458482';

  /* ── translations ── */
  const tx = {
    title:          lang === 'ar' ? 'الأمان'                      : 'Security',
    subtitle:       lang === 'ar' ? 'كلمة المرور وآخر نشاط'       : 'Password & recent activity',
    oldPass:        lang === 'ar' ? 'كلمة المرور الحالية'         : 'Current password',
    newPass:        lang === 'ar' ? 'كلمة المرور الجديدة'         : 'New password',
    confirmPass:    lang === 'ar' ? 'تأكيد كلمة المرور'           : 'Confirm new password',
    updatePass:     lang === 'ar' ? 'تحديث كلمة المرور'           : 'Update password',
    changePass:     lang === 'ar' ? 'تغيير كلمة المرور'           : 'Change password',
    lastLogin:      lang === 'ar' ? 'آخر تسجيل دخول'              : 'Last sign-in',
    never:          lang === 'ar' ? 'لا يوجد'                     : 'Never',
    strength:       lang === 'ar' ? 'قوة كلمة المرور'             : 'Password strength',
    successMsg:     lang === 'ar' ? 'تم تحديث كلمة المرور بنجاح'  : 'Password updated successfully',
    signedOutNote:  lang === 'ar' ? 'تم تسجيل الخروج من باقي الأجهزة' : 'You were signed out of other devices',
    errMismatch:    lang === 'ar' ? 'كلمتا المرور غير متطابقتين'  : 'Passwords do not match',
    errOldRequired: lang === 'ar' ? 'أدخل كلمة المرور الحالية'    : 'Enter your current password',
    errNewRequired: lang === 'ar' ? 'أدخل كلمة المرور الجديدة'    : 'Enter a new password',
    errTooShort:    lang === 'ar' ? 'كلمة المرور قصيرة جداً (8 أحرف على الأقل)' : 'Password too short (min 8 characters)',
    errWrongOld:    lang === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect',
    errSame:        lang === 'ar' ? 'كلمة المرور الجديدة مطابقة للحالية' : 'New password matches the current one',
    errGeneric:     lang === 'ar' ? 'فشل التحديث، حاول مرة أخرى'  : 'Update failed, please try again',
    cooldownTitle:  lang === 'ar' ? 'لا يمكن التغيير الآن'        : 'Can’t change yet',
    lastChanged:    lang === 'ar' ? 'آخر تغيير'                   : 'Last changed',
    nextAllowed:    lang === 'ar' ? 'أقرب موعد للتغيير'           : 'Next change allowed',
    forgotNote:     lang === 'ar'
      ? 'نسيت كلمة المرور؟ استعادتها متاحة دائماً بدون قيد زمني.'
      : 'Forgot it? Password recovery is always available with no waiting period.',
  };

  function messageFor(code: string): string {
    if (code === 'wrong_current_password') return tx.errWrongOld;
    if (code === 'password_too_short')     return tx.errTooShort;
    if (code === 'password_unchanged')     return tx.errSame;
    if (code === 'password_cooldown')      return tx.cooldownTitle;
    return tx.errGeneric;
  }

  const strength = getPasswordStrength(newPassword);
  const isEditing = status === 'editing' || status === 'saving';
  const isSaving  = status === 'saving';

  /* ── validation + submit ── */
  const handleSubmit = async () => {
    if (!oldPassword)                return setErrorMsg(tx.errOldRequired);
    if (!newPassword)                return setErrorMsg(tx.errNewRequired);
    if (newPassword.length < 8)      return setErrorMsg(tx.errTooShort);
    if (newPassword !== confirmPass) return setErrorMsg(tx.errMismatch);

    setErrorMsg('');
    setStatus('saving');

    try {
      await onChangePassword(oldPassword, newPassword);
      setStatus('success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPass('');
      setTimeout(() => setStatus('idle'), 3500);
    } catch (e) {
      setErrorMsg(messageFor((e as Error).message));
      setStatus('editing');
    }
  };

  const handleCancel = () => {
    setStatus('idle');
    setOldPassword('');
    setNewPassword('');
    setConfirmPass('');
    setErrorMsg('');
  };

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
          style={{ background: '#45848222', border: '1px solid #45848244' }}
        >
          <Shield className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <div>
          <h2
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {tx.title}
          </h2>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {tx.subtitle}
          </p>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">

        {/* ── Last Login ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
        >
          <Clock className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {tx.lastLogin}
            </p>
            <p
              className="text-xs font-medium"
              style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {lastLoginAt ? formatDateTime(lastLoginAt, lang) : tx.never}
            </p>
          </div>
        </div>

        <div style={{ height: '1px', background: divider }} />

        {/* ── Password section ── */}
        <AnimatePresence mode="wait">

          {/* ── Cooldown: التغيير ممنوع مؤقتًا ── */}
          {status === 'idle' && !cooldown.canChange && (
            <motion.div
              key="cooldown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2 px-4 py-3 rounded-xl"
              style={{ background: '#f59e0b12', border: '1px solid #f59e0b30' }}
            >
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                <span
                  className="text-[12px] font-bold"
                  style={{ color: '#f59e0b', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {tx.cooldownTitle}
                </span>
              </div>
              {cooldown.lastChangedAt && (
                <p className="text-[11px]" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {tx.lastChanged}: {formatDate(cooldown.lastChangedAt, lang)}
                </p>
              )}
              {cooldown.nextAllowedAt && (
                <p className="text-[11px] font-semibold" style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {tx.nextAllowed}: {formatDate(cooldown.nextAllowedAt, lang)}
                </p>
              )}
              {/* القيد الأسبوعي على التغيير الطوعي فقط — الاستعادة متاحة دايمًا */}
              <p className="text-[10px] leading-relaxed" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                {tx.forgotNote}
              </p>
            </motion.div>
          )}

          {/* ── Idle: زر البدء ── */}
          {status === 'idle' && cooldown.canChange && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <button
                onClick={() => setStatus('editing')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  color: textMuted,
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#45848222'; e.currentTarget.style.color = accentColor; }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.color = textMuted;
                }}
              >
                <Shield className="w-4 h-4" />
                {tx.changePass}
              </button>
            </motion.div>
          )}

          {/* ── Success ── */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#10b98115', border: '1px solid #10b98133' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#10b981' }}
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#10b981', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {tx.successMsg}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {tx.signedOutNote}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Editing ── */}
          {isEditing && (
            <motion.div
              key="editing"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-4"
            >
              <PasswordInput
                label={tx.oldPass} value={oldPassword} show={showOld}
                onToggleShow={() => setShowOld(v => !v)} onChange={setOldPassword}
                disabled={isSaving}
                lang={lang} isRTL={isRTL} isDark={isDark}
                textMain={textMain} textMuted={textMuted}
                inputBg={inputBg} inputBorder={inputBorder} accentColor={accentColor}
              />

              <PasswordInput
                label={tx.newPass} value={newPassword} show={showNew}
                onToggleShow={() => setShowNew(v => !v)} onChange={setNewPassword}
                disabled={isSaving}
                lang={lang} isRTL={isRTL} isDark={isDark}
                textMain={textMain} textMuted={textMuted}
                inputBg={inputBg} inputBorder={inputBorder} accentColor={accentColor}
              />

              {/* Strength meter */}
              {newPassword.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    >
                      {tx.strength}
                    </span>
                    <span
                      className="text-[10px] font-black"
                      style={{ color: strength.color, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    >
                      {lang === 'ar' ? strength.labelAr : strength.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= strength.score ? strength.color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <PasswordInput
                label={tx.confirmPass} value={confirmPass} show={showConfirm}
                onToggleShow={() => setShowConfirm(v => !v)} onChange={setConfirmPass}
                disabled={isSaving}
                lang={lang} isRTL={isRTL} isDark={isDark}
                textMain={textMain} textMuted={textMuted}
                inputBg={inputBg} inputBorder={inputBorder} accentColor={accentColor}
                hasMatch={confirmPass.length > 0 ? confirmPass === newPassword : undefined}
              />

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: '#ef444415', border: '1px solid #ef444433' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#ef4444' }} />
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: '#ef4444', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    >
                      {errorMsg}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 pt-1" style={{ flexDirection: 'row' }}>
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background: accentColor,
                    color: '#ffffff',
                    opacity: isSaving ? 0.7 : 1,
                    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                  }}
                >
                  {isSaving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />}
                  {tx.updatePass}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer shrink-0"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: textMuted,
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Sub-component: PasswordInput
   ══════════════════════════════════════════════ */
interface PasswordInputProps {
  label:        string;
  value:        string;
  show:         boolean;
  onToggleShow: () => void;
  onChange:     (v: string) => void;
  disabled?:    boolean;
  lang:         string;
  isRTL:        boolean;
  isDark:       boolean;
  textMain:     string;
  textMuted:    string;
  inputBg:      string;
  inputBorder:  string;
  accentColor:  string;
  hasMatch?:    boolean; // undefined = not checked yet
}

function PasswordInput({
  label, value, show, onToggleShow, onChange, disabled = false,
  lang, isRTL, isDark,
  textMain, textMuted, inputBg, inputBorder, accentColor,
  hasMatch,
}: PasswordInputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor =
    hasMatch === true  ? '#10b981' :
    hasMatch === false ? '#ef4444' :
    focused            ? accentColor :
    inputBorder;

  const shadow =
    hasMatch === true  ? '0 0 0 3px #10b98122' :
    hasMatch === false ? '0 0 0 3px #ef444422' :
    focused            ? `0 0 0 3px ${accentColor}22` :
    'none';

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
      >
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-150"
          style={{
            background:   inputBg,
            border:       `1px solid ${borderColor}`,
            color:        textMain,
            fontFamily:   'inherit',
            direction:    'ltr',
            paddingRight: isRTL ? '12px' : '40px',
            paddingLeft:  isRTL ? '40px' : '12px',
            boxShadow:    shadow,
            opacity:      disabled ? 0.6 : 1,
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 cursor-pointer"
          style={{
            [isRTL ? 'left' : 'right']: '4px',
            color: textMuted,
            background: 'transparent',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = textMain; }}
          onMouseLeave={e => { e.currentTarget.style.color = textMuted; }}
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>

        {/* Match indicator */}
        {hasMatch !== undefined && (
          <div
            className="absolute flex items-center justify-center"
            style={{ [isRTL ? 'right' : 'left']: '-28px' }}
          >
            {hasMatch
              ? <Check className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
              : <X     className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />}
          </div>
        )}
      </div>
    </div>
  );
}