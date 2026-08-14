// src/app/(dashboard)/archive/loading.tsx
// Level 1 — ArchiveHero + PlatformGrid

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`} style={style} />;
}

function ArchiveHeroSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-8"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <Shimmer className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="flex-1">
          <Shimmer className="h-2.5 w-16 mb-2" />
          <Shimmer className="h-8 w-56 mb-2" />
          <Shimmer className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="shrink-0 text-center px-6 py-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
          <Shimmer className="h-4 w-4 mx-auto mb-2 rounded" />
          <Shimmer className="h-6 w-8 mx-auto mb-2" />
          <Shimmer className="h-2 w-14" />
        </div>
      </div>
    </div>
  );
}

function PlatformCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
    >
      <div className="relative w-full" style={{ aspectRatio: '1 / 1', background: 'var(--hover-bg)' }}>
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <Shimmer className="h-4 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <Shimmer className="h-4 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <Shimmer className="h-3.5" style={{ width: `${50 + (index * 7) % 30}%` }} />
        <Shimmer className="h-3.5 w-3.5 rounded shrink-0" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6" aria-hidden="true">
      <ArchiveHeroSkeleton />

      <div>
        <div className="flex items-center gap-3 mb-5">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-3 w-20" />
          <div className="flex-1 h-px bg-[var(--divider)]" />
          <Shimmer className="h-4 w-6 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <PlatformCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}