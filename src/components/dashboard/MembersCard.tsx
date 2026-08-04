"use client"

import React, {
  memo, useCallback, useMemo, useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import { X, Users, Plus, Trash2, ChevronRight, ChevronLeft, Pencil, Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import Avatar from '@/components/ui/Avatar'
import {
  addMemberToPlatform,
  removeMemberFromPlatform,
  moveMemberToCategory,
  addPlatformCategory,
  renamePlatformCategory,
  deletePlatformCategory,
} from '@/app/(dashboard)/dashboard/platformActions'

// ─────────────────────────────────────────────────────────────────────────────
// Data shape — matches what the server (page.tsx) hands down after mapping
// the nested platforms → categories → members query. This component knows
// nothing about Supabase or column names.
// ─────────────────────────────────────────────────────────────────────────────
export interface PlatformMemberData {
  id: string // profiles.id
  name: string
  initials: string
  color: string
  avatarUrl: string | null
  /** أقرب بديل حقيقي متوفر لحقل "bio" الأصلي — المسمى الوظيفي. */
  bio: string
  bioAr: string
}

export interface PlatformCategoryData {
  id: string
  labelEn: string
  labelAr: string
  members: PlatformMemberData[]
}

export interface PlatformData {
  id: string
  nameEn: string
  nameAr: string
  color: string
  thumbnail: string | null
  categories: PlatformCategoryData[]
}

export interface RosterMemberData {
  id: string
  name: string
  initials: string
  color: string
  avatarUrl: string | null
}

interface MembersCardProps {
  platforms: PlatformData[]
  /** كل الأعضاء الفعّالين — لقائمة "إضافة عضو" (بغض النظر عن عضويتهم الحالية). */
  roster: RosterMemberData[]
  /** true لو المستخدم Chief/Developer أو حامل صلاحية platforms.manage. */
  isAdmin: boolean
}

type CardStyle = React.CSSProperties

const CARD_TRANSITION = {
  delay: 0.26,
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

const MODAL_SPRING = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 340,
  mass: 0.75,
}

const SLIDE_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

let tempIdCounter = 0
function makeTempId() {
  tempIdCounter += 1
  return `temp-${Date.now()}-${tempIdCounter}`
}

const PlatformChip = memo(function PlatformChip({
  platform,
  allMembers,
  onClick,
}: {
  platform: PlatformData
  allMembers: PlatformMemberData[]
  onClick: () => void
}) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const name = lang === 'ar' ? platform.nameAr : platform.nameEn
  const MAX_SHOWN = 4
  const shown = allMembers.slice(0, MAX_SHOWN)
  const extra = allMembers.length - MAX_SHOWN
  const firstLetter = (lang === 'ar' ? platform.nameAr : platform.nameEn).charAt(0)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center text-start rounded-xl overflow-hidden"
      style={{
        height: 72,
        background: isDark
          ? `linear-gradient(135deg, rgba(255,255,255,0.025), ${platform.color}0e)`
          : `linear-gradient(135deg, rgba(255,255,255,0.9), ${platform.color}0a)`,
        border: `1px solid ${platform.color}30`,
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${platform.color}60`
        e.currentTarget.style.boxShadow = `0 4px 16px ${platform.color}18`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${platform.color}30`
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-lg m-2.5"
        style={{
          width: 52,
          height: 52,
          background: `linear-gradient(135deg, ${platform.color}28, ${platform.color}10)`,
        }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 35% 50%, ${platform.color}45 0%, transparent 65%)`,
        }} />
        <div className="absolute top-0 inset-x-0 h-[2px]" style={{
          background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${platform.color}, transparent)`,
        }} />
        {platform.thumbnail ? (
          <img src={platform.thumbnail} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center select-none">
            <span className="font-black" style={{ fontSize: 22, color: platform.color + '60', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
              {firstLetter}
            </span>
          </div>
        )}
      </div>

      <span className="flex-1 min-w-0 text-[12px] font-bold truncate px-1"
        style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
        {name}
      </span>

      <div className="flex items-center shrink-0 pe-4">
        <div className="flex" style={{ direction: 'ltr' }}>
          {shown.map((m, i) => (
            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}>
              <Avatar avatarUrl={m.avatarUrl} initials={m.initials} name={m.name} size={24} color={m.color} className="text-white font-bold border-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
            </div>
          ))}
        </div>
        {extra > 0 && (
          <span className="text-[9px] font-bold ms-1.5" style={{ color: 'var(--foreground-muted)' }}>
            +{extra}
          </span>
        )}
        {allMembers.length === 0 && (
          <span className="text-[9px]" style={{ color: 'var(--foreground-muted)' }}>—</span>
        )}
      </div>
    </button>
  )
})

const AddMemberDropdown = memo(function AddMemberDropdown({
  roster,
  usedIds,
  onAdd,
  onClose,
}: {
  roster: RosterMemberData[]
  usedIds: string[]
  onAdd: (memberId: string) => void
  onClose: () => void
}) {
  const { lang } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [search, setSearch] = useState('')

  const available = useMemo(
    () => roster.filter(
      m => !usedIds.includes(m.id) &&
        m.name.toLowerCase().includes(search.toLowerCase())
    ),
    [roster, usedIds, search]
  )

  return (
    <m.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute z-30 rounded-xl overflow-hidden"
      style={{
        top: '100%',
        insetInlineStart: 0,
        marginTop: 6,
        width: 210,
        background: isDark ? '#161b22' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="p-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={lang === 'ar' ? 'ابحث عن عضو...' : 'Search member...'}
          className="w-full px-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            color: 'var(--foreground)',
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          }}
        />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 180 }}>
        {available.length === 0 ? (
          <p className="text-[11px] text-center py-4" style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {lang === 'ar' ? 'لا يوجد أعضاء' : 'No members found'}
          </p>
        ) : available.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => { onAdd(m.id); onClose() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-start"
            style={{ cursor: 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Avatar avatarUrl={m.avatarUrl} initials={m.initials} name={m.name} size={26} color={m.color} className="text-white font-bold" />
            <span className="text-[12px] font-medium" style={{ color: 'var(--foreground)' }}>{m.name}</span>
          </button>
        ))}
      </div>
    </m.div>
  )
})

