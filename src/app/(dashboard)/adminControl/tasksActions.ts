// src/app/(dashboard)/adminControl/tasksActions.ts
// إدارة تاسكات الأعضاء — كل عملية بتتفحص صلاحيات الـ actor من طرف السيرفر،
// والـ RLS بالداتابيز خط دفاع تاني مطابق لنفس القواعد.
'use server';

import { revalidatePath } from 'next/cache';
import { canManage } from '@/lib/permissions/hierarchy';
import { requireAdminActor, requireOpenableTarget, loadTarget, fullName } from './guards';

const CAPABILITY = 'admin.add_task';

export type TaskPriority = 'low' | 'medium' | 'high';
/** الحالة المخزّنة. `due` مشتقة بالواجهة من (open + end_date < today) وما بتتخزن. */
export type TaskStatus = 'open' | 'done';

export type TaskDTO = {
  id: string;
  title: string;
  description: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  createdBy: string | null;
  /** اسم اللي ضاف التاسك — بيتعرض جنب كل صف بالكارد. '' يعني الـ actor نفسه. */
  createdByName: string;
  /** هل الـ actor الحالي مسموح له يحذف هالتاسك تحديدًا (حسب رتبة كاتبها) */
  canDelete: boolean;
  completedAt: string | null;
  createdAt: string;
};

export type TaskInput = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: TaskPriority;
  /** الفورم لسا بيبعت 'due' — بتتحوّل لـ 'open' هون بدل ما نغيّر تصميم الواجهة. */
  status: TaskStatus | 'due';
};

type CreatorJoin = {
  first_name: string | null;
  last_name: string | null;
  is_chief: boolean;
  is_developer: boolean;
  access_role: 'member' | 'admin';
} | null;

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  creator: CreatorJoin;
};

const SELECT_COLUMNS = `
  id, title, description, start_date, end_date, priority, status,
  assigned_to, created_by, completed_at, created_at,
  creator:profiles!tasks_created_by_fkey (
    first_name, last_name, is_chief, is_developer, access_role
  )
`;

const SELECT_MINIMAL =
  'id, title, description, start_date, end_date, priority, status, assigned_to, created_by, completed_at, created_at';

function toDTO(
  row: Omit<TaskRow, 'creator'>,
  canDelete: boolean,
  createdByName: string
): TaskDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdByName,
    canDelete,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

// ===========================================================
// جلب تاسكات عضو (يُنادى عند اختيار العضو، مش مع تحميل الصفحة)
// ===========================================================
export async function listMemberTasks(memberId: string): Promise<TaskDTO[]> {
  const { supabase, actor } = await requireAdminActor();

  const { data, error } = await supabase
    .from('tasks')
    .select(SELECT_COLUMNS)
    .eq('assigned_to', memberId)
    // الأحدث إضافة أولاً — الغرض الأساسي من القائمة تصحيح إضافة قريبة
    .order('created_at', { ascending: false });

  if (error) throw new Error('tasks_fetch_failed');

  return (data ?? []).map((raw) => {
    const row = raw as unknown as TaskRow;
    const creator = row.creator;
    const isOwn = row.created_by === actor.id;

    /*
      نفس قاعدة السياسة بالداتابيز (مايجريشن 008) معادة هون عشان الواجهة
      تخفي زر الحذف بدل ما تعرضه ويرجع رفض. أي تعديل هون لازم يقابله
      تعديل بالسياسة — درس #9.
    */
    const canDelete =
      isOwn ||
      row.created_by === null ||
      (creator
        ? canManage(actor, {
            id: row.created_by as string,
            isDeveloper: creator.is_developer,
            isChief: creator.is_chief,
            accessRole: creator.access_role,
          })
        : false);

    // '' = أنا — الواجهة بتترجمها لـ "You" / "أنت" حسب اللغة
    const createdByName = isOwn
      ? ''
      : fullName(creator?.first_name ?? null, creator?.last_name ?? null);

    return toDTO(row, canDelete, createdByName);
  });
}

// ===========================================================
// إضافة تاسك
// ===========================================================
export async function createTask(memberId: string, values: TaskInput): Promise<TaskDTO> {
  const { supabase, actor } = await requireOpenableTarget(memberId, CAPABILITY);

  const title = values.title.trim();
  const description = values.description.trim();

  // نفس فحوصات الفورم، معادة هون لأن أي فحص بالكلاينت بس هو اقتراح مش قيد
  if (!title || !values.startDate || !values.endDate) throw new Error('invalid_input');
  if (values.endDate < values.startDate) throw new Error('invalid_date_order');
  if (title.length > 120) throw new Error('title_too_long');
  if (description.length > 2000) throw new Error('description_too_long');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description: description || null,
      start_date: values.startDate,
      end_date: values.endDate,
      priority: values.priority,
      // 'due' حالة مشتقة مش مخزّنة — أي تاسك جديدة غير المنجزة بتبدأ open
      status: values.status === 'done' ? 'done' : 'open',
      assigned_to: memberId,
      created_by: actor.id,
    })
    .select(SELECT_MINIMAL)
    .single();

  if (error || !data) throw new Error('task_create_failed');

  revalidatePath('/adminControl');

  // اللي ضافها هو الـ actor نفسه، فبالتعريف يقدر يحذفها
  return toDTO(data as Omit<TaskRow, 'creator'>, true, '');
}

// ===========================================================
// تبديل حالة التاسك (open ⇄ done)
// ===========================================================
export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const { supabase } = await requireAdminActor();

  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_to')
    .eq('id', taskId)
    .single();

  if (!task) throw new Error('not_found');

  await requireOpenableTarget(task.assigned_to, CAPABILITY);

  // completed_at بتتظبط تلقائيًا بـ trigger — ما بنبعتها من هون
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  if (error) throw new Error('task_update_failed');

  revalidatePath('/adminControl');
}

// ===========================================================
// حذف تاسك
// ===========================================================
export async function deleteTask(taskId: string) {
  const { supabase, actor } = await requireAdminActor();

  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_to, created_by')
    .eq('id', taskId)
    .single();

  if (!task) throw new Error('not_found');

  // (1) لازم تقدر تدير العضو المكلّف
  await requireOpenableTarget(task.assigned_to, CAPABILITY);

  /*
    (2) ولازم تقدر تدير اللي ضاف التاسك.
    بدون هذا، أي أدمن ثانوي كان يقدر يمسح تاسك حطّها الـ Chief أو الـ Developer
    لنفس العضو — والعضو بيلاقي شغله اختفى بدون تفسير.
  */
  if (task.created_by && task.created_by !== actor.id) {
    const creator = await loadTarget(supabase, task.created_by);
    if (!canManage(actor, creator)) throw new Error('forbidden');
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error('task_delete_failed');

  revalidatePath('/adminControl');
}