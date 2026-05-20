"use client"

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, ChevronRight, Layers, Plus, X, Upload, Pipette } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'

/* ── Types ── */
export interface Platform {
  id:            string
  nameEn:        string
  nameAr:        string
  description:   string
  descriptionAr: string
  thumbnail?:    string
  color:         string
  folderCount:   number
  fileCount:     number
}

/* ── Mock data ── */
const INITIAL_PLATFORMS: Platform[] = [
  {
    id: 'jowhar',  nameEn: 'Jowhar',        nameAr: 'جوهر',
    description:   'Educational content and published course materials.',
    descriptionAr: 'محتوى تعليمي ومواد دورات منشورة لمنصة رواق.',
    thumbnail:     '/platforms/jowhar.png',
    color: '#769171',  folderCount: 12,  fileCount: 38,
  },
  {
    id: 'alwaqee', nameEn: 'Alwaqee',       nameAr: 'الواقع',
    description:   'Platform resources, published content and media archives.',
    descriptionAr: 'موارد المنصة والمحتوى المنشور وأرشيف الوسائط.',
    thumbnail:     '/platforms/alwaqee.png',
    color: '#5ba4a0',  folderCount: 3,  fileCount: 27,
  },
  {
    id: 'vision',  nameEn: 'Vision Studio', nameAr: 'فيجن ستوديو',
    description:   '3D renders, concept art, and production-ready visual assets.',
    descriptionAr: 'نماذج ثلاثية الأبعاد وفن مفاهيمي وأصول بصرية جاهزة للإنتاج.',
    color: '#a855f7',  folderCount: 6,  fileCount: 124,
  },
  {
    id: 'motion',  nameEn: 'Motion Lab',    nameAr: 'موشن لاب',
    description:   'Animation files, After Effects projects, and VFX deliverables.',
    descriptionAr: 'ملفات حركة ومشاريع أفتر إفكتس وتسليمات المؤثرات البصرية.',
    color: '#f59e0b',  folderCount: 5,  fileCount: 87,
  },
  {
    id: 'brand',   nameEn: 'Brand Hub',     nameAr: 'براند هاب',
    description:   'Brand guidelines, logos, typography kits, and identity assets.',
    descriptionAr: 'إرشادات العلامة التجارية والشعارات وأطقم الخطوط.',
    color: '#ef4444',  folderCount: 3,  fileCount: 52,
  },
  {
    id: 'social',  nameEn: 'Social Media',  nameAr: 'سوشال ميديا',
    description:   'Published posts, stories, reels, and social content archives.',
    descriptionAr: 'منشورات وقصص وريلز وأرشيف محتوى وسائل التواصل الاجتماعي.',
    color: '#3b82f6',  folderCount: 7,  fileCount: 210,
  },
  {
    id: 'audio',   nameEn: 'Audio Vault',   nameAr: 'مخزن الصوتيات',
    description:   'Sound design, music tracks, voice-over recordings, and SFX.',
    descriptionAr: 'تصميم صوتي ومسارات موسيقية وتسجيلات صوتية ومؤثرات.',
    color: '#06b6d4',  folderCount: 4,  fileCount: 63,
  },
  {
    id: 'docs',    nameEn: 'Documentation', nameAr: 'التوثيق',
    description:   'Project briefs, scripts, storyboards, and production documents.',
    descriptionAr: 'موجزات المشروع والنصوص ولوحات القصة ووثائق الإنتاج.',
    color: '#10b981',  folderCount: 5,  fileCount: 91,
  },
  {
    id: 'renders', nameEn: 'Final Renders',  nameAr: 'النتائج النهائية',
    description:   'Exported and approved final outputs ready for delivery.',
    descriptionAr: 'المخرجات النهائية المُصدَّرة والمعتمدة الجاهزة للتسليم.',
    color: '#f97316',  folderCount: 3,  fileCount: 44,
  },
  {
    id: 'raw',     nameEn: 'Raw Footage',    nameAr: 'اللقطات الخام',
    description:   'Unedited camera footage, raw files, and original source material.',
    descriptionAr: 'لقطات الكاميرا غير المحررة والملفات الخام والمصدر الأصلي.',
    color: '#8b5cf6',  folderCount: 6,  fileCount: 178,
  },
]

/* ── EyeDropper type ── */
declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

