"use client"

import { motion } from 'framer-motion'
import { ChevronRight, FolderOpen, FileStack } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'
import type { Platform } from '@/components/dashboard/archive/PlatformGrid'

export default function PlatformHero({ platform }: { platform: Platform }) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const router          = useRouter()
  const isDark          = theme === 'dark'

  const name = lang === 'ar' ? platform.nameAr : platform.nameEn
  const c    = platform.color

  const tx = {
    back:    lang === 'ar' ? 'الأرشيف'  : 'Archive',
    folders: lang === 'ar' ? 'مجلد'     : 'Folders',
    files:   lang === 'ar' ? 'ملف'      : 'Files',
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-2xl select-none"
      style={{
        background: isDark
          ? `linear-gradient(135deg, #161b22 0%, ${c}18 100%)`
          : `linear-gradient(135deg, #f5f5ef 0%, ${c}12 100%)`,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 70% 90% at ${isRTL ? '80%' : '20%'} 50%, ${c}18, transparent)`,
      }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
        backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px),
                          linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-0.5" style={{
        background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${c}, transparent)`,
      }} />

      <div className="relative px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">

        {/* Breadcrumb */}
        <div
          className="absolute flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
          style={{
            top: '16px',
            [isRTL ? 'right' : 'left']: '32px',
            color: 'var(--foreground-muted)',
          }}
          onClick={() => router.push('/archive')}
        >
          <span
            style={{ color: 'var(--foreground-muted)', transition: 'color 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = c }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--foreground-muted)' }}
          >
            {tx.back}
          </span>
          <ChevronRight className="w-3 h-3" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={{ color: 'var(--foreground)' }}>{lang === 'ar' ? platform.nameAr : platform.nameEn}</span>
        </div>

        {/* Logo / thumbnail */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 sm:mt-0 w-20 h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{
            background:  `linear-gradient(135deg, ${c}30, ${c}15)`,
            border:      `1px solid ${c}40`,
            boxShadow:   `0 8px 32px ${c}30`,
          }}
        >
          {platform.thumbnail
            ? <img src={platform.thumbnail} alt={name} className="w-full h-full object-cover" />
            : <span className="text-4xl font-black select-none" style={{ color: c, fontFamily: 'var(--font-display)' }}>
                {(lang === 'ar' ? platform.nameAr : platform.nameEn).charAt(0)}
              </span>
          }
        </motion.div>

        {/* Text */}
        <div className="flex-1 mt-4 sm:mt-0">
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
            style={{ color: c, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {lang === 'ar' ? 'منصة' : 'Platform'}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-black mb-2"
            style={{
              color:         'var(--foreground)',
              fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
              letterSpacing: lang === 'ar' ? 0 : '-0.02em',
            }}
          >
            {name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm"
            style={{
              color:      'var(--foreground-muted)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {lang === 'ar' ? platform.descriptionAr : platform.description}
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="flex gap-3 shrink-0"
        >
          {[
            { value: platform.folderCount, label: tx.folders, Icon: FolderOpen },
            { value: platform.fileCount,   label: tx.files,   Icon: FileStack  },
          ].map(({ value, label, Icon }) => (
            <div
              key={label}
              className="text-center px-4 py-3 rounded-xl"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border:     `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: c }} />
              <div className="text-2xl font-black" style={{ color: 'var(--foreground)', lineHeight: 1 }}>
                {value}
              </div>
              <div
                className="text-[9px] font-bold uppercase tracking-widest mt-1"
                style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
              >
                {label}
              </div>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  )
}