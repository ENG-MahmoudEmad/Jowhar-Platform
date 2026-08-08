// src/components/dashboard/archive/SectionTabsClient.tsx
"use client"

import { useState, useCallback } from 'react'
import SectionTabs from '@/components/dashboard/archive/SectionTabs'
import SectionGrid from '@/components/dashboard/archive/SectionGrid'
import type { Section } from '@/components/dashboard/archive/SectionTabs'
import type { SectionRow, ItemRow, FileTypeRow } from '@/app/(dashboard)/archive/actions'
import type { SectionIconKey } from '@/data/archiveMockData'
import type { ViewMode } from '@/components/dashboard/archive/ViewToggle'

type SectionRowNarrowed = Omit<SectionRow, 'icon'> & { icon: SectionIconKey }

export default function SectionTabsClient({
  workId,
  workSlug,
  platformSlug,
  color,
  initialSections,
  initialItems,
  initialFileTypes,
  canManage,
  canDelete,
  initialViewMode = 'grid',
}: {
  workId:            string
  workSlug:          string
  platformSlug:      string
  color:             string
  initialSections:   SectionRowNarrowed[]
  initialItems:      ItemRow[]
  initialFileTypes:  FileTypeRow[]
  canManage:         boolean
  canDelete:         boolean
  initialViewMode?:  ViewMode
}) {
  const [activeSection, setActiveSection] = useState<Section | null>(null)

  /** عدد العناصر بكل قسم — منسوخ من السيرفر أول مرة، وبعدين بيتحدث لحظيًا
      لما SectionGrid يضيف/يحذف عنصر (كومبوننت منفصل، فمحتاجين قناة تزامن
      صريحة بدل ما نعتمد بس على بيانات السيرفر الأولية الجامدة). */
  const [sections, setSections] = useState<SectionRowNarrowed[]>(initialSections)

  const handleSectionChange = useCallback((section: Section) => {
    setActiveSection(section)
  }, [])

  const handleItemCountChange = useCallback((sectionId: string, delta: number) => {
    setSections(prev => prev.map(s =>
      s.dbId === sectionId ? { ...s, itemCount: Math.max(0, s.itemCount + delta) } : s
    ))
    setActiveSection(prev =>
      prev && prev.dbId === sectionId ? { ...prev, itemCount: Math.max(0, prev.itemCount + delta) } : prev
    )
  }, [])

  return (
    <>
      <SectionTabs
        workId={workId}
        color={color}
        initialSections={sections}
        canManage={canManage}
        canDelete={canDelete}
        onSectionChange={handleSectionChange}
      />

      {activeSection && (
        <SectionGrid
          activeSection={activeSection}
          color={color}
          canManage={canManage}
          canDelete={canDelete}
          platformSlug={platformSlug}
          workId={workId}
          workSlug={workSlug}
          initialItems={initialItems}
          initialFileTypes={initialFileTypes}
          onItemCountChange={handleItemCountChange}
          initialViewMode={initialViewMode}
        />
      )}
    </>
  )
}