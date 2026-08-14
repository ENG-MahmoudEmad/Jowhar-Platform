// src/app/(dashboard)/profile/loading.tsx
// ProfileHero + PersonalInfo + SecuritySettings + AdminControls
// Container matches the real page exactly: max-w-2xl mx-auto space-y-6

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`} style={style} />;
}

function ProfileHeroSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden relative"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      {/* Badges — top-right, above the fold, over the dotted banner area */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <Shimmer className="h-5 w-28 rounded-full" />
        <Shimmer className="h-5 w-16 rounded-full" />
      </div>

      <div className="px-6 pt-6 pb-6">
        {/* Square avatar */}
        <Shimmer className="w-24 h-24 rounded-2xl mb-4" />

        <div className="flex flex-col gap-2">
          <Shimmer className="h-7 w-44" />
          <div className="flex items-center gap-1.5">
            <Shimmer className="h-3.5 w-3.5 rounded" />
            <Shimmer className="h-2.5 w-16" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Shimmer className="h-3 w-3 rounded" />
            <Shimmer className="h-2.5 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CardHeaderSkeleton({ titleWidth = 'w-24', subtitleWidth = 'w-36' }: { titleWidth?: string; subtitleWidth?: string }) {
  return (
    <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ background: 'var(--background-alt)', borderBottom: '1px solid var(--divider)' }}>
      <Shimmer className="w-7 h-7 rounded-lg shrink-0" />
      <div>
        <Shimmer className={`h-3 ${titleWidth} mb-1.5`} />
        <Shimmer className={`h-2 ${subtitleWidth}`} />
      </div>
    </div>
  );
}

function FieldRowSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shimmer className="h-3 w-3 rounded" />
          <Shimmer className="h-2 w-14" />
        </div>
        <Shimmer className="h-5 w-11 rounded-lg" />
      </div>
      <Shimmer className="h-[38px] w-full rounded-xl" />
      <Shimmer className="h-2 w-2/3" />
    </div>
  );
}

function PersonalInfoSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <CardHeaderSkeleton titleWidth="w-28" subtitleWidth="w-40" />
      <div className="px-5 py-4 flex flex-col gap-4">
        <FieldRowSkeleton />
        <div style={{ height: 1, background: 'var(--divider)' }} />
        <FieldRowSkeleton />
      </div>
    </div>
  );
}

function SecuritySettingsSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <CardHeaderSkeleton titleWidth="w-14" subtitleWidth="w-32" />
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--hover-bg)', border: '1px solid var(--card-border)' }}>
          <Shimmer className="h-4 w-4 rounded shrink-0" />
          <div>
            <Shimmer className="h-2 w-16 mb-1.5" />
            <Shimmer className="h-2.5 w-28" />
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--divider)' }} />
        <Shimmer className="h-9 w-40 rounded-xl" />
      </div>
    </div>
  );
}

function AdminControlsSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <CardHeaderSkeleton titleWidth="w-24" subtitleWidth="w-32" />
      <div className="px-5 py-4 flex flex-col gap-5">
        {/* Job title section */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Shimmer className="h-3 w-3 rounded" />
            <Shimmer className="h-2 w-16" />
            <div className="flex-1 h-px bg-[var(--divider)]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <Shimmer className="h-[34px] rounded-xl" />
            <Shimmer className="h-[34px] rounded-xl" />
          </div>
          <Shimmer className="h-7 w-16 rounded-xl" />
        </div>

        {/* Color section */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Shimmer className="h-3 w-3 rounded" />
            <Shimmer className="h-2 w-20" />
            <div className="flex-1 h-px bg-[var(--divider)]" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Shimmer className="h-12 w-12 rounded-xl" />
            <Shimmer className="h-9 w-9 rounded-lg" />
            <Shimmer className="h-9 w-[92px] rounded-xl" />
            <Shimmer className="h-9 w-20 rounded-xl" />
          </div>
        </div>

        {/* Restrictions section */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Shimmer className="h-3 w-3 rounded" />
            <Shimmer className="h-2 w-20" />
            <div className="flex-1 h-px bg-[var(--divider)]" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--hover-bg)', border: '1px solid var(--card-border)' }}>
                <div>
                  <Shimmer className="h-2.5 w-28 mb-1.5" />
                  <Shimmer className="h-2 w-36" />
                </div>
                <Shimmer className="h-5 w-9 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6" aria-hidden="true">
      <ProfileHeroSkeleton />
      <PersonalInfoSkeleton />
      <SecuritySettingsSkeleton />
      <AdminControlsSkeleton />
    </div>
  );
}