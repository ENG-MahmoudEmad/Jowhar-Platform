//src\components\dashboard\archive\SectionTabs.tsx
"use client"

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, FolderOpen, Trash2, Check, Pencil,
  Video, Image as ImageIcon, Music, FileText, Palette,
  Film, Mic, Archive, Layers, Sparkles, Camera, PenTool,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useUndoableDelete } from '@/lib/useUndoableDelete'
import UndoToastHost from '@/components/dashboard/archive/UndoToast'

/* ── Icon library ── */
/**
 * Curated set an admin picks from when creating a section — not an open text
 * field, so every section icon renders consistently and nothing breaks if a
 * typo'd icon name ever made it into the data. Extend this map to add more
 * choices; the *key* is what gets persisted (`Section.icon`), not the
 * component itself.
 */
export const SECTION_ICONS = {
  folder:  FolderOpen,
  video:   Video,
  image:   ImageIcon,
  music:   Music,
  file:    FileText,
  palette: Palette,
  film:    Film,
  mic:     Mic,
  archive: Archive,
  layers:  Layers,
  sparkles:Sparkles,
  camera:  Camera,
  pen:     PenTool,
} as const

export type SectionIconKey = keyof typeof SECTION_ICONS

const ICON_KEYS = Object.keys(SECTION_ICONS) as SectionIconKey[]

/* ── Types ── */
export interface Section {
  id:          string
  nameEn:      string
  nameAr:      string
  description:   string
  descriptionAr: string
  itemCount:   number
  icon:        SectionIconKey
}

/* ── Mock sections (replace with API later) ── */
export const INITIAL_SECTIONS: Section[] = [
  {
    id: 'published',
    nameEn: 'Published Posts',   nameAr: 'المنشورات',
    description: 'All published social media posts.',
    descriptionAr: 'جميع المنشورات المنشورة على وسائل التواصل الاجتماعي.',
    itemCount: 14, icon: 'folder',
  },
  {
    id: 'videos',
    nameEn: 'Videos',            nameAr: 'الفيديوهات',
    description: 'Produced and published video content.',
    descriptionAr: 'محتوى الفيديو المنتج والمنشور.',
    itemCount: 8, icon: 'video',
  },
  {
    id: 'designs',
    nameEn: 'Designs',           nameAr: 'التصاميم',
    description: 'Graphic design assets and deliverables.',
    descriptionAr: 'أصول التصميم الجرافيكي والمخرجات.',
    itemCount: 22, icon: 'palette',
  },
  {
    id: 'documents',
    nameEn: 'Documents',         nameAr: 'الوثائق',
    description: 'Scripts, briefs, and production documents.',
    descriptionAr: 'النصوص والموجزات ووثائق الإنتاج.',
    itemCount: 6, icon: 'file',
  },
]

/* ── Static style/handler constants (zero re-creation per render) ── */
const MODAL_OVERLAY_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
}

const handleCloseBtnEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'var(--hover-bg)'
}
const handleCloseBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'transparent'
}

const TAB_UNDERLINE_TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }

/**
 * Builds a URL-safe id from the English name, guaranteed not to collide with an
 * existing section. Two sections named the same would otherwise share an id,
 * which duplicates React keys and makes selecting one highlight the other.
 */
