// src/app/(dashboard)/adminControl/notesActions.ts
// ملاحظات المدير + المحادثات المتفرعة عنها.
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminActor, requireOpenableTarget, fullName } from './guards';

const CAPABILITY = 'admin.director_notes';

export type NoteAuthorRole = 'director' | 'member';
export type NotePriority = 'low' | 'medium' | 'high';

export type NoteReplyDTO = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: NoteAuthorRole;
  text: string;
  createdAt: string;
};

export type DirectorNoteDTO = {
  id: string;
  title: string;
  text: string;
  priority: NotePriority;
  createdAt: string;
  replies: NoteReplyDTO[];
  directorLastSeenAt: string | null;
  /** متى فتحها العضو أول مرة — إيصال قراءة نهائي، بيُعرض للمدير. */
  memberReadAt: string | null;
};

type ProfileJoin = { first_name: string | null; last_name: string | null } | null;

type ReplyRow = {
  id: string;
  author_id: string | null;
  author_role: NoteAuthorRole;
  text: string;
  created_at: string;
  author: ProfileJoin;
};

type NoteRow = {
  id: string;
  title: string;
  text: string;
  priority: NotePriority;
  created_at: string;
  director_last_seen_at: string | null;
  member_read_at: string | null;
  note_replies: ReplyRow[];
};

/*
  اسم الكاتب بيجي من join مع profiles مش مخزّن بالرد نفسه — عشان تغيير الاسم
  من صفحة البروفايل ينعكس على كل الردود القديمة تلقائيًا. تخزينه كنسخة كان
  بيثبّت الاسم القديم للأبد.
*/
const SELECT_NOTES = `
  id, title, text, priority, created_at, director_last_seen_at, member_read_at,
  note_replies (
    id, author_id, author_role, text, created_at,
    author:profiles!note_replies_author_id_fkey ( first_name, last_name )
  )
`;

function toReplyDTO(row: ReplyRow): NoteReplyDTO {
  return {
    id: row.id,
    authorId: row.author_id ?? '',
    authorName: fullName(row.author?.first_name ?? null, row.author?.last_name ?? null),
    authorRole: row.author_role,
    text: row.text,
    createdAt: row.created_at,
  };
}

function toNoteDTO(row: NoteRow): DirectorNoteDTO {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    priority: row.priority,
    createdAt: row.created_at,
    directorLastSeenAt: row.director_last_seen_at,
    memberReadAt: row.member_read_at,
    // الردود لازم تكون تصاعدية — الفقاعات بتتقرأ من الأقدم للأحدث
    replies: [...(row.note_replies ?? [])]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(toReplyDTO),
  };
}

// ===========================================================
// جلب ملاحظات عضو مع ردودها
// ===========================================================
export async function listMemberNotes(memberId: string): Promise<DirectorNoteDTO[]> {
  const { supabase } = await requireAdminActor();

  const { data, error } = await supabase
    .from('director_notes')
    .select(SELECT_NOTES)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('notes_fetch_failed');

  return (data ?? []).map((r) => toNoteDTO(r as unknown as NoteRow));
}

