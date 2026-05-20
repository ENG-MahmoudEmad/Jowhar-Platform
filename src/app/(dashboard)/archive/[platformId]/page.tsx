"use client"

import { useState } from 'react'
import { useParams }    from 'next/navigation'
import PlatformHero     from '@/components/dashboard/archive/PlatformHero'
import SectionTabs      from '@/components/dashboard/archive/SectionTabs'
import SectionGrid      from '@/components/dashboard/archive/SectionGrid'
import { PLATFORMS }    from '@/components/dashboard/archive/PlatformGrid'
import type { Section } from '@/components/dashboard/archive/SectionTabs'

export default function PlatformPage() {
  const params     = useParams()
  const platformId = params.platformId as string

  // Find platform data from mock (replace with API call later)
  const platform = PLATFORMS.find(
    p => p.nameEn.toLowerCase().replace(/\s+/g, '-') === platformId || p.id === platformId
  )

  const [activeSection, setActiveSection] = useState<Section | null>(null)

  if (!platform) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Platform not found
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Hero */}
      <PlatformHero platform={platform} />

      {/* Tabs */}
      <SectionTabs
        platformId={platform.id}
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
        />
      )}

    </div>
  )
}