// C:\Users\HP\MediTrack\frontend\src\features\Appointment.jsx
import React, { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';

export const Appointments = () => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [appointments, setAppointments] = useState([
    { name: "De Vera, Jenny", id: "23-00142", type: "student", day: 15, time: "10:00" },
    { name: "Dr. Reyes, Maria", id: "FAC-001", type: "instructor", day: 15, time: "14:30" }
  ]);

  const [newAppt, setNewAppt] = useState({ name: '', id: '', type: 'student', dept: 'BSIT', time: '' });

  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
  const todaysAppointments = appointments.filter(a => a.day === selectedDay);

  const handleAddAppointment = () => {
    if (!newAppt.name || !newAppt.id || !newAppt.time || !selectedDay) {
      return alert("Please fill all fields and select a date first.");
    }
    setAppointments([...appointments, { ...newAppt, day: selectedDay }]);
    setIsModalOpen(false);
    setNewAppt({ name: '', id: '', type: 'student', dept: 'BSIT', time: '' });
  };

  return (
    <DashboardLayout>
      <div className="animate-[fadeInSlide_0.4s_ease-out_forwards]">
        <div className="flex bg-white min-h-[calc(100vh-120px)]">
          
          {/* Left: Calendar */}
          <div className="flex-[1.5] border-r border-[#eef2f6]">
            <div className="bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white p-5 text-center">
              <h2 className="text-xl font-bold">Calendar</h2>
            </div>
            <div className="p-6">
              <div className="text-center font-bold text-lg text-[#466460] mb-6">April 2026</div>
              
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-bold text-xs text-[#8aacaa] uppercase">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {daysInMonth.map(day => {
                  const hasAppt = appointments.some(a => a.day === day);
                  const isSelected = selectedDay === day;
                  return (
                    <div 
                      key={day} 
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[80px] border rounded-xl p-2 cursor-pointer transition-all relative ${isSelected ? 'border-[#466460] bg-[#e0eceb]' : 'border-[#eef2f6] hover:bg-slate-50 hover:border-[#8aacaa]'}`}
                    >
                      <div className="text-xs font-bold text-[#466460]">{day}</div>
                      {hasAppt && <div className="w-2 h-2 bg-[#e07a5f] rounded-full absolute bottom-2 left-1/2 -translate-x-1/2"></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Appointment List */}
          <div className="flex-1 bg-gradient-to-br from-[#fafbfc] to-white flex flex-col">
            <div className="p-5 bg-gradient-to-br from-[#e0eceb] to-white border-b-2 border-[#466460]">
              <h3 className="text-sm font-bold text-[#466460]">
                Appointments for <span className="bg-[#466460] text-white px-3 py-1 rounded-full text-xs ml-2">
                  {selectedDay ? `April ${selectedDay}, 2026` : 'Select a date'}
                </span>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedDay ? (
                <div className="text-center p-12 text-slate-400">
                  <p>Click a date on the calendar to view or create appointments.</p>
                </div>
              ) : todaysAppointments.length === 0 ? (
                <div className="text-center p-12 text-slate-400 flex flex-col items-center">
                  <p className="mb-4">No appointments for this date.</p>
                  <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-5 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform">
                    + Create Appointment
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform">
                      + New Appointment
                    </button>
                  </div>
                  <div className="space-y-3">
                    {todaysAppointments.map((appt, i) => (
                      <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl relative overflow-hidden shadow-sm">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#466460] to-[#81b29a]"></div>
                        <div className="flex justify-between items-start pl-2">
                          <div>
                            <strong className="text-sm text-slate-800">{appt.name}</strong>
                            <div className="text-xs text-slate-500 mt-1">{appt.id} • {appt.type}</div>
                            <div className="inline-block text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full mt-2 font-bold uppercase tracking-wider">Pending</div>
                          </div>
                          <div className="text-xs font-bold text-[#466460] bg-slate-100 px-3 py-1 rounded-lg">
                            {appt.time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Create Appointment Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-3xl w-full max-w-md animate-[fadeInSlide_0.2s_ease-out_forwards]">
              <h3 className="text-xl font-bold text-[#466460] mb-6">Create Appointment</h3>
              
              <div className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#466460]" value={newAppt.name} onChange={e => setNewAppt({...newAppt, name: e.target.value})} />
                <input type="text" placeholder="ID Number" className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#466460]" value={newAppt.id} onChange={e => setNewAppt({...newAppt, id: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#466460] bg-white" value={newAppt.type} onChange={e => setNewAppt({...newAppt, type: e.target.value})}>
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="staff">Staff</option>
                  </select>
                  <input type="time" className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#466460]" value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={handleAddAppointment} className="flex-1 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-3 rounded-xl font-bold text-sm hover:opacity-90">Save</button>
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200">Cancel</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Appointments;