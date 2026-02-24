'use client';

import { useChatStore } from '@/stores/chat';
import { cn } from '@/lib/format';
import PinnedChatPanel from '@/components/chat/PinnedChatPanel';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const isPinned = useChatStore((s) => s.isPinned);
  const isOpen = useChatStore((s) => s.isOpen);
  const showPinned = isPinned && isOpen;

  return (
    <div className="pt-[60px] min-h-screen">
      {/* 메인 콘텐츠 영역: 사이드바 고정 시 오른쪽 여백으로 겹침 방지 */}
      <div className={cn('transition-[margin] duration-300 ease-in-out', showPinned ? 'lg:mr-[380px] overflow-x-hidden' : '')}>
        <main className="pb-20 md:pb-0 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      {/* 고정 채팅 패널: fixed로 스크롤과 무관하게 항상 표시 */}
      <PinnedChatPanel />
    </div>
  );
}
