// scripts/seed-daily-verses.ts
// المكان: scripts/seed-daily-verses.ts (بجذر المشروع، جنب أي سكريبتات تانية)
//
// شغّله بـ: npx tsx scripts/seed-daily-verses.ts
// محتاج بـ .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (لازم service role — الجدول ما فيه INSERT policy عمدًا)
//
// شغّله مرة وحدة بس بعد ما تطبّق مايجريشن 021 (الجدول لازم يكون موجود قبل).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// [surah, ayah, theme][]
const REFERENCES: [number, number, string][] = [
  // الصبر
  [2, 153, 'patience'], [2, 155, 'patience'], [2, 156, 'patience'], [2, 157, 'patience'],
  [3, 200, 'patience'], [16, 127, 'patience'], [39, 10, 'patience'], [94, 5, 'patience'],
  [94, 6, 'patience'], [103, 3, 'patience'],

  // السعي والعمل
  [9, 105, 'effort'], [13, 11, 'effort'], [29, 69, 'effort'], [53, 39, 'effort'],
  [53, 40, 'effort'], [62, 10, 'effort'],

  // الإتقان والإحسان
  [2, 195, 'excellence'], [16, 90, 'excellence'], [18, 30, 'excellence'],
  [55, 60, 'excellence'], [67, 2, 'excellence'],

  // التوكل
  [3, 159, 'tawakkul'], [8, 2, 'tawakkul'], [9, 51, 'tawakkul'], [14, 12, 'tawakkul'],
  [65, 3, 'tawakkul'],

  // التعاون والوحدة
  [3, 103, 'teamwork'], [5, 2, 'teamwork'], [8, 46, 'teamwork'], [49, 10, 'teamwork'],

  // الشكر
  [2, 152, 'gratitude'], [14, 7, 'gratitude'], [16, 18, 'gratitude'], [27, 19, 'gratitude'],

  // الأمل والرحمة
  [2, 286, 'hope'], [12, 87, 'hope'], [39, 53, 'hope'], [65, 7, 'hope'],
  [94, 1, 'hope'], [94, 2, 'hope'], [94, 3, 'hope'], [94, 4, 'hope'],

  // العلم
  [20, 114, 'knowledge'], [39, 9, 'knowledge'], [58, 11, 'knowledge'],

  // الأجر والجزاء
  [4, 124, 'reward'], [18, 46, 'reward'], [76, 22, 'reward'], [99, 7, 'reward'],

  // الثقة بالله وسط الصعوبات
  [2, 216, 'trust'], [3, 139, 'trust'], [47, 7, 'trust'],
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let ok = 0;
  const failed: string[] = [];

  for (const [surah, ayah, theme] of REFERENCES) {
    const ref = `${surah}:${ayah}`;
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ref}/quran-uthmani`);
      const json = await res.json();

      if (json.code !== 200) {
        failed.push(ref);
        continue;
      }

      const { text, surah: surahInfo } = json.data;

      const { error } = await supabase.from('daily_verses').upsert(
        {
          surah_number: surah,
          ayah_number: ayah,
          surah_name_ar: surahInfo.name,           // الاسم العربي من المصدر مباشرة
          surah_name_en: surahInfo.englishName,
          arabic_text: text,
          theme,
        },
        { onConflict: 'surah_number,ayah_number' }
      );

      if (error) {
        console.error(`DB error on ${ref}:`, error.message);
        failed.push(ref);
      } else {
        ok++;
        console.log(`✓ ${ref} — ${surahInfo.name}`);
      }
    } catch (e) {
      console.error(`Fetch failed on ${ref}:`, e);
      failed.push(ref);
    }

    await sleep(250); // احترام الـ API المجاني — ما ترسلش دفعة واحدة
  }

  console.log(`\nDone: ${ok}/${REFERENCES.length} inserted.`);
  if (failed.length) console.log('Failed refs:', failed.join(', '));
}

main();