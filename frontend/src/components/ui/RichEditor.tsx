/**
 * @file TipTap 리치 에디터 컴포넌트
 * @description StarterKit + Image + Underline + Placeholder 기반의 WYSIWYG 에디터
 *
 * @file TipTap Rich Editor Component
 * @description WYSIWYG editor based on StarterKit + Image + Underline + Placeholder
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/format';

// 리치 에디터 Props / Rich Editor Props
interface RichEditorProps {
  /** 초기 HTML 콘텐츠
   * Initial HTML content */
  content: string;
  /** HTML 변경 콜백
   * HTML change callback */
  onChange: (html: string) => void;
  /** 에디터 플레이스홀더
   * Editor placeholder text */
  placeholder?: string;
}

export default function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder || '' }),
    ],
    content,
    // SSR hydration 불일치 방지 — 클라이언트 마운트 후 렌더링
    // Prevent SSR hydration mismatch — render after client mount
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none min-h-[200px] px-4 py-3 focus:outline-none text-[14px] text-text-primary',
      },
    },
  });

  // 외부 content prop 변경 시 에디터 동기화 (수정 모드 초기화용)
  // Sync editor when external content prop changes (for edit mode initialization)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // 숨겨진 파일 input 클릭으로 이미지 업로드 트리거 / Trigger image upload by clicking hidden file input
  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  // 허용 이미지 MIME 타입 / Allowed image MIME types
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  // CM-M-02: 최대 이미지 해상도 제한 — 과도한 메모리 사용 방지
  // CM-M-02: Maximum image resolution limit — prevents excessive memory usage
  const MAX_IMAGE_DIMENSION = 4096; // 4096x4096 px

  // IMG-M-01: 이미지 업로드 — 인증 시 서버 업로드 API를 사용하여 URL을 삽입합니다.
  // 비인증 시 data URL 폴백을 사용합니다.
  //
  // IMG-M-01: Image upload — uses server upload API to insert URL when authenticated.
  // Falls back to data URL for unauthenticated users.
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      addToast(t('editor.invalidImageType'), 'error');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      addToast(t('editor.imageTooLarge'), 'error');
      e.target.value = '';
      return;
    }

    // CM-M-02: 이미지 해상도 검증 — 4096x4096 초과 시 거부
    // CM-M-02: Validate image resolution — reject if exceeds 4096x4096
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = async () => {
        if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
          addToast(t('editor.imageResolutionTooLarge'), 'error');
          return;
        }

        // 인증된 사용자: 서버 업로드 API로 이미지 업로드 후 URL 삽입
        // Authenticated user: upload image via server API and insert URL
        if (isAuthenticated) {
          try {
            setUploading(true);
            const base64Data = dataUrl.split(',')[1]; // data URL에서 base64 부분 추출
            const { data: response } = await api.post('/api/community/upload-image', {
              originalName: file.name,
              mimeType: file.type,
              data: base64Data,
            });
            const imageUrl = response.data?.url;
            if (imageUrl) {
              editor.chain().focus().setImage({ src: imageUrl }).run();
            } else {
              // 업로드 응답에 URL이 없으면 data URL 폴백
              editor.chain().focus().setImage({ src: dataUrl }).run();
            }
          } catch {
            // 서버 업로드 실패 시 data URL 폴백
            // Fall back to data URL if server upload fails
            editor.chain().focus().setImage({ src: dataUrl }).run();
          } finally {
            setUploading(false);
          }
        } else {
          // 비인증 사용자: data URL 사용 (폴백)
          // Unauthenticated: use data URL (fallback)
          editor.chain().focus().setImage({ src: dataUrl }).run();
        }
      };
      img.onerror = () => {
        addToast(t('editor.invalidImageType'), 'error');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!editor) return null;

  // 툴바 버튼 내부 컴포넌트 — active 상태에 따라 강조 / Toolbar button sub-component — highlighted when active
  const ToolBtn = ({
    onClick,
    active,
    children,
    label,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active
          ? 'bg-accent/20 text-accent'
          : 'text-text-quaternary hover:text-text-secondary hover:bg-bg-tertiary',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl bg-bg-tertiary border border-border/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/50 bg-bg-secondary/50">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold">
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic">
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} label="Underline">
          <UnderlineIcon className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border/50 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="Heading">
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet list">
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Ordered list">
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="Blockquote">
          <Quote className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border/50 mx-1" />
        <ToolBtn onClick={handleImageUpload} label="Insert image">
          {uploading ? (
            <span className="w-4 h-4 border-2 border-text-quaternary border-t-accent rounded-full animate-spin inline-block" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </ToolBtn>
        <div className="w-px h-5 bg-border/50 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="Undo">
          <Undo className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="Redo">
          <Redo className="w-4 h-4" />
        </ToolBtn>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
