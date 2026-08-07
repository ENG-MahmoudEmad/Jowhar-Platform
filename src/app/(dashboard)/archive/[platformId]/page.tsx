"use client"

import { useParams } from 'next/navigation'
import PlatformHero  from '@/components/dashboard/archive/PlatformHero'
import WorksGrid      from '@/components/dashboard/archive/WorksGrid'
import { PLATFORMS } from '@/components/dashboard/archive/PlatformGrid'

export default function PlatformPage() {
  const params     = useParams()
  const platformId = params.platformId as string

  // Find platform data from mock (replace with API call later)
  const platform = PLATFORMS.find(
    p => p.nameEn.toLowerCase().replace(/\s+/g, '-') === platformId || p.id === platformId
  )

  if (!platform) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Platform not found
        </p>
      </div>
    )
  }

  const platformSlug = platform.nameEn.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Hero — same PlatformHero as before */}
      <PlatformHero platform={platform} />

      {/* Works — new middle level, replaces sections here */}
      <WorksGrid
        platformId={platform.id}
        platformSlug={platformSlug}
        color={platform.color}
        isAdmin={true}
      />

    </div>
  )
}