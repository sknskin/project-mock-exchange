/**
 * @file 메시지 입력 컴포넌트
 * @description 자동 높이 조절 textarea + @ 멘션 자동완성 + 타이핑 인디케이터 연동
 *
 * @file Message Input Component
 * @description Auto-resizing textarea with @ mention autocomplete and typing indicator integration
 */
'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import type { ChatParticipant } from '@/types';

// 메시지 입력 Props / Message Input Props
interface MessageInputProps {
  /** 메시지 전송 콜백
   * Message send callback */
  onSend: (content: string) => void;
  /** 입력 비활성화 여부
   * Whether input is disabled */
  disabled?: boolean;
  /** 부모에서 포커스를 호출하기 위한 ref
   * Ref for parent to call focus */
  focusRef?: React.MutableRefObject<(() => void) | null>;
  /** 멘션 대상 참여자 목록
   * Participants for mention autocomplete */
  participants?: ChatParticipant[];
  /** 현재 사용자 ID (멘션에서 자신 제외)
   * Current user ID (excluded from mentions) */
  currentUserId?: string;
  /** 타이핑 이벤트 콜백
   * Typing event callback */
  onTyping?: () => void;
}

/** 메시지 입력 — 자동 높이 textarea + @ 멘션 자동완성
 * Message input — auto-resizing textarea with @ mention autocomplete */
export default function MessageInput({ onSend, disabled, focusRef, participants, currentUserId, onTyping }: MessageInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const mentionRef = useRef<HTMLDivElement>(null);

  // 멘션 대상 목록 (본인 제외) (Mention candidates, excluding self)
  const mentionCandidates = useMemo(() => {
    if (!participants || mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return participants
      .filter((p) => p.userId !== currentUserId)
      .filter((p) => {
        const name = (p.name || p.username).toLowerCase();
        return name.includes(q) || p.username.toLowerCase().includes(q);
      })
      .slice(0, 5);
  }, [participants, mentionQuery, currentUserId]);

  // 부모 컴포넌트에 포커스 함수 노출 (Expose focus function to parent)
  useEffect(() => {
    if (focusRef) {
      focusRef.current = () => textareaRef.current?.focus();
    }
  }, [focusRef]);

  // 멘션 자동완성 위치 계산 (Calculate mention autocomplete position)
  const detectMention = useCallback((value: string, cursorPos: number) => {
    // 커서 앞에서 가장 가까운 @ 찾기 (Find nearest @ before cursor)
    const beforeCursor = value.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionQuery(null);
      return;
    }
    // @ 앞이 공백이거나 시작이어야 유효 (Must be preceded by space or start of text)
    if (atIndex > 0 && beforeCursor[atIndex - 1] !== ' ' && beforeCursor[atIndex - 1] !== '\n') {
      setMentionQuery(null);
      return;
    }
    const query = beforeCursor.slice(atIndex + 1);
    // 공백 포함 시 멘션 종료 (End mention on space)
    if (query.includes(' ') || query.includes('\n')) {
      setMentionQuery(null);
      return;
    }
    setMentionStart(atIndex);
    setMentionQuery(query);
    setMentionIndex(0);
  }, []);

  const insertMention = useCallback((participant: ChatParticipant) => {
    const displayName = participant.name || participant.username;
    const before = text.slice(0, mentionStart);
    const after = text.slice(textareaRef.current?.selectionStart ?? text.length);
    const newText = `${before}@${displayName} ${after}`;
    setText(newText);
    setMentionQuery(null);
    // 포커스 복원 및 커서 위치 설정 (Restore focus and set cursor position)
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        const cursorPos = before.length + displayName.length + 2; // @name + space
        ta.focus();
        ta.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  }, [text, mentionStart]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    setMentionQuery(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME 입력 중 키 이벤트 무시 (한글 조합 중 Enter 오동작 방지)
    // Ignore key events during IME composition (prevents Korean input issues)
    if (e.nativeEvent.isComposing || e.key === 'Process') return;

    // 멘션 목록이 표시 중일 때 키 처리 (Handle keys when mention list is visible)
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, mentionCandidates.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // 멘션 쿼리 입력 중 Enter 시 전송하지 않고 멘션 해제 (Don't send while mention query active)
    if (mentionQuery !== null && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setMentionQuery(null);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    detectMention(value, e.target.selectionStart ?? value.length);
    // 타이핑 이벤트 디바운스 (2초) (Debounced typing event – 2s)
    if (onTyping && value.trim()) {
      if (!typingTimerRef.current) {
        onTyping();
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => { typingTimerRef.current = null; }, 2000);
    }
  };

  return (
    <div className="relative flex items-end gap-2 px-3 py-2.5 border-t border-border bg-bg-primary">
      {/* @ 멘션 자동완성 목록 (@ mention autocomplete list) */}
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div
          ref={mentionRef}
          className="absolute bottom-full left-3 right-3 mb-1 bg-bg-elevated border border-border rounded-xl shadow-2xl overflow-hidden z-10 animate-dropdown-in"
        >
          {mentionCandidates.map((p, i) => (
            <button
              key={p.userId}
              onClick={() => insertMention(p)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                i === mentionIndex ? 'bg-accent/10' : 'hover:bg-bg-secondary',
              )}
            >
              <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-tertiary shrink-0">
                {(p.name || p.username).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-medium text-text-primary truncate block">
                  {p.name || p.username}
                </span>
                {p.name && (
                  <span className="text-[10px] text-text-quaternary truncate block">
                    @{p.username}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={t('chat.messagePlaceholder')}
        rows={1}
        className="flex-1 resize-none bg-bg-secondary rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-quaternary outline-none max-h-[120px] leading-relaxed"
        disabled={disabled}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className={cn(
          'shrink-0 p-2.5 rounded-xl transition-colors',
          text.trim()
            ? 'bg-accent text-white hover:bg-accent/85'
            : 'bg-bg-secondary text-text-quaternary',
        )}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
