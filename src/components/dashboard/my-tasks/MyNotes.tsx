"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Check, Search, Clock3 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LangContext";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
export interface Note {
  id:        string;
  title:     string;
  content:   string;
  color:     string;
  createdAt: string;
  updatedAt: string;
}

/* ─── API stubs ─────────────────────────────────────────────────────────────── */
// GET    /api/notes
// POST   /api/notes
// PUT    /api/notes/:id
// DELETE /api/notes/:id
async function apiCreate(data: Omit<Note, "id"|"createdAt"|"updatedAt">): Promise<Note> {
  const now = new Date().toISOString();
  return { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
}
async function apiUpdate(id: string, data: Partial<Note>): Promise<Note> {
  return { ...data, id, updatedAt: new Date().toISOString() } as Note;
}
async function apiDelete(id: string): Promise<void> { void id; }

/* ─── Demo ───────────────────────────────────────────────────────────────────── */
const DEMO: Note[] = [
  { id:"1", title:"Animation Pipeline",  content:"Finalize the animation pipeline structure before the next production sprint. Make sure rendering, compositing, and export flow are aligned with the team.",       color:"#458482", createdAt:"2026-05-10T09:00:00Z", updatedAt:"2026-05-10T09:00:00Z" },
  { id:"2", title:"Visual Direction",    content:"Experiment with cinematic gradients and layered lighting for dashboard cards. Consider reducing glow intensity globally and testing the new type scale.",          color:"#8b5cf6", createdAt:"2026-05-12T14:30:00Z", updatedAt:"2026-05-12T14:30:00Z" },
  { id:"3", title:"Launch Ideas",        content:"Potential future expansion for Jowhar ecosystem: AI tools, creator dashboards, realtime collaboration, archive spaces with smart search and tagging.",            color:"#f59e0b", createdAt:"2026-05-14T08:00:00Z", updatedAt:"2026-05-14T08:00:00Z" },
];

const COLORS = [
  "#458482","#5ea8a4","#8b5cf6","#6366f1",
  "#f59e0b","#f97316","#ef4444","#3b82f6",
  "#ec4899","#10b981","#64748b","#a855f7",
];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang==="ar"?"ar-SA":"en-US",
    { day:"numeric", month:"short", year:"numeric" });
}

/* ─── NoteCard ───────────────────────────────────────────────────────────────── */
function NoteCard({ note, active, isDark, textMain, textMuted, lang, onClick }: {
  note: Note; active: boolean; isDark: boolean;
  textMain: string; textMuted: string; lang: string; onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-6 }}
      whileHover={{ scale: 1.012, transition:{ duration:0.15 } }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-2xl p-4.5 text-start block"
      style={{
        background: active
          ? rgba(note.color, isDark ? 0.18 : 0.10)
          : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: active
          ? `1px solid ${rgba(note.color, 0.35)}`
          : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        cursor: "pointer",
      }}
    >
      {/* Coloured top line — fixed 2px on all cards */}
      <div className="absolute top-0 left-0 right-0"
        style={{ height:"2px", background: note.color, opacity: active ? 1 : 0.6 }}
      />

      <div className="flex flex-col gap-2">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold leading-tight truncate"
            style={{ color: textMain, fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit" }}
          >
            {note.title}
          </span>
          {active && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: rgba(note.color, 0.2), color: note.color }}
            >
              {lang==="ar" ? "مفتوحة" : "open"}
            </span>
          )}
        </div>

        {/* Preview */}
        <p className="text-[11px] leading-relaxed line-clamp-2"
          style={{ color: textMuted, fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit" }}
        >
          {note.content}
        </p>

        {/* Date */}
        <div className="flex items-center gap-1.5"
          style={{ color: rgba(note.color, 0.85) }}
        >
          <Clock3 className="w-3 h-3 shrink-0" />
          <span className="text-[10px] font-medium">{fmtDate(note.updatedAt, lang)}</span>
        </div>
      </div>
    </motion.button>
  );
}

