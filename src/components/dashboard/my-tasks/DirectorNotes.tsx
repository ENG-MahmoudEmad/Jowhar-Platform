// src/components/dashboard/my-tasks/DirectorNotes.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { LazyMotion, domMax, m, AnimatePresence } from "framer-motion";
import { X, Send, CheckCheck, ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LangContext";
import type {
  MemberCommentDTO,
  MemberDirectorNoteDTO,
} from "@/app/(dashboard)/my-tasks/notesActions";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
export type MemberComment = MemberCommentDTO;
export type DirectorNote = MemberDirectorNoteDTO;

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang==="ar"?"ar-SA":"en-US",
    { day:"numeric", month:"short", year:"numeric" });
}
function fmtTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang==="ar"?"ar-SA":"en-US",
    { hour:"2-digit", minute:"2-digit" });
}
function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/*
  اللون مشتق من الأولوية مش مخزّن بالداتابيز — نفس القيم بكارد الأدمن
  بالضبط، فما في لون بيتناقض مع الأولوية.
*/
const PRIORITY = {
  high:   { en:"High",   ar:"عالية",  color:"#ef4444" },
  medium: { en:"Medium", ar:"متوسطة", color:"#e0a740" },
  low:    { en:"Low",    ar:"منخفضة", color:"#22c55e" },
};

function noteColorOf(note: DirectorNote): string {
  return PRIORITY[note.priority].color;
}

// ─── Module-level constants (zero per-render allocation) ───────────────────────

const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";
const MUTED_TEXT_STYLE: React.CSSProperties = { color: TEXT_MUTED };
const ROW_STYLE: React.CSSProperties = { flexDirection: "row" };
const BACKDROP_STYLE: React.CSSProperties = { background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)" };
const UNREAD_BADGE_STYLE: React.CSSProperties = { background:"#ef4444", color:"#fff" };
const UNREAD_DOT_STYLE: React.CSSProperties = { background:"#ef4444" };
const COMMENTS_PREVIEW = 2;

// Shared static hover handlers — identical "var(--hover-bg)" / "transparent" pair, zero closures
function handleHoverBgEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = "var(--hover-bg)";
}
function handleHoverBgLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = "transparent";
}

/* ─── PreviewCard ────────────────────────────────────────────────────────────── */
const PreviewCard = memo(function PreviewCard({ note, active, isDark, lang, onSelect }: {
  note: DirectorNote; active: boolean; isDark: boolean;
  lang: string; onSelect: (note: DirectorNote) => void;
}) {
  const p = PRIORITY[note.priority];
  const color = p.color;

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    background: active
      ? hexToRgba(color, isDark ? 0.18 : 0.10)
      : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    border: active
      ? `1px solid ${hexToRgba(color, 0.35)}`
      : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  }), [active, isDark, color]);

  const topLineStyle = useMemo<React.CSSProperties>(() => ({
    height:"2px", background:color, opacity: active ? 1 : 0.6,
  }), [color, active]);

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN, fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit",
  }), [lang]);

  const openBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: hexToRgba(color,0.2), color,
  }), [color]);

  const priorityBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: hexToRgba(color,0.15), color,
  }), [color]);

  const previewTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit",
  }), [lang]);

  const dateRowStyle = useMemo<React.CSSProperties>(() => ({
    color: hexToRgba(color,0.85),
  }), [color]);

  const handleClick = useCallback(() => onSelect(note), [onSelect, note]);

  return (
    <m.button
      layout
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-8 }}
      whileHover={{ scale:1.012, transition:{ duration:0.15 } }}
      whileTap={{ scale:0.985 }}
      onClick={handleClick}
      className="relative w-full overflow-hidden rounded-2xl p-4.5 text-start block cursor-pointer"
      style={containerStyle}
    >
      {/* Coloured top line */}
      <div className="absolute top-0 left-0 right-0" style={topLineStyle} />

      <div className="flex flex-col gap-2">
        {/* Title + priority + unread dot */}
        <div className="flex items-center justify-between gap-2" style={ROW_STYLE}>
          <div className="flex items-center gap-2 min-w-0">
            {!note.isRead && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={UNREAD_DOT_STYLE}
                aria-label={lang==="ar" ? "غير مقروءة" : "Unread"}
              />
            )}
            <span className="text-[13px] font-semibold leading-tight truncate" style={titleStyle}>
              {note.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {active && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={openBadgeStyle}>
                {lang==="ar" ? "مفتوحة" : "open"}
              </span>
            )}
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={priorityBadgeStyle}>
              {lang==="ar" ? p.ar : p.en}
            </span>
          </div>
        </div>

        {/* Preview */}
        <p className="text-[11px] leading-relaxed line-clamp-2 text-start" style={previewTextStyle}>
          {note.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between" style={ROW_STYLE}>
          <div className="flex items-center gap-1.5" style={dateRowStyle}>
            <Clock3 className="w-3 h-3 shrink-0"/>
            <span className="text-[10px] font-medium">{fmtDate(note.createdAt, lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            {note.comments.length > 0 && (
              <span className="text-[10px] font-medium" style={MUTED_TEXT_STYLE}>
                💬 {note.comments.length}
              </span>
            )}
            {note.isRead && <CheckCheck className="w-3.5 h-3.5" style={{ color }}/>}
          </div>
        </div>
      </div>
    </m.button>
  );
});

