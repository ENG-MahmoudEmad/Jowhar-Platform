"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pencil, Check, Users } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: number
  name: string
  initials: string
  color: string
  bio: string
  bioAr: string
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const MEMBERS: Member[] = [
  { id:  1, name: 'Jowhar',   initials: 'JW', color: '#458482', bio: 'Team Lead & Project Manager. Oversees all operations and strategic direction.', bioAr: 'قائد الفريق ومدير المشروع. يشرف على جميع العمليات والتوجيه الاستراتيجي.' },
  { id:  2, name: 'KB',       initials: 'KB', color: '#f59e0b', bio: 'Top performer this month. Full-stack developer with a love for clean architecture.', bioAr: 'الأفضل أداءً هذا الشهر. مطور متكامل يهتم بالكود النظيف.' },
  { id:  3, name: 'Medoma',   initials: 'MD', color: '#3b82f6', bio: 'UI/UX Designer. Creates beautiful and functional interfaces for the team.', bioAr: 'مصممة واجهات. تصمم تجارب جميلة وعملية للفريق.' },
  { id:  4, name: 'Tweeflue', initials: 'TW', color: '#a855f7', bio: 'Frontend Engineer. Specializes in animations and interactive experiences.', bioAr: 'مهندسة واجهات. متخصصة في الحركات والتجارب التفاعلية.' },
  { id:  5, name: 'Omar',     initials: 'OM', color: '#ef4444', bio: 'Backend Developer. Builds robust APIs and database architectures.', bioAr: 'مطور خلفيات. يبني واجهات برمجية قوية وبنى قواعد بيانات.' },
  { id:  6, name: 'Yahya',    initials: 'YH', color: '#10b981', bio: 'DevOps Engineer. Keeps the infrastructure running smoothly 24/7.', bioAr: 'مهندس DevOps. يحافظ على البنية التحتية تعمل بسلاسة على مدار الساعة.' },
  { id:  7, name: 'Yehia',    initials: 'YE', color: '#f97316', bio: 'Mobile Developer. Crafts seamless iOS and Android experiences.', bioAr: 'مطور موبايل. يصنع تجارب سلسة على iOS وAndroid.' },
  { id:  8, name: 'Sara',     initials: 'SR', color: '#ec4899', bio: 'QA Engineer. Ensures every feature meets the highest quality standards.', bioAr: 'مهندسة جودة. تضمن أن كل ميزة تلتزم بأعلى معايير الجودة.' },
  { id:  9, name: 'Ahmed',    initials: 'AH', color: '#2563eb', bio: 'Data Analyst. Turns raw numbers into actionable business insights.', bioAr: 'محلل بيانات. يحوّل الأرقام الخام إلى رؤى عملية.' },
  { id: 10, name: 'Lina',     initials: 'LN', color: '#7c3aed', bio: 'Content Strategist. Shapes the voice and messaging of the brand.', bioAr: 'استراتيجية محتوى. تصيغ صوت العلامة التجارية ورسائلها.' },
  { id: 11, name: 'Kareem',   initials: 'KR', color: '#0d9488', bio: 'Security Specialist. Protects systems and user data around the clock.', bioAr: 'متخصص أمن. يحمي الأنظمة وبيانات المستخدمين على مدار الساعة.' },
  { id: 12, name: 'Nour',     initials: 'NR', color: '#b91c1c', bio: 'Product Designer. Bridges the gap between user needs and business goals.', bioAr: 'مصممة منتجات. تجسر الفجوة بين احتياجات المستخدم وأهداف العمل.' },
  { id: 13, name: 'Tarek',    initials: 'TK', color: '#c2410c', bio: 'Cloud Architect. Designs scalable and reliable cloud infrastructure.', bioAr: 'مهندس سحابة. يصمم بنية سحابية قابلة للتوسع وموثوقة.' },
  { id: 14, name: 'Hana',     initials: 'HN', color: '#475569', bio: 'Scrum Master. Facilitates agile processes and removes team blockers.', bioAr: 'سكرم ماستر. تيسّر العمليات الرشيقة وتزيل العوائق عن الفريق.' },
  { id: 15, name: 'Walid',    initials: 'WL', color: '#0891b2', bio: 'Machine Learning Engineer. Builds intelligent models for the platform.', bioAr: 'مهندس تعلم آلي. يبني نماذج ذكية للمنصة.' },
  { id: 16, name: 'Dina',     initials: 'DN', color: '#16a34a', bio: 'Marketing Specialist. Drives growth through creative campaigns.', bioAr: 'متخصصة تسويق. تقود النمو من خلال حملات إبداعية.' },
  { id: 17, name: 'Faris',    initials: 'FR', color: '#d97706', bio: 'iOS Developer. Creates polished Apple platform experiences.', bioAr: 'مطور iOS. يصنع تجارب مصقولة على منصات Apple.' },
  { id: 18, name: 'Maya',     initials: 'MY', color: '#78716c', bio: 'HR Manager. Nurtures team culture and coordinates hiring.', bioAr: 'مديرة موارد بشرية. ترعى ثقافة الفريق وتنسق التوظيف.' },
  { id: 19, name: 'Ziad',     initials: 'ZD', color: '#dc2626', bio: 'Android Developer. Builds high-performance Android applications.', bioAr: 'مطور Android. يبني تطبيقات Android عالية الأداء.' },
  { id: 20, name: 'Reem',     initials: 'RM', color: '#9333ea', bio: 'Finance Manager. Manages budgets and financial reporting.', bioAr: 'مديرة مالية. تدير الميزانيات والتقارير المالية.' },
  { id: 21, name: 'Sami',     initials: 'SM', color: '#0f766e', bio: 'Backend Engineer. Expert in microservices and distributed systems.', bioAr: 'مهندس خلفيات. خبير في الخدمات المصغرة والأنظمة الموزعة.' },
  { id: 22, name: 'Amal',     initials: 'AM', color: '#ea580c', bio: 'Graphic Designer. Creates stunning visual assets and brand materials.', bioAr: 'مصممة جرافيك. تصنع أصولاً بصرية رائعة ومواد العلامة التجارية.' },
  { id: 23, name: 'Khalid',   initials: 'KH', color: '#4338ca', bio: 'Systems Engineer. Designs and maintains core platform infrastructure.', bioAr: 'مهندس أنظمة. يصمم ويصون البنية التحتية الأساسية للمنصة.' },
  { id: 24, name: 'Rana',     initials: 'RA', color: '#db2777', bio: 'Community Manager. Engages with users and builds the community.', bioAr: 'مديرة مجتمع. تتفاعل مع المستخدمين وتبني المجتمع.' },
  { id: 25, name: 'Bilal',    initials: 'BL', color: '#65a30d', bio: 'Technical Writer. Creates clear documentation for developers.', bioAr: 'كاتب تقني. يكتب توثيقاً واضحاً للمطورين.' },
  { id: 26, name: 'Fatima',   initials: 'FT', color: '#ca8a04', bio: 'Research Lead. Conducts user research and usability testing.', bioAr: 'قائدة أبحاث. تجري أبحاث المستخدمين واختبارات قابلية الاستخدام.' },
  { id: 27, name: 'Hassan',   initials: 'HS', color: '#0284c7', bio: 'Network Engineer. Manages connectivity and network performance.', bioAr: 'مهندس شبكات. يدير الاتصال وأداء الشبكة.' },
  { id: 28, name: 'Layla',    initials: 'LY', color: '#6d28d9', bio: 'Full-stack Developer. Versatile engineer across web and server.', bioAr: 'مطورة متكاملة. مهندسة متعددة المهارات على الويب والخادم.' },
  { id: 29, name: 'Mazen',    initials: 'MZ', color: '#be123c', bio: 'Game Developer. Adds gamification features to the platform.', bioAr: 'مطور ألعاب. يضيف ميزات التلعيب إلى المنصة.' },
  { id: 30, name: 'Noura',    initials: 'NO', color: '#0e7490', bio: 'Legal Counsel. Handles contracts, compliance and IP matters.', bioAr: 'مستشارة قانونية. تتعامل مع العقود والامتثال وملكية فكرية.' },
  { id: 31, name: 'Rami',     initials: 'RI', color: '#7e22ce', bio: 'SEO Specialist. Optimizes content for maximum search visibility.', bioAr: 'متخصص SEO. يحسّن المحتوى لأقصى ظهور في البحث.' },
  { id: 32, name: 'Sana',     initials: 'SN', color: '#b45309', bio: 'Social Media Manager. Manages all social channels and campaigns.', bioAr: 'مديرة وسائل التواصل. تدير جميع القنوات والحملات الاجتماعية.' },
  { id: 33, name: 'Tariq',    initials: 'TR', color: '#15803d', bio: 'Embedded Systems Engineer. Works on hardware-software integration.', bioAr: 'مهندس أنظمة مدمجة. يعمل على تكامل الأجهزة والبرمجيات.' },
  { id: 34, name: 'Wafa',     initials: 'WF', color: '#be185d', bio: 'Business Analyst. Translates business needs into technical requirements.', bioAr: 'محللة أعمال. تترجم احتياجات العمل إلى متطلبات تقنية.' },
  { id: 35, name: 'Yousef',   initials: 'YF', color: '#1d4ed8', bio: 'Blockchain Developer. Builds decentralized solutions for the future.', bioAr: 'مطور بلوكتشين. يبني حلولاً لامركزية للمستقبل.' },
]

