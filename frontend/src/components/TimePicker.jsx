// C:\Users\HP\MediTrack\frontend\src\components\TimePicker.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const AMPM     = ['AM', 'PM'];

// ─── Drum column ──────────────────────────────────────────────────────────────
const ITEM_H  = 40;
const VISIBLE = 2;

function DrumColumn({ items, selectedIndex, onSelect, width }) {
  const listRef    = useRef(null);
  const isDragging = useRef(false);
  const startY     = useRef(0);
  const startST    = useRef(0);
  const snapTimer  = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = selectedIndex * ITEM_H;
  }, [selectedIndex]);

  const snapToNearest = useCallback(() => {
    if (!listRef.current) return;
    const idx     = Math.round(listRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    listRef.current.scrollTop = clamped * ITEM_H;
    onSelect(clamped);
  }, [items.length, onSelect]);

  const handleScroll = () => {
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(snapToNearest, 80);
  };

  const onTouchStart = (e) => { startY.current = e.touches.clientY; startST.current = listRef.current.scrollTop; };
  const onTouchMove  = (e) => { listRef.current.scrollTop = startST.current + (startY.current - e.touches.clientY); };
  const onTouchEnd   = () => snapToNearest();

  const onMouseDown = (e) => {
    isDragging.current = true;
    startY.current  = e.clientY;
    startST.current = listRef.current.scrollTop;
    e.preventDefault();
  };

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    listRef.current.scrollTop = startST.current + (startY.current - e.clientY);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    snapToNearest();
  }, [snapToNearest]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const totalH = ITEM_H * (VISIBLE * 2 + 1);

  return (
    <div style={{ width, position: 'relative', userSelect: 'none' }}>
      {/* Top Gradient Fade */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * VISIBLE, background: 'linear-gradient(to bottom, rgba(255,255,255,1) 15%, rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 2 }} />

      {/* Bottom Gradient Fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * VISIBLE, background: 'linear-gradient(to top, rgba(255,255,255,1) 15%, rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 2 }} />

      {/* Selection Box Highlight (Matches DatePicker) */}
      <div style={{ position: 'absolute', top: ITEM_H * VISIBLE, left: 6, right: 6, height: ITEM_H, border: '1.5px solid #8baea6', borderRadius: 8, pointerEvents: 'none', zIndex: 3 }} />

      <div
        ref={listRef}
        onScroll={handleScroll}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{ height: totalH, overflowY: 'scroll', scrollbarWidth: 'none', cursor: 'grab' }}
      >
        <style>{`.bp-col::-webkit-scrollbar{display:none}`}</style>
        {Array.from({ length: VISIBLE }).map((_, i) => <div key={`t${i}`} style={{ height: ITEM_H }} />)}
        {items.map((item, i) => {
          const active = i === selectedIndex;
          return (
            <div
              key={item}
              onClick={() => { listRef.current.scrollTop = i * ITEM_H; onSelect(i); }}
              style={{
                height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: active ? 16 : 14, fontWeight: active ? 800 : 400,
                color: active ? '#1a2e22' : '#cbd5d1', transition: 'all 0.12s', cursor: 'pointer',
              }}
            >
              {item}
            </div>
          );
        })}
        {Array.from({ length: VISIBLE }).map((_, i) => <div key={`b${i}`} style={{ height: ITEM_H }} />)}
      </div>
    </div>
  );
}

