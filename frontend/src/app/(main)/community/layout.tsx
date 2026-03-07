/**
 * @file 커뮤니티 레이아웃
 * @description 커뮤니티 섹션의 공통 레이아웃 및 메타데이터 정의
 *
 * @file Community Layout
 * @description Common layout and metadata definition for the community section
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community - VirtuEx',
  description:
    'Join the VirtuEx trading community — share strategies, discuss markets, and connect with fellow traders.',
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
