// src/app/(dashboard)/dashboard/loading.tsx
//
// Skeleton مطابق لشكل كل كومبوننت فعليًا (مش pulse blocks عامة).
// كل جزء هون بياخد نفس الأبعاد/الـ borders/الـ layout لكومبوننته الحقيقية،
// عشان ما يصير "قفزة" بصرية لحظة ما البيانات توصل وتستبدل الـ skeleton.
//
// ملاحظة: هاد الملف ما بستخدم useTheme/useLang لأنه Server Component
// (زي كل loading.tsx بالمشروع) — فبنعتمد كليًا على CSS variables
// (var(--card), var(--card-border), إلخ) اللي أصلاً بتتغيّر مع الثيم تلقائيًا.

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`}
      style={style}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamProgress skeleton
// ─────────────────────────────────────────────────────────────────────────────
function TeamProgressSkeleton() {
  return (
    <section
      className="w-full overflow-hidden rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-4 p-5 sm:p-6 bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
            <div className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <Shimmer className="h-3.5 w-32" />
            <Shimmer className="h-2.5 w-40 mt-2" />
          </div>
        </div>
        <Shimmer className="h-3 w-16 shrink-0" />
      </div>

      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5"
            style={{ borderBottom: i === 4 ? 'none' : '1px solid var(--divider)' }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Shimmer className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="min-w-0">
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="h-2 w-16 mt-1.5" />
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <Shimmer className="h-3 w-8" />
                  <Shimmer className="h-2 w-14" />
                </div>
              </div>
              <Shimmer className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center p-4 bg-[rgba(0,0,0,0.02)] border-t border-[var(--divider)]">
        <Shimmer className="h-3 w-28" />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard skeleton (podium: side / hero / side)
// ─────────────────────────────────────────────────────────────────────────────
function PodiumCardSkeleton({ hero }: { hero?: boolean }) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl"
      style={{
        flex: hero ? '1.4' : '1',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--card-border)',
        padding: hero ? '28px 20px 20px' : '20px 16px',
      }}
    >
      <Shimmer className={`rounded-full mb-3 ${hero ? 'h-[64px] w-[64px]' : 'h-11 w-11'}`} />
      <Shimmer className={`rounded-full mb-2.5 ${hero ? 'h-[68px] w-[68px]' : 'h-14 w-14'}`} />
      <Shimmer className="h-3 w-20 mb-1.5" />
      <Shimmer className="h-2 w-14 mb-3" />
      <div className="w-full h-px mb-3 bg-[var(--divider)]" />
      <div className="flex w-full gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Shimmer className={hero ? 'h-6 w-10' : 'h-5 w-8'} />
          <Shimmer className="h-2 w-10" />
        </div>
        <div className="w-px self-stretch bg-[var(--divider)]" />
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Shimmer className={hero ? 'h-6 w-10' : 'h-5 w-8'} />
          <Shimmer className="h-2 w-10" />
        </div>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-3 px-6 py-5 bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(69,132,130,0.1)' }}>
            <div className="h-[18px] w-[18px]" />
          </div>
          <div>
            <Shimmer className="h-3.5 w-28" />
            <Shimmer className="h-2.5 w-32 mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-8 w-24 rounded-xl" />
          <Shimmer className="h-8 w-32 rounded-xl" />
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:grid sm:grid-cols-3 sm:items-end gap-4 sm:gap-5">
          <div className="sm:col-start-2 sm:row-start-1 order-first">
            <PodiumCardSkeleton hero />
          </div>
          <div className="flex gap-4 sm:contents">
            <div className="flex-1 sm:flex-none sm:col-start-1 sm:row-start-1">
              <PodiumCardSkeleton />
            </div>
            <div className="flex-1 sm:flex-none sm:col-start-3 sm:row-start-1">
              <PodiumCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeadlineCountdown skeleton (ring)
// ─────────────────────────────────────────────────────────────────────────────
function DeadlineCountdownSkeleton() {
  return (
    <section
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="shrink-0 px-5 py-4 bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <Shimmer className="h-2.5 w-24" />
        <Shimmer className="h-3.5 w-32 mt-2" />
      </div>
      <div className="flex h-[220px] flex-col items-center justify-center">
        <Shimmer className="h-[170px] w-[170px] rounded-full opacity-60" />
      </div>
      <div className="h-8" />
      <div className="flex shrink-0 flex-col items-center gap-2 pb-5 pt-2">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className={`h-2 rounded-full ${i === 0 ? 'w-[22px]' : 'w-2'}`} />
          ))}
        </div>
        <Shimmer className="h-2 w-8" />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectCalendar skeleton
// ─────────────────────────────────────────────────────────────────────────────
function ProjectCalendarSkeleton() {
  return (
    <section
      className="w-full overflow-hidden rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <div className="flex min-w-0 items-center gap-2">
          <Shimmer className="h-3.5 w-20" />
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-7 w-32 rounded-xl" />
        <Shimmer className="ms-auto h-7 w-20 rounded-xl" />
      </div>

      <div>
        {/* day labels row */}
        <div className="flex border-b border-[var(--divider)]">
          <div className="w-28 sm:w-36 shrink-0 border-e border-[var(--divider)] py-2" />
          <div className="flex flex-1 gap-1 px-2 py-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Shimmer key={i} className="h-2 flex-1" />
            ))}
          </div>
        </div>

        {/* member rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ height: 56, borderBottom: i === 4 ? 'none' : '1px solid var(--divider)' }}
          >
            <div className="flex h-full w-28 sm:w-36 shrink-0 items-center gap-2 px-3 border-e border-[var(--divider)]">
              <Shimmer className="h-7 w-7 rounded-full shrink-0" />
              <Shimmer className="h-2.5 w-14" />
            </div>
            <div className="relative flex-1 px-3">
              <Shimmer
                className="rounded-full"
                style={{ height: 18, width: `${30 + (i * 13) % 40}%`, marginInlineStart: `${(i * 17) % 30}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MembersCard skeleton
