// src/app/(dashboard)/archive/actions.ts
'use server';

import {
  requireArchiveActor,
  canCreatePlatform,
  canManageArchivePlatform,
  canManageArchiveByWork,
  canDeleteArchive,
} from './guards';
import { hasCapability } from '@/app/(dashboard)/adminControl/guards';

// ⚠️ عن قصد: ما في revalidatePath هون. PlatformGrid.tsx بيدير الحالة
// بنفسه Optimistic UI (setPlatforms) — نفس قاعدة الداشبورد المعمول فيها
// بكل مكان تاني بالمشروع.

export type PlatformActionPayload = {
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  color: string;
  thumbnail?: string;
};

export type PlatformRow = {
  dbId: string;         // uuid — للتحديث/الحذف
  id: string;            // slug — للراوتينج بالفرونت إند
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  thumbnail?: string;
  color: string;
  folderCount: number;
  fileCount: number;
  locked: boolean;
  canEdit: boolean;
};

function slugify(nameEn: string): string {
  return nameEn.trim().toLowerCase().replace(/\s+/g, '-');
}

export async function addPlatformAction(
  payload: PlatformActionPayload
): Promise<PlatformRow> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canCreatePlatform(supabase, actor))) {
    throw new Error('forbidden');
  }

  const slug = slugify(payload.nameEn);

  const { data, error } = await supabase
    .from('platforms')
    .insert({
      name_en: payload.nameEn,
      name_ar: payload.nameAr,
      description_en: payload.description,
      description_ar: payload.descriptionAr,
      color: payload.color,
      thumbnail_url: payload.thumbnail ?? null,
      slug,
    })
    .select('id, slug, name_en, name_ar, description_en, description_ar, color, thumbnail_url')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'insert_failed');

  return {
    dbId: data.id,
    id: data.slug,
    nameEn: data.name_en,
    nameAr: data.name_ar,
    description: data.description_en ?? '',
    descriptionAr: data.description_ar ?? '',
    thumbnail: data.thumbnail_url ?? undefined,
    color: data.color,
    folderCount: 0,
    fileCount: 0,
    locked: false,
    canEdit: true, // اللي بينشئها أكيد عنده صلاحية التعديل عليها لحظتها
  };
}

export async function updatePlatformAction(
  platformDbId: string,
  updates: PlatformActionPayload
): Promise<void> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchivePlatform(supabase, actor, platformDbId))) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('platforms')
    .update({
      name_en: updates.nameEn,
      name_ar: updates.nameAr,
      description_en: updates.description,
      description_ar: updates.descriptionAr,
      color: updates.color,
      thumbnail_url: updates.thumbnail ?? null,
      // ⚠️ الـ slug ما بيتغيّر بعد الإنشاء عن قصد — تغييره بيكسر أي رابط
      // محفوظ/مشارك سابقًا لهاي المنصة. لو لازم يتغيّر مستقبلًا، لازم يصير
      // بقرار منفصل مع تحويل (redirect) من الـ slug القديم.
    })
    .eq('id', platformDbId);

  if (error) throw new Error(error.message);
}

