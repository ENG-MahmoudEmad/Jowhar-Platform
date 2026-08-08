// src/app/(dashboard)/archive/[platformId]/[workId]/page.tsx
import { notFound } from 'next/navigation'
import WorkHero      from '@/components/dashboard/archive/WorkHero'
import SectionTabsClient from '@/components/dashboard/archive/SectionTabsClient'
import { requireArchiveActor, canManageArchiveByWork, canDeleteArchive } from '@/app/(dashboard)/archive/guards'
import type { SectionRow, ItemRow } from '@/app/(dashboard)/archive/actions'
import type { SectionIconKey } from '@/data/archiveMockData'

export default async function WorkPage({
  params,
}: {
  params: Promise<{ platformId: string; workId: string }>
}) {
  const { platformId: platformSlug, workId: workSlug } = await params
  const { supabase, actor } = await requireArchiveActor()

  const { data: platformData, error: platformError } = await supabase
    .from('platforms')
    .select('id, slug, name_en, name_ar, color')
    .eq('slug', platformSlug)
    .maybeSingle()

  if (platformError) throw new Error(platformError.message)
  if (!platformData) notFound()

  const { data: workData, error: workError } = await supabase
    .from('works')
    .select('id, slug, platform_id, name_en, name_ar, description_en, description_ar, image_url')
    .eq('platform_id', platformData.id)
    .eq('slug', workSlug)
    .maybeSingle()

  if (workError) throw new Error(workError.message)
  if (!workData) notFound()

  const [
    { data: sectionsData, error: sectionsError },
    { data: workStats },
    canManage,
    { data: profileData },
  ] = await Promise.all([
    supabase
      .from('sections')
      .select('id, work_id, name_en, name_ar, description_en, description_ar, icon')
      .eq('work_id', workData.id)
      .order('created_at', { ascending: true }),
    supabase.rpc('get_work_stats', { p_work_id: workData.id }),
    canManageArchiveByWork(supabase, actor, workData.id),
    supabase.from('profiles').select('archive_view_mode').eq('id', actor.id).maybeSingle(),
  ])

  if (sectionsError) throw new Error(sectionsError.message)

  const sectionIds = (sectionsData ?? []).map(s => s.id)

  const [
    { data: itemsData, error: itemsError },
    { data: fileTypesData },
  ] = await Promise.all([
    sectionIds.length > 0
      ? supabase
          .from('items')
          .select('id, section_id, name_en, name_ar, description_en, description_ar, drive_url, thumbnail_url, tag')
          .in('section_id', sectionIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('file_types').select('key, color').order('key', { ascending: true }),
  ])

  if (itemsError) throw new Error(itemsError.message)

  // عدد العناصر لكل تقسيم — محسوب هون بدل استدعاء منفصل لكل تقسيم
  const itemCountBySection = new Map<string, number>()
  for (const it of itemsData ?? []) {
    itemCountBySection.set(it.section_id, (itemCountBySection.get(it.section_id) ?? 0) + 1)
  }

  const sections = (sectionsData ?? []).map(s => ({
    dbId:          s.id,
    id:            s.id,
    workId:        s.work_id,
    nameEn:        s.name_en,
    nameAr:        s.name_ar,
    description:   s.description_en ?? '',
    descriptionAr: s.description_ar ?? '',
    itemCount:     itemCountBySection.get(s.id) ?? 0,
    icon:          s.icon as SectionIconKey,
  }))

  const items: ItemRow[] = (itemsData ?? []).map(i => ({
    dbId:          i.id,
    id:            i.id,
    sectionId:     i.section_id,
    nameEn:        i.name_en,
    nameAr:        i.name_ar,
    description:   i.description_en ?? '',
    descriptionAr: i.description_ar ?? '',
    thumbnail:     i.thumbnail_url ?? undefined,
    driveUrl:      i.drive_url ?? '',
    tag:           i.tag ?? undefined,
  }))

  const work = {
    dbId:          workData.id,
    id:            workData.slug,
    platformId:    workData.platform_id,
    nameEn:        workData.name_en,
    nameAr:        workData.name_ar,
    description:   workData.description_en ?? '',
    descriptionAr: workData.description_ar ?? '',
    thumbnail:     workData.image_url ?? undefined,
    sectionCount:  workStats?.[0]?.sections_count ?? 0,
    fileCount:     workStats?.[0]?.files_count ?? 0,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <WorkHero
        work={work}
        platformSlug={platformData.slug}
        platformName={platformData.name_en}
        color={platformData.color}
      />

      <SectionTabsClient
        workId={workData.id}
        workSlug={workData.slug}
        platformSlug={platformData.slug}
        color={platformData.color}
        initialSections={sections}
        initialItems={items}
        initialFileTypes={fileTypesData ?? []}
        canManage={canManage}
        canDelete={canDeleteArchive(actor)}
        initialViewMode={(profileData?.archive_view_mode as 'grid' | 'list') ?? 'grid'}
      />
    </div>
  )
}