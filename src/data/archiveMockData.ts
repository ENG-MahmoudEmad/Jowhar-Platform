//src\data\archiveMockData.ts
/**
 * All mock data + shared types for the Archive feature, in one place with
 * zero component imports.
 *
 * Why this file exists: SectionGrid.tsx, SectionTabs.tsx, and
 * DestinationPicker.tsx used to import mock data directly from each other
 * (e.g. DestinationPicker importing INITIAL_ITEMS from SectionGrid, while
 * SectionGrid imported DestinationPicker itself for copy/move). That's a
 * circular import — module A needs module B fully evaluated before A can
 * finish, and B needs A the same way — which crashes at runtime with
 * "Cannot access '...' before initialization" the moment the bundler picks
 * an unlucky evaluation order. Pulling all shared data into this leaf module
 * (nothing here imports any component) means every component can depend on
 * it without ever depending on each other for data.
 *
 * BACKEND NOTE: everything in this file is seed/mock data standing in for
 * real Supabase queries. Types here should track the real table shapes
 * fairly closely so swapping a mock array for a `select()` call later is a
 * small diff, not a rewrite.
 */

/* ══════════════════════════════════════════════════════════════════════
   Platform (Level 1)
   ══════════════════════════════════════════════════════════════════════ */
export interface Platform {
  id:            string
  nameEn:        string
  nameAr:        string
  description:   string
  descriptionAr: string
  thumbnail?:    string
  color:         string
  folderCount:   number
  fileCount:     number
  /**
   * TEMPORARY stand-in for real membership. Once wired to the backend, this
   * should stop being a static per-platform flag and instead be computed per
   * *current user* from `platform_team_members`. Chief Admin / Developer
   * always bypass this regardless of membership.
   */
  locked?:       boolean
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
    locked: true, // demo only — see the `locked` field note above
  },
]

/* ══════════════════════════════════════════════════════════════════════
   Work (Level 2)
   ══════════════════════════════════════════════════════════════════════ */
export interface Work {
  id:            string
  platformId:    string
  nameEn:        string
  nameAr:        string
  description:   string
  descriptionAr: string
  thumbnail?:    string
  sectionCount:  number
  fileCount:     number
}

export const WORKS: Work[] = [
  {
    id: 'film-1', platformId: 'jowhar', nameEn: 'The First Film', nameAr: 'الفلم الأول',
    description:   'Short animated film — first production of the season.',
    descriptionAr: 'فيلم أنيميشن قصير — أول إنتاج بالموسم.',
    sectionCount: 3, fileCount: 18,
  },
  {
    id: 'film-2', platformId: 'jowhar', nameEn: 'The Second Film', nameAr: 'الفلم الثاني',
    description:   'Second production, currently in post-production.',
    descriptionAr: 'الإنتاج الثاني، حاليًا بمرحلة ما بعد الإنتاج.',
    sectionCount: 3, fileCount: 24,
  },
  {
    id: 'film-3', platformId: 'jowhar', nameEn: 'The Third Film', nameAr: 'الفلم الثالث',
    description:   'Third production — early storyboard stage.',
    descriptionAr: 'الإنتاج الثالث — مرحلة اللوحة القصصية المبكرة.',
    sectionCount: 2, fileCount: 7,
  },
]

/* ══════════════════════════════════════════════════════════════════════
   Section (Level 3) — icon library + mock sections
   ══════════════════════════════════════════════════════════════════════ */
import {
  FolderOpen, Video, Image as ImageIcon, Music, FileText, Palette,
  Film, Mic, Archive, Layers, Sparkles, Camera, PenTool,
} from 'lucide-react'

/**
 * Curated set an admin picks from when creating a section — not an open text
 * field, so every section icon renders consistently. The *key* is what gets
 * persisted (`Section.icon`), not the component itself.
 */
export const SECTION_ICONS = {
  folder:  FolderOpen,
  video:   Video,
  image:   ImageIcon,
  music:   Music,
  file:    FileText,
  palette: Palette,
  film:    Film,
  mic:     Mic,
  archive: Archive,
  layers:  Layers,
  sparkles:Sparkles,
  camera:  Camera,
  pen:     PenTool,
} as const

export type SectionIconKey = keyof typeof SECTION_ICONS

export interface Section {
  id:            string
  nameEn:        string
  nameAr:        string
  description:   string
  descriptionAr: string
  itemCount:     number
  icon:          SectionIconKey
}

/**
 * ⚠️ Architectural note: this is ONE shared list reused across every Work in
 * the current mock (not scoped per work_id). The real backend must scope
 * sections by `work_id` — see the BACKEND NOTE in SectionTabs.tsx for the
 * full explanation and the migration this implies.
 */
