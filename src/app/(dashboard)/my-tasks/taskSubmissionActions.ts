// src/app/(dashboard)/my-tasks/taskSubmissionActions.ts
//
// دورة حياة التسليم/المراجعة الجديدة (بدل نظام الإثبات القديم الموثّق
// بالجزء 07 — الشغل هون بيترسل خارجيًا (تيليجرام مثلاً) قبل التاسك أصلاً،
// فما في رفع ملفات، بس نص تسليم اختياري + قرار أدمن).
//
// دفاع بطبقتين (نفس نمط guards.ts بالأرشيف/Admin Control):
//   1. فحص صريح هون قبل أي UPDATE (رسالة خطأ واضحة للمستخدم)
//   2. trigger `trg_tasks_guard_self_update` بالداتابيز (خط الدفاع الحقيقي
//      اللي ما بينكسر حتى لو نسينا فحص هون)
//
// ⚠️ ملاحظة أداء: ما في revalidatePath('/my-tasks') ولا
// revalidatePath(`/my-tasks/${taskId}`) بأي فنكشن هون بقصد —
// MyTasksClient.tsx بيحدّث الـ state المحلي optimistically فور كل
// استدعاء، فـ revalidate لنفس الصفحة كان بيعمل إعادة جلب مكرر
// (listMyTasks + listMyDirectorNotes + listMyNotes) بالخلفية بلا أي
// فايدة بصرية للمستخدم. revalidatePath('/adminControl') باقي لأنه
// صفحة تانية فعليًا محتاجة تعرف بالتحديث (قائمة pending_review عندها).
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const MAX_NOTE_LENGTH = 500;
const MAX_REJECTION_REASON_LENGTH = 500;

// TODO(notifications): كل نداءات notify_user/notify_permitted لهاد الملف
// مؤجلة بقصد لجلسة منفصلة (موضوع الإشعارات كامل بالموقع محتاج تدقيق أشمل
// قبل ما نبني عليه أنواع جديدة). القيم بـenum notification_type
// (task_submitted / task_approved / task_rejected) جاهزة، بس مش مستخدمة بعد.

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');
  return { supabase, userId: user.id };
}

/**
 * تسليم تاسك: open → pending_review.
 * النص اختياري (حد أقصى 500 حرف)، حارس صريح `assigned_to = userId` فوق
 * الـ RLS، والـ trigger بيرفض أي انتقال غير open→pending_review أصلاً.
 */
export async function submitTask(taskId: string, note?: string | null) {
  const { supabase, userId } = await requireUser();

  const trimmedNote = note?.trim() || null;
  if (trimmedNote && trimmedNote.length > MAX_NOTE_LENGTH) {
    throw new Error('note_too_long');
  }

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'pending_review', submitted_note: trimmedNote })
    .eq('id', taskId)
    .eq('assigned_to', userId);

  if (error) throw new Error('task_submit_failed');
}

/**
 * تراجع العضو عن تسليمه: pending_review → open.
 * الـ trigger `sync_task_completed_at` بينظّف submitted_at/submitted_note
 * تلقائيًا، فما في داعي نصفّرهم هون.
 */
export async function cancelSubmission(taskId: string) {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'open' })
    .eq('id', taskId)
    .eq('assigned_to', userId);

  if (error) throw new Error('task_cancel_submission_failed');
}

/**
 * فحص صلاحية القرار (موافقة/رفض/تراجع).
 *
 * القاعدة (محسومة مع محمود): بس صاحب التاسك (created_by) أو الشيف أدمن
 * يقدر يراجعها — مش أي أدمن يشارك نفس المنصة مع العضو. الشيف أدمن وحده
 * كمان المسموحله يراجع تاسك موكّلة لحاله شخصيًا (باقي الأدوار ممنوعين
 * يكلّفوا نفسهم أصلاً، فهالحالة ما بتصير غيرهم).
 */
