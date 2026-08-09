// src/app/(dashboard)/my-tasks/MyTasksClient.tsx
'use client';

import { useCallback, useState } from 'react';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import MyTasksHero from '@/components/dashboard/my-tasks/MyTasksHero';
import PersonalCalendar from '@/components/dashboard/my-tasks/PersonalCalendar';
import MyNotes from '@/components/dashboard/my-tasks/MyNotes';
import DirectorNotes from '@/components/dashboard/my-tasks/DirectorNotes';
import type { Task } from '@/lib/taskStats';
import { submitTask, cancelSubmission } from './taskSubmissionActions';
import {
  markDirectorNoteRead,
  addMyComment,
  createMyNote,
  updateMyNote,
  deleteMyNote,
  type MemberDirectorNoteDTO,
  type MemberNoteDTO,
} from './notesActions';

type NoteInput = { title: string; content: string; color: string };

/*
  ⚠️ ليش `clientKey`:

  الصف المتفائل بينضاف بـ id مؤقت، وأول ما يرجع السيرفر منستبدله بالـ id
  الحقيقي. لو استعملنا الـ id كـ React key، بيتغيّر المفتاح → React بيفكّ
  العنصر ويركّب واحد جديد → AnimatePresence بيعيد أنيميشن الدخول، فالمستخدم
  بيشوف الملاحظة بتنضاف مرتين.

  الحل: مفتاح محلي بينولد مرة وحدة وبيضل ثابت مهما تغيّر الـ id. الـ id
  الحقيقي بيضل هو المستعمل بكل استدعاءات السيرفر.
*/
export type WithKey<T> = T & { clientKey: string };

let keyCounter = 0;
function nextKey(prefix: string) {
  keyCounter += 1;
  return `${prefix}_${keyCounter}`;
}

function withKeys<T extends { id: string }>(rows: T[]): WithKey<T>[] {
  return rows.map((r) => ({ ...r, clientKey: r.id }));
}

