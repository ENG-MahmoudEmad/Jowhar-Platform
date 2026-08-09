// src/app/(dashboard)/my-tasks/notesActions.ts
// جهة العضو: ملاحظات المدير الموجّهة له + ملاحظاته الشخصية.
'use server';

import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');
  return { supabase, userId: user.id };
}

function fullName(first: string | null, last: string | null): string {
  return `${first ?? ''} ${last ?? ''}`.trim() || '—';
}

/* ═══════════════════════════════════════════════════════════════
   ملاحظات المدير (قراءة + تعليق فقط — العضو ما بيكتب ملاحظات لحاله)
   ═══════════════════════════════════════════════════════════════ */

export type NotePriority = 'low' | 'medium' | 'high';

export type MemberCommentDTO = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type MemberDirectorNoteDTO = {
  id: string;
  title: string;
  content: string;
  priority: NotePriority;
  isRead: boolean;
  readAt: string | null;
  comments: MemberCommentDTO[];
  createdAt: string;
};

type ReplyRow = {
  id: string;
  author_id: string | null;
  text: string;
  created_at: string;
  author: { first_name: string | null; last_name: string | null } | null;
};

type NoteRow = {
  id: string;
  title: string;
  text: string;
  priority: NotePriority;
  member_read_at: string | null;
  created_at: string;
  note_replies: ReplyRow[];
};

const SELECT_NOTES = `
  id, title, text, priority, member_read_at, created_at,
  note_replies (
    id, author_id, text, created_at,
    author:profiles!note_replies_author_id_fkey ( first_name, last_name )
  )
`;

export async function listMyDirectorNotes(): Promise<MemberDirectorNoteDTO[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from('director_notes')
    .select(SELECT_NOTES)
    .eq('member_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('notes_fetch_failed');

  return (data ?? []).map((raw) => {
    const row = raw as unknown as NoteRow;
    return {
      id: row.id,
      title: row.title,
      content: row.text,
      priority: row.priority,
      // القراءة مشتقة من الطابع الزمني — ما في علم منفصل يقدر يتناقض معه
      isRead: row.member_read_at !== null,
      readAt: row.member_read_at,
      createdAt: row.created_at,
      comments: [...(row.note_replies ?? [])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((r) => ({
          id: r.id,
          authorId: r.author_id ?? '',
          authorName: fullName(r.author?.first_name ?? null, r.author?.last_name ?? null),
          text: r.text,
          createdAt: r.created_at,
        })),
    };
  });
}

/**
 * فتح الملاحظة هو اللي بيعلّمها مقروءة.
 * بيرجّع `readAt` من السيرفر لأن ساعة العضو ممكن تكون غلط، وهالقيمة
 * بتُعرض للمدير. أول قراءة نهائية — trigger بالداتابيز بيمنع الكتابة فوقها.
 *
 * ⚠️ ما في revalidatePath هون بقصد: MyTasksClient.tsx بيحدّث الـ state
 * المحلي optimistically فور الاستدعاء، فأي revalidate لنفس الصفحة كان
 * بيعمل إعادة جلب مكرر بالخلفية بلا أي فايدة بصرية — راجع القرار
 * المعماري "Optimistic UI never uses revalidatePath where state is
 * managed client-side".
 */
export async function markDirectorNoteRead(noteId: string): Promise<{ readAt: string }> {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc('mark_note_seen', { p_note_id: noteId });
  if (error) throw new Error('mark_read_failed');

  const { data } = await supabase
    .from('director_notes')
    .select('member_read_at')
    .eq('id', noteId)
    .single();

  return { readAt: data?.member_read_at ?? new Date().toISOString() };
}

export async function addMyComment(noteId: string, text: string): Promise<MemberCommentDTO> {
  const { supabase, userId } = await requireUser();

  const body = text.trim();
  if (!body) throw new Error('invalid_input');
  if (body.length > 2000) throw new Error('text_too_long');

  // author_role بيتحدد بـ trigger (author_id = member_id ⇒ member)
  const { data, error } = await supabase
    .from('note_replies')
    .insert({ note_id: noteId, author_id: userId, text: body })
    .select('id, author_id, text, created_at')
    .single();

  if (error || !data) throw new Error('comment_failed');

  return {
    id: data.id,
    authorId: data.author_id ?? userId,
    authorName: '', // الواجهة بتعرض "أنت"
    text: data.text,
    createdAt: data.created_at,
  };
}

/* ═══════════════════════════════════════════════════════════════
   الملاحظات الشخصية — خاصة تمامًا، ولا أدمن بيشوفها (RLS مايجريشن 009)
   ═══════════════════════════════════════════════════════════════ */

export type MemberNoteDTO = {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

type MemberNoteRow = {
  id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
};

function toMemberNote(row: MemberNoteRow): MemberNoteDTO {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const NOTE_COLUMNS = 'id, title, content, color, created_at, updated_at';

export async function listMyNotes(): Promise<MemberNoteDTO[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from('member_notes')
    .select(NOTE_COLUMNS)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error('notes_fetch_failed');
  return (data ?? []).map((r) => toMemberNote(r as MemberNoteRow));
}

export async function createMyNote(input: {
  title: string;
  content: string;
  color: string;
}): Promise<MemberNoteDTO> {
  const { supabase, userId } = await requireUser();

  const title = input.title.trim();
  if (!title) throw new Error('invalid_input');
  if (title.length > 120) throw new Error('title_too_long');
  if (input.content.length > 10000) throw new Error('content_too_long');

  const { data, error } = await supabase
    .from('member_notes')
    .insert({ owner_id: userId, title, content: input.content, color: input.color })
    .select(NOTE_COLUMNS)
    .single();

  if (error || !data) throw new Error('note_create_failed');

  return toMemberNote(data as MemberNoteRow);
}

export async function updateMyNote(
  noteId: string,
  input: { title: string; content: string; color: string }
): Promise<MemberNoteDTO> {
  const { supabase, userId } = await requireUser();

  const title = input.title.trim();
  if (!title) throw new Error('invalid_input');

  const { data, error } = await supabase
    .from('member_notes')
    .update({ title, content: input.content, color: input.color })
    .eq('id', noteId)
    .eq('owner_id', userId) // حارس صريح فوق الـ RLS
    .select(NOTE_COLUMNS)
    .single();

  if (error || !data) throw new Error('note_update_failed');

  return toMemberNote(data as MemberNoteRow);
}

export async function deleteMyNote(noteId: string) {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from('member_notes')
    .delete()
    .eq('id', noteId)
    .eq('owner_id', userId);

  if (error) throw new Error('note_delete_failed');
}