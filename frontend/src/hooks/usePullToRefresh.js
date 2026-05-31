//C:\Users\HP\MediTrack\frontend\src\hooks\usePullToRefresh.js
import { useRef, useCallback } from 'react';

const THRESHOLD   = 72;   // px dragged before release triggers refresh
const RESIST      = 0.4;  // rubber-band feel (lower = more resistance)
const SPINNER_H   = 56;   // px of reserved space for the spinner

export function usePullToRefresh(onRefresh) {
  const startYRef     = useRef(0);
  const pullDistRef   = useRef(0);
  const isRefreshing  = useRef(false);
  const indicatorRef  = useRef(null);
  const scrollElRef   = useRef(null);

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
    if (icon) icon.style.transform = clamped >= THRESHOLD
      ? 'rotate(180deg)'
      : 'rotate(0deg)';
  };

  const onTouchStart = useCallback((e) => {
    const el = scrollElRef.current;
    if (!el || isRefreshing.current) return;
    if (el.scrollTop > 0) return;  // only fire when already at the top

    startYRef.current  = e.touches[0].clientY;
    pullDistRef.current = 0;
  }, []);

  const onTouchMove = useCallback((e) => {
    const el = scrollElRef.current;
    if (!el || isRefreshing.current || startYRef.current === 0) return;
    if (el.scrollTop > 0) { startYRef.current = 0; return; }

    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) return;

    pullDistRef.current = delta;
    setIndicator(delta);

    // Prevent native page scroll while pulling
    if (delta > 8) e.preventDefault();
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (startYRef.current === 0 || isRefreshing.current) return;
    startYRef.current = 0;

    if (pullDistRef.current < THRESHOLD) {
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
  }, [onRefresh]);

  return { scrollElRef, indicatorRef, onTouchStart, onTouchMove, onTouchEnd };
}