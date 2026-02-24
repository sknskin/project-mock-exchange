'use client';

import { useChatStore } from '@/stores/chat';
import PinnedChatPanel from '@/components/chat/PinnedChatPanel';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const isPinned = useChatStore((s) => s.isPinned);
  const isOpen = useChatStore((s) => s.isOpen);
  const showPinned = isPinned && isOpen;

  return (
    <div className="flex min-h-[calc(100vh-60px)]">
      {/* 메인 콘텐츠 영역: 사이드바 고정 시 flex-1로 남은 공간을 채우고 overflow 방지 */}
      <div className={showPinned ? 'flex-1 min-w-0 overflow-x-hidden' : 'w-full'}>
        <main className="pb-20 md:pb-0 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      {/* 고정 채팅 패널: lg 이상에서만 표시 */}
      <PinnedChatPanel />
    </div>
  );
}
