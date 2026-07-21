// C:\Users\HP\MediTrack\frontend\src\components\Datepicker.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function buildDays(month, year) {
  const count = getDaysInMonth(month, year);
  return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));
}

function buildYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 5; y >= 1924; y--) years.push(String(y));
  return years;
}

const ALL_YEARS = buildYears();

// ─── Drum column ──────────────────────────────────────────────────────────────
const ITEM_H  = 36;
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

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; startST.current = listRef.current.scrollTop; };
  const onTouchMove  = (e) => { listRef.current.scrollTop = startST.current + (startY.current - e.touches[0].clientY); };
  const onTouchEnd   = () => snapToNearest();

  const onMouseDown = (e) => { isDragging.current = true; startY.current = e.clientY; startST.current = listRef.current.scrollTop; e.preventDefault(); };
  const onMouseMove = useCallback((e) => { if (!isDragging.current) return; listRef.current.scrollTop = startST.current + (startY.current - e.clientY); }, []);
  const onMouseUp   = useCallback(() => { if (!isDragging.current) return; isDragging.current = false; snapToNearest(); }, [snapToNearest]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  const totalH = ITEM_H * (VISIBLE * 2 + 1);

  return (
    <div style={{ width, position: 'relative', userSelect: 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * VISIBLE, background: 'linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(255,255,255,0.05))', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * VISIBLE, background: 'linear-gradient(to top, rgba(255,255,255,0.96), rgba(255,255,255,0.05))', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', top: ITEM_H * VISIBLE, left: 4, right: 4, height: ITEM_H, borderTop: '1.5px solid #2d7a52', borderBottom: '1.5px solid #2d7a52', borderRadius: 4, pointerEvents: 'none', zIndex: 3 }} />
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
            <div key={item}
              onClick={() => { listRef.current.scrollTop = i * ITEM_H; onSelect(i); }}
              style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: active ? 16 : 12, fontWeight: active ? 700 : 400, color: active ? '#1a2e22' : '#9bb5a5', transition: 'all 0.12s', cursor: 'pointer' }}>
              {item}
            </div>
          );
        })}
        {Array.from({ length: VISIBLE }).map((_, i) => <div key={`b${i}`} style={{ height: ITEM_H }} />)}
      </div>
    </div>
  );
}

// ─── Pure String Parser ───────────────────────────────────────────────────────
const parseDateValue = (v) => {
  if (!v) return null;

  try {
    // Force the value to a flat string immediately
    const text = typeof v === 'string' ? v : String(v);

    // 1. Look for YYYY-MM-DD
    let match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return { y, m, d };
    }

    // 2. Look for MM/DD/YYYY
    match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const m = parseInt(match[1], 10);
      const d = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return { y, m, d };
    }
  } catch (err) {
    // Silently catch to prevent crashes
  }

  return null;
};

// ─── Main component ───────────────────────────────────────────────────────────
// `className` is optional. When omitted, the trigger button keeps its
// original look (used everywhere else in the app). Pass a className to
// make the trigger match a different surrounding design (e.g. a filter bar).
export default function DatePicker({ value, onChange, error, placeholder = 'Select Date', className }) {
  const [open, setOpen] = useState(false);

  // Initialize state
  const parsedValue = parseDateValue(value);
  const now = new Date();
  const init = parsedValue || { d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() };

  const [selDay,   setSelDay]   = useState(init.d);
  const [selMonth, setSelMonth] = useState(init.m);
  const [selYear,  setSelYear]  = useState(init.y);

  const days  = buildDays(selMonth, selYear);
  const years = ALL_YEARS;
  const dayIdx   = Math.min(selDay - 1, days.length - 1);
  const monthIdx = selMonth - 1;
  const yearIdx  = years.indexOf(String(selYear));

  useEffect(() => {
    const max = getDaysInMonth(selMonth, selYear);
    if (selDay > max) setSelDay(max);
  }, [selMonth, selYear]);

  // Sync state when external prop changes
  useEffect(() => {
    const p = parseDateValue(value);
    if (p) {
      setSelDay(p.d);
      setSelMonth(p.m);
      setSelYear(p.y);
    }
  }, [value]);

  const handleSubmit = () => {
    onChange(`${selYear}-${String(selMonth).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`);
    setOpen(false);
  };

  // Safe display label generator for MM/DD/YYYY
  const displayLabel = parsedValue
    ? `${String(parsedValue.m).padStart(2, '0')}/${String(parsedValue.d).padStart(2, '0')}/${parsedValue.y}`
    : placeholder;

  const isValidDate = parsedValue !== null;

  const defaultCls = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
  const inputCls = className || defaultCls;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`${inputCls} text-left flex items-center justify-between ${error ? 'border-red-400 bg-red-50' : ''}`}
        style={{ cursor: 'pointer' }}>
        <span style={{ color: isValidDate ? '#334155' : '#94a3b8' }}>{displayLabel}</span>
        <i className="fa-regular fa-calendar text-slate-500 text-sm"></i>
      </button>

      {error && (
        <p className="text-red-500 text-[11px] mt-1 ml-1 flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation text-[10px]"></i> {error}
        </p>
      )}

      {open && createPortal(
        <div onClick={(e) => e.target === e.currentTarget && setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 300, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 8px', textAlign: 'center', borderBottom: '1px solid #e2f0ea' }}>
              <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#1a2e22' }}>
                {MONTH_FULL[selMonth - 1]} {String(selDay).padStart(2,'0')}, {selYear}
              </p>
            </div>
            <div style={{ display: 'flex', padding: '6px 12px 0' }}>
              {['Day', 'Month', 'Year'].map((h) => <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#2d7a52', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>)}
            </div>
            <div style={{ display: 'flex', padding: '0 12px' }}>
              <DrumColumn items={days}   selectedIndex={dayIdx}                      onSelect={(i) => setSelDay(i + 1)}         width="33%" />
              <DrumColumn items={MONTHS} selectedIndex={monthIdx}                    onSelect={(i) => setSelMonth(i + 1)}       width="34%" />
              <DrumColumn items={years}  selectedIndex={yearIdx < 0 ? 0 : yearIdx}   onSelect={(i) => setSelYear(Number(years[i]))} width="33%" />
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid #e2f0ea', marginTop: 4 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#6b8577', cursor: 'pointer', borderRight: '1px solid #e2f0ea' }}>Cancel</button>
              <button type="button" onClick={handleSubmit} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#2d7a52', cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}