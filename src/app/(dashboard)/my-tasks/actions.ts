// src/app/(dashboard)/my-tasks/actions.ts
// تاسكات المستخدم الحالي — قراءة بس.
// الإضافة والحذف حصريًا من Admin Control؛ العضو ما بيعطي حاله شغل.
// التسليم/الإلغاء/الموافقة/الرفض → taskSubmissionActions.ts (ملف منفصل،
// دورة حياة أعقد من توغل بسيط، راجع الملف لتفاصيل الصلاحيات).
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Task } from '@/lib/taskStats';
// fullName نفس الدالة المستخدمة بـtasksActions.ts (Admin Control) — بدل
// ما نكررها هون.
import { fullName } from '../adminControl/guards';

type NameJoin = { first_name: string | null; last_name: string | null } | null;

type Row = {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'pending_review' | 'done';
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date: string;
  completed_at: string | null;
  submitted_note: string | null;
  submitted_at: string | null;
  last_rejection_note: string | null;
  rejection_seen_at: string | null;
  creator: NameJoin;
  reviewer: NameJoin;
};

const SELECT_COLUMNS = `
  id, title, description, status, priority, start_date, end_date, completed_at,
  submitted_note, submitted_at, last_rejection_note, rejection_seen_at,
  creator:profiles!tasks_created_by_fkey ( first_name, last_name ),
  reviewer:profiles!tasks_reviewed_by_fkey ( first_name, last_name )
`;

function nameOrNull(join: NameJoin): string | null {
  const name = fullName(join?.first_name ?? null, join?.last_name ?? null);
  return name || null;
}

function toTask(row: Row): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    deadline: row.end_date,
    completedAt: row.completed_at,
    submittedNote: row.submitted_note,
    submittedAt: row.submitted_at,
    lastRejectionNote: row.last_rejection_note,
    rejectionSeenAt: row.rejection_seen_at,
    createdByName: nameOrNull(row.creator),
    reviewedByName: nameOrNull(row.reviewer),
  };
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');
  return { supabase, userId: user.id };
}

/**
 * كل تاسكات المستخدم — مش مفلترة بفترة.
 * الكاليندر بيفلتر حسب الأسبوع/الشهر المعروض، وTodayFocus بيعدّ الكل،
 * فجلب واحد بيغذي الاتنين بدل استعلامين.
 */
export async function listMyTasks(): Promise<Task[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from('tasks')
    .select(SELECT_COLUMNS)
    .eq('assigned_to', userId)
    .order('end_date', { ascending: true });

  if (error) throw new Error('tasks_fetch_failed');

  return (data ?? []).map((r) => toTask(r as Row));
}

/**
 * تاسك واحد بتفاصيله الكاملة — لصفحة /my-tasks/[taskId].
 * `.eq('assigned_to', userId)` حارس صريح فوق الـ RLS: ما حدا يقدر يفتح
 * تفاصيل تاسك غيره من هالمسار (الأدمن عنده مسار منفصل بالـ Admin Control).
 */
export async function getMyTaskById(taskId: string): Promise<Task | null> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from('tasks')
    .select(SELECT_COLUMNS)
    .eq('id', taskId)
    .eq('assigned_to', userId)
    .maybeSingle();

  if (error) throw new Error('task_fetch_failed');
  if (!data) return null;

  return toTask(data as Row);
}

/*
  ⚠️ toggleMyTaskStatus القديمة (open⇄done مباشر) اتحذفت من هون بقصد.
  دورة الحياة الجديدة ما بتسمح للعضو ينتقل لـ'done' مباشرة أبدًا — لا من
  الفرونت ولا حتى لو حاول يستدعي تحديث مباشر (trigger
  `trg_tasks_guard_self_update` بالداتابيز بيرفضها فورًا بغض النظر عن الفرونت).
  الاستبدال: submitTask / cancelSubmission بملف taskSubmissionActions.ts.
*/