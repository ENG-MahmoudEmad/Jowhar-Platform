//src\components\dashboard\archive\SectionGrid.tsx
"use client"

import { useState, useCallback, useMemo, useRef, memo } from "react"
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import { Plus, X, ExternalLink, Search, SlidersHorizontal, Upload, Pipette, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'
import type { Section } from '@/components/dashboard/archive/SectionTabs'
import ViewToggle, { type ViewMode } from '@/components/dashboard/archive/ViewToggle'
import { useSmartSearch } from '@/lib/useSmartSearch'
import { useUndoableDelete } from '@/lib/useUndoableDelete'
import UndoToastHost from '@/components/dashboard/archive/UndoToast'

/* ── Types ── */
export interface ArchiveItem {
  id:          string
  sectionId:   string
  nameEn:      string
  nameAr:      string
  description:   string
  descriptionAr: string
  /**
   * Image source for the card.
   *
   * While there is no backend this holds a data URL produced by FileReader, which
   * is fine for previewing but must NOT be persisted — data URLs bloat every row
   * and every response. See the BACKEND NOTE at the bottom of this file.
   */
  thumbnail?:  string
  /**
   * Drive URL for the whole item's folder. Shown at the top of the file-list
   * page (the level below this one), not opened directly from the card
   * anymore — clicking a card now drills into that file-list page instead.
   */
  driveUrl:    string
  tag?:        string   // key into `fileTypes`, e.g. "AE" | "PNG" | "MP4" | "PDF"
}

/* ── File type registry ── */
export interface FileType {
  key:   string
  color: string
}

/**
 * Starting set — mirrors the old hardcoded TAG_COLORS, but is now data the
 * admin can extend from the Add Item form (new extension + a chosen color).
 * See BACKEND NOTE: this needs a real `file_types` table so additions persist
 * for everyone, not just this browser tab.
 */
export const DEFAULT_FILE_TYPES: FileType[] = [
  { key: 'AE',    color: '#9d6bff' },
  { key: 'PNG',   color: '#10b981' },
  { key: 'MP4',   color: '#ef4444' },
  { key: 'PDF',   color: '#f59e0b' },
  { key: 'BLEND', color: '#f97316' },
]

/* ── Mock items ── */
export const INITIAL_ITEMS: ArchiveItem[] = [
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

// ─── Module-level constants (zero per-render allocation) ───────────────────────
const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";

/** Rejected before reading, so a huge file never gets turned into a data URL. */
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5 MB

/** A curated starting palette for "add a new file type" — avoids the admin
    landing on a muddy or unreadable color, while still letting them pick
    freely via the native color input beside it. */
const NEW_TYPE_COLOR_SWATCHES = ['#458482', '#3b82f6', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#84cc16', '#f43f5e'];

const MODAL_BACKDROP_STYLE: React.CSSProperties = { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', cursor: 'pointer' };
const CLOSE_BUTTON_STYLE: React.CSSProperties = { color: TEXT_MUTED, cursor: 'pointer' };
const REQUIRED_ASTERISK_STYLE: React.CSSProperties = { color: '#ef4444' };
const DRIVE_LINK_STYLE: React.CSSProperties = { background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)', transition: 'background 0.18s' };
const EMPTY_ICON_STYLE: React.CSSProperties = { color: TEXT_MUTED, opacity: 0.4 };
const HIDDEN_FILE_INPUT_STYLE: React.CSSProperties = { display: 'none' };
const ERROR_TEXT_STYLE: React.CSSProperties = { color: '#ef4444', fontSize: '10px', marginTop: '4px' };

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ── TagOption ── */
const TagOption = memo(function TagOption({ fileType, isSelected, isDark, onToggle }: {
  fileType: FileType; isSelected: boolean; isDark: boolean; onToggle: (key: string) => void;
}) {
  const style = useMemo<React.CSSProperties>(() => ({
    background: isSelected ? (fileType.color + '25') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
    border:     `1px solid ${isSelected ? fileType.color + '60' : 'transparent'}`,
    color:      isSelected ? fileType.color : TEXT_MUTED,
    cursor:     'pointer',
  }), [isSelected, isDark, fileType.color]);

  const handleClick = useCallback(() => onToggle(fileType.key), [onToggle, fileType.key]);

  return (
    <button onClick={handleClick} className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all" style={style}>
      {fileType.key}
    </button>
  );
});

/* ── New file-type composer (inline, inside Add Item modal) ── */
const NewFileTypeComposer = memo(function NewFileTypeComposer({
  isDark, lang, onCreate, onCancel,
}: {
  isDark:   boolean
  lang:     string
  onCreate: (ft: FileType) => void
  onCancel: () => void
}) {
  const [key,   setKey]   = useState('')
  const [color, setColor] = useState(NEW_TYPE_COLOR_SWATCHES[0])

  const tx = useMemo(() => ({
    placeholder: lang === 'ar' ? 'مثال: PSD' : 'e.g. PSD',
    create:      lang === 'ar' ? 'إنشاء'      : 'Create',
    cancel:      lang === 'ar' ? 'إلغاء'      : 'Cancel',
  }), [lang]);

  const isValid = key.trim().length > 0 && key.trim().length <= 8;

  const handleKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  }, []);

  const handleSwatchClick = useCallback((c: string) => setColor(c), []);

  const handleCreate = useCallback(() => {
    if (!isValid) return;
    onCreate({ key: key.trim(), color });
  }, [isValid, key, color, onCreate]);

  const inputStyle = useMemo<React.CSSProperties>(() => ({
    background:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
    color:        TEXT_MAIN,
    borderRadius: '8px',
    padding:      '6px 10px',
    fontSize:     '11px',
    fontFamily:   'monospace',
    width:        '90px',
    outline:      'none',
  }), [isDark]);

  const createBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: isValid ? color : 'var(--hover-bg)',
    color:      isValid ? '#ffffff' : TEXT_MUTED,
    cursor:     isValid ? 'pointer' : 'not-allowed',
  }), [isValid, color]);

  return (
    <div className="flex items-center gap-2 flex-wrap px-2.5 py-2 rounded-lg"
      style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}` }}>
      <input value={key} onChange={handleKeyChange} placeholder={tx.placeholder} maxLength={8} style={inputStyle} autoFocus />

      <div className="flex items-center gap-1">
        {NEW_TYPE_COLOR_SWATCHES.map(c => (
          <button key={c} type="button" onClick={() => handleSwatchClick(c)}
            className="w-4 h-4 rounded-full shrink-0"
            style={{ background: c, boxShadow: c === color ? `0 0 0 2px var(--card-bg, #161b22), 0 0 0 3px ${c}` : 'none' }}
          />
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border-0 p-0 shrink-0" title={lang === 'ar' ? 'لون مخصص' : 'Custom color'} />
      </div>

      <button type="button" onClick={handleCreate} disabled={!isValid}
        className="px-2.5 py-1 rounded-md text-[10px] font-bold" style={createBtnStyle}>
        {tx.create}
      </button>
      <button type="button" onClick={onCancel}
        className="px-2 py-1 rounded-md text-[10px] font-bold" style={{ color: TEXT_MUTED, cursor: 'pointer' }}>
        {tx.cancel}
      </button>
    </div>
  );
});

