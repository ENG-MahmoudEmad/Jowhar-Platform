// src/app/(dashboard)/adminControl/AdminControlClient.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import { canEditRoles, canManage, type Actor } from '@/lib/permissions/hierarchy';
import MembersControl, {
  type PendingRequest,
  type Member,
} from '@/components/dashboard/adminControl/MembersControl';
import AddTask from '@/components/dashboard/adminControl/AddTask';
import DirectorNotes from '@/components/dashboard/adminControl/DirectorNotes';
import RolesPermissions, {
  type PermissionDef,
} from '@/components/dashboard/adminControl/RolesPermissions';
import ViewFullProfileButton from '@/components/dashboard/adminControl/ViewFullProfileButton';
import {
  listMemberTasks,
  createTask,
  deleteTask,
  type TaskDTO,
  type TaskInput,
} from './tasksActions';
import {
  listMemberNotes,
  createNote,
  addNoteReply,
  deleteNote,
  markNoteSeen,
  type DirectorNoteDTO,
  type NotePriority,
} from './notesActions';

/** معرّف مؤقت للصف المتفائل، بينستبدل بالحقيقي لما يرجع السيرفر. */
function tempId(prefix: string) {
  return `${prefix}_tmp_${Date.now()}`;
}

export default function AdminControlClient({
  initialPending,
  initialMembers,
  registry,
  grantedByMember,
}: {
  initialPending: PendingRequest[];
  initialMembers: Member[];
  registry: PermissionDef[];
  grantedByMember: Record<string, string[]>;
}) {
  /*
    الحالة مرفوعة هون (مصدر واحد للحقيقة على مستوى الصفحة) عشان تغيير الدور
    من كومبوننت Roles & Permissions ينعكس فورًا على بادچ العضو بالقائمة،
    بدون انتظار السيرفر ولا إعادة جلب الصفحة.
    الـ props بتشتغل كقيمة ابتدائية فقط — بعدها الواجهة تدير حالتها بنفسها،
    والسيرفر يتزامن بالخلفية عبر الـ Server Actions.
  */
  const [pending, setPending] = useState(initialPending);
  const [members, setMembers] = useState(initialMembers);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { user: currentUser } = useCurrentUser();

  /*
    إشعار "رد على ملاحظة" (جهة الأدمن) بيودّي لـ
    `/adminControl?member=<id>#note-<id>`. بدون هالسطر، الأدمن بيوصل
    الصفحة وقدامه قائمة الأعضاء بس — لازم نختار العضو تلقائيًا قبل
    أي محاولة سكرول، وإلا كارد الملاحظات أصلاً مش موجود بالـ DOM.
  */
  const searchParams = useSearchParams();
  useEffect(() => {
    const memberParam = searchParams.get('member');
    if (memberParam) setSelectedMemberId(memberParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    تاسكات وملاحظات العضو المختار.
    بتُجلب عند الاختيار مش مع تحميل الصفحة — الصفحة فيها كل الأعضاء، فجلب
    بيانات الجميع مسبقًا هدر واضح لطلبات ما رح تُستعمل أغلبها.
  */
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [notes, setNotes] = useState<DirectorNoteDTO[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  useEffect(() => {
    if (!selectedMemberId) {
      setTasks([]);
      setNotes([]);
      return;
    }

    /*
      حارس ضد سباق الطلبات: لو المستخدم بدّل العضو قبل ما يرجع الرد، الرد
      القديم لازم ينتجاهل — وإلا بتظهر تاسكات عضو تحت اسم عضو تاني.
    */
    let active = true;

    setTasksLoading(true);
    setNotesLoading(true);

    listMemberTasks(selectedMemberId)
      .then((rows) => { if (active) setTasks(rows); })
      .catch(() => { if (active) setTasks([]); })
      .finally(() => { if (active) setTasksLoading(false); });

    listMemberNotes(selectedMemberId)
      .then((rows) => { if (active) setNotes(rows); })
      .catch(() => { if (active) setNotes([]); })
      .finally(() => { if (active) setNotesLoading(false); });

    return () => { active = false; };
  }, [selectedMemberId]);

  /*
    بعد ما `?member=` (لو موجود) يختار العضو ويجيب تاسكاته/ملاحظاته،
    بندوّر على الـ hash. بدون الانتظار لـ notes/tasks، محاولة السكرول
    كانت رح تصير قبل ما العنصر ينرسم بالـ DOM أصلاً.

    غير مرتبط بعضو (زي `#pending-approvals`) بيشتغل من أول تحميل، لأن
    القسم موجود بالصفحة دايمًا بغض النظر عن أي عضو مختار.
  */
  useScrollToHash([tasks, notes]);

  const actor: Actor | null = currentUser
    ? {
        id: currentUser.id,
        isDeveloper: currentUser.isDeveloper,
        isChief: currentUser.isChief,
        accessRole: currentUser.accessRole,
      }
    : null;

  /*
    قسم الأدوار والصلاحيات بيظهر فقط لو الشخص فعلاً بيقدر يعدّل على هذا العضو
    تحديدًا (مفروض بالسيرفر كمان بـ rolesActions). عرضه لمين ما بيقدر بيكون
    تحكّم معطّل بالنتيجة — إخفاؤه أوضح من إظهار خيارات بترجع رسالة رفض.
  */
  const showRolesPanel =
    actor && selectedMember
      ? canEditRoles(actor) &&
        canManage(actor, {
          id: selectedMember.id,
          isDeveloper: selectedMember.isDeveloper,
          isChief: selectedMember.isChief,
          accessRole: selectedMember.role,
        })
      : false;

  const handleRoleChanged = useCallback((memberId: string, role: 'member' | 'admin') => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              role,
              // المسمّى الوظيفي المخصص يبقى كما هو؛ الافتراضي بس هو اللي يتبدّل
              roleLabel: m.roleLabel === 'Admin' || m.roleLabel === 'Member'
                ? (role === 'admin' ? 'Admin' : 'Member')
                : m.roleLabel,
              roleLabelAr: m.roleLabelAr === 'أدمن' || m.roleLabelAr === 'عضو'
                ? (role === 'admin' ? 'أدمن' : 'عضو')
                : m.roleLabelAr,
            }
          : m
      )
    );
  }, []);

  // =========================================================
  // Tasks — تحديث فوري + حفظ بالخلفية + تراجع لو فشل
  // =========================================================
  const handleCreateTask = useCallback((memberId: string, values: TaskInput) => {
    const optimisticId = tempId('task');

    const optimistic: TaskDTO = {
      id: optimisticId,
      title: values.title.trim(),
      description: values.description.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      priority: values.priority,
      status: values.status === 'done' ? 'done' : 'open',
      assignedTo: memberId,
      createdBy: currentUser?.id ?? null,
      createdByName: '', // '' = أنا
      canDelete: true,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [optimistic, ...prev]);

    void createTask(memberId, values)
      .then((saved) => {
        // استبدال الصف المؤقت بالحقيقي (بالـ id اللي ولّدته الداتابيز)
        setTasks((prev) => prev.map((t) => (t.id === optimisticId ? saved : t)));
      })
      .catch(() => {
        setTasks((prev) => prev.filter((t) => t.id !== optimisticId));
      });
  }, [currentUser?.id]);

  const handleDeleteTask = useCallback((taskId: string) => {
    let removed: TaskDTO | undefined;
    let index = -1;

    setTasks((prev) => {
      index = prev.findIndex((t) => t.id === taskId);
      removed = prev[index];
      return prev.filter((t) => t.id !== taskId);
    });

    void deleteTask(taskId).catch(() => {
      // رجّع الصف لمكانه الأصلي مش لآخر القائمة
      setTasks((prev) => {
        if (!removed) return prev;
        const next = [...prev];
        next.splice(Math.max(index, 0), 0, removed);
        return next;
      });
    });
  }, []);

  // =========================================================
  // Director Notes
  // =========================================================
  const handleCreateNote = useCallback(
    (memberId: string, input: { title: string; text: string; priority: NotePriority }) => {
      const optimisticId = tempId('note');
      const now = new Date().toISOString();

      const optimistic: DirectorNoteDTO = {
        id: optimisticId,
        title: input.title.trim(),
        text: input.text.trim(),
        priority: input.priority,
        createdAt: now,
        replies: [],
        // كاتب الملاحظة شافها بالتعريف
        directorLastSeenAt: now,
        memberReadAt: null,
      };

      setNotes((prev) => [optimistic, ...prev]);

      void createNote(memberId, input)
        .then((saved) => {
          setNotes((prev) => prev.map((n) => (n.id === optimisticId ? saved : n)));
        })
        .catch(() => {
          setNotes((prev) => prev.filter((n) => n.id !== optimisticId));
        });
    },
    []
  );

  const handleAddReply = useCallback((noteId: string, text: string) => {
    const optimisticId = tempId('reply');
    const now = new Date().toISOString();

    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              directorLastSeenAt: now,
              replies: [
                ...n.replies,
                {
                  id: optimisticId,
                  authorId: currentUser?.id ?? '',
                  authorName: '',
                  authorRole: 'director' as const,
                  text: text.trim(),
                  createdAt: now,
                },
              ],
            }
          : n
      )
    );

    void addNoteReply(noteId, text)
      .then((saved) => {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, replies: n.replies.map((r) => (r.id === optimisticId ? saved : r)) }
              : n
          )
        );
      })
      .catch(() => {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, replies: n.replies.filter((r) => r.id !== optimisticId) }
              : n
          )
        );
      });
  }, [currentUser?.id]);

  const handleDeleteNote = useCallback((noteId: string) => {
    let removed: DirectorNoteDTO | undefined;
    let index = -1;

    setNotes((prev) => {
      index = prev.findIndex((n) => n.id === noteId);
      removed = prev[index];
      return prev.filter((n) => n.id !== noteId);
    });

    void deleteNote(noteId).catch(() => {
      setNotes((prev) => {
        if (!removed) return prev;
        const next = [...prev];
        next.splice(Math.max(index, 0), 0, removed);
        return next;
      });
    });
  }, []);

  const handleMarkSeen = useCallback((noteId: string) => {
    const now = new Date().toISOString();

    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, directorLastSeenAt: now } : n))
    );

    /*
      الصفوف المؤقتة لسا ما إلها id بالداتابيز، وتعليمها كمقروءة بلا معنى أصلاً
      (إنت اللي كاتبها للتو).
    */
    if (noteId.includes('_tmp_')) return;

    // فشل التعليم كمقروء مش مستاهل تراجع بصري — أسوأ حالة البادچ بيرجع بعد ريفرش
    void markNoteSeen(noteId).catch(() => {});
  }, []);

  return (
    <>
      <MembersControl
        pending={pending}
        members={members}
        onPendingChange={setPending}
        onMembersChange={setMembers}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
      />

      {selectedMember && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--background-alt)] px-4 py-2.5">
            <p className="text-xs font-medium text-[var(--foreground-muted)]">
              Managing: <span className="font-bold text-[var(--foreground)]">{selectedMember.name}</span>
            </p>
            <button
              type="button"
              onClick={() => setSelectedMemberId(null)}
              className="cursor-pointer rounded-lg p-1 text-[var(--foreground-muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/*
            key={id} بيعيد بناء الكومبوننتات عند تبديل العضو، فتبدأ بحالة نظيفة
            (مسوّدات فاضية، ما في محادثة مفتوحة) — وهذا بيغني عن أي useEffect
            للمزامنة جواها.
          */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AddTask
              key={`tasks-${selectedMember.id}`}
              memberId={selectedMember.id}
              tasks={tasks}
              loading={tasksLoading}
              onCreate={handleCreateTask}
              onDelete={handleDeleteTask}
            />
            <DirectorNotes
              key={`notes-${selectedMember.id}`}
              memberId={selectedMember.id}
              notes={notes}
              loading={notesLoading}
              onCreateNote={handleCreateNote}
              onAddReply={handleAddReply}
              onDeleteNote={handleDeleteNote}
              onMarkSeen={handleMarkSeen}
            />
          </div>

          {showRolesPanel && (
            <RolesPermissions
              key={selectedMember.id}
              memberId={selectedMember.id}
              isChief={selectedMember.isChief}
              registry={registry}
              initialRole={selectedMember.role}
              initialPermissions={grantedByMember[selectedMember.id] ?? []}
              onRoleChanged={handleRoleChanged}
            />
          )}

          <ViewFullProfileButton memberId={selectedMember.id} />
        </>
      )}
    </>
  );
}