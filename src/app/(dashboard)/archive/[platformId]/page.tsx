// src/app/(dashboard)/archive/[platformId]/page.tsx
import { notFound } from 'next/navigation'
import PlatformHero from '@/components/dashboard/archive/PlatformHero'
import WorksGrid     from '@/components/dashboard/archive/WorksGrid'
import { requireArchiveActor, canManageArchivePlatform, canDeleteArchive } from '@/app/(dashboard)/archive/guards'
import type { WorkRow } from '@/app/(dashboard)/archive/actions'

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ platformId: string }>
}) {
  const { platformId: platformSlug } = await params
  const { supabase, actor } = await requireArchiveActor()

  const { data: platformData, error: platformError } = await supabase
    .from('platforms')
    .select('id, slug, name_en, name_ar, description_en, description_ar, color, thumbnail_url')
    .eq('slug', platformSlug)
    .maybeSingle()

  if (platformError) throw new Error(platformError.message)
  if (!platformData) notFound()

  const [
    { data: worksData, error: worksError },
    { data: platformStats },
    { data: workStatsData },
    canManage,
    { data: profileData },
  ] = await Promise.all([
    supabase
      .from('works')
      .select('id, slug, platform_id, name_en, name_ar, description_en, description_ar, image_url')
      .eq('platform_id', platformData.id)
      .order('created_at', { ascending: true }),
    supabase.rpc('get_platform_stats', { p_platform_id: platformData.id }),
    // ⚠️ كانت N+1: كنا نستدعي get_work_stats مرة لكل work عبر Promise.all
    // (لو 15 عمل = 15 استعلام). استبدلناها باستعلام واحد مجمّع
    // (get_all_work_stats) يرجّع صف لكل work بضربة وحدة — راجع الميجريشن.
    supabase.rpc('get_all_work_stats', { p_platform_id: platformData.id }),
    canManageArchivePlatform(supabase, actor, platformData.id),
    supabase.from('profiles').select('archive_view_mode').eq('id', actor.id).maybeSingle(),
  ])

  if (worksError) throw new Error(worksError.message)

  const workStatsMap = new Map(
    (workStatsData ?? []).map((row) => [
      row.work_id,
      { sections_count: row.sections_count, files_count: row.files_count },
    ])
  )

  const works: WorkRow[] = (worksData ?? []).map(w => {
    const stats = workStatsMap.get(w.id) ?? { sections_count: 0, files_count: 0 }
    return {
      dbId:          w.id,
      id:            w.slug,
      platformId:    w.platform_id,
      nameEn:        w.name_en,
      nameAr:        w.name_ar,
      description:   w.description_en ?? '',
      descriptionAr: w.description_ar ?? '',
      thumbnail:     w.image_url ?? undefined,
      sectionCount:  stats.sections_count,
      fileCount:     stats.files_count,
    }
  })

  const platform = {
    dbId:          platformData.id,
    id:            platformData.slug,
    nameEn:        platformData.name_en,
    nameAr:        platformData.name_ar,
    description:   platformData.description_en ?? '',
    descriptionAr: platformData.description_ar ?? '',
    thumbnail:     platformData.thumbnail_url ?? undefined,
    color:         platformData.color,
    folderCount:   platformStats?.[0]?.folders_count ?? 0,
    fileCount:     platformStats?.[0]?.files_count ?? 0,
    locked:        false, // وصلنا هون أصلاً يعني ما كان مقفول (أو Chief/Developer)
    canEdit:       canManage,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PlatformHero platform={platform} />

      <WorksGrid
        platformId={platformData.id}
        platformSlug={platformData.slug}
        color={platformData.color}
        initialWorks={works}
        canCreate={canManage}
        canDelete={canDeleteArchive(actor)}
        initialViewMode={(profileData?.archive_view_mode as 'grid' | 'list') ?? 'grid'}
      />
    </div>
  )
}