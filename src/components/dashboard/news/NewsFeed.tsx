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
  /** Total likes from everyone, as returned by the server. */
  likes:       number
  /**
   * Whether the CURRENT user has liked this post.
   * Comes from the server (an EXISTS check against `post_likes` for this user);
   * defaults to false in mock data. See the BACKEND NOTE below.
   */
  likedByMe?:  boolean
}

/**
 * Per-post like state held by the feed.
 *
 * `liked` and `count` live in ONE piece of state on purpose. They were previously
 * two (`likedIds` + `likesMap`), which forced `setLikesMap` to be called from
 * inside the `setLikedIds` updater — a side effect inside an updater function.
 * React StrictMode invokes updaters twice in development to surface exactly this
 * kind of bug, which made the counter move by 2 while the toggle moved by 1.
 * Keeping them together makes the updater pure and the arithmetic correct.
 */
interface LikeState {
  liked: boolean
  count: number
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
    avatar: 'SA', avatarColor: '#458482', timestamp: '2h ago', likes: 24, likedByMe: false,
  },
  {
    id: 2, type: 'alert',
    title: 'Scheduled Maintenance — May 25',
    titleAr: 'صيانة مجدولة — 25 مايو',
    body: 'The platform will undergo scheduled maintenance on May 25th from 2:00 AM to 5:00 AM (GST). During this window, all services will be temporarily unavailable. Please save your work and contact support if you have urgent needs.',
    author: 'System', authorAr: 'النظام',
    avatar: 'SY', avatarColor: '#64748b', timestamp: '5h ago', likes: 8, likedByMe: false,
  },
  {
    id: 3, type: 'update',
    title: 'Render Farm — Capacity Doubled',
    titleAr: 'مزرعة الرندر — مضاعفة السعة',
    body: 'Render farm capacity has been doubled, reducing average render times by 60%. The new nodes are online and available immediately through the Tracker dashboard. No action required from your side.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    author: 'Tech Team', authorAr: 'الفريق التقني',
    avatar: 'TT', avatarColor: '#a855f7', timestamp: '1d ago', likes: 41, likedByMe: true,
  },
  {
    id: 4, type: 'announcement',
    title: 'Q2 Creative Review — Save the Date',
    titleAr: 'مراجعة الربع الثاني — احجز الموعد',
    body: 'The Q2 Creative Review is scheduled for June 3rd at 10:00 AM in the main conference room. All department heads are required to present their team\'s progress. Presentations must be submitted by May 30th.',
    author: 'Studio Admin', authorAr: 'إدارة الاستوديو',
    avatar: 'SA', avatarColor: '#458482', timestamp: '2d ago', likes: 17, likedByMe: false,
  },
  {
    id: 5, type: 'update',
    title: 'New Asset Library Available',
    titleAr: 'مكتبة الأصول الجديدة متاحة',
    body: 'A new shared asset library is now available containing over 500 rigged character templates, background plates, and VFX elements. Access it from your project workspace under the Resources tab.',
    author: 'Content Team', authorAr: 'فريق المحتوى',
    avatar: 'CT', avatarColor: '#3b82f6', timestamp: '3d ago', likes: 33, likedByMe: false,
  },
  {
    id: 6, type: 'alert',
    title: 'Storage Quota Warning',
    titleAr: 'تحذير حصة التخزين',
    body: 'Several project workspaces are approaching their storage limit (90%+). Please review and archive completed project files as soon as possible. Contact IT support if you need a temporary quota increase.',
    author: 'IT Support', authorAr: 'الدعم التقني',
    avatar: 'IT', avatarColor: '#ef4444', timestamp: '4d ago', likes: 5, likedByMe: false,
  },
]

function buildInitialLikes(posts: NewsPost[]): Record<number, LikeState> {
  return Object.fromEntries(
    posts.map(p => [p.id, { liked: p.likedByMe ?? false, count: p.likes }]),
  )
}

