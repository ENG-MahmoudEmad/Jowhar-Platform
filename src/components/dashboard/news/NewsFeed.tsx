"use client"

import React, { useState, useMemo, useCallback, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Newspaper } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import NewsFilters  from './NewsFilters'
import NewsCard     from './NewsCard'
import NewsModal    from './NewsModal'
import NewsComposer from './NewsComposer'

/* ─── Types ─── */
export type NewsType = 'all' | 'announcement' | 'update' | 'alert'

export interface RichSegment {
  text:   string;
  bold?:  boolean;
  color?: string;
  bullet?:boolean;
}

export interface NewsPost {
  id:          number
  type:        Exclude<NewsType, 'all'>
  title:       string
  titleAr:     string
  body:        string
  image?:      string
  author:      string
  authorAr:    string
  avatar:      string
  avatarColor: string
  timestamp:   string
  likes:       number
}

/* ─── Mock Data ─── */
const d = (offset: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() + offset)
  const diff = Math.abs(offset)
  if (diff === 0) return 'Just now'
  if (diff < 1)   return `${Math.round(diff * 24)}h ago`
  return `${diff}d ago`
}

const INITIAL_POSTS: NewsPost[] = [
  {
    id: 1, type: 'announcement',
    title: 'New Project Management System Launch',
    titleAr: 'إطلاق نظام إدارة المشاريع الجديد',
    body: 'We are excited to announce the full launch of Jowhar Platform v2. This major update brings enhanced task management, real-time collaboration tools, and a completely revamped interface designed for animation studios. All teams will be migrated automatically over the next 48 hours.',
    image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
    author: 'Studio Admin', authorAr: 'إدارة الاستوديو',
    avatar: 'SA', avatarColor: '#458482', timestamp: '2h ago', likes: 24,
  },
  {
    id: 2, type: 'alert',
    title: 'Scheduled Maintenance — May 25',
    titleAr: 'صيانة مجدولة — 25 مايو',
    body: 'The platform will undergo scheduled maintenance on May 25th from 2:00 AM to 5:00 AM (GST). During this window, all services will be temporarily unavailable. Please save your work and contact support if you have urgent needs.',
    author: 'System', authorAr: 'النظام',
    avatar: 'SY', avatarColor: '#64748b', timestamp: '5h ago', likes: 8,
  },
  {
    id: 3, type: 'update',
    title: 'Render Farm — Capacity Doubled',
    titleAr: 'مزرعة الرندر — مضاعفة السعة',
    body: 'Render farm capacity has been doubled, reducing average render times by 60%. The new nodes are online and available immediately through the Tracker dashboard. No action required from your side.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    author: 'Tech Team', authorAr: 'الفريق التقني',
    avatar: 'TT', avatarColor: '#a855f7', timestamp: '1d ago', likes: 41,
  },
  {
    id: 4, type: 'announcement',
    title: 'Q2 Creative Review — Save the Date',
    titleAr: 'مراجعة الربع الثاني — احجز الموعد',
    body: 'The Q2 Creative Review is scheduled for June 3rd at 10:00 AM in the main conference room. All department heads are required to present their team\'s progress. Presentations must be submitted by May 30th.',
    author: 'Studio Admin', authorAr: 'إدارة الاستوديو',
    avatar: 'SA', avatarColor: '#458482', timestamp: '2d ago', likes: 17,
  },
  {
    id: 5, type: 'update',
    title: 'New Asset Library Available',
    titleAr: 'مكتبة الأصول الجديدة متاحة',
    body: 'A new shared asset library is now available containing over 500 rigged character templates, background plates, and VFX elements. Access it from your project workspace under the Resources tab.',
    author: 'Content Team', authorAr: 'فريق المحتوى',
    avatar: 'CT', avatarColor: '#3b82f6', timestamp: '3d ago', likes: 33,
  },
  {
    id: 6, type: 'alert',
    title: 'Storage Quota Warning',
    titleAr: 'تحذير حصة التخزين',
    body: 'Several project workspaces are approaching their storage limit (90%+). Please review and archive completed project files as soon as possible. Contact IT support if you need a temporary quota increase.',
    author: 'IT Support', authorAr: 'الدعم التقني',
    avatar: 'IT', avatarColor: '#ef4444', timestamp: '4d ago', likes: 5,
  },
]

const INITIAL_LIKES_MAP: Record<number, number> = Object.fromEntries(INITIAL_POSTS.map(p => [p.id, p.likes]))

