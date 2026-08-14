// src/app/(dashboard)/archive/[platform]/[work]/loading.tsx
// Level 3 — WorkHero + SectionTabs + SectionGrid

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`} style={style} />;
}

function WorkHeroSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="relative px-8 pt-12 pb-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="absolute top-4 left-8 flex items-center gap-1.5">
          <Shimmer className="h-2.5 w-14" />
          <Shimmer className="h-2.5 w-2.5 rounded-full" />
          <Shimmer className="h-2.5 w-16" />
          <Shimmer className="h-2.5 w-2.5 rounded-full" />
          <Shimmer className="h-2.5 w-20" />
        </div>

        <Shimmer className="mt-5 sm:mt-0 w-20 h-20 rounded-2xl shrink-0" />

        <div className="flex-1 mt-4 sm:mt-0">
          <Shimmer className="h-2.5 w-10 mb-2" />
          <Shimmer className="h-8 w-52 mb-2" />
          <Shimmer className="h-3.5 w-72 max-w-full" />
        </div>

        <div className="flex gap-3 shrink-0">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="text-center px-4 py-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
              <Shimmer className="h-4 w-4 mx-auto mb-2 rounded" />
              <Shimmer className="h-6 w-8 mx-auto mb-2" />
              <Shimmer className="h-2 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTabsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex items-center gap-2 overflow-hidden pb-1">
        {[80, 96, 72, 88].map((w, i) => (
          <Shimmer key={i} className="h-9 rounded-xl shrink-0" style={{ width: w }} />
        ))}
      </div>
      <Shimmer className="h-2.5 w-64 mt-3" />
    </div>
  );
}

function ItemCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
    >
      <div className="relative w-full" style={{ aspectRatio: '1 / 1', background: 'var(--hover-bg)' }}>
        <Shimmer className="absolute top-3 right-3 h-4 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div className="px-4 py-3">
        <Shimmer className="h-3.5" style={{ width: `${45 + (index * 11) % 35}%` }} />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6" aria-hidden="true">
      <WorkHeroSkeleton />
      <SectionTabsSkeleton />

      <div>
        <div className="flex items-center gap-3 mb-5">
          <Shimmer className="h-9 flex-1 rounded-xl" />
          <Shimmer className="h-9 w-16 rounded-xl" />
          <Shimmer className="h-9 w-20 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ItemCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}