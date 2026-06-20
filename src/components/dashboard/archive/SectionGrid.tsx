"use client"

import { useState, useCallback, useMemo, memo } from "react"
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import { Plus, X, ExternalLink, Search, SlidersHorizontal } from 'lucide-react'
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

// ─── Module-level constants (zero per-render allocation) ───────────────────────
const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";

const TAG_OPTIONS = ['PNG', 'MP4', 'AE', 'PDF', 'BLEND'] as const;

const MODAL_BACKDROP_STYLE: React.CSSProperties = { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', cursor: 'pointer' };
const CLOSE_BUTTON_STYLE: React.CSSProperties = { color: TEXT_MUTED, cursor: 'pointer' };
const REQUIRED_ASTERISK_STYLE: React.CSSProperties = { color: '#ef4444' };
const DRIVE_LINK_STYLE: React.CSSProperties = { background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)', transition: 'background 0.18s' };
const EMPTY_ICON_STYLE: React.CSSProperties = { color: TEXT_MUTED, opacity: 0.4 };

function handleHoverBgEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'var(--hover-bg)';
}
function handleHoverBgLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'transparent';
}
function handleDriveLinkEnter(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.background = 'rgba(255,255,255,0.32)';
}
function handleDriveLinkLeave(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
}

/* ── TagOption ── */
const TagOption = memo(function TagOption({ tag, isSelected, isDark, onToggle }: {
  tag: string; isSelected: boolean; isDark: boolean; onToggle: (tag: string) => void;
}) {
  const tagColor = TAG_COLORS[tag];

  const style = useMemo<React.CSSProperties>(() => ({
    background: isSelected ? (tagColor + '25') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
    border:     `1px solid ${isSelected ? tagColor + '60' : 'transparent'}`,
    color:      isSelected ? tagColor : TEXT_MUTED,
    cursor:     'pointer',
  }), [isSelected, isDark, tagColor]);

  return (
    <button onClick={() => onToggle(tag)} className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all" style={style}>
      {tag}
    </button>
  );
});

