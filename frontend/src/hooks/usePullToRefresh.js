// C:\Users\HP\MediTrack\frontend\src\hooks\usePullToRefresh.js
import { useRef, useEffect } from 'react';

const THRESHOLD   = 72;
const RESIST      = 0.4;
const SPINNER_H   = 56;
const DEAD_ZONE   = 12;

export function usePullToRefresh(onRefresh) {
  const isRefreshing  = useRef(false);
  const indicatorRef  = useRef(null);
  const scrollElRef   = useRef(null);

  useEffect(() => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl) return;

    let startX = 0;
    let startY = 0;
    let pullDist = 0;
    let tracking = false;   // touch began at scrollTop 0, still watching
    let committed = false;  // confirmed real pull past dead zone — safe to preventDefault

    const setIndicator = (dist, refreshing = false) => {
      const el = indicatorRef.current;
      if (!el) return;

      if (refreshing) {
        el.style.height  = `${SPINNER_H}px`;
        el.style.opacity = '1';
        el.dataset.spin  = 'true';
        return;
      }

      const clamped = Math.min(dist, THRESHOLD * 1.5);
      el.style.height  = `${clamped * RESIST}px`;
      el.style.opacity = String(Math.min(clamped / THRESHOLD, 1));
      el.dataset.spin  = 'false';

      const icon = el.querySelector('[data-ptr-icon]');
      if (icon) {
        icon.style.transform = clamped >= THRESHOLD ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    };

    const reset = () => {
      startX = 0;
      startY = 0;
      pullDist = 0;
      tracking = false;
      committed = false;
      setIndicator(0);
    };

    const handleTouchStart = (e) => {
      if (isRefreshing.current) return;
      if (scrollEl.scrollTop > 0) return; // only watch when already at the top

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pullDist = 0;
      tracking = true;
      committed = false;
    };

    const handleTouchMove = (e) => {
      if (isRefreshing.current || !tracking) return;

      // Bail immediately if content has scrolled (never touched preventDefault, so nothing to undo)
      if (scrollEl.scrollTop > 0) {
        reset();
        return;
      }

      const deltaY = e.touches[0].clientY - startY;
      const deltaX = e.touches[0].clientX - startX;

      // Any upward or neutral movement — let the browser fully own it, no preventDefault ever
      if (deltaY <= 0) {
        if (pullDist > 0) reset();
        return;
      }

      if (!committed) {
        // Still deciding. Don't touch preventDefault yet — a stray few px of
        // downward jitter shouldn't lock the browser out of native scrolling
        // for the rest of the gesture.
        if (Math.abs(deltaX) > deltaY) {
          reset(); // clearly horizontal, let browser handle it
          return;
        }
        if (deltaY <= DEAD_ZONE) {
          return; // inside dead zone — do nothing, no DOM writes, no preventDefault
        }
        committed = true; // only now do we treat this as a genuine pull
      }

      const visualDist = deltaY - DEAD_ZONE;
      pullDist = visualDist;
      setIndicator(visualDist);

      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!tracking || isRefreshing.current) {
        reset();
        return;
      }

      const finalPull = pullDist;
      reset();

      if (finalPull < THRESHOLD) return;

      isRefreshing.current = true;
      setIndicator(0, true);

      try {
        await onRefresh();
      } finally {
        isRefreshing.current = false;
        setIndicator(0);
      }
    };

    const handleTouchCancel = () => {
      if (!isRefreshing.current) reset();
    };

    scrollEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    scrollEl.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      scrollEl.removeEventListener('touchstart', handleTouchStart);
      scrollEl.removeEventListener('touchmove', handleTouchMove);
      scrollEl.removeEventListener('touchend', handleTouchEnd);
      scrollEl.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onRefresh]);

  return { scrollElRef, indicatorRef };
}