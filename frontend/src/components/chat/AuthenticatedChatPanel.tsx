/**
 * @file 인증 사용자 전용 채팅 패널 래퍼
 * @description 인증된 사용자에게만 ChatPanel을 렌더링하는 클라이언트 래퍼
 *
 * @file Authenticated Chat Panel Wrapper
 * @description Client wrapper that renders ChatPanel only for authenticated users
 *
 * Audit fix: ChatPanel conditional render for unauthenticated users
 */
'use client';

import { useAuthStore } from '@/stores/auth';
import ChatPanel from './ChatPanel';

/** 인증된 사용자에게만 채팅 패널을 렌더링
 * Only renders the chat panel for authenticated users */
export default function AuthenticatedChatPanel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return null;

  return <ChatPanel />;
}
