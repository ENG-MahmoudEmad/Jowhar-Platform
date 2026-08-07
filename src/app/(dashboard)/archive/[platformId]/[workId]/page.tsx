//src\app\(dashboard)\archive\[platformId]\[workId]\page.tsx
"use client"

import { useState } from 'react'
import { useParams }    from 'next/navigation'
import WorkHero          from '@/components/dashboard/archive/WorkHero'
import SectionTabs      from '@/components/dashboard/archive/SectionTabs'
import SectionGrid      from '@/components/dashboard/archive/SectionGrid'
import { PLATFORMS }    from '@/components/dashboard/archive/PlatformGrid'
import { WORKS }        from '@/components/dashboard/archive/WorksGrid'
import type { Section } from '@/components/dashboard/archive/SectionTabs'
import { useLang }      from '@/context/LangContext'

export default function WorkPage() {
  const params     = useParams()
  const { lang }   = useLang()
  const platformId = params.platformId as string
  const workId     = params.workId as string

  // Find platform + work data from mock (replace with API calls later)
  const platform = PLATFORMS.find(
    p => p.nameEn.toLowerCase().replace(/\s+/g, '-') === platformId || p.id === platformId
  )
  const work = WORKS.find(
    w => w.id === workId && (platform ? w.platformId === platform.id : true)
  )

  const [activeSection, setActiveSection] = useState<Section | null>(null)

  if (!platform || !work) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Work not found
        </p>
      </div>
    )
  }

  const platformSlug = platform.nameEn.toLowerCase().replace(/\s+/g, '-')
  const platformName = lang === 'ar' ? platform.nameAr : platform.nameEn

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Hero — now describes the Work, not the Platform */}
      <WorkHero
        work={work}
        platformSlug={platformSlug}
        platformName={platformName}
        color={platform.color}
      />

      {/* Tabs — same SectionTabs as before, now scoped to this work */}
      <SectionTabs
        platformId={work.id}
        color={platform.color}
        isAdmin={true}
        onSectionChange={section => setActiveSection(section)}
      />

      {/* Grid — only render when a section is active */}
      {activeSection && (
        <SectionGrid
          activeSection={activeSection}
          color={platform.color}
          isAdmin={true}
          platformSlug={platformSlug}
          workId={work.id}
        />
      )}

    </div>
  )
}