export async function deletePlatformAction(platformDbId: string): Promise<void> {
  const { actor, supabase } = await requireArchiveActor();

  if (!canDeleteArchive(actor)) throw new Error('forbidden');

  // بنستخدم الـ RPC (delete_platform) مش .delete() مباشرة — الدالة
  // بالداتابيز عندها فحص can_delete_archive() مستقل (دفاع بطبقتين:
  // فرونت إند + قاعدة بيانات)، ونفس النمط لباقي مستويات الحذف.
  const { error } = await supabase.rpc('delete_platform', {
    p_platform_id: platformDbId,
  });

  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   Work (Level 2)
   ══════════════════════════════════════════════════════════════════════ */

export type WorkActionPayload = {
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  thumbnail?: string;
};

export type WorkRow = {
  dbId:         string; // uuid
  id:           string; // slug
  platformId:   string; // uuid — الأب
  nameEn:       string;
  nameAr:       string;
  description:  string;
  descriptionAr: string;
  thumbnail?:   string;
  sectionCount: number;
  fileCount:    number;
};

function slugifyWork(nameEn: string): string {
  return nameEn.trim().toLowerCase().replace(/\s+/g, '-');
}

export async function addWorkAction(
  platformDbId: string,
  payload: WorkActionPayload
): Promise<WorkRow> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchivePlatform(supabase, actor, platformDbId))) {
    throw new Error('forbidden');
  }

  const slug = slugifyWork(payload.nameEn);

  const { data, error } = await supabase
    .from('works')
    .insert({
      platform_id:    platformDbId,
      name_en:        payload.nameEn,
      name_ar:        payload.nameAr,
      description_en: payload.description,
      description_ar: payload.descriptionAr,
      image_url:      payload.thumbnail ?? null,
      slug,
      created_by:     actor.id,
    })
    .select('id, platform_id, slug, name_en, name_ar, description_en, description_ar, image_url')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'insert_failed');

  return {
    dbId:          data.id,
    id:            data.slug,
    platformId:    data.platform_id,
    nameEn:        data.name_en,
    nameAr:        data.name_ar,
    description:   data.description_en ?? '',
    descriptionAr: data.description_ar ?? '',
    thumbnail:     data.image_url ?? undefined,
    sectionCount:  0,
    fileCount:     0,
  };
}

export async function updateWorkAction(
  workDbId: string,
  platformDbId: string,
  updates: WorkActionPayload
): Promise<void> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchivePlatform(supabase, actor, platformDbId))) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('works')
    .update({
      name_en:        updates.nameEn,
      name_ar:        updates.nameAr,
      description_en: updates.description,
      description_ar: updates.descriptionAr,
      image_url:      updates.thumbnail ?? null,
      // ⚠️ الـ slug ما بيتغيّر بعد الإنشاء عن قصد — نفس منطق platforms.
    })
    .eq('id', workDbId);

  if (error) throw new Error(error.message);
}

export async function deleteWorkAction(
  workDbId: string,
  _platformDbId: string
): Promise<void> {
  const { actor, supabase } = await requireArchiveActor();

  if (!canDeleteArchive(actor)) throw new Error('forbidden');

  const { error } = await supabase.rpc('delete_work', { p_work_id: workDbId });

  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   Section (Level 3)
   ══════════════════════════════════════════════════════════════════════ */

export type SectionActionPayload = {
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
};

export type SectionRow = {
  dbId:          string; // uuid — هو نفسه المستخدم بالراوت (ما في slug لهاي المستوى)
  id:            string; // = dbId، موجود بس عشان التوافق مع شكل الكومبوننت القديم
  workId:        string;
  nameEn:        string;
  nameAr:        string;
  description:   string;
  descriptionAr: string;
  itemCount:     number;
  icon:          string;
};

export async function addSectionAction(
  workDbId: string,
  payload: SectionActionPayload
): Promise<SectionRow> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchiveByWork(supabase, actor, workDbId))) {
    throw new Error('forbidden');
  }

  const { data, error } = await supabase
    .from('sections')
    .insert({
      work_id:        workDbId,
      name_en:        payload.nameEn,
      name_ar:        payload.nameAr,
      description_en: payload.description,
      description_ar: payload.descriptionAr,
      icon:           payload.icon,
      created_by:     actor.id,
    })
    .select('id, work_id, name_en, name_ar, description_en, description_ar, icon')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'insert_failed');

  return {
    dbId:          data.id,
    id:            data.id,
    workId:        data.work_id,
    nameEn:        data.name_en,
    nameAr:        data.name_ar,
    description:   data.description_en ?? '',
    descriptionAr: data.description_ar ?? '',
    itemCount:     0,
    icon:          data.icon,
  };
}

export async function updateSectionAction(
  sectionDbId: string,
  workDbId: string,
  updates: SectionActionPayload
): Promise<void> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchiveByWork(supabase, actor, workDbId))) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('sections')
    .update({
      name_en:        updates.nameEn,
      name_ar:        updates.nameAr,
      description_en: updates.description,
      description_ar: updates.descriptionAr,
      icon:           updates.icon,
    })
    .eq('id', sectionDbId);

  if (error) throw new Error(error.message);
}

