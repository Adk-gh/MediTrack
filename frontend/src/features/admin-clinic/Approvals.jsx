// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Approvals.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MedicalCertificate } from '../../components/MedicalCertificate';

// ============================================================
// SNACKBAR COMPONENT
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div
    className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
      ${visible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-20'}
      ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}
  >
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

// ============================================================
// STATUS BADGE
// ============================================================
const StatusBadge = ({ status }) => {
  const statusClass = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700'
  }[status?.toLowerCase()] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusClass}`}>
      {status || 'unknown'}
    </span>
  );
};

// ============================================================
// SAMPLE DATA (replace with Firestore in production)
// ============================================================
const sampleExaminations = [
  {
    id: 1,
    patientName: "De Vera, Jenny",
    patientId: "23-00142",
    type: "student",
    program: "BSIT",
    year: "3rd Year",
    department: "College of Computing",
    examDate: "2026-05-05",
    nurseName: "Nurse Maria Santos",
    status: "pending",
    reason: "Annual Physical Exam",
    age: 21,
    gender: "Female",
    vitals: { bp: "110/70", pr: "68", rr: "16", temp: "36.4", weight: "52" },
    anthropometrics: { height: "155", weight: "52", bmi: "21.6", waist: "68" },
    medicalHistory: ["Allergy (Dust)", "Asthma (mild, controlled)"],
    surgicalHistory: ["Appendectomy (2020)"],
    familyHistory: ["Hypertension (Father)"],
    vaccine: { dose1: "Pfizer", dose1Date: "2023-03-15", dose2: "Pfizer", dose2Date: "2023-04-15", booster: "Pfizer", boosterDate: "2023-10-01" },
    labResults: { cbc: "WBC: 6.8, RBC: 4.5, Hgb: 13.8, Hct: 40%", cbcFacility: "PLSP Clinic Lab", ua: "Color: Straw, pH: 6.0, SG: 1.015", uaFacility: "PLSP Clinic Lab", xray: "Clear lungs, normal heart silhouette", xrayFacility: "San Pablo Medical Center" },
    social: { smoking: "No", alcohol: "No", drugs: "No" }
  },
  {
    id: 2,
    patientName: "Santos, Sofia",
    patientId: "23-23406",
    type: "student",
    program: "BSCE",
    year: "2nd Year",
    department: "College of Engineering",
    examDate: "2026-05-04",
    nurseName: "Nurse Maria Santos",
    status: "pending",
    reason: "Medical Clearance",
    age: 20,
    gender: "Female",
    vitals: { bp: "120/80", pr: "72", rr: "18", temp: "36.5", weight: "58" },
    anthropometrics: { height: "162", weight: "58", bmi: "22.1", waist: "70" },
    medicalHistory: ["No significant medical history"],
    surgicalHistory: ["No surgical history"],
    familyHistory: ["Diabetes (Mother)"],
    vaccine: { dose1: "AstraZeneca", dose1Date: "2023-02-20", dose2: "AstraZeneca", dose2Date: "2023-04-20", booster: "Moderna", boosterDate: "2023-11-15" },
    labResults: { cbc: "WBC: 7.0, RBC: 4.6, Hgb: 14.0, Hct: 41%", cbcFacility: "PLSP Clinic Lab", ua: "Color: Yellow, pH: 5.8, SG: 1.018", uaFacility: "PLSP Clinic Lab", xray: "Normal chest findings", xrayFacility: "San Pablo Medical Center" },
    social: { smoking: "No", alcohol: "No", drugs: "No" }
  },
  {
    id: 3,
    patientName: "Mendoza, Paolo",
    patientId: "22-09123",
    type: "student",
    program: "BSN",
    year: "4th Year",
    department: "College of Health Sciences",
    examDate: "2026-05-03",
    nurseName: "Nurse Ana Reyes",
    status: "approved",
    reason: "RLE Clearance",
    age: 22,
    gender: "Male",
    vitals: { bp: "115/75", pr: "70", rr: "17", temp: "36.3", weight: "65" },
    anthropometrics: { height: "170", weight: "65", bmi: "22.5", waist: "76" },
    medicalHistory: ["Allergic Rhinitis"],
    surgicalHistory: ["Tonsillectomy (2015)"],
    familyHistory: ["Asthma (Mother)", "Heart Disease (Father)"],
    vaccine: { dose1: "Sinovac", dose1Date: "2022-08-10", dose2: "Sinovac", dose2Date: "2022-09-10", booster: "Pfizer", boosterDate: "2023-06-20" },
    labResults: { cbc: "WBC: 6.5, RBC: 5.0, Hgb: 15.2, Hct: 45%", cbcFacility: "PLSP Clinic Lab", ua: "Color: Pale Yellow, pH: 6.2, SG: 1.012", uaFacility: "PLSP Clinic Lab", xray: "No active disease", xrayFacility: "San Pablo Medical Center" },
    social: { smoking: "No", alcohol: "Occasionally", drugs: "No" }
  },
  {
    id: 4,
    patientName: "Garcia, Rico",
    patientId: "24-11002",
    type: "student",
    program: "BS PSY",
    year: "1st Year",
    department: "College of Arts & Sciences",
    examDate: "2026-05-02",
    nurseName: "Nurse Maria Santos",
    status: "pending",
    reason: "New Student Medical",
    age: 18,
    gender: "Male",
    vitals: { bp: "118/78", pr: "74", rr: "18", temp: "36.6", weight: "60" },
    anthropometrics: { height: "165", weight: "60", bmi: "22.0", waist: "72" },
    medicalHistory: ["No significant medical history"],
    surgicalHistory: ["No surgical history"],
    familyHistory: ["No significant family history"],
    vaccine: { dose1: "Pfizer", dose1Date: "2024-01-15", dose2: "Pfizer", dose2Date: "2024-02-15", booster: "Pfizer", boosterDate: "2024-08-20" },
    labResults: { cbc: "WBC: 6.2, RBC: 4.4, Hgb: 13.5, Hct: 39%", cbcFacility: "PLSP Clinic Lab", ua: "Color: Yellow, pH: 6.0, SG: 1.020", uaFacility: "PLSP Clinic Lab", xray: "Normal", xrayFacility: "San Pablo Medical Center" },
    social: { smoking: "No", alcohol: "No", drugs: "No" }
  },
  {
    id: 5,
    patientName: "Dr. Reyes, Maria",
    patientId: "FAC-001",
    type: "instructor",
    program: "PhD",
    department: "College of Computing",
    examDate: "2026-04-30",
    nurseName: "Nurse Maria Santos",
    status: "pending",
    reason: "Annual Check-up",
    age: 45,
    gender: "Female",
    vitals: { bp: "130/85", pr: "80", rr: "18", temp: "36.7", weight: "70" },
    anthropometrics: { height: "160", weight: "70", bmi: "27.3", waist: "82" },
    medicalHistory: ["Hypertension", "Hyperlipidemia"],
    surgicalHistory: ["Cholecystectomy (2019)"],
    familyHistory: ["Hypertension (Father)", "Diabetes (Mother)"],
    vaccine: { dose1: "Pfizer", dose1Date: "2022-03-10", dose2: "Pfizer", dose2Date: "2022-04-10", booster: "Pfizer", boosterDate: "2023-01-20" },
    labResults: { cbc: "WBC: 7.5, RBC: 4.8, Hgb: 14.0, Hct: 42%", cbcFacility: "PLSP Clinic Lab", ua: "Color: Yellow, pH: 5.5, SG: 1.022", uaFacility: "PLSP Clinic Lab", xray: "Mild cardiomegaly", xrayFacility: "San Pablo Medical Center" },
    social: { smoking: "No", alcohol: "Occasionally", drugs: "No" }
  },
  {
    id: 6,
    patientName: "Ms. Fernandez, Leah",
    patientId: "STAFF-012",
    type: "staff",
    program: "N/A",
    department: "Registrar's Office",
    examDate: "2026-04-29",
    nurseName: "Nurse Ana Reyes",
    status: "rejected",
    reason: "Pre-employment Medical",
    age: 32,
    gender: "Female",
    vitals: { bp: "140/90", pr: "88", rr: "20", temp: "37.0", weight: "75" },
    anthropometrics: { height: "155", weight: "75", bmi: "31.2", waist: "90" },
    medicalHistory: ["Hypertension", "Obesity", "GERD"],
    surgicalHistory: ["C-section (2018)"],
    familyHistory: ["Hypertension (both parents)", "Heart Disease (Father)"],
    vaccine: { dose1: "Sinovac", dose1Date: "2022-06-15", dose2: "Sinovac", dose2Date: "2022-07-15", booster: "AstraZeneca", boosterDate: "2023-03-01" },
    labResults: { cbc: "WBC: 8.2, RBC: 4.6, Hgb: 12.5, Hct: 37%", cbcFacility: "PLSP Clinic Lab", ua: "Color: Dark Yellow, pH: 5.2, SG: 1.030", uaFacility: "PLSP Clinic Lab", xray: "Findings suggestive of COPD", xrayFacility: "San Pablo Medical Center" },
    social: { smoking: "Yes (10 sticks/day)", alcohol: "Yes (2-3x/week)", drugs: "No" }
  }
];

export const Approvals = () => {
  const [examinations, setExaminations] = useState(sampleExaminations);
  const [selectedExam, setSelectedExam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ message: '', type: 'success', visible: false });
  const [loading, setLoading] = useState(false);

  // Filter examinations based on search
  const filteredExaminations = examinations.filter(exam =>
    exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show snackbar
  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type, visible: true });
    setTimeout(() => setSnackbar(prev => ({ ...prev, visible: false })), 3500);
  };

  // Select an examination
  const handleSelectExam = (exam) => {
    setSelectedExam(exam);
  };

  // Approve examination
  const handleApprove = async (exam) => {
    setLoading(true);
    try {
      // Update local state
      const updated = examinations.map(e =>
        e.id === exam.id ? { ...e, status: 'approved' } : e
      );
      setExaminations(updated);
      setSelectedExam({ ...exam, status: 'approved' });

      // TODO: Update Firestore in production
      // await updateDoc(doc(db, 'examinations', exam.id), { status: 'approved' });

      showSnackbar(`Examination for ${exam.patientName} has been approved!`, 'success');
    } catch (error) {
      console.error('Error approving examination:', error);
      showSnackbar('Failed to approve examination', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit with remarks
  const handleSubmitCertificate = async (data) => {
    setLoading(true);
    try {
      const updated = examinations.map(e =>
        e.id === data.id ? { ...e, status: 'approved', remarks: data.remarks } : e
      );
      setExaminations(updated);
      setSelectedExam({ ...data, status: 'approved' });

      showSnackbar(`Examination for ${data.patientName} submitted successfully!`, 'success');
    } catch (error) {
      console.error('Error submitting certificate:', error);
      showSnackbar('Failed to submit certificate', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Edit certificate (placeholder)
  const handleEdit = () => {
    showSnackbar('Editing examination details...', 'success');
  };

  // Render examination list item
  const renderExamItem = (exam) => (
    <div
      key={exam.id}
      onClick={() => handleSelectExam(exam)}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-l-3 mb-2
        ${selectedExam?.id === exam.id
          ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[#466460]'
          : 'bg-slate-50 hover:bg-gradient-to-r hover:from-[#f0f7f6] hover:to-white border-l-transparent'
        }`}
    >
      <div className="flex justify-between items-start mb-1">
        <p className="text-sm font-bold text-slate-700">{exam.patientName}</p>
        <StatusBadge status={exam.status} />
      </div>
      <p className="text-xs text-slate-500">{exam.patientId} • {exam.program} {exam.year}</p>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-slate-400"><i className="fa-solid fa-calendar mr-1"></i>{exam.examDate}</p>
        <p className="text-xs text-slate-400">{exam.reason}</p>
      </div>
    </div>
  );

  // Render examination detail
  const renderExamDetail = (exam) => {
    if (!exam) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <i className="fa-regular fa-clipboard text-slate-200 text-5xl mb-3"></i>
          <p className="text-slate-400 text-sm">Select an examination from the list</p>
        </div>
      );
    }

    return (
      <div className="animate-in">
        {/* Patient Header */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#466460]">{exam.patientName}</h3>
              <p className="text-sm text-slate-500">
                {exam.patientId} • {exam.type === 'student' ? 'Student' : exam.type === 'instructor' ? 'Faculty' : 'Staff'}
              </p>
            </div>
            <StatusBadge status={exam.status} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase">Program/Department</p>
              <p className="text-sm font-semibold">{exam.program} {exam.year}</p>
              <p className="text-xs text-slate-500">{exam.department}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Examination Date</p>
              <p className="text-sm font-semibold">{exam.examDate}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Reason</p>
              <p className="text-sm font-semibold">{exam.reason}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Nurse on Duty</p>
              <p className="text-sm font-semibold">{exam.nurseName}</p>
            </div>
          </div>
        </div>

        {/* Medical Examination Summary */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200">
          <h4 className="text-sm font-bold text-[#466460] mb-4 uppercase tracking-wide border-b border-slate-200 pb-2">
            <i className="fa-solid fa-clipboard-list mr-2"></i>Medical Examination Summary
          </h4>

          {/* Vital Signs */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Vital Signs</p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'BP', value: exam.vitals?.bp || '120/80', unit: 'mmHg' },
                { label: 'PR', value: exam.vitals?.pr || '72', unit: 'bpm' },
                { label: 'RR', value: exam.vitals?.rr || '18', unit: 'cpm' },
                { label: 'Temp', value: exam.vitals?.temp || '36.5', unit: '°C' },
                { label: 'Weight', value: exam.vitals?.weight || '55', unit: 'kg' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-slate-400 uppercase">{item.label}</p>
                  <p className="text-sm font-bold text-[#466460]">{item.value}</p>
                  <p className="text-[8px] text-slate-400">{item.unit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Anthropometrics */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Anthropometrics</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Height', value: exam.anthropometrics?.height || '160', unit: 'cm' },
                { label: 'Weight', value: exam.anthropometrics?.weight || '55', unit: 'kg' },
                { label: 'BMI', value: exam.anthropometrics?.bmi || '21.5', unit: '' },
                { label: 'Waist', value: exam.anthropometrics?.waist || '72', unit: 'cm' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-2">
                  <p className="text-[9px] text-slate-400 uppercase">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value} {item.unit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Medical History */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Past Medical History</p>
            <div className="flex flex-wrap gap-1">
              {(exam.medicalHistory || ['No significant medical history']).map((h, idx) => (
                <span key={idx} className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-[10px] font-semibold">{h}</span>
              ))}
            </div>
          </div>

          {/* Surgical History */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Surgical History</p>
            <div className="flex flex-wrap gap-1">
              {(exam.surgicalHistory || ['No surgical history']).map((h, idx) => (
                <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-[10px] font-semibold">{h}</span>
              ))}
            </div>
          </div>

          {/* Family History */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Family History</p>
            <div className="flex flex-wrap gap-1">
              {(exam.familyHistory || ['No significant family history']).map((h, idx) => (
                <span key={idx} className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-[10px] font-semibold">{h}</span>
              ))}
            </div>
          </div>

          {/* COVID-19 Vaccine */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">COVID-19 Vaccine</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '1st Dose', vaccine: exam.vaccine?.dose1 || 'Pfizer', date: exam.vaccine?.dose1Date || '2023-03-15' },
                { label: '2nd Dose', vaccine: exam.vaccine?.dose2 || 'Pfizer', date: exam.vaccine?.dose2Date || '2023-04-15' },
                { label: 'Booster', vaccine: exam.vaccine?.booster || 'Moderna', date: exam.vaccine?.boosterDate || '2023-10-01' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-2">
                  <p className="text-[9px] text-slate-400 uppercase">{item.label}</p>
                  <p className="text-xs font-semibold">{item.vaccine}</p>
                  <p className="text-[9px] text-slate-400">{item.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Laboratory Results */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Laboratory Results</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 border-b font-semibold text-slate-600">Test</th>
                    <th className="text-left p-2 border-b font-semibold text-slate-600">Results</th>
                    <th className="text-left p-2 border-b font-semibold text-slate-600">Facility</th>
                    <th className="text-left p-2 border-b font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b">CBC</td>
                    <td className="p-2 border-b font-semibold">{exam.labResults?.cbc || 'WBC: 7.2, RBC: 4.8, Hgb: 14.2, Hct: 42%'}</td>
                    <td className="p-2 border-b">{exam.labResults?.cbcFacility || 'PLSP Clinic Lab'}</td>
                    <td className="p-2 border-b">{exam.examDate}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b">Urinalysis</td>
                    <td className="p-2 border-b font-semibold">{exam.labResults?.ua || 'Color: Yellow, pH: 6.0, SG: 1.020'}</td>
                    <td className="p-2 border-b">{exam.labResults?.uaFacility || 'PLSP Clinic Lab'}</td>
                    <td className="p-2 border-b">{exam.examDate}</td>
                  </tr>
                  <tr>
                    <td className="p-2">Chest X-Ray</td>
                    <td className="p-2 font-semibold">{exam.labResults?.xray || 'No active cardiopulmonary disease'}</td>
                    <td className="p-2">{exam.labResults?.xrayFacility || 'San Pablo Medical Center'}</td>
                    <td className="p-2">{exam.examDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Personal/Social History */}
          <div className="mb-2">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Personal/Social History</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Smoking', value: exam.social?.smoking || 'No' },
                { label: 'Alcohol', value: exam.social?.alcohol || 'No' },
                { label: 'Illicit Drugs', value: exam.social?.drugs || 'No' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{item.label}:</span>
                  <span className={`text-xs font-semibold ${item.value.toLowerCase().includes('yes') ? 'text-red-600' : 'text-green-600'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Medical Certificate */}
        <MedicalCertificate
          examination={exam}
          onSubmit={handleSubmitCertificate}
          onEdit={handleEdit}
        />
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-140px)] bg-white">
      {/* Left Column - Examination List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">Submitted Examinations</h3>
            <span className="text-[9px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">
              {filteredExaminations.length}
            </span>
          </div>
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-[#466460] focus:bg-white transition"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {filteredExaminations.length > 0 ? (
            filteredExaminations.map(renderExamItem)
          ) : (
            <div className="text-center text-slate-400 text-sm py-12">
              No examinations found
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Examination Detail */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">Examination Details</h3>
            {selectedExam && (
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="bg-slate-100 text-slate-600 border-none px-4 py-2 rounded-lg font-semibold text-xs hover:bg-slate-200 transition flex items-center gap-1"
                >
                  <i className="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button
                  onClick={() => handleApprove(selectedExam)}
                  disabled={loading || selectedExam?.status === 'approved'}
                  className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1 disabled:opacity-50"
                >
                  <i className="fa-solid fa-check-circle"></i> Approve
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {renderExamDetail(selectedExam)}
        </div>
      </div>

      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        visible={snackbar.visible}
      />
    </div>
  );
};

export default Approvals;