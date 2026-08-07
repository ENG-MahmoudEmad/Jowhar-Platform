//src\components\dashboard\archive\FileList.tsx
"use client"

import { useState, useCallback, useMemo, useRef, memo } from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import {
  Plus, X, ExternalLink, Search, SlidersHorizontal, Upload,
  ChevronRight, FolderOpen, Pencil, Trash2, FolderSymlink, CheckSquare, Square,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'
import type { ArchiveItem, FileType } from '@/components/dashboard/archive/SectionGrid'
import ViewToggle, { type ViewMode } from '@/components/dashboard/archive/ViewToggle'
import { useSmartSearch } from '@/lib/useSmartSearch'
import { useSelection } from '@/lib/useSelection'
import DeleteConfirmModal from '@/components/dashboard/archive/DeleteConfirmModal'
import SelectionToolbar from '@/components/dashboard/archive/SelectionToolbar'
import DestinationPicker, { type DestinationResult } from '@/components/dashboard/archive/DestinationPicker'
import ActionToast from '@/components/dashboard/archive/ActionToast'

/* ── Types ── */
export interface ArchiveFile {
  id:       string
  itemId:   string
  nameEn:   string
  nameAr:   string
  /** Single-file Drive link — distinct from the item's whole-folder link
      shown at the top of this page. */
  driveUrl: string
  tag?:     string
}

/**
 * Deterministic mock seed per item, so refreshing the page doesn't reshuffle
 * file names. Replace with a real fetch keyed by `item.id` once wired up.
 */
function seedFilesForItem(item: ArchiveItem): ArchiveFile[] {
  const count = 3 + (item.id.charCodeAt(0) % 3) // 3–5 files, varies a bit per item
  return Array.from({ length: count }, (_, i) => ({
    id:       `${item.id}-f${i + 1}`,
    itemId:   item.id,
    nameEn:   `${item.nameEn} — File ${i + 1}`,
    nameAr:   `${item.nameAr} — ملف ${i + 1}`,
    driveUrl: item.driveUrl,
    tag:      item.tag,
  }))
}

// ─── Module-level constants ───────────────────────────────────────────────
const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";

const MODAL_BACKDROP_STYLE: React.CSSProperties = { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', cursor: 'pointer' };
const CLOSE_BUTTON_STYLE: React.CSSProperties = { color: TEXT_MUTED, cursor: 'pointer' };
const REQUIRED_ASTERISK_STYLE: React.CSSProperties = { color: '#ef4444' };
const EMPTY_ICON_STYLE: React.CSSProperties = { color: TEXT_MUTED, opacity: 0.4 };

function handleHoverBgEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'var(--hover-bg)';
}
function handleHoverBgLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'transparent';
}

