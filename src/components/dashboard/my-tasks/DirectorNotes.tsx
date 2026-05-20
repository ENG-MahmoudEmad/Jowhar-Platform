"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LangContext";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
export interface MemberComment {
  id:        string;
  authorId:  string;
  authorName:string;
  text:      string;
  createdAt: string;
}

export interface DirectorNote {
  id:          string;
  title:       string;
  content:     string;
  color:       string;
  priority:    "low" | "medium" | "high";
  isRead:      boolean;           // has THIS member read it
  comments:    MemberComment[];   // member replies visible to director + member
  createdAt:   string;
}

/* ─── Placeholder API — swap with real fetch calls ──────────────────────────── */
// GET  /api/director-notes          → DirectorNote[]
// POST /api/director-notes/:id/read → { ok: true }          (mark as read)
// POST /api/director-notes/:id/comments → MemberComment     (add comment)

async function apiMarkRead(id: string): Promise<void> {
  // await fetch(`/api/director-notes/${id}/read`, { method: "POST" });
  void id;
}

async function apiAddComment(
  noteId: string,
  text: string,
): Promise<MemberComment> {
  // const res = await fetch(`/api/director-notes/${noteId}/comments`, {
  //   method: "POST", body: JSON.stringify({ text })
  // }); return res.json();
  void noteId;
  return {
    id:         crypto.randomUUID(),
    authorId:   "current-user",
    authorName: "KB",
    text,
    createdAt:  new Date().toISOString(),
  };
}

/* ─── Demo seed ─────────────────────────────────────────────────────────────── */
const DEMO_DIRECTOR_NOTES: DirectorNote[] = [
  {
    id: "dn1",
    title:    "Character Rigging Feedback",
    content:  "The shoulder deformation needs more weight painting work. Please review the collarbone area — it's collapsing on extreme poses. Reference the approved concept sheets in the shared folder.",
    color:    "#458482",
    priority: "high",
    isRead:   false,
    comments: [],
    createdAt:"2026-05-14T10:00:00Z",
  },
  {
    id: "dn2",
    title:    "Walk Cycle — Great Progress",
    content:  "The timing is much better on the latest version. Just polish the foot plant on frame 12 and we're good to go. Also make sure the secondary motion on the hair is subtle.",
    color:    "#5ea8a4",
    priority: "medium",
    isRead:   true,
    comments: [
      {
        id: "c1", authorId: "current-user", authorName: "KB",
        text: "Understood, will fix the foot plant and reduce the hair secondary motion.",
        createdAt: "2026-05-14T11:30:00Z",
      },
    ],
    createdAt:"2026-05-13T09:00:00Z",
  },
  {
    id: "dn3",
    title:    "Deadline Reminder",
    content:  "All deliverables for Phase 1 are due May 23rd EOD. Please upload final files to the shared drive and send a completion report.",
    color:    "#f59e0b",
    priority: "high",
    isRead:   false,
    comments: [],
    createdAt:"2026-05-12T08:00:00Z",
  },
];

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function fmtTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(
    lang === "ar" ? "ar-SA" : "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const PRIORITY_CONFIG = {
  high:   { en: "High",   ar: "عالية",  color: "#ef4444" },
  medium: { en: "Medium", ar: "متوسطة", color: "#f59e0b" },
  low:    { en: "Low",    ar: "منخفضة", color: "#22c55e" },
};

/* ─── NotePreviewCard ────────────────────────────────────────────────────────── */
interface PreviewCardProps {
  note:      DirectorNote;
  isDark:    boolean;
  textMain:  string;
  textMuted: string;
  lang:      string;
  onClick:   () => void;
}

