/**
 * @file 전략 공유 레이아웃
 * @description 전략 공유 섹션의 공통 레이아웃 및 메타데이터 정의
 *
 * @file Strategy Sharing Layout
 * @description Common layout and metadata definition for the strategy sharing section
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Strategy - VirtuEx',
  description:
    'Share and discover trading strategies on VirtuEx — publish your strategies, discuss with fellow traders.',
};

export default function StrategyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