function makeUniqueSectionId(nameEn: string, existing: Section[]): string {
  const base =
    nameEn.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'

  if (!existing.some(s => s.id === base)) return base

  let suffix = 2
  while (existing.some(s => s.id === `${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

/* ── Icon picker (used inside Add Section modal) ── */
const IconPickerOption = memo(function IconPickerOption({
  iconKey, selected, color, isDark, onSelect,
}: {
  iconKey:  SectionIconKey
  selected: boolean
  color:    string
  isDark:   boolean
  onSelect: (key: SectionIconKey) => void
}) {
  const Icon = SECTION_ICONS[iconKey]
  const handleClick = useCallback(() => onSelect(iconKey), [onSelect, iconKey])

  const style = useMemo<React.CSSProperties>(() => ({
    background: selected ? color + '25' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
    border:     `1px solid ${selected ? color + '60' : 'transparent'}`,
    color:      selected ? color : 'var(--foreground-muted)',
    cursor:     'pointer',
  }), [selected, isDark, color])

  return (
    <button type="button" onClick={handleClick}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
      style={style}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
})

/* ── Add/Edit Section Modal ── */
const AddSectionModal = memo(function AddSectionModal({
  color,
  editingSection,
  onClose,
  onAdd,
  onSave,
}: {
  color:   string
  /** Present → editing an existing section; absent → creating one. */
  editingSection?: Section | null
  onClose: () => void
  onAdd:   (s: Omit<Section, 'id'>) => void
  onSave:  (id: string, updates: Omit<Section, 'id'>) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const isEditing       = !!editingSection

  const [nameEn,        setNameEn]        = useState(editingSection?.nameEn ?? '')
  const [nameAr,        setNameAr]        = useState(editingSection?.nameAr ?? '')
  const [description,   setDescription]   = useState(editingSection?.description ?? '')
  const [descriptionAr, setDescriptionAr] = useState(editingSection?.descriptionAr ?? '')
  const [icon,          setIcon]          = useState<SectionIconKey>(editingSection?.icon ?? 'folder')

  const tx = useMemo(() => ({
    titleAdd:  lang === 'ar' ? 'إضافة تقسيم جديد'    : 'Add New Section',
    titleEdit: lang === 'ar' ? 'تعديل التقسيم'        : 'Edit Section',
    nameEn:  lang === 'ar' ? 'الاسم بالإنجليزي'     : 'English Name',
    nameAr:  lang === 'ar' ? 'الاسم بالعربي'        : 'Arabic Name',
    descEn:  lang === 'ar' ? 'الوصف بالإنجليزي'     : 'English Description',
    descAr:  lang === 'ar' ? 'الوصف بالعربي'        : 'Arabic Description',
    icon:    lang === 'ar' ? 'الأيقونة'             : 'Icon',
    add:     lang === 'ar' ? 'إضافة التقسيم'        : 'Add Section',
    save:    lang === 'ar' ? 'حفظ التعديلات'         : 'Save Changes',
    cancel:  lang === 'ar' ? 'إلغاء'                : 'Cancel',
  }), [lang])

  const inputStyle = useMemo(() => ({
    background:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
    color:        'var(--foreground)',
    borderRadius: '10px',
    padding:      '8px 12px',
    fontSize:     '12px',
    width:        '100%',
    outline:      'none',
  }), [isDark])

  const labelStyle = useMemo(() => ({
    fontSize:      '10px',
    fontWeight:    700,
    color:         'var(--foreground-muted)',
    marginBottom:  '4px',
    display:       'block',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  const isValid = !!(nameEn.trim() && nameAr.trim())

  /* Emits a draft without an id when adding — the parent owns id generation.
     When editing, calls onSave with the existing id instead. */
  const handleSubmit = useCallback(() => {
    if (!isValid) return
    const payload = {
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      itemCount:     editingSection?.itemCount ?? 0,
      icon,
    }
    if (isEditing && editingSection) {
      onSave(editingSection.id, payload)
    } else {
      onAdd(payload)
    }
    onClose()
  }, [isValid, isEditing, editingSection, nameEn, nameAr, description, descriptionAr, icon, onAdd, onSave, onClose])

  const headerIconStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${color}, ${color}99)`,
  }), [color])

  const addBtnStyle = useMemo(() => ({
    background: !isValid ? 'var(--hover-bg)' : `linear-gradient(135deg, ${color}, ${color}cc)`,
    color:      !isValid ? 'var(--foreground-muted)' : '#ffffff',
    cursor:     !isValid ? 'not-allowed' : 'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    transition: 'filter 0.18s',
  }), [isValid, color, lang])

  const handleAddBtnEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isValid) e.currentTarget.style.filter = 'brightness(1.1)'
  }, [isValid])
  const handleAddBtnLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter = 'brightness(1)'
  }, [])

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const handleSelectIcon = useCallback((key: SectionIconKey) => setIcon(key), [])

  /* Escape closes the dialog — expected of any modal, and the only way out for
     keyboard users who never reach the close button. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={MODAL_OVERLAY_STYLE}
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow:  '0 24px 64px rgba(0,0,0,0.4)',
          cursor:     'default',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={headerIconStyle}>
              {isEditing ? <Pencil className="w-3.5 h-3.5 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-sm font-black" style={{
              color:      'var(--foreground)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            }}>
              {isEditing ? tx.titleEdit : tx.titleAdd}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }}
            onMouseEnter={handleCloseBtnEnter}
            onMouseLeave={handleCloseBtnLeave}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{tx.nameEn}</label>
              <input
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="e.g. Published Posts"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{tx.nameAr}</label>
              <input
                value={nameAr}
                onChange={e => setNameAr(e.target.value)}
                placeholder="مثال: المنشورات"
                dir="rtl"
                style={{ ...inputStyle, fontFamily: 'var(--font-arabic)' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{tx.descEn}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description in English..."
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>
          <div>
            <label style={labelStyle}>{tx.descAr}</label>
            <textarea
              value={descriptionAr}
              onChange={e => setDescriptionAr(e.target.value)}
              placeholder="وصف مختصر بالعربي..."
              dir="rtl"
              rows={2}
              style={{ ...inputStyle, resize: 'none', fontFamily: 'var(--font-arabic)' }}
            />
          </div>

          {/* Icon picker */}
          <div>
            <label style={labelStyle}>{tx.icon}</label>
            <div className="flex flex-wrap gap-2">
              {ICON_KEYS.map(key => (
                <IconPickerOption
                  key={key}
                  iconKey={key}
                  selected={icon === key}
                  color={color}
                  isDark={isDark}
                  onSelect={handleSelectIcon}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={{
              background: 'var(--hover-bg)',
              color:      'var(--foreground-muted)',
              cursor:     'pointer',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {tx.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={addBtnStyle}
            onMouseEnter={handleAddBtnEnter}
            onMouseLeave={handleAddBtnLeave}
          >
            {isEditing ? tx.save : tx.add}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
})

/* ── Single tab item (extracted for stable, isolated re-renders) ── */
const SectionTab = memo(function SectionTab({
  section,
  active,
  color,
  isDark,
  lang,
  isAdmin,
  onSelect,
  onEdit,
  onDelete,
}: {
  section:  Section
  active:   boolean
  color:    string
  isDark:   boolean
  lang:     string
  isAdmin:  boolean
  /** Takes the id, so one stable callback serves every tab. */
  onSelect: (id: string) => void
  onEdit:   (section: Section) => void
  onDelete: (id: string) => void
}) {
  const label = lang === 'ar' ? section.nameAr : section.nameEn
  const Icon  = SECTION_ICONS[section.icon] ?? FolderOpen

  /* Delete goes through an inline confirm (✓/✕ in place of the trash icon) —
     same pattern used for News Feed deletion elsewhere in the app, rather
     than a separate confirmation modal. Confirming schedules a 10s-undoable
     delete at the parent rather than removing anything immediately here. */
  const [confirming, setConfirming] = useState(false)

  const handleClick = useCallback(() => onSelect(section.id), [onSelect, section.id])
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(section)
  }, [onEdit, section])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!active) e.currentTarget.style.background = 'var(--hover-bg)'
  }, [active])
  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!active) e.currentTarget.style.background = 'transparent'
  }, [active])

  const handleDeleteIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(true)
  }, [])
  const handleConfirmDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(section.id)
  }, [onDelete, section.id])
  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }, [])

  const tabStyle = useMemo<React.CSSProperties>(() => ({
    background: active
      ? isDark ? `${color}22` : `${color}15`
      : 'transparent',
    color:   active ? color : 'var(--foreground-muted)',
    border:  active
      ? `1px solid ${color}40`
      : `1px solid transparent`,
    cursor:     'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [active, isDark, color, lang])

  const countBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: active ? color + '25' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    color:      active ? color : 'var(--foreground-muted)',
  }), [active, color, isDark])

  const underlineStyle = useMemo(() => ({ background: color }), [color])

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={handleClick}
      className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all duration-200"
      style={tabStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black" style={countBadgeStyle}>
        {section.itemCount}
      </span>

      {/* Edit + Delete controls — admin only, revealed on hover */}
      {isAdmin && (
        <span className="flex items-center gap-1 ms-0.5">
          <span
            role="button"
            onClick={handleEditClick}
            className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
            style={{ color: active ? color : 'var(--foreground-muted)' }}
            title={lang === 'ar' ? 'تعديل التقسيم' : 'Edit section'}
          >
            <Pencil className="w-2.5 h-2.5" />
          </span>

          {confirming ? (
            <span className="flex items-center gap-1">
              <span
                role="button"
                onClick={handleConfirmDelete}
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: '#ef444425', color: '#ef4444' }}
                title={lang === 'ar' ? 'تأكيد الحذف' : 'Confirm delete'}
              >
                <Check className="w-2.5 h-2.5" />
              </span>
              <span
                role="button"
                onClick={handleCancelDelete}
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', color: 'var(--foreground-muted)' }}
                title={lang === 'ar' ? 'إلغاء' : 'Cancel'}
              >
                <X className="w-2.5 h-2.5" />
              </span>
            </span>
          ) : (
            <span
              role="button"
              onClick={handleDeleteIconClick}
              className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
              style={{ color: '#ef4444' }}
              title={lang === 'ar' ? 'حذف التقسيم' : 'Delete section'}
            >
              <Trash2 className="w-2.5 h-2.5" />
            </span>
          )}
        </span>
      )}

      {/* Active underline */}
      {active && (
        <motion.div
          layoutId="tab-underline"
          className="absolute bottom-0 inset-x-3 h-0.5 rounded-full"
          style={underlineStyle}
          transition={TAB_UNDERLINE_TRANSITION}
        />
      )}
    </button>
  )
})