const ADD_BTN_STYLE: React.CSSProperties = { background: '#458482', color: '#ffffff', border: 'none' }
const COLUMNS_STYLE: React.CSSProperties = { columnGap: '16px' }
const FADE_TRANSITION = { duration: 0.18 }
const CARD_ENTRY_TRANSITION = { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const }
const EMPTY_ICON_STYLE: React.CSSProperties = { color: 'var(--foreground-muted)', opacity: 0.35 }

const NewsPostItem = memo(function NewsPostItem({
  post, liked, likes, onLike, onClick,
}: {
  post:    NewsPost
  liked:   boolean
  likes:   number
  onLike:  () => void
  onClick: (post: NewsPost) => void
}) {
  return (
    <div className="break-inside-avoid mb-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CARD_ENTRY_TRANSITION}
      >
        <NewsCard
          post={post}
          liked={liked}
          likes={likes}
          onLike={onLike}
          onClick={onClick}
        />
      </motion.div>
    </div>
  )
})

function NewsFeed() {
  const { lang, isRTL } = useLang()

  const [posts,    setPosts]    = useState<NewsPost[]>(INITIAL_POSTS)
  const [search,   setSearch]   = useState('')
  const [type,     setType]     = useState<NewsType>('all')
  const [modal,    setModal]    = useState<NewsPost | null>(null)
  const [composer, setComposer] = useState(false)

  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  const [likesMap, setLikesMap] = useState<Record<number, number>>(INITIAL_LIKES_MAP)

  const toggleLike = useCallback((id: number) => {
    setLikedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); setLikesMap(m => ({ ...m, [id]: (m[id] ?? 0) - 1 })) }
      else               { next.add(id);    setLikesMap(m => ({ ...m, [id]: (m[id] ?? 0) + 1 })) }
      return next
    })
  }, [])

  const filtered = useMemo(() => posts.filter(p => {
    const matchType   = type === 'all' || p.type === type
    const q           = search.toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.titleAr.includes(q)
    return matchType && matchSearch
  }), [posts, search, type])

  const handlePost = useCallback((newPost: NewsPost) => {
    setPosts(prev => [newPost, ...prev])
    setLikesMap(m => ({ ...m, [newPost.id]: 0 }))
  }, [])

  const handleOpenComposer = useCallback(() => setComposer(true), [])
  const handleCloseComposer = useCallback(() => setComposer(false), [])
  const handleCloseModal = useCallback(() => setModal(null), [])
  const handleModalLike = useCallback(() => { setModal(m => { if (m) toggleLike(m.id); return m }) }, [toggleLike])

  const handleCardLikeMap = useMemo(() => {
    const map = new Map<number, () => void>()
    filtered.forEach(p => map.set(p.id, () => toggleLike(p.id)))
    return map
  }, [filtered, toggleLike])

  const addBtnTextStyle = useMemo(() => ({
    ...ADD_BTN_STYLE,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  const emptyTextStyle = useMemo(() => ({
    color: 'var(--foreground-muted)',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters + add button */}
      <div className="flex items-stretch gap-3 mb-6">
        <div className="flex-1">
          <NewsFilters search={search} type={type} onSearch={setSearch} onType={setType} />
        </div>
        <button
          onClick={handleOpenComposer}
          className="flex items-center gap-2 px-4 rounded-2xl text-[11px] font-bold cursor-pointer shrink-0"
          style={addBtnTextStyle}
        >
          <Plus className="w-4 h-4" />
          {lang === 'ar' ? 'إضافة' : 'Add Post'}
        </button>
      </div>

      {/* Cards — masonry columns, key resets animation on filter change */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div
            key={`${type}-${search}`}
            className="columns-1 md:columns-2 xl:columns-3"
            style={COLUMNS_STYLE}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE_TRANSITION}
          >
            {filtered.map(post => (
              <NewsPostItem
                key={post.id}
                post={post}
                liked={likedIds.has(post.id)}
                likes={likesMap[post.id] ?? post.likes}
                onLike={handleCardLikeMap.get(post.id)!}
                onClick={setModal}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <Newspaper className="w-8 h-8" style={EMPTY_ICON_STYLE} />
            <p className="text-[11px] font-semibold" style={emptyTextStyle}>
              {lang === 'ar' ? 'لا توجد نتائج' : 'No posts found'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <NewsModal
        post={modal}
        liked={modal ? likedIds.has(modal.id) : false}
        likes={modal ? (likesMap[modal.id] ?? modal.likes) : 0}
        onClose={handleCloseModal}
        onLike={handleModalLike}
      />

      <NewsComposer
        open={composer}
        onClose={handleCloseComposer}
        onPost={handlePost}
      />
    </div>
  )
}

export default memo(NewsFeed)