/* ── Add Item Modal ── */
const AddItemModal = memo(function AddItemModal({
  sectionId,
  color,
  fileTypes,
  editingItem,
  onClose,
  onAdd,
  onSave,
  onCreateFileType,
}: {
  sectionId: string
  color:     string
  fileTypes: FileType[]
  /** Present → editing an existing item; absent → creating one. */
  editingItem?: ArchiveItem | null
  onClose:   () => void
  onAdd:     (item: ArchiveItem) => void
  onSave:    (id: string, updates: Omit<ArchiveItem, 'id' | 'sectionId'>) => void
  onCreateFileType: (ft: FileType) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const isEditing        = !!editingItem
  const [nameEn,        setNameEn]        = useState(editingItem?.nameEn ?? '')
  const [nameAr,        setNameAr]        = useState(editingItem?.nameAr ?? '')
  const [description,   setDescription]   = useState(editingItem?.description ?? '')
  const [descriptionAr, setDescriptionAr] = useState(editingItem?.descriptionAr ?? '')
  const [driveUrl,      setDriveUrl]      = useState(editingItem?.driveUrl ?? '')
  const [tag,           setTag]           = useState(editingItem?.tag ?? '')
  const [addingType,    setAddingType]    = useState(false)

  const [thumbnailPath,  setThumbnailPath]  = useState('')
  const [thumbnailData,  setThumbnailData]  = useState(editingItem?.thumbnail ?? '')
  const [thumbnailError, setThumbnailError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tx = useMemo(() => ({
    titleAdd: lang === 'ar' ? 'إضافة عنصر جديد'     : 'Add New Item',
    titleEdit:lang === 'ar' ? 'تعديل العنصر'        : 'Edit Item',
    nameEn:   lang === 'ar' ? 'الاسم بالإنجليزي'    : 'English Name',
    nameAr:   lang === 'ar' ? 'الاسم بالعربي'       : 'Arabic Name',
    descEn:   lang === 'ar' ? 'الوصف بالإنجليزي'    : 'English Description',
    descAr:   lang === 'ar' ? 'الوصف بالعربي'       : 'Arabic Description',
    drive:    lang === 'ar' ? 'رابط مجلد الدرايف'    : 'Drive Folder URL',
    drivePh:  lang === 'ar' ? 'https://drive.google.com/...' : 'https://drive.google.com/...',
    thumb:    lang === 'ar' ? 'الصورة المصغرة (اختياري)' : 'Thumbnail (optional)',
    thumbPh:  lang === 'ar' ? 'لم يتم اختيار ملف'   : 'No file chosen',
    choose:   lang === 'ar' ? 'اختر ملف'             : 'Choose File',
    remove:   lang === 'ar' ? 'إزالة الصورة'         : 'Remove image',
    errType:  lang === 'ar' ? 'الملف المختار ليس صورة' : 'The selected file is not an image',
    errSize:  lang === 'ar' ? 'حجم الصورة يتجاوز 5 ميجابايت' : 'Image exceeds the 5 MB limit',
    errRead:  lang === 'ar' ? 'تعذّرت قراءة الملف'   : 'Could not read the file',
    tagLabel: lang === 'ar' ? 'نوع الملف'            : 'File Type',
    addType:  lang === 'ar' ? 'إضافة نوع جديد'       : 'Add new type',
    add:      lang === 'ar' ? 'إضافة'               : 'Add Item',
    save:     lang === 'ar' ? 'حفظ التعديلات'        : 'Save Changes',
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

  const thumbnailFieldStyle = useMemo<React.CSSProperties>(() => ({
    ...inputStyle,
    color: thumbnailPath ? TEXT_MAIN : TEXT_MUTED,
    cursor: 'pointer',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }), [inputStyle, thumbnailPath]);

  const chooseFileButtonStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    border:     `1px solid ${color}55`,
    color,
    borderRadius: '10px',
    padding:      '8px 12px',
    fontSize:     '11px',
    fontWeight:   700,
    cursor:       'pointer',
    whiteSpace:   'nowrap' as const,
    fontFamily:   lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isDark, color, lang]);

  const thumbnailPreviewStyle = useMemo<React.CSSProperties>(() => ({
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
  }), [isDark]);

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

  const handleOpenTypeComposer = useCallback(() => setAddingType(true), []);
  const handleCancelTypeComposer = useCallback(() => setAddingType(false), []);
  const handleCreateType = useCallback((ft: FileType) => {
    onCreateFileType(ft);
    setTag(ft.key);
    setAddingType(false);
  }, [onCreateFileType]);

  /* ── Thumbnail upload ── */
  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setThumbnailError('');

    if (!file.type.startsWith('image/')) {
      setThumbnailError(tx.errType);
      return;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      setThumbnailError(tx.errSize);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setThumbnailData(dataUrl);
      setThumbnailPath(file.name);
    } catch {
      setThumbnailError(tx.errRead);
    }
  }, [tx.errType, tx.errSize, tx.errRead]);

  const handleRemoveThumbnail = useCallback(() => {
    setThumbnailData('');
    setThumbnailPath('');
    setThumbnailError('');
  }, []);

  const handleSubmit = () => {
    if (isAddDisabled) return
    const payload = {
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      driveUrl:      driveUrl.trim(),
      thumbnail:     thumbnailData || undefined,
      tag:           tag.trim().toUpperCase() || undefined,
    }
    if (isEditing && editingItem) {
      onSave(editingItem.id, payload)
    } else {
      onAdd({ id: Date.now().toString(), sectionId, ...payload })
    }
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
              {isEditing ? <Pencil className="w-3.5 h-3.5 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-sm font-black" style={titleStyle}>
              {isEditing ? tx.titleEdit : tx.titleAdd}
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

          {/* Drive URL — required, this is the WHOLE FOLDER link shown at the
              top of the file-list page, not a single-file link */}
          <div>
            <label style={driveLabelStyle}>
              {tx.drive} <span style={REQUIRED_ASTERISK_STYLE}>*</span>
            </label>
            <input value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
              placeholder={tx.drivePh} style={driveInputStyle} />
          </div>

          {/* Thumbnail — upload from device (same pattern as Add Platform) */}
          <div>
            <label style={labelStyle}>{tx.thumb}</label>

            <div className="flex items-center gap-2">
              <div
                onClick={handleChooseFile}
                style={thumbnailFieldStyle}
                title={thumbnailPath || tx.thumbPh}
              >
                {thumbnailPath || tx.thumbPh}
              </div>

              <button
                type="button"
                onClick={handleChooseFile}
                className="flex items-center gap-1.5 shrink-0"
                style={chooseFileButtonStyle}
              >
                <Upload className="w-3 h-3" />
                {tx.choose}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={HIDDEN_FILE_INPUT_STYLE}
            />

            {thumbnailError && <p style={ERROR_TEXT_STYLE}>{thumbnailError}</p>}

            {thumbnailData && (
              <div className="flex items-center gap-2 mt-2">
                <img
                  src={thumbnailData}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                  style={thumbnailPreviewStyle}
                />
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={CLOSE_BUTTON_STYLE}
                  aria-label={tx.remove}
                  title={tx.remove}
                  onMouseEnter={handleHoverBgEnter}
                  onMouseLeave={handleHoverBgLeave}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* File type — now a live, extensible registry */}
          <div>
            <label style={labelStyle}>{tx.tagLabel}</label>
            <div className="flex gap-2 flex-wrap items-center">
              {fileTypes.map(ft => (
                <TagOption key={ft.key} fileType={ft} isSelected={tag === ft.key} isDark={isDark} onToggle={handleTagToggle} />
              ))}
              {!addingType && (
                <button type="button" onClick={handleOpenTypeComposer}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                  style={{ border: `1px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, color: TEXT_MUTED, cursor: 'pointer' }}
                >
                  <Plus className="w-3 h-3" />
                  {tx.addType}
                </button>
              )}
            </div>
            {addingType && (
              <div className="mt-2">
                <NewFileTypeComposer isDark={isDark} lang={lang} onCreate={handleCreateType} onCancel={handleCancelTypeComposer} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-2 shrink-0" style={footerBorderStyle}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={cancelButtonStyle}>
            {tx.cancel}
          </button>
          <button onClick={handleSubmit}
            disabled={isAddDisabled}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={addButtonStyle}
            onMouseEnter={handleAddButtonEnter}
            onMouseLeave={handleAddButtonLeave}
          >
            {isEditing ? tx.save : tx.add}
          </button>
        </div>
      </m.div>
    </m.div>
  )
})

/* ── Single item card (Grid mode) ── */
const ItemCard = memo(function ItemCard({ item, color, index, fileTypeColor, isAdmin, onOpen, onEdit, onDelete }: {
  item: ArchiveItem; color: string; index: number; fileTypeColor: string; isAdmin: boolean
  onOpen: (item: ArchiveItem) => void
  onEdit: (item: ArchiveItem) => void
  onDelete: (item: ArchiveItem) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? item.nameAr        : item.nameEn
  const desc = lang === 'ar' ? item.descriptionAr : item.description

  const handleClick = useCallback(() => onOpen(item), [onOpen, item]);
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleEditClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(item) }, [onEdit, item]);
  const handleDeleteClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(item) }, [onDelete, item]);

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
    background: fileTypeColor + '25',
    color:      fileTypeColor,
    border:     `1px solid ${fileTypeColor}50`,
    backdropFilter: 'blur(8px)',
  }), [isRTL, fileTypeColor]);

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

        <div className="absolute top-0 inset-x-0 h-0.5" style={topAccentStyle} />

        {item.tag && (
          <div className="absolute top-3 px-2 py-0.5 rounded-full text-[9px] font-black" style={tagBadgeStyle}>
            {item.tag}
          </div>
        )}

        {isAdmin && (
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
            >
              <ChevronRight className="w-3 h-3" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              {lang === 'ar' ? 'عرض الملفات' : 'View Files'}
            </div>
          </m.div>
        </m.div>
      </div>

      <div className="px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-black truncate" style={titleStyle}>
          {name}
        </h3>
      </div>
    </m.div>
  )
})

/* ── Single item row (List mode) ── */
const ItemListRow = memo(function ItemListRow({ item, color, index, fileTypeColor, isAdmin, onOpen, onEdit, onDelete }: {
  item: ArchiveItem; color: string; index: number; fileTypeColor: string; isAdmin: boolean
  onOpen: (item: ArchiveItem) => void
  onEdit: (item: ArchiveItem) => void
  onDelete: (item: ArchiveItem) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? item.nameAr : item.nameEn

  const handleClick = useCallback(() => onOpen(item), [onOpen, item]);
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleEditClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(item) }, [onEdit, item]);
  const handleDeleteClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(item) }, [onDelete, item]);

  const rowStyle = useMemo<React.CSSProperties>(() => ({
    background: hovered ? (isDark ? `${color}12` : `${color}0a`) : 'transparent',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    transition: 'background 0.15s',
  }), [hovered, isDark, color]);

  const thumbStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}22, ${color}08)`,
  }), [color]);

  const tagBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: fileTypeColor + '20', color: fileTypeColor, border: `1px solid ${fileTypeColor}40`,
  }), [fileTypeColor]);

  const chevronStyle = useMemo<React.CSSProperties>(() => ({
    color, transform: isRTL ? 'rotate(180deg)' : 'none', opacity: hovered ? 1 : 0.4, transition: 'opacity 0.15s',
  }), [color, isRTL, hovered]);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
      style={rowStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={thumbStyle}>
        {item.thumbnail
          ? <img src={item.thumbnail} alt={name} className="w-full h-full object-cover" />
          : <span className="text-xs font-black" style={{ color, fontFamily: 'var(--font-display)' }}>{name.charAt(0)}</span>
        }
      </div>

      <div className="flex-1 min-w-0 text-[12.5px] font-bold truncate" style={{
        color: TEXT_MAIN, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
      }}>
        {name}
      </div>

      {item.tag && (
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black" style={tagBadgeStyle}>
          {item.tag}
        </span>
      )}

      {isAdmin && (
        <m.div animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.15 }} className="flex gap-1 shrink-0">
          <button onClick={handleEditClick} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: TEXT_MUTED }}>
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={handleDeleteClick} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: '#ef4444' }}>
            <Trash2 className="w-3 h-3" />
          </button>
        </m.div>
      )}

      <ChevronRight className="w-4 h-4 shrink-0" style={chevronStyle} />
    </m.div>
  )
})