// ─────────────────────────────────────────────────────────────────────────────
function MembersCardSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)', height: 372 }}
      aria-hidden="true"
    >
      <div className="p-5 sm:p-6 flex items-center gap-3 shrink-0 bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(69,132,130,0.1)' }}>
          <div className="h-[18px] w-[18px]" />
        </div>
        <div>
          <Shimmer className="h-3.5 w-20" />
          <Shimmer className="h-2.5 w-28 mt-2" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5 px-5 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}
          >
            <Shimmer className="h-2 w-2 rounded-full shrink-0" />
            <Shimmer className="h-2.5 flex-1 max-w-24" />
            <div className="flex" style={{ direction: 'ltr' }}>
              {Array.from({ length: 3 }).map((_, j) => (
                <Shimmer
                  key={j}
                  className="h-[22px] w-[22px] rounded-full border-2"
                  style={{ marginLeft: j === 0 ? 0 : -7, borderColor: 'var(--card)' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="py-3 flex justify-center shrink-0 bg-[rgba(0,0,0,0.02)] border-t border-[var(--divider)]">
        <Shimmer className="h-2.5 w-36" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StudioPulse skeleton
// ─────────────────────────────────────────────────────────────────────────────
function StudioPulseSkeleton() {
  return (
    <section
      className="flex h-[372px] w-full flex-col overflow-hidden rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="flex shrink-0 items-center gap-3 p-5 bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
          <div className="h-[18px] w-[18px]" />
        </div>
        <div>
          <Shimmer className="h-3.5 w-28" />
          <Shimmer className="h-2.5 w-40 mt-2" />
        </div>
      </div>

      <div
        className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 px-6 py-4"
        style={{ background: 'linear-gradient(160deg, rgba(69,132,130,0.06), rgba(69,132,130,0.01))' }}
      >
        <Shimmer className="h-3.5 w-[85%]" />
        <Shimmer className="h-3.5 w-[65%]" />
        <Shimmer className="h-5 w-24 rounded-full mt-1" />
      </div>

      <div className="flex shrink-0 gap-2 border-t border-[var(--divider)] p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-1 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2"
            style={{ background: 'var(--pulse-stat-bg, rgba(0,0,0,0.02))', border: '1px solid var(--card-border)' }}
          >
            <Shimmer className="h-3.5 w-3.5 rounded" />
            <Shimmer className="h-3.5 w-8" />
            <Shimmer className="h-2 w-10" />
          </div>
        ))}
      </div>

      <div className="flex shrink-0 justify-center py-2.5 border-t border-[var(--divider)]">
        <Shimmer className="h-2 w-20" />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-level composition — يعكس نفس الـ grid اللي بصفحة الداشبورد الحقيقية
// (عدّل الـ grid classes هون لو الليّاوت الفعلي مختلف شوية)
// ─────────────────────────────────────────────────────────────────────────────
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <TeamProgressSkeleton />
      <LeaderboardSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <ProjectCalendarSkeleton />
        <DeadlineCountdownSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MembersCardSkeleton />
        <StudioPulseSkeleton />
      </div>
    </div>
  );
}