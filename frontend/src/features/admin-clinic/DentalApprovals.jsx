// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\DentalApprovals.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { DentalExaminationReport } from '../../components/DentalExaminationReport';

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

export const DentalApprovals = () => {
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

  // States for Dental Report Toggle
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  // Show snackbar helper
  const showMessage = (msg, type = 'success') => {
    setSnackbar({ message: msg, type, visible: true });
    setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  // Fetch dental records based on activeTab
  useEffect(() => {
    const fetchExaminations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dental_records')
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

          // A report is forwarded if there's dental history or intraoral data
          const dentalHistory = typeof record.dental_history === 'string'
            ? JSON.parse(record.dental_history || '{}')
            : record.dental_history || {};
          const intraoral = typeof record.intraoral === 'string'
            ? JSON.parse(record.intraoral || '{}')
            : record.intraoral || {};

          const hasDentalData = Object.values(dentalHistory).some(v => v === 'Yes') ||
                                Object.values(intraoral).some(v => v && v !== '' && v !== 'false');

          const reportForwarded = hasDentalData && record.status === 'approved';

          return {
            id: record.id,
            recordId: record.id,
            userId: record.user_id,
            patientName,
            patientId,
            type: record.role || userData.role || 'student',
            courseYear: record.course_year || userData.course_year || userData.program || '',
            department: userData.department || record.department || '',
            program: userData.program || record.program || '',
            yearLevel: userData.year_level || record.year_level || '',
            section: userData.section || record.section || '',
            examDate: record.exam_date || record.created_at || '',
            status: record.status,
            createdAt: record.created_at,
            // Dental specific data
            dentalHistory: dentalHistory,
            intraoral: intraoral,
            toothData: record.tooth_data ? (typeof record.tooth_data === 'string' ? JSON.parse(record.tooth_data) : record.tooth_data) : {},
            examinedBy: record.examined_by,
            sigDate: record.sig_date,
            patientSignature: record.patient_signature,
            reportForwarded: reportForwarded,
            // Demographics
            age: record.age || userData.age || '',
            sex: record.sex || userData.sex || '',
            address: record.address || userData.address || '',
            cellphone: record.cellphone || userData.cellphone || '',
            prevDentist: record.prev_dentist || '',
            lastVisit: record.last_visit || '',
          };
        });

        setExaminations(fetchedExams);
      } catch (err) {
        console.error('Error fetching dental examinations:', err);
        showMessage('Failed to load dental records', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchExaminations();
  }, [activeTab]);

  // Filter examinations
  const filteredExaminations = examinations.filter(exam => {
    const matchesSearch = !searchTerm ||
      exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'All' || exam.type.toLowerCase().includes(filterRole.toLowerCase());

    return matchesSearch && matchesRole;
  });

  // Handle approve (mark as done/forward report)
  const handleApprove = async () => {
    if (!selectedExam) return;

    try {
      const { error } = await supabase
        .from('dental_records')
        .update({
          status: 'approved',
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedExam.recordId || selectedExam.id);

      if (error) throw error;

      showMessage('Dental examination approved successfully!');
      setActiveTab('approved');
      setSelectedExam(null);
      setShowApproveModal(false);
    } catch (err) {
      console.error('Error approving dental examination:', err);
      showMessage('Failed to approve dental examination', 'error');
    }
  };

  // Handle save dental report
  const handleSaveReport = async (data) => {
    if (!selectedExam) return;

    try {
      const { error } = await supabase
        .from('dental_records')
        .update({
          dental_history: JSON.stringify(data.dentalHistory),
          intraoral: JSON.stringify(data.intraoral),
          tooth_data: JSON.stringify(data.toothData),
          status: 'approved',
          is_approved: true,
          approved_at: new Date().toISOString(),
          patient_signature: data.patientSignature || null,
          sig_date: data.sigDate || null,
          examined_by: data.examinedBy || null,
          exam_date: data.examDate || null,
        })
        .eq('id', selectedExam.recordId || selectedExam.id);

      if (error) throw error;

      // Update local state
      const updatedExam = {
        ...selectedExam,
        dentalHistory: data.dentalHistory,
        intraoral: data.intraoral,
        toothData: data.toothData,
        patientSignature: data.patientSignature,
        sigDate: data.sigDate,
        examinedBy: data.examinedBy,
        examDate: data.examDate,
        status: 'approved',
        is_approved: true,
        approved_at: new Date().toISOString(),
        reportForwarded: true,
      };

      setExaminations(examinations.map(e => e.id === selectedExam.id ? updatedExam : e));
      setSelectedExam(updatedExam);
      setShowReportForm(false);
      showMessage('Dental report saved and forwarded successfully!');
    } catch (err) {
      console.error('Error saving dental report:', err);
      showMessage('Failed to save dental report', 'error');
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedExam) return;

    if (!window.confirm('Are you sure you want to reject this dental examination?')) return;

    try {
      const { error } = await supabase
        .from('dental_records')
        .update({
          status: 'rejected',
          is_approved: false,
        })
        .eq('id', selectedExam.recordId || selectedExam.id);

      if (error) throw error;

      showMessage('Dental examination rejected');
      setExaminations(examinations.filter(e => e.id !== selectedExam.id));
      setSelectedExam(null);
    } catch (err) {
      console.error('Error rejecting dental examination:', err);
      showMessage('Failed to reject dental examination', 'error');
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col bg-slate-50 font-['DM_Sans',sans-serif]">
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <h2 className="text-lg font-bold text-[#466460]">
          <i className="fa-solid fa-tooth mr-2"></i>Dental Examinations
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Review and manage dental examination records</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={() => { setActiveTab('pending'); setSelectedExam(null); }}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'pending'
              ? 'text-[#466460] border-[#466460]'
              : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
        >
          Pending Review
          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {examinations.filter(e => e.status === 'pending').length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('approved'); setSelectedExam(null); }}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'approved'
              ? 'text-[#466460] border-[#466460]'
              : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
        >
          Approved / Completed
          <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
            {examinations.filter(e => e.status === 'approved').length}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-white border-b border-slate-200 shrink-0">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460] transition-colors"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - List */}
        <div className={`${selectedExam ? 'hidden md:block' : 'block'} w-full md:w-1/2 lg:w-5/12 border-r border-slate-200 overflow-y-auto bg-white`}>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : filteredExaminations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <i className="fa-solid fa-tooth text-4xl mb-3 text-slate-200"></i>
              <p className="text-sm">No {activeTab} dental examinations found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredExaminations.map((exam, idx) => (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedExam?.id === exam.id ? 'bg-[#f0f7f6] border-l-4 border-[#466460]' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm text-slate-800 truncate pr-2">{exam.patientName}</h4>
                    <StatusBadge status={exam.status} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{exam.patientId} • {exam.courseYear}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-slate-400">{exam.examDate || exam.createdAt}</p>
                    {exam.reportForwarded && (
                      <span className="text-[9px] font-bold text-[#466460] bg-[#e0eceb] px-1.5 py-0.5 rounded-sm">REPORT SENT</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Detail */}
        {selectedExam && (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-[#f0f7f6] to-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[#466460] text-lg">{selectedExam.patientName}</h3>
                    <p className="text-sm text-slate-500">{selectedExam.patientId}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedExam.courseYear} • {selectedExam.sex} • {selectedExam.age} years old
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedExam(null)}
                    className="md:hidden text-slate-400 hover:text-slate-600"
                  >
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>

              {/* Dental History Display */}
              <div className="p-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-[#466460] mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-file-medical-alt"></i> Dental History
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(selectedExam.dentalHistory || {}).map(([key, val]) => (
                    <div key={key} className={`text-xs px-2 py-1.5 rounded ${val === 'Yes' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'}`}>
                      {key}: <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intraoral Display */}
              <div className="p-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-[#466460] mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-teeth"></i> Intraoral Examination
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedExam.intraoral || {}).filter(([k, v]) => v && k !== 'tmjExam').map(([key, val]) => (
                    <div key={key} className="text-xs">
                      <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                      <span className="font-medium text-slate-700">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tooth Data */}
              {selectedExam.toothData && Object.keys(selectedExam.toothData).length > 0 && (
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-[#466460] mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-teeth-open"></i> Tooth Conditions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedExam.toothData).map(([tooth, data]) => (
                      <div key={tooth} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                        Tooth {tooth}: {data.condition} {data.operation ? `(${data.operation})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature */}
              {selectedExam.patientSignature && (
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs text-slate-400">Patient Signature</p>
                  <p className="text-sm font-script text-slate-600 italic">{selectedExam.patientSignature}</p>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2">
                {activeTab === 'pending' && (
                  <>
                    <button
                      onClick={handleApprove}
                      className="bg-gradient-to-r from-[#466460] to-[#3a524f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-check"></i> Approve & Forward Report
                    </button>
                    <button
                      onClick={() => setShowReportForm(true)}
                      className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-file-pdf"></i> View/Edit Report
                    </button>
                    <button
                      onClick={handleReject}
                      className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-xs hover:bg-red-100 transition"
                    >
                      <i className="fa-solid fa-xmark mr-1"></i> Reject
                    </button>
                  </>
                )}

                {activeTab === 'approved' && !selectedExam.reportForwarded && (
                  <button
                    onClick={() => setShowReportForm(true)}
                    className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <i className="fa-solid fa-file-pdf"></i> Generate Dental Report
                  </button>
                )}

                {activeTab === 'approved' && selectedExam.reportForwarded && (
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1.5 rounded-md font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-paper-plane"></i> Report Forwarded
                    </span>
                    <button
                      onClick={() => setShowReportForm(true)}
                      className="text-[#466460] hover:underline text-xs font-semibold"
                    >
                      View/Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DENTAL REPORT MODAL */}
      {showReportForm && selectedExam && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity p-4 md:p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-[#f0f7f6] to-white">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-tooth"></i> Dental Examination Report
              </h3>
              <button onClick={() => setShowReportForm(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-6 bg-[#f8fafc] flex-1">
              <DentalExaminationReport
                examination={selectedExam}
                onSubmit={handleSaveReport}
              />
            </div>
          </div>
        </div>
      )}

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default DentalApprovals;