/* ── SectionGrid ── */
function SectionGrid({
  activeSection,
  color        = '#458482',
  isAdmin      = true,
  platformSlug,
  workId,
}: {
  activeSection: Section
  color?:        string
  isAdmin?:      boolean
  /** Needed to build the route to the file-list page one level down. */
  platformSlug:  string
  workId:        string
}) {
  const { lang, isRTL }       = useLang()
  const { theme }             = useTheme()
  const router                = useRouter()
  const isDark                = theme === 'dark'
  const [items, setItems]     = useState<ArchiveItem[]>(INITIAL_ITEMS)
  const [fileTypes, setFileTypes] = useState<FileType[]>(DEFAULT_FILE_TYPES)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ArchiveItem | null>(null)
  const [search, setSearch]   = useState('')

  const { pendingDeletions, isPending, scheduleDelete, undo } = useUndoableDelete()

  // TEMPORARY — not persisted cross-device yet, see BACKEND NOTE in ViewToggle.tsx
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const fileTypeColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const ft of fileTypes) map.set(ft.key, ft.color)
    return map
  }, [fileTypes])

  const getFileTypeColor = useCallback(
    (tag?: string) => (tag && fileTypeColorMap.get(tag)) || color,
    [fileTypeColorMap, color]
  )

  /* Items mid-delete-countdown vanish from the grid/list immediately — the
     undo toast, not their continued presence here, is what keeps them
     recoverable. */
  const itemsInSection = useMemo(
    () => items.filter(i => i.sectionId === activeSection.id && !isPending(i.id)),
    [items, activeSection.id, isPending]
  )

  const getItemSearchFields = useCallback(
    (i: ArchiveItem) => [i.nameEn, i.nameAr, i.description, i.descriptionAr, i.tag],
    []
  )
  const sectionItems = useSmartSearch(itemsInSection, search, getItemSearchFields)

  const tx = useMemo(() => ({
    search:    lang === 'ar' ? 'ابحث في هذا التقسيم...' : 'Search this section...',
    addItem:   lang === 'ar' ? 'إضافة عنصر'             : 'Add Item',
    empty:     lang === 'ar' ? 'لا توجد نتائج'           : 'No results found',
    emptyHint: lang === 'ar' ? 'جرّب كلمة بحث أخرى'     : 'Try a different search term',
  }), [lang])

  const handleOpenModal  = useCallback(() => { setEditingItem(null); setShowModal(true) }, [])
  const handleOpenEditModal = useCallback((item: ArchiveItem) => { setEditingItem(item); setShowModal(true) }, [])
  const handleCloseModal = useCallback(() => { setShowModal(false); setEditingItem(null) }, [])
  const handleAddItem    = useCallback((item: ArchiveItem) => {
    setItems(prev => [...prev, item])
  }, [])
  const handleSaveItem = useCallback((id: string, updates: Omit<ArchiveItem, 'id' | 'sectionId'>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }, [])
  const handleCreateFileType = useCallback((ft: FileType) => {
    setFileTypes(prev => prev.some(t => t.key === ft.key) ? prev : [...prev, ft])
  }, [])

  /* Same "hide immediately, remove for real only after the 10s window"
     pattern as section deletion — see SectionTabs.tsx. */
  const handleDeleteItem = useCallback((item: ArchiveItem) => {
    const label = lang === 'ar' ? item.nameAr : item.nameEn
    scheduleDelete(item.id, label, () => {
      setItems(prev => prev.filter(i => i.id !== item.id))
    })
  }, [lang, scheduleDelete])

  /* Opening an item now drills into the file-list page (level 5) instead of
     jumping straight to Drive — the Drive folder link lives at the top of
     that page instead. See FileList.tsx (built separately) for that route. */
  const handleOpenItem = useCallback((item: ArchiveItem) => {
    router.push(`/archive/${platformSlug}/${workId}/${activeSection.id}/${item.id}`)
  }, [router, platformSlug, workId, activeSection.id])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
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
            onChange={handleSearchChange}
            placeholder={tx.search}
            className="w-full py-2 rounded-xl text-[12px] outline-none"
            style={searchInputStyle}
          />
        </div>

        <ViewToggle value={viewMode} onChange={setViewMode} />

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

      {/* Grid / List */}
      <AnimatePresence mode="wait">
        {sectionItems.length > 0 ? (
          viewMode === 'grid' ? (
            <m.div
              key={activeSection.id + search + 'grid'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {sectionItems.map((item, i) => (
                <ItemCard key={item.id} item={item} color={color} index={i}
                  fileTypeColor={getFileTypeColor(item.tag)} isAdmin={isAdmin}
                  onOpen={handleOpenItem} onEdit={handleOpenEditModal} onDelete={handleDeleteItem} />
              ))}

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
              key={activeSection.id + search + 'list'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
            >
              {sectionItems.map((item, i) => (
                <ItemListRow key={item.id} item={item} color={color} index={i}
                  fileTypeColor={getFileTypeColor(item.tag)} isAdmin={isAdmin}
                  onOpen={handleOpenItem} onEdit={handleOpenEditModal} onDelete={handleDeleteItem} />
              ))}
            </m.div>
          )
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
            fileTypes={fileTypes}
            editingItem={editingItem}
            onClose={handleCloseModal}
            onAdd={handleAddItem}
            onSave={handleSaveItem}
            onCreateFileType={handleCreateFileType}
          />
        )}
      </AnimatePresence>

      {/* Offset above SectionTabs' own undo toasts (section deletions) so both
          can be visible at once without overlapping — both mount on the same
          WorkPage. */}
      <UndoToastHost deletions={pendingDeletions} onUndo={undo} color={color} bottomOffset={90} />
    </div>
    </LazyMotion>
  )
}