function PreviewCard({ note, isDark, textMain, textMuted, lang, onClick }: PreviewCardProps) {
  const p = PRIORITY_CONFIG[note.priority];
  const unread = !note.isRead;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="w-full text-start rounded-xl p-4 flex flex-col gap-2 transition-all cursor-pointer"
      style={{
        background:  isDark ? hexToRgba(note.color, 0.08) : hexToRgba(note.color, 0.06),
        border:      `1px solid ${hexToRgba(note.color, isDark ? 0.22 : 0.18)}`,
        borderLeft:  `3px solid ${note.color}`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? hexToRgba(note.color, 0.13) : hexToRgba(note.color, 0.10); }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isDark ? hexToRgba(note.color, 0.08) : hexToRgba(note.color, 0.06); }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2" style={{ flexDirection: "row" }}>
        <div className="flex items-center gap-2">
          {/* Unread dot */}
          {unread && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: note.color }} />
          )}
          <span
            className="text-[12px] font-bold leading-tight"
            style={{ color: textMain, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
          >
            {note.title}
          </span>
        </div>

        {/* Priority badge */}
        <span
          className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: hexToRgba(p.color, 0.15), color: p.color }}
        >
          {lang === "ar" ? p.ar : p.en}
        </span>
      </div>

      {/* Content preview */}
      <p
        className="text-[11px] leading-relaxed line-clamp-2 text-start"
        style={{ color: textMuted, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
      >
        {note.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between" style={{ flexDirection: "row" }}>
        <span className="text-[10px]" style={{ color: hexToRgba(note.color, 0.8) }}>
          {fmtDate(note.createdAt, lang)}
        </span>
        <div className="flex items-center gap-2">
          {note.comments.length > 0 && (
            <span className="text-[10px] font-medium" style={{ color: textMuted }}>
              💬 {note.comments.length}
            </span>
          )}
          {note.isRead && (
            <CheckCheck className="w-3.5 h-3.5" style={{ color: note.color }} />
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ─── Comment bubble ─────────────────────────────────────────────────────────── */
function CommentBubble({
  comment, isDark, textMain, textMuted, accentColor, lang, isRTL,
}: {
  comment: MemberComment; isDark: boolean; textMain: string;
  textMuted: string; accentColor: string; lang: string; isRTL: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between" style={{ flexDirection: "row" }}>
        <span className="text-[10px] font-bold" style={{ color: accentColor }}>
          {comment.authorName}
        </span>
        <span className="text-[10px]" style={{ color: textMuted }}>
          {fmtTime(comment.createdAt, lang)}
        </span>
      </div>
      <div
        className="rounded-xl px-3 py-2 text-[11px] leading-relaxed"
        style={{
          background:  isDark ? hexToRgba(accentColor, 0.1) : hexToRgba(accentColor, 0.08),
          border:      `1px solid ${hexToRgba(accentColor, 0.2)}`,
          color:       textMain,
          fontFamily:  lang === "ar" ? "var(--font-arabic)" : "inherit",
          direction:   isRTL ? "rtl" : "ltr",
        }}
      >
        {comment.text}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function DirectorNotes() {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark          = theme === "dark";

  /* ── Palette ── */
  const bg          = isDark ? "var(--card)"           : "#ffffff";
  const border      = isDark ? "var(--card-border)"    : "rgba(0,0,0,0.07)";
  const headerBg    = isDark ? "var(--background-alt)" : "#f5f5ef";
  const divider     = isDark ? "var(--divider)"        : "rgba(0,0,0,0.06)";
  const textMain    = "var(--foreground)";
  const textMuted   = "var(--foreground-muted)";
  const inputBg     = isDark ? "var(--input-bg)"       : "#f9f9f3";
  const inputBorder = isDark ? "var(--input-border)"   : "rgba(0,0,0,0.10)";

  /* ── State ── */
  const [notes,          setNotes]         = useState<DirectorNote[]>(DEMO_DIRECTOR_NOTES);
  const [selectedNote,   setSelectedNote]  = useState<DirectorNote | null>(null);
  const [commentText,    setCommentText]   = useState("");
  const [sending,        setSending]       = useState(false);
  const [showAllComments,setShowAllComments] = useState(false);

  /* ── i18n ── */
  const tx = {
    title:       lang === "ar" ? "ملاحظات المدير"   : "Director Notes",
    open:        lang === "ar" ? "فتح"               : "Open",
    empty:       lang === "ar" ? "لا توجد ملاحظات"  : "No notes yet",
    markRead:    lang === "ar" ? "تم القراءة ✓"      : "Mark as Read ✓",
    alreadyRead: lang === "ar" ? "تمت القراءة ✓"     : "Read ✓",
    comments:    lang === "ar" ? "التعليقات"         : "Comments",
    addComment:  lang === "ar" ? "أضف تعليقاً..."   : "Add a comment...",
    send:        lang === "ar" ? "إرسال"             : "Send",
    noComments:  lang === "ar" ? "لا توجد تعليقات بعد" : "No comments yet",
    showAll:     lang === "ar" ? "عرض الكل"          : "Show all",
    showLess:    lang === "ar" ? "عرض أقل"           : "Show less",
    from:        lang === "ar" ? "من المدير"         : "From Director",
  };

  const unreadCount = notes.filter(n => !n.isRead).length;

  /* ── Handlers ── */
  const openNote = async (note: DirectorNote) => {
    setSelectedNote(note);
    setCommentText("");
    setShowAllComments(false);

    // Mark as read on open if not already
    if (!note.isRead) {
      await apiMarkRead(note.id);
      setNotes(prev =>
        prev.map(n => n.id === note.id ? { ...n, isRead: true } : n),
      );
      setSelectedNote(prev => prev ? { ...prev, isRead: true } : prev);
    }
  };

  const handleSendComment = async () => {
    if (!selectedNote || !commentText.trim()) return;
    setSending(true);
    try {
      const newComment = await apiAddComment(selectedNote.id, commentText.trim());
      const updated: DirectorNote = {
        ...selectedNote,
        comments: [...selectedNote.comments, newComment],
      };
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? updated : n));
      setSelectedNote(updated);
      setCommentText("");
    } finally {
      setSending(false);
    }
  };

  /* Preview = first 3 */
  const preview = notes.slice(0, 3);

  /* Comments visible in modal */
  const COMMENTS_PREVIEW = 2;
  const visibleComments = selectedNote
    ? showAllComments
      ? selectedNote.comments
      : selectedNote.comments.slice(-COMMENTS_PREVIEW)
    : [];

  return (
    <>
      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.36, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: headerBg, borderBottom: `1px solid ${divider}`, flexDirection: "row" }}
        >
          <div className="flex items-center gap-2" style={{ flexDirection: "row" }}>
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: textMain, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
            >
              {tx.title}
            </h2>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          <button
            onClick={() => notes.length > 0 && openNote(notes[0])}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
            style={{ background: "transparent", color: textMuted, border: `1px solid ${divider}` }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--hover-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            {tx.open}
          </button>
        </div>

        {/* Preview body */}
        <div className="flex flex-col gap-3 p-4">
          <AnimatePresence>
            {preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: textMuted }}>
                <span className="text-2xl">📋</span>
                <span className="text-[12px] font-medium" style={{ fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}>
                  {tx.empty}
                </span>
              </div>
            ) : (
              preview.map(note => (
                <PreviewCard
                  key={note.id}
                  note={note}
                  isDark={isDark}
                  textMain={textMain}
                  textMuted={textMuted}
                  lang={lang}
                  onClick={() => openNote(note)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedNote && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNote(null)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.96,    y: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              dir={isRTL ? "rtl" : "ltr"}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ pointerEvents: "none" }}
            >
              <div
                className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background:    bg,
                  border:        `1px solid ${border}`,
                  boxShadow:     "0 24px 64px rgba(0,0,0,0.35)",
                  pointerEvents: "auto",
                  maxHeight:     "90vh",
                }}
              >
                {/* Modal header */}
                <div
                  className="px-5 py-4 flex items-center justify-between shrink-0"
                  style={{ background: headerBg, borderBottom: `1px solid ${divider}`, flexDirection: "row" }}
                >
                  <div className="flex items-center gap-2" style={{ flexDirection: "row" }}>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: selectedNote.color }}
                    />
                    <h3
                      className="text-sm font-bold"
                      style={{ color: textMain, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
                    >
                      {selectedNote.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2" style={{ flexDirection: "row" }}>
                    {/* Priority */}
                    <span
                      className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: hexToRgba(PRIORITY_CONFIG[selectedNote.priority].color, 0.15),
                        color:      PRIORITY_CONFIG[selectedNote.priority].color,
                      }}
                    >
                      {lang === "ar"
                        ? PRIORITY_CONFIG[selectedNote.priority].ar
                        : PRIORITY_CONFIG[selectedNote.priority].en}
                    </span>
                    <button
                      onClick={() => setSelectedNote(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      style={{ color: textMuted }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--hover-bg)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto custom-scrollbar flex flex-col gap-0" style={{ flex: 1 }}>

                  {/* Note content — READ ONLY */}
                  <div className="p-5 flex flex-col gap-4">
                    {/* Meta */}
                    <div className="flex items-center justify-between" style={{ flexDirection: "row" }}>
                      <span className="text-[10px] font-semibold" style={{ color: textMuted }}>
                        🎬 {tx.from}
                      </span>
                      <span className="text-[10px]" style={{ color: textMuted }}>
                        {fmtDate(selectedNote.createdAt, lang)}
                      </span>
                    </div>

                    {/* Content */}
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{
                        color:      textMain,
                        fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
                        direction:  isRTL ? "rtl" : "ltr",
                      }}
                    >
                      {selectedNote.content}
                    </p>

                    {/* Read status */}
                    <div
                      className="flex items-center gap-1.5 text-[11px] font-semibold"
                      style={{ color: selectedNote.isRead ? selectedNote.color : textMuted }}
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      {selectedNote.isRead ? tx.alreadyRead : tx.markRead}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: "1px", background: divider, margin: "0 20px" }} />

                  {/* Comments section */}
                  <div className="p-5 flex flex-col gap-4">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: textMuted }}
                    >
                      {tx.comments} ({selectedNote.comments.length})
                    </span>

                    {/* Comments list */}
                    {selectedNote.comments.length === 0 ? (
                      <p className="text-[11px]" style={{ color: textMuted, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}>
                        {tx.noComments}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Show all / less toggle */}
                        {selectedNote.comments.length > COMMENTS_PREVIEW && (
                          <button
                            onClick={() => setShowAllComments(v => !v)}
                            className="flex items-center gap-1 text-[10px] font-semibold cursor-pointer w-fit"
                            style={{ color: selectedNote.color }}
                          >
                            {showAllComments ? (
                              <><ChevronUp className="w-3 h-3" />{tx.showLess}</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" />{tx.showAll} ({selectedNote.comments.length})</>
                            )}
                          </button>
                        )}

                        <AnimatePresence>
                          {visibleComments.map(c => (
                            <motion.div
                              key={c.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                            >
                              <CommentBubble
                                comment={c}
                                isDark={isDark}
                                textMain={textMain}
                                textMuted={textMuted}
                                accentColor={selectedNote.color}
                                lang={lang}
                                isRTL={isRTL}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Comment input */}
                    <div
                      className="flex items-end gap-2 mt-1"
                      style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
                    >
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder={tx.addComment}
                        rows={2}
                        onKeyDown={e => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSendComment();
                        }}
                        style={{
                          flex:        1,
                          background:  inputBg,
                          border:      `1px solid ${commentText ? selectedNote.color : inputBorder}`,
                          borderRadius:"12px",
                          padding:     "10px 12px",
                          fontSize:    "12px",
                          color:       textMain,
                          outline:     "none",
                          resize:      "none",
                          fontFamily:  lang === "ar" ? "var(--font-arabic)" : "inherit",
                          direction:   isRTL ? "rtl" : "ltr",
                          transition:  "border-color 0.15s",
                        }}
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!commentText.trim() || sending}
                        className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0"
                        style={{
                          background: commentText.trim() ? selectedNote.color : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                          color:      commentText.trim() ? "#fff" : textMuted,
                          opacity:    sending ? 0.6 : 1,
                        }}
                      >
                        {sending ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" style={{ transform: isRTL ? "scaleX(-1)" : "none" }} />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px]" style={{ color: textMuted }}>
                      {lang === "ar" ? "Ctrl+Enter للإرسال" : "Ctrl+Enter to send"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
