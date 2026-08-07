"use client"

import { useMemo } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   Normalization
   ═══════════════════════════════════════════════════════════════════════════
   Goal: "PHOTO 1", "photo1", "Photo  1" and "صورة1" should all be treatable as
   the same query once normalized — casing and whitespace/punctuation carry no
   meaning for this kind of search, they're just how someone happened to type.
   ═══════════════════════════════════════════════════════════════════════════ */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    // Arabic diacritics (tashkeel) — same word, different marks
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Alef variants → bare alef; taa marbuta → haa; alef maqsura → yaa.
    // Someone searching "مدرسة" should also find "مدرسه" and vice versa.
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    // Strip everything that isn't a letter or digit — spaces, punctuation,
    // underscores/dashes in filenames, etc. This is what makes "photo 1" and
    // "photo1" compare equal.
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '')
}

/* ═══════════════════════════════════════════════════════════════════════════
   Bilingual synonym table
   ═══════════════════════════════════════════════════════════════════════════
   A small, curated list scoped to what actually shows up in the archive
   (file-type/content-category words), not a general dictionary. Each group is
   a set of normalized forms that should all match each other. Extend this
   list as new section/content types get added rather than growing it
   unboundedly — it's meant to stay reviewable.
   ═══════════════════════════════════════════════════════════════════════════ */
const SYNONYM_GROUPS: string[][] = [
  ['صوره', 'صور', 'صوروصوره', 'photo', 'photos', 'image', 'images', 'pic', 'pics'],
  ['فيديو', 'فيديوهات', 'video', 'videos', 'clip', 'clips'],
  ['تصميم', 'تصاميم', 'design', 'designs'],
  ['ملف', 'ملفات', 'وثيقه', 'وثائق', 'مستند', 'مستندات', 'document', 'documents', 'doc', 'docs', 'file', 'files'],
  ['صوت', 'صوتي', 'اصوات', 'مقطعصوتي', 'audio', 'sound', 'voice', 'voiceover'],
  ['منشور', 'منشورات', 'بوست', 'post', 'posts'],
  ['موجز', 'brief', 'briefs'],
  ['شعار', 'لوجو', 'logo', 'logos'],
]

/** normalized token → the full synonym group it belongs to (itself included) */
const SYNONYM_INDEX: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>()
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map(normalize)
    for (const term of normalizedGroup) map.set(term, normalizedGroup)
  }
  return map
})()

/** A query token expands to itself plus any synonyms it belongs to. */
function expandToken(token: string): string[] {
  return SYNONYM_INDEX.get(token) ?? [token]
}

/**
 * True if `haystack` (already normalized, spaces stripped) contains `token`
 * or any of its synonyms.
 */
function tokenMatches(haystack: string, token: string): boolean {
  return expandToken(token).some(variant => variant.length > 0 && haystack.includes(variant))
}

/**
 * Smart multi-field search: case-insensitive, ignores spacing/punctuation,
 * matches Arabic ↔ English synonyms for common content-type words, and
 * requires every query word to match (a query of two words narrows the
 * results, same as any real search bar).
 *
 * `getFields` should return every field worth matching on for one item (name
 * in both languages, description, tag, etc). Kept as a plain array rather
 * than a single joined string so callers don't need to worry about separator
 * characters accidentally bridging two unrelated fields.
 */
export function useSmartSearch<T>(
  items:     T[],
  query:     string,
  getFields: (item: T) => (string | undefined | null)[],
): T[] {
  return useMemo(() => {
    const raw = query.trim()
    if (!raw) return items

    const queryTokens = raw.split(/\s+/).map(normalize).filter(Boolean)
    if (queryTokens.length === 0) return items

    return items.filter(item => {
      const haystack = getFields(item)
        .filter((f): f is string => !!f)
        .map(normalize)
        .join(' ')

      return queryTokens.every(token => tokenMatches(haystack, token))
    })
  }, [items, query, getFields])
}

export { normalize as normalizeSearchText }