/* ── SectionTabs ── */
function SectionTabs({
  platformId,
  color           = '#458482',
  initialSections = INITIAL_SECTIONS,
  isAdmin         = true,
  onSectionChange,
}: {
  platformId:       string
  color?:           string
  initialSections?: Section[]
  isAdmin?:         boolean
  onSectionChange?: (section: Section) => void
}) {
  const { lang, isRTL }             = useLang()
  const { theme }                   = useTheme()
  const isDark                      = theme === 'dark'
  const [sections, setSections]     = useState<Section[]>(initialSections)
  const [activeId, setActiveId]     = useState(initialSections[0]?.id ?? '')
  const [showModal, setShowModal]   = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)

  const { pendingDeletions, isPending, scheduleDelete, undo } = useUndoableDelete()

  /* Sections mid-delete-countdown vanish from the tab row immediately — the
     undo toast is what keeps them recoverable, not their continued presence
     here. */
  const visibleSections = useMemo(
    () => sections.filter(s => !isPending(s.id)),
    [sections, isPending]
  )

  /* A useState initialiser runs ONCE. Without this sync, sections arriving after
     the first render — a different platform, or data that was still loading —
     were ignored forever, leaving the tab row empty until something remounted
     the component. Keyed off the section ids rather than the array itself, since
     a parent that builds the array inline hands us a new reference every render
     and would otherwise loop. */
  const sectionsKey = useMemo(
    () => initialSections.map(s => s.id).join('|'),
    [initialSections],
  )

  useEffect(() => {
    setSections(initialSections)
    // Keep the current tab if it still exists (e.g. the list was merely refreshed),
    // otherwise fall back to the first one.
    setActiveId(prev =>
      initialSections.some(s => s.id === prev) ? prev : (initialSections[0]?.id ?? '')
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId, sectionsKey])

  const activeSection = useMemo(
    () => visibleSections.find(s => s.id === activeId),
    [visibleSections, activeId]
  )

  /* Kept in a ref so the notification effect below doesn't re-fire just because
     the parent passed a new inline function. */
  const onSectionChangeRef = useRef(onSectionChange)
  onSectionChangeRef.current = onSectionChange

  /* The parent previously only learned about a section when the user clicked one,
     so on first load it had no active section and rendered nothing. Reporting the
     resolved section here covers the initial mount and platform switches too. */
  useEffect(() => {
    if (activeSection) onSectionChangeRef.current?.(activeSection)
  }, [activeSection])

  const tx = useMemo(() => ({
    addSection: lang === 'ar' ? 'إضافة تقسيم' : 'Add Section',
    items:      lang === 'ar' ? 'عنصر'         : 'items',
    tabsLabel:  lang === 'ar' ? 'تقسيمات الأرشيف' : 'Archive sections',
  }), [lang])

  /* Selection only sets state; the effect above is the single place that notifies
     the parent, so a click can't produce two notifications. */
  const handleSelect = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const handleAdd = useCallback((draft: Omit<Section, 'id'>) => {
    const id = makeUniqueSectionId(draft.nameEn, sections)
    setSections(prev => [...prev, { ...draft, id }])
    setActiveId(id)
  }, [sections])

  const handleOpenEdit = useCallback((section: Section) => {
    setEditingSection(section)
    setShowModal(true)
  }, [])

  const handleSaveEdit = useCallback((id: string, updates: Omit<Section, 'id'>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  /* Deleting the active section falls back to the first remaining visible one
     — same "keep current if possible, otherwise first" rule the sync effect
     above already uses. The section itself isn't removed from `sections` yet
     — only hidden via `isPending` — so `undo` can bring it straight back with
     no data loss. Only the 10s timeout's finalize callback actually removes
     it. */
  const handleDelete = useCallback((id: string) => {
    const target = sections.find(s => s.id === id)
    if (!target) return

    if (activeId === id) {
      const fallback = sections.find(s => s.id !== id)
      setActiveId(fallback?.id ?? '')
    }

    const label = lang === 'ar' ? target.nameAr : target.nameEn
    scheduleDelete(id, label, () => {
      setSections(prev => prev.filter(s => s.id !== id))
    })
  }, [sections, activeId, lang, scheduleDelete])

  const handleOpenModal = useCallback(() => { setEditingSection(null); setShowModal(true) }, [])
  const handleCloseModal = useCallback(() => { setShowModal(false); setEditingSection(null) }, [])

  const addSectionBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: 'transparent',
    border:     `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
    color:      'var(--foreground-muted)',
    cursor:     'pointer',
    transition: 'border-color 0.2s, color 0.2s',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isDark, lang])

  const handleAddSectionEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = color + '60'
    e.currentTarget.style.color       = color
  }, [color])
  const handleAddSectionLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
    e.currentTarget.style.color       = 'var(--foreground-muted)'
  }, [isDark])

  return (
    <>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="select-none">

        {/* Tabs row */}
        <div
          role="tablist"
          aria-label={tx.tabsLabel}
          className="flex items-center gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >

          {visibleSections.map(s => (
            <SectionTab
              key={s.id}
              section={s}
              active={s.id === activeId}
              color={color}
              isDark={isDark}
              lang={lang}
              isAdmin={isAdmin}
              onSelect={handleSelect}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}

          {/* Divider */}
          {isAdmin && (
            <div className="w-px h-5 shrink-0 mx-1" style={{ background: 'var(--divider)' }} />
          )}

          {/* Add section button — admin only */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold shrink-0"
              style={addSectionBtnStyle}
              onMouseEnter={handleAddSectionEnter}
              onMouseLeave={handleAddSectionLeave}
            >
              <Plus className="w-3 h-3" />
              {tx.addSection}
            </button>
          )}
        </div>

        {/* Active section description */}
        <AnimatePresence mode="wait">
          {activeSection && (
            <motion.div
              key={activeSection.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-3 text-[11px]"
              style={{
                color:      'var(--foreground-muted)',
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}
            >
              {lang === 'ar' ? activeSection.descriptionAr : activeSection.description}
              <span className="mx-2 opacity-30">·</span>
              <span style={{ color }}>{activeSection.itemCount} {tx.items}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AddSectionModal
            color={color}
            editingSection={editingSection}
            onClose={handleCloseModal}
            onAdd={handleAdd}
            onSave={handleSaveEdit}
          />
        )}
      </AnimatePresence>

      <UndoToastHost deletions={pendingDeletions} onUndo={undo} color={color} />
    </>
  )
}

export default memo(SectionTabs)