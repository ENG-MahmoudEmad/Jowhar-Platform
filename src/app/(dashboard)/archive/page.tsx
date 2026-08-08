// src/app/(dashboard)/archive/page.tsx
import ArchiveHero  from "@/components/dashboard/archive/ArchiveHero"
import PlatformGrid from "@/components/dashboard/archive/PlatformGrid"
import { requireArchiveActor, canCreatePlatform, canDeleteArchive } from "./guards"
import { hasCapability } from "@/app/(dashboard)/adminControl/guards"
import type { PlatformRow } from "./actions"

export default async function ArchivePage() {
  const { supabase, actor } = await requireArchiveActor()

  const [
    { data: platformsData, error: platformsError },
    { data: statsData },
    canManageGlobal,
    canDeleteGlobal,
  ] = await Promise.all([
    supabase
      .from('platforms')
      .select('id, slug, name_en, name_ar, description_en, description_ar, color, thumbnail_url')
      .order('created_at', { ascending: true }),
    supabase.rpc('get_all_platform_stats'),
    hasCapability(supabase, actor, 'archive.manage'),
    Promise.resolve(canDeleteArchive(actor)),
  ])

  if (platformsError) throw new Error(platformsError.message)

  // عضوية المستخدم الحالي بكل المنصات — استعلام واحد فقط (Chief/Developer
  // بيتخطوا القفل دايمًا، فما محتاجين نجيب عضويتهم أصلاً)
  let memberPlatformIds = new Set<string>()
  if (!actor.isChief && !actor.isDeveloper) {
    const { data: memberships } = await supabase
      .from('platform_team_members')
      .select('platform_id')
      .eq('member_id', actor.id)
    memberPlatformIds = new Set((memberships ?? []).map(m => m.platform_id))
  }

  const statsByPlatform = new Map<string, { folders_count: number; files_count: number }>()
  for (const row of statsData ?? []) {
    statsByPlatform.set(row.platform_id, { folders_count: row.folders_count, files_count: row.files_count })
  }

  const platforms: PlatformRow[] = (platformsData ?? []).map(p => {
    const isMember = actor.isChief || actor.isDeveloper || memberPlatformIds.has(p.id)
    const stats = statsByPlatform.get(p.id) ?? { folders_count: 0, files_count: 0 }

    return {
      dbId:          p.id,
      id:            p.slug,
      nameEn:        p.name_en,
      nameAr:        p.name_ar,
      description:   p.description_en ?? '',
      descriptionAr: p.description_ar ?? '',
      thumbnail:     p.thumbnail_url ?? undefined,
      color:         p.color,
      folderCount:   stats.folders_count,
      fileCount:     stats.files_count,
      locked:        !isMember,
      canEdit:       isMember && canManageGlobal,
    }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <ArchiveHero platformCount={platforms.length} />
      <PlatformGrid
        initialPlatforms={platforms}
        canCreate={canManageGlobal}
        canDelete={canDeleteGlobal}
      />
    </div>
  )
}