export default memo(SectionGrid)

/* ═══════════════════════════════════════════════════════════════════════════
   BACKEND NOTE — item thumbnails
   ═══════════════════════════════════════════════════════════════════════════
   The picker currently converts the chosen image to a data URL via FileReader so
   it can be previewed and stored in component state. That is a stand-in ONLY.

   Never persist the data URL. Base64 inflates the image by roughly a third, and
   it would then be embedded in every row and every list response — the archive
   grid fetches many items at once, so this degrades quickly.

   On wiring up, upload the File to Supabase Storage and store the returned public
   URL (or object path) in `archive_items.thumbnail`:

     const path = `archive/${sectionId}/${crypto.randomUUID()}-${file.name}`
     const { error } = await supabase.storage.from('archive').upload(path, file)
     const { data } = supabase.storage.from('archive').getPublicUrl(path)

   Keep the client-side checks that already exist here (image MIME type, 5 MB
   limit) as a first line of defence, but enforce both again server side — a
   client check only stops honest mistakes. Storage bucket policies should also
   restrict uploads to users holding the archive-management permission, matching
   the single "Manage Archive" permission the Archive page is built around.

   Deleting an item must delete its stored object too, otherwise the bucket fills
   with orphans that nothing references.
   ═══════════════════════════════════════════════════════════════════════════

   BACKEND NOTE — file types registry
   ═══════════════════════════════════════════════════════════════════════════
   `fileTypes` currently lives in this component's state (`DEFAULT_FILE_TYPES`
   plus whatever gets added in-session), so a type an admin creates disappears
   on refresh and is invisible to every other admin. The plan doc calls for
   this to be permanent and shared, which means a real table:

     create table file_types (
       key        text primary key,        -- e.g. 'PSD', stored upper-case
       color      text not null,           -- hex, e.g. '#458482'
       created_by uuid references profiles(id),
       created_at timestamptz not null default now()
     );

   Load it once per page (or globally, since it's small and rarely changes)
   instead of re-fetching per section. Creating a new type from the Add Item
   modal should insert here — guard against a duplicate `key` with an
   `on conflict do nothing` or a friendly "this type already exists" message
   rather than a raw constraint error.
   ═══════════════════════════════════════════════════════════════════════════ */