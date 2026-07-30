"use client"

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, FolderOpen } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

/* ── Types ── */
export interface Section {
  id:          string
  nameEn:      string
  nameAr:      string
  description:   string
  descriptionAr: string
  itemCount:   number
}

/* ── Mock sections (replace with API later) ── */
const INITIAL_SECTIONS: Section[] = [
  {
    id: 'published',
    nameEn: 'Published Posts',   nameAr: 'المنشورات',
    description: 'All published social media posts.',
    descriptionAr: 'جميع المنشورات المنشورة على وسائل التواصل الاجتماعي.',
    itemCount: 14,
  },
  {
    id: 'videos',
    nameEn: 'Videos',            nameAr: 'الفيديوهات',
    description: 'Produced and published video content.',
    descriptionAr: 'محتوى الفيديو المنتج والمنشور.',
    itemCount: 8,
  },
  {
    id: 'designs',
    nameEn: 'Designs',           nameAr: 'التصاميم',
    description: 'Graphic design assets and deliverables.',
    descriptionAr: 'أصول التصميم الجرافيكي والمخرجات.',
    itemCount: 22,
  },
  {
    id: 'documents',
    nameEn: 'Documents',         nameAr: 'الوثائق',
    description: 'Scripts, briefs, and production documents.',
    descriptionAr: 'النصوص والموجزات ووثائق الإنتاج.',
    itemCount: 6,
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

/* ── Add Section Modal ── */
const AddSectionModal = memo(function AddSectionModal({
  color,
  onClose,
  onAdd,
}: {
  color:   string
  onClose: () => void
  onAdd:   (s: Omit<Section, 'id'>) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'

  const [nameEn,        setNameEn]        = useState('')
  const [nameAr,        setNameAr]        = useState('')
  const [description,   setDescription]   = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')

  const tx = useMemo(() => ({
    title:   lang === 'ar' ? 'إضافة تقسيم جديد'    : 'Add New Section',
    nameEn:  lang === 'ar' ? 'الاسم بالإنجليزي'     : 'English Name',
    nameAr:  lang === 'ar' ? 'الاسم بالعربي'        : 'Arabic Name',
    descEn:  lang === 'ar' ? 'الوصف بالإنجليزي'     : 'English Description',
    descAr:  lang === 'ar' ? 'الوصف بالعربي'        : 'Arabic Description',
    add:     lang === 'ar' ? 'إضافة التقسيم'        : 'Add Section',
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

  /* Emits a draft without an id — the parent owns id generation, since only it
     knows the current list and can guarantee uniqueness. */
  const handleAdd = useCallback(() => {
    if (!isValid) return
    onAdd({
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      itemCount:     0,
    })
    onClose()
  }, [isValid, nameEn, nameAr, description, descriptionAr, onAdd, onClose])

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
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-black" style={{
              color:      'var(--foreground)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            }}>
              {tx.title}
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
            onClick={handleAdd}
            disabled={!isValid}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={addBtnStyle}
            onMouseEnter={handleAddBtnEnter}
            onMouseLeave={handleAddBtnLeave}
          >
            {tx.add}
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
  onSelect,
}: {
  section:  Section
  active:   boolean
  color:    string
  isDark:   boolean
  lang:     string
  /** Takes the id, so one stable callback serves every tab. */
  onSelect: (id: string) => void
}) {
  const label = lang === 'ar' ? section.nameAr : section.nameEn

  const handleClick = useCallback(() => onSelect(section.id), [onSelect, section.id])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!active) e.currentTarget.style.background = 'var(--hover-bg)'
  }, [active])
  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!active) e.currentTarget.style.background = 'transparent'
  }, [active])

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
      className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all duration-200"
      style={tabStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <FolderOpen className="w-3.5 h-3.5 shrink-0" />
      {label}
      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black" style={countBadgeStyle}>
        {section.itemCount}
      </span>

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
    () => sections.find(s => s.id === activeId),
    [sections, activeId]
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

  const handleOpenModal = useCallback(() => setShowModal(true), [])
  const handleCloseModal = useCallback(() => setShowModal(false), [])

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

          {sections.map(s => (
            <SectionTab
              key={s.id}
              section={s}
              active={s.id === activeId}
              color={color}
              isDark={isDark}
              lang={lang}
              onSelect={handleSelect}
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
            onClose={handleCloseModal}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default memo(SectionTabs)