/**
 * @file 메인 콘텐츠 레이아웃 컴포넌트
 * @description 헤더 아래 메인 영역 + 고정 채팅 사이드바 레이아웃 관리 (margin 전환 애니메이션)
 *
 * @file Main Content Layout Component
 * @description Manages main area below header + pinned chat sidebar layout (margin transition animation)
 */
'use client';

import { useChatStore } from '@/stores/chat';
import { cn } from '@/lib/format';
import PinnedChatPanel from '@/components/chat/PinnedChatPanel';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const isPinned = useChatStore((s) => s.isPinned);
  const isOpen = useChatStore((s) => s.isOpen);
  // 고정 사이드바 표시 여부 / Whether to show pinned sidebar
  const showPinned = isPinned && isOpen;

  return (
    <div className="pt-[60px] min-h-[100dvh]">
      {/* 메인 콘텐츠 영역: 사이드바 고정 시 오른쪽 여백으로 겹침 방지 / Main content area: right margin prevents overlap when sidebar is pinned */}
      <div className={cn('transition-[margin] duration-300 ease-in-out', showPinned ? 'lg:mr-[320px] xl:mr-[380px] overflow-x-clip' : '')}>
        <main id="main-content" className="pb-20 md:pb-0 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      {/* 고정 채팅 패널: fixed로 스크롤과 무관하게 항상 표시 / Pinned chat panel: fixed so always visible regardless of scroll */}
      <PinnedChatPanel />
    </div>
  );
}