export const INITIAL_SECTIONS: Section[] = [
  {
    id: 'published',
    nameEn: 'Published Posts',   nameAr: 'المنشورات',
    description: 'All published social media posts.',
    descriptionAr: 'جميع المنشورات المنشورة على وسائل التواصل الاجتماعي.',
    itemCount: 14, icon: 'folder',
  },
  {
    id: 'videos',
    nameEn: 'Videos',            nameAr: 'الفيديوهات',
    description: 'Produced and published video content.',
    descriptionAr: 'محتوى الفيديو المنتج والمنشور.',
    itemCount: 8, icon: 'video',
  },
  {
    id: 'designs',
    nameEn: 'Designs',           nameAr: 'التصاميم',
    description: 'Graphic design assets and deliverables.',
    descriptionAr: 'أصول التصميم الجرافيكي والمخرجات.',
    itemCount: 22, icon: 'palette',
  },
  {
    id: 'documents',
    nameEn: 'Documents',         nameAr: 'الوثائق',
    description: 'Scripts, briefs, and production documents.',
    descriptionAr: 'النصوص والموجزات ووثائق الإنتاج.',
    itemCount: 6, icon: 'file',
  },
]

/* ══════════════════════════════════════════════════════════════════════
   Item (Level 4) + File Type registry
   ══════════════════════════════════════════════════════════════════════ */
export interface ArchiveItem {
  id:            string
  sectionId:     string
  nameEn:        string
  nameAr:        string
  description:   string
  descriptionAr: string
  /** See the BACKEND NOTE in SectionGrid.tsx — data URLs are a preview-only
      stand-in and must never be persisted as-is. */
  thumbnail?:    string
  /** Whole-folder Drive link (Level 5's "Open Full Drive Folder" reads this),
      not a single-file link — see SectionGrid.tsx / FileList.tsx. */
  driveUrl:      string
  tag?:          string   // key into `DEFAULT_FILE_TYPES` / the live `file_types` registry
}

export const INITIAL_ITEMS: ArchiveItem[] = [
  { id: '1', sectionId: 'published', nameEn: 'Post #1',   nameAr: 'منشور 1',  description: 'Instagram carousel — product launch',       descriptionAr: 'كاروسيل إنستغرام — إطلاق المنتج',       driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '2', sectionId: 'published', nameEn: 'Post #2',   nameAr: 'منشور 2',  description: 'Twitter thread graphics pack',               descriptionAr: 'حزمة رسومات سلسلة تويتر',               driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '3', sectionId: 'published', nameEn: 'Post #3',   nameAr: 'منشور 3',  description: 'LinkedIn cover image series',                descriptionAr: 'سلسلة صور غلاف لينكدإن',                driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '4', sectionId: 'published', nameEn: 'Post #4',   nameAr: 'منشور 4',  description: 'Ramadan campaign visual set',                descriptionAr: 'مجموعة بصريات حملة رمضان',              driveUrl: 'https://drive.google.com', tag: 'PNG' },
  { id: '5', sectionId: 'videos',    nameEn: 'Video #1',  nameAr: 'فيديو 1',  description: 'Brand intro animation 30s',                  descriptionAr: 'انيميشن تعريف العلامة التجارية 30 ثانية', driveUrl: 'https://drive.google.com', tag: 'MP4' },
  { id: '6', sectionId: 'videos',    nameEn: 'Video #2',  nameAr: 'فيديو 2',  description: 'Product demo reel',                          descriptionAr: 'ريل عرض المنتج',                         driveUrl: 'https://drive.google.com', tag: 'MP4' },
  { id: '7', sectionId: 'designs',   nameEn: 'Design #1', nameAr: 'تصميم 1',  description: 'Motion graphics project file',               descriptionAr: 'ملف مشروع موشن جرافيك',                 driveUrl: 'https://drive.google.com', tag: 'AE'  },
  { id: '8', sectionId: 'designs',   nameEn: 'Design #2', nameAr: 'تصميم 2',  description: 'Logo animation source file',                 descriptionAr: 'ملف مصدر انيميشن الشعار',               driveUrl: 'https://drive.google.com', tag: 'AE'  },
  { id: '9', sectionId: 'documents', nameEn: 'Brief #1',  nameAr: 'موجز 1',   description: 'Q1 campaign creative brief',                 descriptionAr: 'الموجز الإبداعي لحملة الربع الأول',      driveUrl: 'https://drive.google.com', tag: 'PDF' },
]

export interface FileType {
  key:   string
  color: string
}

/**
 * Starting set — the admin can extend this from the Add Item/File modal
 * (new extension + a chosen color). See BACKEND NOTE: this needs a real
 * `file_types` table so additions persist for everyone, not just this
 * browser tab.
 */
export const DEFAULT_FILE_TYPES: FileType[] = [
  { key: 'AE',    color: '#9d6bff' },
  { key: 'PNG',   color: '#10b981' },
  { key: 'MP4',   color: '#ef4444' },
  { key: 'PDF',   color: '#f59e0b' },
  { key: 'BLEND', color: '#f97316' },
]