/**
 * @file 메인 레이아웃
 * @description 인증 후 접근하는 메인 페이지들의 공통 레이아웃
 *
 * @file Main Layout
 * @description Shared layout for authenticated main pages
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
