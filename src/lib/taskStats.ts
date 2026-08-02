// src/lib/taskStats.ts
//
// Single source of truth for every task counter in the app.
// Today Focus, the Leaderboard (weekly + monthly), and Team Performance must all
// count through these helpers rather than reimplementing the rules, otherwise two
// screens can show contradictory numbers for the same data.

/** الحالات المخزّنة فعليًا بالداتابيز. لا يوجد `in-progress` ولا `todo`. */
export type TaskStatus = "open" | "done";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** yyyy-mm-dd — بداية التاسك، بتحدد موقع البار بالـ Gantt */
  startDate: string;
  /** yyyy-mm-dd — الموعد النهائي (`end_date` بالداتابيز) */
  deadline: string;
  /**
   * When the task was actually marked done — NOT the deadline.
   *
   * This is the source of truth for every "completed in period" counter:
   *   - Today Focus  → DONE card (current calendar month)
   *   - Leaderboard  → Weekly and Monthly scores
   *
   * A task whose deadline was last month but which was closed today counts
   * toward THIS month. `null` while the task is not done.
   */
  completedAt: string | null; // ISO
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
   ⚠️ "DUE" بتعني شيئين مختلفين بالمنصة — الاتنين صح بمكانهم، بس ممنوع توحيدهم:

   1. `isOverdue(task)`      → التاسك **فات موعدها** ولسا مفتوحة.
                               هاي اللي بتتعرض كشارة حمرا/صفرا على التاسك نفسها،
                               بكارد الأدمن وبالـ Gantt.

   2. `countNeedsAttention()` → التاسك **محتاجة انتباه**: باقي عليها ≤7 أيام
                               أو فاتت أصلاً. هاي رقم عدّاد Today Focus.

   تاسك موعدها بعد 3 أيام: محتاجة انتباه ✅ بس مش متأخرة ❌
   توحيد الاتنين تحت اسم واحد بيكسر وحدة منهم بالتأكيد.
   ═══════════════════════════════════════════════════════════════════════════ */

/** الشارة المعروضة على التاسك نفسها. */
export function isOverdue(task: Pick<Task, "status" | "deadline">, now: Date): boolean {
  if (task.status === "done") return false;
  return startOfDay(parseDateOnly(task.deadline)) < startOfDay(now);
}

/* ─── Counters ─────────────────────────────────────────────────────────────── */

/** OPEN — anything not finished, regardless of dates. */
export function countOpen(tasks: Task[]): number {
  return tasks.filter((task) => task.status !== "done").length;
}

/**
 * NEEDS ATTENTION — unfinished work due within the next `days` days, plus
 * everything already overdue. معروضة بالواجهة تحت اسم "Due".
 *
 * Note the window is a ROLLING 7 days from today, deliberately different from the
 * Leaderboard's fixed work week. The question here is "what is due soon?", so the
 * horizon must stay 7 days ahead even on a Thursday; the Leaderboard asks "who
 * performed best this week?", which needs fixed week boundaries. Do not unify them.
 */
export function countNeedsAttention(tasks: Task[], now: Date, days = 7): number {
  const horizon = addDays(now, days);

  return tasks.filter((task) => {
    if (task.status === "done") return false;
    // `<= horizon` covers overdue too, since past days are below the horizon.
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
  due: number;
  done: number;
}

export function getTodayFocusCounts(tasks: Task[], now: Date): TodayFocusCounts {
  return {
    open: countOpen(tasks),
    due: countNeedsAttention(tasks, now),
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
     OPEN → status <> 'done'
     DUE  → status <> 'done' AND end_date <= current_date + 7
     DONE → status = 'done' AND completed_at BETWEEN <period start> AND <period end>

   حدود الفترة تُحسب بتوقيت الاستوديو، مش توقيت الزائر — وإلا الشهر بكارد
   DONE والشهر باللوحة بيختلفوا لبعض المستخدمين.
   ═══════════════════════════════════════════════════════════════════════════ */