async function assertCanReview(taskId: string, expectedStatus: 'pending_review' | 'done') {
  const { supabase, userId } = await requireUser();

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('assigned_to, status, created_by')
    .eq('id', taskId)
    .maybeSingle();

  if (fetchError || !task) throw new Error('task_not_found');
  if (task.status !== expectedStatus) throw new Error('task_wrong_status');

  const { data: isChief } = await supabase.rpc('is_chief', { uid: userId });
  const isCreator = task.created_by === userId;

  if (!isChief && !isCreator) throw new Error('not_authorized');

  return { supabase, userId };
}

/**
 * موافقة الأدمن: pending_review → done.
 * `completed_at` بيتضبط تلقائيًا بالـ trigger = submitted_at (وقت التسليم
 * الفعلي، مش وقت هالموافقة — قرار مقصود لعدالة نقاط الـLeaderboard).
 */
export async function approveTask(taskId: string) {
  const { supabase, userId } = await assertCanReview(taskId, 'pending_review');

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', reviewed_by: userId })
    .eq('id', taskId);

  if (error) throw new Error('task_approve_failed');

  // Admin Control بيعرض قائمة pending_review كمان — صفحة تانية فعليًا،
  // مش مغطاة بالـ optimistic state تبع MyTasksClient، فلازم تتحدث فورًا
  revalidatePath('/adminControl');
}

/**
 * رفض الأدمن: pending_review → open + last_rejection_note.
 * السبب إلزامي (بعكس نص التسليم) — قرار مقصود: الأدمن لازم يوثّق ليش،
 * العضو مش هيقدر يصلّح شي بدون ما يعرف شو المطلوب بالضبط.
 * الـ trigger بيصفّر rejection_seen_at تلقائيًا (البادج التحذيري بيرجع يطلع).
 */
export async function rejectTask(taskId: string, reason: string) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error('rejection_reason_required');
  if (trimmedReason.length > MAX_REJECTION_REASON_LENGTH) {
    throw new Error('rejection_reason_too_long');
  }

  const { supabase, userId } = await assertCanReview(taskId, 'pending_review');

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'open', last_rejection_note: trimmedReason, reviewed_by: userId })
    .eq('id', taskId);

  if (error) throw new Error('task_reject_failed');

  // Admin Control بيعرض قائمة pending_review كمان — صفحة تانية فعليًا
  revalidatePath('/adminControl');
}

/**
 * تراجع الأدمن عن موافقة سابقة: done → pending_review.
 *
 * ⚠️ بترجع pending_review مش open. لو الأدمن ضغط "موافقة" بالغلط،
 * التاسك لسا مسلّمة فعليًا من العضو — الرجوع هون هو إلغاء *القرار*،
 * مش إلغاء *التسليم نفسه*. الفرق مهم: العضو ما لازم يضطر يسلّم من
 * جديد لشي هو أصلاً سلّمه، والأدمن (أو الشيف أدمن) لازم يقدر يعيد
 * القرار (موافقة أو رفض) على نفس التسليم الأصلي.
 *
 * submitted_at/submitted_note الأصليين بيضلوا كما هم — الـ trigger
 * `sync_task_completed_at` بميّز هالحالة (done→pending_review) عن
 * تسليم جديد حقيقي (open→pending_review) وما بيلمسهم.
 */
export async function revertApproval(taskId: string) {
  const { supabase } = await assertCanReview(taskId, 'done');

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'pending_review' })
    .eq('id', taskId);

  if (error) throw new Error('task_revert_failed');

  // Admin Control بيعرض قائمة pending_review كمان — صفحة تانية فعليًا
  revalidatePath('/adminControl');
}

/**
 * العضو فتح تفاصيل تاسك مرفوض → تعليم سبب الرفض كمقروء (البادج بيختفي،
 * النص بيضل ظاهر جوا التفاصيل). بتُستدعى تلقائيًا من صفحة /my-tasks/[taskId]
 * لو التاسك عليه last_rejection_note وrejection_seen_at لسا فاضية.
 */
export async function markRejectionSeen(taskId: string) {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from('tasks')
    .update({ rejection_seen_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('assigned_to', userId);

  if (error) throw new Error('mark_rejection_seen_failed');
}