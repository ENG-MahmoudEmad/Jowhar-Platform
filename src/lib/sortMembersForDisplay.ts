// src/lib/sortMembersForDisplay.ts
//
// قاعدة الترتيب المشتركة: المستخدم الحالي دايمًا أول، والباقي أبجديًا
// بالاسم. مستخدمة بـ TeamProgress وProjectCalendar — مصدر واحد للحقيقة
// عشان الترتيبين ما يختلفوش أبدًا.

interface SortableMember {
  id: string;
  name: string;
}

export function sortMembersForDisplay<T extends SortableMember>(
  members: T[],
  currentUserId: string,
  limit?: number,
): T[] {
  const current = members.filter((m) => m.id === currentUserId);
  const others = members
    .filter((m) => m.id !== currentUserId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const ordered = [...current, ...others];
  return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
}