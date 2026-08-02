// src/app/(dashboard)/adminControl/notesActions.ts
// ملاحظات المدير + المحادثات المتفرعة عنها.
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminActor, requireManagedTarget, fullName } from './guards';

const CAPABILITY = 'admin.director_notes';

export type NoteAuthorRole = 'director' | 'member';

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
  text: string;
  createdAt: string;
  replies: NoteReplyDTO[];
  directorLastSeenAt: string | null;
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
  text: string;
  created_at: string;
  director_last_seen_at: string | null;
  note_replies: ReplyRow[];
};

/*
  اسم الكاتب بيجي من join مع profiles مش مخزّن بالرد نفسه — عشان تغيير الاسم
  من صفحة البروفايل ينعكس على كل الردود القديمة تلقائيًا. تخزينه كنسخة كان
  بيثبّت الاسم القديم للأبد.
*/
const SELECT_NOTES = `
  id, text, created_at, director_last_seen_at,
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
    text: row.text,
    createdAt: row.created_at,
    directorLastSeenAt: row.director_last_seen_at,
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
export async function createNote(memberId: string, text: string): Promise<DirectorNoteDTO> {
  const { supabase, actor } = await requireManagedTarget(memberId, CAPABILITY, {
    allowSelf: true,
  });

  const body = text.trim();
  if (!body) throw new Error('invalid_input');
  if (body.length > 2000) throw new Error('text_too_long');

  const { data, error } = await supabase
    .from('director_notes')
    .insert({
      member_id: memberId,
      author_id: actor.id,
      text: body,
      // كاتب الملاحظة شافها بالتعريف — بدون هذا بتظهرله كـ"غير مقروءة" فورًا
      director_last_seen_at: new Date().toISOString(),
    })
    .select('id, text, created_at, director_last_seen_at')
    .single();

  if (error || !data) throw new Error('note_create_failed');

  revalidatePath('/adminControl');

  return {
    id: data.id,
    text: data.text,
    createdAt: data.created_at,
    directorLastSeenAt: data.director_last_seen_at,
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

  await requireManagedTarget(note.member_id, CAPABILITY, { allowSelf: true });

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

  await requireManagedTarget(note.member_id, CAPABILITY, { allowSelf: true });

  const { error } = await supabase.from('director_notes').delete().eq('id', noteId);
  if (error) throw new Error('note_delete_failed');

  revalidatePath('/adminControl');
}