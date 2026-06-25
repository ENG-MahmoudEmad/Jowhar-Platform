"use client"

import React, {
  memo, useCallback, useMemo, useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import { X, Users, Plus, Trash2, ChevronRight, ChevronLeft, Pencil, Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { Platform, PLATFORMS } from '@/data/platforms'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: number
  name: string
  initials: string
  color: string
  // ── PROFILE INTEGRATION ──────────────────────────────────────────────────
  // TODO: هذه الحقول ستأتي من Profile عند ربط الباك اند
  bio: string
  bioAr: string
  avatarUrl?: string
  // ── END PROFILE INTEGRATION ──────────────────────────────────────────────
}

interface Category {
  id: string
  labelEn: string
  labelAr: string
  memberIds: number[]
}

interface PlatformMembership {
  platformId: string
  categories: Category[]
}

type CardStyle = React.CSSProperties

// ─── Members data ──────────────────────────────────────────────────────────────
// TODO: استبدل هذه البيانات بـ fetch من /api/users عند ربط الباك اند

const ALL_MEMBERS: Member[] = [
  { id:  1, name: 'Jowhar',   initials: 'JW', color: '#458482', bio: 'Team Lead & Project Manager. Oversees all operations and strategic direction.',              bioAr: 'قائد الفريق ومدير المشروع. يشرف على جميع العمليات والتوجيه الاستراتيجي.' },
  { id:  2, name: 'KB',       initials: 'KB', color: '#f59e0b', bio: 'Top performer this month. Full-stack developer with a love for clean architecture.',        bioAr: 'الأفضل أداءً هذا الشهر. مطور متكامل يهتم بالكود النظيف.' },
  { id:  3, name: 'Medoma',   initials: 'MD', color: '#3b82f6', bio: 'UI/UX Designer. Creates beautiful and functional interfaces for the team.',                  bioAr: 'مصممة واجهات. تصمم تجارب جميلة وعملية للفريق.' },
  { id:  4, name: 'Tweeflue', initials: 'TW', color: '#a855f7', bio: 'Frontend Engineer. Specializes in animations and interactive experiences.',                 bioAr: 'مهندسة واجهات. متخصصة في الحركات والتجارب التفاعلية.' },
  { id:  5, name: 'Omar',     initials: 'OM', color: '#ef4444', bio: 'Backend Developer. Builds robust APIs and database architectures.',                         bioAr: 'مطور خلفيات. يبني واجهات برمجية قوية وبنى قواعد بيانات.' },
  { id:  6, name: 'Yahya',    initials: 'YH', color: '#10b981', bio: 'DevOps Engineer. Keeps the infrastructure running smoothly 24/7.',                         bioAr: 'مهندس DevOps. يحافظ على البنية التحتية تعمل بسلاسة.' },
  { id:  7, name: 'Yehia',    initials: 'YE', color: '#f97316', bio: 'Mobile Developer. Crafts seamless iOS and Android experiences.',                           bioAr: 'مطور موبايل. يصنع تجارب سلسة على iOS وAndroid.' },
  { id:  8, name: 'Sara',     initials: 'SR', color: '#ec4899', bio: 'QA Engineer. Ensures every feature meets the highest quality standards.',                   bioAr: 'مهندسة جودة. تضمن أن كل ميزة تلتزم بأعلى معايير الجودة.' },
  { id:  9, name: 'Ahmed',    initials: 'AH', color: '#2563eb', bio: 'Data Analyst. Turns raw numbers into actionable business insights.',                       bioAr: 'محلل بيانات. يحوّل الأرقام الخام إلى رؤى عملية.' },
  { id: 10, name: 'Lina',     initials: 'LN', color: '#7c3aed', bio: 'Content Strategist. Shapes the voice and messaging of the brand.',                        bioAr: 'استراتيجية محتوى. تصيغ صوت العلامة التجارية.' },
  { id: 11, name: 'Kareem',   initials: 'KR', color: '#0d9488', bio: 'Security Specialist. Protects systems and user data around the clock.',                    bioAr: 'متخصص أمن. يحمي الأنظمة وبيانات المستخدمين.' },
  { id: 12, name: 'Nour',     initials: 'NR', color: '#b91c1c', bio: 'Product Designer. Bridges the gap between user needs and business goals.',                 bioAr: 'مصممة منتجات. تجسر الفجوة بين احتياجات المستخدم وأهداف العمل.' },
  { id: 13, name: 'Tarek',    initials: 'TK', color: '#c2410c', bio: 'Cloud Architect. Designs scalable and reliable cloud infrastructure.',                     bioAr: 'مهندس سحابة. يصمم بنية سحابية قابلة للتوسع.' },
  { id: 14, name: 'Hana',     initials: 'HN', color: '#475569', bio: 'Scrum Master. Facilitates agile processes and removes team blockers.',                     bioAr: 'سكرم ماستر. تيسّر العمليات الرشيقة.' },
  { id: 15, name: 'Walid',    initials: 'WL', color: '#0891b2', bio: 'Machine Learning Engineer. Builds intelligent models for the platform.',                   bioAr: 'مهندس تعلم آلي. يبني نماذج ذكية للمنصة.' },
  { id: 16, name: 'Dina',     initials: 'DN', color: '#16a34a', bio: 'Marketing Specialist. Drives growth through creative campaigns.',                          bioAr: 'متخصصة تسويق. تقود النمو من خلال حملات إبداعية.' },
  { id: 17, name: 'Faris',    initials: 'FR', color: '#d97706', bio: 'iOS Developer. Creates polished Apple platform experiences.',                              bioAr: 'مطور iOS. يصنع تجارب مصقولة على منصات Apple.' },
  { id: 18, name: 'Maya',     initials: 'MY', color: '#78716c', bio: 'HR Manager. Nurtures team culture and coordinates hiring.',                                bioAr: 'مديرة موارد بشرية. ترعى ثقافة الفريق.' },
  { id: 19, name: 'Ziad',     initials: 'ZD', color: '#dc2626', bio: 'Android Developer. Builds high-performance Android applications.',                        bioAr: 'مطور Android. يبني تطبيقات Android عالية الأداء.' },
  { id: 20, name: 'Reem',     initials: 'RM', color: '#9333ea', bio: 'Finance Manager. Manages budgets and financial reporting.',                                bioAr: 'مديرة مالية. تدير الميزانيات والتقارير المالية.' },
  { id: 21, name: 'Sami',     initials: 'SM', color: '#0f766e', bio: 'Backend Engineer. Expert in microservices and distributed systems.',                       bioAr: 'مهندس خلفيات. خبير في الخدمات المصغرة.' },
  { id: 22, name: 'Amal',     initials: 'AM', color: '#ea580c', bio: 'Graphic Designer. Creates stunning visual assets and brand materials.',                    bioAr: 'مصممة جرافيك. تصنع أصولاً بصرية رائعة.' },
  { id: 23, name: 'Khalid',   initials: 'KH', color: '#4338ca', bio: 'Systems Engineer. Designs and maintains core platform infrastructure.',                   bioAr: 'مهندس أنظمة. يصمم ويصون البنية التحتية الأساسية.' },
  { id: 24, name: 'Rana',     initials: 'RA', color: '#db2777', bio: 'Community Manager. Engages with users and builds the community.',                         bioAr: 'مديرة مجتمع. تتفاعل مع المستخدمين وتبني المجتمع.' },
  { id: 25, name: 'Bilal',    initials: 'BL', color: '#65a30d', bio: 'Technical Writer. Creates clear documentation for developers.',                            bioAr: 'كاتب تقني. يكتب توثيقاً واضحاً للمطورين.' },
  { id: 26, name: 'Fatima',   initials: 'FT', color: '#ca8a04', bio: 'Research Lead. Conducts user research and usability testing.',                             bioAr: 'قائدة أبحاث. تجري أبحاث المستخدمين.' },
  { id: 27, name: 'Hassan',   initials: 'HS', color: '#0284c7', bio: 'Network Engineer. Manages connectivity and network performance.',                          bioAr: 'مهندس شبكات. يدير الاتصال وأداء الشبكة.' },
  { id: 28, name: 'Layla',    initials: 'LY', color: '#6d28d9', bio: 'Full-stack Developer. Versatile engineer across web and server.',                         bioAr: 'مطورة متكاملة. مهندسة متعددة المهارات.' },
  { id: 29, name: 'Mazen',    initials: 'MZ', color: '#be123c', bio: 'Game Developer. Adds gamification features to the platform.',                             bioAr: 'مطور ألعاب. يضيف ميزات التلعيب إلى المنصة.' },
  { id: 30, name: 'Noura',    initials: 'NO', color: '#0e7490', bio: 'Legal Counsel. Handles contracts, compliance and IP matters.',                             bioAr: 'مستشارة قانونية. تتعامل مع العقود والامتثال.' },
  { id: 31, name: 'Rami',     initials: 'RI', color: '#7e22ce', bio: 'SEO Specialist. Optimizes content for maximum search visibility.',                         bioAr: 'متخصص SEO. يحسّن المحتوى لأقصى ظهور في البحث.' },
  { id: 32, name: 'Sana',     initials: 'SN', color: '#b45309', bio: 'Social Media Manager. Manages all social channels and campaigns.',                        bioAr: 'مديرة وسائل التواصل. تدير جميع القنوات والحملات.' },
  { id: 33, name: 'Tariq',    initials: 'TR', color: '#15803d', bio: 'Embedded Systems Engineer. Works on hardware-software integration.',                       bioAr: 'مهندس أنظمة مدمجة. يعمل على تكامل الأجهزة والبرمجيات.' },
  { id: 34, name: 'Wafa',     initials: 'WF', color: '#be185d', bio: 'Business Analyst. Translates business needs into technical requirements.',                 bioAr: 'محللة أعمال. تترجم احتياجات العمل إلى متطلبات تقنية.' },
  { id: 35, name: 'Yousef',   initials: 'YF', color: '#1d4ed8', bio: 'Blockchain Developer. Builds decentralized solutions for the future.',                    bioAr: 'مطور بلوكتشين. يبني حلولاً لامركزية للمستقبل.' },
]

// ─── Default memberships with categories ──────────────────────────────────────

const DEFAULT_MEMBERSHIPS: PlatformMembership[] = [
  {
    platformId: 'jowhar',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [1] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [2, 3, 9, 10] },
    ],
  },
  {
    platformId: 'alwaqee',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [1] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [4, 5, 16, 24] },
    ],
  },
  {
    platformId: 'vision',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [3] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [7, 12, 22] },
    ],
  },
  {
    platformId: 'motion',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [4] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [7, 13, 17, 19] },
    ],
  },
  {
    platformId: 'brand',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [12] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [3, 22, 25, 26] },
    ],
  },
  {
    platformId: 'social',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [16] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [24, 32, 10] },
    ],
  },
  {
    platformId: 'audio',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [5] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [6, 21] },
    ],
  },
  {
    platformId: 'docs',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [26] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [25, 34, 9] },
    ],
  },
  {
    platformId: 'renders',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [1] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [2, 3, 7] },
    ],
  },
  {
    platformId: 'raw',
    categories: [
      { id: 'supervisor', labelEn: 'Platform Supervisor', labelAr: 'مشرف المنصة', memberIds: [7] },
      { id: 'members',    labelEn: 'Platform Members',  labelAr: 'أعضاء المنصة', memberIds: [13, 19, 29] },
    ],
  },
]

