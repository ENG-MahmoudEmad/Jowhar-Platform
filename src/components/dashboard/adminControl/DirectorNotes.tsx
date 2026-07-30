// src/components/dashboard/adminControl/DirectorNotes.tsx
"use client";

import React, { memo, useMemo, useState, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { NotebookPen, Send, Trash2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type Lang = 'en' | 'ar';

type DirectorNote = {
  id: string;
  text: string;
  createdAt: string; // ISO datetime
};

type DirectorNotesStyle = React.CSSProperties & Record<`--dn-${string}`, string>;

// ---- Layout constants ----
// Same fixed-height-list pattern as MembersControl: the notes list always
// reserves space for 5 rows, so the card's footprint doesn't jump around
// as notes are added/removed. Fewer than 5 just leaves empty space below;
// more than 5 scrolls internally.
const ROW_MIN_HEIGHT_PX = 64;
const VISIBLE_ROWS = 5;
const LIST_HEIGHT_PX = ROW_MIN_HEIGHT_PX * VISIBLE_ROWS;

// ---- Mock data (replace with Supabase query, scoped to memberId) ----
const MOCK_NOTES: DirectorNote[] = [
  { id: 'n1', text: 'Great progress on the walk cycle this week — keep the timing notes coming.', createdAt: '2026-07-20T10:15:00' },
  { id: 'n2', text: 'Please sync with Sarah on the rig handoff before Thursday.', createdAt: '2026-07-18T14:40:00' },
];

const CARD_TRANSITION = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const ROW_TRANSITION = {
  duration: 0.25,
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
  },
} satisfies Record<Lang, {
  title: string; subtitle: string; placeholder: string; send: string;
  empty: string; deleteConfirm: string; confirm: string; cancel: string;
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

// =========================================================
// Note Row
// =========================================================
const NoteRow = memo(function NoteRow({
  note,
  isLast,
  lang,
  confirmingDelete,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  note: DirectorNote;
  isLast: boolean;
  lang: Lang;
  confirmingDelete: boolean;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const copy = TEXT[lang];

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
      <div className="min-w-0 flex-1 text-start">
        <p className="text-sm font-medium leading-snug text-[var(--dn-text-main)]">{note.text}</p>
        <p className="mt-1 text-[10px] font-medium text-[var(--dn-text-muted)]">
          {formatTimestamp(note.createdAt, lang)}
        </p>
      </div>

      <div className="shrink-0">
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
            <m.button
              key="trigger"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onRequestDelete(note.id)}
              aria-label={copy.confirm}
              className="cursor-pointer rounded-lg p-1.5 text-[var(--dn-text-muted)] opacity-0 transition-colors group-hover:opacity-100 hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444]"
            >
              <Trash2 size={13} aria-hidden="true" />
            </m.button>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
});

// =========================================================
// Main Component
// =========================================================
function DirectorNotes({
  memberId,
  onNoteAdded,
}: {
  memberId: string;
  onNoteAdded?: (note: DirectorNote) => void;
}) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang as Lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  const [notes, setNotes] = useState(MOCK_NOTES);
  const [draft, setDraft] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text) return;

      const newNote: DirectorNote = {
        id: `n_${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
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

  const handleRequestDelete = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleCancelDelete = useCallback(() => setDeleteTargetId(null), []);
  const handleConfirmDelete = useCallback((id: string) => {
    // TODO: API — hard delete this note (notes are otherwise immutable, no edit)
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeleteTargetId(null);
  }, []);

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
        <div className="flex items-center gap-3 bg-[var(--dn-header-bg)] p-5 sm:p-6 border-b border-[var(--dn-divider)]">
          <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
            <NotebookPen size={18} className="text-[#458482]" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-start">
            <h2
              id="director-notes-title"
              className="text-sm font-bold uppercase tracking-widest text-[var(--dn-text-main)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.title}
            </h2>
            <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--dn-text-muted)]">
              {copy.subtitle}
            </p>
          </div>
        </div>

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
                  lang={lang as Lang}
                  confirmingDelete={deleteTargetId === note.id}
                  onRequestDelete={handleRequestDelete}
                  onConfirmDelete={handleConfirmDelete}
                  onCancelDelete={handleCancelDelete}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </m.section>
    </LazyMotion>
  );
}

export default memo(DirectorNotes);