// ─── Belt constants ───────────────────────────────────────────────────────────

const CLOUD_H     = 200
const AVATAR_SIZE = 48
const GAP         = 18
const STEP        = AVATAR_SIZE + GAP           // 66 px per slot
const TOTAL_W     = MEMBERS.length * STEP       // full belt width
const BELT_SPEED  = 0.44                        // px / rAF frame
const DOCK_RADIUS = 110                         // px — mouse influence zone
const DOCK_MAX    = 1.65                        // max scale at cursor

// ── Seeded-random Y per avatar so layout looks organic, not grid-like ──
// Each avatar gets a unique Y locked for its lifetime (stable across renders)
const AVATAR_Y: number[] = MEMBERS.map((_, i) => {
  // deterministic "random" via simple hash
  const seed = (i * 2654435761) >>> 0
  const t = (seed % 1000) / 1000            // 0..1
  const margin = AVATAR_SIZE / 2 + 6
  return margin + t * (CLOUD_H - AVATAR_SIZE - margin * 2)
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function MembersCard() {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  // palette — mirrors TeamProgress exactly
  const bg        = isDark ? 'var(--card)'           : '#ffffff'
  const border    = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)'
  const headerBg  = isDark ? 'var(--background-alt)' : '#f5f5ef'
  const divider   = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)'
  const textMain  = 'var(--foreground)'
  const textMuted = 'var(--foreground-muted)'
  const footerBg  = isDark ? 'rgba(13,17,23,0.5)'   : 'rgba(249,249,243,0.8)'
  const cloudBg   = isDark ? 'var(--background)'     : '#f0f0e8'
  const rowHover  = isDark ? 'rgba(255,255,255,0.03)': 'rgba(0,0,0,0.025)'

  const tx = {
    title:  lang === 'ar' ? 'الأعضاء'                 : 'Members',
    count:  (n: number) => lang === 'ar' ? `${n} عضو` : `${n} members`,
    click:  lang === 'ar' ? 'اضغط لعرض جميع الأعضاء' : 'Click to view all members',
    admin:  lang === 'ar' ? 'وضع الأدمن'              : 'Admin Mode',
    edit:   lang === 'ar' ? 'تعديل'                   : 'Edit',
    save:   lang === 'ar' ? 'حفظ'                     : 'Save',
    cancel: lang === 'ar' ? 'إلغاء'                   : 'Cancel',
    noBio:  lang === 'ar' ? 'لا توجد نبذة بعد.'       : 'No bio yet.',
  }

  // ── belt animation ──
  const cloudRef  = useRef<HTMLDivElement>(null)
  const rafRef    = useRef<number>(0)
  const offsetRef = useRef(0)
  const mouseRef  = useRef({ x: -999, y: -999 })

  // frames[i] = { x, scale, visible }
  // visible = avatar is inside the unmasked zone (not being clipped) → controls opacity
  const [frames, setFrames] = useState<{ x: number; scale: number; opacity: number }[]>(
    MEMBERS.map((_, i) => ({ x: i * STEP, scale: 1, opacity: 1 }))
  )

  const dir = isRTL ? 1 : -1

  useEffect(() => {
    const FADE_START = 0.13   // fraction of cloud width where fade begins
    const FADE_END   = 0.0    // fully transparent at edge

    const tick = () => {
      offsetRef.current += BELT_SPEED * dir
      if (dir < 0 && offsetRef.current < -TOTAL_W) offsetRef.current += TOTAL_W
      if (dir > 0 && offsetRef.current >  TOTAL_W) offsetRef.current -= TOTAL_W

      const cloudEl = cloudRef.current
      const cloudW  = cloudEl?.offsetWidth ?? 320
      const rect    = cloudEl?.getBoundingClientRect()
      const mx      = rect ? mouseRef.current.x - rect.left : -999
      const my      = rect ? mouseRef.current.y - rect.top  : -999

      setFrames(
        MEMBERS.map((_, i) => {
          const rawX = offsetRef.current + i * STEP
          const x    = ((rawX % TOTAL_W) + TOTAL_W) % TOTAL_W
          const cx   = x + AVATAR_SIZE / 2
          const cy   = AVATAR_Y[i] + AVATAR_SIZE / 2

          // ── dock scale ──
          const dist  = Math.hypot(cx - mx, cy - my)
          const scale = dist < DOCK_RADIUS
            ? 1 + (DOCK_MAX - 1) * Math.pow(1 - dist / DOCK_RADIUS, 1.8)
            : 1

          // ── edge opacity — avatar fades as it enters/exits the mask zone ──
          // Left edge: x goes 0 → fadeZone; right edge: x goes (cloudW-fadeZone) → cloudW
          const fadeZone = cloudW * FADE_START
          let opacity = 1
          if (x < fadeZone) {
            opacity = x / fadeZone
          } else if (x + AVATAR_SIZE > cloudW - fadeZone) {
            opacity = (cloudW - (x + AVATAR_SIZE)) / fadeZone
          }
          opacity = Math.max(0, Math.min(1, opacity))

          return { x, scale, opacity }
        })
      )
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [dir])

  useEffect(() => {
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── modal ──
  const [modalOpen,  setModalOpen]  = useState(false)
  const [isAdmin,    setIsAdmin]    = useState(false)
  const [bios, setBios] = useState<Record<number, string>>(
    Object.fromEntries(MEMBERS.map(m => [m.id, lang === 'ar' ? m.bioAr : m.bio]))
  )
  const [editingId,  setEditingId]  = useState<number | null>(null)
  const [draftBio,   setDraftBio]   = useState('')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const openModal  = () => setModalOpen(true)
  const closeModal = () => { setModalOpen(false); setEditingId(null) }
  const startEdit  = (id: number) => { setEditingId(id); setDraftBio(bios[id] || '') }
  const saveBio    = (id: number) => {
    setBios(p => ({ ...p, [id]: draftBio.trim() || tx.noBio }))
    setEditingId(null)
  }

  useEffect(() => {
    setBios(Object.fromEntries(MEMBERS.map(m => [m.id, lang === 'ar' ? m.bioAr : m.bio])))
  }, [lang])

  // ── render ──
  return (
    <>
      {/* ─── Card ──────────────────────────────────────────────────────────── */}
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{ background: bg, border: `1px solid ${border}` }}
        onClick={openModal}
      >
        {/* Header — same structure as TeamProgress */}
        <div
          className="p-5 sm:p-6 flex items-center justify-between"
          style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(69,132,130,0.1)' }}>
              <Users size={18} className="text-[#458482]" />
            </div>
            <div style={{ textAlign: 'start' }}>
              <h2
                className="text-sm font-bold tracking-widest"
                style={{
                  color: textMain,
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                  textTransform: lang === 'ar' ? 'none' : 'uppercase',
                }}
              >
                {tx.title}
              </h2>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
                {tx.count(MEMBERS.length)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Conveyor belt — overflow:hidden clips avatars at real edges ── */}
        <div
          ref={cloudRef}
          className="relative overflow-hidden"
          style={{ height: CLOUD_H, background: cloudBg }}
        >
          {frames.map(({ x, scale, opacity }, i) => {
            const member = MEMBERS[i]
            return (
              <div
                key={member.id}
                className="absolute flex items-center justify-center rounded-full font-bold text-white"
                style={{
                  width:      AVATAR_SIZE,
                  height:     AVATAR_SIZE,
                  left:       x,
                  top:        AVATAR_Y[i],
                  background: member.color,
                  border:     '2px solid rgba(255,255,255,0.13)',
                  boxShadow:  '0 4px 16px rgba(0,0,0,0.2)',
                  fontSize:   13,
                  // scale driven by JS, opacity smooth-interpolated by JS
                  transform:  `scale(${scale})`,
                  opacity,
                  // NO CSS transition on opacity/transform — JS drives both at 60fps
                  // This ensures avatars clip at the edge instead of lingering
                  willChange: 'transform, opacity',
                  zIndex:     scale > 1.05 ? 10 : 1,
                }}
              >
                {member.initials}
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        <div
          className="py-3 text-center text-[10px] font-semibold"
          style={{
            background: footerBg,
            borderTop: `1px solid ${divider}`,
            color: textMuted,
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            letterSpacing: lang === 'ar' ? 0 : '0.07em',
            textTransform: lang === 'ar' ? 'none' : 'uppercase',
          }}
        >
          {tx.click}
        </div>
      </div>

      {/* ─── Modal ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeModal}
          >
            <motion.div
              dir={isRTL ? 'rtl' : 'ltr'}
              className="flex flex-col rounded-2xl overflow-hidden w-full max-w-lg"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                maxHeight: '82vh',
                boxShadow: isDark
                  ? '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7)'
                  : '0 0 0 1px rgba(0,0,0,0.05), 0 32px 80px rgba(0,0,0,0.18)',
              }}
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1,    y: 0,  opacity: 1 }}
              exit={{    scale: 0.95, y: 16, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320, mass: 0.8 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div
                className="flex items-center justify-between px-6 py-5 shrink-0"
                style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ background: 'rgba(69,132,130,0.12)' }}>
                    <Users size={17} className="text-[#458482]" />
                  </div>
                  <div>
                    <h2
                      className="text-sm font-bold tracking-widest"
                      style={{
                        color: textMain,
                        fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                        textTransform: lang === 'ar' ? 'none' : 'uppercase',
                      }}
                    >
                      {tx.title}
                    </h2>
                    <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
                      {tx.count(MEMBERS.length)}
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: textMuted, background: 'transparent' }}
                  onMouseEnter={e => {
                    const b = e.currentTarget as HTMLButtonElement
                    b.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                    b.style.color = textMain
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget as HTMLButtonElement
                    b.style.background = 'transparent'
                    b.style.color = textMuted
                  }}
                  onClick={closeModal}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Scrollable member list */}
              <div className="overflow-y-auto flex-1">
                {MEMBERS.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.018, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-4 px-5 py-3.5"
                    style={{
                      borderBottom: index < MEMBERS.length - 1 ? `1px solid ${divider}` : 'none',
                      background: hoveredRow === member.id ? rowHover : 'transparent',
                      // instant hover — no CSS transition delay
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={() => setHoveredRow(member.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Avatar */}
                    <div
                      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
                      style={{
                        width: 42, height: 42, fontSize: 12,
                        background: member.color,
                        border: '2px solid rgba(255,255,255,0.12)',
                        boxShadow: `0 2px 8px ${member.color}55`,
                      }}
                    >
                      {member.initials}
                    </div>

                    {/* Name + bio */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p
                        className="text-[13px] font-semibold leading-tight"
                        style={{ color: textMain }}
                      >
                        {member.name}
                      </p>

                      {editingId === member.id ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <textarea
                            className="w-full rounded-lg px-3 py-2 text-[12px] resize-none outline-none"
                            style={{
                              background: isDark ? 'var(--background)' : '#f5f5ef',
                              border: '1px solid #458482',
                              color: textMain,
                              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                              lineHeight: 1.55,
                            }}
                            rows={3}
                            value={draftBio}
                            onChange={e => setDraftBio(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-opacity hover:opacity-80"
                              style={{ background: '#458482', color: '#fff' }}
                              onClick={() => saveBio(member.id)}
                            >
                              <Check size={11} /> {tx.save}
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                              style={{
                                color: textMuted,
                                border: `1px solid ${divider}`,
                                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                              }}
                              onClick={() => setEditingId(null)}
                            >
                              {tx.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-[12px] mt-1 leading-relaxed"
                          style={{
                            color: textMuted,
                            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                          }}
                        >
                          {bios[member.id] || tx.noBio}
                        </p>
                      )}
                    </div>

                    {/* Admin edit button */}
                    {isAdmin && editingId !== member.id && (
                      <button
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold mt-0.5"
                        style={{
                          color: textMuted,
                          border: `1px solid ${divider}`,
                          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                          transition: 'color 0.12s, border-color 0.12s',
                        }}
                        onMouseEnter={e => {
                          const b = e.currentTarget as HTMLButtonElement
                          b.style.color = '#458482'; b.style.borderColor = '#458482'
                        }}
                        onMouseLeave={e => {
                          const b = e.currentTarget as HTMLButtonElement
                          b.style.color = textMuted; b.style.borderColor = divider
                        }}
                        onClick={() => startEdit(member.id)}
                      >
                        <Pencil size={10} /> {tx.edit}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Admin toggle footer */}
              <div
                className="flex items-center gap-3 px-6 py-3.5 shrink-0"
                style={{
                  background: footerBg,
                  borderTop: `1px solid ${divider}`,
                }}
              >
                <button
                  className="relative rounded-full shrink-0"
                  style={{
                    width: 34, height: 18,
                    background: isAdmin ? '#458482' : (isDark ? '#2a2a2a' : '#d1d5db'),
                    transition: 'background 0.2s',
                  }}
                  onClick={() => { setIsAdmin(a => !a); setEditingId(null) }}
                >
                  <span
                    className="absolute rounded-full bg-white"
                    style={{
                      width: 12, height: 12, top: 3,
                      left: isAdmin ? 19 : 3,
                      transition: 'left 0.18s ease',
                    }}
                  />
                </button>
                <span
                  className="text-[11px] font-medium cursor-pointer"
                  style={{
                    color: isAdmin ? '#458482' : textMuted,
                    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    transition: 'color 0.2s',
                  }}
                  onClick={() => { setIsAdmin(a => !a); setEditingId(null) }}
                >
                  {tx.admin}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}