/* ─── NoteForm (create / edit) ───────────────────────────────────────────────── */
function NoteForm({ note, isDark, textMain, textMuted, inputBg, inputBorder, lang, isRTL, onSave, onCancel, saving }: {
  note: Partial<Note>; isDark: boolean; textMain: string; textMuted: string;
  inputBg: string; inputBorder: string; lang: string; isRTL: boolean;
  onSave: (d: { title:string; content:string; color:string }) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [title,   setTitle]   = useState(note.title   ?? "");
  const [content, setContent] = useState(note.content ?? "");
  const [color,   setColor]   = useState(note.color   ?? COLORS[0]);

  const base: React.CSSProperties = {
    background: inputBg, border: `1px solid ${inputBorder}`, color: textMain,
    borderRadius:"12px", outline:"none", width:"100%",
    fontFamily: lang==="ar" ? "var(--font-arabic)" : "inherit",
    direction: isRTL ? "rtl" : "ltr", fontSize:"13px",
    padding:"10px 14px", transition:"border-color 0.15s", resize:"none" as const,
  };

  return (
    <div className="flex flex-col gap-4">
      <input value={title} onChange={e=>setTitle(e.target.value)}
        placeholder={lang==="ar" ? "عنوان الملاحظة..." : "Note title..."}
        style={{ ...base, fontWeight:600 }}
        onFocus={e=>{ e.currentTarget.style.borderColor=color; }}
        onBlur={e=>{ e.currentTarget.style.borderColor=inputBorder; }}
      />
      <textarea value={content} onChange={e=>setContent(e.target.value)}
        placeholder={lang==="ar" ? "اكتب ملاحظتك هنا..." : "Write your note here..."}
        rows={6} style={base}
        onFocus={e=>{ e.currentTarget.style.borderColor=color; }}
        onBlur={e=>{ e.currentTarget.style.borderColor=inputBorder; }}
      />

      {/* Color dots */}
      <div className="flex flex-wrap gap-2">
        {COLORS.map(c => (
          <button key={c} onClick={()=>setColor(c)}
            className="w-6 h-6 rounded-full cursor-pointer transition-all"
            style={{ background:c, transform: color===c?"scale(1.3)":"scale(1)",
              outline: color===c ? `2px solid ${c}` : "none", outlineOffset:"2px" }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end" style={{ flexDirection: isRTL?"row-reverse":"row" }}>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer"
          style={{ background: isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)", color:textMuted }}
        >
          {lang==="ar" ? "إلغاء" : "Cancel"}
        </button>
        <button onClick={()=>onSave({title,content,color})}
          disabled={!title.trim()||saving}
          className="px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer flex items-center gap-2"
          style={{ background:title.trim()?color:"rgba(69,132,130,0.4)", color:"#fff", opacity:saving?0.7:1 }}
        >
          {saving
            ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
            : <Check className="w-3.5 h-3.5"/>}
          {lang==="ar" ? "حفظ" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function MyNotes() {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark          = theme === "dark";

  /* palette */
  const bg          = isDark ? "var(--card)"           : "#ffffff";
  const border      = isDark ? "var(--card-border)"    : "rgba(0,0,0,0.07)";
  const headerBg    = isDark ? "var(--background-alt)" : "#f5f5ef";
  const divider     = isDark ? "var(--divider)"        : "rgba(0,0,0,0.06)";
  const textMain    = "var(--foreground)";
  const textMuted   = "var(--foreground-muted)";
  const inputBg     = isDark ? "var(--input-bg)"       : "#f9f9f3";
  const inputBorder = isDark ? "var(--input-border)"   : "rgba(0,0,0,0.10)";
  const panelBg     = isDark ? "var(--background-alt)" : "#fafaf6";

  const [notes,   setNotes]   = useState<Note[]>(DEMO);
  const [selected,setSelected]= useState<Note | null>(null);
  const [mode,    setMode]    = useState<"view"|"edit"|"create">("view");
  const [panelOpen,setPanelOpen] = useState(false);
  const [search,  setSearch]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState<string|null>(null);

  /* ── Detect mobile ── */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* filtered notes for search */
  const filtered = useMemo(() => notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  ), [notes, search]);

  /* ── Handlers ── */
  const openNote = (note: Note) => {
    setSelected(note); setMode("view"); setPanelOpen(true);
  };
  const openCreate = () => {
    setSelected(null); setMode("create"); setPanelOpen(true);
  };
  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => { setSelected(null); setMode("view"); setSearch(""); }, 300);
  };

  const handleCreate = async (data: { title:string; content:string; color:string }) => {
    setSaving(true);
    try {
      const created = await apiCreate(data);
      setNotes(prev => [created, ...prev]);
      setSelected(created); setMode("view");
    } finally { setSaving(false); }
  };

  const handleUpdate = async (data: { title:string; content:string; color:string }) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await apiUpdate(selected.id, { ...selected, ...data });
      const merged  = { ...selected, ...data, updatedAt: updated.updatedAt };
      setNotes(prev => prev.map(n => n.id===selected.id ? merged : n));
      setSelected(merged); setMode("view");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await apiDelete(id);
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      if (selected?.id === id) {
        if (remaining.length > 0) { setSelected(remaining[0]); setMode("view"); }
        else closePanel();
      }
    } finally { setDeleting(null); }
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
          <h2 className="text-sm font-bold uppercase tracking-widest"
            style={{ color:textMain, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
          >
            {lang==="ar" ? "ملاحظاتي" : "My Notes"}
          </h2>
          <div className="flex items-center gap-2" style={{ flexDirection:"row" }}>
            <button onClick={openCreate}
              className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all"
              style={{ background:"#458482", color:"#fff" }}
              title={lang==="ar" ? "ملاحظة جديدة" : "New Note"}
            >
              <Plus className="w-3.5 h-3.5"/>
            </button>
            <button onClick={() => notes.length > 0 && openNote(notes[0])}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
              style={{ background:"transparent", color:textMuted, border:`1px solid ${divider}` }}
              onMouseEnter={e=>{ e.currentTarget.style.background="var(--hover-bg)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
            >
              {lang==="ar" ? "فتح" : "Open"}
            </button>
          </div>
        </div>

        {/* Preview — 3 cards */}
        <div className="flex flex-col gap-2 px-3 pt-3 pb-3" style={{ marginBottom: 0 }}>
          <AnimatePresence>
            {preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color:textMuted }}>
                <span className="text-2xl">📝</span>
                <span className="text-[12px] font-medium"
                  style={{ fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
                >
                  {lang==="ar" ? "لا توجد ملاحظات بعد" : "No notes yet"}
                </span>
              </div>
            ) : (
              preview.map(note => (
                <NoteCard key={note.id} note={note}
                  active={false} isDark={isDark}
                  textMain={textMain} textMuted={textMuted} lang={lang}
                  onClick={() => openNote(note)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {panelOpen && (
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
              initial={isMobile
                ? { y:"100%", opacity:1 }
                : { x: isRTL ? "-100%" : "100%", opacity:0 }}
              animate={isMobile
                ? { y:"0%", opacity:1 }
                : { x:"0%", opacity:1 }}
              exit={isMobile
                ? { y:"100%", opacity:1 }
                : { x: isRTL ? "-100%" : "100%", opacity:0 }}
              transition={{ type:"spring", damping:32, stiffness:280 }}
              /* ── drag to close on mobile ── */
              drag={isMobile ? "y" : false}
              dragConstraints={isMobile ? { top:0, bottom:0 } : undefined}
              dragElastic={{ top:0, bottom:0.4 }}
              onDragEnd={(_e, info) => {
                if (isMobile && info.offset.y > 100) closePanel();
              }}
              dir={isRTL?"rtl":"ltr"}
              className={
                isMobile
                  ? "fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
                  : "fixed top-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col"
              }
              style={isMobile ? {
                background: panelBg,
                borderTop: `1px solid ${border}`,
                maxHeight: "85vh",
                touchAction: "none",
              } : {
                [isRTL?"left":"right"]: 0,
                background: panelBg,
                borderLeft:  isRTL ? "none" : `1px solid ${border}`,
                borderRight: isRTL ? `1px solid ${border}` : "none",
              }}
            >
              {/* Drag handle — mobile only */}
              {isMobile && (
                <div
                  className="flex justify-center pt-3 pb-2 shrink-0"
                  style={{ cursor:"grab", touchAction:"none" }}
                >
                  <div className="w-10 h-1 rounded-full"
                    style={{ background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }}
                  />
                </div>
              )}

              {/* Panel header */}
              <div className="px-5 py-4 flex items-center justify-between shrink-0"
                style={{ background:headerBg, borderBottom:`1px solid ${divider}`, flexDirection:"row" }}
              >
                <div className="flex items-center gap-2" style={{ flexDirection:"row" }}>
                  {selected && mode==="view" && (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background:selected.color }}
                    />
                  )}
                  <h3 className="text-sm font-bold"
                    style={{ color:textMain, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
                  >
                    {mode==="create"
                      ? (lang==="ar" ? "ملاحظة جديدة"   : "New Note")
                      : mode==="edit"
                      ? (lang==="ar" ? "تعديل الملاحظة" : "Edit Note")
                      : selected?.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5" style={{ flexDirection:"row" }}>
                  {mode==="view" && selected && (
                    <>
                      <button onClick={()=>setMode("edit")}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                        style={{ color:selected.color }}
                        onMouseEnter={e=>{ e.currentTarget.style.background=rgba(selected.color,0.12); }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
                      >
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={()=>handleDelete(selected.id)}
                        disabled={deleting===selected.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                        style={{ color:"#ef4444" }}
                        onMouseEnter={e=>{ e.currentTarget.style.background="rgba(239,68,68,0.10)"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
                      >
                        {deleting===selected.id
                          ? <span className="w-3 h-3 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin"/>
                          : <Trash2 className="w-3.5 h-3.5"/>}
                      </button>
                    </>
                  )}
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

              {/* Search (shown in view mode) */}
              {mode === "view" && (
                <div className="px-5 py-3 shrink-0" style={{ borderBottom:`1px solid ${divider}` }}>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ background: isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
                      border:`1px solid ${divider}` }}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color:textMuted }}/>
                    <input value={search} onChange={e=>setSearch(e.target.value)}
                      placeholder={lang==="ar" ? "ابحث في الملاحظات..." : "Search notes..."}
                      className="w-full bg-transparent text-[12px] outline-none"
                      style={{ color:textMain, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit",
                        direction:isRTL?"rtl":"ltr" }}
                    />
                    {search && (
                      <button onClick={()=>setSearch("")} style={{ color:textMuted }}>
                        <X className="w-3 h-3"/>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">

                  {/* ── Create ── */}
                  {mode === "create" && (
                    <motion.div key="create"
                      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                      className="p-5"
                    >
                      <NoteForm note={{}} isDark={isDark} textMain={textMain} textMuted={textMuted}
                        inputBg={inputBg} inputBorder={inputBorder} lang={lang} isRTL={isRTL}
                        onSave={handleCreate} onCancel={closePanel} saving={saving}
                      />
                    </motion.div>
                  )}

                  {/* ── Edit ── */}
                  {mode === "edit" && selected && (
                    <motion.div key="edit"
                      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                      className="p-5"
                    >
                      <NoteForm note={selected} isDark={isDark} textMain={textMain} textMuted={textMuted}
                        inputBg={inputBg} inputBorder={inputBorder} lang={lang} isRTL={isRTL}
                        onSave={handleUpdate} onCancel={()=>setMode("view")} saving={saving}
                      />
                    </motion.div>
                  )}

                  {/* ── View ── */}
                  {mode === "view" && (
                    <motion.div key="view"
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      className="flex flex-col"
                    >
                      {/* Selected note detail */}
                      {selected && (
                        <div className="p-5" style={{ borderBottom:`1px solid ${divider}` }}>
                          {/* Coloured top bar */}
                          <div className="rounded-2xl overflow-hidden"
                            style={{ border:`1px solid ${rgba(selected.color,0.2)}` }}
                          >
                            <div className="h-[3px] w-full" style={{ background:selected.color }}/>
                            <div className="p-5" style={{ background:rgba(selected.color, isDark?0.08:0.05) }}>
                              <div className="flex items-center gap-1.5 mb-4"
                                style={{ color:rgba(selected.color,0.85) }}
                              >
                                <Clock3 className="w-3 h-3"/>
                                <span className="text-[10px] font-semibold">
                                  {lang==="ar" ? "آخر تعديل" : "Last edited"} · {fmtDate(selected.updatedAt, lang)}
                                </span>
                              </div>
                              <p className="text-[13px] leading-[1.9]"
                                style={{ color:textMain,
                                  fontFamily:lang==="ar"?"var(--font-arabic)":"inherit",
                                  direction:isRTL?"rtl":"ltr" }}
                              >
                                {selected.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* All notes list */}
                      <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest mb-1"
                          style={{ color:textMuted }}
                        >
                          {lang==="ar" ? "كل الملاحظات" : "All Notes"} ({filtered.length})
                        </span>
                        <AnimatePresence>
                          {filtered.length === 0 ? (
                            <p className="text-[12px] py-4 text-center"
                              style={{ color:textMuted, fontFamily:lang==="ar"?"var(--font-arabic)":"inherit" }}
                            >
                              {lang==="ar" ? "لا نتائج" : "No results"}
                            </p>
                          ) : (
                            filtered.map(note => (
                              <NoteCard key={note.id} note={note}
                                active={selected?.id===note.id} isDark={isDark}
                                textMain={textMain} textMuted={textMuted} lang={lang}
                                onClick={()=>{ setSelected(note); setMode("view"); }}
                              />
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Panel footer — new note shortcut */}
              {mode === "view" && (
                <div className="px-5 py-4 shrink-0"
                  style={{ borderTop:`1px solid ${divider}` }}
                >
                  <button onClick={openCreate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold cursor-pointer transition-all"
                    style={{ background:rgba("#458482", isDark?0.15:0.10), color:"#458482",
                      border:`1px solid ${rgba("#458482",0.2)}` }}
                    onMouseEnter={e=>{ e.currentTarget.style.background=rgba("#458482",0.22); }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=rgba("#458482",isDark?0.15:0.10); }}
                  >
                    <Plus className="w-3.5 h-3.5"/>
                    {lang==="ar" ? "ملاحظة جديدة" : "New Note"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}