// src/app/(dashboard)/my-tasks/loading.tsx
//
// نفس فلسفة skeleton الداشبورد: كل قطعة بشكل كومبوننتها الحقيقي
// (نفس الأبعاد/الـ borders) بدل pulse blocks عامة.

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`}
      style={style}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WelcomePanel skeleton (Gem + "Welcome" / Name lines)
// ─────────────────────────────────────────────────────────────────────────────
function WelcomePanelSkeleton() {
  return (
    <div
      className="min-h-[210px] rounded-2xl px-6 sm:px-8 py-7 flex items-center"
      style={{
        background: 'linear-gradient(135deg, rgba(69,132,130,0.14), rgba(255,255,255,0.025))',
        border: '1px solid var(--card-border)',
      }}
      aria-hidden="true"
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        {/* Diamond gem placeholder */}
        <Shimmer className="hidden sm:block rounded-full shrink-0" style={{ height: 130, width: 130 }} />
        <Shimmer className="sm:hidden rounded-full shrink-0" style={{ height: 88, width: 88 }} />

        <div className="flex min-w-0 flex-col gap-2.5">
          <Shimmer className="h-7 w-40 sm:h-9 sm:w-56" />
          <Shimmer className="h-6 w-32 sm:h-7 sm:w-44" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TodayFocusCard skeleton
// ─────────────────────────────────────────────────────────────────────────────
function TodayFocusCardSkeleton() {
  return (
    <div
      className="min-h-[210px] rounded-2xl p-6 flex flex-col justify-between"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div>
        <Shimmer className="h-2.5 w-24 mb-3" />
        <Shimmer className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl px-3 py-4"
            style={{ background: 'var(--hover-bg)', border: '1px solid var(--divider)' }}
          >
            <Shimmer className="h-6 w-8 mb-2.5" />
            <Shimmer className="h-2 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PersonalCalendar skeleton (Gantt-style)
// ─────────────────────────────────────────────────────────────────────────────
function PersonalCalendarSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <div className="flex items-center gap-2">
          <Shimmer className="h-3.5 w-16" />
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-7 w-32 rounded-xl" />
      </div>

      <div>
        {/* date label row */}
        <div className="flex border-b border-[var(--divider)] px-2 py-2 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Shimmer key={i} className="h-2 flex-1" />
          ))}
        </div>

        {/* task rows (fixed 5-row scroll area = 240px) */}
        <div style={{ height: 240 }} className="flex flex-col">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center flex-1 px-3"
              style={{ borderBottom: i === 4 ? 'none' : '1px solid var(--divider)' }}
            >
              <Shimmer
                className="rounded-full"
                style={{ height: 20, width: `${28 + (i * 11) % 45}%`, marginInlineStart: `${(i * 19) % 35}%` }}
              />
            </div>
          ))}
        </div>

        {/* footer weekday labels */}
        <div className="flex border-t border-[var(--divider)] px-2 py-1.5 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Shimmer key={i} className="h-2 flex-1 opacity-60" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: collapsed note-list card skeleton (used by both MyNotes & DirectorNotes —
// same header + 3 preview-card layout)
// ─────────────────────────────────────────────────────────────────────────────
function NotePreviewCardSkeleton() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl p-4.5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--hover-bg)]" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-3 w-10 rounded-full" />
        </div>
        <Shimmer className="h-2.5 w-full" />
        <Shimmer className="h-2.5 w-3/4" />
        <Shimmer className="h-2 w-16 mt-1" />
      </div>
    </div>
  );
}

function NotesCardSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="px-4 py-3 flex items-center justify-between bg-[var(--background-alt)] border-b border-[var(--divider)]">
        <Shimmer className={`h-3.5 ${titleWidth}`} />
        <div className="flex items-center gap-2">
          <Shimmer className="h-7 w-7 rounded-xl" />
          <Shimmer className="h-7 w-14 rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <NotePreviewCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-level composition — يعكس بنية MyTasksHero (Welcome + TodayFocus)
// ثم PersonalCalendar، وبعدين MyNotes + DirectorNotes جنب بعض
// ─────────────────────────────────────────────────────────────────────────────
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6 items-stretch">
        <WelcomePanelSkeleton />
        <TodayFocusCardSkeleton />
      </div>

      <PersonalCalendarSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotesCardSkeleton titleWidth="w-20" />
        <NotesCardSkeleton titleWidth="w-28" />
      </div>
    </div>
  );
}