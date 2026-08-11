// src/components/dashboard/archive/SectionGrid.tsx
"use client"

import { useState, useCallback, useMemo, useRef, memo } from "react"
import Image from 'next/image'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import { Plus, X, Search, SlidersHorizontal, Upload, ChevronRight, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'
import ViewToggle, { type ViewMode } from '@/components/dashboard/archive/ViewToggle'
import { useSmartSearch } from '@/lib/useSmartSearch'
import { useSelection } from '@/lib/useSelection'
import { useArchiveViewMode } from '@/lib/useArchiveViewMode'
import DeleteConfirmModal from '@/components/dashboard/archive/DeleteConfirmModal'
import SelectionToolbar from '@/components/dashboard/archive/SelectionToolbar'
import DestinationPicker, { type DestinationResult } from '@/components/dashboard/archive/DestinationPicker'
import ActionToast from '@/components/dashboard/archive/ActionToast'
import type { Section } from '@/components/dashboard/archive/SectionTabs'
import {
  addItemAction,
  updateItemAction,
  deleteItemAction,
  addFileTypeAction,
  uploadArchiveImageAction,
  moveItemsAction,
  copyItemsAction,
  type ItemRow,
  type ItemActionPayload,
  type FileTypeRow,
} from '@/app/(dashboard)/archive/actions'

export type ArchiveItem = ItemRow
export type FileType    = FileTypeRow

// ─── Module-level constants (zero per-render allocation) ───────────────────────
const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";

/** Rejected before reading, so a huge file never gets turned into a data URL. */
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024; // 2MB — موحّد لكل مستويات الأرشيف

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
  color,
  fileTypes,
  editingItem,
  onClose,
  onAdd,
  onSave,
  onCreateFileType,
}: {
  color:     string
  fileTypes: FileType[]
  /** Present → editing an existing item; absent → creating one. */
  editingItem?: ArchiveItem | null
  onClose:   () => void
  onAdd:     (payload: ItemActionPayload) => void
  onSave:    (dbId: string, updates: ItemActionPayload) => void
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
  const [uploading, setUploading] = useState(false)
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
    errSize:  lang === 'ar' ? 'حجم الصورة يتجاوز 2 ميجابايت' : 'Image exceeds the 2 MB limit',
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
    () => !nameEn.trim() || !nameAr.trim() || !driveUrl.trim() || uploading,
    [nameEn, nameAr, driveUrl, uploading],
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

  const isDraggingFromBackdrop = useRef(false);
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingFromBackdrop.current = e.target === e.currentTarget;
  }, []);
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingFromBackdrop.current && e.target === e.currentTarget) onClose();
    isDraggingFromBackdrop.current = false;
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

    setThumbnailPath(file.name);
    setThumbnailData(URL.createObjectURL(file)); // معاينة فورية لحد ما يخلص الرفع
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'items');
      const realUrl = await uploadArchiveImageAction(formData);
      setThumbnailData(realUrl);
    } catch {
      setThumbnailData('');
      setThumbnailPath('');
      setThumbnailError(tx.errRead);
    } finally {
      setUploading(false);
    }
  }, [tx.errType, tx.errSize, tx.errRead]);

  const handleRemoveThumbnail = useCallback(() => {
    setThumbnailData('');
    setThumbnailPath('');
    setThumbnailError('');
  }, []);

  const handleSubmit = () => {
    if (isAddDisabled) return
    const payload: ItemActionPayload = {
      nameEn:        nameEn.trim(),
      nameAr:        nameAr.trim(),
      description:   description.trim(),
      descriptionAr: descriptionAr.trim(),
      driveUrl:      driveUrl.trim(),
      thumbnail:     thumbnailData || undefined,
      tag:           tag.trim().toUpperCase() || undefined,
    }
    if (isEditing && editingItem) {
      onSave(editingItem.dbId, payload)
    } else {
      onAdd(payload)
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
      onMouseDown={handleBackdropMouseDown}
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
                disabled={uploading}
                className="flex items-center gap-1.5 shrink-0"
                style={{ ...chooseFileButtonStyle, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
              >
                <Upload className="w-3 h-3" />
                {uploading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : tx.choose}
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
                {/*
                  next/image ما بيدعم blob: URLs (معاينة محلية أثناء
                  الرفع) — وهاي أداة إدارة (مودال إضافة/تعديل عنصر)، مش
                  عرض عام، فالتكلفة الإضافية بلا فايدة حقيقية هون.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
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

          {/* File type — live, extensible registry (persisted via addFileTypeAction) */}
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
const ItemCard = memo(function ItemCard({
  item, color, index, fileTypeColor, canManage, onOpen, onEdit, onDelete,
  selectionActive, isSelected, onStartDrag, onDragOver,
}: {
  item: ArchiveItem; color: string; index: number; fileTypeColor: string; canManage: boolean
  onOpen: (item: ArchiveItem) => void
  onEdit: (item: ArchiveItem) => void
  onDelete: (item: ArchiveItem) => void
  selectionActive: boolean
  isSelected:      boolean
  /** Press-down decides & applies the drag direction for this item. */
  onStartDrag: (id: string) => void
  /** Pointer entering this item while a drag from another item is in progress. */
  onDragOver:  (id: string) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? item.nameAr        : item.nameEn
  const desc = lang === 'ar' ? item.descriptionAr : item.description

  const handleClick = useCallback(() => {
    if (!selectionActive) onOpen(item)
  }, [selectionActive, onOpen, item]);
  const handleMouseDown = useCallback(() => {
    if (selectionActive) onStartDrag(item.dbId)
  }, [selectionActive, onStartDrag, item.dbId]);
  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    if (selectionActive) onDragOver(item.dbId)
  }, [selectionActive, onDragOver, item.dbId]);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleEditClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(item) }, [onEdit, item]);
  const handleDeleteClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(item) }, [onDelete, item]);

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark
      ? `linear-gradient(145deg, #161b22, ${color}12)`
      : `linear-gradient(145deg, #ffffff, ${color}08)`,
    border:     `1px solid ${isSelected ? color : hovered ? color + '50' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
    boxShadow:  isSelected ? `0 0 0 2px ${color}40` : hovered ? `0 8px 28px ${color}22` : 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  }), [isDark, hovered, color, isSelected]);

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
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="relative w-full overflow-hidden" style={thumbWrapStyle}>
        <div className="absolute inset-0" style={radialOverlayStyle} />

        {item.thumbnail
          ? (
            <Image
              src={item.thumbnail}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          )
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

        {canManage && !selectionActive && (
          <div className="absolute top-2 z-20" style={{ [isRTL ? 'right' : 'left']: '8px' }}>
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
            className="absolute top-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center"
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
const ItemListRow = memo(function ItemListRow({
  item, color, index, fileTypeColor, canManage, onOpen, onEdit, onDelete,
  selectionActive, isSelected, onStartDrag, onDragOver,
}: {
  item: ArchiveItem; color: string; index: number; fileTypeColor: string; canManage: boolean
  onOpen: (item: ArchiveItem) => void
  onEdit: (item: ArchiveItem) => void
  onDelete: (item: ArchiveItem) => void
  selectionActive: boolean
  isSelected:      boolean
  onStartDrag: (id: string) => void
  onDragOver:  (id: string) => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const name = lang === 'ar' ? item.nameAr : item.nameEn

  const handleClick = useCallback(() => {
    if (!selectionActive) onOpen(item)
  }, [selectionActive, onOpen, item]);
  const handleMouseDown = useCallback(() => {
    if (selectionActive) onStartDrag(item.dbId)
  }, [selectionActive, onStartDrag, item.dbId]);
  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    if (selectionActive) onDragOver(item.dbId)
  }, [selectionActive, onDragOver, item.dbId]);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleEditClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(item) }, [onEdit, item]);
  const handleDeleteClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(item) }, [onDelete, item]);

  const rowStyle = useMemo<React.CSSProperties>(() => ({
    background: isSelected ? `${color}14` : hovered ? (isDark ? `${color}12` : `${color}0a`) : 'transparent',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    transition: 'background 0.15s',
  }), [hovered, isDark, color, isSelected]);

  const thumbStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}22, ${color}08)`,
    position: 'relative',
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
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {selectionActive && (
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ color: isSelected ? color : 'var(--foreground-muted)', padding: 0, lineHeight: 0 }}>
          {isSelected
            ? <CheckSquare className="w-4 h-4" style={{ display: 'block' }} />
            : <Square className="w-4 h-4" style={{ display: 'block' }} />}
        </div>
      )}

      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={thumbStyle}>
        {item.thumbnail
          ? <Image src={item.thumbnail} alt={name} fill sizes="36px" className="object-cover" unoptimized />
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

      {canManage && !selectionActive && (
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
  color         = '#458482',
  canManage     = false,
  canDelete     = false,
  platformSlug,
  workId,
  workSlug,
  initialItems,
  initialFileTypes,
  onItemCountChange,
  initialViewMode = 'grid',
}: {
  activeSection: Section
  color?:        string
  canManage?:    boolean
  canDelete?:    boolean
  /** Needed to build the route to the file-list page one level down. */
  platformSlug:  string
  /** uuid العمل الأب — لازم لكل أكشنز الإضافة/التعديل (حل صلاحية Manage Archive) */
  workId:        string
  /** الـslug الجميل تبع العمل — لازم للراوت (مش workId اليوزد uuid) */
  workSlug:      string
  initialItems:      ArchiveItem[]
  initialFileTypes:  FileType[]
  /** بيتنادى لما عنصر ينضاف (+1) أو ينحذف (-1) فعليًا — تزامن العداد
      بتبويب SectionTabs (كومبوننت منفصل، ما بشوف items مباشرة). */
  onItemCountChange?: (sectionId: string, delta: number) => void
  /** تفضيل Grid/List محفوظ بالبروفايل — جاي من Server Component. */
  initialViewMode?: ViewMode
}) {
  const { lang, isRTL }       = useLang()
  const { theme }             = useTheme()
  const router                = useRouter()
  const isDark                = theme === 'dark'
  const [items, setItems]     = useState<ArchiveItem[]>(initialItems)
  const [fileTypes, setFileTypes] = useState<FileType[]>(initialFileTypes)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ArchiveItem | null>(null)
  /** The item currently showing the big delete-confirmation popup, if any. */
  const [pendingDelete, setPendingDelete] = useState<ArchiveItem | null>(null)
  const [search, setSearch]   = useState('')

  const [viewMode, setViewMode] = useArchiveViewMode(initialViewMode)

  const selection = useSelection()
  const [showDestPicker, setShowDestPicker] = useState(false)
  const [copyMoveKind, setCopyMoveKind] = useState<'copy' | 'move'>('copy')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const fileTypeColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const ft of fileTypes) map.set(ft.key, ft.color)
    return map
  }, [fileTypes])

  const getFileTypeColor = useCallback(
    (tag?: string) => (tag && fileTypeColorMap.get(tag)) || color,
    [fileTypeColorMap, color]
  )

  const itemsInSection = useMemo(
    () => items.filter(i => i.sectionId === activeSection.dbId),
    [items, activeSection.dbId]
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
    select:    lang === 'ar' ? 'تحديد'                   : 'Select',
  }), [lang])

  const handleOpenModal  = useCallback(() => { setEditingItem(null); setShowModal(true) }, [])
  const handleOpenEditModal = useCallback((item: ArchiveItem) => { setEditingItem(item); setShowModal(true) }, [])
  const handleCloseModal = useCallback(() => { setShowModal(false); setEditingItem(null) }, [])

  /** Optimistic insert بـid مؤقت، ثم استبداله بالصف الحقيقي من السيرفر. */
  const handleAddItem = useCallback(async (payload: ItemActionPayload) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: ArchiveItem = {
      dbId: tempId, id: tempId, sectionId: activeSection.dbId,
      nameEn: payload.nameEn, nameAr: payload.nameAr,
      description: payload.description, descriptionAr: payload.descriptionAr,
      driveUrl: payload.driveUrl, thumbnail: payload.thumbnail, tag: payload.tag,
    }
    setItems(prev => [...prev, optimistic])

    try {
      const real = await addItemAction(activeSection.dbId, workId, payload)
      setItems(prev => prev.map(i => i.dbId === tempId ? real : i))
      onItemCountChange?.(activeSection.dbId, 1)
    } catch {
      setItems(prev => prev.filter(i => i.dbId !== tempId))
    }
  }, [activeSection.dbId, workId, onItemCountChange])

  const handleSaveItem = useCallback(async (dbId: string, updates: ItemActionPayload) => {
    let previous: ArchiveItem | undefined
    setItems(prev => prev.map(i => {
      if (i.dbId !== dbId) return i
      previous = i
      return { ...i, ...updates }
    }))

    try {
      await updateItemAction(dbId, workId, updates)
    } catch {
      if (previous) setItems(prev => prev.map(i => i.dbId === dbId ? previous! : i))
    }
  }, [workId])

  /** جديد بجلسة (مش موجود بالـfileTypes بعد) → نحفظه فعليًا عبر الـRPC،
      وإلا (موجود أصلاً بمكان تاني بالتطبيق) منضيفه محليًا بس. */
  const handleCreateFileType = useCallback(async (ft: FileType) => {
    setFileTypes(prev => prev.some(t => t.key === ft.key) ? prev : [...prev, ft])
    try {
      await addFileTypeAction(ft.key, ft.color)
    } catch {
      // النوع موجود أصلاً أو فشل الحفظ — يضل مستخدم بهاي الجلسة على الأقل
    }
  }, [])

  const handleRequestDeleteItem = useCallback((item: ArchiveItem) => {
    setPendingDelete(item)
  }, [])

  const handleConfirmDeleteItem = useCallback(async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    const targetIndex = items.findIndex(i => i.dbId === target.dbId)

    setItems(prev => prev.filter(i => i.dbId !== target.dbId))
    setPendingDelete(null)

    try {
      await deleteItemAction(target.dbId)
      onItemCountChange?.(target.sectionId, -1)
    } catch {
      setItems(prev => {
        const next = [...prev]
        next.splice(targetIndex, 0, target)
        return next
      })
    }
  }, [pendingDelete, items, onItemCountChange])

  const handleCancelDeleteItem = useCallback(() => setPendingDelete(null), [])

  const handleOpenCopy = useCallback(() => { setCopyMoveKind('copy'); setShowDestPicker(true) }, [])
  const handleOpenMove = useCallback(() => { setCopyMoveKind('move'); setShowDestPicker(true) }, [])
  const handleCancelDestPicker = useCallback(() => setShowDestPicker(false), [])

  const selectedItemsLabel = useMemo(() => {
    const n = selection.selectedCount
    const sectionName = lang === 'ar' ? activeSection.nameAr : activeSection.nameEn
    return lang === 'ar'
      ? `${n} عنصر من "${sectionName}"`
      : `${n} item${n === 1 ? '' : 's'} from "${sectionName}"`
  }, [selection.selectedCount, lang, activeSection])

  /** التنفيذ الفعلي — move_items/copy_items RPCs. بالـmove: العناصر
      بتغادر هالقسم فورًا (عداد القسم الحالي بينزل)، والوجهة بتاخدها لو
      كانت جوا نفس العمل (ما بنقدر نحدّث تبويب بعمل تاني من هون). بالـcopy:
      العناصر تضل هون، وبس بيتزاد عداد الوجهة لو كانت بنفس العمل. */
  const handleConfirmDestination = useCallback(async (dest: DestinationResult) => {
    if (!dest.sectionId) return
    const selectedIds = Array.from(selection.selectedIds)
    const n = selectedIds.length
    const movedItems = items.filter(i => selection.selectedIds.has(i.dbId))
    const destSectionId = dest.sectionId

    if (copyMoveKind === 'move') {
      setItems(prev => prev.filter(i => !selection.selectedIds.has(i.dbId)))
      onItemCountChange?.(activeSection.dbId, -n)
      onItemCountChange?.(destSectionId, n)
    }

    try {
      if (copyMoveKind === 'move') {
        await moveItemsAction(selectedIds, destSectionId)
      } else {
        await copyItemsAction(selectedIds, destSectionId)
        onItemCountChange?.(destSectionId, n)
      }
      setToastMessage(
        copyMoveKind === 'move'
          ? (lang === 'ar' ? `تم نقل ${n} عنصر` : `Moved ${n} item${n === 1 ? '' : 's'}`)
          : (lang === 'ar' ? `تم نسخ ${n} عنصر` : `Copied ${n} item${n === 1 ? '' : 's'}`)
      )
    } catch {
      if (copyMoveKind === 'move') {
        setItems(prev => [...prev, ...movedItems])
        onItemCountChange?.(activeSection.dbId, n)
        onItemCountChange?.(destSectionId, -n)
      }
      setToastMessage(
        lang === 'ar' ? 'فشلت العملية — تأكد من صلاحياتك بالوجهة' : 'Action failed — check your permissions at the destination'
      )
    }

    setShowDestPicker(false)
    selection.disable()
  }, [selection, copyMoveKind, lang, items, activeSection.dbId, onItemCountChange])

  const handleToastDone = useCallback(() => setToastMessage(null), [])

  /* Opening an item now drills into the file-list page (level 5) instead of
     jumping straight to Drive — the Drive folder link lives at the top of
     that page instead. See FileList.tsx (built separately) for that route. */
  const handleOpenItem = useCallback((item: ArchiveItem) => {
    router.push(`/archive/${platformSlug}/${workSlug}/${activeSection.dbId}/${item.dbId}`)
  }, [router, platformSlug, workSlug, activeSection.dbId])

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

          {/* Select mode toggle — needs Manage Archive + at least one item */}
          {canManage && sectionItems.length > 0 && (
            <button
              onClick={selection.enable}
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

          {/* Add item */}
          {canManage && (
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
      )}

      {/* Grid / List */}
      <AnimatePresence mode="wait">
        {sectionItems.length > 0 ? (
          viewMode === 'grid' ? (
            <m.div
              key={activeSection.dbId + search + 'grid'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {sectionItems.map((item, i) => (
                <ItemCard key={item.dbId} item={item} color={color} index={i}
                  fileTypeColor={getFileTypeColor(item.tag)} canManage={canManage}
                  onOpen={handleOpenItem} onEdit={handleOpenEditModal} onDelete={handleRequestDeleteItem}
                  selectionActive={selection.active} isSelected={selection.isSelected(item.dbId)} onStartDrag={selection.startDrag} onDragOver={selection.dragOver} />
              ))}

              {canManage && !search && !selection.active && (
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
              key={activeSection.dbId + search + 'list'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
            >
              {sectionItems.map((item, i) => (
                <ItemListRow key={item.dbId} item={item} color={color} index={i}
                  fileTypeColor={getFileTypeColor(item.tag)} canManage={canManage}
                  onOpen={handleOpenItem} onEdit={handleOpenEditModal} onDelete={handleRequestDeleteItem}
                  selectionActive={selection.active} isSelected={selection.isSelected(item.dbId)} onStartDrag={selection.startDrag} onDragOver={selection.dragOver} />
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

      <AnimatePresence>
        {pendingDelete && (
          <DeleteConfirmModal
            label={lang === 'ar' ? pendingDelete.nameAr : pendingDelete.nameEn}
            message={lang === 'ar'
              ? 'سيتم حذف هذا العنصر نهائيًا مع كل الملفات بداخله. هذا الإجراء لا يمكن التراجع عنه.'
              : 'This item and every file inside it will be permanently deleted. This cannot be undone.'}
            onConfirm={handleConfirmDeleteItem}
            onCancel={handleCancelDeleteItem}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDestPicker && (
          <DestinationPicker
            color={color}
            targetLevel="section"
            actionKind={copyMoveKind}
            sourceLabel={selectedItemsLabel}
            excludeSectionId={activeSection.dbId}
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

export default memo(SectionGrid)