// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Appointments.jsx
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout.jsx';
import { useNavigate } from 'react-router-dom';
import * as appointmentsService from '../../services/appointments.service';

// ============================================================
// CONSTANTS
// ============================================================
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================
// FALLBACK DATA
// ============================================================
const fallbackAppointments = [
  { name: "De Vera, Jenny",       id: "23-00142",  type: "student",    dept: "College of Computing",       year: 2026, month: 3, day: 5,  time: "09:00", reason: "Annual Physical Exam",         status: "confirmed" },
  { name: "Santos, Sofia",        id: "23-23406",  type: "student",    dept: "College of Engineering",     year: 2026, month: 3, day: 5,  time: "10:30", reason: "Dental Check-up",               status: "pending"   },
  { name: "Mendoza, Paolo",       id: "22-09123",  type: "student",    dept: "College of Health Sciences", year: 2026, month: 3, day: 10, time: "08:00", reason: "Medical Clearance for RLE",     status: "confirmed" },
  { name: "Garcia, Rico",         id: "24-11002",  type: "student",    dept: "College of Arts & Sciences", year: 2026, month: 3, day: 10, time: "09:30", reason: "Tetanus Booster",               status: "pending"   },
  { name: "Reyes, Clara",         id: "23-55678",  type: "student",    dept: "College of Engineering",     year: 2026, month: 3, day: 10, time: "11:00", reason: "Eye strain follow-up",          status: "pending"   },
  { name: "Dr. Reyes, Maria",     id: "FAC-001",   type: "instructor", dept: "College of Computing",       year: 2026, month: 3, day: 15, time: "14:00", reason: "Hypertension Monitoring",       status: "confirmed" },
  { name: "Villanueva, Mark",     id: "22-98102",  type: "student",    dept: "College of Computing",       year: 2026, month: 3, day: 18, time: "10:00", reason: "Back Pain Follow-up",           status: "pending"   },
  { name: "Aquino, Patricia",     id: "23-99881",  type: "student",    dept: "College of Computing",       year: 2026, month: 3, day: 22, time: "09:00", reason: "Migraine consultation",         status: "confirmed" },
  { name: "Ms. Garcia, Rosalie",  id: "STAFF-034", type: "staff",      dept: "Accounting Office",          year: 2026, month: 3, day: 22, time: "13:00", reason: "Blood pressure check",          status: "confirmed" },
  { name: "Luna, Gabriel",        id: "24-56789",  type: "student",    dept: "College of Business",        year: 2026, month: 3, day: 25, time: "15:30", reason: "Bronchitis follow-up",          status: "pending"   },
  { name: "Torres, Michelle",     id: "21-88902",  type: "student",    dept: "College of Health Sciences", year: 2026, month: 3, day: 28, time: "08:30", reason: "TB clearance renewal",          status: "confirmed" },
  { name: "Prof. Cruz, Andres",   id: "FAC-045",   type: "instructor", dept: "College of Engineering",     year: 2026, month: 4, day: 3,  time: "09:00", reason: "Diabetes monitoring",           status: "confirmed" },
  { name: "Rivera, Kevin",        id: "23-44567",  type: "student",    dept: "College of Computing",       year: 2026, month: 4, day: 7,  time: "10:00", reason: "Allergy test results",          status: "pending"   },
  { name: "Fernandez, Bianca",    id: "22-12098",  type: "student",    dept: "College of Arts & Sciences", year: 2026, month: 2, day: 14, time: "11:00", reason: "Wellness check-up",             status: "confirmed" },
];

