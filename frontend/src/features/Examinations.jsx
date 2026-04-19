// frontend/src/features/Examination.jsx
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { useSearchParams } from 'react-router-dom';

// Dummy data to simulate a database lookup for pre-filling
const peopleData = [
  { name: "De Vera, Jenny", id: "23-00142", type: "student", prog: "BSIT", year: "3rd Year", age: 21, email: "jenny.00142@plsp.edu.ph", department: "College of Computing" },
  { name: "Santos, Sofia", id: "23-23406", type: "student", prog: "BSCE", year: "2nd Year", age: 20, email: "sofia.2323406@plsp.edu.ph", department: "College of Engineering" }
];

const medicalConditions = ['Allergy', 'Asthma', 'Diabetes Mellitus', 'Hypertension', 'Heart Disease', 'Cerebrovascular Disease', 'Coronary Artery Disease', 'Hepatitis', 'Tuberculosis', 'Epilepsy/Seizure', 'Thyroid Disease', 'Cancer', 'Pneumonia', 'UTI', 'Kidney Disease', 'Arthritis', 'Migraine', 'Anxiety/Depression', 'Others'];
const familyConditions = ['Allergy', 'Asthma', 'Diabetes Mellitus', 'Hypertension', 'Heart Disease', 'Cerebrovascular Disease', 'Coronary Artery Disease', 'Cancer', 'Tuberculosis', 'Hepatitis', 'Epilepsy', 'Thyroid Disease', 'Kidney Disease', 'Arthritis', 'Others'];