// ===========================================================
// إضافة ملاحظة
// ===========================================================
export async function createNote(
  memberId: string,
  input: { title: string; text: string; priority: NotePriority }
): Promise<DirectorNoteDTO> {
  const { supabase, actor } = await requireOpenableTarget(memberId, CAPABILITY);

  /*
    محدش يقدر يعطي حاله ملاحظة — بلا استثناء، حتى الشيف أدمن (بعكس
    التاسكات اللي فيها استثناء للشيف أدمن). الملاحظة أصلاً مفهومها
    "تقييم/توجيه من فوق"، وما إلها معنى موجهة لنفس الشخص.
  */
  if (memberId === actor.id) {
    throw new Error('cannot_note_yourself');
  }

  /*
    الأدمن الثانوي (مش شيف أدمن ولا ديفيلوبر) بس يقدر يكتب ملاحظة لعضو
    موجود معه بمنصة مشتركة — نفس القيد المطبّق على تكليف التاسكات بالضبط.
  */
  if (!actor.isChief && !actor.isDeveloper) {
    const { data: sharesPlatform } = await supabase.rpc('shares_platform_with', {
      p_actor_id: actor.id,
      p_target_id: memberId,
    });
    if (!sharesPlatform) throw new Error('member_not_in_shared_platform');
  }

  const title = input.title.trim();
  const body = input.text.trim();

  if (!title || !body) throw new Error('invalid_input');
  if (title.length > 120) throw new Error('title_too_long');
  if (body.length > 2000) throw new Error('text_too_long');

  const { data, error } = await supabase
    .from('director_notes')
    .insert({
      member_id: memberId,
      author_id: actor.id,
      title,
      text: body,
      priority: input.priority,
      // كاتب الملاحظة شافها بالتعريف — بدون هذا بتظهرله كـ"غير مقروءة" فورًا
      director_last_seen_at: new Date().toISOString(),
    })
    .select('id, title, text, priority, created_at, director_last_seen_at, member_read_at')
    .single();

  if (error || !data) throw new Error('note_create_failed');

  revalidatePath('/adminControl');

  return {
    id: data.id,
    title: data.title,
    text: data.text,
    priority: data.priority,
    createdAt: data.created_at,
    directorLastSeenAt: data.director_last_seen_at,
    memberReadAt: data.member_read_at,
    replies: [],
  };
}

// ===========================================================
// إضافة رد على ملاحظة
// ===========================================================
export async function addNoteReply(noteId: string, text: string): Promise<NoteReplyDTO> {
  const { supabase, actor } = await requireAdminActor();

  const body = text.trim();
  if (!body) throw new Error('invalid_input');
  if (body.length > 2000) throw new Error('text_too_long');

  const { data: note } = await supabase
    .from('director_notes')
    .select('id, member_id')
    .eq('id', noteId)
    .single();

  if (!note) throw new Error('not_found');

  await requireOpenableTarget(note.member_id, CAPABILITY);

  /*
    author_role مش مبعوت من هون عن قصد — trigger بالداتابيز بيحسبه
    (author_id = member_id ⇒ member، غير هيك director). لو تُرك للكلاينت
    بيقدر أي حدا يزوّر عدّاد الردود غير المقروءة.
  */
  const { data, error } = await supabase
    .from('note_replies')
    .insert({ note_id: noteId, author_id: actor.id, text: body })
    .select('id, author_id, author_role, text, created_at')
    .single();

  if (error || !data) throw new Error('reply_create_failed');

  // الرد من المدير بيعتبر قراءة للمحادثة كاملة
  await supabase
    .from('director_notes')
    .update({ director_last_seen_at: data.created_at })
    .eq('id', noteId);

  revalidatePath('/adminControl');

  return {
    id: data.id,
    authorId: data.author_id ?? actor.id,
    authorName: '', // الواجهة بتعرض "أنت" لردود المدير، فما بتحتاج الاسم
    authorRole: data.author_role,
    text: data.text,
    createdAt: data.created_at,
  };
}

// ===========================================================
// تعليم المحادثة كمقروءة (RPC بيقرر أي عمود يكتب حسب هوية المنادي)
// ===========================================================
export async function markNoteSeen(noteId: string) {
  const { supabase } = await requireAdminActor();

  const { error } = await supabase.rpc('mark_note_seen', { p_note_id: noteId });
  if (error) throw new Error('mark_seen_failed');
}

// ===========================================================
// حذف ملاحظة (الردود بتنحذف معها بالـ cascade)
// ===========================================================
export async function deleteNote(noteId: string) {
  const { supabase } = await requireAdminActor();

  const { data: note } = await supabase
    .from('director_notes')
    .select('id, member_id')
    .eq('id', noteId)
    .single();

  if (!note) throw new Error('not_found');

  await requireOpenableTarget(note.member_id, CAPABILITY);

  const { error } = await supabase.from('director_notes').delete().eq('id', noteId);
  if (error) throw new Error('note_delete_failed');

  revalidatePath('/adminControl');
}