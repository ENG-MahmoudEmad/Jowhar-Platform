// src/components/dashboard/archive/FileListClient.tsx
"use client"

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import FileList from '@/components/dashboard/archive/FileList'
import type { FileDbRow, FileTypeRow } from '@/app/(dashboard)/archive/actions'
import type { ViewMode } from '@/components/dashboard/archive/ViewToggle'

export default function FileListClient({
  platformSlug,
  platformName,
  platformNameAr,
  workSlug,
  workId,
  workName,
  workNameAr,
  sectionName,
  sectionNameAr,
  itemId,
  itemName,
  itemNameAr,
  itemDriveUrl,
  color,
  initialFiles,
  initialFileTypes,
  canManage,
  canDelete,
  initialViewMode = 'grid',
}: {
  platformSlug: string
  platformName: string
  platformNameAr: string
  workSlug: string
  workId: string
  workName: string
  workNameAr: string
  sectionName: string
  sectionNameAr: string
  itemId: string
  itemName: string
  itemNameAr: string
  itemDriveUrl: string
  color: string
  initialFiles: FileDbRow[]
  initialFileTypes: FileTypeRow[]
  canManage: boolean
  canDelete: boolean
  initialViewMode?: ViewMode
}) {
  const router = useRouter()
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const platformDisplay = lang === 'ar' ? platformNameAr : platformName
  const workDisplay     = lang === 'ar' ? workNameAr     : workName
  const sectionDisplay  = lang === 'ar' ? sectionNameAr  : sectionName
  const itemDisplay     = lang === 'ar' ? itemNameAr     : itemName

  const handleArchiveClick  = useCallback(() => router.push('/archive'), [router])
  const handlePlatformClick = useCallback(() => router.push(`/archive/${platformSlug}`), [router, platformSlug])
  const handleWorkClick     = useCallback(() => router.push(`/archive/${platformSlug}/${workSlug}`), [router, platformSlug, workSlug])

  const crumbTextStyle = useMemo<React.CSSProperties>(() => ({ color: 'var(--foreground-muted)', cursor: 'pointer', transition: 'color 0.2s' }), [])
  const handleCrumbEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>) => { e.currentTarget.style.color = color }, [color])
  const handleCrumbLeave = useCallback((e: React.MouseEvent<HTMLSpanElement>) => { e.currentTarget.style.color = 'var(--foreground-muted)' }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>

      <div className="rounded-2xl px-6 py-5 select-none" style={{
        background: isDark ? `linear-gradient(135deg, #161b22 0%, ${color}14 100%)` : `linear-gradient(135deg, #f5f5ef 0%, ${color}0e 100%)`,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
      }}>
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest mb-3 flex-wrap">
          <span style={crumbTextStyle} onMouseEnter={handleCrumbEnter} onMouseLeave={handleCrumbLeave} onClick={handleArchiveClick}>
            {lang === 'ar' ? 'الأرشيف' : 'Archive'}
          </span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={crumbTextStyle} onMouseEnter={handleCrumbEnter} onMouseLeave={handleCrumbLeave} onClick={handlePlatformClick}>
            {platformDisplay}
          </span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={crumbTextStyle} onMouseEnter={handleCrumbEnter} onMouseLeave={handleCrumbLeave} onClick={handleWorkClick}>
            {workDisplay}
          </span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={{ color }}>{sectionDisplay}</span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={{ color: 'var(--foreground)' }}>{itemDisplay}</span>
        </div>

        <h1 className="text-2xl font-black" style={{
          color: 'var(--foreground)',
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
        }}>
          {itemDisplay}
        </h1>
      </div>

      <FileList
        itemId={itemId}
        workId={workId}
        itemDriveUrl={itemDriveUrl}
        color={color}
        initialFiles={initialFiles}
        initialFileTypes={initialFileTypes}
        canManage={canManage}
        canDelete={canDelete}
        initialViewMode={initialViewMode}
      />
    </div>
  )
}