export const Examinations = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  
  const [phase, setPhase] = useState(1);
  const [message, setMessage] = useState(null);
  const [surgeries, setSurgeries] = useState([{ id: 1, name: '', date: '' }]);
  const [logs, setLogs] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    lastName: '', firstName: '', middleName: '', suffix: '', studentId: '', schoolYear: '',
    course: '', yearSection: '', address: '', birthday: '', gender: 'Male', age: '',
    contactNo: '', email: '', civilStatus: 'Single',
    emergencyName: '', emergencyRelation: '', emergencyPhone: '',
    bp: '', pr: '', rr: '', temp: '', wt: '', ht: '', waist: '', lmp: '', nurse: '', physician: '', remarks: ''
  });

  // Pre-fill data if patientId exists
  useEffect(() => {
    if (patientId) {
      const patient = peopleData.find(p => p.id === patientId);
      if (patient) {
        const nameParts = patient.name.split(', ');
        setFormData(prev => ({
          ...prev,
          lastName: nameParts[0] || '',
          firstName: nameParts[1] || '',
          studentId: patient.id,
          course: patient.prog || '',
          yearSection: patient.year || '',
          age: patient.age || '',
          email: patient.email || ''
        }));
      }
    }
  }, [patientId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const calculateAge = (e) => {
    const dob = new Date(e.target.value);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms); 
    setFormData(prev => ({ ...prev, birthday: e.target.value, age: Math.abs(age_dt.getUTCFullYear() - 1970) }));
  };

  const handleSaveVisit = () => {
    if (!formData.bp || !formData.nurse) {
      return alert("Please enter at least BP and Nurse/Staff name before logging.");
    }
    const date = new Date().toLocaleDateString('en-PH');
    const vitals = `${formData.bp} / ${formData.pr} / ${formData.rr} / ${formData.temp}°C`;
    const bodyMeasure = `${formData.ht}cm / ${formData.wt}kg / ${formData.waist}cm`;
    const staff = `🧑‍⚕️ N: ${formData.nurse} | 👨‍⚕️ D: ${formData.physician}`;
    
    setLogs([{ date, vitals, bodyMeasure, staff, remarks: formData.remarks }, ...logs]);
    
    // Clear visit inputs
    setFormData(prev => ({ ...prev, bp: '', pr: '', rr: '', temp: '', wt: '', ht: '', waist: '', lmp: '', remarks: '' }));
    showMessage("✓ Examination record logged successfully!");
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.lastName) {
      setPhase(1);
      return alert("Please fill in patient's last name.");
    }
    showMessage("✓ Medical record submitted successfully! All data has been saved.");
    setTimeout(() => {
      if(window.confirm('Record saved! Clear form for new patient?')) window.location.reload();
    }, 1500);
  };

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";
  const sectionClass = "bg-slate-50 border-l-4 border-[#466460] p-3 text-xs font-bold uppercase my-6 flex justify-between items-center text-slate-700";

  return (
    <DashboardLayout>
      <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8 animate-[fadeInSlide_0.4s_ease-out_forwards]">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-[#466460] mb-2">
            <span>{phase === 1 ? 'Phase 1: History & Personal Data' : 'Phase 2: Clinical Findings & Assessment'}</span>
            <span>{phase === 1 ? '50%' : '100%'}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div className="bg-[#466460] h-2.5 rounded-full transition-all duration-500" style={{ width: phase === 1 ? '50%' : '100%' }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-[#466460]">Comprehensive Medical Examination Record</h2>
            <p className="text-sm text-slate-500 mt-1">Patient: {formData.lastName ? `${formData.lastName}, ${formData.firstName} (${formData.studentId})` : 'New Patient'}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#e0eceb] flex items-center justify-center">
            <i className="fa-solid fa-stethoscope text-[#466460] text-2xl"></i>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          
          {/* === PHASE 1 === */}
          <div className={phase === 1 ? 'block' : 'hidden'}>
            <div className={sectionClass}>📋 Patient Identification</div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3"><label className={labelClass}>Last Name *</label><input type="text" id="lastName" required className={inputClass} value={formData.lastName} onChange={handleChange} /></div>
              <div className="col-span-3"><label className={labelClass}>First Name *</label><input type="text" id="firstName" required className={inputClass} value={formData.firstName} onChange={handleChange} /></div>
              <div className="col-span-3"><label className={labelClass}>Middle Name</label><input type="text" id="middleName" className={inputClass} value={formData.middleName} onChange={handleChange} /></div>
              <div className="col-span-3"><label className={labelClass}>Suffix</label><input type="text" id="suffix" placeholder="Jr., Sr., III" className={inputClass} value={formData.suffix} onChange={handleChange} /></div>
              
              <div className="col-span-3"><label className={labelClass}>Student/ID No. *</label><input type="text" id="studentId" required className={inputClass} value={formData.studentId} onChange={handleChange} /></div>
              <div className="col-span-3"><label className={labelClass}>School Year</label><input type="text" id="schoolYear" placeholder="2025-2026" className={inputClass} value={formData.schoolYear} onChange={handleChange} /></div>
              <div className="col-span-3"><label className={labelClass}>Course/Program</label><input type="text" id="course" className={inputClass} value={formData.course} onChange={handleChange} /></div>
              <div className="col-span-3"><label className={labelClass}>Year & Section</label><input type="text" id="yearSection" className={inputClass} value={formData.yearSection} onChange={handleChange} /></div>
              
              <div className="col-span-6"><label className={labelClass}>Complete Address</label><input type="text" id="address" className={inputClass} value={formData.address} onChange={handleChange} /></div>
              <div className="col-span-2"><label className={labelClass}>Birthday</label><input type="date" id="birthday" className={inputClass} value={formData.birthday} onChange={calculateAge} /></div>
              <div className="col-span-2"><label className={labelClass}>Sex</label><select id="gender" className={inputClass} value={formData.gender} onChange={handleChange}><option>Male</option><option>Female</option></select></div>
              <div className="col-span-2"><label className={labelClass}>Age</label><input type="number" id="age" readOnly className={`${inputClass} bg-slate-50`} value={formData.age} /></div>
            </div>

            <div className={sectionClass}>🏥 Past Medical History</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
              {medicalConditions.map(c => (
                <label key={c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-[#466460] rounded focus:ring-[#466460]" /> {c}
                </label>
              ))}
            </div>

            <div className={sectionClass}>
              <span>⚕️ Past Surgical History</span>
              <button type="button" onClick={() => setSurgeries([...surgeries, { id: Date.now(), name: '', date: '' }])} className="bg-[#81b29a] text-white px-3 py-1 rounded text-xs hover:opacity-90">+ Add Operation</button>
            </div>
            {surgeries.map((s, i) => (
              <div key={s.id} className="grid grid-cols-12 gap-4 mb-3">
                <div className="col-span-9"><input type="text" placeholder="Operation/Procedure Name" className={inputClass} /></div>
                <div className="col-span-3"><input type="date" className={inputClass} /></div>
              </div>
            ))}

            <div className="mt-8 flex justify-end">
              <button type="button" onClick={() => setPhase(2)} className="bg-[#466460] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">Next: Clinical Findings →</button>
            </div>
          </div>

          {/* === PHASE 2 === */}
          <div className={phase === 2 ? 'block' : 'hidden'}>
            <div className={sectionClass}>
              <span>❤️ Vital Signs & Physical Assessment</span>
              <button type="button" onClick={handleSaveVisit} className="bg-[#81b29a] text-white px-3 py-1 rounded text-xs hover:opacity-90">+ Log Examination Record</button>
            </div>
            
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2"><label className={labelClass}>BP (mmHg)</label><input type="text" id="bp" placeholder="120/80" className={inputClass} value={formData.bp} onChange={handleChange} /></div>
              <div className="col-span-2"><label className={labelClass}>Pulse (bpm)</label><input type="text" id="pr" placeholder="72" className={inputClass} value={formData.pr} onChange={handleChange} /></div>
              <div className="col-span-2"><label className={labelClass}>Resp. Rate</label><input type="text" id="rr" placeholder="18" className={inputClass} value={formData.rr} onChange={handleChange} /></div>
              <div className="col-span-2"><label className={labelClass}>Temp (°C)</label><input type="text" id="temp" placeholder="36.5" className={inputClass} value={formData.temp} onChange={handleChange} /></div>
              <div className="col-span-2"><label className={labelClass}>Weight (kg)</label><input type="text" id="wt" placeholder="65" className={inputClass} value={formData.wt} onChange={handleChange} /></div>
              <div className="col-span-2"><label className={labelClass}>Height (cm)</label><input type="text" id="ht" placeholder="165" className={inputClass} value={formData.ht} onChange={handleChange} /></div>
              
              <div className="col-span-4"><label className={labelClass}>Nurse/Staff Name</label><input type="text" id="nurse" className={inputClass} value={formData.nurse} onChange={handleChange} /></div>
              <div className="col-span-4"><label className={labelClass}>Physician & License No.</label><input type="text" id="physician" className={inputClass} value={formData.physician} onChange={handleChange} /></div>
              <div className="col-span-4"><label className={labelClass}>Waist Circ. (cm)</label><input type="text" id="waist" className={inputClass} value={formData.waist} onChange={handleChange} /></div>
              
              <div className="col-span-12"><label className={labelClass}>Remarks / Diagnosis / Prescription</label><textarea id="remarks" rows="3" className={`${inputClass} resize-none`} placeholder="Clinical findings..." value={formData.remarks} onChange={handleChange}></textarea></div>
            </div>

            <div className={sectionClass}>📋 Examination History Log</div>
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr><th className="p-3">Date</th><th className="p-3">Vitals</th><th className="p-3">Measurements</th><th className="p-3">Staff</th><th className="p-3">Remarks</th></tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">No examination logs yet.</td></tr>
                  ) : logs.map((log, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-3">{log.date}</td><td className="p-3">{log.vitals}</td><td className="p-3">{log.bodyMeasure}</td><td className="p-3">{log.staff}</td><td className="p-3">{log.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200">
              <button type="button" onClick={() => setPhase(1)} className="bg-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all">← Previous</button>
              <button type="submit" className="bg-[#466460] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">💾 Final Submission</button>
            </div>
          </div>

        </form>

        {/* Success Toast */}
        {message && (
          <div className="fixed bottom-6 right-6 bg-emerald-100 text-emerald-800 px-6 py-4 rounded-xl shadow-lg border border-emerald-200 font-bold animate-[fadeIn_0.3s_ease-out]">
            {message}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Examinations;