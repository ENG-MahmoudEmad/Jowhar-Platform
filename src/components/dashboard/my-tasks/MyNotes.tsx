"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, X, Check, Plus } from "lucide-react";
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

async function apiCreateNote(data: Omit<Note, "id" | "createdAt" | "updatedAt">): Promise<Note> {
  const now = new Date().toISOString();
  return { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
}
async function apiUpdateNote(id: string, data: Partial<Note>): Promise<Note> {
  return { ...data, id, updatedAt: new Date().toISOString() } as Note;
}
async function apiDeleteNote(id: string): Promise<void> { void id; }

/* ─── Demo seed ─────────────────────────────────────────────────────────────── */
const DEMO_NOTES: Note[] = [
  { id: "1", title: "Meeting Notes",     content: "Discuss animation pipeline with the team and finalize the character rigging workflow. Make sure everyone is aligned on the delivery schedule before EOD.",  color: "#458482", createdAt: "2026-05-10T09:00:00Z", updatedAt: "2026-05-10T09:00:00Z" },
  { id: "2", title: "Ideas",             content: "Try a looping particle trail on the title card. Maybe use a noise-based shader approach. Also consider a subtle vignette on the final composite.",         color: "#f59e0b", createdAt: "2026-05-12T14:30:00Z", updatedAt: "2026-05-12T14:30:00Z" },
  { id: "3", title: "Deadline Reminder", content: "Walk cycle delivery is due May 23rd. Don't forget to export at 4K with alpha channel. Upload to the shared drive and ping the director when done.",        color: "#a855f7", createdAt: "2026-05-14T08:00:00Z", updatedAt: "2026-05-14T08:00:00Z" },
];

const NOTE_COLORS = [
  "#458482", "#5ea8a4", "#f59e0b", "#f97316",
  "#ef4444", "#a855f7", "#3b82f6", "#6366f1",
  "#ec4899", "#10b981", "#64748b", "#8b5cf6",
];

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { day: "numeric", month: "short", year: "numeric" },
  );
}
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─── Preview Card ───────────────────────────────────────────────────────────── */
function PreviewCard({ note, isDark, textMain, textMuted, lang, onClick }: {
  note: Note; isDark: boolean; textMain: string;
  textMuted: string; lang: string; onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="w-full text-start rounded-xl p-4 flex flex-col gap-2 cursor-pointer"
      style={{
        background: isDark ? hexToRgba(note.color, 0.08) : hexToRgba(note.color, 0.06),
        border:     `1px solid ${hexToRgba(note.color, isDark ? 0.22 : 0.18)}`,
        borderLeft: `3px solid ${note.color}`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? hexToRgba(note.color, 0.13) : hexToRgba(note.color, 0.10); }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isDark ? hexToRgba(note.color, 0.08) : hexToRgba(note.color, 0.06); }}
    >
      <span className="text-[12px] font-bold leading-tight"
        style={{ color: textMain, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
      >
        {note.title}
      </span>
      <p className="text-[11px] leading-relaxed line-clamp-2 text-start"
        style={{ color: textMuted, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
      >
        {note.content}
      </p>
      <span className="text-[10px] font-medium" style={{ color: hexToRgba(note.color, 0.8) }}>
        {fmtDate(note.updatedAt, lang)}
      </span>
    </motion.button>
  );
}

/* ─── Edit / Create Form ─────────────────────────────────────────────────────── */
function NoteForm({ note, isDark, textMain, textMuted, inputBg, inputBorder, lang, isRTL, onSave, onCancel, saving }: {
  note: Partial<Note>; isDark: boolean; textMain: string; textMuted: string;
  inputBg: string; inputBorder: string; lang: string; isRTL: boolean;
  onSave: (d: { title: string; content: string; color: string }) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [title,   setTitle]   = useState(note.title   ?? "");
  const [content, setContent] = useState(note.content ?? "");
  const [color,   setColor]   = useState(note.color   ?? NOTE_COLORS[0]);

  const base: React.CSSProperties = {
    background: inputBg, border: `1px solid ${inputBorder}`, color: textMain,
    borderRadius: "10px", outline: "none", width: "100%",
    fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
    direction: isRTL ? "rtl" : "ltr", fontSize: "13px",
    padding: "10px 12px", transition: "border-color 0.15s", resize: "none" as const,
  };

  return (
    <div className="flex flex-col gap-4">
      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder={lang === "ar" ? "عنوان الملاحظة..." : "Note title..."}
        style={{ ...base, fontWeight: 600 }}
        onFocus={e => { e.currentTarget.style.borderColor = color; }}
        onBlur={e  => { e.currentTarget.style.borderColor = inputBorder; }}
      />
      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder={lang === "ar" ? "اكتب ملاحظتك هنا..." : "Write your note here..."}
        rows={5} style={base}
        onFocus={e => { e.currentTarget.style.borderColor = color; }}
        onBlur={e  => { e.currentTarget.style.borderColor = inputBorder; }}
      />
      {/* Color picker */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
          {lang === "ar" ? "اللون" : "Color"}
        </span>
        <div className="flex flex-wrap gap-2">
          {NOTE_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full cursor-pointer transition-transform"
              style={{ background: c, transform: color === c ? "scale(1.25)" : "scale(1)", outline: color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
            />
          ))}
        </div>
      </div>
      {/* Actions */}
      <div className="flex gap-2 justify-end" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer"
          style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: textMuted }}
        >
          {lang === "ar" ? "إلغاء" : "Cancel"}
        </button>
        <button onClick={() => onSave({ title, content, color })}
          disabled={!title.trim() || saving}
          className="px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer flex items-center gap-2"
          style={{ background: title.trim() ? color : "rgba(69,132,130,0.4)", color: "#fff", opacity: saving ? 0.7 : 1 }}
        >
          {saving
            ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          {lang === "ar" ? "حفظ" : "Save"}
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

  const bg          = isDark ? "var(--card)"           : "#ffffff";
  const border      = isDark ? "var(--card-border)"    : "rgba(0,0,0,0.07)";
  const headerBg    = isDark ? "var(--background-alt)" : "#f5f5ef";
  const divider     = isDark ? "var(--divider)"        : "rgba(0,0,0,0.06)";
  const textMain    = "var(--foreground)";
  const textMuted   = "var(--foreground-muted)";
  const inputBg     = isDark ? "var(--input-bg)"       : "#f9f9f3";
  const inputBorder = isDark ? "var(--input-border)"   : "rgba(0,0,0,0.10)";

  const [notes,        setNotes]        = useState<Note[]>(DEMO_NOTES);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [mode,         setMode]         = useState<"view" | "edit" | "create">("view");
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);

  /* ── Handlers ── */
  const handleCreate = async (data: { title: string; content: string; color: string }) => {
    setSaving(true);
    try {
      const created = await apiCreateNote(data);
      setNotes(prev => [created, ...prev]);
      setMode("view");
      setSelectedNote(null);
    } finally { setSaving(false); }
  };

  const handleUpdate = async (data: { title: string; content: string; color: string }) => {
    if (!selectedNote) return;
    setSaving(true);
    try {
      const updated = await apiUpdateNote(selectedNote.id, { ...selectedNote, ...data });
      const merged  = { ...selectedNote, ...data, updatedAt: updated.updatedAt };
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? merged : n));
      setSelectedNote(merged);
      setMode("view");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await apiDeleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      setSelectedNote(null);
      setMode("view");
    } finally { setDeleting(null); }
  };

  const openNote = (note: Note) => { setSelectedNote(note); setMode("view"); };
  const closeAll = () => { setSelectedNote(null); setMode("view"); };

  const preview = notes.slice(0, 3);
  const modalOpen = !!selectedNote || mode === "create";

  return (
    <>
      {/* ── Collapsed card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.28, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ background: headerBg, borderBottom: `1px solid ${divider}`, flexDirection: "row" }}
        >
          <h2 className="text-sm font-bold uppercase tracking-widest"
            style={{ color: textMain, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
          >
            {lang === "ar" ? "ملاحظاتي" : "My Notes"}
          </h2>
          <div className="flex items-center gap-2" style={{ flexDirection: "row" }}>
            <button onClick={() => setMode("create")}
              className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ background: "#458482", color: "#fff" }}
              title={lang === "ar" ? "ملاحظة جديدة" : "New Note"}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => notes.length > 0 && openNote(notes[0])}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
              style={{ background: "transparent", color: textMuted, border: `1px solid ${divider}` }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--hover-bg)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {lang === "ar" ? "فتح" : "Open"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <AnimatePresence>
            {preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: textMuted }}>
                <span className="text-2xl">📝</span>
                <span className="text-[12px] font-medium" style={{ fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}>
                  {lang === "ar" ? "لا توجد ملاحظات" : "No notes yet"}
                </span>
              </div>
            ) : (
              preview.map(note => (
                <PreviewCard key={note.id} note={note} isDark={isDark}
                  textMain={textMain} textMuted={textMuted} lang={lang}
                  onClick={() => openNote(note)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeAll} className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.96,    y: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              dir={isRTL ? "rtl" : "ltr"}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ pointerEvents: "none" }}
            >
              <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
                style={{ background: bg, border: `1px solid ${border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", pointerEvents: "auto", maxHeight: "90vh" }}
              >
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between shrink-0"
                  style={{ background: headerBg, borderBottom: `1px solid ${divider}`, flexDirection: "row" }}
                >
                  <div className="flex items-center gap-2" style={{ flexDirection: "row" }}>
                    {selectedNote && mode !== "create" && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selectedNote.color }} />
                    )}
                    <h3 className="text-sm font-bold"
                      style={{ color: textMain, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit" }}
                    >
                      {mode === "create"
                        ? (lang === "ar" ? "ملاحظة جديدة"    : "New Note")
                        : mode === "edit"
                        ? (lang === "ar" ? "تعديل الملاحظة"  : "Edit Note")
                        : selectedNote?.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5" style={{ flexDirection: "row" }}>
                    {mode === "view" && selectedNote && (
                      <>
                        <button onClick={() => setMode("edit")}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                          style={{ color: selectedNote.color }}
                          onMouseEnter={e => { e.currentTarget.style.background = hexToRgba(selectedNote.color, 0.12); }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(selectedNote.id)}
                          disabled={deleting === selectedNote.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                          style={{ color: "#ef4444" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                          {deleting === selectedNote.id
                            ? <span className="w-3 h-3 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                    <button onClick={closeAll}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ color: textMuted }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--hover-bg)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto custom-scrollbar flex flex-col" style={{ flex: 1 }}>
                  <AnimatePresence mode="wait">

                    {/* ── Create ── */}
                    {mode === "create" && (
                      <motion.div key="create"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="p-5"
                      >
                        <NoteForm
                          note={{}} isDark={isDark} textMain={textMain} textMuted={textMuted}
                          inputBg={inputBg} inputBorder={inputBorder} lang={lang} isRTL={isRTL}
                          onSave={handleCreate} onCancel={closeAll} saving={saving}
                        />
                      </motion.div>
                    )}

                    {/* ── Edit ── */}
                    {mode === "edit" && selectedNote && (
                      <motion.div key="edit"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="p-5"
                      >
                        <NoteForm
                          note={selectedNote} isDark={isDark} textMain={textMain} textMuted={textMuted}
                          inputBg={inputBg} inputBorder={inputBorder} lang={lang} isRTL={isRTL}
                          onSave={handleUpdate} onCancel={() => setMode("view")} saving={saving}
                        />
                      </motion.div>
                    )}

                    {/* ── View ── */}
                    {mode === "view" && selectedNote && (
                      <motion.div key="view"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="p-5 flex flex-col gap-4"
                      >
                        <span className="text-[10px] font-semibold" style={{ color: textMuted }}>
                          {lang === "ar" ? "آخر تعديل" : "Last edited"} · {fmtDate(selectedNote.updatedAt, lang)}
                        </span>
                        <p className="text-[13px] leading-relaxed"
                          style={{ color: textMain, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit", direction: isRTL ? "rtl" : "ltr" }}
                        >
                          {selectedNote.content}
                        </p>

                        {/* All notes list */}
                        <div style={{ height: "1px", background: divider }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>
                          {lang === "ar" ? "كل الملاحظات" : "All Notes"} ({notes.length})
                        </span>
                        <div className="flex flex-col gap-3">
                          <AnimatePresence>
                            {notes.map(n => (
                              <PreviewCard key={n.id} note={n} isDark={isDark}
                                textMain={textMain} textMuted={textMuted} lang={lang}
                                onClick={() => openNote(n)}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