/* ── Add Platform Modal ── */
function AddPlatformModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd:   (p: Platform) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const fileInputRef    = useRef<HTMLInputElement>(null)

  const [nameEn,        setNameEn]        = useState('')
  const [nameAr,        setNameAr]        = useState('')
  const [description,   setDescription]   = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')
  const [color,         setColor]         = useState('#458482')
  const [thumbnailUrl,  setThumbnailUrl]  = useState('')
  const [eyedropperSupported] = useState(() => typeof window !== 'undefined' && !!window.EyeDropper)

  const tx = {
    title:       lang === 'ar' ? 'إضافة منصة جديدة'        : 'Add New Platform',
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
    cancel:      lang === 'ar' ? 'إلغاء'                    : 'Cancel',
    preview:     lang === 'ar' ? 'معاينة'                   : 'Preview',
  }

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return
    try {
      const dropper = new window.EyeDropper()
      const result  = await dropper.open()
      setColor(result.sRGBHex)
    } catch {
      // user cancelled
    }
  }

  const handleAdd = () => {
    if (!nameEn.trim() || !nameAr.trim()) return
    const slug = nameEn.toLowerCase().replace(/\s+/g, '-')
    onAdd({
      id:            slug,
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      color,
      thumbnail:     thumbnailUrl.trim() || undefined,
      folderCount:   0,
      fileCount:     0,
    })
    onClose()
  }

  const inputStyle = {
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
  }

  const labelStyle = {
    fontSize:   '10px',
    fontWeight: 700,
    color:      'var(--foreground-muted)',
    marginBottom: '4px',
    display:    'block',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', cursor: 'pointer' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
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
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-black" style={{
              color: 'var(--foreground)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            }}>
              {tx.title}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all shrink-0"
                style={{
                  background: 'rgba(69,132,130,0.15)',
                  border:     '1px solid rgba(69,132,130,0.3)',
                  color:      '#458482',
                  cursor:     'pointer',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(69,132,130,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(69,132,130,0.15)' }}
              >
                <Upload className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'اختر صورة' : 'Choose File'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  const url = URL.createObjectURL(file)
                  setThumbnailUrl(url)
                }
              }}
            />
            {thumbnailUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={thumbnailUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                <span className="text-[9px]" style={{ color: 'var(--foreground-muted)' }}>
                  {lang === 'ar' ? 'معاينة الصورة' : 'Image preview'}
                </span>
                <button onClick={() => setThumbnailUrl('')} className="text-[9px]" style={{ color: '#ef4444', cursor: 'pointer' }}>
                  {lang === 'ar' ? 'حذف' : 'Remove'}
                </button>
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
                onChange={e => {
                  const v = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v)
                }}
                placeholder="#458482"
                style={{ ...inputStyle, width: '110px', fontFamily: 'monospace', fontSize: '12px' }}
              />

              {/* EyeDropper */}
              <button
                onClick={handleEyeDropper}
                disabled={!eyedropperSupported}
                title={eyedropperSupported ? tx.eyedropper : tx.noSupport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: eyedropperSupported ? 'rgba(69,132,130,0.15)' : 'var(--hover-bg)',
                  border:     `1px solid ${eyedropperSupported ? 'rgba(69,132,130,0.35)' : 'var(--divider)'}`,
                  color:      eyedropperSupported ? '#458482' : 'var(--foreground-muted)',
                  cursor:     eyedropperSupported ? 'pointer' : 'not-allowed',
                  opacity:    eyedropperSupported ? 1 : 0.5,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (eyedropperSupported) e.currentTarget.style.background = 'rgba(69,132,130,0.25)' }}
                onMouseLeave={e => { if (eyedropperSupported) e.currentTarget.style.background = 'rgba(69,132,130,0.15)' }}
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
            onClick={handleAdd}
            disabled={!nameEn.trim() || !nameAr.trim()}
            className="px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: (!nameEn.trim() || !nameAr.trim()) ? 'var(--hover-bg)' : 'linear-gradient(135deg, #458482, #5ea8a4)',
              color:      (!nameEn.trim() || !nameAr.trim()) ? 'var(--foreground-muted)' : '#ffffff',
              cursor:     (!nameEn.trim() || !nameAr.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {tx.add}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Open Platform button with hover effect ── */
function OpenButton({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="group inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[12px] font-bold text-white cursor-pointer select-none"
      style={{
        background: 'rgba(255,255,255,0.22)',
        border:     '1px solid rgba(255,255,255,0.45)',
        boxShadow:  `0 10px 24px ${color}22`,
        width:      'fit-content',
        transition: 'background-color 0.18s, border-color 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.32)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'
      }}
    >
      <FolderOpen className="h-4 w-4 shrink-0" />
      <span className="leading-none">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
    </div>
  )
}

/* ── Single card ── */
function PlatformCard({ platform, index }: { platform: Platform; index: number }) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const router          = useRouter()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? platform.nameAr        : platform.nameEn
  const desc = lang === 'ar' ? platform.descriptionAr : platform.description
  const slug = platform.nameEn.toLowerCase().replace(/\s+/g, '-')

  const tx = {
    folders: lang === 'ar' ? 'مجلد'       : 'folders',
    files:   lang === 'ar' ? 'ملف'        : 'files',
    open:    lang === 'ar' ? 'فتح المنصة' : 'Open Platform',
  }

  const firstLetter = (lang === 'ar' ? platform.nameAr : platform.nameEn).charAt(0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        background: isDark
          ? `linear-gradient(145deg, #161b22, ${platform.color}15)`
          : `linear-gradient(145deg, #ffffff, ${platform.color}10)`,
        border:     `1px solid ${hovered
          ? platform.color + '55'
          : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow:  hovered ? `0 8px 32px ${platform.color}28` : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/archive/${slug}`)}
    >
      {/* ── Square thumbnail ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '1 / 1',
          background:  `linear-gradient(135deg, ${platform.color}22, ${platform.color}08)`,
        }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, ${platform.color}35 0%, transparent 60%),
                            radial-gradient(circle at 80% 20%, ${platform.color}20 0%, transparent 50%)`,
        }} />

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

        <div className="absolute top-0 inset-x-0 h-0.5" style={{
          background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${platform.color}, transparent)`,
        }} />

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
          <ChevronRight className="w-4 h-4 shrink-0 transition-all duration-300" style={{
            color:     platform.color,
            transform: hovered
              ? isRTL ? 'rotate(180deg) translateX(4px)' : 'translateX(4px)'
              : isRTL ? 'rotate(180deg)' : 'none',
          }} />
        </div>
      </div>

      {/* ── Hover overlay — covers entire card including footer ── */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-10 flex flex-col justify-end p-5"
        style={{
          pointerEvents: hovered ? 'auto' : 'none',
          cursor:        'pointer',
          background: `linear-gradient(to top,
            ${platform.color}ff 0%,
            ${platform.color}f5 25%,
            ${platform.color}dd 50%,
            ${platform.color}99 70%,
            transparent 100%)`,
        }}
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
    </motion.div>
  )
}

