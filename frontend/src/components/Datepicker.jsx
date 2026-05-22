//C:\Users\HP\MediTrack\frontend\src\components\Birthdaypicker.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

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
  for (let y = current; y >= 1924; y--) years.push(String(y));
  return years;
}

const ALL_YEARS = buildYears();

// ─── Drum column ──────────────────────────────────────────────────────────────
const ITEM_H  = 36; // compact row height
const VISIBLE = 2;  // rows visible above & below the selected centre row

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

  const totalH = ITEM_H * (VISIBLE * 2 + 1); // 5 rows total → 180px

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

// ─── Main component ───────────────────────────────────────────────────────────
export default function BirthdayPicker({ value, onChange, error }) {
  const [open, setOpen] = useState(false);

  const parse = (v) => {
    if (!v) return { day: 1, month: 1, year: new Date().getFullYear() - 18 };
    const [y, m, d] = v.split('-').map(Number);
    return { day: d || 1, month: m || 1, year: y || new Date().getFullYear() - 18 };
  };

  const init = parse(value);
  const [selDay,   setSelDay]   = useState(init.day);
  const [selMonth, setSelMonth] = useState(init.month);
  const [selYear,  setSelYear]  = useState(init.year);

  const days  = buildDays(selMonth, selYear);
  const years = ALL_YEARS;
  const dayIdx   = Math.min(selDay - 1, days.length - 1);
  const monthIdx = selMonth - 1;
  const yearIdx  = years.indexOf(String(selYear));

  useEffect(() => {
    const max = getDaysInMonth(selMonth, selYear);
    if (selDay > max) setSelDay(max);
  }, [selMonth, selYear]);

  useEffect(() => {
    if (value) { const p = parse(value); setSelDay(p.day); setSelMonth(p.month); setSelYear(p.year); }
  }, [value]);

  const handleSubmit = () => {
    onChange(`${selYear}-${String(selMonth).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`);
    setOpen(false);
  };

  const displayLabel = value
    ? (() => { const p = parse(value); return `${MONTH_FULL[p.month-1]} ${p.day}, ${p.year}`; })()
    : 'Select Date';

  const inputCls = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] outline-none focus:border-[#4a635d] bg-white transition-colors";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`${inputCls} text-left flex items-center justify-between ${error ? 'border-red-400 bg-red-50' : ''}`}
        style={{ cursor: 'pointer' }}>
        <span style={{ color: value ? '#1a2e22' : '#9bb5a5' }}>{displayLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={value ? '#2d7a52' : '#9bb5a5'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {error && (
        <p className="text-red-500 text-[11px] mt-1 ml-1 flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation text-[10px]"></i> {error}
        </p>
      )}

      {open && (
        <div
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          {/* Modal — maxWidth 300px keeps it compact */}
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 300, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '12px 16px 8px', textAlign: 'center', borderBottom: '1px solid #e2f0ea' }}>

              <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#1a2e22' }}>
                {MONTH_FULL[selMonth - 1]} {String(selDay).padStart(2,'0')}, {selYear}
              </p>
            </div>

            {/* Column labels */}
            <div style={{ display: 'flex', padding: '6px 12px 0' }}>
              {['Day', 'Month', 'Year'].map((h) => (
                <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#2d7a52', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
              ))}
            </div>

            {/* Drum columns */}
            <div style={{ display: 'flex', padding: '0 12px' }}>
              <DrumColumn items={days}   selectedIndex={dayIdx}                      onSelect={(i) => setSelDay(i + 1)}          width="33%" />
              <DrumColumn items={MONTHS} selectedIndex={monthIdx}                    onSelect={(i) => setSelMonth(i + 1)}        width="34%" />
              <DrumColumn items={years}  selectedIndex={yearIdx < 0 ? 0 : yearIdx}   onSelect={(i) => setSelYear(Number(years[i]))} width="33%" />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', borderTop: '1px solid #e2f0ea', marginTop: 4 }}>
              <button type="button" onClick={() => setOpen(false)}
                style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#6b8577', cursor: 'pointer', borderRight: '1px solid #e2f0ea' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSubmit}
                style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#2d7a52', cursor: 'pointer' }}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}