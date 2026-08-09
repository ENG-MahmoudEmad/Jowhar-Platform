// src/lib/taskStats.ts
//
// Single source of truth for every task counter in the app.
// Today Focus, the Leaderboard (weekly + monthly), and Team Performance must all
// count through these helpers rather than reimplementing the rules, otherwise two
// screens can show contradictory numbers for the same data.

/**
 * الحالات المخزّنة فعليًا بالداتابيز.
 * `pending_review` = العضو سلّم وبانتظار قرار الأدمن (موافقة/رفض).
 * لا يوجد `in-progress` ولا `todo`.
 */
export type TaskStatus = "open" | "pending_review" | "done";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  /** وصف اختياري — يظهر بصفحة تفاصيل التاسك */
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** yyyy-mm-dd — بداية التاسك، بتحدد موقع البار بالـ Gantt */
  startDate: string;
  /** yyyy-mm-dd — الموعد النهائي (`end_date` بالداتابيز) */
  deadline: string;
  createdByName: string | null;
reviewedByName: string | null;
  /**

   * When the task was actually marked done — NOT the deadline.
   *
   * This is the source of truth for every "completed in period" counter:
   *   - Today Focus  → DONE card (current calendar month)
   *   - Leaderboard  → Weekly and Monthly scores
   *
   * IMPORTANT: هذا وقت **التسليم** (submitted_at) مش وقت موافقة الأدمن —
   * الـ trigger `sync_task_completed_at` بالداتابيز بيضبطها كده عمدًا،
   * عشان تأخر الأدمن بالمراجعة ما يظلمش نقاط العضو بالـ Leaderboard.
   *
   * A task whose deadline was last month but which was closed today counts
   * toward THIS month. `null` while the task is not done.
   */
  completedAt: string | null; // ISO
  /** نص اختياري كتبه العضو وقت التسليم (أين رفع الشغل) — ≤500 حرف */
  submittedNote: string | null;
  /** وقت آخر تسليم — نفس قيمة completedAt لو اتوافق عليه، بس بتظل موجودة برضو لو لسا pending_review */
  submittedAt: string | null;
  /** آخر سبب رفض من الأدمن — بيتبدل مع كل رفض جديد، مش سجل تاريخي */
  lastRejectionNote: string | null;
  /** وقت ما العضو فتح/شاف سبب الرفض — null يعني لسا ما شافه (بادج تحذيري لازم يظهر) */
  rejectionSeenAt: string | null;
}

/* ─── Date helpers ─────────────────────────────────────────────────────────── */

/**
 * All comparisons run at day granularity so a task due today at 09:00 is not
 * treated as overdue just because the user opened the page at 15:00.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** yyyy-mm-dd → Date محلي بدون انزياح المنطقة الزمنية. */
export function parseDateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  // Last millisecond of the month
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Current calendar month, used by the DONE card and the Leaderboard's Monthly view. */
export function getCurrentMonthRange(now: Date): { start: Date; end: Date } {
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ "DUE" ضلت موجودة كمفهوم (isOverdue / countNeedsAttention) لأنها لسا
   مستخدمة بأماكن تانية (شارة حمرا/صفرا على التاسك نفسه بالـ Gantt وكارد
   الأدمن) — بس اتشالت من TodayFocusCounts تحديدًا (قرار: استُبدلت هناك
   بعدّاد "قيد المراجعة"، مش محتاجينها كخانة منفصلة بهالكارت).

   1. `isOverdue(task)`      → التاسك **فات موعدها** ولسا مفتوحة (status='open' فقط،
                               pending_review ما بتتحسب "متأخرة" — العضو أصلاً سلّم).

   2. `countNeedsAttention()` → لسا موجودة لو احتجناها بمكان تاني مستقبلاً،
                               بس ما عادت مستخدمة بـ Today Focus.
   ═══════════════════════════════════════════════════════════════════════════ */

/** الشارة المعروضة على التاسك نفسها. */
export function isOverdue(task: Pick<Task, "status" | "deadline">, now: Date): boolean {
  if (task.status !== "open") return false; // done أو pending_review ما بتتحسب متأخرة
  return startOfDay(parseDateOnly(task.deadline)) < startOfDay(now);
}

/* ─── Counters ─────────────────────────────────────────────────────────────── */

/** OPEN — لسا ما بلّش التسليم (مش pending_review ومش done). */
export function countOpen(tasks: Task[]): number {
  return tasks.filter((task) => task.status === "open").length;
}

/** PENDING REVIEW — العضو سلّم، بانتظار قرار الأدمن. */
export function countPendingReview(tasks: Task[]): number {
  return tasks.filter((task) => task.status === "pending_review").length;
}

/**
 * NEEDS ATTENTION — unfinished (status='open' فقط) work due within the next
 * `days` days, plus everything already overdue. لسا موجودة لاستخدامات تانية
 * (شارات على التاسك نفسه)، بس مش جزء من Today Focus بعد اليوم.
 */
export function countNeedsAttention(tasks: Task[], now: Date, days = 7): number {
  const horizon = addDays(now, days);

  return tasks.filter((task) => {
    if (task.status !== "open") return false;
    return startOfDay(parseDateOnly(task.deadline)) <= horizon;
  }).length;
}

/**
 * DONE — tasks completed inside an arbitrary period, keyed off `completedAt`.
 *
 * Shared intentionally: the DONE card passes the current month, and the
 * Leaderboard passes its weekly or monthly window. Same field, same rule, so the
 * DONE card and the Leaderboard's Monthly total always agree.
 */
export function countDoneInPeriod(tasks: Task[], start: Date, end: Date): number {
  const from = start.getTime();
  const to = end.getTime();

  return tasks.filter((task) => {
    if (task.status !== "done" || !task.completedAt) return false;
    const completed = new Date(task.completedAt).getTime();
    return completed >= from && completed <= to;
  }).length;
}

/** Convenience wrapper for the DONE card. */
export function countDoneThisMonth(tasks: Task[], now: Date): number {
  const { start, end } = getCurrentMonthRange(now);
  return countDoneInPeriod(tasks, start, end);
}

/* ─── Aggregate used by the Today Focus card ───────────────────────────────── */

export interface TodayFocusCounts {
  open: number;
  pendingReview: number;
  done: number;
}

export function getTodayFocusCounts(tasks: Task[], now: Date): TodayFocusCounts {
  return {
    open: countOpen(tasks),
    pendingReview: countPendingReview(tasks),
    done: countDoneThisMonth(tasks, now),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BACKEND NOTE
   ═══════════════════════════════════════════════════════════════════════════
   العدّ بيصير بالكلاينت هون لأن تاسكات العضو الواحد رقم صغير، فجلبها كاملة
   أرخص من round-trip إضافي لكل عدّاد.

   بس الـ Leaderboard و Team Performance بيعدّوا عبر **كل** الأعضاء — هدول
   لازم ينتقلوا لـ RPC بالسيرفر، لأن جلب تاسكات الاستوديو كامل للمتصفح
   عشان تعدّها محليًا ما بيتوسّع.

   القواعد اللي لازم السيرفر ينفّذها بالحرف:
     OPEN            → status = 'open'
     PENDING_REVIEW  → status = 'pending_review'
     DONE            → status = 'done' AND completed_at BETWEEN <period start> AND <period end>

   حدود الفترة تُحسب بتوقيت الاستوديو، مش توقيت الزائر — وإلا الشهر بكارد
   DONE والشهر باللوحة بيختلفوا لبعض المستخدمين.
   ═══════════════════════════════════════════════════════════════════════════ */