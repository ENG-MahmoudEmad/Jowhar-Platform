// src/components/dashboard/adminControl/DirectorNotes.tsx
"use client";

import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { NotebookPen, Send, Trash2, ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, CheckCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import SkeletonRows from './SkeletonRows';
import type { DirectorNoteDTO, NoteReplyDTO, NotePriority } from '@/app/(dashboard)/adminControl/notesActions';

type Lang = 'en' | 'ar';

/**
 * الأنواع صارت تجي من الأكشنز (مصدر واحد بين السيرفر والواجهة).
 * الأسماء القديمة محفوظة كـ aliases عشان أي ملف تاني بيستوردها ما ينكسر.
 */
export type NoteReply = NoteReplyDTO;
export type DirectorNote = DirectorNoteDTO;

type DirectorNotesStyle = React.CSSProperties & Record<`--dn-${string}`, string>;

// ---- Layout constants ----
const ROW_MIN_HEIGHT_PX = 64;
const VISIBLE_ROWS = 5;
const LIST_HEIGHT_PX = ROW_MIN_HEIGHT_PX * VISIBLE_ROWS;

const CARD_TRANSITION = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const ROW_TRANSITION = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const VIEW_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

/*
  اللون مشتق من الأولوية مش مخزّن — فما في لون بيتناقض مع الأولوية،
  ولا منتقي ألوان زايد بفورم المدير. نفس القيم بجهة العضو بالضبط.
*/
const PRIORITY_COLORS: Record<NotePriority, string> = {
  low: '#22c55e',
  medium: '#e0a740',
  high: '#ef4444',
};

const PRIORITY_ORDER: NotePriority[] = ['low', 'medium', 'high'];

const TEXT = {
  en: {
    title: 'Director Notes',
    subtitle: 'Feedback visible on their My Tasks page',
    titlePlaceholder: 'Note title...',
    placeholder: 'Write a note for this member...',
    send: 'Add Note',
    empty: 'No notes yet',
    loading: 'Loading notes...',
    confirm: 'Delete',
    cancel: 'Cancel',
    priority: 'Priority',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    readAt: 'Read',
    unread: 'Not read yet',
    conversation: 'Conversation',
    back: 'Back to notes',
    prev: 'Previous note',
    next: 'Next note',
    replyPlaceholder: 'Reply to this member...',
    sendReply: 'Send reply',
    noReplies: 'No replies yet',
    newReplies: 'new',
    openThread: 'Open conversation',
    you: 'You',
  },
  ar: {
    title: 'ملاحظات المدير',
    subtitle: 'ملاحظات ظاهرة بصفحة تاسكاته',
    titlePlaceholder: 'عنوان الملاحظة...',
    placeholder: 'اكتب ملاحظة لهذا العضو...',
    send: 'إضافة ملاحظة',
    empty: 'لا توجد ملاحظات بعد',
    loading: 'جارِ تحميل الملاحظات...',
    confirm: 'حذف',
    cancel: 'إلغاء',
    priority: 'الأولوية',
    priorityLow: 'منخفضة',
    priorityMedium: 'متوسطة',
    priorityHigh: 'عالية',
    readAt: 'قرأها',
    unread: 'لم تُقرأ بعد',
    conversation: 'المحادثة',
    back: 'رجوع للملاحظات',
    prev: 'الملاحظة السابقة',
    next: 'الملاحظة التالية',
    replyPlaceholder: 'رد على هذا العضو...',
    sendReply: 'إرسال الرد',
    noReplies: 'لا توجد ردود بعد',
    newReplies: 'جديد',
    openThread: 'فتح المحادثة',
    you: 'أنت',
  },
} satisfies Record<Lang, Record<string, string>>;

function priorityLabel(p: NotePriority, copy: (typeof TEXT)[Lang]): string {
  if (p === 'high') return copy.priorityHigh;
  if (p === 'low') return copy.priorityLow;
  return copy.priorityMedium;
}

function getPalette(isDark: boolean): DirectorNotesStyle {
  return {
    '--dn-bg': isDark ? 'var(--card)' : '#ffffff',
    '--dn-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--dn-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--dn-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--dn-row-hover': isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    '--dn-input-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    '--dn-text-main': 'var(--foreground)',
    '--dn-text-muted': 'var(--foreground-muted)',
    '--dn-scrollbar-thumb': isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)',
    '--dn-bubble-member': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    '--dn-bubble-director': isDark ? 'rgba(69,132,130,0.16)' : 'rgba(69,132,130,0.10)',
    background: 'var(--dn-bg)',
    border: '1px solid var(--dn-border)',
  };
}

