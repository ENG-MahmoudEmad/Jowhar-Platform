// src/app/(dashboard)/adminControl/AdminControlClient.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import { createClient } from '@/lib/supabase/client';
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
// approveTask/rejectTask نفس الدوال المستخدمة بصفحة /my-tasks/[taskId] —
// منطق واحد لقرار الأدمن بغض النظر من وين استُدعي.
import { approveTask, rejectTask, revertApproval } from '../my-tasks/taskSubmissionActions';
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
  initialBadgesByMember,
}: {
  initialPending: PendingRequest[];
  initialMembers: Member[];
  registry: PermissionDef[];
  grantedByMember: Record<string, string[]>;
  /** تاسكات قيد المراجعة + ردود ملاحظات جديدة لكل عضو — memberId → عدد (قيمة ابتدائية، بعدها Realtime بيحدّثها) */
  initialBadgesByMember: Record<string, number>;
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
  const [badgesByMember, setBadgesByMember] = useState(initialBadgesByMember);
  const { user: currentUser } = useCurrentUser();

  /*
    ⚠️ Realtime للبادجات: بدل ما نحسب delta يدويًا لكل نوع تغيير (تعقيد
    عالي، عرضة للأخطاء — مثلاً رد جديد بجدول note_replies ما فيه member_id
    مباشرة، لازم نرجع نربطه بـdirector_notes)، أبسط وأوثق حل إننا نعيد
    نداء get_admin_member_badges() (نفس RPC المستخدم بالسيرفر) كل ما يصير
    تغيير محتمل، مع debounce بسيط يمنع نداءات متكررة لو صار كم تغيير
    بثانية وحدة (مثلاً موافقة + رفض قريبين من بعض).
  */
  const badgesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshBadges = useCallback(() => {
    if (badgesDebounceRef.current) clearTimeout(badgesDebounceRef.current);
    badgesDebounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('get_admin_member_badges');
      const next: Record<string, number> = {};
      for (const row of data ?? []) {
        next[row.member_id] = row.badge_count;
      }
      setBadgesByMember(next);
    }, 400);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    /*
      نسمع تغييرات على tasks (status) وnote_replies (رد جديد) — أي حدث
      بهالجدولين ممكن يأثر على البادجات، فبنعيد الحساب كامل بدل ما نحاول
      نحدد بدقة إذا كان التغيير يخصّ الأدمن الحالي (RLS أصلاً بتصفّي
      الـpayload الوارد، وget_admin_member_badges بتطبّق نفس قواعد
      الصلاحية اللي بتحكم الموافقة/الرفض).
    */
    const channel = supabase
      .channel('admin-control-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refreshBadges)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'note_replies' }, refreshBadges)
      .subscribe();

    return () => {
      if (badgesDebounceRef.current) clearTimeout(badgesDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [refreshBadges]);

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
      submittedNote: null,
      submittedAt: null,
      lastRejectionNote: null,
      rejectionSeenAt: null,
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

  /*
    موافقة/رفض — نفس نمط باقي الأكشنز هون بالضبط (متفائل + تراجع لو فشل).
    approveTask/rejectTask جايين من my-tasks/taskSubmissionActions.ts —
    نفس الدوال بالضبط اللي بتستخدمها صفحة تفاصيل التاسك تبع العضو، فقرار
    "مين يقدر يوافق/يرفض" محسوم بمكان واحد (assertCanReview جوا الملف نفسه)
    بغض النظر منين استُدعي.
  */
  const handleApprove = useCallback((taskId: string) => {
    let previous: TaskDTO | undefined;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        previous = t;
        return { ...t, status: 'done', completedAt: t.submittedAt ?? new Date().toISOString() };
      })
    );

    void approveTask(taskId).catch(() => {
      setTasks((prev) => prev.map((t) => (t.id === taskId && previous ? previous : t)));
    });
  }, []);

  const handleReject = useCallback((taskId: string, reason: string) => {
    let previous: TaskDTO | undefined;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        previous = t;
        return {
          ...t,
          status: 'open',
          completedAt: null,
          submittedAt: null,
          submittedNote: null,
          lastRejectionNote: reason,
          rejectionSeenAt: null,
        };
      })
    );

    void rejectTask(taskId, reason).catch(() => {
      setTasks((prev) => prev.map((t) => (t.id === taskId && previous ? previous : t)));
    });
  }, []);

  /** تراجع عن موافقة سابقة (done → open) — لضغطة "صح" بالغلط */
  const handleRevertApproval = useCallback((taskId: string) => {
    let previous: TaskDTO | undefined;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        previous = t;
        return { ...t, status: 'open', completedAt: null, submittedAt: null, submittedNote: null };
      })
    );

    void revertApproval(taskId).catch(() => {
      setTasks((prev) => prev.map((t) => (t.id === taskId && previous ? previous : t)));
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
        badgesByMember={badgesByMember}
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
              onApprove={handleApprove}
              onReject={handleReject}
              onRevertApproval={handleRevertApproval}
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