/* ── Edit Folder Link Modal ── */
const FolderLinkModal = memo(function FolderLinkModal({
  color,
  currentUrl,
  onClose,
  onSave,
}: {
  color:      string
  currentUrl: string
  onClose:    () => void
  onSave:     (url: string) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [url, setUrl] = useState(currentUrl)

  const tx = useMemo(() => ({
    title:  lang === 'ar' ? 'تعديل رابط المجلد' : 'Edit Folder Link',
    label:  lang === 'ar' ? 'رابط مجلد الدرايف الكامل' : 'Full Drive Folder URL',
    save:   lang === 'ar' ? 'حفظ' : 'Save',
    cancel: lang === 'ar' ? 'إلغاء' : 'Cancel',
  }), [lang])

  const isValid = url.trim().length > 0

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const handleSave = useCallback(() => {
    if (!isValid) return
    onSave(url.trim())
    onClose()
  }, [isValid, url, onSave, onClose])

  const inputStyle = useMemo<React.CSSProperties>(() => ({
    background:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
    color:        TEXT_MAIN,
    borderRadius: '10px',
    padding:      '8px 12px',
    fontSize:     '11px',
    fontFamily:   'monospace',
    width:        '100%',
    outline:      'none',
  }), [isDark]);

  const saveBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: isValid ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'var(--hover-bg)',
    color:      isValid ? '#ffffff' : TEXT_MUTED,
    cursor:     isValid ? 'pointer' : 'not-allowed',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isValid, color, lang])

  return (
    <m.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={MODAL_BACKDROP_STYLE}
      onClick={handleBackdropClick}
    >
      <m.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)', cursor: 'default',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
              <Pencil className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-black" style={{ color: TEXT_MAIN, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
              {tx.title}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={CLOSE_BUTTON_STYLE}
            onMouseEnter={handleHoverBgEnter} onMouseLeave={handleHoverBgLeave}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <label style={{ fontSize: '10px', fontWeight: 700, color: TEXT_MUTED, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {tx.label}
          </label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." style={inputStyle} autoFocus />
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={{ background: 'var(--hover-bg)', color: TEXT_MUTED, cursor: 'pointer', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {tx.cancel}
          </button>
          <button onClick={handleSave} disabled={!isValid} className="px-4 py-2 rounded-lg text-[11px] font-bold" style={saveBtnStyle}>
            {tx.save}
          </button>
        </div>
      </m.div>
    </m.div>
  )
})

/* ── Add / Edit File Modal (same form, different mode) ── */
const FileFormModal = memo(function FileFormModal({
  color,
  fileTypes,
  editingFile,
  onClose,
  onSubmit,
}: {
  color:       string
  fileTypes:   FileType[]
  /** Present → editing; absent → creating. */
  editingFile: ArchiveFile | null
  onClose:     () => void
  onSubmit:    (file: Omit<ArchiveFile, 'itemId'>) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'

  const [nameEn,   setNameEn]   = useState(editingFile?.nameEn ?? '')
  const [nameAr,   setNameAr]   = useState(editingFile?.nameAr ?? '')
  const [driveUrl, setDriveUrl] = useState(editingFile?.driveUrl ?? '')
  const [tag,      setTag]      = useState(editingFile?.tag ?? '')

  const isEditing = !!editingFile

  const tx = useMemo(() => ({
    titleAdd:  lang === 'ar' ? 'إضافة ملف جديد'   : 'Add New File',
    titleEdit: lang === 'ar' ? 'تعديل الملف'      : 'Edit File',
    nameEn:    lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name',
    nameAr:    lang === 'ar' ? 'الاسم بالعربي'    : 'Arabic Name',
    drive:     lang === 'ar' ? 'رابط الملف بالدرايف' : 'File Drive Link',
    drivePh:   lang === 'ar' ? 'https://drive.google.com/file/...' : 'https://drive.google.com/file/...',
    tagLabel:  lang === 'ar' ? 'نوع الملف'        : 'File Type',
    save:      lang === 'ar' ? 'حفظ التعديلات'    : 'Save Changes',
    add:       lang === 'ar' ? 'إضافة'            : 'Add File',
    cancel:    lang === 'ar' ? 'إلغاء'            : 'Cancel',
  }), [lang])

  const inputStyle = useMemo<React.CSSProperties>(() => ({
    background:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
    color:        TEXT_MAIN,
    borderRadius: '10px',
    padding:      '8px 12px',
    fontSize:     '12px',
    width:        '100%',
    outline:      'none',
  }), [isDark]);

  const labelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: '10px', fontWeight: 700, color: TEXT_MUTED, marginBottom: '4px', display: 'block',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang]);

  const isValid = !!(nameEn.trim() && nameAr.trim() && driveUrl.trim())

  const handleSubmit = useCallback(() => {
    if (!isValid) return
    onSubmit({
      id:       editingFile?.id ?? Date.now().toString(),
      nameEn:   nameEn.trim(),
      nameAr:   nameAr.trim(),
      driveUrl: driveUrl.trim(),
      tag:      tag || undefined,
    })
    onClose()
  }, [isValid, editingFile, nameEn, nameAr, driveUrl, tag, onSubmit, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const handleTagToggle = useCallback((key: string) => setTag(prev => prev === key ? '' : key), [])

  const submitBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: isValid ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'var(--hover-bg)',
    color:      isValid ? '#ffffff' : TEXT_MUTED,
    cursor:     isValid ? 'pointer' : 'not-allowed',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isValid, color, lang])

  return (
    <m.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={MODAL_BACKDROP_STYLE}
      onClick={handleBackdropClick}
    >
      <m.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)', maxHeight: '90vh', cursor: 'default',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
              {isEditing ? <Pencil className="w-3.5 h-3.5 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-sm font-black" style={{ color: TEXT_MAIN, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
              {isEditing ? tx.titleEdit : tx.titleAdd}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={CLOSE_BUTTON_STYLE} onMouseEnter={handleHoverBgEnter} onMouseLeave={handleHoverBgLeave}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{tx.nameEn}</label>
              <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Photo 1" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{tx.nameAr}</label>
              <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="صورة 1" dir="rtl"
                style={{ ...inputStyle, fontFamily: 'var(--font-arabic)' }} />
            </div>
          </div>

          <div>
            <label style={{ ...labelStyle, color }}>
              {tx.drive} <span style={REQUIRED_ASTERISK_STYLE}>*</span>
            </label>
            <input value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
              placeholder={tx.drivePh} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px' }} />
          </div>

          {fileTypes.length > 0 && (
            <div>
              <label style={labelStyle}>{tx.tagLabel}</label>
              <div className="flex gap-2 flex-wrap">
                {fileTypes.map(ft => {
                  const selected = tag === ft.key
                  return (
                    <button key={ft.key} type="button" onClick={() => handleTagToggle(ft.key)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
                      style={{
                        background: selected ? ft.color + '25' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        border: `1px solid ${selected ? ft.color + '60' : 'transparent'}`,
                        color: selected ? ft.color : TEXT_MUTED, cursor: 'pointer',
                      }}
                    >
                      {ft.key}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={{ background: 'var(--hover-bg)', color: TEXT_MUTED, cursor: 'pointer', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {tx.cancel}
          </button>
          <button onClick={handleSubmit} disabled={!isValid}
            className="px-4 py-2 rounded-lg text-[11px] font-bold" style={submitBtnStyle}>
            {isEditing ? tx.save : tx.add}
          </button>
        </div>
      </m.div>
    </m.div>
  )
})

/* ── Single file card (Grid mode) ── */
const FileCard = memo(function FileCard({
  file, color, index, fileTypeColor, isAdmin, onEdit, onDelete,
  selectionActive, isSelected, onStartDrag, onDragOver,
}: {
  file: ArchiveFile; color: string; index: number; fileTypeColor: string; isAdmin: boolean
  onEdit: (file: ArchiveFile) => void
  onDelete: (file: ArchiveFile) => void
  selectionActive: boolean
  isSelected:      boolean
  onStartDrag: (id: string) => void
  onDragOver:  (id: string) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? file.nameAr : file.nameEn

  const handleClick = useCallback(() => {
    if (!selectionActive) window.open(file.driveUrl, '_blank', 'noopener,noreferrer')
  }, [selectionActive, file.driveUrl])
  const handleMouseDown = useCallback(() => {
    if (selectionActive) onStartDrag(file.id)
  }, [selectionActive, onStartDrag, file.id])
  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    if (selectionActive) onDragOver(file.id)
  }, [selectionActive, onDragOver, file.id])
  const handleMouseLeave = useCallback(() => setHovered(false), [])
  const handleEditClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(file) }, [onEdit, file])
  const handleDeleteClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(file) }, [onDelete, file])

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? `linear-gradient(145deg, #161b22, ${color}12)` : `linear-gradient(145deg, #ffffff, ${color}08)`,
    border: `1px solid ${isSelected ? color : hovered ? color + '50' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
    boxShadow: isSelected ? `0 0 0 2px ${color}40` : hovered ? `0 8px 28px ${color}22` : 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  }), [isDark, hovered, color, isSelected]);

  const thumbStyle = useMemo<React.CSSProperties>(() => ({
    aspectRatio: '1 / 1', background: `linear-gradient(135deg, ${color}20, ${color}08)`,
  }), [color]);

  const tagBadgeStyle = useMemo<React.CSSProperties>(() => ({
    [isRTL ? 'left' : 'right']: '10px',
    background: fileTypeColor + '25', color: fileTypeColor, border: `1px solid ${fileTypeColor}50`, backdropFilter: 'blur(8px)',
  }), [isRTL, fileTypeColor]);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={cardStyle}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="relative w-full overflow-hidden flex items-center justify-center" style={thumbStyle}>
        <span className="font-black" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: color + '25', fontFamily: 'var(--font-display)' }}>
          {name.charAt(0)}
        </span>

        {file.tag && (
          <div className="absolute top-3 px-2 py-0.5 rounded-full text-[9px] font-black" style={tagBadgeStyle}>
            {file.tag}
          </div>
        )}

        {isAdmin && !selectionActive && (
          <div className="absolute top-2" style={{ [isRTL ? 'right' : 'left']: '8px' }}>
            <m.div animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.15 }} className="flex gap-1">
              <button onClick={handleEditClick} className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(8,15,18,0.5)', color: '#ffffff', backdropFilter: 'blur(6px)' }}>
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={handleDeleteClick} className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(8,15,18,0.5)', color: '#ff8080', backdropFilter: 'blur(6px)' }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </m.div>
          </div>
        )}

        {selectionActive && (
          <div
            className="absolute top-2 w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              [isRTL ? 'right' : 'left']: '8px',
              background: isSelected ? color : 'rgba(8,15,18,0.5)',
              backdropFilter: 'blur(6px)',
              padding: 0,
              lineHeight: 0,
            }}
          >
            {isSelected
              ? <CheckSquare className="w-3.5 h-3.5 text-white" style={{ display: 'block' }} />
              : <Square className="w-3.5 h-3.5 text-white/80" style={{ display: 'block' }} />}
          </div>
        )}

        <m.div animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-end justify-center pb-3"
          style={{ background: `linear-gradient(to top, ${color}cc 0%, transparent 60%)`, pointerEvents: 'none' }}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <ExternalLink className="w-3 h-3" />
            {lang === 'ar' ? 'فتح في الدرايف' : 'Open in Drive'}
          </div>
        </m.div>
      </div>

      <div className="px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-black truncate" style={{ color: TEXT_MAIN, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
          {name}
        </h3>
      </div>
    </m.div>
  )
})

/* ── Single file row (List mode) ── */
const FileListRow = memo(function FileListRow({
  file, color, index, fileTypeColor, isAdmin, onEdit, onDelete,
  selectionActive, isSelected, onStartDrag, onDragOver,
}: {
  file: ArchiveFile; color: string; index: number; fileTypeColor: string; isAdmin: boolean
  onEdit: (file: ArchiveFile) => void
  onDelete: (file: ArchiveFile) => void
  selectionActive: boolean
  isSelected:      boolean
  onStartDrag: (id: string) => void
  onDragOver:  (id: string) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? file.nameAr : file.nameEn

  const handleClick = useCallback(() => {
    if (!selectionActive) window.open(file.driveUrl, '_blank', 'noopener,noreferrer')
  }, [selectionActive, file.driveUrl])
  const handleMouseDown = useCallback(() => {
    if (selectionActive) onStartDrag(file.id)
  }, [selectionActive, onStartDrag, file.id])
  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    if (selectionActive) onDragOver(file.id)
  }, [selectionActive, onDragOver, file.id])
  const handleMouseLeave = useCallback(() => setHovered(false), [])
  const handleEditClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(file) }, [onEdit, file])
  const handleDeleteClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(file) }, [onDelete, file])

  const rowStyle = useMemo<React.CSSProperties>(() => ({
    background: isSelected ? `${color}14` : hovered ? (isDark ? `${color}12` : `${color}0a`) : 'transparent',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    transition: 'background 0.15s',
  }), [hovered, isDark, color, isSelected]);

  const thumbStyle = useMemo<React.CSSProperties>(() => ({ background: `linear-gradient(135deg, ${color}22, ${color}08)` }), [color]);
  const tagBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: fileTypeColor + '20', color: fileTypeColor, border: `1px solid ${fileTypeColor}40`,
  }), [fileTypeColor]);

  return (
    <m.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02, duration: 0.25 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
      style={rowStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown} onClick={handleClick}
    >
      {selectionActive && (
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ color: isSelected ? color : 'var(--foreground-muted)', padding: 0, lineHeight: 0 }}>
          {isSelected
            ? <CheckSquare className="w-4 h-4" style={{ display: 'block' }} />
            : <Square className="w-4 h-4" style={{ display: 'block' }} />}
        </div>
      )}

      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={thumbStyle}>
        <span className="text-xs font-black" style={{ color, fontFamily: 'var(--font-display)' }}>{name.charAt(0)}</span>
      </div>

      <div className="flex-1 min-w-0 text-[12.5px] font-bold truncate" style={{ color: TEXT_MAIN, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
        {name}
      </div>

      {file.tag && <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black" style={tagBadgeStyle}>{file.tag}</span>}

      {isAdmin && !selectionActive && (
        <m.div animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.15 }} className="flex gap-1 shrink-0">
          <button onClick={handleEditClick} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: TEXT_MUTED }}>
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={handleDeleteClick} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: '#ef4444' }}>
            <Trash2 className="w-3 h-3" />
          </button>
        </m.div>
      )}

      <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color, opacity: hovered ? 1 : 0.4, transition: 'opacity 0.15s' }} />
    </m.div>
  )
})

/* ── FileList (the page body) ── */
function FileList({
  item,
  color        = '#458482',
  fileTypes,
  isAdmin      = true,
}: {
  item:       ArchiveItem
  color?:     string
  fileTypes:  FileType[]
  isAdmin?:   boolean
}) {
  const { lang, isRTL } = useLang()
  const { theme }       = useTheme()
  const isDark          = theme === 'dark'

  const [files, setFiles]         = useState<ArchiveFile[]>(() => seedFilesForItem(item))
  const [folderUrl, setFolderUrl] = useState(item.driveUrl)
  const [showFolderLinkModal, setShowFolderLinkModal] = useState(false)
  const [search, setSearch]       = useState('')
  const [viewMode, setViewMode]   = useState<ViewMode>('grid') // TEMPORARY — see ViewToggle.tsx BACKEND NOTE
  const [showModal, setShowModal] = useState(false)
  const [editingFile, setEditingFile] = useState<ArchiveFile | null>(null)
  /** The file currently showing the big delete-confirmation popup, if any. */
  const [pendingDelete, setPendingDelete] = useState<ArchiveFile | null>(null)

  const selection = useSelection()
  const [showDestPicker, setShowDestPicker] = useState(false)
  const [copyMoveKind, setCopyMoveKind] = useState<'copy' | 'move'>('copy')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const visibleFiles = files

  const fileTypeColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const ft of fileTypes) map.set(ft.key, ft.color)
    return map
  }, [fileTypes])
  const getFileTypeColor = useCallback((tag?: string) => (tag && fileTypeColorMap.get(tag)) || color, [fileTypeColorMap, color])

  const getFileSearchFields = useCallback((f: ArchiveFile) => [f.nameEn, f.nameAr, f.tag], [])
  const filteredFiles = useSmartSearch(visibleFiles, search, getFileSearchFields)

  const tx = useMemo(() => ({
    search:      lang === 'ar' ? 'ابحث عن ملف...'      : 'Search files...',
    addFile:     lang === 'ar' ? 'إضافة ملف'           : 'Add File',
    empty:       lang === 'ar' ? 'لا توجد ملفات بعد'    : 'No files yet',
    noResults:   lang === 'ar' ? 'لا توجد نتائج'        : 'No results found',
    openFolder:  lang === 'ar' ? 'فتح مجلد الدرايف الكامل' : 'Open Full Drive Folder',
    itemLabel:   lang === 'ar' ? 'عنصر'                 : 'Item',
    select:      lang === 'ar' ? 'تحديد'                 : 'Select',
  }), [lang])

  const name = lang === 'ar' ? item.nameAr : item.nameEn

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), [])
  const handleOpenAddModal = useCallback(() => { setEditingFile(null); setShowModal(true) }, [])
  const handleOpenEditModal = useCallback((file: ArchiveFile) => { setEditingFile(file); setShowModal(true) }, [])
  const handleCloseModal = useCallback(() => setShowModal(false), [])

  const handleSubmitFile = useCallback((f: Omit<ArchiveFile, 'itemId'>) => {
    setFiles(prev => {
      const exists = prev.some(x => x.id === f.id)
      if (exists) return prev.map(x => x.id === f.id ? { ...x, ...f } : x)
      return [...prev, { ...f, itemId: item.id }]
    })
  }, [item.id])

  const handleDeleteFile = useCallback((file: ArchiveFile) => {
    setPendingDelete(file)
  }, [])

  const handleConfirmDeleteFile = useCallback(() => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setFiles(prev => prev.filter(f => f.id !== id))
    setPendingDelete(null)
  }, [pendingDelete])

  const handleCancelDeleteFile = useCallback(() => setPendingDelete(null), [])

  const handleOpenCopy = useCallback(() => { setCopyMoveKind('copy'); setShowDestPicker(true) }, [])
  const handleOpenMove = useCallback(() => { setCopyMoveKind('move'); setShowDestPicker(true) }, [])
  const handleCancelDestPicker = useCallback(() => setShowDestPicker(false), [])

  const selectedFilesLabel = useMemo(() => {
    const n = selection.selectedCount
    return lang === 'ar'
      ? `${n} ملف من "${name}"`
      : `${n} file${n === 1 ? '' : 's'} from "${name}"`
  }, [selection.selectedCount, lang, name])

  /* Every FileList instance only knows about its own item's files (each item
     page mounts fresh from `seedFilesForItem`, there's no shared client-side
     store yet — see BACKEND NOTE at the bottom of this file). So there's
     nowhere local to actually place files landing on a different item; Move
     still removes them from here (they're "leaving"), Copy leaves this list
     untouched, and either way the toast is the confirmation of record until
     the backend replaces this with a real server action. */
  const handleConfirmDestination = useCallback((dest: DestinationResult) => {
    const selectedIds = selection.selectedIds
    const n = selectedIds.size

    if (copyMoveKind === 'move') {
      setFiles(prev => prev.filter(f => !selectedIds.has(f.id)))
    }

    setToastMessage(
      copyMoveKind === 'move'
        ? (lang === 'ar' ? `تم نقل ${n} ملف` : `Moved ${n} file${n === 1 ? '' : 's'}`)
        : (lang === 'ar' ? `تم نسخ ${n} ملف` : `Copied ${n} file${n === 1 ? '' : 's'}`)
    )

    setShowDestPicker(false)
    selection.disable()
  }, [selection, copyMoveKind, lang])

  const handleToastDone = useCallback(() => setToastMessage(null), [])

  const handleOpenFullFolder = useCallback(() => {
    window.open(folderUrl, '_blank', 'noopener,noreferrer')
  }, [folderUrl])

  const handleOpenFolderLinkModal = useCallback(() => setShowFolderLinkModal(true), [])
  const handleCloseFolderLinkModal = useCallback(() => setShowFolderLinkModal(false), [])
  const handleSaveFolderLink = useCallback((url: string) => setFolderUrl(url), [])

  const searchIconStyle = useMemo<React.CSSProperties>(() => ({ [isRTL ? 'right' : 'left']: '12px', color: TEXT_MUTED }), [isRTL])
  const searchInputStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
    color: TEXT_MAIN, paddingLeft: isRTL ? '12px' : '34px', paddingRight: isRTL ? '34px' : '12px',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isDark, isRTL, lang])

  const addBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#ffffff', cursor: 'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [color, lang])

  const folderLinkStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}22, ${color}0c)`,
    border: `1px solid ${color}40`, color, cursor: 'pointer',
  }), [color])

  return (
    <LazyMotion features={domAnimation}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="select-none">

        {/* Full-folder link — always at the top of this page, per spec.
            Wrapped in a div rather than a single button so the "open" click
            target and the "edit" click target don't fight each other. */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={handleOpenFullFolder}
            className="flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl text-start min-w-0"
            style={folderLinkStyle}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '25' }}>
              <FolderSymlink className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-black truncate" style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
                {tx.openFolder}
              </div>
              <div className="text-[10.5px] opacity-70 truncate">{folderUrl}</div>
            </div>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenFolderLinkModal}
              className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: color + '15', border: `1px solid ${color}30`, color }}
              title={lang === 'ar' ? 'تعديل رابط المجلد' : 'Edit folder link'}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toolbar — swaps to the selection bar while selecting */}
        {selection.active ? (
          <SelectionToolbar
            color={color}
            selectedCount={selection.selectedCount}
            onCopy={handleOpenCopy}
            onMove={handleOpenMove}
            onCancel={selection.disable}
          />
        ) : (
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={searchIconStyle} />
              <input value={search} onChange={handleSearchChange} placeholder={tx.search}
                className="w-full py-2 rounded-xl text-[12px] outline-none" style={searchInputStyle} />
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
            {isAdmin && filteredFiles.length > 0 && (
              <button onClick={selection.enable}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold shrink-0"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  color: 'var(--foreground-muted)', cursor: 'pointer',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                <CheckSquare className="w-3 h-3" />
                {tx.select}
              </button>
            )}
            {isAdmin && (
              <button onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold shrink-0" style={addBtnStyle}>
                <Plus className="w-3 h-3" />
                {tx.addFile}
              </button>
            )}
          </div>
        )}

        {/* Grid / List */}
        <AnimatePresence mode="wait">
          {filteredFiles.length > 0 ? (
            viewMode === 'grid' ? (
              <m.div key={search + 'grid'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFiles.map((f, i) => (
                  <FileCard key={f.id} file={f} color={color} index={i} fileTypeColor={getFileTypeColor(f.tag)}
                    isAdmin={isAdmin} onEdit={handleOpenEditModal} onDelete={handleDeleteFile}
                    selectionActive={selection.active} isSelected={selection.isSelected(f.id)} onStartDrag={selection.startDrag} onDragOver={selection.dragOver} />
                ))}
              </m.div>
            ) : (
              <m.div key={search + 'list'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                {filteredFiles.map((f, i) => (
                  <FileListRow key={f.id} file={f} color={color} index={i} fileTypeColor={getFileTypeColor(f.tag)}
                    isAdmin={isAdmin} onEdit={handleOpenEditModal} onDelete={handleDeleteFile}
                    selectionActive={selection.active} isSelected={selection.isSelected(f.id)} onStartDrag={selection.startDrag} onDragOver={selection.dragOver} />
                ))}
              </m.div>
            )
          ) : (
            <m.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-3">
              <SlidersHorizontal className="w-8 h-8" style={EMPTY_ICON_STYLE} />
              <p className="text-sm font-bold" style={{ color: TEXT_MUTED }}>{search ? tx.noResults : tx.empty}</p>
            </m.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showModal && (
            <FileFormModal
              color={color}
              fileTypes={fileTypes}
              editingFile={editingFile}
              onClose={handleCloseModal}
              onSubmit={handleSubmitFile}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFolderLinkModal && (
            <FolderLinkModal
              color={color}
              currentUrl={folderUrl}
              onClose={handleCloseFolderLinkModal}
              onSave={handleSaveFolderLink}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingDelete && (
            <DeleteConfirmModal
              label={lang === 'ar' ? pendingDelete.nameAr : pendingDelete.nameEn}
              message={lang === 'ar'
                ? 'سيتم حذف هذا الملف نهائيًا. هذا الإجراء لا يمكن التراجع عنه.'
                : 'This file will be permanently deleted. This cannot be undone.'}
              onConfirm={handleConfirmDeleteFile}
              onCancel={handleCancelDeleteFile}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDestPicker && (
            <DestinationPicker
              color={color}
              targetLevel="item"
              actionKind={copyMoveKind}
              sourceLabel={selectedFilesLabel}
              onConfirm={handleConfirmDestination}
              onCancel={handleCancelDestPicker}
            />
          )}
        </AnimatePresence>

        <ActionToast message={toastMessage} color={color} onDone={handleToastDone} />
      </div>
    </LazyMotion>
  )
}

export default memo(FileList)