// src/app/(dashboard)/adminControl/loading.tsx
// Pending Approvals (conditional, omitted in skeleton) + Members List
// Container matches page.tsx exactly: max-w-6xl mx-auto space-y-8

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-[var(--hover-bg)] ${className}`} style={style} />;
}

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 5;
const LIST_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

function MemberRowSkeleton({ isLast }: { isLast: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-4 sm:px-5"
      style={{ height: ROW_HEIGHT, borderBottom: isLast ? 'none' : '1px solid var(--divider)' }}
    >
      <Shimmer className="h-9 w-9 rounded-lg shrink-0" />
      <div className="min-w-0 flex-1">
        <Shimmer className="h-3 w-32 mb-1.5" />
        <Shimmer className="h-2 w-20" />
      </div>
      <Shimmer className="h-5 w-14 rounded-full shrink-0" />
      <Shimmer className="h-4 w-4 rounded shrink-0" />
    </div>
  );
}

function MembersListSkeleton() {
  return (
    <div
      className="w-full overflow-hidden rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6" style={{ background: 'var(--background-alt)', borderBottom: '1px solid var(--divider)' }}>
        <div className="min-w-0">
          <Shimmer className="h-3 w-24 mb-2" />
          <Shimmer className="h-2 w-36" />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Shimmer className="h-8 w-48 sm:w-56 rounded-full" />
          <Shimmer className="h-8 w-28 rounded-full" />
        </div>
      </div>

      <div style={{ height: LIST_HEIGHT }}>
        {Array.from({ length: VISIBLE_ROWS }).map((_, i) => (
          <MemberRowSkeleton key={i} isLast={i === VISIBLE_ROWS - 1} />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8" aria-hidden="true">
      <MembersListSkeleton />
    </div>
  );
}