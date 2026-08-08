//src\components\dashboard\archive\PlatformGrid.tsx
"use client"

import { useState, useRef, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, ChevronRight, Layers, Plus, X, Upload, Pipette, Lock, Pencil, Trash2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal from '@/components/dashboard/archive/DeleteConfirmModal'
import {
  addPlatformAction,
  updatePlatformAction,
  deletePlatformAction,
  uploadArchiveImageAction,
  type PlatformRow,
  type PlatformActionPayload,
} from '@/app/(dashboard)/archive/actions'

/**
 * Platform هون هو PlatformRow القادم من الباك اند (page.tsx Server Component)
 * — بديل عن نوع Platform القديم من archiveMockData. البنية نفسها بالضبط
 * (id = slug للراوتينج) بس مضاف عليها dbId (uuid حقيقي للتحديث/الحذف)
 * وcanEdit (محسوب سيرفر-سايد لكل منصة، مش boolean عام).
 */
export type Platform = PlatformRow


/* ── EyeDropper type ── */
declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

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
  e.currentTarget.style.background = 'rgba(69,132,130,0.25)'
}
const handleUploadBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'rgba(69,132,130,0.15)'
}

const UPLOAD_BTN_STYLE: React.CSSProperties = {
  background: 'rgba(69,132,130,0.15)',
  border:     '1px solid rgba(69,132,130,0.3)',
  color:      '#458482',
  cursor:     'pointer',
  whiteSpace: 'nowrap',
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

/* ── Add/Edit Platform Modal ── */
const AddPlatformModal = memo(function AddPlatformModal({
  editingPlatform,
  onClose,
  onAdd,
  onSave,
}: {
  /** Present → editing an existing platform; absent → creating one. */
  editingPlatform?: Platform | null
  onClose: () => void
  onAdd:   (payload: PlatformActionPayload) => void
  onSave:  (dbId: string, updates: PlatformActionPayload) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const isEditing        = !!editingPlatform

  const [nameEn,        setNameEn]        = useState(editingPlatform?.nameEn ?? '')
  const [nameAr,        setNameAr]        = useState(editingPlatform?.nameAr ?? '')
  const [description,   setDescription]   = useState(editingPlatform?.description ?? '')
  const [descriptionAr, setDescriptionAr] = useState(editingPlatform?.descriptionAr ?? '')
  const [color,         setColor]         = useState(editingPlatform?.color ?? '#458482')
  const [thumbnailUrl,  setThumbnailUrl]  = useState(editingPlatform?.thumbnail ?? '')
  const [eyedropperSupported] = useState(() => typeof window !== 'undefined' && !!window.EyeDropper)

  const tx = useMemo(() => ({
    titleAdd:    lang === 'ar' ? 'إضافة منصة جديدة'        : 'Add New Platform',
    titleEdit:   lang === 'ar' ? 'تعديل المنصة'             : 'Edit Platform',
    nameEn:      lang === 'ar' ? 'الاسم بالإنجليزي'         : 'English Name',
    nameEnHint:  lang === 'ar' ? 'يُستخدم كرابط URL'        : 'Used as URL slug',
    nameAr:      lang === 'ar' ? 'الاسم بالعربي'            : 'Arabic Name',
    descEn:      lang === 'ar' ? 'الوصف بالإنجليزي'         : 'English Description',
    descAr:      lang === 'ar' ? 'الوصف بالعربي'            : 'Arabic Description',
    colorLabel:  lang === 'ar' ? 'لون المنصة'               : 'Platform Color',
    eyedropper:  lang === 'ar' ? 'قطارة اللون'              : 'Eyedropper',
    noSupport:   lang === 'ar' ? 'غير مدعوم في هذا المتصفح' : 'Not supported in this browser',
    thumbnail:   lang === 'ar' ? 'رابط الصورة'              : 'Image URL',
    add:         lang === 'ar' ? 'إضافة المنصة'             : 'Add Platform',
    save:        lang === 'ar' ? 'حفظ التعديلات'            : 'Save Changes',
    cancel:      lang === 'ar' ? 'إلغاء'                    : 'Cancel',
    preview:     lang === 'ar' ? 'معاينة'                   : 'Preview',
  }), [lang])

  const handleEyeDropper = useCallback(async () => {
    if (!window.EyeDropper) return
    try {
      const dropper = new window.EyeDropper()
      const result  = await dropper.open()
      setColor(result.sRGBHex)
    } catch {
      // user cancelled
    }
  }, [])

  const handleSubmit = useCallback(() => {
    if (!nameEn.trim() || !nameAr.trim() || uploading) return
    const payload: PlatformActionPayload = {
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      color,
      thumbnail:     thumbnailUrl.trim() || undefined,
    }
    if (isEditing && editingPlatform) {
      onSave(editingPlatform.dbId, payload)
    } else {
      onAdd(payload)
    }
    onClose()
  }, [nameEn, nameAr, description, descriptionAr, color, thumbnailUrl, isEditing, editingPlatform, onAdd, onSave, onClose])

  const handleEyedropperBtnEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (eyedropperSupported) e.currentTarget.style.background = 'rgba(69,132,130,0.25)'
  }, [eyedropperSupported])
  const handleEyedropperBtnLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (eyedropperSupported) e.currentTarget.style.background = 'rgba(69,132,130,0.15)'
  }, [eyedropperSupported])

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadError('')

    // معاينة فورية بـobject URL مؤقت لحد ما يخلص الرفع الحقيقي
    const previewUrl = URL.createObjectURL(file)
    setThumbnailUrl(previewUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'platforms')
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

  const handleColorHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v)
  }, [])

  const handleRemoveThumbnail = useCallback(() => { setThumbnailUrl(''); setUploadError('') }, [])

  const inputStyle = useMemo(() => ({
    background:  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border:      `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
    color:       'var(--foreground)',
    borderRadius: '10px',
    padding:     '8px 12px',
    fontSize:    '12px',
    width:       '100%',
    outline:     'none',
    fontFamily:  lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    userSelect:  'text' as const,
  }), [isDark, lang])

  const labelStyle = useMemo(() => ({
    fontSize:   '10px',
    fontWeight: 700,
    color:      'var(--foreground-muted)',
    marginBottom: '4px',
    display:    'block',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  }), [lang])

  const eyedropperBtnStyle = useMemo(() => ({
    background: eyedropperSupported ? 'rgba(69,132,130,0.15)' : 'var(--hover-bg)',
    border:     `1px solid ${eyedropperSupported ? 'rgba(69,132,130,0.35)' : 'var(--divider)'}`,
    color:      eyedropperSupported ? '#458482' : 'var(--foreground-muted)',
    cursor:     eyedropperSupported ? 'pointer' : 'not-allowed',
    opacity:    eyedropperSupported ? 1 : 0.5,
    whiteSpace: 'nowrap' as const,
  }), [eyedropperSupported])

  const addBtnStyle = useMemo(() => ({
    background: (!nameEn.trim() || !nameAr.trim() || uploading) ? 'var(--hover-bg)' : 'linear-gradient(135deg, #458482, #5ea8a4)',
    color:      (!nameEn.trim() || !nameAr.trim() || uploading) ? 'var(--foreground-muted)' : '#ffffff',
    cursor:     (!nameEn.trim() || !nameAr.trim() || uploading) ? 'not-allowed' : 'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [nameEn, nameAr, lang, uploading])
  const isDraggingFromBackdrop = useRef(false)
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingFromBackdrop.current = e.target === e.currentTarget
  }, [])
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // بنسكّر بس إذا الـmousedown والـclick الاثنين صاروا فعليًا على طبقة
    // الخلفية — مش لو المستخدم كان عم يحدد نص جوا المودال وانسحبت الفارة
    // برا بالغلط (هيك بيصير click على الخلفية بس المقصد كان تحديد نص).
    if (isDraggingFromBackdrop.current && e.target === e.currentTarget) onClose()
    isDraggingFromBackdrop.current = false
  }, [onClose])

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
          userSelect: 'none',
        }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #458482, #5ea8a4)' }}>
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

          {/* Preview mini card */}
          <div className="rounded-xl overflow-hidden h-20 relative flex items-center px-4 gap-3"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)`, border: `1px solid ${color}30` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: color + '30', border: `1px solid ${color}40` }}>
              {thumbnailUrl
                ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                : <span className="text-lg font-black" style={{ color, fontFamily: 'var(--font-display)' }}>
                    {(nameEn || 'A').charAt(0).toUpperCase()}
                  </span>
              }
            </div>
            <div>
              <div className="text-sm font-black" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
                {lang === 'ar' ? (nameAr || '—') : (nameEn || '—')}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color }}>
                /archive/{nameEn.toLowerCase().replace(/\s+/g, '-') || 'slug'}
              </div>
            </div>
            <span className="absolute top-2 text-[9px] font-bold uppercase tracking-widest"
              style={{ [isRTL ? 'left' : 'right']: '12px', color: 'var(--foreground-muted)' }}>
              {tx.preview}
            </span>
          </div>

          {/* Names row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{tx.nameEn}</label>
              <input
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="e.g. Ruwwad"
                style={inputStyle}
                disabled={isEditing}
                title={isEditing ? (lang === 'ar' ? 'الاسم الإنجليزي والرابط لا يتغيران بعد الإنشاء' : 'English name / slug cannot change after creation') : undefined}
              />
              <span className="text-[9px] mt-1 block" style={{ color: 'var(--foreground-muted)' }}>
                {tx.nameEnHint}
              </span>
            </div>
            <div>
              <label style={labelStyle}>{tx.nameAr}</label>
              <input
                value={nameAr}
                onChange={e => setNameAr(e.target.value)}
                placeholder="مثال: رواق"
                dir="rtl"
                style={{ ...inputStyle, fontFamily: 'var(--font-arabic)' }}
              />
            </div>
          </div>

          {/* Descriptions */}
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

          {/* Thumbnail — file picker OR URL */}
          <div>
            <label style={labelStyle}>{tx.thumbnail}</label>
            <div className="flex gap-2">
              <input
                value={thumbnailUrl}
                onChange={e => setThumbnailUrl(e.target.value)}
                placeholder="/platforms/logo.png"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all shrink-0"
                style={{ ...UPLOAD_BTN_STYLE, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
                onMouseEnter={handleUploadBtnEnter}
                onMouseLeave={handleUploadBtnLeave}
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading
                  ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...')
                  : (lang === 'ar' ? 'اختر صورة' : 'Choose File')}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadError && (
              <p className="text-[9px] mt-1" style={{ color: '#ef4444' }}>{uploadError}</p>
            )}
            {thumbnailUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={thumbnailUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)', opacity: uploading ? 0.5 : 1 }} />
                <span className="text-[9px]" style={{ color: 'var(--foreground-muted)' }}>
                  {uploading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'معاينة الصورة' : 'Image preview')}
                </span>
                {!uploading && (
                  <button onClick={handleRemoveThumbnail} className="text-[9px]" style={{ color: '#ef4444', cursor: 'pointer' }}>
                    {lang === 'ar' ? 'حذف' : 'Remove'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div>
            <label style={labelStyle}>{tx.colorLabel}</label>
            <div className="flex items-center gap-2">
              {/* Native color input */}
              <div className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                  style={{
                    background: 'transparent',
                    border: `2px solid ${color}60`,
                    borderRadius: '10px',
                  }}
                />
              </div>

              {/* Color hex input */}
              <input
                value={color}
                onChange={handleColorHexChange}
                placeholder="#458482"
                style={{ ...inputStyle, width: '110px', fontFamily: 'monospace', fontSize: '12px' }}
              />

              {/* EyeDropper */}
              <button
                onClick={handleEyeDropper}
                disabled={!eyedropperSupported}
                title={eyedropperSupported ? tx.eyedropper : tx.noSupport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all"
                style={eyedropperBtnStyle}
                onMouseEnter={handleEyedropperBtnEnter}
                onMouseLeave={handleEyedropperBtnLeave}
              >
                <Pipette className="w-3.5 h-3.5" />
                {tx.eyedropper}
              </button>

              {/* Color preview swatch */}
              <div className="w-10 h-10 rounded-lg shrink-0"
                style={{ background: color, boxShadow: `0 4px 12px ${color}50` }} />
            </div>

            {!eyedropperSupported && (
              <p className="text-[9px] mt-1.5" style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                {lang === 'ar'
                  ? '⚠️ القطارة تعمل فقط في Chrome وEdge'
                  : '⚠️ Eyedropper only works in Chrome & Edge'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-bold transition-colors"
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
            onClick={handleSubmit}
            disabled={!nameEn.trim() || !nameAr.trim() || uploading}
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

/* ── Open Platform button with hover effect ── */
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

/* ── Single card ── */
const PlatformCard = memo(function PlatformCard({ platform, index, canDeleteGlobal, onEdit, onDelete }: {
  platform: Platform
  index:    number
  /** Delete is account-level (Chief Admin / Developer), never platform-scoped —
      see BACKEND NOTE at the bottom of the file. */
  canDeleteGlobal: boolean
  onEdit:   (platform: Platform) => void
  onDelete: (platform: Platform) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const router          = useRouter()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? platform.nameAr        : platform.nameEn
  const desc = lang === 'ar' ? platform.descriptionAr : platform.description

  /** محسوبة سيرفر-سايد بالكامل (عضوية + Manage Archive معًا) — Chief/Developer
      بيتخطوا دايمًا لأن guards.ts بيرجّع true لهم بغض النظر عن العضوية. */
  const canEdit  = platform.canEdit
  const isLocked = platform.locked

  const tx = useMemo(() => ({
    folders:      lang === 'ar' ? 'مجلد'       : 'folders',
    files:        lang === 'ar' ? 'ملف'        : 'files',
    open:         lang === 'ar' ? 'فتح المنصة' : 'Open Platform',
    lockedTitle:  lang === 'ar' ? 'غير مصرح'    : 'Not authorized',
    lockedBody:   lang === 'ar'
      ? 'إذا كنت تعتقد بوجود خطأ فاطلب من المدير تصحيح هذا الخطأ'
      : 'If you believe this is a mistake, ask an admin to correct it',
  }), [lang])

  const firstLetter = useMemo(
    () => (lang === 'ar' ? platform.nameAr : platform.nameEn).charAt(0),
    [lang, platform.nameAr, platform.nameEn]
  )

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])
  const handleClick = useCallback(() => {
    if (isLocked) return
    router.push(`/archive/${platform.id}`)
  }, [isLocked, router, platform.id])
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(platform)
  }, [onEdit, platform])
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(platform)
  }, [onDelete, platform])

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark
      ? `linear-gradient(145deg, #161b22, ${platform.color}15)`
      : `linear-gradient(145deg, #ffffff, ${platform.color}10)`,
    border:     `1px solid ${hovered && !isLocked
      ? platform.color + '55'
      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
    boxShadow:  hovered && !isLocked ? `0 8px 32px ${platform.color}28` : 'none',
    filter:     isLocked ? 'grayscale(0.7)' : 'none',
    opacity:    isLocked ? 0.75 : 1,
    cursor:     isLocked ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.3s, box-shadow 0.3s, filter 0.3s, opacity 0.3s',
  }), [isDark, hovered, platform.color, isLocked])

  const thumbBgStyle = useMemo<React.CSSProperties>(() => ({
    aspectRatio: '1 / 1',
    background:  `linear-gradient(135deg, ${platform.color}22, ${platform.color}08)`,
  }), [platform.color])

  const radialStyle = useMemo<React.CSSProperties>(() => ({
    backgroundImage: `radial-gradient(circle at 30% 50%, ${platform.color}35 0%, transparent 60%),
                      radial-gradient(circle at 80% 20%, ${platform.color}20 0%, transparent 50%)`,
  }), [platform.color])

  const topLineStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${platform.color}, transparent)`,
  }), [isRTL, platform.color])

  const chevronStyle = useMemo<React.CSSProperties>(() => ({
    color:     platform.color,
    transform: hovered
      ? isRTL ? 'rotate(180deg) translateX(4px)' : 'translateX(4px)'
      : isRTL ? 'rotate(180deg)' : 'none',
  }), [platform.color, hovered, isRTL])

  const overlayStyle = useMemo<React.CSSProperties>(() => ({
    pointerEvents: hovered ? 'auto' : 'none',
    cursor:        'pointer',
    background: `linear-gradient(to top,
      ${platform.color}ff 0%,
      ${platform.color}f5 25%,
      ${platform.color}dd 50%,
      ${platform.color}99 70%,
      transparent 100%)`,
  }), [hovered, platform.color])

  const lockOverlayStyle = useMemo<React.CSSProperties>(() => ({
    pointerEvents: hovered ? 'auto' : 'none',
    cursor:        'not-allowed',
    background:    isDark ? 'rgba(8,15,18,0.88)' : 'rgba(20,20,20,0.82)',
    backdropFilter: 'blur(2px)',
  }), [hovered, isDark])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden select-none"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      aria-disabled={isLocked}
    >
      {/* Edit/Delete buttons — كل واحد بصلاحيته الخاصة (canEdit لهاي المنصة
          تحديدًا، canDeleteGlobal بمستوى الحساب) مش boolean واحد للاثنين */}
      {(canEdit || canDeleteGlobal) && (
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="absolute top-2.5 z-20 flex gap-1.5"
          style={{ [isRTL ? 'left' : 'right']: '10px' }}
        >
          {canEdit && (
            <button
              onClick={handleEditClick}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(8,15,18,0.55)', color: '#ffffff', backdropFilter: 'blur(6px)' }}
              title={lang === 'ar' ? 'تعديل المنصة' : 'Edit platform'}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete — دايمًا محصور بـcanDeleteGlobal بس (Chief Admin / Developer).
              انظر BACKEND NOTE. */}
          {canDeleteGlobal && (
            <button
              onClick={handleDeleteClick}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(8,15,18,0.55)', color: '#ff8080', backdropFilter: 'blur(6px)' }}
              title={lang === 'ar' ? 'حذف المنصة' : 'Delete platform'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}
      {/* ── Square thumbnail ── */}
      <div className="relative w-full overflow-hidden" style={thumbBgStyle}>
        <div className="absolute inset-0" style={radialStyle} />

        {!platform.thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center select-none">
            <span className="font-black" style={{
              fontSize:   'clamp(4rem, 8vw, 7rem)',
              color:      platform.color + '30',
              fontFamily: 'var(--font-display)',
              lineHeight: 1,
            }}>
              {firstLetter}
            </span>
          </div>
        )}

        {platform.thumbnail && (
          <img
            src={platform.thumbnail}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <div className="absolute top-0 inset-x-0 h-0.5" style={topLineStyle} />

        <div className="absolute bottom-3 flex items-center gap-2"
          style={{ [isRTL ? 'right' : 'left']: '12px' }}>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
            background: 'rgba(8,15,18,0.30)',
            color:      '#ffffff',
            border:     `1px solid ${platform.color}80`,
            backdropFilter: 'blur(8px)',
            textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}>
            {platform.folderCount} {tx.folders}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
            background: 'rgba(8,15,18,0.24)',
            color:      'rgba(255,255,255,0.82)',
            border:     '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(8px)',
            textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}>
            {platform.fileCount} {tx.files}
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black truncate" style={{
            color:         'var(--foreground)',
            fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            letterSpacing: lang === 'ar' ? 0 : '-0.01em',
          }}>
            {name}
          </h3>
          <ChevronRight className="w-4 h-4 shrink-0 transition-all duration-300" style={chevronStyle} />
        </div>
      </div>

      {/* ── Hover overlay — covers entire card including footer ── */}
      {isLocked ? (
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center p-5 text-center"
          style={lockOverlayStyle}
        >
          <motion.div
            animate={{ y: hovered ? 0 : 8, opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Lock className="w-5 h-5 text-white" />
            </div>
            <p className="text-[12px] font-black text-white" style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
              {tx.lockedTitle}
            </p>
            <p className="text-[10.5px] text-white/70 leading-relaxed max-w-[180px]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {tx.lockedBody}
            </p>
          </motion.div>
        </motion.div>
      ) : (
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
            <OpenButton label={tx.open} color={platform.color} />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
})

/* ── Grid ── */
function PlatformGrid({
  initialPlatforms,
  canCreate  = false,   // ← محسوبة سيرفر-سايد بـpage.tsx (archive.manage)
  canDelete  = false,   // ← محسوبة سيرفر-سايد بـpage.tsx (Chief Admin / Developer بس)
}: {
  initialPlatforms: Platform[]
  canCreate?: boolean
  canDelete?: boolean
}) {
  const { lang, isRTL }           = useLang()
  const { theme }                 = useTheme()
  const isDark                    = theme === 'dark'
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms)
  const [showModal, setShowModal] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  /** The platform currently showing the big delete-confirmation popup, if any. */
  const [pendingDelete, setPendingDelete] = useState<Platform | null>(null)

  const tx = useMemo(() => ({
    title:       lang === 'ar' ? 'المنصات'       : 'Platforms',
    addPlatform: lang === 'ar' ? 'إضافة منصة'    : 'Add Platform',
  }), [lang])

  /** Optimistic insert بـid مؤقت، ثم استبداله بالصف الحقيقي من السيرفر.
      لو فشل الطلب، بنشيل الصف المؤقت (rollback). */
  const handleAdd = useCallback(async (payload: import('@/app/(dashboard)/archive/actions').PlatformActionPayload) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Platform = {
      dbId: tempId,
      id: payload.nameEn.toLowerCase().replace(/\s+/g, '-'),
      nameEn: payload.nameEn,
      nameAr: payload.nameAr,
      description: payload.description,
      descriptionAr: payload.descriptionAr,
      color: payload.color,
      thumbnail: payload.thumbnail,
      folderCount: 0,
      fileCount: 0,
      locked: false,
      canEdit: true,
    }
    setPlatforms(prev => [...prev, optimistic])

    try {
      const real = await addPlatformAction(payload)
      setPlatforms(prev => prev.map(p => p.dbId === tempId ? real : p))
    } catch {
      setPlatforms(prev => prev.filter(p => p.dbId !== tempId))
    }
  }, [])

  const handleOpenEdit = useCallback((platform: Platform) => {
    setEditingPlatform(platform)
    setShowModal(true)
  }, [])

  /** Optimistic update فورًا، مع rollback للقيم القديمة لو فشل السيرفر. */
  const handleSaveEdit = useCallback(async (dbId: string, updates: import('@/app/(dashboard)/archive/actions').PlatformActionPayload) => {
    let previous: Platform | undefined
    setPlatforms(prev => prev.map(p => {
      if (p.dbId !== dbId) return p
      previous = p
      return { ...p, ...updates }
    }))

    try {
      await updatePlatformAction(dbId, updates)
    } catch {
      if (previous) setPlatforms(prev => prev.map(p => p.dbId === dbId ? previous! : p))
    }
  }, [])

  const handleOpenModal = useCallback(() => { setEditingPlatform(null); setShowModal(true) }, [])
  const handleCloseModal = useCallback(() => { setShowModal(false); setEditingPlatform(null) }, [])

  const handleRequestDelete = useCallback((platform: Platform) => {
    setPendingDelete(platform)
  }, [])

  /** Optimistic remove فورًا، rollback (إعادة الإدراج بمكانه) لو فشل السيرفر. */
  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    const targetIndex = platforms.findIndex(p => p.dbId === target.dbId)

    setPlatforms(prev => prev.filter(p => p.dbId !== target.dbId))
    setPendingDelete(null)

    try {
      await deletePlatformAction(target.dbId)
    } catch {
      setPlatforms(prev => {
        const next = [...prev]
        next.splice(targetIndex, 0, target)
        return next
      })
    }
  }, [pendingDelete, platforms])

  const handleCancelDelete = useCallback(() => setPendingDelete(null), [])

  const handleAddBtnEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter = 'brightness(1.08)'
    e.currentTarget.style.boxShadow = '0 8px 20px rgba(69,132,130,0.22)'
  }, [])
  const handleAddBtnLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter = 'brightness(1)'
    e.currentTarget.style.boxShadow = '0 0 0 rgba(69,132,130,0)'
  }, [])

  const handleDashedCardEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = '#45848270'
  }, [])
  const handleDashedCardLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  }, [isDark])

  const dashedCardStyle = useMemo<React.CSSProperties>(() => ({
    background:  'transparent',
    border:      `2px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
    transition:  'border-color 0.3s',
  }), [isDark])

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="select-none">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <Layers className="w-4 h-4" style={{ color: '#458482' }} />
        <h2 className="text-xs font-black uppercase tracking-widest"
          style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
          {tx.title}
        </h2>
        <div className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(69,132,130,0.12)', color: '#458482' }}>
          {platforms.length}
        </span>

        {/* Add button — Manage Archive فقط (بدون شرط عضوية، ما فيه منصة بعد) */}
        {canCreate && (
          <motion.button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #458482, #5ea8a4)',
              color:      '#ffffff',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              boxShadow:  '0 0 0 rgba(69,132,130,0)',
              cursor:     'pointer',
              transition: 'filter 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={handleAddBtnEnter}
            onMouseLeave={handleAddBtnLeave}
          >
            <Plus className="w-3 h-3" />
            {tx.addPlatform}
          </motion.button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {platforms.map((p, i) => (
          <PlatformCard key={p.dbId} platform={p} index={i} canDeleteGlobal={canDelete} onEdit={handleOpenEdit} onDelete={handleRequestDelete} />
        ))}

        {/* Add card — نفس شرط زر الإضافة بالأعلى */}
        {canCreate && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: platforms.length * 0.06 }}
            onClick={handleOpenModal}
            className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col"
            style={dashedCardStyle}
            onMouseEnter={handleDashedCardEnter}
            onMouseLeave={handleDashedCardLeave}
          >
            <div
              className="w-full flex flex-col items-center justify-center gap-3"
              style={{ aspectRatio: '1 / 1' }}
            >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(69,132,130,0.12)' }}>
              <Plus className="w-5 h-5" style={{ color: '#458482' }} />
            </div>
            <span className="text-[11px] font-bold"
              style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {lang === 'ar' ? 'إضافة منصة' : 'Add Platform'}
            </span>
            </div>
            <div className="h-[56px] shrink-0" />
          </motion.button>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AddPlatformModal
            editingPlatform={editingPlatform}
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
              ? 'سيتم حذف هذه المنصة نهائيًا مع كل الأعمال والتقسيمات والعناصر والملفات بداخلها. هذا الإجراء لا يمكن التراجع عنه.'
              : 'This platform and everything inside it — works, sections, items, and files — will be permanently deleted. This cannot be undone.'}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(PlatformGrid)

/* ══════════════════════════════════════════════════════════════════════
   BACKEND NOTE (ربط فعلي — تم)
   ══════════════════════════════════════════════════════════════════════
   - البيانات جايّة من page.tsx (Server Component) عبر initialPlatforms،
     مش من archiveMockData.ts القديم — هاد الأخير بقى بلا استخدام لمستوى
     Platform تحديدًا (لسا مستخدم لباقي المستويات لحد ما نربطها).
   - isAdmin (القديم) انقسم لصلاحيتين منفصلتين حقيقيتين:
       canCreate → صلاحية إضافة منصة جديدة (archive.manage بس، سيرفر-سايد)
       platform.canEdit → لكل منصة لحالها (عضوية + archive.manage معًا)
     هاد أدق من boolean واحد للشبكة كلها، ومطابق للقرار المحسوم بالتوثيق.
   - canDelete ضل زي ما هو (boolean عام)، لأن الحذف مش مرتبط بعضوية منصة
     أصلاً — بس Chief Admin/Developer، بغض النظر عن أي منصة.
   - رفع الصور (thumbnailUrl) لسا مؤقت بـobject URL بالمتصفح — لازم Storage
     فعلي (bucket archive-platforms، حد 2MB) قبل الإنتاج. شايف ملاحظة داخل
     AddPlatformModal.
*/