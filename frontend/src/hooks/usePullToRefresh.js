import { useRef, useEffect } from 'react';

const THRESHOLD   = 72;   // px dragged before release triggers refresh
const RESIST      = 0.4;  // rubber-band feel (lower = more resistance)
const SPINNER_H   = 56;   // px of reserved space for the spinner
const DEAD_ZONE   = 12;   // px of initial movement ignored (absorbs jitter)

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
    let armed = false; // true only once we've confirmed a genuine vertical pull

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
      armed = false;
      setIndicator(0);
    };

    const handleTouchStart = (e) => {
      if (isRefreshing.current) return;
      if (scrollEl.scrollTop > 0) return; // only fire when already at the top

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pullDist = 0;
      armed = false;
    };

    const handleTouchMove = (e) => {
      if (isRefreshing.current || startY === 0) return;

      // Bail immediately if content has scrolled — never intercept
      // a normal scroll gesture, up or down.
      if (scrollEl.scrollTop > 0) {
        reset();
        return;
      }

      const deltaY = e.touches[0].clientY - startY;
      const deltaX = e.touches[0].clientX - startX;

      // Direction reversed (or never was a pull) — treat as normal
      // scroll and clear any leftover indicator/reserved height
      // immediately, so nothing shifts layout mid-gesture.
      if (deltaY <= 0) {
        if (pullDist > 0) reset();
        return;
      }

      // Not armed yet: require enough clean vertical movement before
      // we mutate any DOM or call preventDefault. This absorbs the
      // small jitter that a normal upward-scroll swipe often starts with.
      if (!armed) {
        if (deltaY < DEAD_ZONE) return;
        if (Math.abs(deltaX) > deltaY) return; // mostly horizontal, ignore
        armed = true;
      }

      pullDist = deltaY;
      setIndicator(deltaY);

      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (startY === 0 || isRefreshing.current) {
        reset();
        return;
      }

      const finalPull = pullDist;
      reset();

      if (finalPull < THRESHOLD) return; // snap back, already reset

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