/* ── Grid ── */
export default function PlatformGrid({
  initialPlatforms = INITIAL_PLATFORMS,
  isAdmin          = true,   // ← بتربطه بالباك اند بعدين
}: {
  initialPlatforms?: Platform[]
  isAdmin?:          boolean
}) {
  const { lang, isRTL }           = useLang()
  const { theme }                 = useTheme()
  const isDark                    = theme === 'dark'
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms)
  const [showModal, setShowModal] = useState(false)

  const tx = {
    title:       lang === 'ar' ? 'المنصات'       : 'Platforms',
    addPlatform: lang === 'ar' ? 'إضافة منصة'    : 'Add Platform',
  }

  const handleAdd = (p: Platform) => {
    setPlatforms(prev => [...prev, p])
  }

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

        {/* Add button — admin only */}
        {isAdmin && (
          <motion.button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #458482, #5ea8a4)',
              color:      '#ffffff',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              boxShadow:  '0 0 0 rgba(69,132,130,0)',
              cursor:     'pointer',
              transition: 'filter 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.filter = 'brightness(1.08)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(69,132,130,0.22)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = 'brightness(1)'
              e.currentTarget.style.boxShadow = '0 0 0 rgba(69,132,130,0)'
            }}
          >
            <Plus className="w-3 h-3" />
            {tx.addPlatform}
          </motion.button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {platforms.map((p, i) => (
          <PlatformCard key={p.id} platform={p} index={i} />
        ))}

        {/* Add card — admin only */}
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: platforms.length * 0.06 }}
            onClick={() => setShowModal(true)}
            className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col"
            style={{
              background:  'transparent',
              border:      `2px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
              transition:  'border-color 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#45848270' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)' }}
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
            onClose={() => setShowModal(false)}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </div>
  )
}