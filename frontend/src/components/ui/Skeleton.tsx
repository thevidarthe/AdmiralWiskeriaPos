import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-r from-admiral-navy-2/40 via-admiral-gold/8 to-admiral-navy-2/40',
        'bg-[length:200%_100%] animate-shimmer',
        className,
      )}
    />
  );
}

export function SkeletonRows({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}
