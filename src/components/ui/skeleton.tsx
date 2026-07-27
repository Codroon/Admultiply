export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08] ${className}`}
    />
  );
}