const EMPTY_LIKE_STATE: LikeState = { liked: false, count: 0 }

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
  /** Takes the post id, so the parent can pass one stable callback for every card. */
  onLike:  (id: number) => void
  onClick: (post: NewsPost) => void
}) {
  const handleLike = useCallback(() => onLike(post.id), [onLike, post.id])

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
          onLike={handleLike}
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

  const [likes, setLikes] = useState<Record<number, LikeState>>(
    () => buildInitialLikes(INITIAL_POSTS),
  )

  /**
   * One like per user, enforced by toggling a boolean rather than incrementing a
   * free counter — the same person can never like twice.
   *
   * The updater is pure (no nested setState, no API call inside), which is what
   * makes it safe under StrictMode's double invocation.
   */
  const toggleLike = useCallback((id: number) => {
    setLikes(prev => {
      const current = prev[id] ?? EMPTY_LIKE_STATE
      return {
        ...prev,
        [id]: {
          liked: !current.liked,
          count: current.count + (current.liked ? -1 : 1),
        },
      }
    })

    // TODO(backend): fire the toggle request here and roll back on failure.
    // Keep it OUTSIDE the updater above — see the note on LikeState.
  }, [])

  const getLikeState = useCallback(
    (post: NewsPost): LikeState => likes[post.id] ?? { liked: post.likedByMe ?? false, count: post.likes },
    [likes],
  )

  const filtered = useMemo(() => posts.filter(p => {
    const matchType   = type === 'all' || p.type === type
    const q           = search.toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.titleAr.includes(q)
    return matchType && matchSearch
  }), [posts, search, type])

  const handlePost = useCallback((newPost: NewsPost) => {
    setPosts(prev => [newPost, ...prev])
    setLikes(prev => ({ ...prev, [newPost.id]: { liked: false, count: 0 } }))
  }, [])

  const handleOpenComposer = useCallback(() => setComposer(true), [])
  const handleCloseComposer = useCallback(() => setComposer(false), [])
  const handleCloseModal = useCallback(() => setModal(null), [])

  /* Reads `modal` directly instead of reaching into a setState updater — the old
     version called toggleLike from inside setModal's updater, which double-fired
     under StrictMode. */
  const handleModalLike = useCallback(() => {
    if (modal) toggleLike(modal.id)
  }, [modal, toggleLike])

  const modalLikeState = modal ? getLikeState(modal) : EMPTY_LIKE_STATE

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
            {filtered.map(post => {
              const state = getLikeState(post)
              return (
                <NewsPostItem
                  key={post.id}
                  post={post}
                  liked={state.liked}
                  likes={state.count}
                  onLike={toggleLike}
                  onClick={setModal}
                />
              )
            })}
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
        liked={modalLikeState.liked}
        likes={modalLikeState.count}
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

/* ═══════════════════════════════════════════════════════════════════════════
   BACKEND NOTE — per-user likes
   ═══════════════════════════════════════════════════════════════════════════
   Likes are a toggle per (post, user), not a free counter. The frontend already
   enforces this, but the database is what actually guarantees it:

     create table post_likes (
       post_id    bigint not null references news_posts(id) on delete cascade,
       user_id    uuid   not null references users(id)      on delete cascade,
       created_at timestamptz not null default now(),
       primary key (post_id, user_id)
     );

   The composite primary key is the real safeguard — even a duplicated request or
   a double click that slips past the UI cannot insert a second row.

   The feed query should return, per post:
     likes      → count of rows in post_likes for that post
     likedByMe  → exists(select 1 from post_likes where post_id = ... and user_id = auth.uid())

   Both fields already exist on NewsPost, and `buildInitialLikes` seeds state from
   them, so wiring this up requires no component changes.

   Toggling: prefer a single RPC that inserts or deletes and returns the new count,
   rather than a read-then-write from the client. Keep the optimistic update where
   it is (instant feedback), fire the request in `toggleLike` AFTER the setState
   call, and roll back on failure.

   RLS: a user may insert or delete only rows where user_id = auth.uid(); everyone
   may read. Otherwise one member could like on another's behalf.
   ═══════════════════════════════════════════════════════════════════════════ */