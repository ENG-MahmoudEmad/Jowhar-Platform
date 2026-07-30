// src/components/dashboard/adminControl/AddTask.tsx
"use client";

import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronDown, ChevronLeft, ChevronRight, Calendar, ListTodo } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type Lang = 'en' | 'ar';
type Priority = 'low' | 'medium' | 'high';
type Status = 'open' | 'due' | 'done';

type TaskFormValues = {
  title: string;
  description: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  priority: Priority;
  status: Status;
};

type AddTaskStyle = React.CSSProperties & Record<`--at-${string}`, string>;

const EMPTY_FORM: TaskFormValues = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  priority: 'medium',
  status: 'open',
};

const CARD_TRANSITION = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const MODAL_TRANSITION = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#458482',
  medium: '#e0a740',
  high: '#ef4444',
};

const STATUS_COLORS: Record<Status, string> = {
  open: '#458482',
  due: '#e0a740',
  done: '#8b5cf6',
};

const TEXT = {
  en: {
    title: 'Add Task',
    subtitle: 'Assign new work to this member',
    newTask: 'New Task',
    formTitle: 'New Task',
    fieldTitle: 'Title',
    fieldTitlePlaceholder: 'e.g. Character Rigging',
    fieldDescription: 'Description',
    fieldDescriptionPlaceholder: 'Add any relevant details...',
    fieldStart: 'Start date',
    fieldEnd: 'End date',
    fieldPriority: 'Priority',
    fieldStatus: 'Status',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    statusOpen: 'Open',
    statusDue: 'Due',
    statusDone: 'Done',
    cancel: 'Cancel',
    submit: 'Add Task',
    pickDate: 'Select date',
    today: 'Today',
    clear: 'Clear',
    errorRequired: 'Title and both dates are required',
    errorPastDate: "Start date can't be in the past",
    errorDateOrder: 'End date must be after start date',
  },
  ar: {
    title: 'إضافة تاسك',
    subtitle: 'تعيين عمل جديد لهذا العضو',
    newTask: 'تاسك جديد',
    formTitle: 'تاسك جديد',
    fieldTitle: 'العنوان',
    fieldTitlePlaceholder: 'مثال: رِج الشخصية',
    fieldDescription: 'الوصف',
    fieldDescriptionPlaceholder: 'أضف أي تفاصيل مهمة...',
    fieldStart: 'تاريخ البداية',
    fieldEnd: 'تاريخ النهاية',
    fieldPriority: 'الأولوية',
    fieldStatus: 'الحالة',
    priorityLow: 'منخفضة',
    priorityMedium: 'متوسطة',
    priorityHigh: 'عالية',
    statusOpen: 'مفتوحة',
    statusDue: 'مستحقة',
    statusDone: 'منجزة',
    cancel: 'إلغاء',
    submit: 'إضافة التاسك',
    pickDate: 'اختر التاريخ',
    today: 'اليوم',
    clear: 'مسح',
    errorRequired: 'العنوان والتاريخين مطلوبين',
    errorPastDate: 'تاريخ البداية ما بينفعش يكون بالماضي',
    errorDateOrder: 'تاريخ النهاية لازم يكون بعد البداية',
  },
} satisfies Record<Lang, {
  title: string; subtitle: string; newTask: string; formTitle: string;
  fieldTitle: string; fieldTitlePlaceholder: string; fieldDescription: string; fieldDescriptionPlaceholder: string;
  fieldStart: string; fieldEnd: string; fieldPriority: string; fieldStatus: string;
  priorityLow: string; priorityMedium: string; priorityHigh: string;
  statusOpen: string; statusDue: string; statusDone: string;
  cancel: string; submit: string; pickDate: string; today: string; clear: string;
  errorRequired: string; errorPastDate: string; errorDateOrder: string;
}>;

