// src/lib/relativeTime.ts
//
// "منذ س / د / يوم" — محسوبة بوقت العرض الفعلي (مش وقت السيرفر وقت الجلب)،
// عشان التوقيت يبقى دقيق حتى لو الصفحة قاعدة مفتوحة فترة طويلة.

export function formatRelativeTime(iso: string, lang: 'en' | 'ar'): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return lang === 'ar' ? 'الآن' : 'Just now';
  if (minutes < 60) return lang === 'ar' ? `منذ ${minutes} د` : `${minutes}m ago`;
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} س` : `${hours}h ago`;
  return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
}