export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-32 rounded-2xl bg-[var(--hover-bg)]" />
      <div className="h-64 rounded-2xl bg-[var(--hover-bg)]" />
    </div>
  );
}