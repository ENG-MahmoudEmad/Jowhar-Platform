// src/app/(dashboard)/news/loading.tsx
// NewsHero + NewsFilters + grid of NewsCard skeletons

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`} style={style} />;
}

function NewsHeroSkeleton() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
      <div>
        <Shimmer className="h-2.5 w-14 mb-2" />
        <Shimmer className="h-6 w-40 mb-2" />
        <Shimmer className="h-3 w-64 max-w-full" />
      </div>
    </div>
  );
}

function NewsFiltersSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-[var(--background-alt)]">
        <Shimmer className="h-8 flex-1 min-w-[180px] rounded-xl" />
        <div className="flex items-center gap-1.5">
          {[48, 78, 64, 60].map((w, i) => (
            <Shimmer key={i} className="h-7 rounded-xl" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Mirrors NewsCard exactly: fixed h-[360px] card, 150px image, badge row,
// 2-line title, 3-line body preview, divider, avatar+name footer, like pill.
function NewsCardSkeleton({ withImage = true }: { withImage?: boolean }) {
  return (
    <div
      className="w-full h-[360px] flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
    >
      {withImage && <Shimmer className="shrink-0 rounded-none" style={{ height: 150, width: '100%' }} />}

      <div className="p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <Shimmer className="h-5 w-24 rounded-lg" />
          <Shimmer className="h-3 w-14" />
        </div>

        <Shimmer className="h-4 w-[85%] mb-1.5" />
        <Shimmer className="h-4 w-[60%] mb-3" />

        <div className="mb-3 flex-1 min-h-0 flex flex-col gap-1.5">
          <Shimmer className="h-2.5 w-full" />
          <Shimmer className="h-2.5 w-full" />
          <Shimmer className="h-2.5 w-3/4" />
        </div>

        <div className="mt-auto shrink-0" style={{ height: 1, background: 'var(--divider)', marginBottom: 12 }} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shimmer className="h-6 w-6 rounded-full" />
            <Shimmer className="h-2.5 w-16" />
          </div>
          <Shimmer className="h-7 w-14 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  // ثالث كارت بدون صورة — نفس التنوع الطبيعي (بعض الأخبار بلا صورة غلاف)
  const withImageFlags = [true, true, false, true, true, true];

  return (
    <div className="max-w-6xl mx-auto space-y-6" aria-hidden="true">
      <NewsHeroSkeleton />

      <div className="flex items-stretch gap-3">
        <div className="flex-1">
          <NewsFiltersSkeleton />
        </div>
        <Shimmer className="h-[46px] w-28 rounded-2xl shrink-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 16 }}>
        {withImageFlags.map((withImage, i) => (
          <NewsCardSkeleton key={i} withImage={withImage} />
        ))}
      </div>
    </div>
  );
}