'use client';

import { useChatStore } from '@/stores/chat';
import PinnedChatPanel from '@/components/chat/PinnedChatPanel';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const isPinned = useChatStore((s) => s.isPinned);
  const isOpen = useChatStore((s) => s.isOpen);
  const showPinned = isPinned && isOpen;

  return (
    <div className="flex min-h-[calc(100vh-60px)]">
      <div className={showPinned ? 'flex-1 min-w-0' : 'w-full'}>
        <main className="pb-20 md:pb-0 max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
      <PinnedChatPanel />
    </div>
  );
}