/* ── Add Item Modal ── */
const AddItemModal = memo(function AddItemModal({
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

  const tx = useMemo(() => ({
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
  }), [lang]);

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

  const arabicInputStyle = useMemo<React.CSSProperties>(() => ({
    ...inputStyle, fontFamily: 'var(--font-arabic)',
  }), [inputStyle]);

  const textareaStyle = useMemo<React.CSSProperties>(() => ({
    ...inputStyle, resize: 'none',
  }), [inputStyle]);

  const arabicTextareaStyle = useMemo<React.CSSProperties>(() => ({
    ...inputStyle, resize: 'none', fontFamily: 'var(--font-arabic)',
  }), [inputStyle]);

  const driveInputStyle = useMemo<React.CSSProperties>(() => ({
    ...inputStyle, fontFamily: 'monospace', fontSize: '11px',
  }), [inputStyle]);

  const labelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize:      '10px',
    fontWeight:    700 as const,
    color:         TEXT_MUTED,
    marginBottom:  '4px',
    display:       'block' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang]);

  const driveLabelStyle = useMemo<React.CSSProperties>(() => ({
    ...labelStyle, color,
  }), [labelStyle, color]);

  const panelStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? '#161b22' : '#ffffff',
    border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
    boxShadow:  '0 24px 64px rgba(0,0,0,0.4)',
    maxHeight:  '90vh',
    cursor:     'default',
  }), [isDark]);

  const headerBorderStyle = useMemo<React.CSSProperties>(() => ({
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
  }), [isDark]);

  const footerBorderStyle = useMemo<React.CSSProperties>(() => ({
    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
  }), [isDark]);

  const iconWrapStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}, ${color}99)`,
  }), [color]);

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
  }), [lang]);

  const cancelButtonStyle = useMemo<React.CSSProperties>(() => ({
    background: 'var(--hover-bg)', color: TEXT_MUTED, cursor: 'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang]);

  const isAddDisabled = useMemo(
    () => !nameEn.trim() || !nameAr.trim() || !driveUrl.trim(),
    [nameEn, nameAr, driveUrl],
  );

  const addButtonStyle = useMemo<React.CSSProperties>(() => ({
    background: isAddDisabled ? 'var(--hover-bg)' : `linear-gradient(135deg, ${color}, ${color}cc)`,
    color:      isAddDisabled ? TEXT_MUTED : '#ffffff',
    cursor:     isAddDisabled ? 'not-allowed' : 'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    transition: 'filter 0.18s',
  }), [isAddDisabled, color, lang]);

  const handleAddButtonEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isAddDisabled) e.currentTarget.style.filter = 'brightness(1.1)';
  }, [isAddDisabled]);

  const handleAddButtonLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter = 'brightness(1)';
  }, []);

  const handleTagToggle = useCallback((t: string) => {
    setTag(prev => prev === t ? '' : t);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleAdd = () => {
    if (isAddDisabled) return
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
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={MODAL_BACKDROP_STYLE}
      onClick={handleBackdropClick}
    >
      <m.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={panelStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={headerBorderStyle}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconWrapStyle}>
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-black" style={titleStyle}>
              {tx.title}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={CLOSE_BUTTON_STYLE}
            onMouseEnter={handleHoverBgEnter}
            onMouseLeave={handleHoverBgLeave}
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
                style={arabicInputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{tx.descEn}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description..." rows={2} style={textareaStyle} />
          </div>
          <div>
            <label style={labelStyle}>{tx.descAr}</label>
            <textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)}
              placeholder="وصف مختصر..." dir="rtl" rows={2}
              style={arabicTextareaStyle} />
          </div>

          {/* Drive URL — required */}
          <div>
            <label style={driveLabelStyle}>
              {tx.drive} <span style={REQUIRED_ASTERISK_STYLE}>*</span>
            </label>
            <input value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
              placeholder={tx.drivePh} style={driveInputStyle} />
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
              {TAG_OPTIONS.map(t => (
                <TagOption key={t} tag={t} isSelected={tag === t} isDark={isDark} onToggle={handleTagToggle} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-2 shrink-0" style={footerBorderStyle}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={cancelButtonStyle}>
            {tx.cancel}
          </button>
          <button onClick={handleAdd}
            disabled={isAddDisabled}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={addButtonStyle}
            onMouseEnter={handleAddButtonEnter}
            onMouseLeave={handleAddButtonLeave}
          >
            {tx.add}
          </button>
        </div>
      </m.div>
    </m.div>
  )
})

/* ── Single item card ── */
const ItemCard = memo(function ItemCard({ item, color, index }: { item: ArchiveItem; color: string; index: number }) {
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

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark
      ? `linear-gradient(145deg, #161b22, ${color}12)`
      : `linear-gradient(145deg, #ffffff, ${color}08)`,
    border:     `1px solid ${hovered ? color + '50' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
    boxShadow:  hovered ? `0 8px 28px ${color}22` : 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  }), [isDark, hovered, color]);

  const thumbWrapStyle = useMemo<React.CSSProperties>(() => ({
    aspectRatio: '1 / 1',
    background:  `linear-gradient(135deg, ${color}20, ${color}08)`,
  }), [color]);

  const radialOverlayStyle = useMemo<React.CSSProperties>(() => ({
    backgroundImage: `radial-gradient(circle at 30% 50%, ${color}30 0%, transparent 60%),
                      radial-gradient(circle at 80% 20%, ${color}18 0%, transparent 50%)`,
  }), [color]);

  const fallbackLetterStyle = useMemo<React.CSSProperties>(() => ({
    fontSize:   'clamp(3rem, 6vw, 5rem)',
    color:      color + '25',
    fontFamily: 'var(--font-display)',
    lineHeight: 1,
  }), [color]);

  const topAccentStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${color}, transparent)`,
  }), [isRTL, color]);

  const tagBadgeStyle = useMemo<React.CSSProperties>(() => ({
    [isRTL ? 'left' : 'right']: '10px',
    background: tagColor + '25',
    color:      tagColor,
    border:     `1px solid ${tagColor}50`,
    backdropFilter: 'blur(8px)',
  }), [isRTL, tagColor]);

  const hoverOverlayStyle = useMemo<React.CSSProperties>(() => ({
    pointerEvents: hovered ? 'auto' : 'none',
    background: `linear-gradient(to top,
      ${color}ff 0%,
      ${color}f0 25%,
      ${color}cc 50%,
      ${color}88 70%,
      transparent 100%)`,
  }), [hovered, color]);

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color:         TEXT_MAIN,
    fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
    letterSpacing: lang === 'ar' ? 0 : '-0.01em',
  }), [lang]);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden" style={thumbWrapStyle}>
        <div className="absolute inset-0" style={radialOverlayStyle} />

        {item.thumbnail
          ? <img src={item.thumbnail} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          : (
            <div className="absolute inset-0 flex items-center justify-center select-none">
              <span className="font-black" style={fallbackLetterStyle}>
                {name.charAt(0)}
              </span>
            </div>
          )
        }

        {/* Top accent */}
        <div className="absolute top-0 inset-x-0 h-0.5" style={topAccentStyle} />

        {/* Tag badge */}
        {item.tag && (
          <div className="absolute top-3 px-2 py-0.5 rounded-full text-[9px] font-black" style={tagBadgeStyle}>
            {item.tag}
          </div>
        )}

        {/* Hover overlay */}
        <m.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex flex-col justify-end p-4"
          style={hoverOverlayStyle}
        >
          <m.div
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
              style={DRIVE_LINK_STYLE}
              onMouseEnter={handleDriveLinkEnter}
              onMouseLeave={handleDriveLinkLeave}
            >
              <ExternalLink className="w-3 h-3" />
              {lang === 'ar' ? 'فتح في الدرايف' : 'Open in Drive'}
            </div>
          </m.div>
        </m.div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-black truncate" style={titleStyle}>
          {name}
        </h3>
      </div>
    </m.div>
  )
})

