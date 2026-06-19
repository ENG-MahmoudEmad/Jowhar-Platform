"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { LazyMotion, domMax, m, AnimatePresence } from "framer-motion";
import { X, Send, CheckCheck, ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LangContext";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
export interface MemberComment {
  id:         string;
  authorId:   string;
  authorName: string;
  text:       string;
  createdAt:  string;
}

export interface DirectorNote {
  id:       string;
  title:    string;
  content:  string;
  color:    string;
  priority: "low" | "medium" | "high";
  isRead:   boolean;
  comments: MemberComment[];
  createdAt:string;
}

/* ─── API stubs ─────────────────────────────────────────────────────────────── */
// GET  /api/director-notes
// POST /api/director-notes/:id/read
// POST /api/director-notes/:id/comments

async function apiMarkRead(id: string): Promise<void> { void id; }

async function apiAddComment(noteId: string, text: string): Promise<MemberComment> {
  void noteId;
  return { id: crypto.randomUUID(), authorId:"current-user", authorName:"KB",
    text, createdAt: new Date().toISOString() };
}

/* ─── Demo seed ─────────────────────────────────────────────────────────────── */
const DEMO: DirectorNote[] = [
  { id:"dn1", title:"Character Rigging Feedback",
    content:"The shoulder deformation needs more weight painting work. Please review the collarbone area — it's collapsing on extreme poses. Reference the approved concept sheets in the shared folder.",
    color:"#458482", priority:"high", isRead:false, comments:[], createdAt:"2026-05-14T10:00:00Z" },
  { id:"dn2", title:"Walk Cycle — Great Progress",
    content:"The timing is much better on the latest version. Just polish the foot plant on frame 12 and we're good to go. Also make sure the secondary motion on the hair is subtle.",
    color:"#5ea8a4", priority:"medium", isRead:true,
    comments:[{ id:"c1", authorId:"current-user", authorName:"KB",
      text:"Understood, will fix the foot plant and reduce the hair secondary motion.",
      createdAt:"2026-05-14T11:30:00Z" }],
    createdAt:"2026-05-13T09:00:00Z" },
  { id:"dn3", title:"Deadline Reminder",
    content:"All deliverables for Phase 1 are due May 23rd EOD. Please upload final files to the shared drive and send a completion report.",
    color:"#f59e0b", priority:"high", isRead:false, comments:[], createdAt:"2026-05-12T08:00:00Z" },
];

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

const PRIORITY = {
  high:   { en:"High",   ar:"عالية",  color:"#ef4444" },
  medium: { en:"Medium", ar:"متوسطة", color:"#f59e0b" },
  low:    { en:"Low",    ar:"منخفضة", color:"#22c55e" },
};

// ─── Module-level constants (zero per-render allocation) ───────────────────────

const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";
const MUTED_TEXT_STYLE: React.CSSProperties = { color: TEXT_MUTED };
const ROW_STYLE: React.CSSProperties = { flexDirection: "row" };
const BACKDROP_STYLE: React.CSSProperties = { background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)" };
const UNREAD_BADGE_STYLE: React.CSSProperties = { background:"#ef4444", color:"#fff" };
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

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    background: active
      ? hexToRgba(note.color, isDark ? 0.18 : 0.10)
      : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    border: active
      ? `1px solid ${hexToRgba(note.color, 0.35)}`
      : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  }), [active, isDark, note.color]);

  const topLineStyle = useMemo<React.CSSProperties>(() => ({
    height:"2px", background:note.color, opacity: active ? 1 : 0.6,
  }), [note.color, active]);

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN, fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit",
  }), [lang]);

  const openBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: hexToRgba(note.color,0.2), color: note.color,
  }), [note.color]);

  const priorityBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: hexToRgba(p.color,0.15), color: p.color,
  }), [p.color]);

  const previewTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit",
  }), [lang]);

  const dateRowStyle = useMemo<React.CSSProperties>(() => ({
    color: hexToRgba(note.color,0.85),
  }), [note.color]);

  return (
    <m.button
      layout
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-8 }}
      whileHover={{ scale:1.012, transition:{ duration:0.15 } }}
      whileTap={{ scale:0.985 }}
      onClick={() => onSelect(note)}
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
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background:note.color }}/>
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
            {note.isRead && <CheckCheck className="w-3.5 h-3.5" style={{ color:note.color }}/>}
          </div>
        </div>
      </div>
    </m.button>
  );
});

