// src/components/dashboard/archive/WorksGrid.tsx
"use client"

import { useState, useRef, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, ChevronRight, Briefcase, Plus, X, Upload, Lock, Search, FileStack, Pencil, Trash2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'
import ViewToggle, { type ViewMode } from '@/components/dashboard/archive/ViewToggle'
import { useSmartSearch } from '@/lib/useSmartSearch'
import { useArchiveViewMode } from '@/lib/useArchiveViewMode'
import DeleteConfirmModal from '@/components/dashboard/archive/DeleteConfirmModal'
import {
  addWorkAction,
  updateWorkAction,
  deleteWorkAction,
  uploadArchiveImageAction,
  type WorkRow,
  type WorkActionPayload,
} from '@/app/(dashboard)/archive/actions'

/** Work هون هو WorkRow القادم من الباك اند (page.tsx) — بديل عن Work
    القديم من archiveMockData. */
export type Work = WorkRow


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

const handleUploadBtnEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.filter = 'brightness(1.1)'
}
const handleUploadBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.filter = 'brightness(1)'
}

const OPEN_BUTTON_STYLE_BASE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.22)',
  border:     '1px solid rgba(255,255,255,0.45)',
  width:      'fit-content',
  transition: 'background-color 0.18s, border-color 0.18s',
}

const handleOpenBtnEnter = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = 'rgba(255,255,255,0.32)'
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'
}
const handleOpenBtnLeave = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'
}

