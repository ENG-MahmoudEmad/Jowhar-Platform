// src/components/dashboard/adminControl/DirectorNotes.tsx
"use client";

import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { NotebookPen, Send, Trash2, ArrowLeft, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type Lang = 'en' | 'ar';

/**
 * A message inside a note's thread.
 *
 * `authorRole` is what makes the thread work: it drives the visual sides of the
 * conversation AND the director's unread count. Without it there is no way to
 * tell "the member answered me" from "I answered the member".
 */
export type NoteReply = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'director' | 'member';
  text: string;
  createdAt: string; // ISO datetime
};

export type DirectorNote = {
  id: string;
  text: string;
  createdAt: string; // ISO datetime
  replies: NoteReply[];
  /**
   * Last time the director opened this thread. A reply from the member that is
   * newer than this counts as unread.
   *
   * One timestamp per note rather than a read flag per reply: the UI only ever
   * needs "is there something new here", so per-reply tracking would be extra
   * rows and extra writes for information nothing displays.
   * `null` = never opened.
   */
  directorLastSeenAt: string | null;
};

type DirectorNotesStyle = React.CSSProperties & Record<`--dn-${string}`, string>;

// ---- Layout constants ----
// Same fixed-height-list pattern as MembersControl: the notes list always
// reserves space for 5 rows, so the card's footprint doesn't jump around
// as notes are added/removed. The conversation view reuses the same height
// so switching views doesn't resize the card either.
const ROW_MIN_HEIGHT_PX = 64;
const VISIBLE_ROWS = 5;
const LIST_HEIGHT_PX = ROW_MIN_HEIGHT_PX * VISIBLE_ROWS;

const CURRENT_DIRECTOR = { id: 'director-1', name: 'Alwaqee' };

// ---- Mock data (replace with Supabase query, scoped to memberId) ----
const MOCK_NOTES: DirectorNote[] = [
  {
    id: 'n1',
    text: 'Great progress on the walk cycle this week — keep the timing notes coming.',
    createdAt: '2026-07-20T10:15:00',
    directorLastSeenAt: '2026-07-20T10:20:00',
    replies: [
      { id: 'r1', authorId: 'm2', authorName: 'Ahmed', authorRole: 'member', text: 'Thanks! I reworked frames 8–14, the contact pose reads much better now.', createdAt: '2026-07-20T12:02:00' },
      { id: 'r2', authorId: 'director-1', authorName: 'Alwaqee', authorRole: 'director', text: 'Agreed. Push the overlap on the arms slightly and it is done.', createdAt: '2026-07-20T13:30:00' },
      // Newer than directorLastSeenAt → shows as unread
      { id: 'r3', authorId: 'm2', authorName: 'Ahmed', authorRole: 'member', text: 'Done — uploaded v3 to the shared folder for review.', createdAt: '2026-07-21T09:12:00' },
    ],
  },
  {
    id: 'n2',
    text: 'Please sync with Sarah on the rig handoff before Thursday.',
    createdAt: '2026-07-18T14:40:00',
    directorLastSeenAt: null,
    replies: [],
  },
];

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

