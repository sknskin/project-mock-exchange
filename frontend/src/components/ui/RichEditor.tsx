/**
 * @file TipTap 리치 에디터 컴포넌트
 * @description StarterKit + Image + Underline + Placeholder 기반의 WYSIWYG 에디터
 *
 * @file TipTap Rich Editor Component
 * @description WYSIWYG editor based on StarterKit + Image + Underline + Placeholder
 */
'use client';

import { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder || '' }),
    ],
    content,
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

  // 파일 선택 시 MIME/크기 검증 후 Base64로 변환하여 에디터에 이미지 삽입
  // Validate MIME type and size, then convert selected file to Base64 and insert image into editor
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      alert('JPG, PNG, GIF, WebP 이미지만 업로드할 수 있습니다.\nOnly JPG, PNG, GIF, WebP images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alert('이미지 크기는 5MB를 초과할 수 없습니다.\nImage size cannot exceed 5MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor.chain().focus().setImage({ src }).run();
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
          <ImageIcon className="w-4 h-4" />
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
