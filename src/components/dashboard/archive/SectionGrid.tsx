"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Upload, ExternalLink, Search, SlidersHorizontal } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import type { Section } from '@/components/dashboard/archive/SectionTabs'

/* ── Types ── */
export interface ArchiveItem {
  id:          string
  sectionId:   string
  nameEn:      string
  nameAr:      string
  description:   string
  descriptionAr: string
  thumbnail?:  string
  driveUrl:    string
  tag?:        string   // e.g. "AE" | "PNG" | "MP4" | "PDF"
}

/* ── Mock items ── */
const INITIAL_ITEMS: ArchiveItem[] = [
  { id: '1', sectionId: 'published', nameEn: 'Post #1',   nameAr: 'منشور 1',  description: 'Instagram carousel — product launch',       descriptionAr: 'كاروسيل إنستغرام — إطلاق المنتج',       driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '2', sectionId: 'published', nameEn: 'Post #2',   nameAr: 'منشور 2',  description: 'Twitter thread graphics pack',               descriptionAr: 'حزمة رسومات سلسلة تويتر',               driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '3', sectionId: 'published', nameEn: 'Post #3',   nameAr: 'منشور 3',  description: 'LinkedIn cover image series',                descriptionAr: 'سلسلة صور غلاف لينكدإن',                driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '4', sectionId: 'published', nameEn: 'Post #4',   nameAr: 'منشور 4',  description: 'Ramadan campaign visual set',                descriptionAr: 'مجموعة بصريات حملة رمضان',              driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '5', sectionId: 'videos',    nameEn: 'Video #1',  nameAr: 'فيديو 1',  description: 'Brand intro animation 30s',                  descriptionAr: 'انيميشن تعريف العلامة التجارية 30 ثانية', driveUrl: 'https://drive.google.com', tag: 'MP4' },
  { id: '6', sectionId: 'videos',    nameEn: 'Video #2',  nameAr: 'فيديو 2',  description: 'Product demo reel',                          descriptionAr: 'ريل عرض المنتج',                         driveUrl: 'https://drive.google.com', tag: 'MP4' },
  { id: '7', sectionId: 'designs',   nameEn: 'Design #1', nameAr: 'تصميم 1',  description: 'Motion graphics project file',               descriptionAr: 'ملف مشروع موشن جرافيك',                 driveUrl: 'https://drive.google.com', tag: 'AE'  },
  { id: '8', sectionId: 'designs',   nameEn: 'Design #2', nameAr: 'تصميم 2',  description: 'Logo animation source file',                 descriptionAr: 'ملف مصدر انيميشن الشعار',               driveUrl: 'https://drive.google.com', tag: 'AE'  },
  { id: '9', sectionId: 'documents', nameEn: 'Brief #1',  nameAr: 'موجز 1',   description: 'Q1 campaign creative brief',                 descriptionAr: 'الموجز الإبداعي لحملة الربع الأول',      driveUrl: 'https://drive.google.com', tag: 'PDF' },
]

const TAG_COLORS: Record<string, string> = {
  AE:   '#9d6bff',
  PNG:  '#10b981',
  MP4:  '#ef4444',
  PDF:  '#f59e0b',
  BLEND:'#f97316',
}

