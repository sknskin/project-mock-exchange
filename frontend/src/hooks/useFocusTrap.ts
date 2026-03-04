/**
 * @file 포커스 트랩 훅
 * @description 모달/다이얼로그 내부에 탭 포커스를 가두는 접근성 훅입니다.
 *              활성화 시 컨테이너 내 첫 번째 포커스 가능 요소로 자동 이동하고,
 *              비활성화 시 이전에 포커스되었던 요소로 복원합니다.
 *
 * @file Focus Trap Hook
 * @description Accessibility hook that traps tab focus within a container element (for modals/dialogs).
 *              Auto-focuses the first focusable element on activation.
 *              Returns focus to the previously focused element when deactivated.
 */
import { useEffect, useRef, type RefObject } from 'react';

// 포커스 가능한 HTML 요소 셀렉터 (WAI-ARIA 기준)
// Focusable HTML element selectors (based on WAI-ARIA)
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 컨테이너 내부에 포커스를 가두는 훅
 * Tab/Shift+Tab 키 입력 시 컨테이너 내의 첫/마지막 요소 사이를 순환합니다.
 *
 * Hook that traps focus within a container.
 * Cycles between first/last focusable elements on Tab/Shift+Tab key press.
 *
 * @param containerRef - 포커스를 가둘 컨테이너 요소 ref / Ref to the container element for focus trapping
 * @param active - 포커스 트랩 활성화 여부 / Whether focus trap is active
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  // 트랩 활성화 전 포커스되어 있던 요소를 저장 (복원용)
  // Store the element focused before trap activation (for restoration)
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // 현재 포커스된 요소 저장 — 모달 닫힐 때 복원됨
    // Store the currently focused element — restored when modal closes
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // 컨테이너 내 첫 번째 포커스 가능 요소로 자동 이동
    // Auto-focus the first focusable element inside the container
    const focusFirst = () => {
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    };

    // requestAnimationFrame으로 지연 — 모달 렌더링 완료 후 포커스 이동
    // Delay with requestAnimationFrame — focus after modal rendering completes
    const raf = requestAnimationFrame(focusFirst);

    // Tab 키 이벤트 핸들러: 포커스 순환 로직
    // Tab key event handler: focus cycling logic
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: 첫 번째 요소에서 마지막으로 순환 / Wrap from first to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: 마지막 요소에서 첫 번째로 순환 / Wrap from last to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);

      // 이전 포커스 요소로 복원 — 모달이 닫힌 후 사용자가 이전 작업 위치로 돌아감
      // Restore focus to previous element — user returns to prior work position after modal closes
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [active, containerRef]);
}
