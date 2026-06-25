"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Pencil, X, Check, Clock, AlertCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang }  from '@/context/LangContext';

/* ─── Types ─── */
type FieldStatus = 'idle' | 'editing' | 'pending' | 'saved';

interface PersonalInfoProps {
  name:           string;
  email:          string;
  canEditName?:   boolean; // controlled by admin
  canEditEmail?:  boolean; // controlled by admin
}

/* ══════════════════════════════════════════════ */
export default function PersonalInfo({
  name,
  email,
  canEditName  = true,
  canEditEmail = true,
}: PersonalInfoProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  /* ── field states ── */
  const [nameVal,    setNameVal]    = useState(name);
  const [emailVal,   setEmailVal]   = useState(email);
  const [nameDraft,  setNameDraft]  = useState(name);
  const [emailDraft, setEmailDraft] = useState(email);

  const [nameStatus,  setNameStatus]  = useState<FieldStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<FieldStatus>('pending'); // email always pending until admin approves

  /* ── palette ── */
  const bg        = isDark ? 'var(--card)'           : '#ffffff';
  const border    = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)';
  const headerBg  = isDark ? 'var(--background-alt)' : '#f5f5ef';
  const divider   = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)';
  const textMain  = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';
  const inputBg   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
  const focusBorder = '#458482';

  /* ── translations ── */
  const tx = {
    title:          lang === 'ar' ? 'المعلومات الشخصية'         : 'Personal Info',
    subtitle:       lang === 'ar' ? 'بياناتك الأساسية في المنصة' : 'Your basic details on the platform',
    nameLabel:      lang === 'ar' ? 'الاسم'                      : 'Full Name',
    emailLabel:     lang === 'ar' ? 'البريد الإلكتروني'          : 'Email',
    save:           lang === 'ar' ? 'حفظ'                        : 'Save',
    cancel:         lang === 'ar' ? 'إلغاء'                      : 'Cancel',
    edit:           lang === 'ar' ? 'تعديل'                      : 'Edit',
    saved:          lang === 'ar' ? 'تم الحفظ'                   : 'Saved',
    lockedByAdmin:  lang === 'ar' ? 'مقفل من الأدمن'             : 'Locked by admin',
    pendingApproval:lang === 'ar' ? 'بانتظار موافقة الأدمن'      : 'Pending admin approval',
    emailNote:      lang === 'ar'
      ? 'تغيير الإيميل يحتاج موافقة الأدمن قبل تفعيله'
      : 'Email changes require admin approval before taking effect',
    nameNote:       lang === 'ar'
      ? 'الاسم يظهر دائماً بالإنجليزية بغض النظر عن لغة الواجهة'
      : 'Your name always appears in English regardless of interface language',
  };

  /* ── handlers ── */
  const startEdit = (field: 'name' | 'email') => {
    if (field === 'name') {
      setNameDraft(nameVal);
      setNameStatus('editing');
    } else {
      setEmailDraft(emailVal);
      setEmailStatus('editing');
    }
  };

  const cancelEdit = (field: 'name' | 'email') => {
    if (field === 'name') {
      setNameDraft(nameVal);
      setNameStatus('idle');
    } else {
      setEmailDraft(emailVal);
      setEmailStatus('idle');
    }
  };

  const saveField = (field: 'name' | 'email') => {
    if (field === 'name') {
      setNameVal(nameDraft);
      setNameStatus('saved');
      // TODO: call API
      setTimeout(() => setNameStatus('idle'), 2000);
    } else {
      setEmailVal(emailDraft);
      setEmailStatus('pending'); // email goes pending until admin approves
      // TODO: call API — response will flip to 'saved' after admin approval
    }
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
          value={nameVal}
          draft={nameDraft}
          status={nameStatus}
          canEdit={canEditName}
          isAlwaysLatin={true}
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
          onSave={() => saveField('name')}
          onCancel={() => cancelEdit('name')}
        />

        {/* divider */}
        <div style={{ height: '1px', background: divider }} />

        {/* ── Email ── */}
        <FieldRow
          label={tx.emailLabel}
          icon={<Mail className="w-3.5 h-3.5" />}
          value={emailVal}
          draft={emailDraft}
          status={emailStatus}
          canEdit={canEditEmail}
          isAlwaysLatin={true}
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
          onDraftChange={setEmailDraft}
          onEdit={() => startEdit('email')}
          onSave={() => saveField('email')}
          onCancel={() => cancelEdit('email')}
        />

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Sub-component: FieldRow
   ══════════════════════════════════════════════ */
interface FieldRowProps {
  label:          string;
  icon:           React.ReactNode;
  value:          string;
  draft:          string;
  status:         FieldStatus;
  canEdit:        boolean;
  isAlwaysLatin:  boolean;
  note:           string;
  tx:             Record<string, string>;
  lang:           string;
  isRTL:          boolean;
  isDark:         boolean;
  textMain:       string;
  textMuted:      string;
  inputBg:        string;
  inputBorder:    string;
  focusBorder:    string;
  onDraftChange:  (v: string) => void;
  onEdit:         () => void;
  onSave:         () => void;
  onCancel:       () => void;
}

const StatusBadge = ({
  status, tx, lang, isDark,
}: { status: FieldStatus; tx: Record<string,string>; lang: string; isDark: boolean }) => {
  if (status === 'saved') return (
    <span
      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: '#10b98122', color: '#10b981',
        fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
      }}
    >
      <Check className="w-2.5 h-2.5" /> {tx.saved}
    </span>
  );
  if (status === 'pending') return (
    <span
      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: '#f59e0b22', color: '#f59e0b',
        fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
      }}
    >
      <Clock className="w-2.5 h-2.5" /> {tx.pendingApproval}
    </span>
  );
  return null;
};

