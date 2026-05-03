// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Appointments.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as appointmentsService from '../../services/appointments.service';

// ============================================================
// CONSTANTS
// ============================================================
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ============================================================
// FALLBACK DATA (Combined from HTML logic)
// ============================================================
const fallbackAppointments = [
  { id: 1, name: "De Vera, Jenny M.", idno: "23-00142", type: "student", dept: "College of Computing", prog: "BSCS", section: "3-A", reason: "Physical Exam", bookedAt: "2026-05-01T07:12", status: "pending" },
  { id: 2, name: "Santos, Sofia R.", idno: "23-23406", type: "student", dept: "College of Engineering", prog: "BSCpE", section: "2-B", reason: "Dental", bookedAt: "2026-05-01T07:45", status: "pending" },
  { id: 3, name: "Mendoza, Paolo C.", idno: "22-09123", type: "student", dept: "College of Health Sciences", prog: "BSN", section: "4-A", reason: "Medical Clearance", bookedAt: "2026-05-01T08:01", status: "pending" },
  { id: 4, name: "Garcia, Rico A.", idno: "24-11002", type: "student", dept: "College of Arts & Sciences", prog: "BSAB", section: "1-C", reason: "Vaccination", bookedAt: "2026-05-01T08:20", status: "pending" },
  { id: 5, name: "Reyes, Clara V.", idno: "23-55678", type: "student", dept: "College of Engineering", prog: "BSEE", section: "3-B", reason: "Consultation", bookedAt: "2026-05-01T08:55", status: "pending" },
  { id: 6, name: "Villanueva, Mark D.", idno: "22-98102", type: "student", dept: "College of Computing", prog: "BSIT", section: "4-C", reason: "Consultation", bookedAt: "2026-05-01T09:30", status: "pending" },
  { id: 101, name: "Dr. Reyes, Maria L.", idno: "FAC-001", type: "instructor", dept: "College of Computing", prog: "Faculty", section: "—", reason: "Follow-up", year: 2026, month: 5, day: 6, time: "10:00", status: "approved" },
  { id: 102, name: "Torres, Michelle B.", idno: "21-88902", type: "student", dept: "College of Health Sciences", prog: "BSN", section: "4-B", reason: "Medical Clearance", year: 2026, month: 5, day: 8, time: "09:00", status: "approved" },
  { id: 103, name: "Prof. Cruz, Andres K.", idno: "FAC-045", type: "instructor", dept: "College of Engineering", prog: "Faculty", section: "—", reason: "Laboratory", year: 2026, month: 5, day: 10, time: "08:00", status: "approved" },
  { id: 104, name: "Garcia, Rosalie T.", idno: "STAFF-034", type: "staff", dept: "Accounting Office", prog: "Staff", section: "—", reason: "Consultation", year: 2026, month: 5, day: 12, time: "10:00", status: "approved" },
];

// ============================================================
// UTILITY COMPONENTS & FUNCTIONS
// ============================================================
const getInitials = (name) => {
  const clean = name.replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s*/i, '');
  const parts = clean.split(/[\s,]+/).filter(Boolean);
  return ((parts[0] || '')[0] + (parts[1] || '')[0]).toUpperCase();
};

