"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Pencil, X, Check, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang }  from '@/context/LangContext';

/* ─── Types ─── */
type FieldStatus = 'idle' | 'editing' | 'saving' | 'saved';

export type PendingEmail = {
  newEmail: string;
  stage: 'pending_admin' | 'pending_email_verification';
};

interface PersonalInfoProps {
  firstName:     string;
  lastName:      string;
  email:         string;
  memberColor?:  string;
  canEditName?:  boolean;
  canEditEmail?: boolean;
  /** الشيف أدمن فقط مسموحله يترك Last Name فاضية */
  isChief?:      boolean;
  pendingEmail?: PendingEmail | null;
  onSaveName?:   (firstName: string, lastName: string) => Promise<void>;
  onRequestEmail?: (newEmail: string) => Promise<void>;
}

/* ─── Name validation helpers ─── */
const NAME_RE = /^[A-Za-z]+$/;

function normalizeNamePart(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function validateNameParts(first: string, last: string, isChief: boolean): string | null {
  const f = first.trim();
  const l = last.trim();

  if (!f) return 'name_first_required';
  if (!NAME_RE.test(f)) return 'name_invalid_chars';

  if (!l) {
    // بس الشيف أدمن مسموحله يترك Last Name فاضية
    if (isChief) return null;
    return 'name_last_required';
  }
  if (!NAME_RE.test(l)) return 'name_invalid_chars';

  return null;
}

/* ══════════════════════════════════════════════ */
export default function PersonalInfo({
  firstName,
  lastName,
  email,
  memberColor,
  canEditName  = true,
  canEditEmail = true,
  isChief      = false,
  pendingEmail = null,
  onSaveName,
  onRequestEmail,
}: PersonalInfoProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  /* ── field states ── */
  const [firstDraft, setFirstDraft] = useState(firstName);
  const [lastDraft,  setLastDraft]  = useState(lastName);
  const [emailDraft, setEmailDraft] = useState(email);

  const [nameStatus,  setNameStatus]  = useState<FieldStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  /* ── palette ── */
  const bg          = isDark ? 'var(--card)'            : '#ffffff';
  const border      = isDark ? 'var(--card-border)'     : 'rgba(0,0,0,0.07)';
  const headerBg    = isDark ? 'var(--background-alt)'  : '#f5f5ef';
  const divider     = isDark ? 'var(--divider)'         : 'rgba(0,0,0,0.06)';
  const textMain    = 'var(--foreground)';
  const textMuted   = 'var(--foreground-muted)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
  const focusBorder = '#458482';

  /* ── translations ── */
  const tx: Record<string, string> = {
    title:           lang === 'ar' ? 'المعلومات الشخصية'         : 'Personal Info',
    subtitle:        lang === 'ar' ? 'بياناتك الأساسية في المنصة' : 'Your basic details on the platform',
    firstNameLabel:  lang === 'ar' ? 'الاسم الأول'                : 'First Name',
    lastNameLabel:   lang === 'ar' ? 'الاسم الأخير'               : 'Last Name',
    emailLabel:      lang === 'ar' ? 'البريد الإلكتروني'          : 'Email',
    colorLabel:      lang === 'ar' ? 'لونك في الفريق'             : 'Your Color',
    colorNote:       lang === 'ar' ? 'هذا اللون يحدده الأدمن فقط' : 'This color is set by admin only',
    cancel:          lang === 'ar' ? 'إلغاء'                      : 'Cancel',
    edit:            lang === 'ar' ? 'تعديل'                      : 'Edit',
    saved:           lang === 'ar' ? 'تم الحفظ'                   : 'Saved',
    lockedByAdmin:   lang === 'ar' ? 'مقفل من الأدمن'             : 'Locked by admin',
    pendingApproval: lang === 'ar' ? 'بانتظار موافقة الأدمن'      : 'Pending admin approval',
    pendingVerify:   lang === 'ar' ? 'بانتظار تأكيد الإيميل الجديد' : 'Awaiting new email confirmation',
    emailNote:       lang === 'ar'
      ? 'تغيير الإيميل يحتاج موافقة الأدمن، ثم تأكيد من الإيميل الجديد'
      : 'Email changes need admin approval, then confirmation from the new inbox',
    nameNote:        lang === 'ar'
      ? 'أحرف إنجليزية فقط، بدون أرقام أو رموز. أول حرف يكبر تلقائياً'
      : 'English letters only, no numbers or symbols. First letter capitalizes automatically',
    errNameFirstRequired: lang === 'ar' ? 'الاسم الأول مطلوب' : 'First name is required',
    errNameLastRequired:  lang === 'ar' ? 'الاسم الأخير مطلوب' : 'Last name is required',
    errNameInvalidChars:  lang === 'ar' ? 'أحرف إنجليزية فقط، بدون أرقام أو رموز' : 'English letters only, no numbers or symbols',
    errEmail:        lang === 'ar' ? 'صيغة الإيميل غير صحيحة'     : 'Invalid email format',
    errTaken:        lang === 'ar' ? 'هذا الإيميل مستخدم بالفعل'  : 'This email is already in use',
    errLocked:       lang === 'ar' ? 'الأدمن قفل تعديل هذا الحقل' : 'Admin has locked this field',
    errGeneric:      lang === 'ar' ? 'فشل الحفظ، حاول مرة أخرى'   : 'Save failed, please try again',
  };

  function messageFor(code: string): string {
    if (code === 'name_first_required')    return tx.errNameFirstRequired;
    if (code === 'name_last_required')     return tx.errNameLastRequired;
    if (code === 'name_invalid_chars')     return tx.errNameInvalidChars;
    if (code === 'invalid_email' || code === 'same_email') return tx.errEmail;
    if (code === 'email_taken')            return tx.errTaken;
    if (code === 'name_locked' || code === 'avatar_locked') return tx.errLocked;
    return tx.errGeneric;
  }

  /* ── handlers ── */
  const startEditName = () => {
    setError(null);
    setFirstDraft(firstName);
    setLastDraft(lastName);
    setNameStatus('editing');
  };

  const cancelEditName = () => {
    setError(null);
    setFirstDraft(firstName);
    setLastDraft(lastName);
    setNameStatus('idle');
  };

  const startEditEmail = () => {
    setError(null);
    setEmailDraft(email);
    setEmailStatus('editing');
  };

  const cancelEditEmail = () => {
    setError(null);
    setEmailDraft(email);
    setEmailStatus('idle');
  };

  const saveName = async () => {
    if (!onSaveName) return;
    setError(null);

    const localErr = validateNameParts(firstDraft, lastDraft, isChief);
    if (localErr) {
      setError(messageFor(localErr));
      return;
    }

    const normFirst = normalizeNamePart(firstDraft);
    const normLast  = lastDraft.trim() ? normalizeNamePart(lastDraft) : '';

    setNameStatus('saving');
    try {
      await onSaveName(normFirst, normLast);
      setNameStatus('saved');
      setTimeout(() => setNameStatus('idle'), 2000);
    } catch (e) {
      setError(messageFor((e as Error).message));
      setNameStatus('editing');
    }
  };

  const saveEmail = async () => {
    if (!onRequestEmail) return;
    setError(null);
    setEmailStatus('saving');
    try {
      await onRequestEmail(emailDraft);
      setEmailStatus('idle');
    } catch (e) {
      setError(messageFor((e as Error).message));
      setEmailStatus('editing');
    }
  };

  const emailBadge: FieldStatus | 'pending' =
    pendingEmail ? 'pending' : emailStatus;

  const isNameEditing = nameStatus === 'editing' || nameStatus === 'saving';
  const isNameSaving  = nameStatus === 'saving';

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
          <User className="w-4 h-4" style={{ color: '#458482' }} />
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

      {/* ── Fields ── */}
      <div className="px-6 py-5 flex flex-col gap-5">

        {/* ── Name (First + Last) — خانتين جنب بعض دائماً، بوضع العرض وبوضع التعديل ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" style={{ color: 'var(--foreground-muted)' }} />
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
              >
                {tx.firstNameLabel} / {tx.lastNameLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {nameStatus === 'saved' && (
                <span
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#10b98122', color: '#10b981', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  <Check className="w-2.5 h-2.5" /> {tx.saved}
                </span>
              )}
              {!isNameEditing && (
                canEditName && onSaveName ? (
                  <button
                    onClick={startEditName}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      color: textMuted,
                      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#45848222'; e.currentTarget.style.color = '#458482'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = textMuted; }}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    {tx.edit}
                  </button>
                ) : !canEditName ? (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      color: textMuted,
                      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    }}
                  >
                    <AlertCircle className="w-2.5 h-2.5" />
                    {tx.lockedByAdmin}
                  </span>
                ) : null
              )}
            </div>
          </div>

          {/* الخانتين — نفس اللاي-أوت بوضع العرض وبوضع التعديل، الفرق بس إنه بالتعديل قابلة للكتابة */}
          <div className="flex items-center gap-2">
            {isNameEditing ? (
              <>
                <input
                  autoFocus
                  type="text"
                  value={firstDraft}
                  disabled={isNameSaving}
                  placeholder={tx.firstNameLabel}
                  onChange={e => setFirstDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-150"
                  style={{
                    background: inputBg,
                    border:     `1px solid ${inputBorder}`,
                    color:      textMain,
                    fontFamily: 'inherit',
                    direction:  'ltr',
                    opacity:    isNameSaving ? 0.6 : 1,
                  }}
                />
                <input
                  type="text"
                  value={lastDraft}
                  disabled={isNameSaving}
                  placeholder={isChief ? `${tx.lastNameLabel} (${lang === 'ar' ? 'اختياري' : 'optional'})` : tx.lastNameLabel}
                  onChange={e => setLastDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-150"
                  style={{
                    background: inputBg,
                    border:     `1px solid ${inputBorder}`,
                    color:      textMain,
                    fontFamily: 'inherit',
                    direction:  'ltr',
                    opacity:    isNameSaving ? 0.6 : 1,
                  }}
                />
                <button
                  onClick={saveName}
                  disabled={isNameSaving}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer"
                  style={{ background: '#458482', color: '#fff' }}
                >
                  {isNameSaving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={cancelEditName}
                  disabled={isNameSaving}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: textMuted }}
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div
                  className="flex-1 px-3 py-2.5 rounded-xl"
                  style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: textMain, fontFamily: 'inherit', direction: 'ltr' }}
                  >
                    {firstName}
                  </span>
                </div>
                <div
                  className="flex-1 px-3 py-2.5 rounded-xl"
                  style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: lastName ? textMain : textMuted, fontFamily: 'inherit', direction: 'ltr' }}
                  >
                    {lastName || '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          <p
            className="text-[10px] leading-relaxed"
            style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {tx.nameNote}
          </p>
        </div>

        <div style={{ height: '1px', background: divider }} />

        {/* ── Email ── */}
        <div id="email-field">
          <FieldRow
            label={tx.emailLabel}
            icon={<Mail className="w-3.5 h-3.5" />}
            value={email}
            draft={emailDraft}
            status={emailBadge as FieldStatus}
            canEdit={canEditEmail && Boolean(onRequestEmail) && !pendingEmail}
            lockedLabel={undefined}
            note={tx.emailNote}
            tx={tx}
            lang={lang}
            isRTL={isRTL}
            isDark={isDark}
            textMain={textMain}
            textMuted={textMuted}
            inputBg={inputBg}
            inputBorder={inputBorder}
            focusBorder={focusBorder}
            pendingLabel={
              pendingEmail
                ? (pendingEmail.stage === 'pending_admin' ? tx.pendingApproval : tx.pendingVerify)
                : undefined
            }
            onDraftChange={setEmailDraft}
            onEdit={startEditEmail}
            onSave={saveEmail}
            onCancel={cancelEditEmail}
          />
        </div>

        {pendingEmail && (
          <div
            className="px-3 py-2 rounded-xl -mt-2"
            style={{ background: '#f59e0b12', border: '1px solid #f59e0b30' }}
          >
            <span
              className="text-[10px] font-bold"
              style={{ color: '#f59e0b', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              → </span>
            <span className="text-[12px] font-medium" style={{ color: textMain, direction: 'ltr' }}>
              {pendingEmail.newEmail}
            </span>
          </div>
        )}

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
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
                {error}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Member Color (read-only) ── */}
        {memberColor && (
          <>
            <div style={{ height: '1px', background: divider }} />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: memberColor }} />
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {tx.colorLabel}
                </span>
              </div>

              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              >
                <div
                  className="w-7 h-7 rounded-lg shrink-0"
                  style={{ background: memberColor, boxShadow: `0 2px 8px ${memberColor}60` }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: textMain, fontFamily: 'monospace', direction: 'ltr' }}
                >
                  {memberColor.toUpperCase()}
                </span>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full ms-auto"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color:      textMuted,
                    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                  }}
                >
                  {tx.colorNote}
                </span>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Sub-component: FieldRow (email only)
   ══════════════════════════════════════════════ */