/* ─── CommentBubble ──────────────────────────────────────────────────────────── */
const CommentBubble = memo(function CommentBubble({ comment, isDark, accentColor, lang, isRTL }: {
  comment: MemberComment; isDark: boolean;
  accentColor: string; lang: string; isRTL: boolean;
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
        <span className="text-[10px] font-bold" style={{ color:accentColor }}>{comment.authorName}</span>
        <span className="text-[10px]" style={MUTED_TEXT_STYLE}>{fmtTime(comment.createdAt, lang)}</span>
      </div>
      <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed" style={bubbleStyle}>
        {comment.text}
      </div>
    </div>
  );
});

/* ─── Main Component ─────────────────────────────────────────────────────────── */
function DirectorNotes() {
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

  const [notes,           setNotes]          = useState<DirectorNote[]>(DEMO);
  const [selectedNote,    setSelectedNote]   = useState<DirectorNote | null>(null);
  const [panelOpen,       setPanelOpen]      = useState(false);
  const [commentText,     setCommentText]    = useState("");
  const [sending,         setSending]        = useState(false);
  const [showAllComments, setShowAllComments]= useState(false);

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
    alreadyRead:lang==="ar" ? "تمت القراءة ✓"        : "Read ✓",
    markRead:   lang==="ar" ? "تم القراءة ✓"         : "Mark as Read ✓",
    comments:   lang==="ar" ? "التعليقات"            : "Comments",
    addComment: lang==="ar" ? "أضف تعليقاً..."      : "Add a comment...",
    noComments: lang==="ar" ? "لا توجد تعليقات بعد" : "No comments yet",
    showAll:    lang==="ar" ? "عرض الكل"             : "Show all",
    showLess:   lang==="ar" ? "عرض أقل"              : "Show less",
    from:       lang==="ar" ? "من المدير"            : "From Director",
    allNotes:   lang==="ar" ? "كل الملاحظات"         : "All Notes",
  }), [lang]);

  const unreadCount = useMemo(() => notes.filter(n => !n.isRead).length, [notes]);
  const preview      = useMemo(() => notes.slice(0, 3), [notes]);
  const visibleComments = useMemo(() => {
    if (!selectedNote) return [];
    return showAllComments ? selectedNote.comments : selectedNote.comments.slice(-COMMENTS_PREVIEW);
  }, [selectedNote, showAllComments]);

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

  const selectedPriorityBadgeStyle = useMemo<React.CSSProperties>(() => {
    if (!selectedNote) return {};
    const c = PRIORITY[selectedNote.priority].color;
    return { background: hexToRgba(c,0.15), color:c };
  }, [selectedNote]);

  const noteContentBorderStyle = useMemo<React.CSSProperties>(() => (
    selectedNote ? { border:`1px solid ${hexToRgba(selectedNote.color,0.2)}` } : {}
  ), [selectedNote]);

  const noteContentBodyStyle = useMemo<React.CSSProperties>(() => (
    selectedNote ? { background:hexToRgba(selectedNote.color, isDark?0.08:0.05) } : {}
  ), [selectedNote, isDark]);

  const noteClockColorStyle = useMemo<React.CSSProperties>(() => (
    selectedNote ? { color:hexToRgba(selectedNote.color,0.85) } : {}
  ), [selectedNote]);

  const noteContentTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN, fontFamily: lang==="ar"?"var(--font-arabic)":"inherit",
    direction: isRTL ? "rtl" : "ltr",
  }), [lang, isRTL]);

  const markReadColorStyle = useMemo<React.CSSProperties>(() => (
    selectedNote ? { color: selectedNote.isRead ? selectedNote.color : TEXT_MUTED } : {}
  ), [selectedNote]);

  const noCommentsStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, fontFamily: lang==="ar"?"var(--font-arabic)":"inherit",
  }), [lang]);

  const dividerLineStyle = useMemo<React.CSSProperties>(() => ({
    height:"1px", background:divider, margin:"4px 0",
  }), [divider]);

  /* ── Handlers ── */
  const openNote = useCallback(async (note: DirectorNote) => {
    setSelectedNote(note); setPanelOpen(true);
    setCommentText(""); setShowAllComments(false);
    if (!note.isRead) {
      await apiMarkRead(note.id);
      setNotes(prev => prev.map(n => n.id===note.id ? { ...n, isRead:true } : n));
      setSelectedNote(prev => prev ? { ...prev, isRead:true } : prev);
    }
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => { setSelectedNote(null); setCommentText(""); }, 300);
  }, []);

  const handleSendComment = useCallback(async () => {
    if (!selectedNote || !commentText.trim()) return;
    setSending(true);
    try {
      const newComment = await apiAddComment(selectedNote.id, commentText.trim());
      const updated    = { ...selectedNote, comments:[...selectedNote.comments, newComment] };
      setNotes(prev => prev.map(n => n.id===selectedNote.id ? updated : n));
      setSelectedNote(updated); setCommentText("");
    } finally { setSending(false); }
  }, [selectedNote, commentText]);

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
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={UNREAD_BADGE_STYLE}>
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={() => notes.length > 0 && openNote(notes[0])}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
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
            {preview.length === 0 ? (
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
                <div className="flex items-center gap-2" style={ROW_STYLE}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background:selectedNote.color }}
                  />
                  <h3 className="text-sm font-bold" style={titleTextStyle}>
                    {selectedNote.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2" style={ROW_STYLE}>
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
                    <div className="h-[3px] w-full" style={{ background:selectedNote.color }}/>
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
                      <div className="flex items-center gap-1.5 mt-4 text-[11px] font-semibold" style={markReadColorStyle}>
                        <CheckCheck className="w-3.5 h-3.5"/>
                        {selectedNote.isRead ? tx.alreadyRead : tx.markRead}
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
                        <button onClick={() => setShowAllComments(v=>!v)}
                          className="flex items-center gap-1 text-[10px] font-semibold cursor-pointer w-fit"
                          style={{ color:selectedNote.color }}
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
                              accentColor={selectedNote.color}
                              lang={lang} isRTL={isRTL}
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
                    <textarea value={commentText} onChange={e=>setCommentText(e.target.value)}
                      placeholder={tx.addComment} rows={2}
                      onKeyDown={e=>{ if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)) handleSendComment(); }}
                      style={{ flex:1, background:inputBg,
                        border:`1px solid ${commentText?selectedNote.color:inputBorder}`,
                        borderRadius:"12px", padding:"10px 12px", fontSize:"12px",
                        color:TEXT_MAIN, outline:"none", resize:"none",
                        fontFamily:lang==="ar"?"var(--font-arabic)":"inherit",
                        direction:isRTL?"rtl":"ltr", transition:"border-color 0.15s" }}
                    />
                    <button onClick={handleSendComment}
                      disabled={!commentText.trim()||sending}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0"
                      style={{ background:commentText.trim()?selectedNote.color:(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),
                        color:commentText.trim()?"#fff":"var(--foreground-muted)", opacity:sending?0.6:1 }}
                    >
                      {sending
                        ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                        : <Send className="w-3.5 h-3.5" style={{ transform:isRTL?"scaleX(-1)":"none" }}/>}
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