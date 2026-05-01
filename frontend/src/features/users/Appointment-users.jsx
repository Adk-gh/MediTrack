import React, { useState } from 'react';

export default function AppointmentUsers() {
  const [showModal, setShowModal] = useState(false);
  const [appointments, setAppointments] = useState([
    { date: 'April 27, 2026', title: 'Online Consultation' },
    { date: 'April 27, 2026', title: 'Dental Examination' }
  ]);

  const [formData, setFormData] = useState({
    date: '2026-04-27',
    hour: '12',
    minute: '00',
    ampm: 'PM',
    purpose: '',
    otherPurpose: ''
  });

  const handleSubmit = () => {
    const date = new Date(formData.date);
    const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = `${formData.hour}:${formData.minute} ${formData.ampm}`;
    const purpose = formData.purpose === 'Other' && formData.otherPurpose
      ? `Other: ${formData.otherPurpose}`
      : formData.purpose || 'Other (no details)';

    setAppointments([...appointments, { date: `${formattedDate} at ${time}`, title: purpose }]);
    setShowModal(false);
    setFormData({
      date: '2026-04-27',
      hour: '12',
      minute: '00',
      ampm: 'PM',
      purpose: '',
      otherPurpose: ''
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f7faf8]">

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Add Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#1a5c3a] text-white border-none rounded-2.5 py-2 px-3.5 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-[#2d7a52] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add an Appointment
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white border border-[#ddeee5] rounded-4xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#1a2e22]">April 2026</span>
            <div className="flex gap-1.5">
              <button className="w-6 h-6 border border-[#ddeee5] rounded-lg bg-white cursor-pointer text-[#6b8577] text-xs">&#8249;</button>
              <button className="w-6 h-6 border border-[#ddeee5] rounded-lg bg-white cursor-pointer text-[#6b8577] text-xs">&#8250;</button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <span key={i} className="text-center text-[10px] font-bold text-[#9bb5a5] uppercase py-0.5">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {[29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 1, 2].map((day, i) => (
              <div
                key={i}
                className={`text-center py-1.5 text-xs font-medium rounded-2xl cursor-pointer ${
                  day === 27
                    ? 'bg-[#2d7a52] text-white font-bold'
                    : day > 0 && day <= 30
                    ? 'text-[#1a2e22] hover:bg-[#e8f5ee]'
                    : 'text-[#9bb5a5]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Appointments List */}
        <div className="text-[13px] font-bold text-[#1a2e22]">Current Appointment Records</div>
        <div className="flex flex-col gap-2">
          {appointments.map((appt, i) => (
            <div key={i} className="bg-[#e8f5ee] border border-[#c6dfd0] rounded-3xl p-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-[#4aab72] transition-all">
              <div className="text-[10.5px] font-semibold text-[#9bb5a5] uppercase tracking-wide mb-0.5">{appt.date}</div>
              <div className="text-sm font-bold text-[#1a2e22]">{appt.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[3000] flex items-center justify-center">
          <div className="w-[300px] max-w-[88%] bg-white rounded-[28px] overflow-hidden shadow-2xl">
            <div className="bg-[#1a5c3a] px-5 py-4 text-white">
              <h3 className="font-serif text-lg">Schedule Appointment</h3>
              <p className="text-[11px] opacity-80 mt-1">Fill in the details below</p>
            </div>
            <div className="p-5 flex flex-col gap-4.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#2d7a52] uppercase tracking-wide">Pick a Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="border border-[#ddeee5] rounded-3xl px-3 py-2.5 text-xs bg-[#f7faf8] outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#2d7a52] uppercase tracking-wide">Select Time</label>
                <div className="flex gap-3 items-center">
                  <select
                    value={formData.hour}
                    onChange={(e) => setFormData({ ...formData, hour: e.target.value })}
                    className="flex-1 border border-[#ddeee5] rounded-3xl px-2 py-2.5 text-xs bg-[#f7faf8]"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <select
                    value={formData.minute}
                    onChange={(e) => setFormData({ ...formData, minute: e.target.value })}
                    className="flex-1 border border-[#ddeee5] rounded-3xl px-2 py-2.5 text-xs bg-[#f7faf8]"
                  >
                    {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={formData.ampm}
                    onChange={(e) => setFormData({ ...formData, ampm: e.target.value })}
                    className="flex-1 border border-[#ddeee5] rounded-3xl px-2 py-2.5 text-xs bg-[#f7faf8]"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#2d7a52] uppercase tracking-wide">Select a purpose</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {['Check-up', 'Consultation', 'Vaccination'].map(p => (
                    <label key={p} className="flex items-center gap-1.5 font-medium text-xs text-[#1a2e22]">
                      <input
                        type="radio"
                        name="purpose"
                        value={p}
                        checked={formData.purpose === p}
                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      />
                      {p}
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5 font-medium text-xs text-[#1a2e22]">
                    <input
                      type="radio"
                      name="purpose"
                      value="Other"
                      checked={formData.purpose === 'Other'}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    />
                    Other
                  </label>
                </div>
                {formData.purpose === 'Other' && (
                  <textarea
                    placeholder="Please elaborate here..."
                    value={formData.otherPurpose}
                    onChange={(e) => setFormData({ ...formData, otherPurpose: e.target.value })}
                    className="mt-2 border border-[#ddeee5] rounded-2xl px-3 py-2.5 text-xs bg-[#f7faf8] outline-none resize-none"
                    rows="2"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2.5 p-5 border-t border-[#ddeee5] bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-transparent border border-[#ddeee5] py-2.5 rounded-[40px] font-bold text-xs text-[#6b8577] cursor-pointer hover:bg-[#e8f5ee]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-[#1a5c3a] border-none py-2.5 rounded-[40px] font-bold text-xs text-white cursor-pointer hover:bg-[#2d7a52]"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}