// src/lib/permissions/hierarchy.ts
// قواعد Actor × Target بمكان واحد — تُستورد من السيرفر (Server Actions)
// ومن الواجهة، فما يصير انحراف بين اللي بيُعرض واللي بيُسمح فعليًا.

export type Actor = {
  id: string;
  isDeveloper: boolean;
  isChief: boolean;
  accessRole: 'member' | 'admin';
};

export type Target = {
  id: string;
  isDeveloper: boolean;
  isChief: boolean;
  accessRole: 'member' | 'admin';
};

/**
 * التسلسل:
 *   Developer > Chief > Admin ثانوي > Member
 *
 * Developer: يدير أي حد — ما عدا الـ Chief (ما بيوقفه ولا يغيّر دوره/صلاحياته)
 *            وما عدا developer تاني وما عدا نفسه.
 * Chief:     يدير أي حد ما عدا نفسه وما عدا الـ Developer.
 * Admin:     الأعضاء العاديين بس.
 * Member:    لا شيء.
 */
export function canManage(actor: Actor, target: Target): boolean {
  if (actor.id === target.id) return false;          // محدش يدير نفسه
  if (target.isDeveloper) return false;              // الـ Developer ما بينداره
  if (target.isChief) return false;                  // الـ Chief ما بينداره — حتى من Developer

  if (actor.isDeveloper) return true;
  if (actor.isChief) return true;
  if (actor.accessRole === 'admin') return target.accessRole !== 'admin';

  return false;
}

/**
 * فتح تفاصيل العضو (Add Task / Director Notes) أوسع من الإدارة:
 * - أي حد يقدر يفتح صفه (يضيف لنفسه تاسكات)
 * - Developer و Chief يقدروا يفتحوا أي حد (بما فيهم بعض) — إضافة تاسكة
 *   أو ملاحظة مش تدخّل بالصلاحيات
 * - Admin ثانوي: الأعضاء العاديين بس
 */
export function canOpen(actor: Actor, target: Target): boolean {
  if (actor.id === target.id) return true;
  if (actor.isDeveloper || actor.isChief) return true;
  if (actor.accessRole === 'admin') return !target.isChief && !target.isDeveloper && target.accessRole !== 'admin';
  return false;
}

/** تغيير الأدوار ومنح الصلاحيات — حصري للـ Chief والـ Developer */
export function canEditRoles(actor: Actor): boolean {
  return actor.isDeveloper || actor.isChief;
}

/** الوصول لصفحة Admin Control نفسها */
export function canAccessAdminControl(actor: {
  isDeveloper: boolean;
  isChief: boolean;
  accessRole: string;
}): boolean {
  return actor.isDeveloper || actor.isChief || actor.accessRole === 'admin';
}