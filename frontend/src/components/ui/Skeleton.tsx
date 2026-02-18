'use client';

import { cn } from '@/lib/format';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-bg-secondary rounded animate-pulse',
        className,
      )}
    />
  );
}

export function AssetListSkeleton() {
  return (
    <div className="pt-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center px-4 sm:px-6 py-3.5">
          <Skeleton className="w-4 h-4 rounded-full mr-2" />
          <Skeleton className="w-7 h-4 shrink-0" />
          <div className="flex items-center gap-3 flex-1 pl-2.5">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="w-20 sm:w-24 h-3.5" />
              <Skeleton className="w-10 h-2.5" />
            </div>
          </div>
          <div className="space-y-1.5 mr-3">
            <Skeleton className="w-20 h-3.5 ml-auto" />
            <Skeleton className="w-14 h-2.5 ml-auto" />
          </div>
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-16 h-3.5 ml-3 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="w-full h-[300px] rounded-none" />;
}