/* ─── CommentBubble ──────────────────────────────────────────────────────────── */
const CommentBubble = memo(function CommentBubble({ comment, isDark, accentColor, lang, isRTL, youLabel }: {
  comment: MemberComment; isDark: boolean;
  accentColor: string; lang: string; isRTL: boolean; youLabel: string;
}) {
  const bubbleStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? hexToRgba(accentColor,0.1) : hexToRgba(accentColor,0.08),
    border:`1px solid ${hexToRgba(accentColor,0.2)}`, color: TEXT_MAIN,
    fontFamily: lang==="ar"?"var(--font-arabic)":"inherit",
    direction: isRTL ? "rtl" : "ltr",
  }), [isDark, accentColor, lang, isRTL]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between" style={ROW_STYLE}>
        {/* اسم فاضي من السيرفر = تعليقك إنت */}
        <span className="text-[10px] font-bold" style={{ color:accentColor }}>
          {comment.authorName || youLabel}
        </span>
        <span className="text-[10px]" style={MUTED_TEXT_STYLE}>{fmtTime(comment.createdAt, lang)}</span>
      </div>
      <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed" style={bubbleStyle}>
        {comment.text}
      </div>
    </div>
  );
});

/* ─── Main Component ─────────────────────────────────────────────────────────── */
function DirectorNotes({
  notes,
  loading = false,
  onMarkRead,
  onAddComment,
}: {
  notes: DirectorNote[];
  loading?: boolean;
  /** فتح الملاحظة هو اللي بيعلّمها مقروءة — ما في زر منفصل. */
  onMarkRead: (noteId: string) => void;
  onAddComment: (noteId: string, text: string) => void;
}) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark          = theme === "dark";

  const bg          = isDark ? "var(--card)"           : "#ffffff";
  const border      = isDark ? "var(--card-border)"    : "rgba(0,0,0,0.07)";
  const headerBg    = isDark ? "var(--background-alt)" : "#f5f5ef";
  const divider     = isDark ? "var(--divider)"        : "rgba(0,0,0,0.06)";
  const panelBg     = isDark ? "var(--background-alt)" : "#fafaf6";
  const inputBg     = isDark ? "var(--input-bg)"       : "#f9f9f3";
  const inputBorder = isDark ? "var(--input-border)"   : "rgba(0,0,0,0.10)";

  const [selectedId,      setSelectedId]     = useState<string | null>(null);
  const [panelOpen,       setPanelOpen]      = useState(false);
  const [commentText,     setCommentText]    = useState("");
  const [showAllComments, setShowAllComments]= useState(false);

  /* The panel renders from `notes` via the selected id rather than holding its own
     copy of the note. Keeping a duplicate in state was the source of a stale-copy
     bug: an async read/comment update could write back to whichever note happened
     to be selected at the time the request resolved. */
  const selectedNote = useMemo(
    () => notes.find(n => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  /* ── Detect mobile ── */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const tx = useMemo(() => ({
    title:      lang==="ar" ? "ملاحظات المدير"      : "Director Notes",
    open:       lang==="ar" ? "فتح"                  : "Open",
    empty:      lang==="ar" ? "لا توجد ملاحظات"     : "No notes yet",
    loading:    lang==="ar" ? "جارٍ التحميل"        : "Loading...",
    readAt:     lang==="ar" ? "تمت القراءة"          : "Read",
    marking:    lang==="ar" ? "جارٍ التعليم كمقروءة" : "Marking as read",
    comments:   lang==="ar" ? "التعليقات"            : "Comments",
    addComment: lang==="ar" ? "أضف تعليقاً..."      : "Add a comment...",
    noComments: lang==="ar" ? "لا توجد تعليقات بعد" : "No comments yet",
    showAll:    lang==="ar" ? "عرض الكل"             : "Show all",
    showLess:   lang==="ar" ? "عرض أقل"              : "Show less",
    from:       lang==="ar" ? "من المدير"            : "From Director",
    allNotes:   lang==="ar" ? "كل الملاحظات"         : "All Notes",
    unread:     lang==="ar" ? "ملاحظات غير مقروءة"  : "unread notes",
    you:        lang==="ar" ? "أنت"                  : "You",
  }), [lang]);

  const unreadCount = useMemo(() => notes.filter(n => !n.isRead).length, [notes]);
  const preview      = useMemo(() => notes.slice(0, 3), [notes]);
  const visibleComments = useMemo(() => {
    if (!selectedNote) return [];
    return showAllComments ? selectedNote.comments : selectedNote.comments.slice(-COMMENTS_PREVIEW);
  }, [selectedNote, showAllComments]);

  const selectedColor = selectedNote ? noteColorOf(selectedNote) : "#458482";

  /* ── Composite dynamic styles (memoized so unrelated re-renders — e.g. typing — don't recompute them) ── */
  const headerRowStyle = useMemo<React.CSSProperties>(() => ({
    background:headerBg, borderBottom:`1px solid ${divider}`, flexDirection:"row",
  }), [headerBg, divider]);

  const titleTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN, fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit",
  }), [lang]);

  const panelStyle = useMemo<React.CSSProperties>(() => (
    isMobile ? {
      background:panelBg, borderTop:`1px solid ${border}`,
      maxHeight:"85vh", touchAction:"none",
    } : {
      [isRTL?"left":"right"]:0, background:panelBg,
      borderLeft:  isRTL?"none":`1px solid ${border}`,
      borderRight: isRTL?`1px solid ${border}`:"none",
    }
  ), [isMobile, panelBg, border, isRTL]);

  const selectedPriorityBadgeStyle = useMemo<React.CSSProperties>(() => (
    { background: hexToRgba(selectedColor,0.15), color:selectedColor }
  ), [selectedColor]);

  const noteContentBorderStyle = useMemo<React.CSSProperties>(() => (
    { border:`1px solid ${hexToRgba(selectedColor,0.2)}` }
  ), [selectedColor]);

  const noteContentBodyStyle = useMemo<React.CSSProperties>(() => (
    { background:hexToRgba(selectedColor, isDark?0.08:0.05) }
  ), [selectedColor, isDark]);

  const noteClockColorStyle = useMemo<React.CSSProperties>(() => (
    { color:hexToRgba(selectedColor,0.85) }
  ), [selectedColor]);

  const noteContentTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN, fontFamily: lang==="ar"?"var(--font-arabic)":"inherit",
    direction: isRTL ? "rtl" : "ltr",
  }), [lang, isRTL]);

  const readStatusStyle = useMemo<React.CSSProperties>(() => (
    selectedNote ? { color: selectedNote.isRead ? selectedColor : TEXT_MUTED } : {}
  ), [selectedNote, selectedColor]);

  const noCommentsStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, fontFamily: lang==="ar"?"var(--font-arabic)":"inherit",
  }), [lang]);

  const dividerLineStyle = useMemo<React.CSSProperties>(() => ({
    height:"1px", background:divider, margin:"4px 0",
  }), [divider]);

  /* ── Handlers ── */

  /**
   * Opening a note is what marks it read — there is no separate button, since the
   * note is shown in a dedicated panel and opening it is unambiguous.
   * التحديث المتفائل بيصير بالأب، فالبادچ بينزل فورًا وبيتراجع لو فشل.
   */
  const openNote = useCallback((note: DirectorNote) => {
    setSelectedId(note.id);
    setPanelOpen(true);
    setCommentText("");
    setShowAllComments(false);

    if (!note.isRead) onMarkRead(note.id);
  }, [onMarkRead]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => { setSelectedId(null); setCommentText(""); }, 300);
  }, []);

  /*
    إشعار الرد/الملاحظة بيودّي لـ `/my-tasks#note-<id>`. الملاحظة مخبّية
    وراء اللوحة (الكارد المطوي بيعرض آخر 3 بس)، فسكرول لصف معاينة مش
    كافي — ممكن العنصر أصلاً مش ظاهر. الحل الصحيح: نفتح اللوحة على
    الملاحظة المقصودة مباشرة، بنفس مسار `openNote` العادي.

    `openedFromHashRef` بيمنع إعادة الفتح لو المستخدم سكّر اللوحة يدويًا
    بعدها — بدون الحارس، أي إعادة رندر للأب (تحديث حالة تانية) كانت
    رح تفتحها من جديد.
  */
  const openedFromHashRef = useRef(false);
  useEffect(() => {
    if (openedFromHashRef.current) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash.startsWith('note-')) return;

    const noteId = hash.slice('note-'.length);
    const target = notes.find((n) => n.id === noteId);
    if (!target) return; // إشعار لملاحظة انحذفت لاحقًا — safe no-op

    openedFromHashRef.current = true;
    openNote(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const handleSendComment = useCallback(() => {
    if (!selectedNote || !commentText.trim()) return;
    onAddComment(selectedNote.id, commentText.trim());
    setCommentText("");
  }, [selectedNote, commentText, onAddComment]);

  const handleOpenFirst = useCallback(() => {
    if (notes.length > 0) openNote(notes[0]);
  }, [notes, openNote]);

  const handleToggleComments = useCallback(() => setShowAllComments(v => !v), []);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
  }, []);

  return (
    <LazyMotion features={domMax}>
      {/* ── Collapsed card ── */}
      <div dir={isRTL?"rtl":"ltr"}
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ background:bg, border:`1px solid ${border}` }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={headerRowStyle}>
          <div className="flex items-center gap-2" style={ROW_STYLE}>
            <h2 className="text-sm font-bold uppercase tracking-widest" style={titleTextStyle}>
              {tx.title}
            </h2>
            {unreadCount > 0 && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={UNREAD_BADGE_STYLE}
                aria-label={`${unreadCount} ${tx.unread}`}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={handleOpenFirst}
            disabled={notes.length === 0}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background:"transparent", color:"var(--foreground-muted)", border:`1px solid ${divider}` }}
            onMouseEnter={handleHoverBgEnter}
            onMouseLeave={handleHoverBgLeave}
          >
            {tx.open}
          </button>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-2 p-3">
          <AnimatePresence>
            {loading ? (
              <div className="flex items-center justify-center py-8" style={MUTED_TEXT_STYLE}>
                <span className="text-[12px] font-medium"
                  style={{ fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
                >
                  {tx.loading}
                </span>
              </div>
            ) : preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2" style={MUTED_TEXT_STYLE}>
                <span className="text-2xl">📋</span>
                <span className="text-[12px] font-medium"
                  style={{ fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
                >
                  {tx.empty}
                </span>
              </div>
            ) : (
              preview.map(note => (
                <PreviewCard key={note.id} note={note}
                  active={false} isDark={isDark} lang={lang}
                  onSelect={openNote}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Panel ── */}
      <AnimatePresence>
        {panelOpen && selectedNote && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={closePanel}
              className="fixed inset-0 z-40"
              style={BACKDROP_STYLE}
            />

            {/* Panel — side on desktop, bottom sheet on mobile */}
            <m.div
              initial={isMobile ? { y:"100%" } : { x:isRTL?"-100%":"100%", opacity:0 }}
              animate={isMobile ? { y:"0%" }   : { x:"0%", opacity:1 }}
              exit={isMobile    ? { y:"100%" } : { x:isRTL?"-100%":"100%", opacity:0 }}
              transition={{ type:"spring", damping:32, stiffness:280 }}
              drag={isMobile ? "y" : false}
              dragConstraints={isMobile ? { top:0, bottom:0 } : undefined}
              dragElastic={{ top:0, bottom:0.4 }}
              onDragEnd={(_e, info) => { if (isMobile && info.offset.y > 100) closePanel(); }}
              dir={isRTL?"rtl":"ltr"}
              className={isMobile
                ? "fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
                : "fixed top-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col"}
              style={panelStyle}
            >
              {/* Drag handle — mobile only */}
              {isMobile && (
                <div className="flex justify-center pt-3 pb-2 shrink-0"
                  style={{ cursor:"grab", touchAction:"none" }}
                >
                  <div className="w-10 h-1 rounded-full"
                    style={{ background:isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.15)" }}
                  />
                </div>
              )}

              {/* Panel header */}
              <div className="px-5 py-4 flex items-center justify-between shrink-0" style={headerRowStyle}>
                <div className="flex items-center gap-2 min-w-0" style={ROW_STYLE}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background:selectedColor }}
                  />
                  <h3 className="text-sm font-bold truncate" style={titleTextStyle}>
                    {selectedNote.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0" style={ROW_STYLE}>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={selectedPriorityBadgeStyle}
                  >
                    {lang==="ar" ? PRIORITY[selectedNote.priority].ar : PRIORITY[selectedNote.priority].en}
                  </span>
                  <button onClick={closePanel}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                    style={{ color:"var(--foreground-muted)" }}
                    onMouseEnter={handleHoverBgEnter}
                    onMouseLeave={handleHoverBgLeave}
                  >
                    <X className="w-4 h-4"/>
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto custom-scrollbar flex flex-col" style={{ flex:1 }}>

                {/* Note content */}
                <div className="p-5" style={{ borderBottom:`1px solid ${divider}` }}>
                  <div className="rounded-2xl overflow-hidden" style={noteContentBorderStyle}>
                    <div className="h-[3px] w-full" style={{ background:selectedColor }}/>
                    <div className="p-5" style={noteContentBodyStyle}>
                      <div className="flex items-center justify-between mb-4" style={ROW_STYLE}>
                        <span className="text-[10px] font-semibold" style={MUTED_TEXT_STYLE}>
                          🎬 {tx.from}
                        </span>
                        <div className="flex items-center gap-1.5" style={noteClockColorStyle}>
                          <Clock3 className="w-3 h-3"/>
                          <span className="text-[10px] font-medium">
                            {fmtDate(selectedNote.createdAt, lang)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[13px] leading-[1.9]" style={noteContentTextStyle}>
                        {selectedNote.content}
                      </p>

                      {/* Read receipt — status, not an action. Opening the note is
                          what marks it read, so this only ever reports state. */}
                      <div className="flex items-center gap-1.5 mt-4 text-[11px] font-semibold" style={readStatusStyle}>
                        <CheckCheck className="w-3.5 h-3.5"/>
                        {selectedNote.isRead && selectedNote.readAt
                          ? `${tx.readAt} · ${fmtDate(selectedNote.readAt, lang)} ${fmtTime(selectedNote.readAt, lang)}`
                          : tx.marking}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="p-5 flex flex-col gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={MUTED_TEXT_STYLE}>
                    {tx.comments} ({selectedNote.comments.length})
                  </span>

                  {selectedNote.comments.length === 0 ? (
                    <p className="text-[11px]" style={noCommentsStyle}>
                      {tx.noComments}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {selectedNote.comments.length > COMMENTS_PREVIEW && (
                        <button onClick={handleToggleComments}
                          className="flex items-center gap-1 text-[10px] font-semibold cursor-pointer w-fit"
                          style={{ color:selectedColor }}
                        >
                          {showAllComments
                            ? <><ChevronUp className="w-3 h-3"/>{tx.showLess}</>
                            : <><ChevronDown className="w-3 h-3"/>{tx.showAll} ({selectedNote.comments.length})</>}
                        </button>
                      )}
                      <AnimatePresence>
                        {visibleComments.map(c => (
                          <m.div key={c.id}
                            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                          >
                            <CommentBubble comment={c} isDark={isDark}
                              accentColor={selectedColor}
                              lang={lang} isRTL={isRTL} youLabel={tx.you}
                            />
                          </m.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Comment input */}
                  <div className="flex items-end gap-2"
                    style={{ flexDirection:isRTL?"row-reverse":"row" }}
                  >
                    <textarea value={commentText} onChange={handleCommentChange}
                      placeholder={tx.addComment} rows={2}
                      onKeyDown={e=>{ if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)) handleSendComment(); }}
                      style={{ flex:1, background:inputBg,
                        border:`1px solid ${commentText?selectedColor:inputBorder}`,
                        borderRadius:"12px", padding:"10px 12px", fontSize:"12px",
                        color:TEXT_MAIN, outline:"none", resize:"none",
                        fontFamily:lang==="ar"?"var(--font-arabic)":"inherit",
                        direction:isRTL?"rtl":"ltr", transition:"border-color 0.15s" }}
                    />
                    <button onClick={handleSendComment}
                      disabled={!commentText.trim()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 disabled:cursor-not-allowed"
                      style={{ background:commentText.trim()?selectedColor:(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),
                        color:commentText.trim()?"#fff":"var(--foreground-muted)" }}
                    >
                      <Send className="w-3.5 h-3.5" style={{ transform:isRTL?"scaleX(-1)":"none" }}/>
                    </button>
                  </div>
                  <p className="text-[10px]" style={MUTED_TEXT_STYLE}>
                    {lang==="ar" ? "Ctrl+Enter للإرسال" : "Ctrl+Enter to send"}
                  </p>

                  {/* All notes list */}
                  <div style={dividerLineStyle}/>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={MUTED_TEXT_STYLE}>
                    {tx.allNotes} ({notes.length})
                  </span>
                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {notes.map(note => (
                        <PreviewCard key={note.id} note={note}
                          active={selectedNote.id===note.id} isDark={isDark} lang={lang}
                          onSelect={openNote}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

export default memo(DirectorNotes);