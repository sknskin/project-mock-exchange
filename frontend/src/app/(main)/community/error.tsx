/**
 * @file 커뮤니티 에러 바운더리
 * @description 커뮤니티 페이지에서 발생하는 런타임 에러를 처리하는 에러 바운더리
 *
 * @file Community Error Boundary
 * @description Error boundary handling runtime errors in community pages
 */
'use client';

export default function CommunityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold">커뮤니티를 불러오지 못했습니다</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || '일시적인 오류가 발생했습니다.'}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        다시 시도
      </button>
    </div>
  );
}