// ─── Animation constants ──────────────────────────────────────────────────────

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

// ─── MiniAvatar ───────────────────────────────────────────────────────────────

const MiniAvatar = memo(function MiniAvatar({
  member,
  size = 28,
}: {
  member: Member
  size?: number
}) {
  // TODO: لما تربط البروفايل، استبدل الـ initials بـ avatarUrl إذا موجودة
  // مثال: member.avatarUrl ? <img src={member.avatarUrl} ... /> : <span>{member.initials}</span>
  return (
    <div
      title={member.name}
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width:      size,
        height:     size,
        fontSize:   size * 0.32,
        background: member.color,
        border:     '2px solid rgba(255,255,255,0.12)',
        boxShadow:  `0 2px 6px ${member.color}44`,
      }}
    >
      {member.initials}
    </div>
  )
})

// ─── PlatformChip (قائمة المنصات في المودال) ─────────────────────────────────

const PlatformChip = memo(function PlatformChip({
  platform,
  allMembers,
  onClick,
}: {
  platform:   Platform
  allMembers: Member[]
  onClick:    () => void
}) {
  const { lang, isRTL } = useLang()
  const { theme }       = useTheme()
  const isDark          = theme === 'dark'
  const name            = lang === 'ar' ? platform.nameAr : platform.nameEn
  const MAX_SHOWN       = 4
  const shown           = allMembers.slice(0, MAX_SHOWN)
  const extra           = allMembers.length - MAX_SHOWN
  const firstLetter     = (lang === 'ar' ? platform.nameAr : platform.nameEn).charAt(0)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center text-start rounded-xl overflow-hidden"
      style={{
        height:     72,
        background: isDark
          ? `linear-gradient(135deg, rgba(255,255,255,0.025), ${platform.color}0e)`
          : `linear-gradient(135deg, rgba(255,255,255,0.9), ${platform.color}0a)`,
        border:     `1px solid ${platform.color}30`,
        cursor:     'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${platform.color}60`
        e.currentTarget.style.boxShadow   = `0 4px 16px ${platform.color}18`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${platform.color}30`
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative shrink-0 overflow-hidden rounded-lg m-2.5"
        style={{
          width:      52,
          height:     52,
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

      {/* Name */}
      <span className="flex-1 min-w-0 text-[12px] font-bold truncate px-1"
        style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
        {name}
      </span>

      {/* Stacked avatars */}
      <div className="flex items-center shrink-0 pe-4">
        <div className="flex" style={{ direction: 'ltr' }}>
          {shown.map((m, i) => (
            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}>
              <MiniAvatar member={m} size={24} />
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

// ─── Add Member Dropdown ──────────────────────────────────────────────────────

const AddMemberDropdown = memo(function AddMemberDropdown({
  usedIds,
  onAdd,
  onClose,
}: {
  usedIds: number[]
  onAdd:   (memberId: number) => void
  onClose: () => void
}) {
  const { lang }  = useLang()
  const { theme } = useTheme()
  const isDark    = theme === 'dark'
  const [search, setSearch] = useState('')

  const available = useMemo(
    () => ALL_MEMBERS.filter(
      m => !usedIds.includes(m.id) &&
           m.name.toLowerCase().includes(search.toLowerCase())
    ),
    [usedIds, search]
  )

  return (
    <m.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute z-30 rounded-xl overflow-hidden"
      style={{
        top:            '100%',
        insetInlineStart: 0,
        marginTop:      6,
        width:          210,
        background:     isDark ? '#161b22' : '#ffffff',
        border:         `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
        boxShadow:      '0 12px 32px rgba(0,0,0,0.3)',
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
            border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            color:      'var(--foreground)',
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
            <MiniAvatar member={m} size={26} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--foreground)' }}>{m.name}</span>
          </button>
        ))}
      </div>
    </m.div>
  )
})