export async function deleteSectionAction(sectionDbId: string): Promise<void> {
  const { actor, supabase } = await requireArchiveActor();

  if (!canDeleteArchive(actor)) throw new Error('forbidden');

  const { error } = await supabase.rpc('delete_section', { p_section_id: sectionDbId });

  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   Item (Level 4)
   ══════════════════════════════════════════════════════════════════════ */

export type ItemActionPayload = {
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  driveUrl: string;
  thumbnail?: string;
  tag?: string; // مفتاح من file_types
};

export type ItemRow = {
  dbId:          string; // uuid
  id:            string; // = dbId
  sectionId:     string;
  nameEn:        string;
  nameAr:        string;
  description:   string;
  descriptionAr: string;
  thumbnail?:    string;
  driveUrl:      string;
  tag?:          string;
};

export async function addItemAction(
  sectionDbId: string,
  workDbId: string,
  payload: ItemActionPayload
): Promise<ItemRow> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchiveByWork(supabase, actor, workDbId))) {
    throw new Error('forbidden');
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      section_id:     sectionDbId,
      name_en:        payload.nameEn,
      name_ar:        payload.nameAr,
      description_en: payload.description,
      description_ar: payload.descriptionAr,
      drive_url:      payload.driveUrl,
      thumbnail_url:  payload.thumbnail ?? null,
      tag:            payload.tag ?? null,
      created_by:     actor.id,
    })
    .select('id, section_id, name_en, name_ar, description_en, description_ar, drive_url, thumbnail_url, tag')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'insert_failed');

  return {
    dbId:          data.id,
    id:            data.id,
    sectionId:     data.section_id,
    nameEn:        data.name_en,
    nameAr:        data.name_ar,
    description:   data.description_en ?? '',
    descriptionAr: data.description_ar ?? '',
    thumbnail:     data.thumbnail_url ?? undefined,
    driveUrl:      data.drive_url ?? '',
    tag:           data.tag ?? undefined,
  };
}

export async function updateItemAction(
  itemDbId: string,
  workDbId: string,
  updates: ItemActionPayload
): Promise<void> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchiveByWork(supabase, actor, workDbId))) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('items')
    .update({
      name_en:        updates.nameEn,
      name_ar:        updates.nameAr,
      description_en: updates.description,
      description_ar: updates.descriptionAr,
      drive_url:      updates.driveUrl,
      thumbnail_url:  updates.thumbnail ?? null,
      tag:            updates.tag ?? null,
    })
    .eq('id', itemDbId);

  if (error) throw new Error(error.message);
}

export async function deleteItemAction(itemDbId: string): Promise<void> {
  const { actor, supabase } = await requireArchiveActor();

  if (!canDeleteArchive(actor)) throw new Error('forbidden');

  const { error } = await supabase.rpc('delete_item', { p_item_id: itemDbId });

  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   File Types registry (مشترك بين كل المنصات)
   ══════════════════════════════════════════════════════════════════════ */

export type FileTypeRow = { key: string; color: string };

export async function addFileTypeAction(
  key: string,
  color: string
): Promise<FileTypeRow> {
  const { supabase, actor } = await requireArchiveActor();

  // إضافة نوع ملف جديد صلاحيتها Manage Archive بشكل عام (بدون شرط عضوية
  // منصة معينة، لأن الـ registry مشترك بين كل المنصات) — نفس منطق RPC
  // add_file_type بالداتابيز.
  if (!(await canCreatePlatform(supabase, actor))) throw new Error('forbidden');

  const { data, error } = await supabase.rpc('add_file_type', {
    p_key: key,
    p_color: color,
  });

  if (error) throw new Error(error.message);

  return { key: data.key, color: data.color };
}

/* ══════════════════════════════════════════════════════════════════════
   File (Level 5)
   ══════════════════════════════════════════════════════════════════════ */

export type FileActionPayload = {
  nameEn: string;
  nameAr: string;
  driveUrl: string;
  tag?: string; // مفتاح من file_types — اختياري
};

export type FileDbRow = {
  dbId:   string; // uuid
  id:     string; // = dbId
  itemId: string;
  nameEn: string;
  nameAr: string;
  driveUrl: string;
  tag?: string;
};

export async function addFileAction(
  itemDbId: string,
  workDbId: string,
  payload: FileActionPayload
): Promise<FileDbRow> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchiveByWork(supabase, actor, workDbId))) {
    throw new Error('forbidden');
  }

  const { data, error } = await supabase
    .from('files')
    .insert({
      item_id:    itemDbId,
      name_en:    payload.nameEn,
      name_ar:    payload.nameAr,
      drive_url:  payload.driveUrl,
      file_type:  payload.tag ?? null,
      created_by: actor.id,
    })
    .select('id, item_id, name_en, name_ar, drive_url, file_type')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'insert_failed');

  return {
    dbId: data.id, id: data.id, itemId: data.item_id,
    nameEn: data.name_en, nameAr: data.name_ar,
    driveUrl: data.drive_url, tag: data.file_type ?? undefined,
  };
}