const MemberRow = memo(function MemberRow({
  member,
  isAdmin,
  isSupervisor,
  platformColor,
  categories,
  categoryId,
  onRemove,
  onMoveToCategory,
}: {
  member: PlatformMemberData
  isAdmin: boolean
  isSupervisor: boolean
  platformColor: string
  categories: PlatformCategoryData[]
  categoryId: string
  onRemove: (memberId: string) => void
  onMoveToCategory: (memberId: string, toCategoryId: string) => void
}) {
  const { lang } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()
  const [showMove, setShowMove] = useState(false)

  const bio = lang === 'ar' ? member.bioAr : member.bio

  const rowBg = isSupervisor
    ? isDark
      ? `linear-gradient(135deg, ${platformColor}22, ${platformColor}12)`
      : `linear-gradient(135deg, ${platformColor}18, ${platformColor}08)`
    : 'transparent'

  const rowBorder = isSupervisor
    ? `1px solid ${platformColor}30`
    : `1px solid transparent`

  const otherCategories = categories.filter(c => c.id !== categoryId)

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-3 rounded-xl mx-3 mb-1.5 group cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        router.push(`/profile/${member.id}`)
      }}
      style={{
        background: rowBg,
        border: rowBorder,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        if (!isSupervisor) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
      }}
      onMouseLeave={e => {
        if (!isSupervisor) e.currentTarget.style.background = 'transparent'
      }}
    >
      <Avatar avatarUrl={member.avatarUrl} initials={member.initials} name={member.name} size={38} color={member.color} className="text-white font-bold" />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
          {member.name}
        </p>
        <p className="text-[11px] mt-0.5 truncate"
          style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
          {bio || '—'}
        </p>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative">
          {otherCategories.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMove(v => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
                style={{
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  color: 'var(--foreground-muted)',
                  cursor: 'pointer',
                  transition: 'border-color 0.12s, color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = platformColor
                  e.currentTarget.style.borderColor = platformColor + '60'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--foreground-muted)'
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                {lang === 'ar' ? 'نقل' : 'Move'}
              </button>

              <AnimatePresence>
                {showMove && (
                  <m.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute z-30 rounded-xl overflow-hidden py-1"
                    style={{
                      top: '100%',
                      insetInlineEnd: 0,
                      marginTop: 4,
                      minWidth: 140,
                      background: isDark ? '#161b22' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {otherCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { onMoveToCategory(member.id, cat.id); setShowMove(false) }}
                        className="w-full text-start px-3 py-2 text-[11px] font-medium"
                        style={{
                          color: 'var(--foreground)',
                          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                          transition: 'background 0.1s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {lang === 'ar' ? cat.labelAr : cat.labelEn}
                      </button>
                    ))}
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            type="button"
            onClick={() => onRemove(member.id)}
            className="p-1.5 rounded-lg"
            style={{ color: '#ef4444', cursor: 'pointer', transition: 'background 0.12s' }}
            title={lang === 'ar' ? 'إزالة من المنصة' : 'Remove from platform'}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
})

const PlatformPanel = memo(function PlatformPanel({
  platform,
  roster,
  isAdmin,
  onBack,
  onAddMember,
  onRemoveMember,
  onMoveToCategory,
  onRenameCategory,
  onAddCategory,
  onDeleteCategory,
}: {
  platform: PlatformData
  roster: RosterMemberData[]
  isAdmin: boolean
  onBack: () => void
  onAddMember: (platformId: string, memberId: string, categoryId: string) => void
  onRemoveMember: (platformId: string, memberId: string) => void
  onMoveToCategory: (platformId: string, memberId: string, toCategoryId: string) => void
  onRenameCategory: (platformId: string, categoryId: string, newLabelEn: string, newLabelAr: string) => void
  onAddCategory: (platformId: string) => void
  onDeleteCategory: (platformId: string, categoryId: string) => void
}) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const name = lang === 'ar' ? platform.nameAr : platform.nameEn

  const [addingInCategory, setAddingInCategory] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [draftLabelEn, setDraftLabelEn] = useState('')
  const [draftLabelAr, setDraftLabelAr] = useState('')

  const totalMembers = useMemo(
    () => platform.categories.reduce((acc, c) => acc + c.members.length, 0),
    [platform.categories]
  )

  const allUsedIds = useMemo(
    () => platform.categories.flatMap(c => c.members.map(m => m.id)),
    [platform.categories]
  )

  const BackIcon = isRTL ? ChevronRight : ChevronLeft

  const startRename = useCallback((catId: string, enLabel: string, arLabel: string) => {
    setEditingLabel(catId)
    setDraftLabelEn(enLabel)
    setDraftLabelAr(arLabel)
  }, [])

  const saveRename = useCallback((catId: string) => {
    onRenameCategory(platform.id, catId, draftLabelEn, draftLabelAr)
    setEditingLabel(null)
  }, [draftLabelEn, draftLabelAr, onRenameCategory, platform.id])

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{
          background: `linear-gradient(135deg, ${platform.color}18, ${platform.color}08)`,
          borderBottom: `1px solid ${platform.color}25`,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--foreground-muted)', cursor: 'pointer', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <BackIcon size={15} />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0"
            style={{ background: platform.color, boxShadow: `0 0 8px ${platform.color}80` }} />
          <h3 className="text-sm font-black truncate"
            style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
            {name}
          </h3>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: `${platform.color}25`, color: platform.color }}>
          {totalMembers} {lang === 'ar' ? 'عضو' : 'members'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-3" style={{ overscrollBehavior: 'contain' }}>
        {platform.categories.map((category, catIndex) => {
          const isSupervisorCategory = catIndex === 0

          return (
            <div key={category.id} className="mb-3">
              <div className="flex items-center gap-2 px-4 pb-2">
                {editingLabel === category.id ? (
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={draftLabelEn}
                        onChange={e => setDraftLabelEn(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveRename(category.id)}
                        placeholder="English name"
                        className="flex-1 px-2 py-1 rounded-lg text-[11px] font-bold outline-none"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          border: `1px solid ${platform.color}50`,
                          color: 'var(--foreground)',
                          fontFamily: 'var(--font-montserrat), sans-serif',
                          minWidth: 0,
                        }}
                      />
                      <input
                        value={draftLabelAr}
                        onChange={e => setDraftLabelAr(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveRename(category.id)}
                        placeholder="الاسم بالعربي"
                        dir="rtl"
                        className="flex-1 px-2 py-1 rounded-lg text-[11px] font-bold outline-none"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          border: `1px solid ${platform.color}50`,
                          color: 'var(--foreground)',
                          fontFamily: 'var(--font-cairo), sans-serif',
                          minWidth: 0,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => saveRename(category.id)}
                        className="p-1 rounded-lg shrink-0"
                        style={{ color: platform.color, cursor: 'pointer' }}
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: isSupervisorCategory ? platform.color : 'var(--foreground-muted)',
                        opacity: isSupervisorCategory ? 1 : 0.5,
                      }} />
                    <span
                      className="flex-1 font-black"
                      style={{
                        fontSize: 13,
                        color: isSupervisorCategory ? platform.color : 'var(--foreground-muted)',
                        fontFamily: lang === 'ar' ? 'var(--font-cairo), sans-serif' : 'var(--font-montserrat), sans-serif',
                        letterSpacing: lang === 'ar' ? '0.01em' : '0.04em',
                        textTransform: lang === 'ar' ? 'none' : 'uppercase',
                      }}
                    >
                      {lang === 'ar' ? category.labelAr : category.labelEn}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startRename(category.id, category.labelEn, category.labelAr)}
                          className="p-1 rounded"
                          style={{ color: 'var(--foreground-muted)', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                        >
                          <Pencil size={10} />
                        </button>
                        {platform.categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteCategory(platform.id, category.id)}
                            className="p-1 rounded"
                            style={{ color: '#ef4444', cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.12s' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <AnimatePresence initial={false}>
                {category.members.map(member => (
                  <m.div
                    key={member.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MemberRow
                      member={member}
                      isAdmin={isAdmin}
                      isSupervisor={isSupervisorCategory}
                      platformColor={platform.color}
                      categories={platform.categories}
                      categoryId={category.id}
                      onRemove={(mId) => onRemoveMember(platform.id, mId)}
                      onMoveToCategory={(mId, toId) => onMoveToCategory(platform.id, mId, toId)}
                    />
                  </m.div>
                ))}
              </AnimatePresence>

              {category.members.length === 0 && (
                <p className="text-[11px] px-4 py-2 italic"
                  style={{ color: 'var(--foreground-muted)', opacity: 0.5, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {lang === 'ar' ? 'لا يوجد أعضاء في هذا التصنيف' : 'No members in this category'}
                </p>
              )}

              {isAdmin && (
                <div className="px-3 mt-1 relative">
                  <button
                    type="button"
                    onClick={() => setAddingInCategory(v => v === category.id ? null : category.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold w-full justify-center"
                    style={{
                      background: `${platform.color}10`,
                      border: `1px dashed ${platform.color}40`,
                      color: platform.color,
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${platform.color}20`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${platform.color}10`)}
                  >
                    <Plus size={11} />
                    {lang === 'ar' ? 'إضافة عضو' : 'Add Member'}
                  </button>

                  <AnimatePresence>
                    {addingInCategory === category.id && (
                      <AddMemberDropdown
                        roster={roster}
                        usedIds={allUsedIds}
                        onAdd={(memberId) => onAddMember(platform.id, memberId, category.id)}
                        onClose={() => setAddingInCategory(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              )}

              {catIndex < platform.categories.length - 1 && (
                <div className="mx-4 mt-3" style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              )}
            </div>
          )
        })}

        {isAdmin && (
          <div className="px-3 mt-2">
            <button
              type="button"
              onClick={() => onAddCategory(platform.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold w-full justify-center"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                color: 'var(--foreground-muted)',
                cursor: 'pointer',
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')}
            >
              <Plus size={11} />
              {lang === 'ar' ? 'إضافة تصنيف جديد' : 'Add Category'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

function MembersCard({ platforms: initialPlatforms, roster, isAdmin }: MembersCardProps) {
  const { theme } = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const bg = isDark ? 'var(--card)' : '#ffffff'
  const border = isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)'
  const headerBg = isDark ? 'var(--background-alt)' : '#f5f5ef'
  const divider = isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)'
  const textMain = 'var(--foreground)'
  const textMuted = 'var(--foreground-muted)'
  const footerBg = isDark ? 'rgba(13,17,23,0.5)' : 'rgba(249,249,243,0.8)'

  const [platforms, setPlatforms] = useState<PlatformData[]>(initialPlatforms)
  const [modalOpen, setModalOpen] = useState(false)
  const [activePlatformId, setActivePlatformId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const rosterById = useMemo(() => new Map(roster.map(m => [m.id, m])), [roster])

  const totalMembers = useMemo(() => {
    const ids = new Set<string>()
    platforms.forEach(p => p.categories.forEach(c => c.members.forEach(m => ids.add(m.id))))
    return ids.size
  }, [platforms])

  const activePlatform = useMemo(
    () => platforms.find(p => p.id === activePlatformId) ?? null,
    [platforms, activePlatformId]
  )

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => { setModalOpen(false); setActivePlatformId(null) }, [])
  const handleBack = useCallback(() => setActivePlatformId(null), [])
  const handleCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    openModal()
  }, [openModal])

  const handleAddMember = useCallback((platformId: string, memberId: string, categoryId: string) => {
    const rosterMember = rosterById.get(memberId)
    if (!rosterMember) return

    setActionError(null)
    const prev = platforms
    const newMember: PlatformMemberData = {
      id: rosterMember.id,
      name: rosterMember.name,
      initials: rosterMember.initials,
      color: rosterMember.color,
      avatarUrl: rosterMember.avatarUrl,
      bio: '',
      bioAr: '',
    }

    setPlatforms(cur => cur.map(p =>
      p.id !== platformId ? p : {
        ...p,
        categories: p.categories.map(c =>
          c.id === categoryId ? { ...c, members: [...c.members, newMember] } : c
        ),
      }
    ))

    void addMemberToPlatform(platformId, categoryId, memberId).catch(() => {
      setActionError(lang === 'ar' ? 'تعذّرت الإضافة — تم التراجع.' : 'Could not add — reverted.')
      setPlatforms(prev)
    })
  }, [platforms, rosterById, lang])

  const handleRemoveMember = useCallback((platformId: string, memberId: string) => {
    setActionError(null)
    const prev = platforms

    setPlatforms(cur => cur.map(p =>
      p.id !== platformId ? p : {
        ...p,
        categories: p.categories.map(c => ({
          ...c,
          members: c.members.filter(m => m.id !== memberId),
        })),
      }
    ))

    void removeMemberFromPlatform(platformId, memberId).catch(() => {
      setActionError(lang === 'ar' ? 'تعذّرت الإزالة — تم التراجع.' : 'Could not remove — reverted.')
      setPlatforms(prev)
    })
  }, [platforms, lang])

  const handleMoveToCategory = useCallback((platformId: string, memberId: string, toCategoryId: string) => {
    setActionError(null)
    const prev = platforms

    setPlatforms(cur => cur.map(p => {
      if (p.id !== platformId) return p
      let moved: PlatformMemberData | null = null
      const stripped = p.categories.map(c => {
        const found = c.members.find(m => m.id === memberId)
        if (found) moved = found
        return { ...c, members: c.members.filter(m => m.id !== memberId) }
      })
      if (!moved) return p
      return {
        ...p,
        categories: stripped.map(c => c.id === toCategoryId ? { ...c, members: [...c.members, moved as PlatformMemberData] } : c),
      }
    }))

    void moveMemberToCategory(platformId, memberId, toCategoryId).catch(() => {
      setActionError(lang === 'ar' ? 'تعذّر النقل — تم التراجع.' : 'Could not move — reverted.')
      setPlatforms(prev)
    })
  }, [platforms, lang])

  const handleRenameCategory = useCallback((platformId: string, categoryId: string, newLabelEn: string, newLabelAr: string) => {
    setActionError(null)
    const prev = platforms
    const en = newLabelEn.trim() || 'Category'
    const ar = newLabelAr.trim() || 'تصنيف'

    setPlatforms(cur => cur.map(p =>
      p.id !== platformId ? p : {
        ...p,
        categories: p.categories.map(c =>
          c.id === categoryId ? { ...c, labelEn: en, labelAr: ar } : c
        ),
      }
    ))

    void renamePlatformCategory(categoryId, en, ar).catch(() => {
      setActionError(lang === 'ar' ? 'تعذّرت إعادة التسمية — تم التراجع.' : 'Could not rename — reverted.')
      setPlatforms(prev)
    })
  }, [platforms, lang])

  const handleAddCategory = useCallback((platformId: string) => {
    setActionError(null)
    const prev = platforms
    const tempId = makeTempId()
    const tempLabelEn = 'New Category'
    const tempLabelAr = 'تصنيف جديد'

    setPlatforms(cur => cur.map(p =>
      p.id !== platformId ? p : {
        ...p,
        categories: [...p.categories, { id: tempId, labelEn: tempLabelEn, labelAr: tempLabelAr, members: [] }],
      }
    ))

    addPlatformCategory(platformId, tempLabelEn, tempLabelAr)
      .then((created) => {
        setPlatforms(cur => cur.map(p =>
          p.id !== platformId ? p : {
            ...p,
            categories: p.categories.map(c => c.id === tempId ? { ...c, id: created.id } : c),
          }
        ))
      })
      .catch(() => {
        setActionError(lang === 'ar' ? 'تعذّرت الإضافة — تم التراجع.' : 'Could not add — reverted.')
        setPlatforms(prev)
      })
  }, [platforms, lang])

  const handleDeleteCategory = useCallback((platformId: string, categoryId: string) => {
    setActionError(null)
    const prev = platforms

    setPlatforms(cur => cur.map(p =>
      p.id !== platformId ? p : {
        ...p,
        categories: p.categories.filter(c => c.id !== categoryId),
      }
    ))

    void deletePlatformCategory(categoryId).catch(() => {
      setActionError(lang === 'ar' ? 'تعذّر الحذف — تم التراجع.' : 'Could not delete — reverted.')
      setPlatforms(prev)
    })
  }, [platforms, lang])

  const tx = useMemo(() => ({
    title: lang === 'ar' ? 'الأعضاء' : 'Members',
    count: (n: number) => lang === 'ar' ? `${n} عضو` : `${n} members`,
    click: lang === 'ar' ? 'اضغط لعرض أعضاء المنصات' : 'Click to view platform members',
    platforms: lang === 'ar' ? 'منصات' : 'platforms',
    empty: lang === 'ar' ? 'لا يوجد منصات بعد' : 'No platforms yet',
  }), [lang])

  const getAllMembersForPlatform = useCallback((platform: PlatformData): PlatformMemberData[] => {
    return platform.categories.flatMap(c => c.members)
  }, [])

  const previewPlatforms = useMemo(
    () => platforms.filter(p => getAllMembersForPlatform(p).length > 0).slice(0, 3),
    [platforms, getAllMembersForPlatform]
  )

  const cardStyle = useMemo<CardStyle>(() => ({
    background: bg,
    border: `1px solid ${border}`,
  }), [bg, border])

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full rounded-2xl overflow-hidden cursor-pointer select-none flex flex-col"
        style={{ ...cardStyle, height: '372px' }}
        role="button"
        tabIndex={0}
        aria-labelledby="members-card-title"
        onClick={openModal}
        onKeyDown={handleCardKeyDown}
      >
        <div className="p-5 sm:p-6 flex items-center gap-3 shrink-0"
          style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}>
          <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(69,132,130,0.1)' }}>
            <Users size={18} className="text-[#458482]" />
          </div>
          <div style={{ textAlign: 'start' }}>
            <h2 id="members-card-title" className="text-sm font-bold tracking-widest"
              style={{
                color: textMain,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                textTransform: lang === 'ar' ? 'none' : 'uppercase',
              }}>
              {tx.title}
            </h2>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
              {tx.count(totalMembers)} · {platforms.length} {tx.platforms}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2.5 px-5 py-4 overflow-hidden"
          style={{ background: isDark ? 'var(--background)' : '#f5f5ef' }}>
          {platforms.length === 0 ? (
            <p className="text-center text-[11px] font-medium" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {tx.empty}
            </p>
          ) : previewPlatforms.map((p, i) => {
            const members = getAllMembersForPlatform(p)
            return (
              <m.div key={p.id}
                initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.32 + i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  background: isDark
                    ? `linear-gradient(135deg, rgba(255,255,255,0.025), ${p.color}0d)`
                    : `linear-gradient(135deg, rgba(255,255,255,0.8), ${p.color}0a)`,
                  border: `1px solid ${p.color}28`,
                }}
              >
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: p.color, boxShadow: `0 0 5px ${p.color}70` }} />
                <span className="text-[11px] font-bold flex-1"
                  style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
                  {lang === 'ar' ? p.nameAr : p.nameEn}
                </span>
                <div className="flex" style={{ direction: 'ltr' }}>
                  {members.slice(0, 4).map((m, idx) => (
                    <div key={m.id} style={{ marginLeft: idx === 0 ? 0 : -7, zIndex: 4 - idx }}>
                      <Avatar avatarUrl={m.avatarUrl} initials={m.initials} name={m.name} size={22} color={m.color} className="text-white font-bold border-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                    </div>
                  ))}
                  {members.length > 4 && (
                    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{
                        marginLeft: -7,
                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        color: textMuted,
                        border: '2px solid rgba(255,255,255,0.12)',
                      }}>
                      +{members.length - 4}
                    </div>
                  )}
                </div>
              </m.div>
            )
          })}
          {platforms.length > 3 && (
            <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-[10px] text-center font-medium pt-1"
              style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {lang === 'ar' ? `+ ${platforms.length - 3} منصات أخرى` : `+ ${platforms.length - 3} more platforms`}
            </m.p>
          )}
        </div>

        <div className="py-3 text-center text-[10px] font-semibold shrink-0"
          style={{
            background: footerBg,
            borderTop: `1px solid ${divider}`,
            color: textMuted,
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            letterSpacing: lang === 'ar' ? 0 : '0.07em',
            textTransform: lang === 'ar' ? 'none' : 'uppercase',
          }}>
          {tx.click}
        </div>
      </m.div>

      <AnimatePresence>
        {modalOpen && (
          <m.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeModal}
          >
            <m.div
              dir={isRTL ? 'rtl' : 'ltr'}
              role="dialog"
              aria-modal="true"
              className="flex flex-col rounded-2xl overflow-hidden w-full"
              style={{
                maxWidth: 480,
                maxHeight: '82vh',
                background: bg,
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7)'
                  : '0 0 0 1px rgba(0,0,0,0.05), 0 32px 80px rgba(0,0,0,0.18)',
              }}
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0 }}
              transition={MODAL_SPRING}
              onClick={e => e.stopPropagation()}
            >
              {actionError && (
                <div className="px-4 py-2 text-[11px] font-medium shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {actionError}
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {activePlatform ? (
                  <m.div key="detail"
                    initial={{ opacity: 0, x: isRTL ? -24 : 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? 24 : -24 }}
                    transition={SLIDE_TRANSITION}
                    className="flex flex-col"
                    style={{ minHeight: 0, maxHeight: '82vh' }}
                  >
                    <PlatformPanel
                      platform={activePlatform}
                      roster={roster}
                      isAdmin={isAdmin}
                      onBack={handleBack}
                      onAddMember={handleAddMember}
                      onRemoveMember={handleRemoveMember}
                      onMoveToCategory={handleMoveToCategory}
                      onRenameCategory={handleRenameCategory}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  </m.div>
                ) : (
                  <m.div key="list"
                    initial={{ opacity: 0, x: isRTL ? 24 : -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? -24 : 24 }}
                    transition={SLIDE_TRANSITION}
                    className="flex flex-col"
                    style={{ minHeight: 0, maxHeight: '82vh' }}
                  >
                    <div className="flex items-center justify-between px-6 py-5 shrink-0"
                      style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(69,132,130,0.12)' }}>
                          <Users size={17} className="text-[#458482]" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold tracking-widest"
                            style={{
                              color: textMain,
                              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                              textTransform: lang === 'ar' ? 'none' : 'uppercase',
                            }}>
                            {tx.title}
                          </h2>
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
                            {tx.count(totalMembers)} · {platforms.length} {tx.platforms}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                        className="p-2 rounded-xl"
                        style={{ color: textMuted, cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={closeModal}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2"
                      style={{ overscrollBehavior: 'contain' }}>
                      {platforms.length === 0 ? (
                        <p className="text-center text-[12px] py-8" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                          {tx.empty}
                        </p>
                      ) : platforms.map((platform, index) => (
                        <m.div key={platform.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.025, duration: 0.2 }}
                        >
                          <PlatformChip
                            platform={platform}
                            allMembers={getAllMembersForPlatform(platform)}
                            onClick={() => setActivePlatformId(platform.id)}
                          />
                        </m.div>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  )
}

export default memo(MembersCard)