function getPalette(isDark: boolean): AddTaskStyle {
  return {
    '--at-bg': isDark ? 'var(--card)' : '#ffffff',
    '--at-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--at-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--at-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--at-input-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    '--at-text-main': 'var(--foreground)',
    '--at-text-muted': 'var(--foreground-muted)',
    '--at-overlay': isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)',
    // Fully opaque colors — used anywhere that must NEVER show what's behind it
    // (modal panel, calendar popover, dropdown menus). Deliberately literal,
    // not tied to --card, because --card is intentionally translucent for
    // regular in-page cards and that's the wrong behavior for floating layers.
    '--at-solid-bg': isDark ? '#12151a' : '#ffffff',
    '--at-solid-bg-alt': isDark ? '#1a1e26' : '#f5f5ef',
  };
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDisplay(iso: string, lang: Lang): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// =========================================================
// Generic fixed-width chip dropdown (Priority / Status)
// =========================================================
function ChipDropdown<T extends string>({
  value,
  options,
  onChange,
  lang,
  isRTL,
  colors,
  widthClass = 'w-32',
  dropUp = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  lang: Lang;
  isRTL: boolean;
  colors: Record<T, string>;
  widthClass?: string;
  dropUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex ${widthClass} shrink-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-[var(--at-border)] bg-[var(--at-input-bg)] px-3 py-2 text-xs font-medium text-[var(--at-text-main)] outline-none transition-colors hover:border-[#458482]/40`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colors[selected.value] }} />
          <span
            className="truncate"
            style={{
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              textTransform: lang === 'ar' ? 'none' : 'uppercase',
            }}
          >
            {selected.label}
          </span>
        </span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className="shrink-0 text-[var(--at-text-muted)] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-30 min-w-full overflow-hidden rounded-xl border border-[var(--at-border)] p-1 shadow-2xl"
            style={{
              background: 'var(--at-solid-bg-alt)',
              [isRTL ? 'right' : 'left']: 0,
              ...(dropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-start text-xs font-medium transition-colors hover:bg-[var(--at-divider)]"
                style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colors[opt.value] }} />
                <span
                  style={{
                    color: opt.value === value ? colors[opt.value] : 'var(--at-text-main)',
                    textTransform: lang === 'ar' ? 'none' : 'uppercase',
                  }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================
// Custom date field — replaces the native <input type="date">
// so it actually matches the site's dark theme, and enforces
// "no past dates" / "end >= start" directly in the UI.
// =========================================================
function DateField({
  value,
  onChange,
  min,
  lang,
  isRTL,
  placeholder,
  dropUp = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string; // ISO — dates before this are disabled
  lang: Lang;
  isRTL: boolean;
  placeholder: string;
  dropUp?: boolean;
}) {
  const copy = TEXT[lang];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const minDate = useMemo(() => (min ? startOfDay(new Date(`${min}T00:00:00`)) : startOfDay(new Date())), [min]);
  const initialView = value ? new Date(`${value}T00:00:00`) : minDate;
  const [viewMonth, setViewMonth] = useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      const base = value ? new Date(`${value}T00:00:00`) : minDate;
      setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'narrow' });
    const days: string[] = [];
    // Start from a known Sunday
    const sunday = new Date(2026, 0, 4);
    for (let i = 0; i < 7; i++) {
      days.push(formatter.format(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)));
    }
    return days;
  }, [lang]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }).format(viewMonth),
    [viewMonth, lang]
  );

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const selectedDate = value ? startOfDay(new Date(`${value}T00:00:00`)) : null;

  function handlePick(d: Date) {
    if (startOfDay(d) < minDate) return;
    onChange(toISODate(d));
    setOpen(false);
  }

  return (
    <div ref={ref}>
      <button
        type="button"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          setOpen((o) => !o);
        }}
        onClick={(e) => {
          // Keyboard activation still routes through click, while pointer
          // activation is handled on pointer-down to avoid layout-shift misses.
          if (e.detail === 0) setOpen((o) => !o);
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-[var(--at-border)] bg-[var(--at-input-bg)] px-3 py-2 text-sm font-medium outline-none transition-colors hover:border-[#458482]/40"
      >
        <span className={value ? 'text-[var(--at-text-main)]' : 'text-[var(--at-text-muted)]'}>
          {value ? formatDisplay(value, lang) : placeholder}
        </span>
        <Calendar size={14} className="shrink-0 text-[var(--at-text-muted)]" aria-hidden="true" />
      </button>

      {/*
        Deliberately NOT position:absolute. An absolutely-positioned popover
        can render past the modal's edges (or inflate the modal's scrollable
        area). Growing the calendar inline instead guarantees it always stays
        inside the dialog — it just pushes the rest of the form down, same as
        any other expanding section on the site.
      */}
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 w-full rounded-xl border border-[var(--at-border)] p-3"
              style={{ background: 'var(--at-input-bg)' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth((m0) => new Date(m0.getFullYear(), m0.getMonth() - 1, 1))}
                  className="cursor-pointer rounded-lg p-1 text-[var(--at-text-muted)] hover:bg-[var(--at-divider)] hover:text-[var(--at-text-main)]"
                  aria-label="prev"
                >
                  {isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
                <span className="text-xs font-bold text-[var(--at-text-main)]">{monthLabel}</span>
                <button
                  type="button"
                  onClick={() => setViewMonth((m0) => new Date(m0.getFullYear(), m0.getMonth() + 1, 1))}
                  className="cursor-pointer rounded-lg p-1 text-[var(--at-text-muted)] hover:bg-[var(--at-divider)] hover:text-[var(--at-text-main)]"
                  aria-label="next"
                >
                  {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {weekdayLabels.map((w, i) => (
                  <span key={i} className="text-center text-[9px] font-bold uppercase text-[var(--at-text-muted)]">
                    {w}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                  const inMonth = d.getMonth() === viewMonth.getMonth();
                  const disabled = startOfDay(d) < minDate;
                  const isSelected = selectedDate && toISODate(d) === toISODate(selectedDate);
                  const isToday = toISODate(d) === toISODate(new Date());

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => handlePick(d)}
                      className="flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg text-[10px] font-medium transition-colors disabled:cursor-not-allowed"
                      style={{
                        color: disabled ? 'var(--at-text-muted)' : isSelected ? '#ffffff' : 'var(--at-text-main)',
                        opacity: !inMonth && !disabled ? 0.35 : disabled ? 0.3 : 1,
                        background: isSelected ? '#458482' : isToday ? 'var(--at-divider)' : 'transparent',
                      }}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-[var(--at-divider)] pt-2">
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-[var(--at-text-muted)] hover:text-[var(--at-text-main)]"
                >
                  {copy.clear}
                </button>
                <button
                  type="button"
                  onClick={() => handlePick(new Date())}
                  className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-[#458482] hover:opacity-80"
                >
                  {copy.today}
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================
// Modal form
// =========================================================
const TaskFormModal = memo(function TaskFormModal({
  open,
  onClose,
  onSubmit,
  lang,
  isRTL,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
  lang: Lang;
  isRTL: boolean;
  copy: (typeof TEXT)[Lang];
}) {
  const [values, setValues] = useState<TaskFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(EMPTY_FORM);
      setError(null);
    }
  }, [open]);

  const priorityOptions = useMemo(
    () => [
      { value: 'low' as Priority, label: copy.priorityLow },
      { value: 'medium' as Priority, label: copy.priorityMedium },
      { value: 'high' as Priority, label: copy.priorityHigh },
    ],
    [copy]
  );

  const statusOptions = useMemo(
    () => [
      { value: 'open' as Status, label: copy.statusOpen },
      { value: 'due' as Status, label: copy.statusDue },
      { value: 'done' as Status, label: copy.statusDone },
    ],
    [copy]
  );

  const todayISO = toISODate(new Date());

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!values.title.trim() || !values.startDate || !values.endDate) {
        setError(copy.errorRequired);
        return;
      }
      if (values.startDate < todayISO) {
        setError(copy.errorPastDate);
        return;
      }
      if (values.endDate < values.startDate) {
        setError(copy.errorDateOrder);
        return;
      }
      setError(null);
      onSubmit(values);
    },
    [values, copy, onSubmit, todayISO]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MODAL_TRANSITION}
            onClick={onClose}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: 'var(--at-overlay)' }}
          />
          <m.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={MODAL_TRANSITION}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
            dir={isRTL ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-50 m-auto flex max-h-[90vh] w-[92%] max-w-md overflow-hidden rounded-2xl"
            style={{ background: 'var(--at-solid-bg)', border: '1px solid var(--at-border)' }}
          >
            <div
              className="flex max-h-[90vh] w-full flex-col overflow-y-auto py-2 [scrollbar-gutter:stable] [scrollbar-width:thin]"
              style={{
                background: 'var(--at-solid-bg)',
                scrollbarColor: 'rgba(69, 132, 130, 0.55) transparent',
              }}
            >
              <div
                className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--at-divider)] px-5 py-4"
                style={{ background: 'var(--at-solid-bg)' }}
              >
                <h3
                  id="task-form-title"
                  className="text-sm font-bold uppercase tracking-widest text-[var(--at-text-main)]"
                  style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {copy.formTitle}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={copy.cancel}
                  className="cursor-pointer rounded-lg p-1.5 text-[var(--at-text-muted)] transition-colors hover:bg-[var(--at-input-bg)] hover:text-[var(--at-text-main)]"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--at-text-muted)]">
                    {copy.fieldTitle}
                  </label>
                  <input
                    value={values.title}
                    onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                    placeholder={copy.fieldTitlePlaceholder}
                    className="w-full rounded-lg border border-[var(--at-border)] bg-[var(--at-input-bg)] px-3 py-2 text-sm font-medium text-[var(--at-text-main)] outline-none placeholder:text-[var(--at-text-muted)] focus:border-[#458482]/40"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--at-text-muted)]">
                    {copy.fieldDescription}
                  </label>
                  <textarea
                    value={values.description}
                    onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                    placeholder={copy.fieldDescriptionPlaceholder}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[var(--at-border)] bg-[var(--at-input-bg)] px-3 py-2 text-sm font-medium text-[var(--at-text-main)] outline-none placeholder:text-[var(--at-text-muted)] focus:border-[#458482]/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--at-text-muted)]">
                      {copy.fieldStart}
                    </label>
                    <DateField
                      value={values.startDate}
                      onChange={(iso) =>
                        setValues((v) => ({
                          ...v,
                          startDate: iso,
                          // keep end date valid if it's now before the new start date
                          endDate: v.endDate && iso && v.endDate < iso ? iso : v.endDate,
                        }))
                      }
                      min={todayISO}
                      lang={lang}
                      isRTL={isRTL}
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--at-text-muted)]">
                      {copy.fieldEnd}
                    </label>
                    <DateField
                      value={values.endDate}
                      onChange={(iso) => setValues((v) => ({ ...v, endDate: iso }))}
                      min={values.startDate || todayISO}
                      lang={lang}
                      isRTL={isRTL}
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--at-text-muted)]">
                      {copy.fieldPriority}
                    </label>
                    <ChipDropdown
                      value={values.priority}
                      options={priorityOptions}
                      onChange={(v) => setValues((val) => ({ ...val, priority: v }))}
                      lang={lang}
                      isRTL={isRTL}
                      colors={PRIORITY_COLORS}
                      widthClass="w-full"
                      dropUp
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--at-text-muted)]">
                      {copy.fieldStatus}
                    </label>
                    <ChipDropdown
                      value={values.status}
                      options={statusOptions}
                      onChange={(v) => setValues((val) => ({ ...val, status: v }))}
                      lang={lang}
                      isRTL={isRTL}
                      colors={STATUS_COLORS}
                      widthClass="w-full"
                      dropUp
                    />
                  </div>
                </div>

                {error && <p className="text-[11px] font-medium text-[#ef4444]">{error}</p>}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-lg bg-[var(--at-input-bg)] px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--at-text-muted)] transition-colors hover:text-[var(--at-text-main)]"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg bg-[#458482] px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                  >
                    {copy.submit}
                  </button>
                </div>
              </form>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
});

