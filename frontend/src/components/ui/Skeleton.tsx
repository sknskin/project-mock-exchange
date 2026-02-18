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
        <div key={i} className="flex items-center px-4 sm:px-6 py-3">
          <Skeleton className="w-[18px] h-[18px] rounded-full mr-2 sm:mr-2.5" />
          <Skeleton className="w-6 sm:w-7 h-4" />
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 pl-2 sm:pl-3">
            <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
            <Skeleton className="w-20 sm:w-24 h-4" />
          </div>
          <Skeleton className="w-16 sm:w-20 h-4" />
          <Skeleton className="w-14 sm:w-16 h-4 ml-3 sm:ml-4" />
          <Skeleton className="w-14 h-4 ml-4 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="w-full h-[300px] rounded-none" />;
}