interface FieldRowProps {
  label:         string;
  icon:          React.ReactNode;
  value:         string;
  draft:         string;
  status:        FieldStatus;
  canEdit:       boolean;
  note:          string;
  tx:            Record<string, string>;
  lang:          string;
  isRTL:         boolean;
  isDark:        boolean;
  textMain:      string;
  textMuted:     string;
  inputBg:       string;
  inputBorder:   string;
  focusBorder:   string;
  pendingLabel?: string;
  lockedLabel?:  string;
  onDraftChange: (v: string) => void;
  onEdit:        () => void;
  onSave:        () => void;
  onCancel:      () => void;
}

const StatusBadge = ({
  status, tx, lang, pendingLabel,
}: { status: FieldStatus | 'pending'; tx: Record<string,string>; lang: string; pendingLabel?: string }) => {
  if (status === 'saved') return (
    <span
      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: '#10b98122', color: '#10b981', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
    >
      <Check className="w-2.5 h-2.5" /> {tx.saved}
    </span>
  );
  if (status === 'pending' && pendingLabel) return (
    <span
      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: '#f59e0b22', color: '#f59e0b', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
    >
      <Clock className="w-2.5 h-2.5" /> {pendingLabel}
    </span>
  );
  return null;
};

function FieldRow({
  label, icon, value, draft, status, canEdit,
  note, tx, lang, isRTL, isDark,
  textMain, textMuted, inputBg, inputBorder, focusBorder,
  pendingLabel, lockedLabel,
  onDraftChange, onEdit, onSave, onCancel,
}: FieldRowProps) {
  const [focused, setFocused] = useState(false);
  const isEditing = status === 'editing' || status === 'saving';
  const isSaving  = status === 'saving';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--foreground-muted)' }}>{icon}</span>
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} tx={tx} lang={lang} pendingLabel={pendingLabel} />
          {!isEditing && (
            canEdit ? (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  color: textMuted,
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#45848222'; e.currentTarget.style.color = '#458482'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = textMuted; }}
              >
                <Pencil className="w-2.5 h-2.5" />
                {tx.edit}
              </button>
            ) : !pendingLabel && lockedLabel ? (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  color: textMuted,
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                <AlertCircle className="w-2.5 h-2.5" />
                {lockedLabel}
              </span>
            ) : null
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              type="text"
              value={draft}
              disabled={isSaving}
              onChange={e => onDraftChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-150"
              style={{
                background: inputBg,
                border:     `1px solid ${focused ? focusBorder : inputBorder}`,
                color:      textMain,
                fontFamily: 'inherit',
                direction:  'ltr',
                boxShadow:  focused ? `0 0 0 3px ${focusBorder}22` : 'none',
                opacity:    isSaving ? 0.6 : 1,
              }}
            />
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer"
              style={{ background: '#458482', color: '#fff' }}
            >
              {isSaving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="px-3 py-2.5 rounded-xl"
            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: textMain, fontFamily: 'inherit', direction: 'ltr' }}
            >
              {value}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <p
        className="text-[10px] leading-relaxed"
        style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
      >
        {note}
      </p>
    </div>
  );
}