const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-7 left-1/2 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-xl text-white text-[13px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-transform duration-400 font-['DM_Sans',sans-serif]
    ${visible ? 'translate-x-[-50%] translate-y-0' : 'translate-x-[-50%] translate-y-[80px]'}
    ${type === 'success' ? 'bg-gradient-to-br from-[#166534] to-[#15803d]' : 'bg-gradient-to-br from-[#991b1b] to-[#dc2626]'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/45 backdrop-blur-[3px] flex justify-center items-center z-[1000]"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    {children}
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Appointments = () => {
  const navigate = useNavigate();
  const today = new Date();

  // Core State
  const [appointments, setAppointments] = useState(fallbackAppointments);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5); // 1-indexed here to match HTML
  const [selectedDay, setSelectedDay] = useState(null);

  // Pending Selection State
  const [selectedPendingId, setSelectedPendingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Booking Form State
  const [bfDate, setBfDate] = useState("");
  const [bfTime, setBfTime] = useState("");

  // Modal State
  const [detailModal, setDetailModal] = useState(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  // ── Load from API ──
  useEffect(() => {
    const load = async () => {
      try {
        const data = await appointmentsService.getAllAppointments();
        if (data && data.length > 0) setAppointments(data);
      } catch (err) {
        console.log('Using fallback data:', err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Sync Selected Day with Booking Form Date ──
  useEffect(() => {
    if (selectedDay && selectedPendingId) {
      const pad = n => String(n).padStart(2, '0');
      setBfDate(`${calYear}-${pad(calMonth)}-${pad(selectedDay)}`);
    }
  }, [selectedDay, calYear, calMonth, selectedPendingId]);

  // ── Helpers ──
  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  const changeMonth = (dir) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setCalMonth(m);
    setCalYear(y);
    setSelectedDay(null);
  };

  // ── Data Computations ──
  const pendingRequests = appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(a.bookedAt) - new Date(b.bookedAt));

  const filteredPending = pendingRequests.filter(r =>
    !searchTerm ||
    r.name.toLowerCase().includes(searchTerm) ||
    r.idno.toLowerCase().includes(searchTerm) ||
    r.dept.toLowerCase().includes(searchTerm) ||
    r.prog.toLowerCase().includes(searchTerm) ||
    r.section.toLowerCase().includes(searchTerm) ||
    r.reason.toLowerCase().includes(searchTerm)
  );

  const scheduledAppts = appointments.filter(a => a.status === 'approved' || a.status === 'done');

  // Calendar logic
  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();

  const selectedDayAppts = scheduledAppts
    .filter(a => a.year === calYear && a.month === calMonth && a.day === selectedDay)
    .sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return a.time.localeCompare(b.time);
    });

  const activeByTimeForSelectedDay = scheduledAppts
    .filter(a => a.year === calYear && a.month === calMonth && a.day === selectedDay && a.status !== 'done')
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedPendingItem = appointments.find(a => a.id === selectedPendingId);

  // ── Actions ──
  const handleSelectPending = (id) => {
    setSelectedPendingId(id);
    if (selectedDay) {
      const pad = n => String(n).padStart(2, '0');
      setBfDate(`${calYear}-${pad(calMonth)}-${pad(selectedDay)}`);
    } else {
      setBfDate("");
    }
    setBfTime("");
  };

  const clearSelection = () => {
    setSelectedPendingId(null);
    setBfDate("");
    setBfTime("");
  };

  const handleApprove = async () => {
    if (!bfDate || !bfTime) {
      showSnackbar('Please select both a date and time', 'error');
      return;
    }
    const [y, m, d] = bfDate.split('-').map(Number);

    setAppointments(prev => prev.map(appt => 
      appt.id === selectedPendingId 
        ? { ...appt, status: 'approved', year: y, month: m, day: d, time: bfTime }
        : appt
    ));

    showSnackbar(`Appointment approved for ${selectedPendingItem.name}`);
    clearSelection();
    setCalYear(y);
    setCalMonth(m);
    setSelectedDay(d);
  };

  const handleDecline = () => {
    if (!window.confirm(`Decline the request from ${selectedPendingItem.name}?`)) return;
    setAppointments(prev => prev.filter(appt => appt.id !== selectedPendingId));
    showSnackbar(`Request from ${selectedPendingItem.name} declined`, 'error');
    clearSelection();
  };

  const markDone = (e, id) => {
    e.stopPropagation();
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'done' } : a));
    showSnackbar(`${appt.name} marked as done`);
  };

  return (
    <div className="flex h-[calc(100vh-116px)] overflow-hidden bg-white font-['DM_Sans',sans-serif] text-[#2d3748]">
      
      {/* ── LEFT PANEL ── */}
      <div className="w-[400px] shrink-0 flex flex-col border-r border-[#eef2f6] overflow-hidden">
        
        {/* Pending Section */}
        <div className={`flex flex-col overflow-hidden transition-[flex] duration-350 ease-in-out min-h-0 ${selectedPendingId ? 'flex-[0_0_210px]' : 'flex-1'}`}>
          <div className="px-4 py-[13px] border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
            <div>
              <div className="text-[13px] font-semibold text-[#1e293b]">Pending Requests</div>
              <div className="text-[10px] text-[#64748b] mt-[1px]">Select a patient to assign a schedule</div>
            </div>
            <span className="text-[10px] font-semibold text-[#854F0B] bg-[#FAEEDA] px-[9px] py-[2px] rounded-[20px]">
              {pendingRequests.length} pending
            </span>
          </div>
          <div className="px-3 py-2 border-b border-[#eef2f6] shrink-0">
            <input 
              type="text" 
              placeholder="Search name, ID, department, program..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.toLowerCase())}
              className="w-full px-[11px] py-[6px] border border-[#e2e8f0] rounded-lg text-[12px] bg-[#f8fafc] text-[#1e293b] outline-none focus:border-[#466460] focus:bg-white transition-colors"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto px-[10px] py-[8px] min-h-0 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            {filteredPending.length === 0 ? (
              <div className="text-center py-[30px] px-4 text-[#94a3b8] text-[12px]">
                <i className={`block text-[1.8rem] mb-2 text-[#cbd5e1] fa-regular ${pendingRequests.length === 0 ? 'fa-inbox' : 'fa-magnifying-glass'}`}></i>
                {pendingRequests.length === 0 ? 'All requests have been processed' : 'No results found'}
              </div>
            ) : (
              filteredPending.map(r => {
                const rank = pendingRequests.findIndex(x => x.id === r.id) + 1;
                const isSelected = selectedPendingId === r.id;
                const bTime = new Date(r.bookedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                return (
                  <div 
                    key={r.id} 
                    onClick={() => handleSelectPending(r.id)}
                    className={`flex items-start gap-[9px] px-[11px] py-[10px] border rounded-[10px] mb-[5px] cursor-pointer transition-all relative overflow-hidden group
                      ${isSelected ? 'border-[#466460] bg-[#E1F5EE]' : 'border-[#eef2f6] hover:border-[#f0a030] hover:bg-[#fffdf7]'}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-150 ${isSelected ? 'bg-[#466460] opacity-100' : 'bg-[#EF9F27] opacity-0 group-hover:opacity-100'}`}></div>
                    
                    <div className={`font-['DM_Mono',monospace] text-[10px] font-medium rounded-[5px] px-[6px] py-[2px] min-w-[26px] text-center shrink-0 mt-[1px]
                      ${isSelected ? 'text-[#0F6E56] bg-[#E1F5EE] border border-[#9FE1CB]' : 'text-[#854F0B] bg-[#FAEEDA]'}`}>
                      #{rank}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#1e293b] leading-[1.3]">{r.name}</div>
                      <div className="text-[10px] text-[#64748b] mt-[2px] leading-[1.5]">{r.idno} &middot; {r.prog} &middot; Sec {r.section}</div>
                      <div className="text-[10px] text-[#64748b] leading-[1.5]">{r.dept}</div>
                      <span className="text-[10px] text-[#6d28d9] bg-[#ede9fe] px-[6px] py-[1px] rounded-[20px] inline-block mt-[3px] font-medium">{r.reason}</span>
                      <div className="text-[9px] text-[#94a3b8] mt-[3px]">
                        <i className="fa-regular fa-clock mr-[3px]"></i>Requested {bTime}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Booking Form Section */}
        <div className={`border-t-2 border-[#e0eceb] bg-[#f8fdfc] shrink-0 overflow-hidden transition-[max-height] duration-400 ease-in-out ${selectedPendingId ? 'max-h-[320px]' : 'max-h-0'}`}>
          <div className="px-[14px] py-[13px] pb-[14px]">
            <div className="text-[10px] font-bold text-[#0F6E56] uppercase tracking-[0.07em] mb-[9px] flex items-center gap-[5px]">
              <i className="fa-solid fa-calendar-check"></i> Assign Schedule
            </div>

            {selectedPendingItem && (
              <div className="flex items-center gap-[10px] px-[11px] py-[9px] bg-white border border-[#e2e8f0] rounded-[10px] mb-[10px]">
                <div className="w-[34px] h-[34px] rounded-full bg-[#e0eceb] flex items-center justify-center text-[12px] font-bold text-[#0F6E56] shrink-0">
                  {getInitials(selectedPendingItem.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[#1e293b] leading-[1.3]">{selectedPendingItem.name}</div>
                  <div className="text-[10px] text-[#64748b] mt-[1px] leading-[1.4] whitespace-nowrap overflow-hidden text-ellipsis">
                    {selectedPendingItem.idno} &middot; {selectedPendingItem.prog} &middot; {selectedPendingItem.dept}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-[7px] mb-[7px]">
              <div>
                <label className="block text-[9px] font-bold text-[#475569] uppercase tracking-[0.05em] mb-[4px]">Date *</label>
                <input type="date" value={bfDate} onChange={e => setBfDate(e.target.value)}
                  className="w-full px-[9px] py-[7px] border border-[#e2e8f0] rounded-[7px] text-[12px] font-['DM_Sans',sans-serif] bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#475569] uppercase tracking-[0.05em] mb-[4px]">Time *</label>
                <input type="time" value={bfTime} onChange={e => setBfTime(e.target.value)}
                  className="w-full px-[9px] py-[7px] border border-[#e2e8f0] rounded-[7px] text-[12px] font-['DM_Sans',sans-serif] bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors" />
              </div>
            </div>

            <div className="flex gap-[7px] mt-[10px]">
              <button onClick={handleApprove} className="flex-1 p-[8px] bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white border-none rounded-[8px] text-[12px] font-semibold cursor-pointer transition-opacity hover:opacity-90">
                <i className="fa-solid fa-check mr-[5px]"></i>Approve &amp; Schedule
              </button>
              <button onClick={handleDecline} title="Decline request" className="px-[13px] py-[8px] bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] rounded-[8px] text-[12px] font-semibold cursor-pointer transition-colors hover:bg-[#fee2e2]">
                <i className="fa-solid fa-xmark"></i>
              </button>
              <button onClick={clearSelection} title="Back to list" className="px-[11px] py-[8px] bg-[#f1f5f9] text-[#64748b] border-none rounded-[8px] text-[12px] cursor-pointer transition-colors hover:bg-[#e2e8f0]">
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col bg-[#fafbfc] overflow-hidden">
        
        {/* Calendar Header */}
        <div className="px-[18px] py-[13px] border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
          <button onClick={() => changeMonth(-1)} className="bg-transparent border border-[#e2e8f0] text-[#475569] w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[11px] transition-colors hover:bg-[#E1F5EE] hover:border-[#466460] hover:text-[#466460]">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <span className="text-[14px] font-semibold text-[#1e293b]">{MONTHS[calMonth - 1]} {calYear}</span>
          <button onClick={() => changeMonth(1)} className="bg-transparent border border-[#e2e8f0] text-[#475569] w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[11px] transition-colors hover:bg-[#E1F5EE] hover:border-[#466460] hover:text-[#466460]">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-[14px] px-[18px] py-[7px] border-b border-[#eef2f6] bg-white shrink-0">
          <div className="flex items-center gap-[5px] text-[10px] text-[#64748b]">
            <div className="w-[7px] h-[7px] rounded-full bg-[#1D9E75]"></div><span>Approved</span>
          </div>
          <div className="flex items-center gap-[5px] text-[10px] text-[#64748b]">
            <div className="w-[7px] h-[7px] rounded-full bg-[#94a3b8]"></div><span>Done</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="px-[14px] pt-[10px] pb-[8px] shrink-0 bg-white border-b border-[#eef2f6]">
          <div className="grid grid-cols-7 mb-[4px]">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-[#94a3b8] py-[3px]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-[2px]">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`}></div>)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isToday = today.getFullYear() === calYear && (today.getMonth() + 1) === calMonth && today.getDate() === day;
              const isSel = selectedDay === day;
              const dayAppts = scheduledAppts.filter(a => a.year === calYear && a.month === calMonth && a.day === day);
              
              return (
                <div 
                  key={day} 
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[46px] border px-[5px] py-[4px] cursor-pointer rounded-[8px] transition-all
                    ${isSel ? 'bg-[#466460] border-[#466460]' : isToday ? 'border-[#466460] hover:bg-[#E1F5EE]' : 'border-transparent hover:bg-[#E1F5EE] hover:border-[#9FE1CB]'}`}
                >
                  <div className={`text-[11px] font-semibold ${isSel ? 'text-white' : isToday ? 'text-[#0F6E56]' : 'text-[#475569]'}`}>
                    {day}
                  </div>
                  <div className="flex gap-[2px] flex-wrap mt-[3px]">
                    {dayAppts.slice(0, 4).map((a, i) => (
                      <div key={i} className={`w-[5px] h-[5px] rounded-full ${a.status === 'done' ? 'bg-[#94a3b8]' : 'bg-[#1D9E75]'}`}></div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Detail */}
        <div className="flex-1 overflow-y-auto px-[14px] py-[12px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
          {!selectedDay ? (
            <div className="text-center py-[30px] px-[16px] text-[#94a3b8] text-[12px]">
              <i className="fa-regular fa-calendar block text-[1.8rem] mb-[8px] text-[#cbd5e1]"></i>
              <p>Select a date to view approved appointments</p>
            </div>
          ) : selectedDayAppts.length === 0 ? (
            <>
              <div className="text-[12px] font-semibold text-[#1e293b] mb-[8px] flex justify-between items-center">
                <span>{MONTHS[calMonth - 1]} {selectedDay}, {calYear}</span>
                <span className="text-[10px] text-[#64748b] font-normal">No appointments</span>
              </div>
              <div className="text-center py-[30px] px-[16px] text-[#94a3b8] text-[12px]">
                <i className="fa-regular fa-calendar-xmark block text-[1.8rem] mb-[8px] text-[#cbd5e1]"></i>
                <p>No approved appointments on this date</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-[12px] font-semibold text-[#1e293b] mb-[8px] flex justify-between items-center">
                <span>{MONTHS[calMonth - 1]} {selectedDay}, {calYear}</span>
                <span className="text-[10px] text-[#64748b] font-normal">
                  {selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? 's' : ''} &middot; {selectedDayAppts.filter(a => a.status === 'done').length} done
                </span>
              </div>
              {selectedDayAppts.map(a => {
                const isDone = a.status === 'done';
                const queueIdx = activeByTimeForSelectedDay.findIndex(x => x.id === a.id);
                
                return (
                  <div 
                    key={a.id}
                    onClick={() => setDetailModal(a)}
                    className={`flex items-center gap-[8px] px-[10px] py-[8px] border rounded-[8px] text-[12px] mb-[4px] bg-white transition-all cursor-pointer
                      ${isDone ? 'bg-[#f8fafc] opacity-[0.72] border-[#eef2f6] hover:border-[#cbd5e1]' : 'border-[#eef2f6] hover:border-[#8aacaa] hover:bg-[#fafffe]'}`}
                  >
                    <span className={`font-['DM_Mono',monospace] text-[10px] font-bold text-white rounded-[5px] px-[6px] py-[2px] min-w-[26px] text-center shrink-0 leading-[1.6]
                      ${isDone ? 'bg-[#94a3b8]' : 'bg-[#466460]'}`}>
                      {isDone ? <i className="fa-solid fa-check"></i> : `#${queueIdx + 1}`}
                    </span>
                    <span className="font-['DM_Mono',monospace] text-[10px] text-[#64748b] min-w-[38px] shrink-0">{a.time}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-[12px] ${isDone ? 'line-through text-[#94a3b8]' : 'text-[#1e293b]'}`}>{a.name}</div>
                      <div className="text-[10px] text-[#64748b] mt-[1px] truncate">{a.reason} &middot; {a.prog} &middot; Sec {a.section}</div>
                    </div>
                    <span className={`text-[9px] font-semibold px-[8px] py-[2px] rounded-[20px] shrink-0 uppercase tracking-[0.03em]
                      ${isDone ? 'bg-[#f1f5f9] text-[#64748b]' : 'bg-[#EAF3DE] text-[#3B6D11]'}`}>
                      {isDone ? 'done' : 'approved'}
                    </span>
                    {!isDone && (
                      <button 
                        onClick={(e) => markDone(e, a.id)}
                        className="ml-[4px] px-[8px] py-[3px] text-[9px] font-bold rounded-[6px] border border-[#1D9E75] text-[#1D9E75] bg-white cursor-pointer transition-colors shrink-0 whitespace-nowrap hover:bg-[#EAF3DE]"
                      >
                        <i className="fa-solid fa-check mr-[3px]"></i>Done
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── APPOINTMENT DETAIL MODAL ── */}
      {detailModal && (
        <ModalOverlay onClose={() => setDetailModal(null)}>
          <div className="bg-white p-[22px] rounded-[14px] w-[420px] max-w-[92%] max-h-[85vh] overflow-y-auto animate-[fadeIn_0.3s_ease-out]">
            <h3 className="m-0 mb-[14px] text-[#466460] text-[1rem] font-semibold">
              <i className="fa-solid fa-user-clock mr-[8px]"></i>Appointment Details
            </h3>
            
            <div className="divide-y divide-[#f1f5f9]">
              {[
                { icon: 'fa-user', label: 'Full Name', value: detailModal.name },
                { icon: 'fa-id-card', label: 'ID Number', value: detailModal.idno },
                { icon: 'fa-tag', label: 'Type', value: detailModal.type.charAt(0).toUpperCase() + detailModal.type.slice(1) },
                { icon: 'fa-building-columns', label: 'Department', value: detailModal.dept },
                { icon: 'fa-graduation-cap', label: 'Program', value: detailModal.prog },
                { icon: 'fa-users', label: 'Section', value: detailModal.section },
                { icon: 'fa-stethoscope', label: 'Purpose', value: detailModal.reason },
                { icon: 'fa-calendar', label: 'Date', value: `${MONTHS[detailModal.month - 1]} ${detailModal.day}, ${detailModal.year}` },
                { icon: 'fa-clock', label: 'Time', value: detailModal.time },
                { icon: 'fa-circle-check', label: 'Status', value: detailModal.status.charAt(0).toUpperCase() + detailModal.status.slice(1) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-[10px] py-[6px] text-[12px]">
                  <i className={`fa-solid ${icon} text-[#0F6E56] w-[16px] text-center shrink-0`}></i>
                  <span className="text-[#64748b] min-w-[108px]">{label}</span>
                  <span className="font-medium text-[#1e293b]">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-[8px] mt-[16px]">
              <button 
                onClick={() => {
                  setDetailModal(null);
                  showSnackbar('Redirecting to examination...');
                  setTimeout(() => navigate(`/examinations?patientId=${detailModal.id}`), 1200);
                }}
                className="flex-1 p-[9px] border-none rounded-[8px] cursor-pointer font-semibold text-[12px] bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white"
              >
                <i className="fa-solid fa-stethoscope mr-[6px]"></i>Examine Patient
              </button>
              <button 
                onClick={() => setDetailModal(null)}
                className="flex-1 p-[9px] border-none rounded-[8px] cursor-pointer font-semibold text-[12px] bg-[#e2e8f0] text-[#475569]"
              >
                Close
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── SNACKBAR ── */}
      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />

    </div>
  );
};

export default Appointments;