/* ── Add Work Modal ── */
const AddWorkModal = memo(function AddWorkModal({
  color,
  editingWork,
  onClose,
  onAdd,
  onSave,
}: {
  color:      string
  /** Present → editing an existing work; absent → creating one. */
  editingWork?: Work | null
  onClose:    () => void
  onAdd:      (payload: WorkActionPayload) => void
  onSave:     (dbId: string, updates: WorkActionPayload) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const isEditing        = !!editingWork

  const [nameEn,        setNameEn]        = useState(editingWork?.nameEn ?? '')
  const [nameAr,        setNameAr]        = useState(editingWork?.nameAr ?? '')
  const [description,   setDescription]   = useState(editingWork?.description ?? '')
  const [descriptionAr, setDescriptionAr] = useState(editingWork?.descriptionAr ?? '')
  const [thumbnailUrl,  setThumbnailUrl]  = useState(editingWork?.thumbnail ?? '')

  const tx = useMemo(() => ({
    titleAdd:   lang === 'ar' ? 'إضافة عمل جديد'        : 'Add New Work',
    titleEdit:  lang === 'ar' ? 'تعديل العمل'           : 'Edit Work',
    nameEn:     lang === 'ar' ? 'الاسم بالإنجليزي'       : 'English Name',
    nameAr:     lang === 'ar' ? 'الاسم بالعربي'          : 'Arabic Name',
    descEn:     lang === 'ar' ? 'الوصف بالإنجليزي'       : 'English Description',
    descAr:     lang === 'ar' ? 'الوصف بالعربي'          : 'Arabic Description',
    thumbnail:  lang === 'ar' ? 'رابط الصورة'            : 'Image URL',
    choose:     lang === 'ar' ? 'اختر صورة'              : 'Choose File',
    remove:     lang === 'ar' ? 'حذف'                    : 'Remove',
    add:        lang === 'ar' ? 'إضافة العمل'            : 'Add Work',
    save:       lang === 'ar' ? 'حفظ التعديلات'          : 'Save Changes',
    cancel:     lang === 'ar' ? 'إلغاء'                  : 'Cancel',
    preview:    lang === 'ar' ? 'معاينة'                 : 'Preview',
  }), [lang])

  const isValid = !!(nameEn.trim() && nameAr.trim())

  const handleSubmit = useCallback(() => {
    if (!isValid || uploading) return
    const payload: WorkActionPayload = {
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      thumbnail:     thumbnailUrl.trim() || undefined,
    }
    if (isEditing && editingWork) {
      onSave(editingWork.dbId, payload)
    } else {
      onAdd(payload)
    }
    onClose()
  }, [isValid, isEditing, editingWork, nameEn, nameAr, description, descriptionAr, thumbnailUrl, onAdd, onSave, onClose])

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadError('')
    const previewUrl = URL.createObjectURL(file)
    setThumbnailUrl(previewUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'works')
      const realUrl = await uploadArchiveImageAction(formData)
      setThumbnailUrl(realUrl)
    } catch {
      setThumbnailUrl('')
      setUploadError(
        lang === 'ar'
          ? 'فشل رفع الصورة — تأكد إنها أقل من 2MB وبصيغة صورة صحيحة'
          : 'Upload failed — make sure it is under 2MB and a valid image'
      )
    } finally {
      setUploading(false)
      URL.revokeObjectURL(previewUrl)
    }
  }, [lang])

  const handleRemoveThumbnail = useCallback(() => { setThumbnailUrl(''); setUploadError('') }, [])
  const handleChooseFile = useCallback(() => fileInputRef.current?.click(), [])
  const isDraggingFromBackdrop = useRef(false)
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingFromBackdrop.current = e.target === e.currentTarget
  }, [])
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingFromBackdrop.current && e.target === e.currentTarget) onClose()
    isDraggingFromBackdrop.current = false
  }, [onClose])

  const inputStyle = useMemo<React.CSSProperties>(() => ({
    background:  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border:      `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
    color:       'var(--foreground)',
    borderRadius: '10px',
    padding:     '8px 12px',
    fontSize:    '12px',
    width:       '100%',
    outline:     'none',
    fontFamily:  lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isDark, lang])

  const labelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize:      '10px',
    fontWeight:    700,
    color:         'var(--foreground-muted)',
    marginBottom:  '4px',
    display:       'block',
    fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  }), [lang])

  const uploadBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: color + '20',
    border:     `1px solid ${color}45`,
    color,
    cursor:     'pointer',
    whiteSpace: 'nowrap',
  }), [color])

  const addBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: (!isValid || uploading) ? 'var(--hover-bg)' : `linear-gradient(135deg, ${color}, ${color}cc)`,
    color:      (!isValid || uploading) ? 'var(--foreground-muted)' : '#ffffff',
    cursor:     (!isValid || uploading) ? 'not-allowed' : 'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isValid, color, lang, uploading])

  const iconWrapStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}, ${color}99)`,
  }), [color])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      style={MODAL_OVERLAY_STYLE}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow:  '0 24px 64px rgba(0,0,0,0.4)',
          maxHeight:  '90vh',
          cursor:     'default',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconWrapStyle}>
              {isEditing ? <Pencil className="w-3.5 h-3.5 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-sm font-black" style={{
              color: 'var(--foreground)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            }}>
              {isEditing ? tx.titleEdit : tx.titleAdd}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }}
            onMouseEnter={handleCloseBtnEnter}
            onMouseLeave={handleCloseBtnLeave}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar" style={{ flex: 1 }}>

          {/* Preview */}
          <div className="rounded-xl overflow-hidden h-20 relative flex items-center px-4 gap-3"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)`, border: `1px solid ${color}30` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: color + '30', border: `1px solid ${color}40` }}>
              {thumbnailUrl
                ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                : <span className="text-lg font-black" style={{ color, fontFamily: 'var(--font-display)' }}>
                    {(nameEn || 'W').charAt(0).toUpperCase()}
                  </span>
              }
            </div>
            <div>
              <div className="text-sm font-black" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
                {lang === 'ar' ? (nameAr || '—') : (nameEn || '—')}
              </div>
            </div>
            <span className="absolute top-2 text-[9px] font-bold uppercase tracking-widest"
              style={{ [isRTL ? 'left' : 'right']: '12px', color: 'var(--foreground-muted)' }}>
              {tx.preview}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{tx.nameEn}</label>
              <input
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="e.g. The First Film"
                style={inputStyle}
                disabled={isEditing}
                title={isEditing ? (lang === 'ar' ? 'الاسم الإنجليزي والرابط لا يتغيران بعد الإنشاء' : 'English name / slug cannot change after creation') : undefined}
              />
            </div>
            <div>
              <label style={labelStyle}>{tx.nameAr}</label>
              <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: الفلم الأول" dir="rtl"
                style={{ ...inputStyle, fontFamily: 'var(--font-arabic)' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{tx.descEn}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description in English..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div>
            <label style={labelStyle}>{tx.descAr}</label>
            <textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)}
              placeholder="وصف مختصر بالعربي..." dir="rtl" rows={2}
              style={{ ...inputStyle, resize: 'none', fontFamily: 'var(--font-arabic)' }} />
          </div>

          <div>
            <label style={labelStyle}>{tx.thumbnail}</label>
            <div className="flex gap-2">
              <input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)}
                placeholder="/works/film-1.png" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleChooseFile}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all shrink-0"
                style={{ ...uploadBtnStyle, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
                onMouseEnter={handleUploadBtnEnter}
                onMouseLeave={handleUploadBtnLeave}
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : tx.choose}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {uploadError && (
              <p className="text-[9px] mt-1" style={{ color: '#ef4444' }}>{uploadError}</p>
            )}
            {thumbnailUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={thumbnailUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)', opacity: uploading ? 0.5 : 1 }} />
                {!uploading && (
                  <button onClick={handleRemoveThumbnail} className="text-[9px]" style={{ color: '#ef4444', cursor: 'pointer' }}>
                    {tx.remove}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-bold transition-colors"
            style={{ background: 'var(--hover-bg)', color: 'var(--foreground-muted)', cursor: 'pointer', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {tx.cancel}
          </button>
          <button onClick={handleSubmit} disabled={!isValid || uploading}
            className="px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
            style={addBtnStyle}
          >
            {isEditing ? tx.save : tx.add}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
})

/* ── Open Work button ── */
const OpenButton = memo(function OpenButton({ label, color }: { label: string; color: string }) {
  const style = useMemo(() => ({
    ...OPEN_BUTTON_STYLE_BASE,
    boxShadow: `0 10px 24px ${color}22`,
  }), [color])

  return (
    <div
      className="group inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[12px] font-bold text-white cursor-pointer select-none"
      style={style}
      onMouseEnter={handleOpenBtnEnter}
      onMouseLeave={handleOpenBtnLeave}
    >
      <FolderOpen className="h-4 w-4 shrink-0" />
      <span className="leading-none">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
    </div>
  )
})

/* ── Single work card ── */
const WorkCard = memo(function WorkCard({
  work, color, index, platformSlug, canManage, canDelete, onEdit, onDelete,
}: {
  work:         Work
  color:        string
  index:        number
  platformSlug: string
  canManage:    boolean
  canDelete:    boolean
  onEdit:       (work: Work) => void
  onDelete:     (work: Work) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const router          = useRouter()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? work.nameAr        : work.nameEn
  const desc = lang === 'ar' ? work.descriptionAr : work.description

  const tx = useMemo(() => ({
    sections: lang === 'ar' ? 'تقسيم'    : 'sections',
    files:    lang === 'ar' ? 'ملف'      : 'files',
    open:     lang === 'ar' ? 'فتح العمل' : 'Open Work',
  }), [lang])

  const firstLetter = useMemo(
    () => (lang === 'ar' ? work.nameAr : work.nameEn).charAt(0),
    [lang, work.nameAr, work.nameEn]
  )

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])
  const handleClick = useCallback(
    () => router.push(`/archive/${platformSlug}/${work.id}`),
    [router, platformSlug, work.id]
  )
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(work)
  }, [onEdit, work])
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(work)
  }, [onDelete, work])

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark
      ? `linear-gradient(145deg, #161b22, ${color}15)`
      : `linear-gradient(145deg, #ffffff, ${color}10)`,
    border:     `1px solid ${hovered ? color + '55' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
    boxShadow:  hovered ? `0 8px 32px ${color}28` : 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  }), [isDark, hovered, color])

  const thumbBgStyle = useMemo<React.CSSProperties>(() => ({
    aspectRatio: '1 / 1',
    background:  `linear-gradient(135deg, ${color}22, ${color}08)`,
  }), [color])

  const radialStyle = useMemo<React.CSSProperties>(() => ({
    backgroundImage: `radial-gradient(circle at 30% 50%, ${color}35 0%, transparent 60%),
                      radial-gradient(circle at 80% 20%, ${color}20 0%, transparent 50%)`,
  }), [color])

  const topLineStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${color}, transparent)`,
  }), [isRTL, color])

  const chevronStyle = useMemo<React.CSSProperties>(() => ({
    color,
    transform: hovered
      ? isRTL ? 'rotate(180deg) translateX(4px)' : 'translateX(4px)'
      : isRTL ? 'rotate(180deg)' : 'none',
  }), [color, hovered, isRTL])

  const overlayStyle = useMemo<React.CSSProperties>(() => ({
    pointerEvents: hovered ? 'auto' : 'none',
    cursor:        'pointer',
    background: `linear-gradient(to top,
      ${color}ff 0%, ${color}f5 25%, ${color}dd 50%, ${color}99 70%, transparent 100%)`,
  }), [hovered, color])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {(canManage || canDelete) && (
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="absolute top-2.5 z-20 flex gap-1.5"
          style={{ [isRTL ? 'left' : 'right']: '10px' }}
        >
          {canManage && (
            <button
              onClick={handleEditClick}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(8,15,18,0.55)', color: '#ffffff', backdropFilter: 'blur(6px)' }}
              title={lang === 'ar' ? 'تعديل العمل' : 'Edit work'}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete — gated by canDelete (Chief Admin / Developer only), نفس
              القاعدة بكل مكان تاني بالأرشيف. */}
          {canDelete && (
            <button
              onClick={handleDeleteClick}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(8,15,18,0.55)', color: '#ff8080', backdropFilter: 'blur(6px)' }}
              title={lang === 'ar' ? 'حذف العمل' : 'Delete work'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}

      <div className="relative w-full overflow-hidden" style={thumbBgStyle}>
        <div className="absolute inset-0" style={radialStyle} />

        {!work.thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center select-none">
            <span className="font-black" style={{
              fontSize: 'clamp(4rem, 8vw, 7rem)', color: color + '30',
              fontFamily: 'var(--font-display)', lineHeight: 1,
            }}>
              {firstLetter}
            </span>
          </div>
        )}

        {work.thumbnail && (
          <img src={work.thumbnail} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        )}

        <div className="absolute top-0 inset-x-0 h-0.5" style={topLineStyle} />

        <div className="absolute bottom-3 flex items-center gap-2" style={{ [isRTL ? 'right' : 'left']: '12px' }}>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
            background: 'rgba(8,15,18,0.30)', color: '#ffffff', border: `1px solid ${color}80`,
            backdropFilter: 'blur(8px)', textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}>
            {work.sectionCount} {tx.sections}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
            background: 'rgba(8,15,18,0.24)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(8px)', textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}>
            {work.fileCount} {tx.files}
          </span>
        </div>
      </div>

      <div className="px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black truncate" style={{
            color: 'var(--foreground)',
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            letterSpacing: lang === 'ar' ? 0 : '-0.01em',
          }}>
            {name}
          </h3>
          <ChevronRight className="w-4 h-4 shrink-0 transition-all duration-300" style={chevronStyle} />
        </div>
      </div>

      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-10 flex flex-col justify-end p-5"
        style={overlayStyle}
      >
        <motion.div
          animate={{ y: hovered ? 0 : 10, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <p className="text-[11px] text-white/90 mb-3 leading-relaxed"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {desc}
          </p>
          <OpenButton label={tx.open} color={color} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
})

/* ── List row (List view mode) ── */
const WorkListRow = memo(function WorkListRow({
  work, color, index, platformSlug,
}: {
  work:         Work
  color:        string
  index:        number
  platformSlug: string
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const router          = useRouter()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? work.nameAr        : work.nameEn
  const desc = lang === 'ar' ? work.descriptionAr : work.description

  const tx = useMemo(() => ({
    sections: lang === 'ar' ? 'تقسيم' : 'sections',
    files:    lang === 'ar' ? 'ملف'   : 'files',
  }), [lang])

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])
  const handleClick = useCallback(
    () => router.push(`/archive/${platformSlug}/${work.id}`),
    [router, platformSlug, work.id]
  )

  const rowStyle = useMemo<React.CSSProperties>(() => ({
    background: hovered
      ? (isDark ? `${color}12` : `${color}0a`)
      : 'transparent',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    transition: 'background 0.15s',
  }), [hovered, isDark, color])

  const thumbStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}22, ${color}08)`,
  }), [color])

  const chevronStyle = useMemo<React.CSSProperties>(() => ({
    color,
    transform: isRTL ? 'rotate(180deg)' : 'none',
    opacity: hovered ? 1 : 0.4,
    transition: 'opacity 0.15s',
  }), [color, isRTL, hovered])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex items-center gap-4 px-3 py-2.5 cursor-pointer select-none"
      style={rowStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={thumbStyle}>
        {work.thumbnail
          ? <img src={work.thumbnail} alt={name} className="w-full h-full object-cover" />
          : <span className="text-sm font-black" style={{ color, fontFamily: 'var(--font-display)' }}>
              {name.charAt(0)}
            </span>
        }
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold truncate" style={{
          color: 'var(--foreground)',
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
        }}>
          {name}
        </div>
        <div className="text-[10.5px] truncate" style={{ color: 'var(--foreground-muted)' }}>
          {desc}
        </div>
      </div>

      {/* Counts */}
      <div className="hidden sm:flex items-center gap-4 shrink-0 text-[10.5px] font-bold" style={{ color: 'var(--foreground-muted)' }}>
        <span className="flex items-center gap-1.5">
          <FolderOpen className="w-3 h-3" style={{ color }} />
          {work.sectionCount} {tx.sections}
        </span>
        <span className="flex items-center gap-1.5">
          <FileStack className="w-3 h-3" style={{ color }} />
          {work.fileCount} {tx.files}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 shrink-0" style={chevronStyle} />
    </motion.div>
  )
})

/* ── WorksGrid ── */
function WorksGrid({
  platformId,
  platformSlug,
  color         = '#458482',
  initialWorks,
  canCreate     = false,   // ← محسوبة سيرفر-سايد (عضوية + archive.manage لهاي المنصة)
  canDelete     = false,   // ← محسوبة سيرفر-سايد (Chief Admin / Developer بس)
  initialViewMode = 'grid',
}: {
  platformId:    string   // uuid المنصة الأب
  platformSlug:  string
  color?:        string
  initialWorks:  Work[]
  canCreate?:    boolean
  canDelete?:    boolean
  /** تفضيل Grid/List محفوظ بالبروفايل — جاي من Server Component. */
  initialViewMode?: ViewMode
}) {
  const { lang, isRTL } = useLang()
  const { theme }       = useTheme()
  const isDark          = theme === 'dark'

  const [works, setWorks]         = useState<Work[]>(initialWorks)
  const [showModal, setShowModal] = useState(false)
  const [editingWork, setEditingWork] = useState<Work | null>(null)
  /** The work currently showing the big delete-confirmation popup, if any. */
  const [pendingDelete, setPendingDelete] = useState<Work | null>(null)
  const [search, setSearch]       = useState('')

  const [viewMode, setViewMode] = useArchiveViewMode(initialViewMode)

  const getWorkSearchFields = useCallback(
    (w: Work) => [w.nameEn, w.nameAr, w.description, w.descriptionAr],
    []
  )
  const filteredWorks = useSmartSearch(works, search, getWorkSearchFields)

  const tx = useMemo(() => ({
    title:      lang === 'ar' ? 'الأعمال'      : 'Works',
    addWork:    lang === 'ar' ? 'إضافة عمل'    : 'Add Work',
    empty:      lang === 'ar' ? 'لا يوجد أعمال بعد' : 'No works yet',
    search:     lang === 'ar' ? 'ابحث عن عمل...' : 'Search works...',
    noResults:  lang === 'ar' ? 'لا توجد نتائج'   : 'No results found',
  }), [lang])

  /** Optimistic insert بـid مؤقت، ثم استبداله بالصف الحقيقي من السيرفر. */
  const handleAdd = useCallback(async (payload: WorkActionPayload) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Work = {
      dbId: tempId,
      id: payload.nameEn.toLowerCase().replace(/\s+/g, '-'),
      platformId,
      nameEn: payload.nameEn,
      nameAr: payload.nameAr,
      description: payload.description,
      descriptionAr: payload.descriptionAr,
      thumbnail: payload.thumbnail,
      sectionCount: 0,
      fileCount: 0,
    }
    setWorks(prev => [...prev, optimistic])

    try {
      const real = await addWorkAction(platformId, payload)
      setWorks(prev => prev.map(w => w.dbId === tempId ? real : w))
    } catch {
      setWorks(prev => prev.filter(w => w.dbId !== tempId))
    }
  }, [platformId])

  const handleSaveEdit = useCallback(async (dbId: string, updates: WorkActionPayload) => {
    let previous: Work | undefined
    setWorks(prev => prev.map(w => {
      if (w.dbId !== dbId) return w
      previous = w
      return { ...w, ...updates }
    }))

    try {
      await updateWorkAction(dbId, platformId, updates)
    } catch {
      if (previous) setWorks(prev => prev.map(w => w.dbId === dbId ? previous! : w))
    }
  }, [platformId])

  const handleOpenModal  = useCallback(() => { setEditingWork(null); setShowModal(true) }, [])
  const handleOpenEdit   = useCallback((work: Work) => { setEditingWork(work); setShowModal(true) }, [])
  const handleCloseModal = useCallback(() => { setShowModal(false); setEditingWork(null) }, [])

  const handleRequestDelete = useCallback((work: Work) => setPendingDelete(work), [])

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    const targetIndex = works.findIndex(w => w.dbId === target.dbId)

    setWorks(prev => prev.filter(w => w.dbId !== target.dbId))
    setPendingDelete(null)

    try {
      await deleteWorkAction(target.dbId, platformId)
    } catch {
      setWorks(prev => {
        const next = [...prev]
        next.splice(targetIndex, 0, target)
        return next
      })
    }
  }, [pendingDelete, works, platformId])

  const handleCancelDelete = useCallback(() => setPendingDelete(null), [])

  const handleAddBtnEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter = 'brightness(1.08)'
  }, [])
  const handleAddBtnLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter = 'brightness(1)'
  }, [])

  const handleDashedCardEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = color + '70'
  }, [color])
  const handleDashedCardLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  }, [isDark])

  const addBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color:      '#ffffff',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    cursor:     'pointer',
    transition: 'filter 0.18s',
  }), [color, lang])

  const dashedCardStyle = useMemo<React.CSSProperties>(() => ({
    background: 'transparent',
    border:     `2px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
    transition: 'border-color 0.3s',
  }), [isDark])

  const searchIconStyle = useMemo<React.CSSProperties>(() => ({
    [isRTL ? 'right' : 'left']: '12px',
    color: 'var(--foreground-muted)',
  }), [isRTL])

  const searchInputStyle = useMemo<React.CSSProperties>(() => ({
    background:  isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    border:      `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
    color:       'var(--foreground)',
    paddingLeft:  isRTL ? '12px' : '34px',
    paddingRight: isRTL ? '34px' : '12px',
    fontFamily:  lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isDark, isRTL, lang])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="select-none">
      <div className="flex items-center gap-3 mb-4">
        <Briefcase className="w-4 h-4" style={{ color }} />
        <h2 className="text-xs font-black uppercase tracking-widest"
          style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
          {tx.title}
        </h2>
        <div className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: color + '18', color }}>
          {works.length}
        </span>

        {canCreate && (
          <motion.button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold"
            style={addBtnStyle}
            onMouseEnter={handleAddBtnEnter}
            onMouseLeave={handleAddBtnLeave}
          >
            <Plus className="w-3 h-3" />
            {tx.addWork}
          </motion.button>
        )}
      </div>

      {/* Search + View toggle */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={searchIconStyle} />
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder={tx.search}
            className="w-full py-2 rounded-xl text-[12px] outline-none"
            style={searchInputStyle}
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Lock className="w-6 h-6" style={{ color: 'var(--foreground-muted)', opacity: 0.4 }} />
          <p className="text-sm font-bold" style={{ color: 'var(--foreground-muted)' }}>
            {search ? tx.noResults : tx.empty}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorks.map((w, i) => (
            <WorkCard key={w.dbId} work={w} color={color} index={i} platformSlug={platformSlug}
              canManage={canCreate} canDelete={canDelete} onEdit={handleOpenEdit} onDelete={handleRequestDelete} />
          ))}

          {canCreate && !search && (
            <motion.button
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredWorks.length * 0.06 }}
              onClick={handleOpenModal}
              className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col"
              style={dashedCardStyle}
              onMouseEnter={handleDashedCardEnter}
              onMouseLeave={handleDashedCardLeave}
            >
              <div className="w-full flex flex-col items-center justify-center gap-3" style={{ aspectRatio: '1 / 1' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
                  <Plus className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-[11px] font-bold"
                  style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {tx.addWork}
                </span>
              </div>
              <div className="h-[56px] shrink-0" />
            </motion.button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          {filteredWorks.map((w, i) => (
            <WorkListRow key={w.dbId} work={w} color={color} index={i} platformSlug={platformSlug} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <AddWorkModal
            color={color}
            editingWork={editingWork}
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
              ? 'سيتم حذف هذا العمل نهائيًا مع كل التقسيمات والعناصر والملفات بداخله. هذا الإجراء لا يمكن التراجع عنه.'
              : 'This work and everything inside it — sections, items, and files — will be permanently deleted. This cannot be undone.'}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(WorksGrid)