export async function updateFileAction(
  fileDbId: string,
  workDbId: string,
  updates: FileActionPayload
): Promise<void> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchiveByWork(supabase, actor, workDbId))) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('files')
    .update({
      name_en:   updates.nameEn,
      name_ar:   updates.nameAr,
      drive_url: updates.driveUrl,
      file_type: updates.tag ?? null,
    })
    .eq('id', fileDbId);

  if (error) throw new Error(error.message);
}

export async function deleteFileAction(fileDbId: string): Promise<void> {
  const { actor, supabase } = await requireArchiveActor();

  if (!canDeleteArchive(actor)) throw new Error('forbidden');

  const { error } = await supabase.rpc('delete_file', { p_file_id: fileDbId });

  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   رفع الصور (Platform/Work/Item thumbnails) — Supabase Storage
   ══════════════════════════════════════════════════════════════════════ */

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB موحّد (القرار المحسوم)

export async function uploadArchiveImageAction(formData: FormData): Promise<string> {
  const { supabase, actor } = await requireArchiveActor();

  // ⚠️ إضافة أمنية: قبل هالفحص، أي عضو نشط (بدون أي شرط صلاحية) كان
  // يقدر يرفع صور لـ storage الأرشيف. صار محصور بـ archive.manage —
  // نفس منطق add_file_type/canCreatePlatform (صلاحية عامة بدون شرط
  // عضوية منصة معينة، لأن الصورة ممكن تكون لمنصة جديدة لسا ما انخلقت).
  if (!(await hasCapability(supabase, actor, 'archive.manage'))) {
    throw new Error('forbidden');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('no_file');

  if (!file.type.startsWith('image/')) throw new Error('invalid_file_type');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('file_too_large');

  const folder = (formData.get('folder') as string) || 'misc';
  const safeFolder = /^[a-z-]+$/.test(folder) ? folder : 'misc'; // منع path traversal
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${safeFolder}/${crypto.randomUUID()}.${ext || 'jpg'}`;

  const { error: uploadError } = await supabase.storage
    .from('archive')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('archive').getPublicUrl(path);
  return data.publicUrl;
}

export async function setArchiveViewModeAction(mode: 'grid' | 'list'): Promise<void> {
  const { supabase } = await requireArchiveActor();
  const { error } = await supabase.rpc('set_archive_view_mode', { p_mode: mode });
  if (error) throw new Error(error.message);
}

/** تعديل رابط مجلد الـItem الكامل بس (Open Full Drive Folder) — بدون لمس
    باقي حقول الـitem، عشان صفحة الملفات ما تحتاج تجيب/تبعت كل الحقول. */
export async function updateItemDriveUrlAction(
  itemDbId: string,
  workDbId: string,
  driveUrl: string
): Promise<void> {
  const { supabase, actor } = await requireArchiveActor();

  if (!(await canManageArchiveByWork(supabase, actor, workDbId))) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('items')
    .update({ drive_url: driveUrl })
    .eq('id', itemDbId);

  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   DestinationPicker — تصفّح للقراءة فقط (أي عضو مسجّل دخول يقدر يتصفح،
   نفس صلاحية SELECT المفتوحة على الجداول). الفحص الحقيقي (عضوية +
   archive.copy_move على المصدر والوجهة معًا) بيصير جوا RPCs التنفيذ
   بالأسفل، مش هون.
   ══════════════════════════════════════════════════════════════════════ */

export type PickerPlatform = { id: string; slug: string; nameEn: string; nameAr: string; color: string };
export type PickerWork     = { id: string; nameEn: string; nameAr: string; platformId: string };
export type PickerSection  = { id: string; nameEn: string; nameAr: string; icon: string; workId: string };
export type PickerItem     = { id: string; nameEn: string; nameAr: string; sectionId: string };

export async function listPlatformsForPicker(): Promise<PickerPlatform[]> {
  const { supabase } = await requireArchiveActor();
  const { data, error } = await supabase
    .from('platforms')
    .select('id, slug, name_en, name_ar, color')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(p => ({ id: p.id, slug: p.slug, nameEn: p.name_en, nameAr: p.name_ar, color: p.color }));
}

export async function listWorksForPicker(platformId: string): Promise<PickerWork[]> {
  const { supabase } = await requireArchiveActor();
  const { data, error } = await supabase
    .from('works')
    .select('id, name_en, name_ar, platform_id')
    .eq('platform_id', platformId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(w => ({ id: w.id, nameEn: w.name_en, nameAr: w.name_ar, platformId: w.platform_id }));
}

export async function listSectionsForPicker(workId: string): Promise<PickerSection[]> {
  const { supabase } = await requireArchiveActor();
  const { data, error } = await supabase
    .from('sections')
    .select('id, name_en, name_ar, icon, work_id')
    .eq('work_id', workId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(s => ({ id: s.id, nameEn: s.name_en, nameAr: s.name_ar, icon: s.icon, workId: s.work_id }));
}

export async function listItemsForPicker(sectionId: string): Promise<PickerItem[]> {
  const { supabase } = await requireArchiveActor();
  const { data, error } = await supabase
    .from('items')
    .select('id, name_en, name_ar, section_id')
    .eq('section_id', sectionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(i => ({ id: i.id, nameEn: i.name_en, nameAr: i.name_ar, sectionId: i.section_id }));
}

/* ══════════════════════════════════════════════════════════════════════
   النسخ/النقل الفعلي — بتستدعي الـRPCs الجاهزة أصلاً بالباك اند
   (SECURITY DEFINER، فاحصة can_copy_move_archive على المصدر والوجهة
   معًا جوا الدالة نفسها). الـServer Action هون بس واجهة استدعاء + رمي
   خطأ واضح، بدون تكرار منطق الصلاحيات.
   ══════════════════════════════════════════════════════════════════════ */

export async function moveSectionAction(sectionId: string, toWorkId: string): Promise<void> {
  const { supabase } = await requireArchiveActor();
  const { error } = await supabase.rpc('move_section', { p_section_id: sectionId, p_to_work_id: toWorkId });
  if (error) throw new Error(error.message);
}

export async function copySectionAction(sectionId: string, toWorkId: string): Promise<void> {
  const { supabase } = await requireArchiveActor();
  const { error } = await supabase.rpc('copy_section', { p_section_id: sectionId, p_to_work_id: toWorkId });
  if (error) throw new Error(error.message);
}

export async function moveItemsAction(itemIds: string[], toSectionId: string): Promise<void> {
  const { supabase } = await requireArchiveActor();
  const { error } = await supabase.rpc('move_items', { p_item_ids: itemIds, p_to_section_id: toSectionId });
  if (error) throw new Error(error.message);
}

export async function copyItemsAction(itemIds: string[], toSectionId: string): Promise<void> {
  const { supabase } = await requireArchiveActor();
  const { error } = await supabase.rpc('copy_items', { p_item_ids: itemIds, p_to_section_id: toSectionId });
  if (error) throw new Error(error.message);
}

export async function moveFilesAction(fileIds: string[], toItemId: string): Promise<void> {
  const { supabase } = await requireArchiveActor();
  const { error } = await supabase.rpc('move_files', { p_file_ids: fileIds, p_to_item_id: toItemId });
  if (error) throw new Error(error.message);
}

export async function copyFilesAction(fileIds: string[], toItemId: string): Promise<void> {
  const { supabase } = await requireArchiveActor();
  const { error } = await supabase.rpc('copy_files', { p_file_ids: fileIds, p_to_item_id: toItemId });
  if (error) throw new Error(error.message);
}