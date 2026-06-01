import { useRef, useEffect } from 'react';

const THRESHOLD   = 72;   // px dragged before release triggers refresh
const RESIST      = 0.4;  // rubber-band feel (lower = more resistance)
const SPINNER_H   = 56;   // px of reserved space for the spinner

export function usePullToRefresh(onRefresh) {
  const isRefreshing  = useRef(false);
  const indicatorRef  = useRef(null);
  const scrollElRef   = useRef(null);

  useEffect(() => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl) return;

    // Use local variables instead of refs for touch state
    // since they don't need to persist across renders outside this effect
    let startY = 0;
    let pullDist = 0;

    // Animate the indicator element
    const setIndicator = (dist, refreshing = false) => {
      const el = indicatorRef.current;
      if (!el) return;

      if (refreshing) {
        el.style.height    = `${SPINNER_H}px`;
        el.style.opacity   = '1';
        el.dataset.spin    = 'true';
        return;
      }

      const clamped = Math.min(dist, THRESHOLD * 1.5);
      el.style.height    = `${clamped * RESIST}px`;
      el.style.opacity   = String(Math.min(clamped / THRESHOLD, 1));
      el.dataset.spin    = 'false';

      // rotate the arrow icon to signal "ready to release"
      const icon = el.querySelector('[data-ptr-icon]');
      if (icon) {
        icon.style.transform = clamped >= THRESHOLD ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    };

    const handleTouchStart = (e) => {
      if (isRefreshing.current) return;
      if (scrollEl.scrollTop > 0) return; // only fire when already at the top

      startY = e.touches[0].clientY;
      pullDist = 0;
    };

    const handleTouchMove = (e) => {
      if (isRefreshing.current || startY === 0) return;
      if (scrollEl.scrollTop > 0) {
        startY = 0;
        return;
      }

      const delta = e.touches[0].clientY - startY;
      if (delta <= 0) return;

      pullDist = delta;
      setIndicator(delta);

      // Prevent native page scroll while pulling.
      // Because we set { passive: false }, this will no longer throw an error.
      if (delta > 8 && e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (startY === 0 || isRefreshing.current) return;
      startY = 0;

      if (pullDist < THRESHOLD) {
        // Not far enough — snap back
        setIndicator(0);
        return;
      }

      // Trigger refresh
      isRefreshing.current = true;
      setIndicator(0, true);

      try {
        await onRefresh();
      } finally {
        isRefreshing.current = false;
        setIndicator(0);
      }
    };


    scrollEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Cleanup
    return () => {
      scrollEl.removeEventListener('touchstart', handleTouchStart);
      scrollEl.removeEventListener('touchmove', handleTouchMove);
      scrollEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);

  // Notice we only return the refs now, no callbacks
  return { scrollElRef, indicatorRef };
}