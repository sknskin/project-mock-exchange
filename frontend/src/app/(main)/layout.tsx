/**
 * @file 메인 레이아웃
 * @description 인증 후 접근하는 메인 페이지들의 공통 레이아웃
 *
 * @file Main Layout
 * @description Shared layout for authenticated main pages
 */
// PERF-13-18: 현재 모든 주요 페이지가 'use client' — 정적/공개 데이터(자산 목록, 공지사항)를 서버 컴포넌트로 사전 페칭하는 하이브리드 렌더링 전략 검토 필요
// PERF-13-18: All major pages currently use 'use client' — consider hybrid rendering: pre-fetch static/public data (asset lists, announcements) in server components
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
