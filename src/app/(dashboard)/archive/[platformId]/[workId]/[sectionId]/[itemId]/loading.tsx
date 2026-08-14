// src/app/(dashboard)/archive/[platform]/[work]/[section]/[item]/loading.tsx
// Level 4 — FileListClient breadcrumb header + FileList

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`} style={style} />;
}

function BreadcrumbHeaderSkeleton() {
  return (
    <div
      className="rounded-2xl px-6 py-5"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 mb-3">
        {[14, 18, 16, 20].map((w, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Shimmer className="h-2.5" style={{ width: w * 4 }} />
            {i < 3 && <Shimmer className="h-2.5 w-2.5 rounded-full" />}
          </div>
        ))}
      </div>
      <Shimmer className="h-7 w-56" />
    </div>
  );
}

function FolderLinkBarSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-5" aria-hidden="true">
      <Shimmer className="flex-1 h-[70px] rounded-2xl" />
      <Shimmer className="h-[52px] w-[52px] rounded-2xl shrink-0" />
    </div>
  );
}

function FileCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
    >
      <div className="relative w-full" style={{ aspectRatio: '1 / 1', background: 'var(--hover-bg)' }}>
        <Shimmer className="absolute top-3 right-3 h-4 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div className="px-4 py-3">
        <Shimmer className="h-3.5" style={{ width: `${45 + (index * 13) % 35}%` }} />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6" aria-hidden="true">
      <BreadcrumbHeaderSkeleton />

      <div>
        <FolderLinkBarSkeleton />

        <div className="flex items-center gap-3 mb-5">
          <Shimmer className="h-9 flex-1 rounded-xl" />
          <Shimmer className="h-9 w-16 rounded-xl" />
          <Shimmer className="h-9 w-16 rounded-xl" />
          <Shimmer className="h-9 w-20 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <FileCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}