// ─── Main TimePicker ───────────────────────────────────────────────────────────
export default function TimePicker({ value, onChange, error, placeholder = 'Select Time' }) {
  const [open, setOpen] = useState(false);

  const parse = (v) => {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();

    if (v) {
      const match = String(v).match(/(\d{1,2}):(\d{2})/);
      if (match) {
        h = parseInt(match, 10);
        m = parseInt(match, 10);
      }
    }

    const isPm = h >= 12;
    const hour12 = h % 12 || 12;

    return {
      hourIdx: hour12 - 1, // Maps to 0-11
      minIdx: m,           // Maps to 0-59
      ampmIdx: isPm ? 1 : 0 // Maps to 0-1
    };
  };

  const init = parse(value);
  const [selHourIdx, setSelHourIdx] = useState(init.hourIdx);
  const [selMinIdx, setSelMinIdx]   = useState(init.minIdx);
  const [selAmpmIdx, setSelAmpmIdx] = useState(init.ampmIdx);

  useEffect(() => {
    if (value) {
      const p = parse(value);
      setSelHourIdx(p.hourIdx);
      setSelMinIdx(p.minIdx);
      setSelAmpmIdx(p.ampmIdx);
    }
  }, [value]);

  const handleSubmit = () => {
    let h24 = selHourIdx + 1;
    if (selAmpmIdx === 1 && h24 < 12) h24 += 12; // PM (except 12 PM)
    if (selAmpmIdx === 0 && h24 === 12) h24 = 0; // 12 AM is 00

    const timeString = `${String(h24).padStart(2,'0')}:${String(selMinIdx).padStart(2,'0')}`;
    onChange(timeString);
    setOpen(false);
  };

  const formatAMPM = (hIdx, mIdx, ampmIdx) => {
    const h = HOURS_12[hIdx];
    const m = MINUTES[mIdx];
    const ampm = AMPM[ampmIdx];
    return `${h}:${m} ${ampm}`;
  };

  // Safe display label generator to prevent "undefined"
  const isValidTime = value && String(value).match(/(\d{1,2}):(\d{2})/);

  const displayLabel = isValidTime
    ? (() => {
        const p = parse(value);
        return formatAMPM(p.hourIdx, p.minIdx, p.ampmIdx);
      })()
    : placeholder;

  const currentSelectionLabel = formatAMPM(selHourIdx, selMinIdx, selAmpmIdx);

  const inputCls = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-lg text-[13px] outline-none focus:border-[#466460] bg-white transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${inputCls} text-left flex items-center justify-between ${error ? 'border-red-400 bg-red-50' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        <span style={{ color: isValidTime ? '#1a2e22' : '#9bb5a5', fontSize: 13 }}>{displayLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isValidTime ? '#466460' : '#9bb5a5'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 15.5"/>
          </svg>
        </span>
      </button>

      {error && (
        <p className="text-red-500 text-[11px] mt-1 ml-1 flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation text-[10px]"></i> {error}
        </p>
      )}

      {open && (
        <div onClick={(e) => e.target === e.currentTarget && setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 300, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

            {/* Header matches DatePicker (White bg, bold dark text) */}
            <div style={{ padding: '24px 16px 16px', textAlign: 'center', background: '#fff' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a2e22' }}>{currentSelectionLabel}</p>
            </div>

            {/* Columns section */}
            <div style={{ padding: '0px 14px 12px' }}>

              {/* Column Labels */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', borderBottom: '1px solid #f0f5f3', paddingBottom: '12px' }}>
                {['Hour', 'Minute', 'AM/PM'].map((h) => (
                  <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#2a5a4a', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
                ))}
              </div>

              {/* Scroll Drums */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DrumColumn items={HOURS_12} selectedIndex={selHourIdx} onSelect={setSelHourIdx} width="33.3%" />
                <DrumColumn items={MINUTES}  selectedIndex={selMinIdx}  onSelect={setSelMinIdx}  width="33.3%" />
                <DrumColumn items={AMPM}     selectedIndex={selAmpmIdx} onSelect={setSelAmpmIdx} width="33.3%" />
              </div>
            </div>

            {/* Bottom Buttons */}
            <div style={{ display: 'flex', borderTop: '1px solid #e2f0ea' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ flex: 1, padding: '16px 0', background: '#fff', border: 'none', fontSize: 14, fontWeight: 700, color: '#6b8577', cursor: 'pointer', borderRight: '1px solid #e2f0ea' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                style={{ flex: 1, padding: '16px 0', background: '#fff', border: 'none', fontSize: 14, fontWeight: 800, color: '#2a5a4a', cursor: 'pointer' }}>
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}