// =========================================================
// Main Component
// =========================================================
function AddTask({
  memberId,
  onTaskAdded,
}: {
  memberId: string;
  onTaskAdded?: (values: TaskFormValues) => void;
}) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang as Lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  const [modalOpen, setModalOpen] = useState(false);

  const handleSubmit = useCallback(
    (values: TaskFormValues) => {
      // TODO: API — insert task scoped to `memberId`, then:
      //  - recompute Team Progress % (completed/assigned, monthly)
      //  - push into Calendar as a colored bar for this member
      //  - fold into Deadline Ring's nearest-deadline dots if applicable
      //  - append to member's My Tasks Gantt + Open/Due/Done counts
      onTaskAdded?.(values);
      setModalOpen(false);
    },
    [onTaskAdded]
  );

  return (
    <LazyMotion features={domAnimation}>
      {/*
        Both the card AND the modal live inside this div so the --at-* CSS
        variables (defined in `palette`) actually reach the modal. CSS custom
        properties only cascade to descendants — the modal used to be a
        sibling of the section, so it silently fell back to transparent /
        unstyled values. This wrapper is a plain div (no transform), so it
        doesn't interfere with the modal's `position: fixed` behavior.

        h-full here (and on the section below) is the part that makes this
        card stretch to match Director Notes' height when the two sit side
        by side in a grid row — instead of staying short and leaving empty
        space in the row.
      */}
      <div style={palette} className="h-full">
        <m.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={CARD_TRANSITION}
          aria-labelledby="add-task-title"
          className="flex h-full w-full flex-col overflow-hidden rounded-2xl"
          style={{ background: 'var(--at-bg)', border: '1px solid var(--at-border)' }}
        >
          <div className="flex items-center justify-between gap-3 bg-[var(--at-header-bg)] p-5 sm:p-6 border-b border-[var(--at-divider)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
                <ListTodo size={18} className="text-[#458482]" aria-hidden="true" />
              </div>
              <div className="min-w-0 text-start">
                <h2
                  id="add-task-title"
                  className="text-sm font-bold uppercase tracking-widest text-[var(--at-text-main)]"
                  style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {copy.title}
                </h2>
                <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--at-text-muted)]">
                  {copy.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[#458482] px-3.5 py-2 text-[10px] font-black uppercase tracking-wide text-white transition-opacity hover:opacity-90"
            >
              <Plus size={13} aria-hidden="true" />
              {copy.newTask}
            </button>
          </div>

          {/*
            Fills the rest of the card's height instead of leaving dead space
            below the header now that the card stretches to match Director
            Notes. Doubles as a second, larger entry point into the modal.
          */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center transition-colors hover:bg-[var(--at-input-bg)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[var(--at-border)] text-[var(--at-text-muted)] transition-colors group-hover:border-[#458482]/50 group-hover:text-[#458482]">
              <Plus size={18} aria-hidden="true" />
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wide text-[var(--at-text-muted)] transition-colors group-hover:text-[var(--at-text-main)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.newTask}
            </span>
          </button>
        </m.section>

        <TaskFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          lang={lang as Lang}
          isRTL={isRTL}
          copy={copy}
        />
      </div>
    </LazyMotion>
  );
}

export default memo(AddTask);