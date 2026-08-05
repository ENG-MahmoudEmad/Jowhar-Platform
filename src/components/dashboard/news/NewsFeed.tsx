"use client"

import React, { useState, useMemo, useCallback, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Newspaper } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { formatRelativeTime } from '@/lib/relativeTime'
import { togglePostLike, deleteNewsPost } from '@/app/(dashboard)/news/newsActions'
import NewsFilters  from './NewsFilters'
import NewsCard     from './NewsCard'
import NewsModal    from './NewsModal'
import NewsComposer from './NewsComposer'

/* ─── Types ─── */
export type NewsType = 'all' | 'announcement' | 'update' | 'alert'

export interface RichSegment {
  text:     string;
  bold?:    boolean;
  italic?:  boolean;
  color?:   string;
  bullet?:  boolean;
  /** فاصل سطر — مش نص فعلي، بس علامة "خلّص هالسطر ابدأ سطر جديد". */
  newline?: boolean;
}

// شكل العرض الداخلي — يلي NewsCard/NewsModal بتستهلكه
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
  avatarUrl:   string | null
  timestamp:   string
  likes:       number
  likedByMe?:  boolean
  /** خبر مجدول للمستقبل — ظاهر للأدمن بس، ببادج "قادم". */
  isUpcoming:  boolean
  publishAt:   string | null
}

// شكل البيانات الراجعة من get_news_feed() بعد التحويل بـ page.tsx —
// مصدر واحد قبل ما يتحوّل لشكل NewsPost أعلاه (بحساب timestamp حسب اللغة الحالية)
export interface NewsPostData {
  id: number
  type: Exclude<NewsType, 'all'>
  titleEn: string
  titleAr: string
  body: string
  imageUrl: string | null
  authorId: string
  authorName: string
  authorInitials: string
  authorColor: string
  authorAvatarUrl: string | null
  createdAt: string
  publishAt: string | null
  expiresAt: string | null
  isUpcoming: boolean
  likesCount: number
  likedByMe: boolean
}

export interface CurrentUserSummary {
  id: string
  name: string
  initials: string
  color: string
  avatarUrl: string | null
}

interface NewsFeedProps {
  initialPosts: NewsPostData[]
  /** true لو المستخدم Chief/Developer أو حامل صلاحية news.publish. */
  isAdmin: boolean
  currentUser: CurrentUserSummary
}

interface LikeState {
  liked: boolean
  count: number
}

const EMPTY_LIKE_STATE: LikeState = { liked: false, count: 0 }

const ADD_BTN_STYLE: React.CSSProperties = { background: '#458482', color: '#ffffff', border: 'none' }
const COLUMNS_STYLE: React.CSSProperties = { columnGap: '16px' }
const FADE_TRANSITION = { duration: 0.18 }
const CARD_ENTRY_TRANSITION = { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const }
const EMPTY_ICON_STYLE: React.CSSProperties = { color: 'var(--foreground-muted)', opacity: 0.35 }

function toDisplayPost(data: NewsPostData, lang: 'en' | 'ar'): NewsPost {
  return {
    id: data.id,
    type: data.type,
    title: data.titleEn,
    titleAr: data.titleAr,
    body: data.body,
    image: data.imageUrl ?? undefined,
    // ما في اسم مترجم منفصل بالداتابيز (شخص واحد بس) — نفس الاسم بالاتجاهين.
    author: data.authorName,
    authorAr: data.authorName,
    avatar: data.authorInitials,
    avatarColor: data.authorColor,
    avatarUrl: data.authorAvatarUrl,
    timestamp: formatRelativeTime(data.createdAt, lang),
    likes: data.likesCount,
    likedByMe: data.likedByMe,
    isUpcoming: data.isUpcoming,
    publishAt: data.publishAt,
  }
}

const NewsPostItem = memo(function NewsPostItem({
  post, index, liked, likes, isAdmin, onLike, onClick, onDelete,
}: {
  post:    NewsPost
  index:   number
  liked:   boolean
  likes:   number
  isAdmin: boolean
  onLike:  (id: number) => void
  onClick: (post: NewsPost) => void
  onDelete: (id: number) => void
}) {
  const handleLike = useCallback(() => onLike(post.id), [onLike, post.id])
  const handleDelete = useCallback(() => onDelete(post.id), [onDelete, post.id])

  const entryTransition = useMemo(
    () => ({ ...CARD_ENTRY_TRANSITION, delay: Math.min(index * 0.04, 0.24) }),
    [index],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={entryTransition}
      className="break-inside-avoid mb-4"
    >
      <NewsCard
        post={post}
        liked={liked}
        likes={likes}
        isAdmin={isAdmin}
        onLike={handleLike}
        onClick={onClick}
        onDelete={handleDelete}
      />
    </motion.div>
  )
})

