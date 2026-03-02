/**
 * @file 모바일 메뉴 열기 버튼
 * @description 각 페이지 제목 좌측에 표시되는 햄버거 아이콘. 클릭 시 Header의 모바일 사이드 메뉴를 엽니다.
 *
 * @file Mobile Menu Open Button
 * @description Hamburger icon shown on the left of page titles. Opens Header's mobile side menu on click.
 */
'use client';

import { Menu } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function MobileMenuButton() {
  const { t } = useTranslation();
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-menu'))}
      className="lg:hidden p-1.5 -ml-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60"
      aria-label={t('common.openMenu')}
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
