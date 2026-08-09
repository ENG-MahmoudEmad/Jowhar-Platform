// src/app/(dashboard)/my-tasks/[taskId]/TaskDetailClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import type { Task } from '@/lib/taskStats';
import { submitTask, cancelSubmission, markRejectionSeen } from '../taskSubmissionActions';

const MAX_NOTE_LENGTH = 500;

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
};

const PRIORITY_META = {
  low: { ar: 'منخفضة', en: 'Low', color: '#6b7280' },
  medium: { ar: 'متوسطة', en: 'Medium', color: '#d97706' },
  high: { ar: 'عالية', en: 'High', color: '#dc2626' },
} as const;

const STATUS_META = {
  open: { ar: 'مفتوحة', en: 'Open', color: '#6b7280' },
  pending_review: { ar: 'قيد المراجعة', en: 'In Review', color: '#d97706' },
  done: { ar: 'منجزة', en: 'Done', color: '#16a34a' },
} as const;

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function TaskDetailClient({ initialTask }: { initialTask: Task }) {
  const { lang, isRTL } = useLang();
  const router = useRouter();
  const isArabic = lang === 'ar';
  const textFont = isArabic ? 'var(--font-arabic)' : 'inherit';

  const [task, setTask] = useState(initialTask);
  const [note, setNote] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
    فتح الصفحة على تاسك مرفوض = تعليم الرفض كمقروء تلقائيًا (البادج التحذيري
    بيختفي، النص بيضل ظاهر تحت). ما بنستدعيها وقت الـ render بالسيرفر —
    Next.js ما بيسمح بـrevalidatePath لنفس المسار وهو عم يترندر، فلازم
    تصير من الكلاينت بعد التركيب.
  */
  useEffect(() => {
    if (task.lastRejectionNote && !task.rejectionSeenAt) {
      const optimisticAt = new Date().toISOString();
      setTask((t) => ({ ...t, rejectionSeenAt: optimisticAt }));
      void markRejectionSeen(task.id).catch(() => {
        // فشل صامت — مش حرج، البادج ممكن يرجع يطلع بزيارة تانية بس مش أكتر
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const showRejectionBanner = Boolean(task.lastRejectionNote);
  const isUnseenRejection = showRejectionBanner && !initialTask.rejectionSeenAt;

  const noteLength = note.length;
  const noteTooLong = noteLength > MAX_NOTE_LENGTH;

  const priorityMeta = PRIORITY_META[task.priority];
  const statusMeta = STATUS_META[task.status];

  const dateRangeLabel = useMemo(() => {
    return `${formatDate(task.startDate, lang)} — ${formatDate(task.deadline, lang)}`;
  }, [task.startDate, task.deadline, lang]);

  async function handleSubmit() {
    if (noteTooLong || isBusy) return;
    setIsBusy(true);
    setError(null);

    const previous = task;
    const trimmedNote = note.trim() || null;
    setTask({
      ...task,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      submittedNote: trimmedNote,
    });

    try {
      await submitTask(task.id, trimmedNote);
      setNote('');
    } catch {
      setTask(previous);
      setError(isArabic ? 'صار خطأ، حاول مرة تانية' : 'Something went wrong, try again');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCancel() {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);

    const previous = task;
    setTask({ ...task, status: 'open', submittedAt: null, submittedNote: null });

    try {
      await cancelSubmission(task.id);
    } catch {
      setTask(previous);
      setError(isArabic ? 'صار خطأ، حاول مرة تانية' : 'Something went wrong, try again');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-5" style={{ fontFamily: textFont }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-bold opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--foreground-muted)' }}
        >
          {isArabic ? '← رجوع' : '← Back'}
        </button>

        {/* بادج/بانر الرفض — يضل ظاهر حتى بعد ما يتشاف، بس بلون هادئ أكتر */}
        {showRejectionBanner && (
          <m.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{
              background: isUnseenRejection ? 'rgba(220, 38, 38, 0.1)' : 'var(--hover-bg)',
              border: `1px solid ${isUnseenRejection ? 'rgba(220, 38, 38, 0.35)' : 'var(--divider)'}`,
            }}
          >
            <div
              className="font-black mb-1.5"
              style={{ color: isUnseenRejection ? '#dc2626' : 'var(--foreground-muted)' }}
            >
              {isArabic ? 'ملاحظة الأدمن على الرفض' : "Admin's rejection note"}
              {task.reviewedByName && (
                <span className="font-medium"> — {isArabic ? 'بواسطة' : 'by'} {task.reviewedByName}</span>
              )}
            </div>
            <p style={{ color: 'var(--foreground)' }}>{task.lastRejectionNote}</p>
          </m.div>
        )}

        {/* بطاقة تفاصيل التاسك */}
        <div className="rounded-2xl p-6 space-y-4" style={CARD_STYLE}>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-black leading-tight" style={{ color: 'var(--foreground)' }}>
              {task.title}
            </h1>
            <span
              className="shrink-0 rounded-full px-3 py-1 text-[11px] font-black whitespace-nowrap"
              style={{ background: `${statusMeta.color}1a`, color: statusMeta.color }}
            >
              {isArabic ? statusMeta.ar : statusMeta.en}
            </span>
          </div>

          {task.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold pt-1">
            <span className="flex items-center gap-1.5" style={{ color: 'var(--foreground-muted)' }}>
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: priorityMeta.color }}
              />
              {isArabic ? priorityMeta.ar : priorityMeta.en}
            </span>
            <span style={{ color: 'var(--foreground-muted)' }}>{dateRangeLabel}</span>
            {task.createdByName && (
              <span style={{ color: 'var(--foreground-muted)' }}>
                {isArabic ? 'أعطاها' : 'Assigned by'} {task.createdByName}
              </span>
            )}
          </div>
        </div>

        {/* منطقة الفعل — تتغيّر حسب الحالة */}
        <div className="rounded-2xl p-6" style={CARD_STYLE}>
          {task.status === 'open' && (
            <div className="space-y-3">
              <label
                className="block text-sm font-black"
                style={{ color: 'var(--foreground)' }}
              >
                {isArabic ? 'تسليم التاسك' : 'Submit task'}
              </label>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {isArabic
                  ? 'اختياري — اكتب أين رفعت الشغل (رابط الدرايف بيكون وصلك مسبقًا من الأدمن)'
                  : "Optional — note where you uploaded the work (you'll have received the drive link from your admin beforehand)"}
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={isArabic ? 'مثال: رفعت التصميم على درايف رقم 78' : ''}
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                style={{
                  background: 'var(--hover-bg)',
                  border: `1px solid ${noteTooLong ? '#dc2626' : 'var(--divider)'}`,
                  color: 'var(--foreground)',
                }}
              />
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] font-bold"
                  style={{ color: noteTooLong ? '#dc2626' : 'var(--foreground-muted)' }}
                >
                  {noteLength}/{MAX_NOTE_LENGTH}
                </span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isBusy || noteTooLong}
                  className="rounded-xl px-5 py-2 text-sm font-black text-white disabled:opacity-50 transition-opacity"
                  style={{ background: '#0d9488' }}
                >
                  {isArabic ? 'تسليم' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {task.status === 'pending_review' && (
            <div className="space-y-3">
              <p className="text-sm font-black" style={{ color: '#d97706' }}>
                {isArabic ? 'بانتظار مراجعة الأدمن' : "Waiting for admin's review"}
              </p>
              {task.submittedNote && (
                <p
                  className="text-sm rounded-xl p-3"
                  style={{ background: 'var(--hover-bg)', color: 'var(--foreground-muted)' }}
                >
                  {task.submittedNote}
                </p>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={isBusy}
                className="text-sm font-bold underline disabled:opacity-50"
                style={{ color: 'var(--foreground-muted)' }}
              >
                {isArabic ? 'تراجع عن التسليم' : 'Cancel submission'}
              </button>
            </div>
          )}

          {task.status === 'done' && (
            <div className="space-y-2">
              <p className="text-sm font-black" style={{ color: '#16a34a' }}>
                {isArabic ? 'تم الإنجاز ✓' : 'Completed ✓'}
              </p>
              {task.submittedNote && (
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                  {task.submittedNote}
                </p>
              )}
              {task.reviewedByName && (
                <p className="text-xs font-bold" style={{ color: 'var(--foreground-muted)' }}>
                  {isArabic ? 'وافق عليها' : 'Approved by'} {task.reviewedByName}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs font-bold mt-3" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}