// ─── Member Row ───────────────────────────────────────────────────────────────

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
  member:           Member
  isAdmin:          boolean
  isSupervisor:     boolean
  platformColor:    string
  categories:       Category[]
  categoryId:       string
  onRemove:         (memberId: number) => void
  onMoveToCategory: (memberId: number, toCategoryId: string) => void
}) {
  const { lang }  = useLang()
  const { theme } = useTheme()
  const isDark    = theme === 'dark'
  const router = useRouter()
  const [showMove, setShowMove] = useState(false)

  // ── PROFILE INTEGRATION ────────────────────────────────────────────────────
  // TODO: لما تربط البروفايل، استبدل:
  //   member.name     → profile.displayName
  //   member.bio/bioAr → profile.bio  (مُجلَب من /api/users/:id/profile)
  //   member.initials → أول حرفين من profile.displayName
  //   member.avatarUrl → <img src={profile.avatarUrl} /> بدل الـ initials
  // ── END PROFILE INTEGRATION ────────────────────────────────────────────────

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
        border:     rowBorder,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        if (!isSupervisor) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
      }}
      onMouseLeave={e => {
        if (!isSupervisor) e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Avatar */}
      <MiniAvatar member={member} size={38} />

      {/* Name + bio */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
          {member.name}
        </p>
        <p className="text-[11px] mt-0.5 truncate"
          style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
          {bio}
        </p>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative">
          {/* Move to category */}
          {otherCategories.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMove(v => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
                style={{
                  border:     `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  color:      'var(--foreground-muted)',
                  cursor:     'pointer',
                  transition: 'border-color 0.12s, color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color       = platformColor
                  e.currentTarget.style.borderColor = platformColor + '60'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color       = 'var(--foreground-muted)'
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                {lang === 'ar' ? 'نقل' : 'Move'}
              </button>

              <AnimatePresence>
                {showMove && (
                  <m.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute z-30 rounded-xl overflow-hidden py-1"
                    style={{
                      top:            '100%',
                      insetInlineEnd: 0,
                      marginTop:      4,
                      minWidth:       140,
                      background:     isDark ? '#161b22' : '#ffffff',
                      border:         `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                      boxShadow:      '0 8px 24px rgba(0,0,0,0.25)',
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
                          color:      'var(--foreground)',
                          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                          transition: 'background 0.1s',
                          cursor:     'pointer',
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

          {/* Remove */}
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

// ─── Platform Panel (detail view inside modal) ────────────────────────────────

const PlatformPanel = memo(function PlatformPanel({
  platform,
  membership,
  isAdmin,
  onBack,
  onAddMember,
  onRemoveMember,
  onMoveToCategory,
  onRenameCategory,
  onAddCategory,
  onDeleteCategory,
}: {
  platform:         Platform
  membership:       PlatformMembership
  isAdmin:          boolean
  onBack:           () => void
  onAddMember:      (platformId: string, memberId: number, categoryId: string) => void
  onRemoveMember:   (platformId: string, memberId: number) => void
  onMoveToCategory: (platformId: string, memberId: number, toCategoryId: string) => void
  onRenameCategory: (platformId: string, categoryId: string, newLabelEn: string, newLabelAr: string) => void
  onAddCategory:    (platformId: string) => void
  onDeleteCategory: (platformId: string, categoryId: string) => void
}) {
  const { lang, isRTL } = useLang()
  const { theme }       = useTheme()
  const isDark          = theme === 'dark'

  const name = lang === 'ar' ? platform.nameAr : platform.nameEn

  // per-category "add member" dropdown state
  const [addingInCategory, setAddingInCategory] = useState<string | null>(null)
  // per-category label editing
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [draftLabelEn, setDraftLabelEn] = useState('')
  const [draftLabelAr, setDraftLabelAr] = useState('')

  const totalMembers = useMemo(
    () => membership.categories.reduce((acc, c) => acc + c.memberIds.length, 0),
    [membership.categories]
  )

  // all ids already in any category (for dedup in add dropdown)
  const allUsedIds = useMemo(
    () => membership.categories.flatMap(c => c.memberIds),
    [membership.categories]
  )

  const BackIcon = isRTL ? ChevronRight : ChevronLeft

  const startRename = useCallback((catId: string, enLabel: string, arLabel: string) => {
    setEditingLabel(catId)
    setDraftLabelEn(enLabel)
    setDraftLabelAr(arLabel)
  }, [])

  const saveRename = useCallback((catId: string) => {
    const en = draftLabelEn.trim() || 'Category'
    const ar = draftLabelAr.trim() || 'تصنيف'
    onRenameCategory(platform.id, catId, en, ar)
    setEditingLabel(null)
  }, [draftLabelEn, draftLabelAr, onRenameCategory, platform.id])

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{
          background:   `linear-gradient(135deg, ${platform.color}18, ${platform.color}08)`,
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

      {/* Categories + members */}
      <div className="flex-1 overflow-y-auto py-3" style={{ overscrollBehavior: 'contain' }}>
        {membership.categories.map((category, catIndex) => {
          const catMembers = ALL_MEMBERS.filter(m => category.memberIds.includes(m.id))
          const isSupervisorCategory = catIndex === 0

          return (
            <div key={category.id} className="mb-3">
              {/* Category label row */}
              <div className="flex items-center gap-2 px-4 pb-2">
                {editingLabel === category.id ? (
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-1.5">
                      {/* EN label */}
                      <input
                        autoFocus
                        value={draftLabelEn}
                        onChange={e => setDraftLabelEn(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveRename(category.id)}
                        placeholder="English name"
                        className="flex-1 px-2 py-1 rounded-lg text-[11px] font-bold outline-none"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          border:     `1px solid ${platform.color}50`,
                          color:      'var(--foreground)',
                          fontFamily: 'var(--font-montserrat), sans-serif',
                          minWidth:   0,
                        }}
                      />
                      {/* AR label */}
                      <input
                        value={draftLabelAr}
                        onChange={e => setDraftLabelAr(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveRename(category.id)}
                        placeholder="الاسم بالعربي"
                        dir="rtl"
                        className="flex-1 px-2 py-1 rounded-lg text-[11px] font-bold outline-none"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          border:     `1px solid ${platform.color}50`,
                          color:      'var(--foreground)',
                          fontFamily: 'var(--font-cairo), sans-serif',
                          minWidth:   0,
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
                        opacity:    isSupervisorCategory ? 1 : 0.5,
                      }} />
                    <span
                      className="flex-1 font-black"
                      style={{
                        fontSize:      13,
                        color:         isSupervisorCategory ? platform.color : 'var(--foreground-muted)',
                        fontFamily:    lang === 'ar' ? 'var(--font-cairo), sans-serif' : 'var(--font-montserrat), sans-serif',
                        letterSpacing: lang === 'ar' ? '0.01em' : '0.04em',
                        textTransform: lang === 'ar' ? 'none' : 'uppercase',
                      }}
                    >
                      {lang === 'ar' ? category.labelAr : category.labelEn}
                    </span>
                    {/* Admin: rename / delete category */}
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
                        {membership.categories.length > 1 && (
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

              {/* Members in this category */}
              <AnimatePresence initial={false}>
                {catMembers.map(member => (
                  <m.div
                    key={member.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{    opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MemberRow
                      member={member}
                      isAdmin={isAdmin}
                      isSupervisor={isSupervisorCategory}
                      platformColor={platform.color}
                      categories={membership.categories}
                      categoryId={category.id}
                      onRemove={(mId) => onRemoveMember(platform.id, mId)}
                      onMoveToCategory={(mId, toId) => onMoveToCategory(platform.id, mId, toId)}
                    />
                  </m.div>
                ))}
              </AnimatePresence>

              {catMembers.length === 0 && (
                <p className="text-[11px] px-4 py-2 italic"
                  style={{ color: 'var(--foreground-muted)', opacity: 0.5, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {lang === 'ar' ? 'لا يوجد أعضاء في هذا التصنيف' : 'No members in this category'}
                </p>
              )}

              {/* Admin: add member to this category */}
              {isAdmin && (
                <div className="px-3 mt-1 relative">
                  <button
                    type="button"
                    onClick={() => setAddingInCategory(v => v === category.id ? null : category.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold w-full justify-center"
                    style={{
                      background: `${platform.color}10`,
                      border:     `1px dashed ${platform.color}40`,
                      color:      platform.color,
                      cursor:     'pointer',
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
                        usedIds={allUsedIds}
                        onAdd={(memberId) => onAddMember(platform.id, memberId, category.id)}
                        onClose={() => setAddingInCategory(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Divider between categories */}
              {catIndex < membership.categories.length - 1 && (
                <div className="mx-4 mt-3" style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              )}
            </div>
          )
        })}

        {/* Admin: add new category */}
        {isAdmin && (
          <div className="px-3 mt-2">
            <button
              type="button"
              onClick={() => onAddCategory(platform.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold w-full justify-center"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                border:     `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                color:      'var(--foreground-muted)',
                cursor:     'pointer',
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

// ─── Main component ───────────────────────────────────────────────────────────

interface MembersCardProps {
  // ── ADMIN INTEGRATION ──────────────────────────────────────────────────────
  // TODO: مرر isAdmin من auth context أو JWT claims عند ربط الباك اند
  // مثال: isAdmin={currentUser.role === 'admin'}
  isAdmin?: boolean
  // ── END ADMIN INTEGRATION ──────────────────────────────────────────────────
}

function MembersCard({ isAdmin = false }: MembersCardProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'

  const bg        = isDark ? 'var(--card)'           : '#ffffff'
  const border    = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)'
  const headerBg  = isDark ? 'var(--background-alt)' : '#f5f5ef'
  const divider   = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)'
  const textMain  = 'var(--foreground)'
  const textMuted = 'var(--foreground-muted)'
  const footerBg  = isDark ? 'rgba(13,17,23,0.5)'   : 'rgba(249,249,243,0.8)'

  const [memberships, setMemberships]       = useState<PlatformMembership[]>(DEFAULT_MEMBERSHIPS)
  const [modalOpen, setModalOpen]           = useState(false)
  const [activePlatformId, setActivePlatformId] = useState<string | null>(null)

  const totalMembers = useMemo(() => {
    const ids = new Set<number>()
    memberships.forEach(m => m.categories.forEach(c => c.memberIds.forEach(id => ids.add(id))))
    return ids.size
  }, [memberships])

  const getAllMembersForPlatform = useCallback((platformId: string): Member[] => {
    const found = memberships.find(m => m.platformId === platformId)
    if (!found) return []
    const allIds = found.categories.flatMap(c => c.memberIds)
    return ALL_MEMBERS.filter(m => allIds.includes(m.id))
  }, [memberships])

  const activePlatform = useMemo(
    () => PLATFORMS.find(p => p.id === activePlatformId) ?? null,
    [activePlatformId]
  )

  const activeMembership = useMemo(
    () => memberships.find(m => m.platformId === activePlatformId) ?? null,
    [memberships, activePlatformId]
  )

  const openModal   = useCallback(() => setModalOpen(true),  [])
  const closeModal  = useCallback(() => { setModalOpen(false); setActivePlatformId(null) }, [])
  const handleBack  = useCallback(() => setActivePlatformId(null), [])
  const handleCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    openModal()
  }, [openModal])

  // ── Membership mutations ──

  const handleAddMember = useCallback((platformId: string, memberId: number, categoryId: string) => {
    setMemberships(prev => prev.map(m =>
      m.platformId !== platformId ? m : {
        ...m,
        categories: m.categories.map(c =>
          c.id === categoryId && !c.memberIds.includes(memberId)
            ? { ...c, memberIds: [...c.memberIds, memberId] }
            : c
        ),
      }
    ))
  }, [])

  const handleRemoveMember = useCallback((platformId: string, memberId: number) => {
    setMemberships(prev => prev.map(m =>
      m.platformId !== platformId ? m : {
        ...m,
        categories: m.categories.map(c => ({
          ...c,
          memberIds: c.memberIds.filter(id => id !== memberId),
        })),
      }
    ))
  }, [])

  const handleMoveToCategory = useCallback((platformId: string, memberId: number, toCategoryId: string) => {
    setMemberships(prev => prev.map(m =>
      m.platformId !== platformId ? m : {
        ...m,
        categories: m.categories.map(c => {
          if (c.memberIds.includes(memberId) && c.id !== toCategoryId)
            return { ...c, memberIds: c.memberIds.filter(id => id !== memberId) }
          if (c.id === toCategoryId && !c.memberIds.includes(memberId))
            return { ...c, memberIds: [...c.memberIds, memberId] }
          return c
        }),
      }
    ))
  }, [])

  const handleRenameCategory = useCallback((platformId: string, categoryId: string, newLabelEn: string, newLabelAr: string) => {
    setMemberships(prev => prev.map(m =>
      m.platformId !== platformId ? m : {
        ...m,
        categories: m.categories.map(c =>
          c.id === categoryId ? { ...c, labelEn: newLabelEn, labelAr: newLabelAr } : c
        ),
      }
    ))
  }, [])

  const handleAddCategory = useCallback((platformId: string) => {
    const newId = `cat_${Date.now()}`
    setMemberships(prev => prev.map(m =>
      m.platformId !== platformId ? m : {
        ...m,
        categories: [...m.categories, { id: newId, labelEn: 'New Category', labelAr: 'تصنيف جديد', memberIds: [] }],
      }
    ))
  }, [lang])

  const handleDeleteCategory = useCallback((platformId: string, categoryId: string) => {
    setMemberships(prev => prev.map(m =>
      m.platformId !== platformId ? m : {
        ...m,
        categories: m.categories.filter(c => c.id !== categoryId),
      }
    ))
  }, [])

  const tx = useMemo(() => ({
    title:     lang === 'ar' ? 'الأعضاء'              : 'Members',
    count:     (n: number) => lang === 'ar' ? `${n} عضو` : `${n} members`,
    click:     lang === 'ar' ? 'اضغط لعرض أعضاء المنصات' : 'Click to view platform members',
    platforms: lang === 'ar' ? 'منصات' : 'platforms',
  }), [lang])

  const previewPlatforms = useMemo(
    () => PLATFORMS.filter(p => getAllMembersForPlatform(p.id).length > 0).slice(0, 3),
    [getAllMembersForPlatform]
  )

  const cardStyle = useMemo<CardStyle>(() => ({
    background: bg,
    border: `1px solid ${border}`,
  }), [bg, border])

  return (
    <LazyMotion features={domAnimation}>
      {/* ─── Card ──────────────────────────────────────────────────── */}
      <m.div
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0,  scale: 1     }}
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
        {/* Header */}
        <div className="p-5 sm:p-6 flex items-center gap-3 shrink-0"
          style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}>
          <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(69,132,130,0.1)' }}>
            <Users size={18} className="text-[#458482]" />
          </div>
          <div style={{ textAlign: 'start' }}>
            <h2 id="members-card-title" className="text-sm font-bold tracking-widest"
              style={{
                color:         textMain,
                fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                textTransform: lang === 'ar' ? 'none' : 'uppercase',
              }}>
              {tx.title}
            </h2>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
              {tx.count(totalMembers)} · {PLATFORMS.length} {tx.platforms}
            </p>
          </div>
        </div>

        {/* Body: platform preview */}
        <div className="flex-1 flex flex-col justify-center gap-2.5 px-5 py-4 overflow-hidden"
          style={{ background: isDark ? 'var(--background)' : '#f5f5ef' }}>
          {previewPlatforms.map((p, i) => {
            const members = getAllMembersForPlatform(p.id)
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
                      <MiniAvatar member={m} size={22} />
                    </div>
                  ))}
                  {members.length > 4 && (
                    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{
                        marginLeft: -7,
                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        color:      textMuted,
                        border:     '2px solid rgba(255,255,255,0.12)',
                      }}>
                      +{members.length - 4}
                    </div>
                  )}
                </div>
              </m.div>
            )
          })}
          {PLATFORMS.length > 3 && (
            <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-[10px] text-center font-medium pt-1"
              style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {lang === 'ar' ? `+ ${PLATFORMS.length - 3} منصات أخرى` : `+ ${PLATFORMS.length - 3} more platforms`}
            </m.p>
          )}
        </div>

        {/* Footer */}
        <div className="py-3 text-center text-[10px] font-semibold shrink-0"
          style={{
            background:    footerBg,
            borderTop:     `1px solid ${divider}`,
            color:         textMuted,
            fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            letterSpacing: lang === 'ar' ? 0 : '0.07em',
            textTransform: lang === 'ar' ? 'none' : 'uppercase',
          }}>
          {tx.click}
        </div>
      </m.div>

      {/* ─── Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <m.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeModal}
          >
            <m.div
              dir={isRTL ? 'rtl' : 'ltr'}
              role="dialog"
              aria-modal="true"
              className="flex flex-col rounded-2xl overflow-hidden w-full"
              style={{
                // عرض ثابت لا يتغير بين القائمة والتفصيل
                maxWidth:  480,
                maxHeight: '82vh',
                background: bg,
                border:    `1px solid ${border}`,
                boxShadow: isDark
                  ? '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7)'
                  : '0 0 0 1px rgba(0,0,0,0.05), 0 32px 80px rgba(0,0,0,0.18)',
              }}
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1,    y: 0,  opacity: 1 }}
              exit={{    scale: 0.95, y: 16, opacity: 0 }}
              transition={MODAL_SPRING}
              onClick={e => e.stopPropagation()}
            >
              <AnimatePresence mode="wait" initial={false}>
                {activePlatform && activeMembership ? (
                  /* ── Detail view ── */
                  <m.div key="detail"
                    initial={{ opacity: 0, x: isRTL ? -24 : 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: isRTL ? 24 : -24 }}
                    transition={SLIDE_TRANSITION}
                    className="flex flex-col"
                    style={{ minHeight: 0, maxHeight: '82vh' }}
                  >
                    <PlatformPanel
                      platform={activePlatform}
                      membership={activeMembership}
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
                  /* ── Platforms list ── */
                  <m.div key="list"
                    initial={{ opacity: 0, x: isRTL ? 24 : -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: isRTL ? -24 : 24 }}
                    transition={SLIDE_TRANSITION}
                    className="flex flex-col"
                    style={{ minHeight: 0, maxHeight: '82vh' }}
                  >
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-6 py-5 shrink-0"
                      style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(69,132,130,0.12)' }}>
                          <Users size={17} className="text-[#458482]" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold tracking-widest"
                            style={{
                              color:         textMain,
                              fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                              textTransform: lang === 'ar' ? 'none' : 'uppercase',
                            }}>
                            {tx.title}
                          </h2>
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
                            {tx.count(totalMembers)} · {PLATFORMS.length} {tx.platforms}
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

                    {/* Platform list */}
                    <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2"
                      style={{ overscrollBehavior: 'contain' }}>
                      {PLATFORMS.map((platform, index) => (
                        <m.div key={platform.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.025, duration: 0.2 }}
                        >
                          <PlatformChip
                            platform={platform}
                            allMembers={getAllMembersForPlatform(platform.id)}
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