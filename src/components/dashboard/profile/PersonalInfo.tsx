//src\components\dashboard\profile\PersonalInfo.tsx
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
  /** `pending_admin` = بانتظار الأدمن · `pending_email_verification` = بانتظار ضغط الرابط */
  stage: 'pending_admin' | 'pending_email_verification';
};

interface PersonalInfoProps {
  name:          string;
  email:         string;
  memberColor?:  string;  // read-only — set by admin only
  canEditName?:  boolean;
  canEditEmail?: boolean;
  pendingEmail?: PendingEmail | null;
  onSaveName?:   (fullName: string) => Promise<void>;
  onRequestEmail?: (newEmail: string) => Promise<void>;
}

/* ══════════════════════════════════════════════ */
export default function PersonalInfo({
  name,
  email,
  memberColor,
  canEditName  = true,
  canEditEmail = true,
  pendingEmail = null,
  onSaveName,
  onRequestEmail,
}: PersonalInfoProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  /* ── field states ── */
  const [nameDraft,  setNameDraft]  = useState(name);
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
    nameLabel:       lang === 'ar' ? 'الاسم'                      : 'Full Name',
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
      ? 'الاسم يظهر دائماً بالإنجليزية بغض النظر عن لغة الواجهة'
      : 'Your name always appears in English regardless of interface language',
    errName:         lang === 'ar' ? 'الاسم لازم يكون مقطعين (أول وأخير)' : 'Name must be two parts (first and last)',
    errEmail:        lang === 'ar' ? 'صيغة الإيميل غير صحيحة'     : 'Invalid email format',
    errTaken:        lang === 'ar' ? 'هذا الإيميل مستخدم بالفعل'  : 'This email is already in use',
    errLocked:       lang === 'ar' ? 'الأدمن قفل تعديل هذا الحقل' : 'Admin has locked this field',
    errGeneric:      lang === 'ar' ? 'فشل الحفظ، حاول مرة أخرى'   : 'Save failed, please try again',
  };

  function messageFor(code: string): string {
    if (code === 'name_needs_two_parts') return tx.errName;
    if (code === 'invalid_email' || code === 'same_email') return tx.errEmail;
    if (code === 'email_taken') return tx.errTaken;
    if (code === 'name_locked' || code === 'avatar_locked') return tx.errLocked;
    return tx.errGeneric;
  }

  /* ── handlers ── */
  const startEdit = (field: 'name' | 'email') => {
    setError(null);
    if (field === 'name') { setNameDraft(name); setNameStatus('editing'); }
    else                  { setEmailDraft(email); setEmailStatus('editing'); }
  };

  const cancelEdit = (field: 'name' | 'email') => {
    setError(null);
    if (field === 'name') { setNameDraft(name); setNameStatus('idle'); }
    else                  { setEmailDraft(email); setEmailStatus('idle'); }
  };

  const saveName = async () => {
    if (!onSaveName) return;
    setError(null);
    setNameStatus('saving');
    try {
      await onSaveName(nameDraft);
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

  /*
    حالة الإيميل بتجي من الداتابيز مش من الواجهة — الكارد كان بيبدأ
    `pending` مكتوبة يدويًا، فكان بيوعد بطلب مش موجود.
  */
  const emailBadge: FieldStatus | 'pending' =
    pendingEmail ? 'pending' : emailStatus;

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

        {/* ── Full Name ── */}
        <FieldRow
          label={tx.nameLabel}
          icon={<User className="w-3.5 h-3.5" />}
          value={name}
          draft={nameDraft}
          status={nameStatus}
          canEdit={canEditName && Boolean(onSaveName)}
          // شارة "مقفل من الأدمن" تظهر فقط لو في قفل فعلي — مش لمجرد
          // إن المستخدم الحالي ما بيقدر يعدّل
          lockedLabel={!canEditName ? tx.lockedByAdmin : undefined}
          note={tx.nameNote}
          tx={tx}
          lang={lang}
          isRTL={isRTL}
          isDark={isDark}
          textMain={textMain}
          textMuted={textMuted}
          inputBg={inputBg}
          inputBorder={inputBorder}
          focusBorder={focusBorder}
          onDraftChange={setNameDraft}
          onEdit={() => startEdit('name')}
          onSave={saveName}
          onCancel={() => cancelEdit('name')}
        />

        <div style={{ height: '1px', background: divider }} />

        {/* ── Email ── */}
        {/*
          id للإشعارات: تمت الموافقة/الرفض على تغيير الإيميل بتودّي
          لـ `/profile#email-field` — hook التوهيج العام بيدوّر عليه.
        */}
        <div id="email-field">
        <FieldRow
          label={tx.emailLabel}
          icon={<Mail className="w-3.5 h-3.5" />}
          value={email}
          draft={emailDraft}
          status={emailBadge as FieldStatus}
          canEdit={canEditEmail && Boolean(onRequestEmail) && !pendingEmail}
          /*
            الإيميل ما بينقفل من الأدمن أصلاً — ما حدا بيغيّره مباشرة،
            ولا حتى الـ Developer. التغيير بطلب من العضو + تأكيد من
            صندوقه الجديد. "Locked by admin" هون كانت بتكذب.
          */
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
          onEdit={() => startEdit('email')}
          onSave={saveEmail}
          onCancel={() => cancelEdit('email')}
        />
        </div>

        {/* الإيميل الجديد المطلوب — معلومة مهمة كانت مخفية تمامًا */}
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
   Sub-component: FieldRow
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
  /** سبب منع التعديل. `undefined` = ما في شارة (الحقل غير قابل للتعديل بطبيعته) */
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