// src/app/(dashboard)/news/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasCapability } from '@/app/(dashboard)/adminControl/guards';
import NewsHero from "@/components/dashboard/news/NewsHero";
import NewsFeed, { type NewsPostData, type CurrentUserSummary } from "@/components/dashboard/news/NewsFeed";

// شكل الصف الراجع من get_news_feed() بالظبط (migration 20260803121200)
type NewsFeedRow = {
  id: number;
  type: 'announcement' | 'update' | 'alert';
  title_en: string;
  title_ar: string;
  body: string;
  image_url: string | null;
  author_id: string;
  author_name: string;
  author_initials: string;
  author_color: string;
  author_avatar_url: string | null;
  created_at: string;
  publish_at: string | null;
  expires_at: string | null;
  is_upcoming: boolean;
  likes_count: number;
  liked_by_me: boolean;
};

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name, color, avatar_url, is_chief, is_developer, access_role')
    .eq('id', user.id)
    .single();

  const canPublishNews = viewerProfile
    ? await hasCapability(
        supabase,
        {
          id: user.id,
          isDeveloper: viewerProfile.is_developer,
          isChief: viewerProfile.is_chief,
          accessRole: viewerProfile.access_role,
        },
        'news.publish'
      )
    : false;

  const currentUser: CurrentUserSummary = {
    id: user.id,
    name: `${viewerProfile?.first_name ?? ''} ${viewerProfile?.last_name ?? ''}`.trim() || '—',
    initials: `${viewerProfile?.first_name?.[0] ?? ''}${viewerProfile?.last_name?.[0] ?? ''}`.toUpperCase() || '—',
    color: viewerProfile?.color || '#0d9488',
    avatarUrl: viewerProfile?.avatar_url ?? null,
  };

  /*
    تفعيل فوري لإشعارات الأخبار المجدولة يلي وصل وقتها.

    ليش هون: أقصى تكرار مسموح لـ Vercel Cron بخطة Hobby هو مرة باليوم
    بس (شوف vercel.json) — مش كافي لوحده لخبر لازم يوصل بسرعة معقولة
    من وقته المجدول. فبنخلي فتح صفحة الأخبار نفسها "توقظ" الفحص.

    fire-and-forget صراحة (بدون await): ما بدنا نأخّر عرض الصفحة
    بانتظار نتيجة الدالة. لو فشلت لأي سبب، الـcron اليومي شبكة أمان
    بتلتقطها بأسوأ الأحوال خلال 24 ساعة.
  */
  void supabase.rpc('notify_due_news_posts');

  const { data: feedRows } = await supabase.rpc('get_news_feed');

  const posts: NewsPostData[] = (feedRows as NewsFeedRow[] ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    titleEn: row.title_en,
    titleAr: row.title_ar,
    body: row.body,
    imageUrl: row.image_url,
    authorId: row.author_id,
    authorName: row.author_name?.trim() || '—',
    authorInitials: row.author_initials || '—',
    authorColor: row.author_color || '#0d9488',
    authorAvatarUrl: row.author_avatar_url,
    createdAt: row.created_at,
    publishAt: row.publish_at,
    expiresAt: row.expires_at,
    isUpcoming: row.is_upcoming,
    likesCount: row.likes_count,
    likedByMe: row.liked_by_me,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section>
        <NewsHero />
      </section>

      <section>
        <NewsFeed initialPosts={posts} isAdmin={canPublishNews} currentUser={currentUser} />
      </section>
    </div>
  );
}