function formatTimestamp(iso: string, lang: Lang): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/**
 * Replies from the member that arrived after the director last opened the thread.
 * Exported so the members list can show the same number without duplicating the rule.
 */
export function countUnreadReplies(note: DirectorNote): number {
  const seenAt = note.directorLastSeenAt ? new Date(note.directorLastSeenAt).getTime() : 0;
  return note.replies.filter(
    (r) => r.authorRole === 'member' && new Date(r.createdAt).getTime() > seenAt
  ).length;
}

export function countUnreadRepliesForNotes(notes: DirectorNote[]): number {
  return notes.reduce((total, note) => total + countUnreadReplies(note), 0);
}

// =========================================================
// Note Row
// =========================================================
const NoteRow = memo(function NoteRow({
  note,
  isLast,
  isRTL,
  lang,
  copy,
  confirmingDelete,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onOpen,
}: {
  note: DirectorNote;
  isLast: boolean;
  isRTL: boolean;
  lang: Lang;
  copy: (typeof TEXT)[Lang];
  confirmingDelete: boolean;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onOpen: (id: string) => void;
}) {
  const unread = countUnreadReplies(note);
  const replyCount = note.replies.length;
  const color = PRIORITY_COLORS[note.priority];

  const handleOpen = useCallback(() => onOpen(note.id), [onOpen, note.id]);

  return (
    <m.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={ROW_TRANSITION}
      className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--dn-row-hover)] sm:px-5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--dn-divider)' }}
    >
      <button
        type="button"
        onClick={handleOpen}
        aria-label={copy.openThread}
        className="min-w-0 flex-1 cursor-pointer text-start"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <p className="truncate text-sm font-bold leading-snug text-[var(--dn-text-main)]">
            {note.title}
          </p>
        </div>

        <p className="mt-0.5 truncate ps-3.5 text-[11px] font-medium text-[var(--dn-text-muted)]">
          {note.text}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2 ps-3.5">
          <span className="text-[10px] font-medium text-[var(--dn-text-muted)]">
            {formatTimestamp(note.createdAt, lang)}
          </span>

          {/* إيصال القراءة — بيقول للمدير إذا العضو فتحها أصلاً */}
          {note.memberReadAt ? (
            <span
              className="flex items-center gap-1 text-[10px] font-medium"
              style={{ color, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              <CheckCheck size={11} aria-hidden="true" />
              {copy.readAt}
            </span>
          ) : (
            <span
              className="text-[10px] font-medium text-[var(--dn-text-muted)] opacity-70"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.unread}
            </span>
          )}

          {replyCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--dn-text-muted)]">
              <MessageSquare size={10} aria-hidden="true" />
              {replyCount}
            </span>
          )}

          {unread > 0 && (
            <span
              className="rounded-full bg-[#ef4444] px-1.5 py-0.5 text-[9px] font-black text-white"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {unread} {copy.newReplies}
            </span>
          )}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <AnimatePresence mode="wait" initial={false}>
          {confirmingDelete ? (
            <m.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={ROW_TRANSITION}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => onConfirmDelete(note.id)}
                className="cursor-pointer rounded-md bg-[rgba(239,68,68,0.1)] px-2 py-1 text-[9px] font-black uppercase text-[#ef4444] hover:bg-[rgba(239,68,68,0.18)]"
              >
                {copy.confirm}
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="cursor-pointer rounded-md bg-[var(--dn-input-bg)] px-2 py-1 text-[9px] font-black uppercase text-[var(--dn-text-muted)] hover:opacity-80"
              >
                {copy.cancel}
              </button>
            </m.div>
          ) : (
            <m.div
              key="trigger"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => onRequestDelete(note.id)}
                aria-label={copy.confirm}
                className="cursor-pointer rounded-lg p-1.5 text-[var(--dn-text-muted)] opacity-0 transition-colors group-hover:opacity-100 hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444]"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleOpen}
                aria-label={copy.openThread}
                className="cursor-pointer rounded-lg p-1.5 text-[var(--dn-text-muted)] transition-colors hover:bg-[var(--dn-input-bg)] hover:text-[var(--dn-text-main)]"
              >
                <ChevronRight size={14} aria-hidden="true" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
});