const TEXT = {
  en: {
    title: 'Director Notes',
    subtitle: 'Feedback visible on their My Tasks page',
    placeholder: 'Write a note for this member...',
    send: 'Add Note',
    empty: 'No notes yet',
    deleteConfirm: 'Delete this note?',
    confirm: 'Delete',
    cancel: 'Cancel',
    // Conversation view
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
    placeholder: 'اكتب ملاحظة لهذا العضو...',
    send: 'إضافة ملاحظة',
    empty: 'لا توجد ملاحظات بعد',
    deleteConfirm: 'حذف هذه الملاحظة؟',
    confirm: 'حذف',
    cancel: 'إلغاء',
    // Conversation view
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
} satisfies Record<Lang, {
  title: string; subtitle: string; placeholder: string; send: string;
  empty: string; deleteConfirm: string; confirm: string; cancel: string;
  conversation: string; back: string; prev: string; next: string;
  replyPlaceholder: string; sendReply: string; noReplies: string;
  newReplies: string; openThread: string; you: string;
}>;

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
  confirmingDelete: boolean;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onOpen: (id: string) => void;
}) {
  const copy = TEXT[lang];
  const unread = countUnreadReplies(note);
  const replyCount = note.replies.length;

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
      {/* The whole text block opens the thread — the row is the natural target,
          not a small icon. */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={copy.openThread}
        className="min-w-0 flex-1 cursor-pointer text-start"
      >
        <p className="text-sm font-medium leading-snug text-[var(--dn-text-main)]">{note.text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium text-[var(--dn-text-muted)]">
            {formatTimestamp(note.createdAt, lang)}
          </span>

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
  onNoteAdded,
  onUnreadChange,
}: {
  memberId: string;
  onNoteAdded?: (note: DirectorNote) => void;
  /** Lets the parent keep the members list badge in sync. */
  onUnreadChange?: (memberId: string, unreadCount: number) => void;
}) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang as Lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  const [notes, setNotes] = useState(MOCK_NOTES);
  const [draft, setDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  /** `null` = list view, otherwise the id of the note whose thread is open. */
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

  /* Report upward whenever the count changes, so the members list badge and this
     card can never disagree. */
  useEffect(() => {
    onUnreadChange?.(memberId, totalUnread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, totalUnread]);

  /** Opening a thread is what marks its member replies as seen. */
  const markSeen = useCallback((noteId: string) => {
    const seenAt = new Date().toISOString();
    // TODO: API — persist director_last_seen_at for this note.
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, directorLastSeenAt: seenAt } : n)));
  }, []);

  const handleOpenNote = useCallback((id: string) => {
    setOpenNoteId(id);
    setReplyDraft('');
    setDeleteTargetId(null);
    markSeen(id);
  }, [markSeen]);

  const handleBackToList = useCallback(() => {
    setOpenNoteId(null);
    setReplyDraft('');
  }, []);

  /** Arrow navigation through the notes without returning to the list. */
  const handleStep = useCallback((direction: 1 | -1) => {
    if (openIndex < 0) return;
    const nextIndex = openIndex + direction;
    if (nextIndex < 0 || nextIndex >= sortedNotes.length) return;
    const nextNote = sortedNotes[nextIndex];
    setOpenNoteId(nextNote.id);
    setReplyDraft('');
    markSeen(nextNote.id);
  }, [openIndex, sortedNotes, markSeen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text) return;

      const newNote: DirectorNote = {
        id: `n_${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
        replies: [],
        directorLastSeenAt: new Date().toISOString(),
      };

      // TODO: API — insert note scoped to `memberId`, then:
      //  - show immediately in member's My Tasks "Director Notes" section
      //  - increment that member's Notifications Bell count (Navbar)
      setNotes((prev) => [newNote, ...prev]);
      onNoteAdded?.(newNote);
      setDraft('');
    },
    [draft, onNoteAdded]
  );

  const handleSendReply = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = replyDraft.trim();
      if (!text || !openNoteId) return;

      const reply: NoteReply = {
        id: `r_${Date.now()}`,
        authorId: CURRENT_DIRECTOR.id,
        authorName: CURRENT_DIRECTOR.name,
        authorRole: 'director',
        text,
        createdAt: new Date().toISOString(),
      };

      // TODO: API — insert reply on this note, then notify the member
      // (their My Tasks thread + Notifications Bell).
      setNotes((prev) =>
        prev.map((n) =>
          n.id === openNoteId
            ? { ...n, replies: [...n.replies, reply], directorLastSeenAt: reply.createdAt }
            : n
        )
      );
      setReplyDraft('');
    },
    [replyDraft, openNoteId]
  );

  const handleRequestDelete = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleCancelDelete = useCallback(() => setDeleteTargetId(null), []);
  const handleConfirmDelete = useCallback((id: string) => {
    // TODO: API — hard delete this note and its replies (notes are otherwise immutable, no edit)
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeleteTargetId(null);
    setOpenNoteId((current) => (current === id ? null : current));
  }, []);

  const hasPrev = openIndex > 0;
  const hasNext = openIndex >= 0 && openIndex < sortedNotes.length - 1;

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
              {openNote ? formatTimestamp(openNote.createdAt, lang as Lang) : copy.subtitle}
            </p>
          </div>

          {/* Unread total (list view) */}
          {!openNote && totalUnread > 0 && (
            <span className="ms-auto shrink-0 rounded-full bg-[#ef4444] px-2.5 py-1 text-[10px] font-black text-white">
              {totalUnread}
            </span>
          )}

          {/* Arrow navigation between notes (conversation view) */}
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
                {isRTL
                  ? <ChevronRight size={14} aria-hidden="true" />
                  : <ChevronLeft size={14} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={!hasNext}
                aria-label={copy.next}
                className="cursor-pointer rounded-lg p-1.5 text-[var(--dn-text-muted)] transition-colors hover:bg-[var(--dn-input-bg)] hover:text-[var(--dn-text-main)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isRTL
                  ? <ChevronLeft size={14} aria-hidden="true" />
                  : <ChevronRight size={14} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>

        {/* ---------- Body: list view or conversation view ---------- */}
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
                <p className="text-sm font-medium leading-snug text-[var(--dn-text-main)]">
                  {openNote.text}
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
            <form onSubmit={handleSubmit} className="flex items-start gap-2 border-b border-[var(--dn-divider)] p-4 sm:p-5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={copy.placeholder}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--dn-border)] bg-[var(--dn-input-bg)] px-3 py-2 text-sm font-medium text-[var(--dn-text-main)] outline-none placeholder:text-[var(--dn-text-muted)] focus:border-[#458482]/40"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label={copy.send}
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#458482] p-2.5 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={14} aria-hidden="true" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
              </button>
            </form>

            {/*
              Fixed-height viewport = exactly 5 rows worth of space, same pattern
              as MembersControl's member list — keeps the card's footprint
              constant whether there are 0 notes or 20.
            */}
            <div
              className="bg-[var(--dn-bg)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--dn-scrollbar-thumb)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--dn-scrollbar-thumb)]"
              style={{ height: LIST_HEIGHT_PX }}
            >
              {sortedNotes.length === 0 ? (
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