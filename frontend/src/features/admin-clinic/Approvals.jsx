// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Approvals.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { MedicalCertificate } from '../../components/MedicalCertificate';

// ============================================================
// SNACKBAR COMPONENT
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div
    className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
      ${visible ? '-translate-x-1/2 translate-y-0 opacity-100' : '-translate-x-1/2 translate-y-32 opacity-0 pointer-events-none'}
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
    done: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700'
  }[status?.toLowerCase()] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusClass}`}>
      {status || 'pending'}
    </span>
  );
};

export const Approvals = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'
  const [examinations, setExaminations] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');

  const [snackbar, setSnackbar] = useState({ message: '', type: 'success', visible: false });
  const [loading, setLoading] = useState(true);

  // State for Medical History
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // States for Certificate Toggle
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);

  // Fetch records based on activeTab
  useEffect(() => {
    const fetchExaminations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('medical_records')
          .select('*, users(*)')
          .ilike('status', activeTab)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const fetchedExams = (data || []).map(record => {
          let userData = record.users || {};
          if (Array.isArray(userData)) userData = userData[0] || {};

          const fName = record.first_name || userData.first_name || '';
          const lName = record.last_name || userData.last_name || '';
          const patientName = [lName, fName].filter(Boolean).join(', ') || 'Unknown Patient';

          const patientId = record.student_id || record.university_id || userData.university_id || 'N/A';

          // Aggressively extract demographic data
          const department = userData.department || record.department || 'N/A';
          const program = userData.program || record.program || userData.course || record.course || 'N/A';
          const yLevel = userData.year_level || record.year_level || '';
          const sec = userData.section || record.section || '';
          const yearSection = [yLevel, sec].filter(Boolean).join(' - ') || '';

          // A cert is only forwarded if the doctor actually typed text into findings or remarks
          const certificateIssued = !!(record.finding1?.trim() || record.remarks?.trim());

          return {
            id: record.id,
            recordId: record.id,
            userId: record.user_id,
            patientName,
            patientId,
            type: record.role || userData.role || 'student',

            course:      program,
            yearSection,
            address:     record.address || record.home_address || userData.home_address || '',
            age:         record.age || userData.age || '',
            sex:         record.sex || record.gender || userData.sex || '',
            examDate:    record.exam_date || (record.created_at ? new Date(record.created_at).toISOString().split('T')[0] : ''),

            program:     program,
            year:        yearSection,
            department:  department,
            nurseName:   record.nurse_on_duty || 'Unknown',
            status:      record.status || 'pending',
            reason:      record.reason || 'Medical Examination',

            // Certificate Details
            finding1:          record.finding1,
            remarks:           record.remarks,
            isFit:             record.is_fit,
            isNormalFindings:  record.is_normal_findings,
            certificateIssued: certificateIssued,

            vitals:          record.vital_records?.[0] || {},
            anthropometrics: { height: record.height, weight: record.weight, bmi: record.bmi, waist: record.waist },
            medicalHistory:  record.checked_medical || [],
            surgicalHistory: record.surgical_history?.map(s => `${s.operation} (${s.date})`) || [],
            familyHistory:   record.checked_family  || [],
            vaccine: {
              dose1:       record.vax1,       dose1Date:    record.vax1_date,
              dose2:       record.vax2,       dose2Date:    record.vax2_date,
              booster:     record.booster1,   boosterDate:  record.booster1_date,
            },
            labResults: {
              cbc:         record.lab_cbc,     cbcFacility:  record.lab_cbc_facility,
              ua:          record.lab_ua,      uaFacility:   record.lab_ua_facility,
              xray:        record.lab_xray,    xrayFacility: record.lab_xray_facility,
            },
            social: { smoking: record.smoking, alcohol: record.alcohol, drugs: record.drugs },
          };
        });

        setExaminations(fetchedExams);
      } catch (error) {
        console.error("Error fetching approvals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExaminations();

    // Clear selections and filters when switching tabs
    setSelectedExam(null);
    setShowCertForm(false);
    setSearchTerm('');
    setFilterRole('All');
    setFilterDept('All');
    setFilterProgram('All');
  }, [activeTab]);

  // Fetch Past Medical Records when a patient is selected
  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedExam) {
        setConsultationHistory([]);
        return;
      }

      setLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('medical_records')
          .select('*')
          .eq('user_id', selectedExam.userId)
          .neq('id', selectedExam.recordId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setConsultationHistory(data || []);
      } catch (err) {
        console.error('Error fetching medical history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedExam]);

  // Derived Filter Lists based on current data
  const uniqueRoles = ['All', ...new Set(examinations.map(e => e.type).filter(Boolean))].sort();
  const uniqueDepts = ['All', ...new Set(examinations.map(e => e.department).filter(d => d && d !== 'N/A'))].sort();
  const uniquePrograms = ['All', ...new Set(
    examinations
      .filter(e => filterDept === 'All' || e.department === filterDept)
      .map(e => e.program)
      .filter(p => p && p !== 'N/A')
  )].sort();

  // Apply Filters
  const filteredExaminations = examinations.filter(exam => {
    const matchSearch = exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        exam.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = filterRole === 'All' || exam.type === filterRole;
    const matchDept = filterDept === 'All' || exam.department === filterDept;
    const matchProgram = filterProgram === 'All' || exam.program === filterProgram;

    return matchSearch && matchRole && matchDept && matchProgram;
  });

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type, visible: true });
    setTimeout(() => setSnackbar(prev => ({ ...prev, visible: false })), 3500);
  };

  const handleSelectExam = (exam) => {
    setSelectedExam(exam);
    setShowCertForm(false);
  };

  const handleApprove = async (exam) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('medical_records').update({
        status: 'approved',
        is_approved: true,
        approved_at: new Date().toISOString()
      }).eq('id', exam.recordId || exam.id);

      if (error) throw error;

      if (activeTab === 'pending') {
        setExaminations(examinations.filter(e => e.id !== exam.id));
        setSelectedExam(null);
      }

      setShowCertForm(false);
      showSnackbar(`Examination for ${exam.patientName} has been approved!`, 'success');
    } catch (error) {
      console.error('Error approving examination:', error);
      showSnackbar('Failed to approve examination', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCertificate = async (data) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('medical_records').update({
        status:           'approved',
        is_approved:       true,
        finding1:          data.finding1        ?? '',
        remarks:           data.remarks         ?? '',
        is_fit:            data.isFit           ?? true,
        is_normal_findings: data.isNormalFindings  ?? true,
        approved_at:       selectedExam.status === 'approved' ? undefined : new Date().toISOString(),
      }).eq('id', selectedExam.recordId || selectedExam.id);

      if (error) throw error;

      if (activeTab === 'pending') {
        setExaminations(examinations.filter(e => e.id !== selectedExam.id));
        setSelectedExam(null);
      } else {
        const updatedExam = {
          ...selectedExam,
          finding1: data.finding1 ?? '',
          remarks: data.remarks ?? '',
          isFit: data.isFit ?? true,
          isNormalFindings: data.isNormalFindings ?? true,
          // Update cert status based on if they typed anything
          certificateIssued: !!(data.finding1?.trim() || data.remarks?.trim())
        };
        setExaminations(examinations.map(e => e.id === selectedExam.id ? updatedExam : e));
        setSelectedExam(updatedExam);
      }

      setShowCertForm(false);
      showSnackbar(`Medical Certificate for ${data.patientName || selectedExam.patientName} has been issued!`, 'success');
    } catch (error) {
      console.error('Error submitting certificate:', error);
      showSnackbar('Failed to submit certificate', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => showSnackbar('Editing examination details...', 'success');

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
        <p className="text-[13px] font-bold text-slate-800 truncate pr-2">{exam.patientName}</p>
        <StatusBadge status={exam.status} />
      </div>
      <p className="text-[11px] text-slate-500 truncate mb-1">
        {exam.patientId} • {exam.program !== 'N/A' ? exam.program : exam.department}
      </p>
      <div className="flex justify-between items-center mt-1">
        <p className="text-[10px] text-slate-400">{exam.examDate}</p>
        {exam.certificateIssued && (
          <span className="text-[9px] font-bold text-[#466460] bg-[#e0eceb] px-1.5 py-0.5 rounded-sm">CERT SENT</span>
        )}
      </div>
    </div>
  );

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
      <div className="animate-in fade-in duration-300">
        {/* Patient Header */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-lg font-bold text-[#466460] uppercase tracking-wide">{exam.patientName}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {exam.patientId} • {exam.type === 'student' ? 'Student' : exam.type === 'instructor' ? 'Faculty' : 'Staff'}
              </p>
            </div>
            <StatusBadge status={exam.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Program/Department</p>
              {exam.program !== 'N/A' ? (
                <>
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{exam.program}</p>
                  {exam.year && <p className="text-[13px] font-semibold text-slate-800 leading-tight">({exam.year})</p>}
                  <p className="text-xs text-slate-500 mt-1">{exam.department}</p>
                </>
              ) : (
                <p className="text-[13px] font-semibold text-slate-800 leading-tight">N/A<br/><span className="text-xs text-slate-500 font-normal">N/A</span></p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Examination Date</p>
              <p className="text-[13px] font-semibold text-slate-800">{exam.examDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
              <p className="text-[13px] font-semibold text-slate-800">{exam.reason}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nurse on Duty</p>
              <p className="text-[13px] font-semibold text-slate-800">{exam.nurseName}</p>
            </div>
          </div>
        </div>

        {/* Certificate Display (If Issued) */}
        {exam.certificateIssued && (
          <div className="bg-gradient-to-r from-[#f0f7f6] to-white border border-[#c8ddd8] rounded-xl p-5 mb-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#466460]"></div>
            <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide flex items-center gap-2 border-b border-[#c8ddd8] pb-2">
              <i className="fa-solid fa-file-medical"></i> Forwarded Medical Certificate
            </h4>

            <div className="flex flex-wrap gap-2 mb-4">
              {exam.isNormalFindings !== undefined && exam.isNormalFindings !== null && (
                <span className={`text-[11px] px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 ${exam.isNormalFindings ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  <i className={`fa-solid ${exam.isNormalFindings ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
                  {exam.isNormalFindings ? 'Normal Findings' : 'Abnormal Findings'}
                </span>
              )}
              {exam.isFit !== undefined && exam.isFit !== null && (
                <span className={`text-[11px] px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 ${exam.isFit ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                  <i className={`fa-solid ${exam.isFit ? 'fa-person-walking' : 'fa-bed'}`}></i>
                  {exam.isFit ? 'Physically Fit' : 'Not Fit'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exam.finding1 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Diagnosis / Findings</p>
                  <div className="text-xs text-slate-700 bg-white rounded-lg p-3 leading-relaxed border border-slate-200 shadow-sm min-h-[60px]">
                    {exam.finding1}
                  </div>
                </div>
              )}
              {exam.remarks && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Remarks / Recommendation</p>
                  <div className="text-xs text-slate-700 bg-white rounded-lg p-3 leading-relaxed border border-slate-200 shadow-sm min-h-[60px]">
                    {exam.remarks}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medical Examination Summary */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-[#466460] mb-4 uppercase tracking-wide border-b border-slate-200 pb-2">
            <i className="fa-solid fa-clipboard-list mr-2"></i>Medical Examination Summary
          </h4>

          {/* Vital Signs */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vital Signs</p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'BP',     value: exam.vitals?.bp              || '—', unit: 'mmHg' },
                { label: 'PR',     value: exam.vitals?.pr              || '—', unit: 'bpm'  },
                { label: 'RR',     value: exam.vitals?.rr              || '—', unit: 'cpm'  },
                { label: 'Temp',   value: exam.vitals?.temp            || '—', unit: '°C'   },
                { label: 'Weight', value: exam.anthropometrics?.weight || '—', unit: 'kg'   },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-sm font-black text-slate-800">{item.value}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">{item.unit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Anthropometrics */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Anthropometrics</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Height', value: exam.anthropometrics?.height || '—', unit: 'cm' },
                { label: 'Weight', value: exam.anthropometrics?.weight || '—', unit: 'kg' },
                { label: 'BMI',    value: exam.anthropometrics?.bmi    || '—', unit: ''   },
                { label: 'Waist',  value: exam.anthropometrics?.waist  || '—', unit: 'cm' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-[13px] font-semibold text-slate-800">{item.value} {item.unit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Medical History */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Past Medical History</p>
            <div className="flex flex-wrap gap-1.5">
              {(exam.medicalHistory.length > 0 ? exam.medicalHistory : ['None recorded']).map((h, idx) => (
                <span key={idx} className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-amber-100">{h}</span>
              ))}
            </div>
          </div>

          {/* Surgical History */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Surgical History</p>
            <div className="flex flex-wrap gap-1.5">
              {(exam.surgicalHistory.length > 0 ? exam.surgicalHistory : ['None recorded']).map((h, idx) => (
                <span key={idx} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-100">{h}</span>
              ))}
            </div>
          </div>

          {/* Family History */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Family History</p>
            <div className="flex flex-wrap gap-1.5">
              {(exam.familyHistory.length > 0 ? exam.familyHistory : ['None recorded']).map((h, idx) => (
                <span key={idx} className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-purple-100">{h}</span>
              ))}
            </div>
          </div>

          {/* Laboratory Results */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Laboratory Results</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Test</th>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Results</th>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Facility</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 border-b text-slate-600 font-medium">CBC</td>
                    <td className="p-2.5 border-b font-semibold text-slate-800">{exam.labResults?.cbc  || '—'}</td>
                    <td className="p-2.5 border-b text-slate-500">{exam.labResults?.cbcFacility  || '—'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-b text-slate-600 font-medium">Urinalysis</td>
                    <td className="p-2.5 border-b font-semibold text-slate-800">{exam.labResults?.ua   || '—'}</td>
                    <td className="p-2.5 border-b text-slate-500">{exam.labResults?.uaFacility   || '—'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-600 font-medium">Chest X-Ray</td>
                    <td className="p-2.5 font-semibold text-slate-800">{exam.labResults?.xray || '—'}</td>
                    <td className="p-2.5 text-slate-500">{exam.labResults?.xrayFacility || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Personal/Social History */}
          <div className="mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Personal/Social History</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Smoking',       value: exam.social?.smoking || 'No' },
                { label: 'Alcohol',       value: exam.social?.alcohol || 'No' },
                { label: 'Illicit Drugs', value: exam.social?.drugs   || 'No' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">{item.label}:</span>
                  <span className={`text-[11px] font-bold ${item.value.toLowerCase().includes('yes') ? 'text-red-600' : 'text-green-600'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Medical Records History Section --- */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-[#466460] mb-4 uppercase tracking-wide border-b border-slate-200 pb-2">
            <i className="fa-solid fa-clock-rotate-left mr-2"></i>Past Medical Records
          </h4>

          {loadingHistory ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading history...
            </div>
          ) : consultationHistory.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-400">No previous medical records found for this patient.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Date & Time</th>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Purpose</th>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Doctor/Nurse</th>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consultationHistory.map((consult, idx) => {
                    const rawDate = consult.exam_date || consult.created_at;
                    const dateObj = rawDate ? new Date(rawDate) : new Date();

                    const formattedDate = dateObj.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

                    const formattedTime = rawDate === consult.created_at
                      ? dateObj.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                      : '—';

                    const practitioner = consult.physician || consult.nurse_on_duty || 'N/A';

                    return (
                      <tr key={consult.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 border-b">
                          <span className="font-bold text-slate-700 block">{formattedDate}</span>
                          <span className="text-[10px] text-slate-400">{formattedTime}</span>
                        </td>
                        <td className="p-2.5 border-b font-semibold text-slate-700">Medical Examination</td>
                        <td className="p-2.5 border-b text-slate-600 font-medium">{practitioner}</td>
                        <td className="p-2.5 border-b">
                          <StatusBadge status={consult.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-140px)] bg-[#f8fafc]">
      {/* Left Column - Examination List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white shadow-sm z-10">

        {/* TABS HEADER */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex gap-6 mb-4 border-b border-slate-100">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 relative ${
                activeTab === 'pending' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Pending
              {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 relative ${
                activeTab === 'approved' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Approved
              {activeTab === 'approved' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
            </button>
          </div>

          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">
              {activeTab === 'pending' ? 'Pending Approvals' : 'Approved Records'}
            </h3>
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

          {/* DYNAMIC FILTER ROW */}
          <div className="flex flex-col mt-3 border-t border-slate-100 pt-3">
            <div className="flex w-full gap-1.5">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate"
              >
                {uniqueRoles.map(r => (
                  <option key={r} value={r}>{r === 'All' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <select
                value={filterDept}
                onChange={e => { setFilterDept(e.target.value); setFilterProgram('All'); }}
                className="flex-[1.5] min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate"
              >
                {uniqueDepts.map(d => (
                  <option key={d} value={d}>{d === 'All' ? 'All Depts' : d}</option>
                ))}
              </select>
              <select
                value={filterProgram}
                onChange={e => setFilterProgram(e.target.value)}
                className="flex-[1.5] min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate"
              >
                {uniquePrograms.map(p => (
                  <option key={p} value={p}>{p === 'All' ? 'All Programs' : p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {loading ? (
            <div className="text-center text-slate-400 text-sm py-12 flex flex-col items-center">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#466460] mb-3"></i>
              Loading records...
            </div>
          ) : filteredExaminations.length > 0 ? (
            filteredExaminations.map(renderExamItem)
          ) : (
            <div className="text-center text-slate-400 text-sm py-12">
              <i className="fa-regular fa-folder-open text-3xl mb-2 opacity-50 block"></i>
              No {activeTab} examinations
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Examination Detail */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">Examination Details</h3>
            {selectedExam && (
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="bg-slate-100 text-slate-600 border-none px-4 py-2 rounded-lg font-semibold text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-pen-to-square"></i> Edit
                </button>

                {/* Pending Tab: Approve Record */}
                {activeTab === 'pending' && selectedExam.status !== 'approved' && (
                  <button
                    onClick={() => setShowApproveModal(true)}
                    disabled={loading}
                    className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white border-none px-5 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
                    Approve Record
                  </button>
                )}

                {/* Approved Tab: Issue Certificate OR View Certificate */}
                {activeTab === 'approved' && !selectedExam.certificateIssued && (
                  <button
                    onClick={() => setShowCertForm(true)}
                    className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <i className="fa-solid fa-file-medical"></i> Issue Certificate
                  </button>
                )}

                {activeTab === 'approved' && selectedExam.certificateIssued && (
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1.5 rounded-md font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-paper-plane"></i> Cert Forwarded
                    </span>
                    <button
                      onClick={() => setShowCertForm(true)}
                      className="bg-white border border-[#466460] text-[#466460] px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#e0eceb] transition flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-eye"></i> View/Edit Cert
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {renderExamDetail(selectedExam)}
        </div>
      </div>

      {/* --- APPROVAL OPTIONS MODAL --- */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-clipboard-check"></i> Approve Examination
              </h3>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                You are about to approve the medical examination for <span className="font-bold text-slate-800">{selectedExam?.patientName}</span>.
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 flex gap-3 items-start">
                <i className="fa-solid fa-circle-question text-emerald-600 mt-0.5"></i>
                <p className="text-[13px] text-emerald-800 font-medium leading-relaxed">
                  Would you like to issue a Medical Certificate for this patient before finalizing the approval?
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  handleApprove(selectedExam);
                }}
                className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#466460] rounded-lg transition shadow-sm"
              >
                No, Approve Only
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setShowCertForm(true);
                }}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white hover:opacity-90 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                <i className="fa-solid fa-file-medical"></i> Yes, Issue Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MEDICAL CERTIFICATE MODAL --- */}
      {showCertForm && selectedExam && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity p-4 md:p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-file-medical"></i> {activeTab === 'approved' && selectedExam.certificateIssued ? 'Edit/View Medical Certificate' : 'Issue Medical Certificate'}
              </h3>
              <button onClick={() => setShowCertForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-200">
                <i className="fa-solid fa-xmark text-lg px-1"></i>
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-6 bg-[#f8fafc] flex-1">
              <MedicalCertificate
                examination={selectedExam}
                onSubmit={handleSubmitCertificate}
                onEdit={handleEdit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Approvals;