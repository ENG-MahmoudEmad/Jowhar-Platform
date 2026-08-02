// src/app/(dashboard)/my-tasks/actions.ts
// تاسكات المستخدم الحالي — قراءة وتبديل حالة فقط.
// الإضافة والحذف حصريًا من Admin Control؛ العضو ما بيعطي حاله شغل.
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Task } from '@/lib/taskStats';

type Row = {
  id: string;
  title: string;
  status: 'open' | 'done';
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date: string;
  completed_at: string | null;
};

const SELECT_COLUMNS = 'id, title, status, priority, start_date, end_date, completed_at';

function toTask(row: Row): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    deadline: row.end_date,
    completedAt: row.completed_at,
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
 * التوغل السريع: منجزة ⇄ مفتوحة.
 *
 * `completed_at` ما بتنبعت من هون — trigger `trg_tasks_completed_at` بيظبطها.
 * والـ RLS + trigger `trg_tasks_guard_self_update` بيضمنوا إن العضو يقدر
 * يغيّر `status` بس، وما يقدر يعدّل عنوان التاسك ولا تواريخها.
 */
export async function toggleMyTaskStatus(taskId: string, status: 'open' | 'done') {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('assigned_to', userId); // حارس صريح فوق الـ RLS

  if (error) throw new Error('task_update_failed');

  revalidatePath('/my-tasks');
}