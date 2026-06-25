// src/data/platforms.ts
// ─── Shared Platform data ─────────────────────────────────────────────────────
// هذا الملف هو المصدر الوحيد لبيانات المنصات
// يُستورد في: PlatformGrid.tsx, MembersCard.tsx, وأي مكوّن مستقبلي

export interface Platform {
  id:            string
  nameEn:        string
  nameAr:        string
  color:         string
  thumbnail?:    string
  // حقول الأرشيف (تُستخدم في PlatformGrid)
  description:   string
  descriptionAr: string
  folderCount:   number
  fileCount:     number
}

export const PLATFORMS: Platform[] = [
  {
    id: 'jowhar',  nameEn: 'Jowhar',        nameAr: 'جوهر',
    description:   'Educational content and published course materials.',
    descriptionAr: 'محتوى تعليمي ومواد دورات منشورة لمنصة رواق.',
    thumbnail:     '/platforms/jowhar.png',
    color: '#769171',  folderCount: 12,  fileCount: 38,
  },
  {
    id: 'alwaqee', nameEn: 'Alwaqee',       nameAr: 'الواقع',
    description:   'Platform resources, published content and media archives.',
    descriptionAr: 'موارد المنصة والمحتوى المنشور وأرشيف الوسائط.',
    thumbnail:     '/platforms/alwaqee.png',
    color: '#5ba4a0',  folderCount: 3,  fileCount: 27,
  },
  {
    id: 'vision',  nameEn: 'Vision Studio', nameAr: 'فيجن ستوديو',
    description:   '3D renders, concept art, and production-ready visual assets.',
    descriptionAr: 'نماذج ثلاثية الأبعاد وفن مفاهيمي وأصول بصرية جاهزة للإنتاج.',
    color: '#a855f7',  folderCount: 6,  fileCount: 124,
  },
  {
    id: 'motion',  nameEn: 'Motion Lab',    nameAr: 'موشن لاب',
    description:   'Animation files, After Effects projects, and VFX deliverables.',
    descriptionAr: 'ملفات حركة ومشاريع أفتر إفكتس وتسليمات المؤثرات البصرية.',
    color: '#f59e0b',  folderCount: 5,  fileCount: 87,
  },
  {
    id: 'brand',   nameEn: 'Brand Hub',     nameAr: 'براند هاب',
    description:   'Brand guidelines, logos, typography kits, and identity assets.',
    descriptionAr: 'إرشادات العلامة التجارية والشعارات وأطقم الخطوط.',
    color: '#ef4444',  folderCount: 3,  fileCount: 52,
  },
  {
    id: 'social',  nameEn: 'Social Media',  nameAr: 'سوشال ميديا',
    description:   'Published posts, stories, reels, and social content archives.',
    descriptionAr: 'منشورات وقصص وريلز وأرشيف محتوى وسائل التواصل الاجتماعي.',
    color: '#3b82f6',  folderCount: 7,  fileCount: 210,
  },
  {
    id: 'audio',   nameEn: 'Audio Vault',   nameAr: 'مخزن الصوتيات',
    description:   'Sound design, music tracks, voice-over recordings, and SFX.',
    descriptionAr: 'تصميم صوتي ومسارات موسيقية وتسجيلات صوتية ومؤثرات.',
    color: '#06b6d4',  folderCount: 4,  fileCount: 63,
  },
  {
    id: 'docs',    nameEn: 'Documentation', nameAr: 'التوثيق',
    description:   'Project briefs, scripts, storyboards, and production documents.',
    descriptionAr: 'موجزات المشروع والنصوص ولوحات القصة ووثائق الإنتاج.',
    color: '#10b981',  folderCount: 5,  fileCount: 91,
  },
  {
    id: 'renders', nameEn: 'Final Renders',  nameAr: 'النتائج النهائية',
    description:   'Exported and approved final outputs ready for delivery.',
    descriptionAr: 'المخرجات النهائية المُصدَّرة والمعتمدة الجاهزة للتسليم.',
    color: '#f97316',  folderCount: 3,  fileCount: 44,
  },
  {
    id: 'raw',     nameEn: 'Raw Footage',    nameAr: 'اللقطات الخام',
    description:   'Unedited camera footage, raw files, and original source material.',
    descriptionAr: 'لقطات الكاميرا غير المحررة والملفات الخام والمصدر الأصلي.',
    color: '#8b5cf6',  folderCount: 6,  fileCount: 178,
  },
]