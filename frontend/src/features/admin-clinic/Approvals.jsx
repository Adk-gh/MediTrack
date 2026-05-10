// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Approvals.jsx
import React, { useState, useEffect } from 'react';
import { collectionGroup, getDocs, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
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
    rejected: 'bg-red-100 text-red-700'
  }[status?.toLowerCase()] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusClass}`}>
      {status || 'unknown'}
    </span>
  );
};

export const Approvals = () => {
  const [examinations, setExaminations] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ message: '', type: 'success', visible: false });
  const [loading, setLoading] = useState(true);

  // Fetch pending records from ALL users' subcollections
  useEffect(() => {
    const fetchPendingExaminations = async () => {
      setLoading(true);
      try {
        const q = query(collectionGroup(db, 'medical_records'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);

        const fetchedExams = snapshot.docs.map(doc => {
          const data = doc.data();

          // yearSection: Medical.jsx saves as `yearSection` (e.g. "3rd Year - E")
          // older records may have saved it as `yearLevel` only
          const yearSection =
            data.yearSection ||
            [data.yearLevel || data.year || '', data.section || ''].filter(Boolean).join(' - ') ||
            '';

          return {
            id: doc.id,
            docRef: doc.ref,
            patientName: `${data.lastName || ''}, ${data.firstName || ''}`,
            patientId:   data.studentId || data.universityId || 'N/A',
            type:        data.role      || 'student',

            // ── Fields read by MedicalCertificate ──────────────────────────
            // Keep the SAME key names that Medical.jsx / MedicalCertificate expect
            course:      data.course    || data.program || 'N/A',   // cert reads: examination.course
            yearSection,                                             // cert reads: examination.yearSection
            address:     data.address   || data.homeAddress || '',   // cert reads: examination.address  ← THE FIX
            age:         data.age       || '',                       // cert reads: examination.age
            sex:         data.sex       || data.gender || '',        // cert reads: examination.sex
            examDate:    data.examDate  || (data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : ''),

            // ── UI-only fields ─────────────────────────────────────────────
            program:     data.course    || data.program || 'N/A',   // used in list/detail UI
            year:        yearSection,                                // used in list/detail UI
            department:  data.department || 'N/A',
            nurseName:   data.nurseOnDuty || 'Unknown',
            status:      data.status    || 'pending',
            reason:      'Medical Examination',

            vitals:          data.vitalRecords?.[0] || {},
            anthropometrics: { height: data.height, weight: data.weight, bmi: data.bmi, waist: data.waist },
            medicalHistory:  data.checkedMedical || [],
            surgicalHistory: data.surgicalHistory?.map(s => `${s.operation} (${s.date})`) || [],
            familyHistory:   data.checkedFamily  || [],
            vaccine: {
              dose1:       data.vax1,       dose1Date:    data.vax1Date,
              dose2:       data.vax2,       dose2Date:    data.vax2Date,
              booster:     data.booster1,   boosterDate:  data.booster1Date,
            },
            labResults: {
              cbc:         data.labCbc,     cbcFacility:  data.labCbcFacility,
              ua:          data.labUa,      uaFacility:   data.labUaFacility,
              xray:        data.labXray,    xrayFacility: data.labXrayFacility,
            },
            social: { smoking: data.smoking, alcohol: data.alcohol, drugs: data.drugs },
          };
        });

        setExaminations(fetchedExams);
      } catch (error) {
        console.error("Error fetching approvals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingExaminations();
  }, []);

  // Filter examinations based on search
  const filteredExaminations = examinations.filter(exam =>
    exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type, visible: true });
    setTimeout(() => setSnackbar(prev => ({ ...prev, visible: false })), 3500);
  };

  const handleSelectExam = (exam) => setSelectedExam(exam);

  const handleApprove = async (exam) => {
    setLoading(true);
    try {
      await updateDoc(exam.docRef, {
        status: 'approved',
        isApproved: true,
        approvedAt: serverTimestamp()
      });
      setExaminations(examinations.filter(e => e.id !== exam.id));
      setSelectedExam(null);
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
      await updateDoc(selectedExam.docRef, {
        status:           'approved',
        isApproved:       true,
        finding1:         data.finding1         ?? '',
        remarks:          data.remarks          ?? '',
        isFit:            data.isFit            ?? true,
        isNormalFindings: data.isNormalFindings  ?? true,
        approvedAt:       serverTimestamp(),
      });
      setExaminations(examinations.filter(e => e.id !== selectedExam.id));
      setSelectedExam(null);
      showSnackbar(`Examination for ${data.patientName} submitted successfully!`, 'success');
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
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-[#466460] mb-4 uppercase tracking-wide border-b border-slate-200 pb-2">
            <i className="fa-solid fa-clipboard-list mr-2"></i>Medical Examination Summary
          </h4>

          {/* Vital Signs */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Vital Signs</p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'BP',     value: exam.vitals?.bp              || '—', unit: 'mmHg' },
                { label: 'PR',     value: exam.vitals?.pr              || '—', unit: 'bpm'  },
                { label: 'RR',     value: exam.vitals?.rr              || '—', unit: 'cpm'  },
                { label: 'Temp',   value: exam.vitals?.temp            || '—', unit: '°C'   },
                { label: 'Weight', value: exam.anthropometrics?.weight || '—', unit: 'kg'   },
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
                { label: 'Height', value: exam.anthropometrics?.height || '—', unit: 'cm' },
                { label: 'Weight', value: exam.anthropometrics?.weight || '—', unit: 'kg' },
                { label: 'BMI',    value: exam.anthropometrics?.bmi    || '—', unit: ''   },
                { label: 'Waist',  value: exam.anthropometrics?.waist  || '—', unit: 'cm' },
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
              {(exam.medicalHistory.length > 0 ? exam.medicalHistory : ['None recorded']).map((h, idx) => (
                <span key={idx} className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-[10px] font-semibold border border-amber-100">{h}</span>
              ))}
            </div>
          </div>

          {/* Surgical History */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Surgical History</p>
            <div className="flex flex-wrap gap-1">
              {(exam.surgicalHistory.length > 0 ? exam.surgicalHistory : ['None recorded']).map((h, idx) => (
                <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-[10px] font-semibold border border-blue-100">{h}</span>
              ))}
            </div>
          </div>

          {/* Family History */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#466460] uppercase mb-2">Family History</p>
            <div className="flex flex-wrap gap-1">
              {(exam.familyHistory.length > 0 ? exam.familyHistory : ['None recorded']).map((h, idx) => (
                <span key={idx} className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-[10px] font-semibold border border-purple-100">{h}</span>
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
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b">CBC</td>
                    <td className="p-2 border-b font-semibold">{exam.labResults?.cbc  || '—'}</td>
                    <td className="p-2 border-b">{exam.labResults?.cbcFacility  || '—'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b">Urinalysis</td>
                    <td className="p-2 border-b font-semibold">{exam.labResults?.ua   || '—'}</td>
                    <td className="p-2 border-b">{exam.labResults?.uaFacility   || '—'}</td>
                  </tr>
                  <tr>
                    <td className="p-2">Chest X-Ray</td>
                    <td className="p-2 font-semibold">{exam.labResults?.xray || '—'}</td>
                    <td className="p-2">{exam.labResults?.xrayFacility || '—'}</td>
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
                { label: 'Smoking',       value: exam.social?.smoking || 'No' },
                { label: 'Alcohol',       value: exam.social?.alcohol || 'No' },
                { label: 'Illicit Drugs', value: exam.social?.drugs   || 'No' },
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
    <div className="flex h-full min-h-[calc(100vh-140px)] bg-[#f8fafc]">
      {/* Left Column - Examination List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white shadow-sm z-10">
        <div className="p-4 border-b border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">Pending Approvals</h3>
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#466460] focus:bg-white transition"
            />
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
              No pending examinations
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
                <button
                  onClick={() => handleApprove(selectedExam)}
                  disabled={loading || selectedExam?.status === 'approved'}
                  className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white border-none px-5 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
                  Approve Record
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
      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Approvals;