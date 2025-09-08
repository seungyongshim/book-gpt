import { useEffect, useRef } from 'react';

/**
 * useFocusTrap
 * 간단한 포커스 트랩 훅: 컨테이너 내 포커스 가능한 요소(Tab 순환) + 초기 포커스 + 닫힐 때 복귀
 * shift+Tab 역방향 지원. hidden/disabled 요소 스킵.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);
  const previousFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previousFocused.current = (document.activeElement as HTMLElement) || null;
    const el = containerRef.current;
    if (!el) return;

    const focusableSelector = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusable = () => Array.from(el.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(x => !x.hasAttribute('disabled') && !x.getAttribute('aria-hidden'));

    const focusables = getFocusable();
    if (focusables.length) focusables[0].focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement;
      if (e.shiftKey) {
        if (activeEl === first || activeEl === el) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previousFocused.current && document.contains(previousFocused.current)) {
        previousFocused.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}

export default useFocusTrap;