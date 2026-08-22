// src/components/dashboard/chat/ChatMemberPicker.tsx
"use client"

import React, { memo, useCallback, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import Avatar from '@/components/ui/Avatar'

export interface RosterMember {
  id: string
  name: string
  initials: string
  color: string
  avatarUrl: string | null
}

interface ChatMemberPickerProps {
  roster: RosterMember[]
  excludeIds: string[]
  selectedIds: string[]
  onToggle: (memberId: string) => void
}

function ChatMemberPicker({ roster, excludeIds, selectedIds, onToggle }: ChatMemberPickerProps) {
  const { lang } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [search, setSearch] = useState('')

  const available = useMemo(
    () =>
      roster.filter(
        (m) => !excludeIds.includes(m.id) && m.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [roster, excludeIds, search],
  )

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), [])

  return (
    <div>
      <input
        value={search}
        onChange={handleSearchChange}
        placeholder={lang === 'ar' ? 'ابحث عن عضو...' : 'Search member...'}
        className="w-full px-3 py-2 rounded-lg text-[11px] outline-none mb-2"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          color: 'var(--foreground)',
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
        }}
      />

      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {available.length === 0 ? (
          <p className="text-center text-[11px] py-4" style={{ color: 'var(--foreground-muted)' }}>
            {lang === 'ar' ? 'لا يوجد أعضاء' : 'No members found'}
          </p>
        ) : (
          available.map((m) => {
            const selected = selectedIds.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start"
                style={{
                  background: selected ? 'rgba(69,132,130,0.14)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <Avatar avatarUrl={m.avatarUrl} initials={m.initials} name={m.name} size={26} color={m.color} className="text-white font-bold" />
                <span className="flex-1 text-[12px] font-medium" style={{ color: 'var(--foreground)' }}>{m.name}</span>
                {selected && <Check size={14} style={{ color: '#458482' }} />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default memo(ChatMemberPicker)