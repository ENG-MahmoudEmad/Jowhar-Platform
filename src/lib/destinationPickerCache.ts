// src/lib/destinationPickerCache.ts
// كاش بسيط بالمتصفح (module-level، بيضل موجود طول الجلسة) لبيانات
// DestinationPicker. الفتحة الأولى للمودال بتنتظر السيرفر عادي، بس أي
// فتحة تانية لنفس المسار (حتى لو من مكوّن تاني) بتطلع فورًا من الكاش.
//
// ⚠️ الكاش ما بيتحدّث تلقائيًا لو انضاف/انحذف شي بالخلفية أثناء الجلسة —
// مقبول هون لأنه بيانات تصفّح لمودال قصير العمر (مفتوح لثواني)، مش شاشة
// دائمة. لو صار محتاج دقة أعلى، أسهل حل: امسح الكاش (clearDestinationPickerCache)
// بعد أي عملية إضافة/حذف ناجحة بصفحة الأرشيف.

type CacheEntry<T> = { data: T; expiresAt: number }

const TTL_MS = 2 * 60 * 1000 // دقيقتين — كافي لمدة استخدام المودال المعتادة

const platformsCache = new Map<string, CacheEntry<any>>()
const worksCache      = new Map<string, CacheEntry<any>>()
const sectionsCache   = new Map<string, CacheEntry<any>>()
const itemsCache      = new Map<string, CacheEntry<any>>()

function getFresh<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) { cache.delete(key); return undefined }
  return entry.data
}

function setFresh<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS })
}

export const destinationPickerCache = {
  getPlatforms: () => getFresh(platformsCache, 'all'),
  setPlatforms: (data: any) => setFresh(platformsCache, 'all', data),

  getWorks: (platformId: string) => getFresh(worksCache, platformId),
  setWorks: (platformId: string, data: any) => setFresh(worksCache, platformId, data),

  getSections: (workId: string) => getFresh(sectionsCache, workId),
  setSections: (workId: string, data: any) => setFresh(sectionsCache, workId, data),

  getItems: (sectionId: string) => getFresh(itemsCache, sectionId),
  setItems: (sectionId: string, data: any) => setFresh(itemsCache, sectionId, data),
}

/** نظّف الكاش كامل — استدعيها بعد أي إضافة/حذف ناجح إذا بدك دقة أعلى. */
export function clearDestinationPickerCache() {
  platformsCache.clear()
  worksCache.clear()
  sectionsCache.clear()
  itemsCache.clear()
}