/* ── SectionGrid ── */
function SectionGrid({
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

  // Combined into a single filter pass (was two sequential .filter() calls before)
  const sectionItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i => {
      if (i.sectionId !== activeSection.id) return false
      if (!q) return true
      return (
        i.nameEn.toLowerCase().includes(q) ||
        i.nameAr.includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tag?.toLowerCase().includes(q)
      )
    })
  }, [items, activeSection.id, search])

  const tx = useMemo(() => ({
    search:    lang === 'ar' ? 'ابحث في هذا التقسيم...' : 'Search this section...',
    addItem:   lang === 'ar' ? 'إضافة عنصر'             : 'Add Item',
    empty:     lang === 'ar' ? 'لا توجد نتائج'           : 'No results found',
    emptyHint: lang === 'ar' ? 'جرّب كلمة بحث أخرى'     : 'Try a different search term',
  }), [lang])

  const handleOpenModal  = useCallback(() => setShowModal(true), [])
  const handleCloseModal = useCallback(() => setShowModal(false), [])
  const handleAddItem    = useCallback((item: ArchiveItem) => {
    setItems(prev => [...prev, item])
  }, [])

  const searchIconStyle = useMemo<React.CSSProperties>(() => ({
    [isRTL ? 'right' : 'left']: '12px',
    color: TEXT_MUTED,
  }), [isRTL])

  const searchInputStyle = useMemo<React.CSSProperties>(() => ({
    background:  isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    border:      `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
    color:       TEXT_MAIN,
    paddingLeft:  isRTL ? '12px' : '34px',
    paddingRight: isRTL ? '34px' : '12px',
    fontFamily:  lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isDark, isRTL, lang])

  const addItemButtonStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color:      '#ffffff',
    cursor:     'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    transition: 'filter 0.18s, box-shadow 0.18s',
  }), [color, lang])

  const handleAddItemButtonEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter    = 'brightness(1.08)'
    e.currentTarget.style.boxShadow = `0 6px 16px ${color}35`
  }, [color])

  const handleAddItemButtonLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.filter    = 'brightness(1)'
    e.currentTarget.style.boxShadow = 'none'
  }, [])

  const addCardStyle = useMemo<React.CSSProperties>(() => ({
    background: 'transparent',
    border:     `2px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
    transition: 'border-color 0.3s',
  }), [isDark])

  const handleAddCardEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = color + '60'
  }, [color])

  const handleAddCardLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  }, [isDark])

  const addCardIconWrapStyle = useMemo<React.CSSProperties>(() => ({
    background: color + '15',
  }), [color])

  // Shared by the "no results" text and the "Add Item" label — identical expression in both spots
  const mutedTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  const emptyHintStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, opacity: 0.6, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  return (
    <LazyMotion features={domAnimation}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="select-none">

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={searchIconStyle}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx.search}
            className="w-full py-2 rounded-xl text-[12px] outline-none"
            style={searchInputStyle}
          />
        </div>

        {/* Add item — admin */}
        {isAdmin && (
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold shrink-0"
            style={addItemButtonStyle}
            onMouseEnter={handleAddItemButtonEnter}
            onMouseLeave={handleAddItemButtonLeave}
          >
            <Plus className="w-3 h-3" />
            {tx.addItem}
          </button>
        )}
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {sectionItems.length > 0 ? (
          <m.div
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
              <m.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionItems.length * 0.05 }}
                onClick={handleOpenModal}
                className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col"
                style={addCardStyle}
                onMouseEnter={handleAddCardEnter}
                onMouseLeave={handleAddCardLeave}
              >
                <div className="w-full flex flex-col items-center justify-center gap-3" style={{ aspectRatio: '1 / 1' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={addCardIconWrapStyle}>
                    <Plus className="w-5 h-5" style={{ color }} />
                  </div>
                  <span className="text-[11px] font-bold" style={mutedTextStyle}>
                    {lang === 'ar' ? 'إضافة عنصر' : 'Add Item'}
                  </span>
                </div>
                <div className="h-[52px] shrink-0" />
              </m.button>
            )}
          </m.div>
        ) : (
          <m.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <SlidersHorizontal className="w-8 h-8" style={EMPTY_ICON_STYLE} />
            <p className="text-sm font-bold" style={mutedTextStyle}>
              {tx.empty}
            </p>
            <p className="text-xs" style={emptyHintStyle}>
              {tx.emptyHint}
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AddItemModal
            sectionId={activeSection.id}
            color={color}
            onClose={handleCloseModal}
            onAdd={handleAddItem}
          />
        )}
      </AnimatePresence>
    </div>
    </LazyMotion>
  )
}

export default memo(SectionGrid)