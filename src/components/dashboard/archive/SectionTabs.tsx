// src/components/dashboard/archive/SectionTabs.tsx
"use client"

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, FolderOpen, Trash2, Pencil, Copy, FolderInput } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import DeleteConfirmModal from '@/components/dashboard/archive/DeleteConfirmModal'
import DestinationPicker, { type DestinationResult } from '@/components/dashboard/archive/DestinationPicker'
import ActionToast from '@/components/dashboard/archive/ActionToast'
import { SECTION_ICONS, type SectionIconKey } from '@/data/archiveMockData'
import {
  addSectionAction,
  updateSectionAction,
  deleteSectionAction,
  moveSectionAction,
  copySectionAction,
  type SectionRow,
  type SectionActionPayload,
} from '@/app/(dashboard)/archive/actions'

export { SECTION_ICONS }
export type { SectionIconKey }

/** Section هون هو SectionRow القادم من الباك اند — بديل عن Section القديم
    من archiveMockData (يلي كانت قائمة مشتركة عالميًا، مش مقيّدة بـwork_id). */
export type Section = SectionRow & { icon: SectionIconKey }

const ICON_KEYS = Object.keys(SECTION_ICONS) as SectionIconKey[]

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
  onAdd:   (payload: SectionActionPayload) => void
  onSave:  (dbId: string, updates: SectionActionPayload) => void
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

  const handleSubmit = useCallback(() => {
    if (!isValid) return
    const payload: SectionActionPayload = {
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      icon,
    }
    if (isEditing && editingSection) {
      onSave(editingSection.dbId, payload)
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

  const isDraggingFromBackdrop = useRef(false)
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingFromBackdrop.current = e.target === e.currentTarget
  }, [])
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingFromBackdrop.current && e.target === e.currentTarget) onClose()
    isDraggingFromBackdrop.current = false
  }, [onClose])

  const handleSelectIcon = useCallback((key: SectionIconKey) => setIcon(key), [])

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
      onMouseDown={handleBackdropMouseDown}
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
  canManage,
  onSelect,
  onEdit,
  onCopy,
  onMove,
  onDelete,
}: {
  section:   Section
  active:    boolean
  color:     string
  isDark:    boolean
  lang:      string
  canManage: boolean
  /** Takes the id, so one stable callback serves every tab. */
  onSelect: (id: string) => void
  onEdit:   (section: Section) => void
  onCopy:   (section: Section) => void
  onMove:   (section: Section) => void
  onDelete: (section: Section) => void
}) {
  const label = lang === 'ar' ? section.nameAr : section.nameEn
  const Icon  = SECTION_ICONS[section.icon] ?? FolderOpen

  const handleClick = useCallback(() => onSelect(section.dbId), [onSelect, section.dbId])
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(section)
  }, [onEdit, section])
  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCopy(section)
  }, [onCopy, section])
  const handleMoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onMove(section)
  }, [onMove, section])
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(section)
  }, [onDelete, section])

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

      {/* Edit / Copy / Move / Delete controls — canManage only, revealed on hover.
          Delete نفسها بعدين ممكن تنعزل بـcanDelete منفصل زي باقي المستويات —
          حاليًا موحّدة تحت canManage لأنه ما في مود صريح غيره بالتصميم الأصلي. */}
      {canManage && (
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

          <span
            role="button"
            onClick={handleCopyClick}
            className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
            style={{ color: active ? color : 'var(--foreground-muted)' }}
            title={lang === 'ar' ? 'نسخ التقسيم' : 'Copy section'}
          >
            <Copy className="w-2.5 h-2.5" />
          </span>

          <span
            role="button"
            onClick={handleMoveClick}
            className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
            style={{ color: active ? color : 'var(--foreground-muted)' }}
            title={lang === 'ar' ? 'نقل التقسيم' : 'Move section'}
          >
            <FolderInput className="w-2.5 h-2.5" />
          </span>

          <span
            role="button"
            onClick={handleDeleteClick}
            className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
            style={{ color: '#ef4444' }}
            title={lang === 'ar' ? 'حذف التقسيم' : 'Delete section'}
          >
            <Trash2 className="w-2.5 h-2.5" />
          </span>
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
  workId,
  color           = '#458482',
  initialSections,
  canManage       = false,
  canDelete       = false,
  onSectionChange,
}: {
  /** uuid العمل الأب — كل الأكشنز محتاجاه لحل صلاحية Manage Archive. */
  workId:           string
  color?:           string
  initialSections:  Section[]
  canManage?:       boolean
  canDelete?:       boolean
  onSectionChange?: (section: Section) => void
}) {
  const { lang, isRTL }             = useLang()
  const { theme }                   = useTheme()
  const isDark                      = theme === 'dark'
  const [sections, setSections]     = useState<Section[]>(initialSections)
  const [activeId, setActiveId]     = useState(initialSections[0]?.dbId ?? '')
  const [showModal, setShowModal]   = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  /** The section currently showing the big delete-confirmation popup, if any. */
  const [pendingDelete, setPendingDelete] = useState<Section | null>(null)
  /** The section currently being copied/moved, with which action, if any. */
  const [pendingCopyMove, setPendingCopyMove] = useState<{ section: Section; kind: 'copy' | 'move' } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const activeSection = useMemo(
    () => sections.find(s => s.dbId === activeId),
    [sections, activeId]
  )

  /* initialSections جاي من SectionTabsClient وبيتغيّر مضمونه (خصوصًا
     itemCount) لما SectionGrid يبلّغ بإضافة/حذف عنصر — بنزامن نسختنا
     المحلية عليه، بس بنحافظ على activeId الحالي إذا لسا موجود. مفتاح
     المزامنة يشمل itemCount عن قصد (مش بس الـids) عشان أي تغيير بالعداد
     يعكس فورًا. */
  const syncKey = useMemo(
    () => initialSections.map(s => `${s.dbId}:${s.itemCount}`).join('|'),
    [initialSections]
  )

  useEffect(() => {
    setSections(initialSections)
  }, [syncKey])

  const onSectionChangeRef = useRef(onSectionChange)
  onSectionChangeRef.current = onSectionChange

  useEffect(() => {
    if (activeSection) onSectionChangeRef.current?.(activeSection)
  }, [activeSection])

  const tx = useMemo(() => ({
    addSection: lang === 'ar' ? 'إضافة تقسيم' : 'Add Section',
    items:      lang === 'ar' ? 'عنصر'         : 'items',
    tabsLabel:  lang === 'ar' ? 'تقسيمات الأرشيف' : 'Archive sections',
  }), [lang])

  const handleSelect = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  /** Optimistic insert بـid مؤقت، ثم استبداله بالصف الحقيقي من السيرفر. */
  const handleAdd = useCallback(async (payload: SectionActionPayload) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Section = {
      dbId: tempId, id: tempId, workId,
      nameEn: payload.nameEn, nameAr: payload.nameAr,
      description: payload.description, descriptionAr: payload.descriptionAr,
      itemCount: 0, icon: payload.icon as SectionIconKey,
    }
    setSections(prev => [...prev, optimistic])
    setActiveId(tempId)

    try {
      const real = await addSectionAction(workId, payload)
      setSections(prev => prev.map(s => s.dbId === tempId ? { ...real, icon: real.icon as SectionIconKey } : s))
      setActiveId(prev => prev === tempId ? real.dbId : prev)
    } catch {
      setSections(prev => prev.filter(s => s.dbId !== tempId))
      setActiveId(prev => prev === tempId ? (sections[0]?.dbId ?? '') : prev)
    }
  }, [workId, sections])

  const handleOpenEdit = useCallback((section: Section) => {
    setEditingSection(section)
    setShowModal(true)
  }, [])

  const handleSaveEdit = useCallback(async (dbId: string, updates: SectionActionPayload) => {
    let previous: Section | undefined
    setSections(prev => prev.map(s => {
      if (s.dbId !== dbId) return s
      previous = s
      return { ...s, ...updates, icon: updates.icon as SectionIconKey }
    }))

    try {
      await updateSectionAction(dbId, workId, updates)
    } catch {
      if (previous) setSections(prev => prev.map(s => s.dbId === dbId ? previous! : s))
    }
  }, [workId])

  const handleRequestDelete = useCallback((section: Section) => {
    setPendingDelete(section)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    const targetIndex = sections.findIndex(s => s.dbId === target.dbId)

    setSections(prev => prev.filter(s => s.dbId !== target.dbId))
    setActiveId(prev => {
      if (prev !== target.dbId) return prev
      const fallback = sections.find(s => s.dbId !== target.dbId)
      return fallback?.dbId ?? ''
    })
    setPendingDelete(null)

    try {
      await deleteSectionAction(target.dbId)
    } catch {
      setSections(prev => {
        const next = [...prev]
        next.splice(targetIndex, 0, target)
        return next
      })
    }
  }, [pendingDelete, sections])

  const handleCancelDelete = useCallback(() => setPendingDelete(null), [])

  const handleRequestCopy = useCallback((section: Section) => {
    setPendingCopyMove({ section, kind: 'copy' })
  }, [])
  const handleRequestMove = useCallback((section: Section) => {
    setPendingCopyMove({ section, kind: 'move' })
  }, [])
  const handleCancelCopyMove = useCallback(() => setPendingCopyMove(null), [])

  /** التنفيذ الفعلي — move_section/copy_section RPCs (بيها منطق الدمج
      بنفس الاسم بالوجهة، جاهز بالباك اند). Optimistic: بالـmove بنشيل
      القسم محليًا فورًا (لأنه غادر هالعمل)، بالـcopy ما بنلمس شي محليًا
      (المصدر بيضل موجود، والنسخة صارت بعمل تاني ما إحنا واقفين فيه). */
  const handleConfirmSectionDestination = useCallback(async (dest: DestinationResult) => {
    if (!pendingCopyMove || !dest.workId) return
    const { section, kind } = pendingCopyMove
    const sectionName = lang === 'ar' ? section.nameAr : section.nameEn
    const sectionIndex = sections.findIndex(s => s.dbId === section.dbId)

    if (kind === 'move') {
      setSections(prev => prev.filter(s => s.dbId !== section.dbId))
      setActiveId(prev => {
        if (prev !== section.dbId) return prev
        const fallback = sections.find(s => s.dbId !== section.dbId)
        return fallback?.dbId ?? ''
      })
    }

    try {
      if (kind === 'move') {
        await moveSectionAction(section.dbId, dest.workId)
      } else {
        await copySectionAction(section.dbId, dest.workId)
      }
      setToastMessage(
        kind === 'move'
          ? (lang === 'ar' ? `تم نقل "${sectionName}"` : `Moved "${sectionName}"`)
          : (lang === 'ar' ? `تم نسخ "${sectionName}"` : `Copied "${sectionName}"`)
      )
    } catch {
      // rollback — لو فشل بالسيرفر (مثلاً صلاحية copy_move ناقصة بالوجهة)
      if (kind === 'move') {
        setSections(prev => {
          const next = [...prev]
          next.splice(sectionIndex, 0, section)
          return next
        })
      }
      setToastMessage(
        lang === 'ar' ? 'فشلت العملية — تأكد من صلاحياتك بالوجهة' : 'Action failed — check your permissions at the destination'
      )
    }

    setPendingCopyMove(null)
  }, [pendingCopyMove, sections, lang])

  const handleToastDone = useCallback(() => setToastMessage(null), [])

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

          {sections.map(s => (
            <SectionTab
              key={s.dbId}
              section={s}
              active={s.dbId === activeId}
              color={color}
              isDark={isDark}
              lang={lang}
              canManage={canManage}
              onSelect={handleSelect}
              onEdit={handleOpenEdit}
              onCopy={handleRequestCopy}
              onMove={handleRequestMove}
              onDelete={handleRequestDelete}
            />
          ))}

          {/* Divider */}
          {canManage && (
            <div className="w-px h-5 shrink-0 mx-1" style={{ background: 'var(--divider)' }} />
          )}

          {/* Add section button */}
          {canManage && (
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
              key={activeSection.dbId}
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

      <AnimatePresence>
        {pendingDelete && (
          <DeleteConfirmModal
            label={lang === 'ar' ? pendingDelete.nameAr : pendingDelete.nameEn}
            message={lang === 'ar'
              ? 'سيتم حذف هذا التقسيم نهائيًا مع كل العناصر والملفات بداخله. هذا الإجراء لا يمكن التراجع عنه.'
              : 'This section and everything inside it — items and files — will be permanently deleted. This cannot be undone.'}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingCopyMove && (
          <DestinationPicker
            color={color}
            targetLevel="work"
            actionKind={pendingCopyMove.kind}
            sourceLabel={lang === 'ar'
              ? `التقسيم: ${pendingCopyMove.section.nameAr}`
              : `Section: ${pendingCopyMove.section.nameEn}`}
            onConfirm={handleConfirmSectionDestination}
            onCancel={handleCancelCopyMove}
          />
        )}
      </AnimatePresence>

      <ActionToast message={toastMessage} color={color} onDone={handleToastDone} />
    </>
  )
}

export default memo(SectionTabs)