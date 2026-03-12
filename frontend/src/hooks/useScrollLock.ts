/**
 * @file 배경 스크롤 잠금 훅
 * @description 모달이 열릴 때 html/body 스크롤을 완전 차단합니다 (모바일 포함)
 *
 * @file Background Scroll Lock Hook
 * @description Fully blocks html/body scroll when a modal is open (including mobile)
 */
'use client';

import { useEffect } from 'react';

/**
 * 모달 오픈 시 배경 스크롤을 완전 차단하는 훅
 * Locks background scroll completely when a modal is open
 *
 * @param isLocked - true 이면 스크롤 잠금 / if true, scroll is locked
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const scrollY = window.scrollY;

    // html + body 모두 잠금 → 모든 브라우저에서 배경 스크롤 완전 차단
    // Lock both html + body → fully prevents background scroll on all browsers
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
