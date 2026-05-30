"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

/* ─── PreviewCard ────────────────────────────────────────────────────────────── */
function PreviewCard({ note, active, isDark, textMain, textMuted, lang, onClick }: {
  note: DirectorNote; active: boolean; isDark: boolean;
  textMain: string; textMuted: string; lang: string; onClick: () => void;
}) {
  const p = PRIORITY[note.priority];
  return (
    <motion.button
      layout
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-8 }}
      whileHover={{ scale:1.012, transition:{ duration:0.15 } }}
      whileTap={{ scale:0.985 }}
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-2xl p-4.5 text-start block cursor-pointer"
      style={{
        background: active
          ? hexToRgba(note.color, isDark ? 0.18 : 0.10)
          : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: active
          ? `1px solid ${hexToRgba(note.color, 0.35)}`
          : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
    >
      {/* Coloured top line */}
      <div className="absolute top-0 left-0 right-0"
        style={{ height:"2px", background:note.color, opacity: active ? 1 : 0.6 }}
      />

      <div className="flex flex-col gap-2">
        {/* Title + priority + unread dot */}
        <div className="flex items-center justify-between gap-2" style={{ flexDirection:"row" }}>
          <div className="flex items-center gap-2 min-w-0">
            {!note.isRead && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background:note.color }}/>
            )}
            <span className="text-[13px] font-semibold leading-tight truncate"
              style={{ color:textMain, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
            >
              {note.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {active && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background:hexToRgba(note.color,0.2), color:note.color }}
              >
                {lang==="ar" ? "مفتوحة" : "open"}
              </span>
            )}
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background:hexToRgba(p.color,0.15), color:p.color }}
            >
              {lang==="ar" ? p.ar : p.en}
            </span>
          </div>
        </div>

        {/* Preview */}
        <p className="text-[11px] leading-relaxed line-clamp-2 text-start"
          style={{ color:textMuted, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
        >
          {note.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ flexDirection:"row" }}>
          <div className="flex items-center gap-1.5" style={{ color:hexToRgba(note.color,0.85) }}>
            <Clock3 className="w-3 h-3 shrink-0"/>
            <span className="text-[10px] font-medium">{fmtDate(note.createdAt, lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            {note.comments.length > 0 && (
              <span className="text-[10px] font-medium" style={{ color:textMuted }}>
                💬 {note.comments.length}
              </span>
            )}
            {note.isRead && <CheckCheck className="w-3.5 h-3.5" style={{ color:note.color }}/>}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ─── CommentBubble ──────────────────────────────────────────────────────────── */
function CommentBubble({ comment, isDark, textMain, textMuted, accentColor, lang, isRTL }: {
  comment: MemberComment; isDark: boolean; textMain: string;
  textMuted: string; accentColor: string; lang: string; isRTL: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between" style={{ flexDirection:"row" }}>
        <span className="text-[10px] font-bold" style={{ color:accentColor }}>{comment.authorName}</span>
        <span className="text-[10px]" style={{ color:textMuted }}>{fmtTime(comment.createdAt, lang)}</span>
      </div>
      <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed"
        style={{ background: isDark?hexToRgba(accentColor,0.1):hexToRgba(accentColor,0.08),
          border:`1px solid ${hexToRgba(accentColor,0.2)}`, color:textMain,
          fontFamily:lang==="ar"?"var(--font-arabic)":"inherit", direction:isRTL?"rtl":"ltr" }}
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

  const bg          = isDark ? "var(--card)"           : "#ffffff";
  const border      = isDark ? "var(--card-border)"    : "rgba(0,0,0,0.07)";
  const headerBg    = isDark ? "var(--background-alt)" : "#f5f5ef";
  const divider     = isDark ? "var(--divider)"        : "rgba(0,0,0,0.06)";
  const panelBg     = isDark ? "var(--background-alt)" : "#fafaf6";
  const textMain    = "var(--foreground)";
  const textMuted   = "var(--foreground-muted)";
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

  const tx = {
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
  };

  const unreadCount = notes.filter(n => !n.isRead).length;
  const COMMENTS_PREVIEW = 2;
  const visibleComments  = selectedNote
    ? (showAllComments ? selectedNote.comments : selectedNote.comments.slice(-COMMENTS_PREVIEW))
    : [];

  /* ── Handlers ── */
  const openNote = async (note: DirectorNote) => {
    setSelectedNote(note); setPanelOpen(true);
    setCommentText(""); setShowAllComments(false);
    if (!note.isRead) {
      await apiMarkRead(note.id);
      setNotes(prev => prev.map(n => n.id===note.id ? { ...n, isRead:true } : n));
      setSelectedNote(prev => prev ? { ...prev, isRead:true } : prev);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => { setSelectedNote(null); setCommentText(""); }, 300);
  };

  const handleSendComment = async () => {
    if (!selectedNote || !commentText.trim()) return;
    setSending(true);
    try {
      const newComment = await apiAddComment(selectedNote.id, commentText.trim());
      const updated    = { ...selectedNote, comments:[...selectedNote.comments, newComment] };
      setNotes(prev => prev.map(n => n.id===selectedNote.id ? updated : n));
      setSelectedNote(updated); setCommentText("");
    } finally { setSending(false); }
  };

  const preview = notes.slice(0, 3);

  return (
    <>
      {/* ── Collapsed card ── */}
      <div dir={isRTL?"rtl":"ltr"}
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ background:bg, border:`1px solid ${border}` }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ background:headerBg, borderBottom:`1px solid ${divider}`, flexDirection:"row" }}
        >
          <div className="flex items-center gap-2" style={{ flexDirection:"row" }}>
            <h2 className="text-sm font-bold uppercase tracking-widest"
              style={{ color:textMain, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
            >
              {tx.title}
            </h2>
            {unreadCount > 0 && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background:"#ef4444", color:"#fff" }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={() => notes.length > 0 && openNote(notes[0])}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
            style={{ background:"transparent", color:textMuted, border:`1px solid ${divider}` }}
            onMouseEnter={e=>{ e.currentTarget.style.background="var(--hover-bg)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
          >
            {tx.open}
          </button>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-2 p-3">
          <AnimatePresence>
            {preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color:textMuted }}>
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
                  active={false} isDark={isDark}
                  textMain={textMain} textMuted={textMuted} lang={lang}
                  onClick={() => openNote(note)}
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
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={closePanel}
              className="fixed inset-0 z-40"
              style={{ background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)" }}
            />

            {/* Panel — side on desktop, bottom sheet on mobile */}
            <motion.div
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
              style={isMobile ? {
                background:panelBg, borderTop:`1px solid ${border}`,
                maxHeight:"85vh", touchAction:"none",
              } : {
                [isRTL?"left":"right"]:0, background:panelBg,
                borderLeft:  isRTL?"none":`1px solid ${border}`,
                borderRight: isRTL?`1px solid ${border}`:"none",
              }}
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
              <div className="px-5 py-4 flex items-center justify-between shrink-0"
                style={{ background:headerBg, borderBottom:`1px solid ${divider}`, flexDirection:"row" }}
              >
                <div className="flex items-center gap-2" style={{ flexDirection:"row" }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background:selectedNote.color }}
                  />
                  <h3 className="text-sm font-bold"
                    style={{ color:textMain, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
                  >
                    {selectedNote.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2" style={{ flexDirection:"row" }}>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background:hexToRgba(PRIORITY[selectedNote.priority].color,0.15),
                      color:PRIORITY[selectedNote.priority].color }}
                  >
                    {lang==="ar" ? PRIORITY[selectedNote.priority].ar : PRIORITY[selectedNote.priority].en}
                  </span>
                  <button onClick={closePanel}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                    style={{ color:textMuted }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="var(--hover-bg)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
                  >
                    <X className="w-4 h-4"/>
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto custom-scrollbar flex flex-col" style={{ flex:1 }}>

                {/* Note content */}
                <div className="p-5" style={{ borderBottom:`1px solid ${divider}` }}>
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border:`1px solid ${hexToRgba(selectedNote.color,0.2)}` }}
                  >
                    <div className="h-[3px] w-full" style={{ background:selectedNote.color }}/>
                    <div className="p-5" style={{ background:hexToRgba(selectedNote.color, isDark?0.08:0.05) }}>
                      <div className="flex items-center justify-between mb-4" style={{ flexDirection:"row" }}>
                        <span className="text-[10px] font-semibold" style={{ color:textMuted }}>
                          🎬 {tx.from}
                        </span>
                        <div className="flex items-center gap-1.5"
                          style={{ color:hexToRgba(selectedNote.color,0.85) }}
                        >
                          <Clock3 className="w-3 h-3"/>
                          <span className="text-[10px] font-medium">
                            {fmtDate(selectedNote.createdAt, lang)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[13px] leading-[1.9]"
                        style={{ color:textMain,
                          fontFamily:lang==="ar"?"var(--font-arabic)":"inherit",
                          direction:isRTL?"rtl":"ltr" }}
                      >
                        {selectedNote.content}
                      </p>
                      <div className="flex items-center gap-1.5 mt-4 text-[11px] font-semibold"
                        style={{ color:selectedNote.isRead?selectedNote.color:textMuted }}
                      >
                        <CheckCheck className="w-3.5 h-3.5"/>
                        {selectedNote.isRead ? tx.alreadyRead : tx.markRead}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="p-5 flex flex-col gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:textMuted }}>
                    {tx.comments} ({selectedNote.comments.length})
                  </span>

                  {selectedNote.comments.length === 0 ? (
                    <p className="text-[11px]"
                      style={{ color:textMuted, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
                    >
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
                          <motion.div key={c.id}
                            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                          >
                            <CommentBubble comment={c} isDark={isDark} textMain={textMain}
                              textMuted={textMuted} accentColor={selectedNote.color}
                              lang={lang} isRTL={isRTL}
                            />
                          </motion.div>
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
                        color:textMain, outline:"none", resize:"none",
                        fontFamily:lang==="ar"?"var(--font-arabic)":"inherit",
                        direction:isRTL?"rtl":"ltr", transition:"border-color 0.15s" }}
                    />
                    <button onClick={handleSendComment}
                      disabled={!commentText.trim()||sending}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0"
                      style={{ background:commentText.trim()?selectedNote.color:(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),
                        color:commentText.trim()?"#fff":textMuted, opacity:sending?0.6:1 }}
                    >
                      {sending
                        ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                        : <Send className="w-3.5 h-3.5" style={{ transform:isRTL?"scaleX(-1)":"none" }}/>}
                    </button>
                  </div>
                  <p className="text-[10px]" style={{ color:textMuted }}>
                    {lang==="ar" ? "Ctrl+Enter للإرسال" : "Ctrl+Enter to send"}
                  </p>

                  {/* All notes list */}
                  <div style={{ height:"1px", background:divider, margin:"4px 0" }}/>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:textMuted }}>
                    {tx.allNotes} ({notes.length})
                  </span>
                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {notes.map(note => (
                        <PreviewCard key={note.id} note={note}
                          active={selectedNote.id===note.id} isDark={isDark}
                          textMain={textMain} textMuted={textMuted} lang={lang}
                          onClick={() => openNote(note)}
                        />
                      ))}
                    </AnimatePresence>
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