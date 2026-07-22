// C:\Users\HP\MediTrack\frontend\src\components\DateTimePicker.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const AMPM     = ['AM', 'PM'];

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

// ─── Drum column (shared by date + time sections) ─────────────────────────────
const ITEM_H  = 34;
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
              style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: active ? 15 : 12, fontWeight: active ? 700 : 400, color: active ? '#1a2e22' : '#9bb5a5', transition: 'all 0.12s', cursor: 'pointer' }}>
              {item}
            </div>
          );
        })}
        {Array.from({ length: VISIBLE }).map((_, i) => <div key={`b${i}`} style={{ height: ITEM_H }} />)}
      </div>
    </div>
  );
}

// ─── Pure string parser ───────────────────────────────────────────────────────
// Accepts "YYYY-MM-DDTHH:mm", "YYYY-MM-DD HH:mm", or a bare "YYYY-MM-DD"
// (time defaults to 00:00 in that case). Returns 24-hour `h`.
const parseDateTimeValue = (v) => {
  if (!v) return null;

  try {
    const text = typeof v === 'string' ? v : String(v);

    const dateMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!dateMatch) return null;

    const y = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    const d = parseInt(dateMatch[3], 10);
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;

    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    const h   = timeMatch ? parseInt(timeMatch[1], 10) : 0;
    const min = timeMatch ? parseInt(timeMatch[2], 10) : 0;

    return { y, m, d, h: h >= 0 && h <= 23 ? h : 0, min: min >= 0 && min <= 59 ? min : 0 };
  } catch (err) {
    return null;
  }
};

// ─── Main component ───────────────────────────────────────────────────────────
// Emits onChange(value) with value formatted as "YYYY-MM-DDTHH:mm" — the same
// shape a native <input type="datetime-local"> produces, so it's a drop-in
// replacement wherever that format is expected.
export default function DateTimePicker({ value, onChange, error, placeholder = 'Select Date & Time', className }) {
  const [open, setOpen] = useState(false);

  const parsedValue = parseDateTimeValue(value);
  const now = new Date();
  const init = parsedValue || {
    y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(),
    h: now.getHours(), min: now.getMinutes(),
  };

  const initHour12Idx = (init.h % 12 || 12) - 1;
  const initAmpmIdx = init.h >= 12 ? 1 : 0;

  const [selYear,  setSelYear]  = useState(init.y);
  const [selMonth, setSelMonth] = useState(init.m);
  const [selDay,   setSelDay]   = useState(init.d);
  const [selHourIdx, setSelHourIdx] = useState(initHour12Idx);
  const [selMinIdx,  setSelMinIdx]  = useState(init.min);
  const [selAmpmIdx, setSelAmpmIdx] = useState(initAmpmIdx);

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
    const p = parseDateTimeValue(value);
    if (p) {
      setSelYear(p.y);
      setSelMonth(p.m);
      setSelDay(p.d);
      setSelHourIdx((p.h % 12 || 12) - 1);
      setSelMinIdx(p.min);
      setSelAmpmIdx(p.h >= 12 ? 1 : 0);
    }
  }, [value]);

  const handleSubmit = () => {
    let h24 = selHourIdx + 1;
    if (selAmpmIdx === 1 && h24 < 12) h24 += 12; // PM (except 12 PM)
    if (selAmpmIdx === 0 && h24 === 12) h24 = 0; // 12 AM is 00

    const dateStr = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(selDay).padStart(2, '0')}`;
    const timeStr = `${String(h24).padStart(2, '0')}:${String(selMinIdx).padStart(2, '0')}`;
    onChange(`${dateStr}T${timeStr}`);
    setOpen(false);
  };

  const displayLabel = parsedValue
    ? `${MONTHS[parsedValue.m - 1]} ${String(parsedValue.d).padStart(2, '0')}, ${parsedValue.y} · ${String((parsedValue.h % 12 || 12)).padStart(2, '0')}:${String(parsedValue.min).padStart(2, '0')} ${parsedValue.h >= 12 ? 'PM' : 'AM'}`
    : placeholder;

  const isValid = parsedValue !== null;

  const defaultCls = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
  const inputCls = className || defaultCls;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`${inputCls} text-left flex items-center justify-between ${error ? 'border-red-400 bg-red-50' : ''}`}
        style={{ cursor: 'pointer' }}>
        <span style={{ color: isValid ? '#334155' : '#94a3b8' }}>{displayLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <i className="fa-regular fa-calendar text-slate-500 text-sm"></i>
          <i className="fa-regular fa-clock text-slate-500 text-sm"></i>
        </span>
      </button>

      {error && (
        <p className="text-red-500 text-[11px] mt-1 ml-1 flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation text-[10px]"></i> {error}
        </p>
      )}

      {open && createPortal(
        <div onClick={(e) => e.target === e.currentTarget && setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 320, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px', textAlign: 'center', borderBottom: '1px solid #e2f0ea' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1a2e22' }}>
                {MONTH_FULL[selMonth - 1]} {String(selDay).padStart(2, '0')}, {selYear}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#2d7a52' }}>
                {HOURS_12[selHourIdx]}:{MINUTES[selMinIdx]} {AMPM[selAmpmIdx]}
              </p>
            </div>

            {/* ── Date section ── */}
            <div style={{ display: 'flex', padding: '10px 12px 0' }}>
              {['Day', 'Month', 'Year'].map((h) => <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#2d7a52', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>)}
            </div>
            <div style={{ display: 'flex', padding: '0 12px' }}>
              <DrumColumn items={days}   selectedIndex={dayIdx}                    onSelect={(i) => setSelDay(i + 1)}             width="33%" />
              <DrumColumn items={MONTHS} selectedIndex={monthIdx}                  onSelect={(i) => setSelMonth(i + 1)}           width="34%" />
              <DrumColumn items={years}  selectedIndex={yearIdx < 0 ? 0 : yearIdx} onSelect={(i) => setSelYear(Number(years[i]))} width="33%" />
            </div>

            {/* ── Time section ── */}
            <div style={{ display: 'flex', padding: '10px 12px 0', borderTop: '1px solid #f0f5f3', marginTop: 8 }}>
              {['Hour', 'Minute', 'AM/PM'].map((h) => <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#2a5a4a', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>{h}</div>)}
            </div>
            <div style={{ display: 'flex', padding: '0 12px' }}>
              <DrumColumn items={HOURS_12} selectedIndex={selHourIdx} onSelect={setSelHourIdx} width="33.3%" />
              <DrumColumn items={MINUTES}  selectedIndex={selMinIdx}  onSelect={setSelMinIdx}  width="33.3%" />
              <DrumColumn items={AMPM}     selectedIndex={selAmpmIdx} onSelect={setSelAmpmIdx} width="33.3%" />
            </div>

            <div style={{ display: 'flex', borderTop: '1px solid #e2f0ea', marginTop: 10 }}>
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