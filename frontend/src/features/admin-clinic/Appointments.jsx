// frontend/src/features/admin-clinic/Appointments.jsx
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointments } from '../../context/AppointmentContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const HOUR_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const startH = 7 + i;
  const endH   = startH + 1;
  const fmt = (h) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hr     = h % 12 || 12;
    return `${hr}:00 ${period}`;
  };
  return {
    value: `${String(startH).padStart(2, '0')}:00`,
    label: `${fmt(startH)} – ${fmt(endH)}`,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr     = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,'0')} ${period}`;
};

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const IconChevronLeft = ({ size = 12, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="8,2 4,6 8,10"/>
  </svg>
);

const IconChevronRight = ({ size = 12, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="4,2 8,6 4,10"/>
  </svg>
);

const IconChevronUp = ({ size = 11, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="2,8 6,4 10,8"/>
  </svg>
);

const IconChevronDown = ({ size = 11, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="2,4 6,8 10,4"/>
  </svg>
);

const IconCheck = ({ size = 9, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 9 7" fill="none" stroke="white"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 3.5L3.5 6L8 1"/>
  </svg>
);

const IconCircleCheck = ({ size = 14, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <path d="M5 8l2 2 4-4"/>
  </svg>
);

const IconCircleExclamation = ({ size = 14, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <line x1="8" y1="5" x2="8" y2="8.5"/>
    <circle cx="8" cy="11" r="0.5" fill={color}/>
  </svg>
);

const IconClock = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <polyline points="8,4.5 8,8 10.5,10"/>
  </svg>
);

const IconCalendar = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1.5" y="2.5" width="13" height="12" rx="2"/>
    <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
    <line x1="5" y1="1" x2="5" y2="4"/>
    <line x1="11" y1="1" x2="11" y2="4"/>
  </svg>
);

const IconCalendarCheck = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1.5" y="2.5" width="13" height="12" rx="2"/>
    <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
    <line x1="5" y1="1" x2="5" y2="4"/>
    <line x1="11" y1="1" x2="11" y2="4"/>
    <path d="M5.5 10.5l1.5 1.5 3-3"/>
  </svg>
);

const IconCalendarXmark = ({ size = 28, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="3.5" width="20" height="18" rx="3"/>
    <line x1="2" y1="9.5" x2="22" y2="9.5"/>
    <line x1="7" y1="1.5" x2="7" y2="5.5"/>
    <line x1="17" y1="1.5" x2="17" y2="5.5"/>
    <line x1="9" y1="14" x2="15" y2="19"/>
    <line x1="15" y1="14" x2="9" y2="19"/>
  </svg>
);

const IconInbox = ({ size = 28, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22,12 16,12 14,15 10,15 8,12 2,12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

const IconMagnifyingGlass = ({ size = 28, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="7"/>
    <line x1="16.5" y1="16.5" x2="22" y2="22"/>
  </svg>
);

const IconUser = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="5" r="3"/>
    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
  </svg>
);

const IconIdCard = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1" y="3.5" width="14" height="9" rx="2"/>
    <circle cx="5.5" cy="8" r="1.5"/>
    <line x1="8.5" y1="6.5" x2="13" y2="6.5"/>
    <line x1="8.5" y1="9.5" x2="13" y2="9.5"/>
  </svg>
);

const IconTag = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M13.5 8.5l-5-5H2v6.5l5 5 6.5-6.5z"/>
    <circle cx="5.5" cy="5.5" r="1"/>
  </svg>
);

const IconBuilding = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="1.5" width="12" height="13" rx="1"/>
    <line x1="2" y1="6" x2="14" y2="6"/>
    <line x1="2" y1="10" x2="14" y2="10"/>
    <line x1="6" y1="6" x2="6" y2="14.5"/>
    <line x1="10" y1="6" x2="10" y2="14.5"/>
  </svg>
);

const IconGraduationCap = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="8,2 15,6 8,10 1,6"/>
    <path d="M4 7.5v3.5c0 1.7 1.8 3 4 3s4-1.3 4-3V7.5"/>
    <line x1="15" y1="6" x2="15" y2="10"/>
  </svg>
);

const IconUsers = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="6" cy="5" r="2.5"/>
    <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
    <circle cx="11.5" cy="5" r="2"/>
    <path d="M13.5 13c0-1.9-1-3.5-2.5-4.3"/>
  </svg>
);

const IconStethoscope = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 2.5c0 3 2.5 5 5 5s5-2 5-5"/>
    <line x1="3" y1="2.5" x2="3" y2="5"/>
    <line x1="13" y1="2.5" x2="13" y2="5"/>
    <path d="M13 7.5a3.5 3.5 0 010 7h-1a3.5 3.5 0 01-3.5-3.5V10"/>
    <circle cx="13" cy="13.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const IconXmark = ({ size = 12, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" {...props}>
    <line x1="2" y1="2" x2="10" y2="10"/>
    <line x1="10" y1="2" x2="2" y2="10"/>
  </svg>
);

const IconCircleInfo = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <line x1="8" y1="7" x2="8" y2="11"/>
    <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const IconUserClock = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 20 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="7" cy="5" r="3.5"/>
    <path d="M1 15c0-3.3 2.7-6 6-6"/>
    <circle cx="15" cy="10" r="4"/>
    <polyline points="15,8 15,10.5 16.5,12"/>
  </svg>
);

// ── Drum Roll Picker ──────────────────────────────────────────────────────────
const DrumColumn = ({ items, selIdx, onSelect }) => {
  const ITEM_H    = 44;
  const VISIBLE   = 3;
  const containerRef = useRef(null);
  const isDragging   = useRef(false);
  const startY       = useRef(0);
  const startIdx     = useRef(0);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = selIdx * ITEM_H;
    }
  }, [selIdx]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || isDragging.current) return;
    const raw = containerRef.current.scrollTop / ITEM_H;
    const idx = Math.round(raw);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== selIdx) onSelect(clamped);
  }, [items.length, selIdx, onSelect]);

  const onPointerDown = (e) => {
    isDragging.current = true;
    startY.current     = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    startIdx.current   = selIdx;
  };
  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    const cy   = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const diff = Math.round((startY.current - cy) / ITEM_H);
    const next = Math.max(0, Math.min(items.length - 1, startIdx.current + diff));
    if (next !== selIdx) onSelect(next);
  };
  const onPointerUp = () => { isDragging.current = false; };

  return (
    <div className="relative flex-1 select-none" style={{ height: ITEM_H * (VISIBLE * 2 + 1) }}>
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 rounded-[10px]"
        style={{
          top: ITEM_H * VISIBLE,
          height: ITEM_H,
          background: 'rgba(70,100,96,0.08)',
          borderTop: '1.5px solid rgba(70,100,96,0.25)',
          borderBottom: '1.5px solid rgba(70,100,96,0.25)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.95) 100%)',
      }} />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        className="absolute inset-0 overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingTop:    ITEM_H * VISIBLE,
          paddingBottom: ITEM_H * VISIBLE,
          cursor: 'grab',
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {items.map((label, i) => {
          const dist = Math.abs(i - selIdx);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2;
          const scale   = dist === 0 ? 1 : dist === 1 ? 0.88 : 0.78;
          const weight  = dist === 0 ? '700' : '400';
          const color   = dist === 0 ? '#1e293b' : '#94a3b8';
          return (
            <div
              key={i}
              onClick={() => onSelect(i)}
              style={{
                height: ITEM_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'center',
                fontSize: dist === 0 ? 20 : 16,
                fontWeight: weight,
                color,
                opacity,
                transform: `scale(${scale})`,
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                userSelect: 'none',
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DrumDatePicker = ({ value, onChange, onCancel, onSubmit }) => {
  const today  = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : today;

  const [day,   setDay]   = useState(parsed.getDate() - 1);
  const [month, setMonth] = useState(parsed.getMonth());
  const [year,  setYear]  = useState(parsed.getFullYear() - 2020);

  const BASE_YEAR = 2020;
  const YEAR_COUNT = 11;

  const daysInMonth = new Date(BASE_YEAR + year, month + 1, 0).getDate();
  const dayItems    = Array.from({ length: daysInMonth }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );
  const monthItems = MONTH_SHORT;
  const yearItems  = Array.from({ length: YEAR_COUNT }, (_, i) => String(BASE_YEAR + i));

  useEffect(() => {
    const maxDay = new Date(BASE_YEAR + year, month + 1, 0).getDate();
    if (day >= maxDay) setDay(maxDay - 1);
  }, [month, year]);

  useEffect(() => {
    const d = String(day + 1).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    const y = BASE_YEAR + year;
    onChange(`${y}-${m}-${d}`);
  }, [day, month, year]);

  return (
    <div className="flex flex-col">
      <div className="text-center text-[13px] font-semibold text-[#1e293b] mb-3 tracking-wide">
        Select Date
      </div>
      <div className="flex items-center justify-center gap-1 px-2" style={{ height: 44 * 7 }}>
        <DrumColumn items={dayItems}   selIdx={day}   onSelect={setDay}   />
        <DrumColumn items={monthItems} selIdx={month} onSelect={setMonth} />
        <DrumColumn items={yearItems}  selIdx={year}  onSelect={setYear}  />
      </div>
      <div className="flex border-t border-[#eef2f6] mt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-[14px] text-[14px] font-semibold text-[#475569] bg-transparent border-none cursor-pointer hover:bg-[#f8fafc] transition-colors rounded-bl-[12px]"
        >
          Cancel
        </button>
        <div className="w-px bg-[#eef2f6]" />
        <button
          onClick={onSubmit}
          className="flex-1 py-[14px] text-[14px] font-semibold text-[#e05a2b] bg-transparent border-none cursor-pointer hover:bg-[#fff5f2] transition-colors rounded-br-[12px]"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-7 left-1/2 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-xl
    text-white text-[13px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.2)]
    transition-transform duration-400 font-['DM_Sans',sans-serif]
    ${visible ? 'translate-x-[-50%] translate-y-0' : 'translate-x-[-50%] translate-y-[80px]'}
    ${type === 'success'
      ? 'bg-gradient-to-br from-[#166534] to-[#15803d]'
      : 'bg-gradient-to-br from-[#991b1b] to-[#dc2626]'}`}
  >
    {type === 'success'
      ? <IconCircleCheck size={14} color="white" />
      : <IconCircleExclamation size={14} color="white" />
    }
    {message}
  </div>
);

