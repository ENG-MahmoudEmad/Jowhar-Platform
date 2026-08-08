// src/app/(dashboard)/archive/[platformId]/[workId]/[sectionId]/[itemId]/page.tsx
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import FileListClient from '@/components/dashboard/archive/FileListClient'
import { requireArchiveActor, canManageArchiveByWork, canDeleteArchive } from '@/app/(dashboard)/archive/guards'
import type { FileDbRow } from '@/app/(dashboard)/archive/actions'

export default async function ItemFilesPage({
  params,
}: {
  params: Promise<{ platformId: string; workId: string; sectionId: string; itemId: string }>
}) {
  const { platformId: platformSlug, workId: workSlug, sectionId, itemId } = await params
  const { supabase, actor } = await requireArchiveActor()

  const { data: platformData } = await supabase
    .from('platforms')
    .select('id, slug, name_en, name_ar, color')
    .eq('slug', platformSlug)
    .maybeSingle()
  if (!platformData) notFound()

  const { data: workData } = await supabase
    .from('works')
    .select('id, slug, name_en, name_ar')
    .eq('platform_id', platformData.id)
    .eq('slug', workSlug)
    .maybeSingle()
  if (!workData) notFound()

  const { data: sectionData } = await supabase
    .from('sections')
    .select('id, name_en, name_ar')
    .eq('id', sectionId)
    .eq('work_id', workData.id)
    .maybeSingle()
  if (!sectionData) notFound()

  const { data: itemData } = await supabase
    .from('items')
    .select('id, name_en, name_ar, drive_url')
    .eq('id', itemId)
    .eq('section_id', sectionData.id)
    .maybeSingle()
  if (!itemData) notFound()

  const [
    { data: filesData, error: filesError },
    { data: fileTypesData },
    canManage,
    { data: profileData },
  ] = await Promise.all([
    supabase
      .from('files')
      .select('id, item_id, name_en, name_ar, drive_url, file_type')
      .eq('item_id', itemData.id)
      .order('created_at', { ascending: true }),
    supabase.from('file_types').select('key, color').order('key', { ascending: true }),
    canManageArchiveByWork(supabase, actor, workData.id),
    supabase.from('profiles').select('archive_view_mode').eq('id', actor.id).maybeSingle(),
  ])

  if (filesError) throw new Error(filesError.message)

  const files: FileDbRow[] = (filesData ?? []).map(f => ({
    dbId: f.id, id: f.id, itemId: f.item_id,
    nameEn: f.name_en, nameAr: f.name_ar,
    driveUrl: f.drive_url ?? '', tag: f.file_type ?? undefined,
  }))

  return (
    <FileListClient
      platformSlug={platformData.slug}
      platformName={platformData.name_en}
      platformNameAr={platformData.name_ar}
      workSlug={workData.slug}
      workId={workData.id}
      workName={workData.name_en}
      workNameAr={workData.name_ar}
      sectionName={sectionData.name_en}
      sectionNameAr={sectionData.name_ar}
      itemId={itemData.id}
      itemName={itemData.name_en}
      itemNameAr={itemData.name_ar}
      itemDriveUrl={itemData.drive_url ?? ''}
      color={platformData.color}
      initialFiles={files}
      initialFileTypes={fileTypesData ?? []}
      canManage={canManage}
      canDelete={canDeleteArchive(actor)}
      initialViewMode={(profileData?.archive_view_mode as 'grid' | 'list') ?? 'grid'}
    />
  )
}