export default function MyTasksClient({
  initialTasks,
  initialDirectorNotes,
  initialMyNotes,
  userId,
  name,
  nameAr,
  hue,
  sat,
  accentColor,
}: {
  initialTasks: Task[];
  initialDirectorNotes: MemberDirectorNoteDTO[];
  initialMyNotes: MemberNoteDTO[];
  userId: string;
  name: string;
  nameAr?: string;
  hue: number;
  sat: number;
  accentColor: string;
}) {
  /*
    الحالة مرفوعة هون لأن Today Focus والكاليندر بيقرأوا نفس المصفوفة:
    تسليم تاسك لازم ينقص عدّاد OPEN ويزيد "قيد المراجعة" بنفس اللحظة اللي
    البار بيتغيّر فيها.
  */
  const [tasks, setTasks] = useState(initialTasks);
  const [directorNotes, setDirectorNotes] = useState(() => withKeys(initialDirectorNotes));
  const [myNotes, setMyNotes] = useState(() => withKeys(initialMyNotes));

  /*
    إشعار تاسك جديدة بيودّي لـ `/my-tasks#task-<id>`. الـ hook بيدوّر
    على id مطابق بالـ DOM ويسكرول له ويوهّجه.

    ⚠️ حد معروف: PersonalCalendar بيعرض أسبوع واحد بس افتراضيًا. لو
    التاسك المقصودة برّا الأسبوع المعروض حاليًا، الـ id ما بيكون
    موجود بالـ DOM لحظة الوصول فما يصير سكرول — بس هذا safe no-op
    مش خطأ، والعضو لسا بيقدر يلاقي التاسك يدويًا بالكاليندر.
  */
  useScrollToHash([tasks]);

  // =========================================================
  // Tasks
  // =========================================================
  /*
    ⚠️ تغيير جوهري عن النسخة القديمة: هاي مش توغل open⇄done مباشر بعد
    اليوم — العضو ما عاد يقدر يحط تاسك 'done' بنفسه أبدًا (الـ trigger
    بالداتابيز بيرفضها لو حاول). الضغطة نفسها (checkbox بالكاليندر) بقيت
    موجودة، بس معناها تغيّر:
      - open            → تسليم بدون نص (pending_review). لو العضو بده
                          يكتب نص تسليم، لازم يفتح تفاصيل التاسك
                          (/my-tasks/[taskId]) مش من هون.
      - pending_review   → إلغاء التسليم (يرجع open).
      - done             → لا شي. القرار خلص، ما بينلمس من هالمسار.
  */
  const handleToggleTask = useCallback((taskId: string) => {
    let previous: Task | undefined;
    let action: 'submit' | 'cancel' | null = null;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        previous = t;

        if (t.status === 'open') {
          action = 'submit';
          return {
            ...t,
            status: 'pending_review',
            submittedAt: new Date().toISOString(),
            submittedNote: null,
          };
        }

        if (t.status === 'pending_review') {
          action = 'cancel';
          return {
            ...t,
            status: 'open',
            submittedAt: null,
            submittedNote: null,
            completedAt: null,
          };
        }

        // done — ما في تغيير، القرار نهائي من هالمسار
        action = null;
        return t;
      })
    );

    if (!action) return;

    const request = action === 'submit' ? submitTask(taskId, null) : cancelSubmission(taskId);

    void request.catch(() => {
      setTasks((prev) => prev.map((t) => (t.id === taskId && previous ? previous : t)));
    });
  }, []);

  // =========================================================
  // Director Notes — قراءة وتعليق فقط
  // =========================================================
  const handleMarkRead = useCallback((noteId: string) => {
    const optimisticAt = new Date().toISOString();

    setDirectorNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isRead: true, readAt: optimisticAt } : n))
    );

    void markDirectorNoteRead(noteId)
      .then(({ readAt }) => {
        // الطابع الزمني المعتمد بيجي من السيرفر — ساعة العضو ممكن تكون غلط،
        // وهالقيمة بتُعرض للمدير
        setDirectorNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, readAt } : n)));
      })
      .catch(() => {
        // تراجع عشان العدّاد يضل صادق
        setDirectorNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, isRead: false, readAt: null } : n))
        );
      });
  }, []);

  const handleAddComment = useCallback((noteId: string, text: string) => {
    const optimisticId = nextKey('comment_tmp');
    const now = new Date().toISOString();

    setDirectorNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              comments: [
                ...n.comments,
                { id: optimisticId, authorId: userId, authorName: '', text: text.trim(), createdAt: now },
              ],
            }
          : n
      )
    );

    void addMyComment(noteId, text)
      .then((saved) => {
        setDirectorNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  // الـ id المؤقت بيضل هو المفتاح، وبس البيانات بتتحدث
                  comments: n.comments.map((c) =>
                    c.id === optimisticId ? { ...saved, id: optimisticId } : c
                  ),
                }
              : n
          )
        );
      })
      .catch(() => {
        setDirectorNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, comments: n.comments.filter((c) => c.id !== optimisticId) }
              : n
          )
        );
      });
  }, [userId]);

  // =========================================================
  // My Notes — خاصة تمامًا (RLS مايجريشن 009)
  // =========================================================
  const handleCreateNote = useCallback((data: NoteInput) => {
    const clientKey = nextKey('note_tmp');
    const now = new Date().toISOString();

    setMyNotes((prev) => [
      {
        id: clientKey, // مؤقت لحد ما يرجع السيرفر
        clientKey,
        title: data.title.trim(),
        content: data.content,
        color: data.color,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);

    void createMyNote(data)
      .then((saved) => {
        // الـ id بيتحدث للحقيقي، بس clientKey بيضل ثابت فما في إعادة أنيميشن
        setMyNotes((prev) =>
          prev.map((n) => (n.clientKey === clientKey ? { ...saved, clientKey } : n))
        );
      })
      .catch(() => {
        setMyNotes((prev) => prev.filter((n) => n.clientKey !== clientKey));
      });
  }, []);

  const handleUpdateNote = useCallback((id: string, data: NoteInput) => {
    let previous: WithKey<MemberNoteDTO> | undefined;

    setMyNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        previous = n;
        return { ...n, ...data, title: data.title.trim(), updatedAt: new Date().toISOString() };
      })
    );

    void updateMyNote(id, data)
      .then((saved) => {
        setMyNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...saved, clientKey: n.clientKey } : n))
        );
      })
      .catch(() => {
        setMyNotes((prev) => prev.map((n) => (n.id === id && previous ? previous : n)));
      });
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    let removed: WithKey<MemberNoteDTO> | undefined;
    let index = -1;

    setMyNotes((prev) => {
      index = prev.findIndex((n) => n.id === id);
      removed = prev[index];
      return prev.filter((n) => n.id !== id);
    });

    void deleteMyNote(id).catch(() => {
      // رجّع الملاحظة لمكانها الأصلي مش لآخر القائمة
      setMyNotes((prev) => {
        if (!removed) return prev;
        const next = [...prev];
        next.splice(Math.max(index, 0), 0, removed);
        return next;
      });
    });
  }, []);

  return (
    <>
      <MyTasksHero tasks={tasks} name={name} nameAr={nameAr} hue={hue} sat={sat} />

      <section>
        <PersonalCalendar tasks={tasks} accentColor={accentColor} onToggleTask={handleToggleTask} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyNotes
          notes={myNotes}
          onCreate={handleCreateNote}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
        />
        <DirectorNotes
          notes={directorNotes}
          onMarkRead={handleMarkRead}
          onAddComment={handleAddComment}
        />
      </section>
    </>
  );
}