// ============================================================
// SNACKBAR
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
    ${visible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-20'}
    ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

// ============================================================
// MODAL OVERLAY WRAPPER
// ============================================================
const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000]"
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

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear]   = useState(2026);
  const [calMonth, setCalMonth] = useState(3); // 0-indexed; 3 = April
  const [selectedDay, setSelectedDay] = useState(null);

  // Data
  const [appointments, setAppointments] = useState(fallbackAppointments);
  const [loading, setLoading] = useState(true);

  // Modals
  const [apptModal, setApptModal]           = useState(false);
  const [detailModal, setDetailModal]       = useState(null); // holds appointment object
  const [groupModal, setGroupModal]         = useState(false);

  // New appointment form
  const [newAppt, setNewAppt] = useState({
    name: '', id: '', type: 'student',
    dept: 'College of Computing', date: '', time: '', reason: '',
  });

  // Group booking form
  const [groupForm, setGroupForm] = useState({
    date: '', time: '', reason: '', clinic: 'General',
  });

  // Snackbar
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

  // ── Helpers ──
  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  const changeMonth = (dir) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
    setSelectedDay(null);
  };

  const apptForDay = (day) =>
    appointments.filter(a => a.year === calYear && a.month === calMonth && a.day === day);

  const selectedDayAppts = selectedDay ? apptForDay(selectedDay) : [];
  const monthTotal = appointments.filter(a => a.year === calYear && a.month === calMonth).length;

  // Calendar grid
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth    = new Date(calYear, calMonth + 1, 0).getDate();

  // ── New appointment handlers ──
  const openApptModalForDay = (day) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setNewAppt(f => ({ ...f, date: `${calYear}-${mm}-${dd}` }));
    setApptModal(true);
  };

  const handleAddAppointment = async () => {
    const { name, id, date, time, type, dept, reason } = newAppt;
    if (!name || !id || !date || !time) {
      showSnackbar('Please fill required fields', 'error');
      return;
    }
    const [y, m, d] = date.split('-').map(Number);
    const entry = { name, id, type, dept, year: y, month: m - 1, day: d, time, reason, status: 'pending' };
    try {
      await appointmentsService.createAppointment(entry);
    } catch (_) {}
    setAppointments(prev => [...prev, entry]);
    showSnackbar('Appointment created');
    setApptModal(false);
    setNewAppt({ name: '', id: '', type: 'student', dept: 'College of Computing', date: '', time: '', reason: '' });
  };

  // ── Group booking handler ──
  const handleCreateGroupBooking = () => {
    const { date, time, reason, clinic } = groupForm;
    if (!date || !time || !reason) {
      showSnackbar('Please fill required fields', 'error');
      return;
    }
    const [y, m, d] = date.split('-').map(Number);
    const entry = { name: 'Group Booking', id: 'GROUP-001', type: 'student', dept: 'All Departments', year: y, month: m - 1, day: d, time, reason, status: 'confirmed' };
    setAppointments(prev => [...prev, entry]);
    showSnackbar('Group booking created');
    setGroupModal(false);
    setGroupForm({ date: '', time: '', reason: '', clinic: 'General' });
  };

  // ── Input helpers ──
  const inputCls = 'w-full mt-1.5 p-2.5 border border-[#e2e8f0] rounded-xl text-[13px] outline-none focus:border-[#466460] box-border';
  const labelCls = 'text-[11px] font-bold text-slate-500 uppercase';

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <DashboardLayout>
      <div className="animate-[fadeInSlide_0.4s_ease-out_forwards]">
        <div className="flex bg-white min-h-[calc(100vh-120px)]">

          {/* ── LEFT: Calendar ── */}
          <div className="flex-[1.5] border-r border-[#eef2f6] flex flex-col">

            {/* Calendar header with nav */}
            <div className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-5 py-3.5 flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 transition-colors flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <h2 className="font-bold text-sm">{MONTH_NAMES[calMonth]} {calYear}</h2>
              <button
                onClick={() => changeMonth(1)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 transition-colors flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            {/* Calendar grid */}
            <div className="p-4 flex-1 overflow-y-auto">
              {/* Weekday labels */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-[#5a7a76] py-1.5">{d}</div>
                ))}
              </div>

              {/* Date cells */}
              <div className="grid grid-cols-7">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const isToday   = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
                  const isSelected = selectedDay === day;
                  const dayAppts  = apptForDay(day);

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[64px] border rounded-md p-1.5 m-0.5 cursor-pointer transition-all relative
                        ${isSelected ? 'bg-[#466460] border-[#466460]' : isToday ? 'border-[#466460] bg-[#e0eceb]' : 'border-[#eef2f6] hover:bg-[#f4f9f8] hover:border-[#466460]'}`}
                    >
                      <div className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-[#466460]'}`}>{day}</div>
                      <div className="flex gap-0.5 flex-wrap mt-0.5">
                        {dayAppts.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-[#e07a5f] rounded-full"></div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Appointments list ── */}
          <div className="flex-1 bg-gradient-to-br from-[#fafbfc] to-white flex flex-col">

            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#e0eceb] to-white border-b-2 border-[#466460] flex-shrink-0">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-[13px] font-bold text-[#466460]">
                  Appointments for{' '}
                  <span className="bg-[#466460] text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold ml-1">
                    {selectedDay ? `${MONTH_NAMES[calMonth]} ${selectedDay}, ${calYear}` : 'Select a date'}
                  </span>
                </h3>
                <button
                  onClick={() => setGroupModal(true)}
                  className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-3 py-1.5 rounded-full text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                >
                  <i className="fa-solid fa-users"></i> Group Booking
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{monthTotal} appointments this month</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
              {!selectedDay ? (
                <div className="text-center p-8 text-slate-400">
                  <i className="fa-regular fa-calendar-circle-plus fa-2x mb-2 block"></i>
                  <p className="text-sm">Click a date to view or create appointments</p>
                </div>
              ) : selectedDayAppts.length === 0 ? (
                <div className="text-center p-8 text-slate-400 flex flex-col items-center">
                  <i className="fa-regular fa-calendar-circle-plus fa-2x mb-2"></i>
                  <p className="text-sm mb-3">No appointments for this date</p>
                  <button
                    onClick={() => openApptModalForDay(selectedDay)}
                    className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-4 py-1.5 rounded-full text-[11px] font-semibold hover:opacity-90"
                  >
                    + New Appointment
                  </button>
                </div>
              ) : (
                <>
                  {selectedDayAppts.map((appt, i) => (
                    <div
                      key={i}
                      onClick={() => setDetailModal(appt)}
                      className="relative p-3 bg-white rounded-xl mb-2 border border-[#e2e8f0] overflow-hidden cursor-pointer transition-all hover:border-[#8aacaa] hover:shadow-md hover:translate-x-0.5"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#466460] to-[#81b29a]"></div>
                      <strong className="text-[13px] text-slate-800 block pl-1">{appt.name}</strong>
                      <p className="text-xs text-slate-500 mt-0.5 pl-1">{appt.time} • {appt.reason}</p>
                      <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-full mt-1 ml-1 font-semibold
                        ${appt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-700'}`}>
                        {appt.status}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => openApptModalForDay(selectedDay)}
                    className="w-full mt-2 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-2 rounded-full text-[11px] font-semibold hover:opacity-90 transition-opacity"
                  >
                    + Add Appointment
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── APPOINTMENT MODAL ── */}
        {apptModal && (
          <ModalOverlay onClose={() => setApptModal(false)}>
            <div className="bg-white p-6 rounded-2xl w-full max-w-md animate-[fadeInSlide_0.2s_ease-out_forwards]">
              <h3 className="text-lg font-bold text-[#466460] mb-4">Create Appointment</h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input type="text" placeholder="Full Name" className={inputCls}
                    value={newAppt.name} onChange={e => setNewAppt(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>ID Number</label>
                  <input type="text" placeholder="ID Number" className={inputCls}
                    value={newAppt.id} onChange={e => setNewAppt(f => ({ ...f, id: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Type</label>
                    <select className={inputCls} value={newAppt.type} onChange={e => setNewAppt(f => ({ ...f, type: e.target.value }))}>
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Time</label>
                    <input type="time" className={inputCls}
                      value={newAppt.time} onChange={e => setNewAppt(f => ({ ...f, time: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <select className={inputCls} value={newAppt.dept} onChange={e => setNewAppt(f => ({ ...f, dept: e.target.value }))}>
                    <option>College of Computing</option>
                    <option>College of Engineering</option>
                    <option>College of Health Sciences</option>
                    <option>College of Arts & Sciences</option>
                    <option>College of Business</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls}
                    value={newAppt.date} onChange={e => setNewAppt(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Reason</label>
                  <textarea rows={2} placeholder="Reason for appointment" className={`${inputCls} resize-none`}
                    value={newAppt.reason} onChange={e => setNewAppt(f => ({ ...f, reason: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleAddAppointment}
                  className="flex-1 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90">
                  Save
                </button>
                <button onClick={() => setApptModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {/* ── APPOINTMENT DETAIL MODAL ── */}
        {detailModal && (
          <ModalOverlay onClose={() => setDetailModal(null)}>
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm animate-[fadeInSlide_0.2s_ease-out_forwards]">
              <h3 className="text-lg font-bold text-[#466460] mb-4">Appointment Details</h3>
              <div className="divide-y divide-slate-100">
                {[
                  { icon: 'fa-user',        value: detailModal.name   },
                  { icon: 'fa-id-card',     value: detailModal.id     },
                  { icon: 'fa-tag',         value: detailModal.type   },
                  { icon: 'fa-building',    value: detailModal.dept   },
                  { icon: 'fa-calendar',    value: `${MONTH_NAMES[detailModal.month]} ${detailModal.day}, ${detailModal.year}` },
                  { icon: 'fa-clock',       value: detailModal.time   },
                  { icon: 'fa-stethoscope', value: detailModal.reason },
                ].map(({ icon, value }) => (
                  <div key={icon} className="flex items-center gap-3 py-2 text-[13px] text-slate-600">
                    <i className={`fa-solid ${icon} text-[#466460] w-4 text-center`}></i>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setDetailModal(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200">
                  Close
                </button>
                <button
                  onClick={() => { localStorage.setItem('selectedPatientId', detailModal.id); navigate(`/examination?patientId=${detailModal.id}`); }}
                  className="flex-1 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90">
                  Examine Patient
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {/* ── GROUP BOOKING MODAL ── */}
        {groupModal && (
          <ModalOverlay onClose={() => setGroupModal(false)}>
            <div className="bg-white p-6 rounded-2xl w-full max-w-lg animate-[fadeInSlide_0.2s_ease-out_forwards]">
              <h3 className="text-lg font-bold text-[#466460] mb-1">
                <i className="fa-solid fa-users mr-2"></i>Group Booking
              </h3>
              <p className="text-xs text-slate-400 mb-4">Assign multiple patients to a single schedule time.</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" className={inputCls}
                    value={groupForm.date} onChange={e => setGroupForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Time *</label>
                  <input type="time" className={inputCls}
                    value={groupForm.time} onChange={e => setGroupForm(f => ({ ...f, time: e.target.value }))} />
                </div>
              </div>
              <div className="mb-3">
                <label className={labelCls}>Reason *</label>
                <input type="text" placeholder="e.g. Mass vaccination drive" className={inputCls}
                  value={groupForm.reason} onChange={e => setGroupForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className={labelCls}>Clinic Type</label>
                <select className={inputCls} value={groupForm.clinic} onChange={e => setGroupForm(f => ({ ...f, clinic: e.target.value }))}>
                  <option>General</option>
                  <option>Dental</option>
                  <option>Laboratory</option>
                </select>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleCreateGroupBooking}
                  className="flex-1 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90">
                  Create Group Booking
                </button>
                <button onClick={() => setGroupModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

      </div>

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </DashboardLayout>
  );
};

export default Appointments;