// =========================================================
// Reply Bubble
// =========================================================
const ReplyBubble = memo(function ReplyBubble({
  reply,
  lang,
  isRTL,
}: {
  reply: NoteReply;
  lang: Lang;
  isRTL: boolean;
}) {
  const copy = TEXT[lang];
  const isDirector = reply.authorRole === 'director';

  return (
    <div className={`flex w-full ${isDirector ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%] min-w-0">
        <div className={`flex items-center gap-2 ${isDirector ? 'justify-end' : 'justify-start'}`}>
          <span
            className="text-[10px] font-bold"
            style={{
              color: isDirector ? '#458482' : 'var(--dn-text-main)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {isDirector ? copy.you : reply.authorName}
          </span>
          <span className="text-[9px] font-medium text-[var(--dn-text-muted)]">
            {formatTimestamp(reply.createdAt, lang)}
          </span>
        </div>

        <div
          className="mt-1 rounded-xl px-3 py-2 text-xs font-medium leading-relaxed text-[var(--dn-text-main)]"
          style={{
            background: isDirector ? 'var(--dn-bubble-director)' : 'var(--dn-bubble-member)',
            border: `1px solid ${isDirector ? 'rgba(69,132,130,0.25)' : 'var(--dn-divider)'}`,
            direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          {reply.text}
        </div>
      </div>
    </div>
  );
});

// =========================================================
// Main Component
// =========================================================
function DirectorNotes({
  memberId,
  notes,
  loading = false,
  onCreateNote,
  onAddReply,
  onDeleteNote,
  onMarkSeen,
  onUnreadChange,
}: {
  memberId: string;
  notes: DirectorNote[];
  loading?: boolean;
  /** الحالة مرفوعة للصفحة — الكارد بيطلب، والأب بيحدّث ويتراجع لو فشل. */
  onCreateNote: (memberId: string, input: { title: string; text: string; priority: NotePriority }) => void;
  onAddReply: (noteId: string, text: string) => void;
  onDeleteNote: (noteId: string) => void;
  onMarkSeen: (noteId: string) => void;
  /** Lets the parent keep the members list badge in sync. */
  onUnreadChange?: (memberId: string, unreadCount: number) => void;
}) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang as Lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  const [titleDraft, setTitleDraft] = useState('');
  const [draft, setDraft] = useState('');
  const [priority, setPriority] = useState<NotePriority>('medium');
  const [replyDraft, setReplyDraft] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  const openIndex = useMemo(
    () => (openNoteId ? sortedNotes.findIndex((n) => n.id === openNoteId) : -1),
    [sortedNotes, openNoteId]
  );

  const openNote = openIndex >= 0 ? sortedNotes[openIndex] : null;

  const totalUnread = useMemo(() => countUnreadRepliesForNotes(notes), [notes]);

  useEffect(() => {
    onUnreadChange?.(memberId, totalUnread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, totalUnread]);

  const handleOpenNote = useCallback((id: string) => {
    setOpenNoteId(id);
    setReplyDraft('');
    setDeleteTargetId(null);
    onMarkSeen(id);
  }, [onMarkSeen]);

  const handleBackToList = useCallback(() => {
    setOpenNoteId(null);
    setReplyDraft('');
  }, []);

  const handleStep = useCallback((direction: 1 | -1) => {
    if (openIndex < 0) return;
    const nextIndex = openIndex + direction;
    if (nextIndex < 0 || nextIndex >= sortedNotes.length) return;
    const nextNote = sortedNotes[nextIndex];
    setOpenNoteId(nextNote.id);
    setReplyDraft('');
    onMarkSeen(nextNote.id);
  }, [openIndex, sortedNotes, onMarkSeen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const title = titleDraft.trim();
      const text = draft.trim();
      if (!title || !text) return;

      /*
        بعد الحفظ الملاحظة بتظهر بمكانين تانيين:
        قسم Director Notes بصفحة My Tasks تبع العضو، وعدّاد جرس الإشعارات عنده.
      */
      onCreateNote(memberId, { title, text, priority });
      setTitleDraft('');
      setDraft('');
      setPriority('medium');
    },
    [titleDraft, draft, priority, onCreateNote, memberId]
  );

  const handleSendReply = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = replyDraft.trim();
      if (!text || !openNoteId) return;

      onAddReply(openNoteId, text);
      setReplyDraft('');
    },
    [replyDraft, openNoteId, onAddReply]
  );

  const handleRequestDelete = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleCancelDelete = useCallback(() => setDeleteTargetId(null), []);
  const handleConfirmDelete = useCallback((id: string) => {
    // الملاحظات ما بتتعدّل — بس تُضاف أو تُحذف نهائيًا (مع ردودها بالـ cascade)
    onDeleteNote(id);
    setDeleteTargetId(null);
    setOpenNoteId((current) => (current === id ? null : current));
  }, [onDeleteNote]);

  const hasPrev = openIndex > 0;
  const hasNext = openIndex >= 0 && openIndex < sortedNotes.length - 1;
  const canSubmit = Boolean(titleDraft.trim() && draft.trim());

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CARD_TRANSITION}
        aria-labelledby="director-notes-title"
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full overflow-hidden rounded-2xl"
        style={palette}
      >
        {/* ---------- Header ---------- */}
        <div className="flex items-center gap-3 bg-[var(--dn-header-bg)] p-5 sm:p-6 border-b border-[var(--dn-divider)]">
          {openNote ? (
            <button
              type="button"
              onClick={handleBackToList}
              aria-label={copy.back}
              className="shrink-0 cursor-pointer rounded-lg bg-[rgba(69,132,130,0.1)] p-2 text-[#458482] transition-colors hover:bg-[rgba(69,132,130,0.18)]"
            >
              <ArrowLeft size={18} aria-hidden="true" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
            </button>
          ) : (
            <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
              <NotebookPen size={18} className="text-[#458482]" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0 text-start">
            <h2
              id="director-notes-title"
              className="text-sm font-bold uppercase tracking-widest text-[var(--dn-text-main)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {openNote ? copy.conversation : copy.title}
            </h2>
            <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--dn-text-muted)]">
              {openNote ? openNote.title : copy.subtitle}
            </p>
          </div>

          {!openNote && totalUnread > 0 && (
            <span className="ms-auto shrink-0 rounded-full bg-[#ef4444] px-2.5 py-1 text-[10px] font-black text-white">
              {totalUnread}
            </span>
          )}

          {openNote && (
            <div className="ms-auto flex shrink-0 items-center gap-1">
              <span className="me-1 text-[10px] font-medium text-[var(--dn-text-muted)]">
                {openIndex + 1} / {sortedNotes.length}
              </span>
              <button
                type="button"
                onClick={() => handleStep(-1)}
                disabled={!hasPrev}
                aria-label={copy.prev}
                className="cursor-pointer rounded-lg p-1.5 text-[var(--dn-text-muted)] transition-colors hover:bg-[var(--dn-input-bg)] hover:text-[var(--dn-text-main)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isRTL ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={!hasNext}
                aria-label={copy.next}
                className="cursor-pointer rounded-lg p-1.5 text-[var(--dn-text-muted)] transition-colors hover:bg-[var(--dn-input-bg)] hover:text-[var(--dn-text-main)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isRTL ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>

        {/* ---------- Body ---------- */}
        {openNote ? (
          <m.div
            key={`thread-${openNote.id}`}
            initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={VIEW_TRANSITION}
          >
            {/* The original note, pinned above the thread */}
            <div className="border-b border-[var(--dn-divider)] p-4 sm:p-5">
              <div
                className="rounded-xl px-3 py-2.5"
                style={{
                  background: 'var(--dn-bubble-director)',
                  border: '1px solid rgba(69,132,130,0.25)',
                }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-[var(--dn-text-main)]">{openNote.title}</p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black"
                    style={{
                      backgroundColor: `${PRIORITY_COLORS[openNote.priority]}26`,
                      color: PRIORITY_COLORS[openNote.priority],
                      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    }}
                  >
                    {priorityLabel(openNote.priority, copy)}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug text-[var(--dn-text-main)]">
                  {openNote.text}
                </p>
                <p className="mt-2 text-[10px] font-medium text-[var(--dn-text-muted)]">
                  {formatTimestamp(openNote.createdAt, lang as Lang)}
                  {openNote.memberReadAt
                    ? ` · ${copy.readAt} ${formatTimestamp(openNote.memberReadAt, lang as Lang)}`
                    : ` · ${copy.unread}`}
                </p>
              </div>
            </div>

            {/* Thread — same height as the notes list so the card never resizes */}
            <div
              className="bg-[var(--dn-bg)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--dn-scrollbar-thumb)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--dn-scrollbar-thumb)]"
              style={{ height: LIST_HEIGHT_PX }}
            >
              {openNote.replies.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs font-medium text-[var(--dn-text-muted)]">{copy.noReplies}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 sm:p-5">
                  {openNote.replies.map((reply) => (
                    <ReplyBubble key={reply.id} reply={reply} lang={lang as Lang} isRTL={isRTL} />
                  ))}
                </div>
              )}
            </div>

            {/* Director reply box */}
            <form onSubmit={handleSendReply} className="flex items-start gap-2 border-t border-[var(--dn-divider)] p-4 sm:p-5">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={copy.replyPlaceholder}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--dn-border)] bg-[var(--dn-input-bg)] px-3 py-2 text-sm font-medium text-[var(--dn-text-main)] outline-none placeholder:text-[var(--dn-text-muted)] focus:border-[#458482]/40"
              />
              <button
                type="submit"
                disabled={!replyDraft.trim()}
                aria-label={copy.sendReply}
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#458482] p-2.5 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={14} aria-hidden="true" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
              </button>
            </form>
          </m.div>
        ) : (
          <m.div
            key="list"
            initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={VIEW_TRANSITION}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-b border-[var(--dn-divider)] p-4 sm:p-5">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder={copy.titlePlaceholder}
                maxLength={120}
                className="w-full rounded-lg border border-[var(--dn-border)] bg-[var(--dn-input-bg)] px-3 py-2 text-sm font-bold text-[var(--dn-text-main)] outline-none placeholder:font-medium placeholder:text-[var(--dn-text-muted)] focus:border-[#458482]/40"
              />

              <div className="flex items-start gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={copy.placeholder}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[var(--dn-border)] bg-[var(--dn-input-bg)] px-3 py-2 text-sm font-medium text-[var(--dn-text-main)] outline-none placeholder:text-[var(--dn-text-muted)] focus:border-[#458482]/40"
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  aria-label={copy.send}
                  className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#458482] p-2.5 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={14} aria-hidden="true" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
                </button>
              </div>

              {/* Priority — أزرار مباشرة بدل dropdown، 3 خيارات بس */}
              <div className="flex items-center gap-1.5">
                <span
                  className="me-1 text-[9px] font-black uppercase tracking-wide text-[var(--dn-text-muted)]"
                  style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {copy.priority}
                </span>
                {PRIORITY_ORDER.map((p) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      aria-pressed={active}
                      className="cursor-pointer rounded-full px-2.5 py-1 text-[9px] font-black transition-colors"
                      style={{
                        backgroundColor: active ? `${PRIORITY_COLORS[p]}26` : 'var(--dn-input-bg)',
                        color: active ? PRIORITY_COLORS[p] : 'var(--dn-text-muted)',
                        border: `1px solid ${active ? `${PRIORITY_COLORS[p]}59` : 'transparent'}`,
                        fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                      }}
                    >
                      {priorityLabel(p, copy)}
                    </button>
                  );
                })}
              </div>
            </form>

            <div
              className="bg-[var(--dn-bg)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--dn-scrollbar-thumb)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--dn-scrollbar-thumb)]"
              style={{ height: LIST_HEIGHT_PX }}
            >

              {loading ? (
                <SkeletonRows />
              ) : sortedNotes.length === 0 ? (

                <div className="flex h-full items-center justify-center">
                  <p className="text-xs font-medium text-[var(--dn-text-muted)]">{copy.empty}</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {sortedNotes.map((note, i) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      isLast={i === sortedNotes.length - 1}
                      isRTL={isRTL}
                      lang={lang as Lang}
                      copy={copy}
                      confirmingDelete={deleteTargetId === note.id}
                      onRequestDelete={handleRequestDelete}
                      onConfirmDelete={handleConfirmDelete}
                      onCancelDelete={handleCancelDelete}
                      onOpen={handleOpenNote}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </m.div>
        )}
      </m.section>
    </LazyMotion>
  );
}

export default memo(DirectorNotes);