function NewsFeed({ initialPosts, isAdmin, currentUser }: NewsFeedProps) {
  const { lang, isRTL } = useLang()

  const [postsData, setPostsData] = useState<NewsPostData[]>(initialPosts)
  const [search,   setSearch]   = useState('')
  const [type,     setType]     = useState<NewsType>('all')
  const [modal,    setModal]    = useState<NewsPost | null>(null)
  const [composer, setComposer] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [likes, setLikes] = useState<Record<number, LikeState>>(
    () => Object.fromEntries(initialPosts.map(p => [p.id, { liked: p.likedByMe, count: p.likesCount }])),
  )

  const posts = useMemo(() => postsData.map(p => toDisplayPost(p, lang)), [postsData, lang])

  /**
   * Optimistic toggle + استدعاء فعلي لـ toggle_post_like() بالسيرفر.
   * لو فشل، رجوع للحالة القديمة (نفس نمط باقي المشروع).
   */
  const toggleLike = useCallback((id: number) => {
    const prevState = likes[id] ?? EMPTY_LIKE_STATE

    setLikes(prevAll => {
      const current = prevAll[id] ?? EMPTY_LIKE_STATE
      return {
        ...prevAll,
        [id]: {
          liked: !current.liked,
          count: current.count + (current.liked ? -1 : 1),
        },
      }
    })

    togglePostLike(id)
      .then((result) => {
        // نطابق مع الرقم الحقيقي من السيرفر (في حال تعارض توقيت)
        setLikes(prevAll => ({ ...prevAll, [id]: { liked: result.liked, count: result.likesCount } }))
      })
      .catch(() => {
        setActionError(lang === 'ar' ? 'تعذّر تسجيل الإعجاب.' : 'Could not register the like.')
        setLikes(prevAll => ({ ...prevAll, [id]: prevState }))
      })
  }, [likes, lang])

  const getLikeState = useCallback(
    (post: NewsPost): LikeState => likes[post.id] ?? EMPTY_LIKE_STATE,
    [likes],
  )

  const filtered = useMemo(() => posts.filter(p => {
    const matchType   = type === 'all' || p.type === type
    const q           = search.toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.titleAr.includes(q)
    return matchType && matchSearch
  }), [posts, search, type])

  /**
   * مفتاح الحاوية مبني على محتوى النتيجة الفعلي (IDs)، مش اسم الفلتر —
   * لو نفس الكاردز بالظبط ظاهرة بفلترين مختلفين (مثلاً كارت واحد بس
   * موجود، فهو نفسه ظاهر بـ "الكل" و"تنبيه" مع بعض)، المفتاح بيضل
   * نفسه، فـ React ما بيعتبرها عنصر جديد وما بيشغّل أي حركة — الكارت
   * بيضل مكانه بالظبط بدون ما يختفي ويرجع يظهر.
   */
  const gridKey = useMemo(() => filtered.map(p => p.id).join('-'), [filtered])

  /**
   * الكومبوزر بيكون خلّص الرفع للـ Storage والنشر الفعلي (createNewsPost)
   * قبل ما ينادي هالدالة — هون بس منضيف النتيجة لأول القائمة محليًا.
   */
  const handlePost = useCallback((newPost: NewsPostData) => {
    setPostsData(prev => [newPost, ...prev])
    setLikes(prev => ({ ...prev, [newPost.id]: { liked: false, count: 0 } }))
  }, [])

  const handleOpenComposer = useCallback(() => setComposer(true), [])
  const handleCloseComposer = useCallback(() => setComposer(false), [])
  const handleCloseModal = useCallback(() => setModal(null), [])

  const handleDeletePost = useCallback((id: number) => {
    const prev = postsData
    setPostsData(cur => cur.filter(p => p.id !== id))
    setModal(cur => (cur && cur.id === id ? null : cur))

    deleteNewsPost(id).catch(() => {
      setActionError(lang === 'ar' ? 'تعذّر حذف الخبر — تم التراجع.' : 'Could not delete the post — reverted.')
      setPostsData(prev)
    })
  }, [postsData, lang])

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
      {actionError && (
        <div className="mb-4 px-4 py-2 rounded-xl text-[11px] font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {actionError}
        </div>
      )}

      {/* Filters + add button */}
      <div className="flex items-stretch gap-3 mb-6">
        <div className="flex-1">
          <NewsFilters search={search} type={type} onSearch={setSearch} onType={setType} />
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenComposer}
            className="flex items-center gap-2 px-4 rounded-2xl text-[11px] font-bold cursor-pointer shrink-0"
            style={addBtnTextStyle}
          >
            <Plus className="w-4 h-4" />
            {lang === 'ar' ? 'إضافة' : 'Add Post'}
          </button>
        )}
      </div>

      {/* Cards — masonry columns. CSS multi-column (columns-*) بيعيد
          حساب توزيع الأعمدة بطريقة غير متوقّعة لو صار فيه تداخل زمني
          بين كاردز بتختفي وكاردز بتتحرك لمكان جديد بنفس اللحظة —
          هيك السبب الحقيقي لمشكلة "القفزة". الحل: القديم يختفي بالكامل
          (mode="wait") قبل ما الجديد يبلش يظهر — صفر تداخل، صفر تخبيط.
          الكاردز الجديدة بتدخل بحركة متتالية لطيفة (stagger) بدل ما
          تطلع كلها دفعة وحدة. */}
      <AnimatePresence mode="wait">
        {filtered.length > 0 ? (
          <motion.div
            key={gridKey}
            className="columns-1 md:columns-2 xl:columns-3"
            style={COLUMNS_STYLE}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE_TRANSITION}
          >
            {filtered.map((post, index) => {
              const state = getLikeState(post)
              return (
                <NewsPostItem
                  key={post.id}
                  index={index}
                  post={post}
                  liked={state.liked}
                  likes={state.count}
                  isAdmin={isAdmin}
                  onLike={toggleLike}
                  onClick={setModal}
                  onDelete={handleDeletePost}
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
        isAdmin={isAdmin}
        onClose={handleCloseModal}
        onLike={handleModalLike}
        onDelete={handleDeletePost}
      />

      {isAdmin && (
        <NewsComposer
          open={composer}
          onClose={handleCloseComposer}
          onPost={handlePost}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

export default memo(NewsFeed)