/**
 * @file 탭 스와이프 제스처 훅
 * @description 모바일에서 좌/우 스와이프로 탭을 전환하는 터치 제스처 감지 훅
 *
 * @file Tab Swipe Gesture Hook
 * @description Touch gesture detection hook for switching tabs via left/right swipe on mobile
 *
 * MOB-M-12: 모바일 스와이프 제스처로 탭 전환 — 최소 50px 가로 이동 + 30px 이내 세로 이동 시 트리거
 * MOB-M-12: Tab switch via mobile swipe gesture — triggers on min 50px horizontal + max 30px vertical movement
 */
import { useRef, useCallback } from 'react';

// 스와이프 감지 임계값 (px)
// Swipe detection thresholds (px)
const SWIPE_THRESHOLD_X = 50;
const SWIPE_THRESHOLD_Y = 30;

interface UseSwipeTabsOptions<T extends string> {
  /** 현재 활성 탭 / Currently active tab */
  activeTab: T;
  /** 탭 목록 (순서대로) / Tab list (in order) */
  tabs: T[];
  /** 탭 변경 콜백 / Tab change callback */
  onTabChange: (tab: T) => void;
}

/**
 * 터치 스와이프로 탭 전환 — 컨테이너 요소에 onTouchStart/onTouchEnd를 연결합니다
 * Switches tabs via touch swipe — connect onTouchStart/onTouchEnd to a container element
 */
export function useSwipeTabs<T extends string>({
  activeTab,
  tabs,
  onTabChange,
}: UseSwipeTabsOptions<T>) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    touchStartRef.current = null;

    // 세로 이동이 임계값을 초과하면 무시 (스크롤과 혼동 방지)
    // Ignore if vertical movement exceeds threshold (prevent confusion with scrolling)
    if (dy > SWIPE_THRESHOLD_Y) return;

    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    if (dx < -SWIPE_THRESHOLD_X && currentIndex < tabs.length - 1) {
      // 왼쪽 스와이프 → 다음 탭 / Swipe left → next tab
      onTabChange(tabs[currentIndex + 1]);
    } else if (dx > SWIPE_THRESHOLD_X && currentIndex > 0) {
      // 오른쪽 스와이프 → 이전 탭 / Swipe right → previous tab
      onTabChange(tabs[currentIndex - 1]);
    }
  }, [activeTab, tabs, onTabChange]);

  return { handleTouchStart, handleTouchEnd };
}
