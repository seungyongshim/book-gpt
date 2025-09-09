import { useEffect } from 'react';

/**
 * useInert
 * 특정 조건(true)일 때 대상 요소를 inert(포커스/탐색 불가) 처리.
 * - inert 속성(지원 안하면 tabindex=-1 + aria-hidden 적용)
 */
export function useInert(ref: React.RefObject<HTMLElement>, inactive: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (inactive) {
      // 브라우저 inert 지원 여부
      const supportsInert = 'inert' in HTMLElement.prototype;
      if (supportsInert) {
        (el as any).inert = true;
      } else {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('tabindex', '-1');
        // 자손 포커스 가능 요소 비활성화
        const focusables = el.querySelectorAll<HTMLElement>(
          'a, button, textarea, input, select, [tabindex]'
        );
        focusables.forEach(f => {
          if (!f.getAttribute('data-orig-tabindex')) {
            const ti = f.getAttribute('tabindex');
            if (ti !== null) f.setAttribute('data-orig-tabindex', ti);
          }
          f.setAttribute('tabindex', '-1');
        });
      }
    } else {
      const supportsInert = 'inert' in HTMLElement.prototype;
      if (supportsInert) {
        (el as any).inert = false;
      } else {
        el.removeAttribute('aria-hidden');
        el.removeAttribute('tabindex');
        const focusables = el.querySelectorAll<HTMLElement>(
          'a, button, textarea, input, select, [tabindex]'
        );
        focusables.forEach(f => {
          const orig = f.getAttribute('data-orig-tabindex');
            if (orig !== null) {
              f.setAttribute('tabindex', orig);
              f.removeAttribute('data-orig-tabindex');
            } else {
              f.removeAttribute('tabindex');
            }
        });
      }
    }
  }, [ref, inactive]);
}