/* ── Add Item Modal ── */
function AddItemModal({
  sectionId,
  color,
  onClose,
  onAdd,
}: {
  sectionId: string
  color:     string
  onClose:   () => void
  onAdd:     (item: ArchiveItem) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [nameEn,        setNameEn]        = useState('')
  const [nameAr,        setNameAr]        = useState('')
  const [description,   setDescription]   = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')
  const [driveUrl,      setDriveUrl]      = useState('')
  const [thumbnailUrl,  setThumbnailUrl]  = useState('')
  const [tag,           setTag]           = useState('')

  const tx = {
    title:    lang === 'ar' ? 'إضافة عنصر جديد'     : 'Add New Item',
    nameEn:   lang === 'ar' ? 'الاسم بالإنجليزي'    : 'English Name',
    nameAr:   lang === 'ar' ? 'الاسم بالعربي'       : 'Arabic Name',
    descEn:   lang === 'ar' ? 'الوصف بالإنجليزي'    : 'English Description',
    descAr:   lang === 'ar' ? 'الوصف بالعربي'       : 'Arabic Description',
    drive:    lang === 'ar' ? 'رابط الدرايف'         : 'Drive URL',
    drivePh:  lang === 'ar' ? 'https://drive.google.com/...' : 'https://drive.google.com/...',
    thumb:    lang === 'ar' ? 'رابط الصورة (اختياري)' : 'Thumbnail URL (optional)',
    tagLabel: lang === 'ar' ? 'نوع الملف'            : 'File Type',
    add:      lang === 'ar' ? 'إضافة'               : 'Add Item',
    cancel:   lang === 'ar' ? 'إلغاء'               : 'Cancel',
  }

  const inputStyle = {
    background:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
    color:        'var(--foreground)',
    borderRadius: '10px',
    padding:      '8px 12px',
    fontSize:     '12px',
    width:        '100%',
    outline:      'none',
  }

  const labelStyle = {
    fontSize:      '10px',
    fontWeight:    700 as const,
    color:         'var(--foreground-muted)',
    marginBottom:  '4px',
    display:       'block' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }

  const handleAdd = () => {
    if (!nameEn.trim() || !nameAr.trim() || !driveUrl.trim()) return
    onAdd({
      id:            Date.now().toString(),
      sectionId,
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      driveUrl:      driveUrl.trim(),
      thumbnail:     thumbnailUrl.trim() || undefined,
      tag:           tag.trim().toUpperCase() || undefined,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', cursor: 'pointer' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
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
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-black" style={{
              color:      'var(--foreground)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            }}>
              {tx.title}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{tx.nameEn}</label>
              <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Post #1" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{tx.nameAr}</label>
              <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="منشور 1" dir="rtl"
                style={{ ...inputStyle, fontFamily: 'var(--font-arabic)' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{tx.descEn}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div>
            <label style={labelStyle}>{tx.descAr}</label>
            <textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)}
              placeholder="وصف مختصر..." dir="rtl" rows={2}
              style={{ ...inputStyle, resize: 'none', fontFamily: 'var(--font-arabic)' }} />
          </div>

          {/* Drive URL — required */}
          <div>
            <label style={{ ...labelStyle, color: color }}>
              {tx.drive} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
              placeholder={tx.drivePh} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px' }} />
          </div>

          {/* Thumbnail */}
          <div>
            <label style={labelStyle}>{tx.thumb}</label>
            <input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)}
              placeholder="/platforms/thumb.png" style={inputStyle} />
          </div>

          {/* Tag */}
          <div>
            <label style={labelStyle}>{tx.tagLabel}</label>
            <div className="flex gap-2 flex-wrap">
              {['PNG', 'MP4', 'AE', 'PDF', 'BLEND'].map(t => (
                <button key={t} onClick={() => setTag(tag === t ? '' : t)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
                  style={{
                    background: tag === t ? (TAG_COLORS[t] + '25') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    border:     `1px solid ${tag === t ? TAG_COLORS[t] + '60' : 'transparent'}`,
                    color:      tag === t ? TAG_COLORS[t] : 'var(--foreground-muted)',
                    cursor:     'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-2 shrink-0"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={{ background: 'var(--hover-bg)', color: 'var(--foreground-muted)', cursor: 'pointer',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {tx.cancel}
          </button>
          <button onClick={handleAdd}
            disabled={!nameEn.trim() || !nameAr.trim() || !driveUrl.trim()}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={{
              background: (!nameEn.trim() || !nameAr.trim() || !driveUrl.trim()) ? 'var(--hover-bg)' : `linear-gradient(135deg, ${color}, ${color}cc)`,
              color:      (!nameEn.trim() || !nameAr.trim() || !driveUrl.trim()) ? 'var(--foreground-muted)' : '#ffffff',
              cursor:     (!nameEn.trim() || !nameAr.trim() || !driveUrl.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              transition: 'filter 0.18s',
            }}
            onMouseEnter={e => { if (nameEn.trim() && nameAr.trim() && driveUrl.trim()) e.currentTarget.style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
          >
            {tx.add}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Single item card ── */
function ItemCard({ item, color, index }: { item: ArchiveItem; color: string; index: number }) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? item.nameAr        : item.nameEn
  const desc = lang === 'ar' ? item.descriptionAr : item.description
  const tagColor = item.tag ? (TAG_COLORS[item.tag] ?? color) : color

  const handleClick = () => {
    window.open(item.driveUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        background: isDark
          ? `linear-gradient(145deg, #161b22, ${color}12)`
          : `linear-gradient(145deg, #ffffff, ${color}08)`,
        border:     `1px solid ${hovered
          ? color + '50'
          : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow:  hovered ? `0 8px 28px ${color}22` : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '1 / 1',
          background:  `linear-gradient(135deg, ${color}20, ${color}08)`,
        }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, ${color}30 0%, transparent 60%),
                            radial-gradient(circle at 80% 20%, ${color}18 0%, transparent 50%)`,
        }} />

        {item.thumbnail
          ? <img src={item.thumbnail} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          : (
            <div className="absolute inset-0 flex items-center justify-center select-none">
              <span className="font-black" style={{
                fontSize:   'clamp(3rem, 6vw, 5rem)',
                color:      color + '25',
                fontFamily: 'var(--font-display)',
                lineHeight: 1,
              }}>
                {(lang === 'ar' ? item.nameAr : item.nameEn).charAt(0)}
              </span>
            </div>
          )
        }

        {/* Top accent */}
        <div className="absolute top-0 inset-x-0 h-0.5" style={{
          background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${color}, transparent)`,
        }} />

        {/* Tag badge */}
        {item.tag && (
          <div
            className="absolute top-3 px-2 py-0.5 rounded-full text-[9px] font-black"
            style={{
              [isRTL ? 'left' : 'right']: '10px',
              background: tagColor + '25',
              color:      tagColor,
              border:     `1px solid ${tagColor}50`,
              backdropFilter: 'blur(8px)',
            }}
          >
            {item.tag}
          </div>
        )}

        {/* Hover overlay */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex flex-col justify-end p-4"
          style={{
            pointerEvents: hovered ? 'auto' : 'none',
            background: `linear-gradient(to top,
              ${color}ff 0%,
              ${color}f0 25%,
              ${color}cc 50%,
              ${color}88 70%,
              transparent 100%)`,
          }}
        >
          <motion.div
            animate={{ y: hovered ? 0 : 10, opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <p className="text-[10px] text-white/90 mb-2 leading-relaxed"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {desc}
            </p>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
              style={{
                background: 'rgba(255,255,255,0.22)',
                border:     '1px solid rgba(255,255,255,0.4)',
                transition: 'background 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.32)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
            >
              <ExternalLink className="w-3 h-3" />
              {lang === 'ar' ? 'فتح في الدرايف' : 'Open in Drive'}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-black truncate" style={{
          color:         'var(--foreground)',
          fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
          letterSpacing: lang === 'ar' ? 0 : '-0.01em',
        }}>
          {name}
        </h3>
      </div>
    </motion.div>
  )
}

/* ── SectionGrid ── */
export default function SectionGrid({
  activeSection,
  color   = '#458482',
  isAdmin = true,
}: {
  activeSection: Section
  color?:        string
  isAdmin?:      boolean
}) {
  const { lang, isRTL }       = useLang()
  const { theme }             = useTheme()
  const isDark                = theme === 'dark'
  const [items, setItems]     = useState<ArchiveItem[]>(INITIAL_ITEMS)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch]   = useState('')

  const sectionItems = items
    .filter(i => i.sectionId === activeSection.id)
    .filter(i => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        i.nameEn.toLowerCase().includes(q) ||
        i.nameAr.includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tag?.toLowerCase().includes(q)
      )
    })

  const tx = {
    search:    lang === 'ar' ? 'ابحث في هذا التقسيم...' : 'Search this section...',
    addItem:   lang === 'ar' ? 'إضافة عنصر'             : 'Add Item',
    empty:     lang === 'ar' ? 'لا توجد نتائج'           : 'No results found',
    emptyHint: lang === 'ar' ? 'جرّب كلمة بحث أخرى'     : 'Try a different search term',
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="select-none">

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{
              [isRTL ? 'right' : 'left']: '12px',
              color: 'var(--foreground-muted)',
            }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx.search}
            className="w-full py-2 rounded-xl text-[12px] outline-none"
            style={{
              background:  isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              border:      `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
              color:       'var(--foreground)',
              paddingLeft:  isRTL ? '12px' : '34px',
              paddingRight: isRTL ? '34px' : '12px',
              fontFamily:  lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          />
        </div>

        {/* Add item — admin */}
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold shrink-0"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              color:      '#ffffff',
              cursor:     'pointer',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              transition: 'filter 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.filter    = 'brightness(1.08)'
              e.currentTarget.style.boxShadow = `0 6px 16px ${color}35`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter    = 'brightness(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <Plus className="w-3 h-3" />
            {tx.addItem}
          </button>
        )}
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {sectionItems.length > 0 ? (
          <motion.div
            key={activeSection.id + search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {sectionItems.map((item, i) => (
              <ItemCard key={item.id} item={item} color={color} index={i} />
            ))}

            {/* Add card — admin */}
            {isAdmin && !search && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionItems.length * 0.05 }}
                onClick={() => setShowModal(true)}
                className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col"
                style={{
                  background:  'transparent',
                  border:      `2px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                  transition:  'border-color 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + '60' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)' }}
              >
                <div className="w-full flex flex-col items-center justify-center gap-3" style={{ aspectRatio: '1 / 1' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: color + '15' }}>
                    <Plus className="w-5 h-5" style={{ color }} />
                  </div>
                  <span className="text-[11px] font-bold"
                    style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                    {lang === 'ar' ? 'إضافة عنصر' : 'Add Item'}
                  </span>
                </div>
                <div className="h-[52px] shrink-0" />
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <SlidersHorizontal className="w-8 h-8" style={{ color: 'var(--foreground-muted)', opacity: 0.4 }} />
            <p className="text-sm font-bold" style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {tx.empty}
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)', opacity: 0.6, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {tx.emptyHint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AddItemModal
            sectionId={activeSection.id}
            color={color}
            onClose={() => setShowModal(false)}
            onAdd={item => setItems(prev => [...prev, item])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}