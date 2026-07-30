// src/lib/taskStats.ts
//
// Single source of truth for every task counter in the app.
// Today Focus, the Leaderboard (weekly + monthly), and Team Performance must all
// count through these helpers rather than reimplementing the rules, otherwise two
// screens can show contradictory numbers for the same data.

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  titleAr: string;
  status: TaskStatus;
  /** Deadline: full timestamp (date + end hour), set when the admin creates the task. */
  deadline: string; // ISO
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

/* ─── Counters ─────────────────────────────────────────────────────────────── */

/** OPEN — anything not finished, regardless of dates. */
export function countOpen(tasks: Task[]): number {
  return tasks.filter((task) => task.status !== "done").length;
}

/**
 * DUE — unfinished work that needs attention now: due within the next `days`
 * days, plus everything already overdue.
 *
 * Note the window is a ROLLING 7 days from today, deliberately different from the
 * Leaderboard's fixed work week. The question here is "what is due soon?", so the
 * horizon must stay 7 days ahead even on a Thursday; the Leaderboard asks "who
 * performed best this week?", which needs fixed week boundaries. Do not unify them.
 *
 * Completed tasks are excluded — a finished task is not pending attention.
 */
export function countDue(tasks: Task[], now: Date, days = 7): number {
  const horizon = addDays(now, days);

  return tasks.filter((task) => {
    if (task.status === "done") return false;
    // `<= horizon` covers overdue too, since past days are below the horizon.
    return startOfDay(new Date(task.deadline)) <= horizon;
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
    due: countDue(tasks, now),
    done: countDoneThisMonth(tasks, now),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BACKEND NOTE
   ═══════════════════════════════════════════════════════════════════════════
   These helpers exist so the frontend can compute counters over mock data while
   the backend is being built. Once tasks come from Supabase, move the counting
   to the server (a view or RPC returning `{ open, due, done }` for a member) and
   keep this file only for whatever the client still derives locally.

   The rules above are the contract the server must implement:
     OPEN → status <> 'done'
     DUE  → status <> 'done' AND deadline::date <= current_date + 7
             (overdue is included by construction)
     DONE → status = 'done' AND completed_at BETWEEN <period start> AND <period end>

   Period boundaries belong on the server in the studio's timezone, not the
   visitor's — the same rule already stated for the Leaderboard. The month used by
   the DONE card and the month used by the Leaderboard's Monthly view MUST be the
   identical range, or the two screens will disagree.
   ═══════════════════════════════════════════════════════════════════════════ */