function FieldRow({
  label, icon, value, draft, status, canEdit, isAlwaysLatin,
  note, tx, lang, isRTL, isDark,
  textMain, textMuted, inputBg, inputBorder, focusBorder,
  onDraftChange, onEdit, onSave, onCancel,
}: FieldRowProps) {
  const [focused, setFocused] = useState(false);
  const isEditing = status === 'editing';

  const fontFamily = isAlwaysLatin ? 'inherit' : (lang === 'ar' ? 'var(--font-arabic)' : 'inherit');

  return (
    <div className="flex flex-col gap-2">

      {/* Label row */}
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
          <StatusBadge status={status} tx={tx} lang={lang} isDark={isDark} />

          {/* Edit / Lock button */}
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
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#45848222';
                  e.currentTarget.style.color = '#458482';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.color = textMuted;
                }}
              >
                <Pencil className="w-2.5 h-2.5" />
                {tx.edit}
              </button>
            ) : (
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
            )
          )}
        </div>
      </div>

      {/* Value / Input */}
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
              onChange={e => onDraftChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-150"
              style={{
                background:  inputBg,
                border:      `1px solid ${focused ? focusBorder : inputBorder}`,
                color:       textMain,
                fontFamily,
                direction:   isAlwaysLatin ? 'ltr' : (isRTL ? 'rtl' : 'ltr'),
                boxShadow:   focused ? `0 0 0 3px ${focusBorder}22` : 'none',
              }}
            />
            {/* Save */}
            <button
              onClick={onSave}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer"
              style={{ background: '#458482', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3a7270'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#458482'; }}
            >
              <Check className="w-4 h-4" />
            </button>
            {/* Cancel */}
            <button
              onClick={onCancel}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: textMuted,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
                e.currentTarget.style.color = textMuted;
              }}
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
            style={{
              background: inputBg,
              border:     `1px solid ${inputBorder}`,
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: textMain, fontFamily, direction: 'ltr' }}
            >
              {value}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note */}
      <p
        className="text-[10px] leading-relaxed"
        style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
      >
        {note}
      </p>
    </div>
  );
}