const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/45 backdrop-blur-[3px] flex justify-center items-end sm:items-center z-[1000]"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    {children}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const Appointments = () => {
  const navigate = useNavigate();
  const today    = new Date();

  const { appointments, approveAppointment, declineAppointment, markDone: ctxMarkDone } = useAppointments();

  // ── Calendar state ──
  const [calYear,     setCalYear]     = useState(today.getFullYear());
  const [calMonth,    setCalMonth]    = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  // ── Accordion state for Time Slots ──
  const [expandedSlots, setExpandedSlots] = useState([]);
  useEffect(() => { setExpandedSlots([]); }, [selectedDay]);

  // ── Mobile view state ──
  const [mobileView, setMobileView] = useState('pending');

  // ── Multi-select pending ──
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [searchTerm,    setSearchTerm]    = useState('');

  // ── Batch scheduling modal ──
  const [batchModal,      setBatchModal]      = useState(false);
  const [batchDate,       setBatchDate]       = useState('');
  const [batchSlot,       setBatchSlot]       = useState('08:00');
  const [showDatePicker,  setShowDatePicker]  = useState(false);

  // ── Detail / snackbar ──
  const [detailModal, setDetailModal] = useState(null);
  const [snackbar,    setSnackbar]    = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(
      () => setSnackbar(s => ({ ...s, visible: false })),
      3500
    );
  };

  const changeMonth = (dir) => {
    let m = calMonth + dir, y = calYear;
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    setCalMonth(m); setCalYear(y); setSelectedDay(null);
  };

  // ── Derived data ──
  const pendingRequests = appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(a.bookedAt) - new Date(b.bookedAt));

  const filteredPending = pendingRequests.filter(r =>
    !searchTerm ||
    r.name.toLowerCase().includes(searchTerm)         ||
    (r.idno || '').toLowerCase().includes(searchTerm) ||
    (r.dept || '').toLowerCase().includes(searchTerm) ||
    (r.prog || '').toLowerCase().includes(searchTerm) ||
    (r.section || '').toLowerCase().includes(searchTerm) ||
    (r.reason || '').toLowerCase().includes(searchTerm)
  );

  const scheduledAppts = appointments.filter(
    a => a.status === 'approved' || a.status === 'done'
  );

  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth    = new Date(calYear, calMonth, 0).getDate();

  const selectedDayAppts = scheduledAppts
    .filter(a => a.year === calYear && a.month === calMonth && a.day === selectedDay)
    .sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return a.time.localeCompare(b.time);
    });

  const groupedAppts = useMemo(() => {
    const groups = {};
    selectedDayAppts.forEach(a => {
      if (!groups[a.time]) groups[a.time] = [];
      groups[a.time].push(a);
    });
    return Object.keys(groups).sort().map(time => ({ time, appts: groups[time] }));
  }, [selectedDayAppts]);

  const activeByTime = scheduledAppts
    .filter(a => a.year === calYear && a.month === calMonth && a.day === selectedDay && a.status !== 'done')
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedItems  = pendingRequests.filter(r => selectedIds.has(r.id));
  const chosenSlotLabel = HOUR_SLOTS.find(s => s.value === batchSlot)?.label ?? '';

  // ── Selection helpers ──
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(filteredPending.map(r => r.id)));
  const clearAll  = () => setSelectedIds(new Set());

  // ── Batch approve ──
  const handleBatchApprove = async () => {
    if (!batchDate) { showSnackbar('Please select a date', 'error'); return; }
    const [y, m, d] = batchDate.split('-').map(Number);
    try {
      await Promise.all(selectedItems.map(item =>
        approveAppointment(item.id, { year: y, month: m, day: d, time: batchSlot })
      ));
      showSnackbar(`${selectedIds.size} appointment${selectedIds.size > 1 ? 's' : ''} approved`);
      setBatchModal(false);
      setSelectedIds(new Set());
      setSelectedDay(null);
      setCalYear(y); setCalMonth(m);
      setTimeout(() => setSelectedDay(d), 0);
    } catch {
      showSnackbar('Failed to approve some appointments', 'error');
    }
  };

  // ── Decline selected ──
  const handleDeclineSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Decline ${selectedIds.size} selected request${selectedIds.size > 1 ? 's' : ''}?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => declineAppointment(id)));
      showSnackbar(`${selectedIds.size} request${selectedIds.size > 1 ? 's' : ''} declined`, 'error');
      setSelectedIds(new Set());
    } catch {
      showSnackbar('Failed to decline some requests', 'error');
    }
  };

  const handleMarkDone = (e, id) => {
    e.stopPropagation();
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    ctxMarkDone(id);
    showSnackbar(`${appt.name} marked as done`);
  };

  const toggleSlot = (time) =>
    setExpandedSlots(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );

  const formattedBatchDate = batchDate
    ? new Date(batchDate + 'T00:00:00').toLocaleDateString('en-PH', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  // ── Pending List ──────────────────────────────────────────────────────────
  const PendingList = () => (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
        <div>
          <div className="text-[13px] font-semibold text-[#1e293b]">Pending Requests</div>
          <div className="text-[10px] text-[#64748b] mt-[1px]">Select patients to schedule in batch</div>
        </div>
        <span className="text-[10px] font-semibold text-[#854F0B] bg-[#FAEEDA] px-[9px] py-[2px] rounded-[20px]">
          {pendingRequests.length} pending
        </span>
      </div>

      <div className="px-3 py-2 border-b border-[#eef2f6] shrink-0 flex flex-col gap-1.5 bg-white">
        <input
          type="text"
          placeholder="Search name, ID, dept..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toLowerCase())}
          className="w-full px-[11px] py-[6px] border border-[#e2e8f0] rounded-lg text-[12px] bg-[#f8fafc]
            text-[#1e293b] outline-none focus:border-[#466460] focus:bg-white transition-colors"
        />
        {filteredPending.length > 0 && (
          <div className="flex items-center justify-between px-[2px]">
            <span className="text-[10px] text-[#64748b]">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${filteredPending.length} selected`
                : `${filteredPending.length} shown`}
            </span>
            <div className="flex gap-2">
              {selectedIds.size < filteredPending.length && (
                <button onClick={selectAll}
                  className="text-[10px] font-semibold text-[#466460] hover:underline bg-transparent border-none cursor-pointer p-0">
                  Select all
                </button>
              )}
              {selectedIds.size > 0 && (
                <button onClick={clearAll}
                  className="text-[10px] font-semibold text-[#94a3b8] hover:underline bg-transparent border-none cursor-pointer p-0">
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-[10px] py-[8px] min-h-0 bg-white
        [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
        {filteredPending.length === 0 ? (
          <div className="text-center py-[30px] px-4 text-[#94a3b8] text-[12px]">
            <div className="flex justify-center mb-2 text-[#cbd5e1]">
              {pendingRequests.length === 0
                ? <IconInbox size={28} />
                : <IconMagnifyingGlass size={28} />
              }
            </div>
            {pendingRequests.length === 0 ? 'All requests processed' : 'No results found'}
          </div>
        ) : filteredPending.map(r => {
          const rank      = pendingRequests.findIndex(x => x.id === r.id) + 1;
          const isChecked = selectedIds.has(r.id);
          const bTime = new Date(r.bookedAt).toLocaleString('en-PH', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          return (
            <div
              key={r.id}
              onClick={() => toggleSelect(r.id)}
              className={`flex items-start gap-[9px] px-[11px] py-[10px] border rounded-[10px] mb-[5px]
                cursor-pointer transition-all relative overflow-hidden group
                ${isChecked
                  ? 'border-[#466460] bg-[#E1F5EE]'
                  : 'border-[#eef2f6] hover:border-[#f0a030] hover:bg-[#fffdf7]'}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-150
                ${isChecked ? 'bg-[#466460] opacity-100' : 'bg-[#EF9F27] opacity-0 group-hover:opacity-100'}`} />

              <div className={`w-[17px] h-[17px] rounded-[4px] border-2 flex items-center justify-center
                shrink-0 mt-[1px] transition-all
                ${isChecked
                  ? 'bg-[#466460] border-[#466460]'
                  : 'bg-white border-[#cbd5e1] group-hover:border-[#466460]'}`}>
                {isChecked && <IconCheck size={9} />}
              </div>

              <div className={`font-['DM_Mono',monospace] text-[10px] font-medium rounded-[5px] px-[6px]
                py-[2px] min-w-[26px] text-center shrink-0 mt-[1px]
                ${isChecked ? 'text-[#0F6E56] bg-[#E1F5EE] border border-[#9FE1CB]' : 'text-[#854F0B] bg-[#FAEEDA]'}`}>
                #{rank}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[#1e293b] leading-[1.3]">{r.name}</div>
                <div className="text-[10px] text-[#64748b] mt-[2px] leading-[1.5]">
                  {r.idno} &middot; {r.prog} &middot; Sec {r.section}
                </div>
                <div className="text-[10px] text-[#64748b] leading-[1.5]">{r.dept}</div>
                <span className="text-[10px] text-[#6d28d9] bg-[#ede9fe] px-[6px] py-[1px]
                  rounded-[20px] inline-block mt-[3px] font-medium">{r.reason}</span>
                <div className="text-[9px] text-[#94a3b8] mt-[3px] flex items-center gap-[3px]">
                  <IconClock size={10} />
                  Requested {bTime}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div className="shrink-0 border-t-2 border-[#e0eceb] bg-[#f8fdfc] px-3 py-3 flex flex-col gap-2.5">
          {!selectedDay && (
            <div className="text-[10.5px] text-[#854F0B] bg-[#FAEEDA] px-2 py-[6px] rounded-[6px] border border-[#f0c070] flex items-center justify-center gap-[5px]">
              <IconCircleInfo size={13} />
              Select a date on the calendar to schedule
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!selectedDay) return;
                const formattedDate = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                setBatchDate(formattedDate);
                setBatchModal(true);
              }}
              disabled={!selectedDay}
              className={`flex-1 py-[8px] border-none rounded-[8px] text-[12px] font-semibold flex items-center justify-center gap-[5px] transition-all
                ${selectedDay
                  ? 'bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white cursor-pointer hover:opacity-90'
                  : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'}`}
            >
              <IconCalendarCheck size={13} />
              Schedule {selectedIds.size} Patient{selectedIds.size > 1 ? 's' : ''}
            </button>
            <button
              onClick={handleDeclineSelected}
              title="Decline selected"
              className="px-[13px] py-[8px] bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]
                rounded-[8px] text-[12px] font-semibold cursor-pointer transition-colors hover:bg-[#fee2e2]
                flex items-center justify-center"
            >
              <IconXmark size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Redirect to Examination ──
  const handleExaminePatient = async (appt) => {
    showSnackbar('Locating patient record...');
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef, where('universityId', '==', appt.idno));
      let snapshot = await getDocs(q);
      if (snapshot.empty) {
        q = query(usersRef, where('studentId', '==', appt.idno));
        snapshot = await getDocs(q);
      }
      if (!snapshot.empty) {
        const actualUid = snapshot.docs[0].id;
        setDetailModal(null);
        showSnackbar('Patient found! Redirecting...');
        setTimeout(() => navigate(`/examinations?patientId=${actualUid}`), 1000);
      } else {
        const nameParts = (appt.name || '').trim().split(' ');
        const patientProfile = {
          uid: `temp-${Date.now()}`,
          name: appt.name,
          firstName: nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : appt.name,
          lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
          id: appt.idno,
          universityId: appt.idno,
          department: appt.dept,
          prog: appt.prog,
          section: appt.section,
        };
        localStorage.setItem('selectedPatient', JSON.stringify(patientProfile));
        setDetailModal(null);
        showSnackbar('Patient not in DB. Using appointment data...');
        setTimeout(() => navigate(`/examinations?patientId=${patientProfile.uid}`), 1000);
      }
    } catch (error) {
      console.error("Error looking up patient:", error);
      showSnackbar('Database error occurred.', 'error');
    }
  };

  // ── Calendar Panel ────────────────────────────────────────────────────────
  const CalendarPanel = () => (
    <div className="flex flex-col h-full bg-[#fafbfc] overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
        {/* ← Prev month */}
        <button
          onClick={() => changeMonth(-1)}
          className="bg-transparent border border-[#e2e8f0] text-[#475569] w-[28px] h-[28px]
            rounded-[8px] flex items-center justify-center transition-colors
            hover:bg-[#E1F5EE] hover:border-[#466460] hover:text-[#466460]"
        >
          <IconChevronLeft size={12} />
        </button>

        <span className="text-[14px] font-semibold text-[#1e293b]">{MONTHS[calMonth - 1]} {calYear}</span>

        {/* → Next month */}
        <button
          onClick={() => changeMonth(1)}
          className="bg-transparent border border-[#e2e8f0] text-[#475569] w-[28px] h-[28px]
            rounded-[8px] flex items-center justify-center transition-colors
            hover:bg-[#E1F5EE] hover:border-[#466460] hover:text-[#466460]"
        >
          <IconChevronRight size={12} />
        </button>
      </div>

      <div className="flex gap-[14px] px-4 py-[7px] border-b border-[#eef2f6] bg-white shrink-0">
        {[['#1D9E75','Approved'],['#94a3b8','Done']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-[5px] text-[10px] text-[#64748b]">
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: color }}></div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="px-3 pt-2 pb-2 shrink-0 bg-white border-b border-[#eef2f6]">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-[#94a3b8] py-[3px]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[2px]">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isToday = today.getFullYear() === calYear
              && (today.getMonth() + 1) === calMonth
              && today.getDate() === day;
            const isSel = selectedDay === day;

            // True if the day is strictly before today
            const isPast = (() => {
              const cellDate     = new Date(calYear, calMonth - 1, day);
              const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return cellDate < todayMidnight;
            })();

            const dayAppts = scheduledAppts.filter(
              a => a.year === calYear && a.month === calMonth && a.day === day
            );

            return (
              <div
                key={day}
                onClick={() => !isPast && setSelectedDay(day)}
                className={`min-h-[40px] sm:min-h-[46px] border px-1 py-1 rounded-[8px] transition-all
                  ${isPast
                    ? 'border-transparent cursor-default bg-[#e8edec]'
                    : isSel
                      ? 'bg-[#466460] border-[#466460] cursor-pointer'
                      : isToday
                        ? 'border-[#466460] hover:bg-[#E1F5EE] cursor-pointer'
                        : 'border-transparent hover:bg-[#E1F5EE] hover:border-[#9FE1CB] cursor-pointer'}`}
              >
                <div className={`text-[11px] font-semibold
                  ${isSel
                    ? 'text-white'
                    : isToday
                      ? 'text-[#0F6E56]'
                      : isPast
                        ? 'text-[#8aa8a4]'
                        : 'text-[#475569]'}`}>
                  {day}
                </div>
                <div className="flex gap-[2px] flex-wrap mt-[2px]">
                  {dayAppts.slice(0, 4).map((a, i) => (
                    <div key={i} className={`w-[5px] h-[5px] rounded-full
                      ${a.status === 'done' ? 'bg-[#94a3b8]' : 'bg-[#1D9E75]'}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3
        [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
        {!selectedDay ? (
          <div className="text-center py-8 px-4 text-[#94a3b8] text-[12px]">
            <div className="flex justify-center mb-2 text-[#cbd5e1]">
              <IconCalendar size={28} />
            </div>
            <p>Select a date to view appointments</p>
          </div>
        ) : selectedDayAppts.length === 0 ? (
          <>
            <div className="text-[12px] font-semibold text-[#1e293b] mb-2 flex justify-between items-center">
              <span>{MONTHS[calMonth - 1]} {selectedDay}, {calYear}</span>
              <span className="text-[10px] text-[#64748b] font-normal">No appointments</span>
            </div>
            <div className="text-center py-8 px-4 text-[#94a3b8] text-[12px]">
              <div className="flex justify-center mb-2 text-[#cbd5e1]">
                <IconCalendarXmark size={28} />
              </div>
              <p>No approved appointments on this date</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-[12px] font-semibold text-[#1e293b] mb-3 flex justify-between items-center">
              <span>{MONTHS[calMonth - 1]} {selectedDay}, {calYear}</span>
              <span className="text-[10px] text-[#64748b] font-normal">
                {selectedDayAppts.length} appt{selectedDayAppts.length !== 1 ? 's' : ''}&nbsp;&middot;&nbsp;
                {selectedDayAppts.filter(a => a.status === 'done').length} done
              </span>
            </div>
            {groupedAppts.map(({ time, appts }) => {
              const isExpanded = expandedSlots.includes(time);
              const slotInfo  = HOUR_SLOTS.find(s => s.value === time);
              const slotLabel = slotInfo ? slotInfo.label : time;
              return (
                <div key={time} className="mb-3 last:mb-0">
                  <div
                    onClick={() => toggleSlot(time)}
                    className="flex items-center justify-between px-3 py-2.5 bg-[#f8fafc] border border-[#eef2f6] rounded-[8px] cursor-pointer hover:bg-[#f1f5f9] transition-colors mb-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconClock size={13} className="text-[#466460]" style={{ color: '#466460' }} />
                      <span className="text-[12px] font-bold text-[#1e293b]">{slotLabel}</span>
                      <span className="text-[10px] text-[#64748b] bg-white border border-[#e2e8f0] px-2 py-[2px] rounded-full font-medium shadow-sm">
                        {appts.length} appt{appts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {isExpanded
                      ? <IconChevronUp size={11} style={{ color: '#94a3b8' }} />
                      : <IconChevronDown size={11} style={{ color: '#94a3b8' }} />
                    }
                  </div>
                  {isExpanded && (
                    <div className="flex flex-col gap-1 pl-[6px] border-l-2 border-[#eef2f6] ml-[10px]">
                      {appts.map(a => {
                        const isDone   = a.status === 'done';
                        const queueIdx = activeByTime.findIndex(x => x.id === a.id);
                        return (
                          <div
                            key={a.id}
                            onClick={() => setDetailModal(a)}
                            className={`flex items-center gap-2 px-[10px] py-[8px] border rounded-[8px]
                              text-[12px] bg-white transition-all cursor-pointer
                              ${isDone
                                ? 'bg-[#f8fafc] opacity-[0.72] border-[#eef2f6] hover:border-[#cbd5e1]'
                                : 'border-[#eef2f6] hover:border-[#8aacaa] hover:bg-[#fafffe]'}`}
                          >
                            <span className={`font-['DM_Mono',monospace] text-[10px] font-bold text-white
                              rounded-[5px] px-[6px] py-[2px] min-w-[26px] text-center shrink-0 leading-[1.6]
                              ${isDone ? 'bg-[#94a3b8]' : 'bg-[#466460]'}`}>
                              {isDone
                                ? <IconCheck size={9} />
                                : `#${queueIdx + 1}`
                              }
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-[12px] truncate
                                ${isDone ? 'line-through text-[#94a3b8]' : 'text-[#1e293b]'}`}>{a.name}</div>
                              <div className="text-[10px] text-[#64748b] mt-[1px] truncate">
                                {a.reason} &middot; {a.prog}
                              </div>
                            </div>
                            <span className={`text-[9px] font-semibold px-[8px] py-[2px] rounded-[20px]
                              shrink-0 uppercase tracking-[0.03em] hidden sm:inline
                              ${isDone ? 'bg-[#f1f5f9] text-[#64748b]' : 'bg-[#EAF3DE] text-[#3B6D11]'}`}>
                              {isDone ? 'done' : 'approved'}
                            </span>
                            {!isDone && (
                              <button
                                onClick={(e) => handleMarkDone(e, a.id)}
                                className="ml-1 px-[8px] py-[3px] text-[9px] font-bold rounded-[6px]
                                  border border-[#1D9E75] text-[#1D9E75] bg-white cursor-pointer
                                  transition-colors shrink-0 whitespace-nowrap hover:bg-[#EAF3DE]
                                  flex items-center gap-[3px]"
                              >
                                <IconCheck size={8} style={{ stroke: '#1D9E75' }} />
                                Done
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-['DM_Sans',sans-serif] text-[#2d3748] bg-white w-full h-[calc(100vh-134px)] md:h-[calc(100vh-116px)] flex flex-col overflow-hidden">

      {/* ── MOBILE ── */}
      <div className="flex flex-col md:hidden flex-1 min-h-0 w-full h-full">
        <div className="flex border-b border-[#eef2f6] bg-white shrink-0">
          <button
            onClick={() => setMobileView('pending')}
            className={`flex-1 py-3 text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors
              ${mobileView === 'pending' ? 'text-[#466460] border-b-2 border-[#466460]' : 'text-[#94a3b8]'}`}
          >
            <IconClock size={13} /> Pending
            {pendingRequests.length > 0 && (
              <span className="text-[9px] font-bold bg-[#FAEEDA] text-[#854F0B] px-1.5 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileView('calendar')}
            className={`flex-1 py-3 text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors
              ${mobileView === 'calendar' ? 'text-[#466460] border-b-2 border-[#466460]' : 'text-[#94a3b8]'}`}
          >
            <IconCalendar size={13} /> Calendar
          </button>
        </div>
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          {mobileView === 'pending' ? <PendingList /> : <CalendarPanel />}
        </div>
      </div>

      {/* ── TABLET ── */}
      <div className="hidden md:flex lg:hidden flex-1 min-h-0 w-full h-full">
        <div className="flex flex-col border-r border-[#eef2f6] overflow-hidden w-[320px] shrink-0 h-full">
          <PendingList />
        </div>
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          <CalendarPanel />
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex flex-1 min-h-0 w-full h-full">
        <div className="w-[420px] shrink-0 flex flex-col border-r border-[#eef2f6] overflow-hidden h-full">
          <PendingList />
        </div>
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          <CalendarPanel />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BATCH SCHEDULING MODAL
      ══════════════════════════════════════════════════════ */}
      {batchModal && (
        <ModalOverlay onClose={() => setBatchModal(false)}>
          <div className="bg-white w-full sm:max-w-[460px] sm:mx-4 sm:rounded-[16px] rounded-t-[20px]
            max-h-[92vh] overflow-y-auto animate-[fadeIn_0.25s_ease-out]
            [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[3px]">

            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="px-5 pt-4 pb-3 border-b border-[#eef2f6]">
              <div className="text-[15px] font-semibold text-[#1e293b] flex items-center gap-2">
                <IconCalendarCheck size={15} style={{ color: '#0F6E56' }} />
                Schedule {selectedIds.size} Patient{selectedIds.size > 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-[#64748b] mt-[2px]">
                All selected patients will be assigned the same date and time slot.
              </div>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">

              {/* ── Date field ── */}
              <div>
                <label className="block text-[10px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-1">
                  Appointment Date *
                </label>
                <button
                  onClick={() => setShowDatePicker(true)}
                  className="w-full px-[10px] py-[8px] border border-[#e2e8f0] rounded-[8px] text-[13px]
                    bg-white text-left outline-none focus:border-[#466460] transition-colors cursor-pointer
                    flex items-center justify-between hover:border-[#466460]"
                >
                  <span className={batchDate ? 'text-[#1e293b] font-medium' : 'text-[#94a3b8]'}>
                    {batchDate
                      ? new Date(batchDate + 'T00:00:00').toLocaleDateString('en-PH', {
                          weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
                        })
                      : 'Tap to select a date…'}
                  </span>
                  <IconCalendar size={13} style={{ color: '#466460' }} />
                </button>
              </div>

              {/* ── Time slot ── */}
              <div>
                <label className="block text-[10px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-2">
                  Time Slot (1-hour window)
                </label>
                <div className="relative">
                  <select
                    value={batchSlot}
                    onChange={e => setBatchSlot(e.target.value)}
                    className="w-full appearance-none px-[10px] py-[8px] border border-[#e2e8f0] rounded-[8px] text-[13px]
                      bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors cursor-pointer"
                  >
                    {HOUR_SLOTS.map(slot => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                  <IconChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94a3b8' }} />
                </div>
              </div>

              {/* ── Summary banner ── */}
              {batchDate && (
                <div className="flex items-start gap-3 px-3 py-3 rounded-[10px] bg-[#EAF3DE] border border-[#c6e4a0]">
                  <IconCircleInfo size={13} style={{ color: '#3B6D11', marginTop: 1, flexShrink: 0 }} />
                  <div className="text-[11px] text-[#3B6D11] leading-[1.6]">
                    <span className="font-bold">{selectedIds.size} patient{selectedIds.size > 1 ? 's' : ''}</span>
                    {' '}will be scheduled on{' '}
                    <span className="font-bold">
                      {new Date(batchDate + 'T00:00:00').toLocaleDateString('en-PH', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                    {' '}during the{' '}
                    <span className="font-bold">{chosenSlotLabel}</span>
                    {' '}slot.
                  </div>
                </div>
              )}

              {/* ── Patient list ── */}
              {selectedItems.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-2">
                    Patients in This Batch
                  </div>
                  <div className="border border-[#e2e8f0] rounded-[10px] overflow-hidden">
                    {selectedItems.map((item, i) => (
                      <div key={item.id}
                        className={`flex items-center gap-3 px-3 py-[8px] text-[12px]
                          ${i < selectedItems.length - 1 ? 'border-b border-[#f1f5f9]' : ''}
                          ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}>
                        <span className="font-['DM_Mono',monospace] text-[10px] font-bold text-white
                          bg-[#466460] rounded-[5px] px-[6px] py-[2px] min-w-[26px] text-center shrink-0">
                          #{pendingRequests.findIndex(x => x.id === item.id) + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#1e293b] truncate">{item.name}</div>
                          <div className="text-[10px] text-[#64748b] truncate">{item.reason} &middot; {item.prog}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-[#eef2f6] bg-white sticky bottom-0">
              <button
                onClick={handleBatchApprove}
                disabled={!batchDate}
                className="flex-1 py-[10px] bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white
                  border-none rounded-[10px] text-[13px] font-semibold cursor-pointer
                  transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                <IconCircleCheck size={14} color="white" />
                Confirm &amp; Approve All
              </button>
              <button
                onClick={() => setBatchModal(false)}
                className="px-5 py-[10px] bg-[#f1f5f9] text-[#475569] border-none
                  rounded-[10px] text-[13px] font-semibold cursor-pointer
                  transition-colors hover:bg-[#e2e8f0]"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════════════════
          DRUM-ROLL DATE PICKER MODAL
      ══════════════════════════════════════════════════════ */}
      {showDatePicker && (
        <ModalOverlay onClose={() => setShowDatePicker(false)}>
          <div
            className="bg-white w-full sm:max-w-[340px] sm:mx-4 sm:rounded-[16px] rounded-t-[20px]
              animate-[fadeIn_0.2s_ease-out] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-5 pt-3 pb-2">
              <DrumDatePicker
                value={batchDate || new Date().toISOString().slice(0, 10)}
                onChange={setBatchDate}
                onCancel={() => setShowDatePicker(false)}
                onSubmit={() => setShowDatePicker(false)}
              />
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Detail modal ── */}
      {detailModal && (
        <ModalOverlay onClose={() => setDetailModal(null)}>
          <div className="bg-white w-full sm:max-w-[420px] sm:mx-4 sm:rounded-[14px] rounded-t-[20px]
            max-h-[85vh] overflow-y-auto p-[22px] animate-[fadeIn_0.3s_ease-out]">
            <div className="flex justify-center -mt-1 mb-3 sm:hidden">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <h3 className="m-0 mb-[14px] text-[#466460] text-[1rem] font-semibold flex items-center gap-2">
              <IconUserClock size={16} style={{ color: '#466460' }} />
              Appointment Details
            </h3>
            <div className="divide-y divide-[#f1f5f9]">
              {[
                { Icon: IconUser,          label: 'Full Name',  value: detailModal.name },
                { Icon: IconIdCard,        label: 'ID Number',  value: detailModal.idno },
                { Icon: IconTag,           label: 'Type',       value: detailModal.type?.charAt(0).toUpperCase() + detailModal.type?.slice(1) },
                { Icon: IconBuilding,      label: 'Department', value: detailModal.dept },
                { Icon: IconGraduationCap, label: 'Program',    value: detailModal.prog },
                { Icon: IconUsers,         label: 'Section',    value: detailModal.section },
                { Icon: IconStethoscope,   label: 'Purpose',    value: detailModal.reason },
                { Icon: IconCalendar,      label: 'Date',       value: `${MONTHS[detailModal.month - 1]} ${detailModal.day}, ${detailModal.year}` },
                { Icon: IconClock,         label: 'Time',       value: detailModal.time },
                { Icon: IconCircleCheck,   label: 'Status',     value: detailModal.status?.charAt(0).toUpperCase() + detailModal.status?.slice(1) },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center gap-[10px] py-[6px] text-[12px]">
                  <Icon size={14} style={{ color: '#0F6E56', flexShrink: 0 }} />
                  <span className="text-[#64748b] min-w-[100px]">{label}</span>
                  <span className="font-medium text-[#1e293b]">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleExaminePatient(detailModal)}
                className="flex-1 p-[9px] border-none rounded-[8px] cursor-pointer font-semibold
                  text-[12px] bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white
                  flex items-center justify-center gap-2"
              >
                <IconStethoscope size={13} style={{ color: 'white' }} />
                Examine Patient
              </button>
              <button
                onClick={() => setDetailModal(null)}
                className="flex-1 p-[9px] border-none rounded-[8px] cursor-pointer font-semibold
                  text-[12px] bg-[#e2e8f0] text-[#475569]"
              >
                Close
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Appointments;