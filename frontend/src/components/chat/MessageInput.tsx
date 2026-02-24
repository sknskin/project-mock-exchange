'use client';

import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  return (
    <div className="flex items-end gap-2 px-3 py-2.5 border-t border-border bg-bg-primary">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
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
