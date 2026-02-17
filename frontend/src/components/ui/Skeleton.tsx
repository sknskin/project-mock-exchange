'use client';

import { cn } from '@/lib/format';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-bg-tertiary rounded-lg animate-pulse',
        className,
      )}
    />
  );
}

export function AssetListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="w-16 h-4 mb-1.5" />
              <Skeleton className="w-24 h-3" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="w-20 h-4 mb-1.5 ml-auto" />
            <Skeleton className="w-14 h-3 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="w-full h-[300px]" />;
}
