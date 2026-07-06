// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Approvals.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { MedicalCertificate } from '../../components/MedicalCertificate';
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

export const Approvals = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'
  const [examType, setExamType] = useState('medical'); // 'medical' or 'dental'
  const [examinations, setExaminations] = useState([]);
  const [dentalExaminations, setDentalExaminations] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  // Get current user role for filtering
  const [currentUser, setCurrentUser] = useState(null);

  // Helper function to determine role from user data
  const getUserRoleFromData = (userData) => {
    const role = userData?.role?.toLowerCase() || '';
    const classification = userData?.classification?.toLowerCase() || '';
    const jobTitle = (userData?.job_title || '').toLowerCase();

    if (classification === 'dentist' || jobTitle.includes('dentist')) return 'dentist';
    if (classification === 'doctor' || jobTitle.includes('doctor')) return 'doctor';
    if (classification === 'nurse' || jobTitle.includes('nurse')) return 'nurse';
    if (classification === 'admin' || classification === 'administrator' || role === 'admin') return 'admin';
    return role || 'staff';
  };

  // Check if user is dentist or doctor
  const userRole = getUserRoleFromData(currentUser);
  const isDentist = userRole === 'dentist';
  const isDoctor = userRole === 'doctor' || userRole === 'nurse';
  const isAdmin = userRole === 'admin';

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
  const [showReportForm, setShowReportForm] = useState(false);

  // Fetch current user info and set default exam type
  useEffect(() => {
    const fetchCurrentUser = async () => {
      // First try to get from localStorage
      const rawUser = localStorage.getItem('user');
      let userData = null;

      if (rawUser) {
        userData = JSON.parse(rawUser);
      }

      // If not in localStorage, try Supabase
      if (!userData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('users').select('*').eq('uid', user.id).single();
          userData = data;
        }
      }

      if (userData) {
        setCurrentUser(userData);

        // Determine role and set default exam type
        const role = getUserRoleFromData(userData);

        if (role === 'dentist') {
          setExamType('dental');
        } else if (role === 'doctor' || role === 'nurse') {
          setExamType('medical');
        }
        // For admin and others, default is medical (can see both tabs)
      }
    };
    fetchCurrentUser();
  }, []);

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

          // Get first, middle, last name
          const fName = record.first_name || userData.first_name || '';
          const mName = record.middle_name || userData.middle_name || '';
          const lName = record.last_name || userData.last_name || '';
          // Format as "FirstName MiddleName LastName"
          const patientName = [fName, mName, lName].filter(Boolean).join(' ') || 'Unknown Patient';

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
            firstName: fName,
            middleName: mName,
            lastName: lName,
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

    const fetchDentalExaminations = async () => {
      try {
        const { data, error } = await supabase
          .from('dental_records')
          .select('*, users(*)')
          .ilike('status', activeTab)
          .order('created_at', { ascending: false });

        console.log('[Approvals] Dental records fetched:', data?.length);
        if (data && data[0]) {
          console.log('[Approvals] First record tooth_data raw:', data[0].tooth_data);
        }

        if (error) throw error;

        const fetchedExams = (data || []).map(record => {
          let userData = record.users || {};
          if (Array.isArray(userData)) userData = userData[0] || {};

          // Get first, middle, last name
          const fName = record.first_name || userData.first_name || record.dFirstName || '';
          const mName = record.middle_name || userData.middle_name || record.dMiddleName || '';
          const lName = record.last_name || userData.last_name || record.dLastName || '';
          // Format as "FirstName MiddleName LastName"
          const patientName = [fName, mName, lName].filter(Boolean).join(' ') || 'Unknown Patient';

          const patientId = record.student_id || record.university_id || userData.university_id || record.universityId || 'N/A';

          const dentalHistory = typeof record.dental_history === 'string'
            ? JSON.parse(record.dental_history || '{}')
            : record.dental_history || {};
          const intraoral = typeof record.intraoral === 'string'
            ? JSON.parse(record.intraoral || '{}')
            : record.intraoral || {};

          // Parse tooth_data
          let toothDataRaw = record.tooth_data;
          console.log('[Approvals] tooth_data raw type:', typeof toothDataRaw, 'value:', toothDataRaw);
          const toothData = typeof toothDataRaw === 'string'
            ? JSON.parse(toothDataRaw || '{}')
            : (toothDataRaw || {});

          const hasDentalData = Object.values(dentalHistory).some(v => v === 'Yes') ||
                                Object.values(intraoral).some(v => v && v !== '' && v !== 'false');

          const reportForwarded = hasDentalData && record.status === 'approved';

          return {
            id: record.id,
            recordId: record.id,
            userId: record.user_id,
            patientName,
            patientId,
            firstName: fName,
            middleName: mName,
            lastName: lName,
            type: record.role || userData.role || 'student',
            courseYear: record.course_year || userData.course_year || userData.program || '',
            department: userData.department || record.department || '',
            program: userData.program || record.program || '',
            yearLevel: userData.year_level || record.year_level || '',
            section: userData.section || record.section || '',
            examDate: record.exam_date || record.created_at || '',
            status: record.status,
            createdAt: record.created_at,
            dentalHistory,
            intraoral,
            toothData: toothData,
            treatment_remarks: record.treatment_remarks ? (typeof record.treatment_remarks === 'string' ? JSON.parse(record.treatment_remarks) : record.treatment_remarks) : {},
            treatments: record.treatments ? (typeof record.treatments === 'string' ? JSON.parse(record.treatments) : record.treatments) : mapDentalProcedures(record.dental_history || {}),
            examinedBy: record.examined_by,
            sigDate: record.sig_date,
            patientSignature: record.patient_signature,
            reportForwarded,
            age: record.age || userData.age || '',
            sex: record.sex || userData.sex || '',
            address: record.address || userData.address || '',
            lastVisit: record.last_visit,
            prevDentist: record.prev_dentist,
            university_id: record.university_id,
          };
        });

        setDentalExaminations(fetchedExams);
      } catch (err) {
        console.error('Error fetching dental examinations:', err);
      }
    };

    fetchExaminations();
    fetchDentalExaminations();

    // Clear selections and filters when switching tabs
    setSelectedExam(null);
    setShowCertForm(false);
    setShowReportForm(false);
    setSearchTerm('');
    setFilterRole('All');
    setFilterDept('All');
    setFilterProgram('All');
  }, [activeTab, examType]);

  // Fetch Past Medical/Dental Records when a patient is selected
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      if (!selectedExam) {
        setConsultationHistory([]);
        return;
      }

      setLoadingHistory(true);
      try {
        // Use captured examType to avoid stale closure
        const currentExamType = examType;
        const userId = selectedExam.userId;

        let data;
        if (currentExamType === 'dental') {
          // Fetch dental records history for dental exams
          const { data: dentalData, error } = await supabase
            .from('dental_records')
            .select('*')
            .eq('user_id', userId)
            .neq('id', selectedExam.recordId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          data = dentalData;
        } else {
          // Fetch medical records history for medical exams
          const { data: medicalData, error } = await supabase
            .from('medical_records')
            .select('*')
            .eq('user_id', userId)
            .neq('id', selectedExam.recordId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          data = medicalData;
        }

        if (isMounted) {
          setConsultationHistory(data || []);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedExam, examType]);

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

  // Helper to format date cleanly (Year Month Day)
  const formatDateClean = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Helper to extract tooth conditions for restoration/extraction display
  const extractToothConditions = (toothData, conditions) => {
    if (!toothData || typeof toothData !== 'object') return '';
    const conditionLabels = {
      'caries': 'Caries',
      'filled': 'Filled',
      'improved': 'Improved',
      'extracted': 'Extraction Needed',
      'root-fragment': 'Root Fragment',
      'missing': 'Missing',
    };
    const filtered = Object.entries(toothData)
      .filter(([, data]) => data?.condition && conditions.includes(data.condition))
      .map(([num, data]) => `Tooth #${num}: ${conditionLabels[data.condition] || data.condition}${data.operation ? ' (' + data.operation + ')' : ''}`);
    return filtered.length > 0 ? filtered.join('\n') : 'None';
  };

  // Helper to map dental history JSON to treatments object
  const mapDentalProcedures = (dentalHistory) => {
    if (!dentalHistory || typeof dentalHistory !== 'object') return {};
    return {
      oralProphylaxis: dentalHistory['Oral Prophylaxis'] === 'Yes',
      gumTreatment: dentalHistory['Periodontal Therapy'] === 'Yes',
      orthodontic: dentalHistory['Orthodontic Therapy'] === 'Yes',
      prosthodontic: dentalHistory['Prosthodontic Therapy'] === 'Yes',
      endodontic: dentalHistory['Endodontic Treatment'] === 'Yes',
      tmj: dentalHistory['TMJ Treatment'] === 'Yes',
      xray: false,
      fluoride: dentalHistory['Fluoride Treatment'] === 'Yes' || dentalHistory['Fluoride'] === 'Yes',
      sealant: dentalHistory['Sealant'] === 'Yes',
    };
  };

  const handleSelectExam = (exam) => {
    // Map dental exam data for DentalExaminationReport
    if (examType === 'dental') {
      const mappedExam = {
        ...exam,
        // Use first, middle, last name for proper display
        patientName: exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName,
        age: exam.age,
        sex: exam.sex,
        address: exam.address || '',
        course: exam.course_year || '',
        yearSection: exam.course_year || '',
        year: exam.yearLevel || exam.year || '',
        gradeLevel: exam.yearLevel || exam.year || '',
        // Pass through exam date and examined by - use multiple fallbacks
        examDate: exam.examDate || exam.exam_date || exam.createdAt || '',
        exam_date: exam.exam_date || exam.examDate || exam.createdAt || '',
        examinedBy: exam.examinedBy || exam.examined_by || '',
        examined_by: exam.examined_by || exam.examinedBy || '',
        // Pass JSONB fields directly
        dentalHistory: exam.dental_history || {},
        toothData: exam.toothData || exam.tooth_data || {},
        intraoral: exam.intraoral || {},
        // Map to DentalExaminationReport expected fields
        parentName: '',
        // Check dental_history first for saved restoration/extraction, then fall back to tooth_data
        restoration: exam.dental_history?.needs_restoration || extractToothConditions(exam.tooth_data || {}, ['caries', 'filled', 'improved']),
        extraction: exam.dental_history?.for_extraction || extractToothConditions(exam.tooth_data || {}, ['extracted', 'root-fragment']),
        // Use stored treatments if available, otherwise map from dental_history
        treatments: exam.treatments && Object.keys(exam.treatments).length > 0
          ? exam.treatments
          : mapDentalProcedures(exam.dental_history || {}),
        treatmentDetails: {
          orthodontic: exam.dental_history?.['Orthodontic Therapy'] === 'Yes' ? 'Yes' : '',
          prosthodontic: exam.dental_history?.['Prosthodontic Therapy'] === 'Yes' ? 'Yes' : '',
          endodontic: exam.dental_history?.['Endodontic Treatment'] === 'Yes' ? 'Yes' : '',
        },
        treatmentRemarks: exam.treatment_remarks || {},
        familyDentist: exam.prev_dentist || '',
        lastVisit: exam.last_visit || '',
        teethUpper: exam.teeth_upper || '',
        teethLower: exam.teeth_lower || '',
      };
      setSelectedExam(mappedExam);
    } else {
      setSelectedExam(exam);
    }
    setShowCertForm(false);
    setShowReportForm(false);
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

  // Dental approve handler
  const handleDentalApprove = async (exam) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('dental_records').update({
        status: 'approved',
        is_approved: true,
        approved_at: new Date().toISOString()
      }).eq('id', exam.recordId || exam.id);

      if (error) throw error;

      if (activeTab === 'pending') {
        setDentalExaminations(dentalExaminations.filter(e => e.id !== exam.id));
        setSelectedExam(null);
      }

      showSnackbar(`Dental examination for ${exam.patientName} has been approved!`, 'success');
    } catch (error) {
      console.error('Error approving dental examination:', error);
      showSnackbar('Failed to approve dental examination', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save dental report handler
  const handleSaveDentalReport = async (data) => {
    if (!selectedExam) return;

    try {
      // Build dental history object with treatments included
      const updatedDentalHistory = { ...data.dentalHistory };

      // Update dental history based on treatments checkboxes
      if (data.treatments) {
        updatedDentalHistory['Oral Prophylaxis'] = data.treatments.oralProphylaxis ? 'Yes' : 'No';
        updatedDentalHistory['Periodontal Therapy'] = data.treatments.gumTreatment ? 'Yes' : 'No';
        updatedDentalHistory['Orthodontic Therapy'] = data.treatments.orthodontic ? 'Yes' : 'No';
        updatedDentalHistory['Prosthodontic Therapy'] = data.treatments.prosthodontic ? 'Yes' : 'No';
        updatedDentalHistory['Endodontic Treatment'] = data.treatments.endodontic ? 'Yes' : 'No';
        updatedDentalHistory['TMJ Treatment'] = data.treatments.tmj ? 'Yes' : 'No';
        updatedDentalHistory['Fluoride Treatment'] = data.treatments.fluoride ? 'Yes' : 'No';
        updatedDentalHistory['Sealant'] = data.treatments.sealant ? 'Yes' : 'No';
      }

      // Save restoration and extraction data to dental_history
      if (data.restoration) {
        updatedDentalHistory['needs_restoration'] = data.restoration;
      }
      if (data.extraction) {
        updatedDentalHistory['for_extraction'] = data.extraction;
      }

      const { error } = await supabase
        .from('dental_records')
        .update({
          dental_history: JSON.stringify(updatedDentalHistory),
          intraoral: JSON.stringify(data.intraoral),
          tooth_data: JSON.stringify(data.toothData),
          treatment_remarks: JSON.stringify(data.treatmentRemarks || {}),
          treatments: JSON.stringify(data.treatments || {}),
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

      setDentalExaminations(dentalExaminations.map(e => e.id === selectedExam.id ? updatedExam : e));
      setSelectedExam(updatedExam);
      setShowReportForm(false);
      showSnackbar('Dental report saved and forwarded successfully!', 'success');
    } catch (err) {
      console.error('Error saving dental report:', err);
      showSnackbar('Failed to save dental report', 'error');
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
        <p className="text-[13px] font-bold text-slate-800 truncate pr-2">
          {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName}
        </p>
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

  // Dental exam item renderer
  const renderDentalExamItem = (exam) => (
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
        <p className="text-[13px] font-bold text-slate-800 truncate pr-2">
          {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName}
        </p>
        <StatusBadge status={exam.status} />
      </div>
      <p className="text-[11px] text-slate-500 truncate mb-1">
        {exam.patientId} • {exam.courseYear}
      </p>
      <div className="flex justify-between items-center mt-1">
        <p className="text-[10px] text-slate-400">{exam.examDate}</p>
        {exam.reportForwarded && (
          <span className="text-[9px] font-bold text-[#466460] bg-[#e0eceb] px-1.5 py-0.5 rounded-sm">REPORT SENT</span>
        )}
      </div>
    </div>
  );

  // Dental exam detail renderer
  const renderDentalExamDetail = (exam) => {
    if (!exam) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <i className="fa-solid fa-tooth text-slate-200 text-5xl mb-3"></i>
          <p className="text-slate-400 text-sm">Select a dental examination from the list</p>
        </div>
      );
    }

    // Helper to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return '—';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Get dental history object - ensure it's an object even if stored as string
    const dentalHistory = (() => {
      const dh = exam.dentalHistory || exam.dental_history || {};
      if (typeof dh === 'string') {
        try { return JSON.parse(dh); } catch { return {}; }
      }
      return dh;
    })();
    const intraoral = (() => {
      const io = exam.intraoral || exam.intraoral || {};
      if (typeof io === 'string') {
        try { return JSON.parse(io); } catch { return {}; }
      }
      return io;
    })();
    const toothData = (() => {
      const td = exam.toothData || exam.tooth_data || {};
      if (typeof td === 'string') {
        try { return JSON.parse(td); } catch { return {}; }
      }
      return td;
    })();

    console.log('[Dental Exam Detail] toothData:', toothData);

    // Filter dental procedures that are "Yes"
    const proceduresDone = Object.entries(dentalHistory)
      .filter(([key, val]) => val === 'Yes' && !key.startsWith('d'))
      .map(([key]) => key);

    return (
      <div className="animate-in fade-in duration-300">
        {/* Patient Header */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#466460] uppercase tracking-wide">
                {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName || 'Unknown Patient'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {exam.patientId || exam.university_id || exam.universityId || exam.patientId || '—'} •
                {exam.courseYear || exam.course_year || exam.course || '—'}
              </p>
            </div>
            <StatusBadge status={exam.status} />
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Age</p>
              <p className="font-semibold text-slate-700">{exam.age || exam.dAge || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Sex</p>
              <p className="font-semibold text-slate-700">{exam.sex || exam.dSex || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Exam Date</p>
              <p className="font-semibold text-slate-700">{formatDate(exam.examDate || exam.exam_date)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Examined By</p>
              <p className="font-semibold text-slate-700">{exam.examinedBy || exam.examined_by || '—'}</p>
            </div>
          </div>
        </div>

        {/* Intraoral Examination */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide border-b border-slate-200 pb-2">
            <i className="fa-solid fa-teeth mr-2"></i>Intraoral Examination
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(intraoral).filter(([k, v]) => v && k !== 'tmjExam').map(([key, val]) => (
              <div key={key} className="text-xs">
                <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                <span className="font-medium text-slate-700">{String(val)}</span>
              </div>
            ))}
            {intraoral.tmjExam && (
              <div className="text-xs">
                <span className="text-slate-400">TMJ Exam: </span>
                <span className="font-medium text-slate-700">Yes</span>
              </div>
            )}
          </div>
        </div>

        {/* Tooth Chart */}
        {toothData && Object.keys(toothData).length > 0 && (
          <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide border-b border-slate-200 pb-2">
              <i className="fa-solid fa-teeth-open mr-2"></i>Tooth Conditions Chart
            </h4>

            {/* Summary counts */}
            <div className="flex gap-4 mb-4 text-xs">
              {(() => {
                const conditions = { caries: 0, filled: 0, extracted: 0, missing: 0, improved: 0 };
                Object.values(toothData).forEach(d => {
                  if (d.condition && conditions.hasOwnProperty(d.condition)) {
                    conditions[d.condition]++;
                  }
                });
                return (
                  <>
                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">Caries: {conditions.caries}</span>
                    <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200">Filled: {conditions.filled}</span>
                    <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded border border-pink-200">Extracted: {conditions.extracted}</span>
                  </>
                );
              })()}
            </div>

            {/* Individual teeth */}
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(toothData).map(([tooth, data]) => {
                const conditionColors = {
                  'caries': 'bg-red-100 text-red-700 border-red-300',
                  'filled': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                  'extracted': 'bg-pink-100 text-pink-700 border-pink-300',
                  'missing': 'bg-slate-100 text-slate-600 border-slate-300',
                  'improved': 'bg-blue-100 text-blue-700 border-blue-300',
                  'root-fragment': 'bg-amber-100 text-amber-700 border-amber-300',
                };
                return (
                  <div key={tooth} className={`text-xs px-2 py-2 rounded border ${conditionColors[data.condition] || 'bg-slate-50 text-slate-600'}`}>
                    <span className="font-bold">#{tooth}</span>
                    <span className="block">{data.condition || '—'}</span>
                    {data.operation && <span className="text-[10px] opacity-75">{data.operation}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No tooth data */}
        {(!toothData || Object.keys(toothData).length === 0) && (
          <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide border-b border-slate-200 pb-2">
              <i className="fa-solid fa-teeth-open mr-2"></i>Tooth Conditions
            </h4>
            <p className="text-xs text-slate-400 italic">No tooth conditions recorded</p>
          </div>
        )}

        {/* Patient Signature */}
        {(exam.patientSignature || exam.patient_signature) && (
          <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide border-b border-slate-200 pb-2">
              <i className="fa-solid fa-signature mr-2"></i>Patient Signature
            </h4>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">{exam.patientSignature || exam.patient_signature}</span>
              <span className="text-slate-400">{formatDate(exam.sigDate || exam.sig_date)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

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
              <h3 className="text-lg font-bold text-[#466460] uppercase tracking-wide">
                {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName}
              </h3>
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

        {/* --- Past Records History Section --- */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-[#466460] mb-4 uppercase tracking-wide border-b border-slate-200 pb-2">
            <i className="fa-solid fa-clock-rotate-left mr-2"></i>
            {examType === 'dental' ? 'Past Dental Records' : 'Past Medical Records'}
          </h4>

          {loadingHistory ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading history...
            </div>
          ) : consultationHistory.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-400">
                {examType === 'dental'
                  ? 'No previous dental records found for this patient.'
                  : 'No previous medical records found for this patient.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Date & Time</th>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">Purpose</th>
                    <th className="text-left p-2.5 border-b font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      {examType === 'dental' ? 'Dentist' : 'Doctor/Nurse'}
                    </th>
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

                    // For dental records, use examined_by; for medical, use physician/nurse_on_duty
                    const practitioner = examType === 'dental'
                      ? (consult.examined_by || 'N/A')
                      : (consult.physician || consult.nurse_on_duty || 'N/A');

                    // Purpose varies by exam type
                    const purpose = examType === 'dental'
                      ? (consult.dental_history?.['Oral Prophylaxis'] === 'Yes' ? 'Dental Procedures' : 'Dental Examination')
                      : 'Medical Examination';

                    return (
                      <tr key={consult.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 border-b">
                          <span className="font-bold text-slate-700 block">{formattedDate}</span>
                          <span className="text-[10px] text-slate-400">{formattedTime}</span>
                        </td>
                        <td className="p-2.5 border-b font-semibold text-slate-700">{purpose}</td>
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
          {/* Exam Type Tabs - Medical/Dental - Show based on role */}
          {/* Dentists see only Dental, Doctors/Nurses see only Medical, Admins see both */}
          <div className="flex mb-4 border-b border-slate-100">
            {/* Medical Tab - shown for Doctors/Nurses or Admins */}
            {(isDoctor || isAdmin) && (
              <button
                onClick={() => { setExamType('medical'); setSelectedExam(null); }}
                className={`mr-4 pb-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 relative ${
                  examType === 'medical' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <i className="fa-solid fa-stethoscope mr-1"></i>Medical
                {examType === 'medical' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
              </button>
            )}
            {/* Dental Tab - shown for Dentists or Admins */}
            {(isDentist || isAdmin) && (
              <button
                onClick={() => { setExamType('dental'); setSelectedExam(null); }}
                className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 relative ${
                  examType === 'dental' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <i className="fa-solid fa-tooth mr-1"></i>Dental
                {examType === 'dental' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
              </button>
            )}
          </div>

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
              {examType === 'dental' && ' - Dental'}
            </h3>
            <span className="text-[9px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">
              {examType === 'dental' ? dentalExaminations.filter(e => {
                const matchSearch = e.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || e.patientId.toLowerCase().includes(searchTerm.toLowerCase());
                return matchSearch;
              }).length : filteredExaminations.length}
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
          ) : examType === 'dental' ? (
            dentalExaminations.filter(e => {
              const matchSearch = e.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || e.patientId.toLowerCase().includes(searchTerm.toLowerCase());
              return matchSearch;
            }).length > 0 ? (
              dentalExaminations.filter(e => {
                const matchSearch = e.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || e.patientId.toLowerCase().includes(searchTerm.toLowerCase());
                return matchSearch;
              }).map(renderDentalExamItem)
            ) : (
              <div className="text-center text-slate-400 text-sm py-12">
                <i className="fa-solid fa-tooth text-3xl mb-2 opacity-50 block"></i>
                No {activeTab} dental examinations
              </div>
            )
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
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">
              {examType === 'dental' ? 'Dental Examination Details' : 'Examination Details'}
            </h3>
            {selectedExam && (
              <div className="flex gap-2">
                {/* Dental Actions */}
                {examType === 'dental' ? (
                  <>
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDentalApprove(selectedExam)}
                          disabled={loading}
                          className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white border-none px-5 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowReportForm(true)}
                          className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                        >
                          <i className="fa-solid fa-file-pdf"></i> View/Edit Report
                        </button>
                      </>
                    )}
                    {activeTab === 'approved' && !selectedExam.reportForwarded && (
                      <button
                        onClick={() => setShowReportForm(true)}
                        className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <i className="fa-solid fa-file-pdf"></i> Generate Report
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
                  </>
                ) : (
                /* Medical Actions */
                <>
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
                </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {examType === 'dental' ? renderDentalExamDetail(selectedExam) : renderExamDetail(selectedExam)}
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

      {/* --- DENTAL REPORT MODAL --- */}
      {showReportForm && selectedExam && examType === 'dental' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-[#f0f7f6] to-white">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-tooth"></i> Dental Examination Report
              </h3>
              <button onClick={() => setShowReportForm(false)} className="text-slate-400 hover:text-red-500 transition-colors rounded-full p-1 hover:bg-slate-200" title="Close">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-6 bg-[#f8fafc] flex-1">
              <DentalExaminationReport
                examination={selectedExam}
                onSubmit={handleSaveDentalReport}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MEDICAL CERTIFICATE MODAL --- */}
      {showCertForm && selectedExam && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-file-medical"></i> {activeTab === 'approved' && selectedExam.certificateIssued ? 'Edit/View Medical Certificate' : 'Issue Medical Certificate'}
              </h3>
              <button onClick={() => setShowCertForm(false)} className="text-slate-400 hover:text-red-500 transition-colors rounded-full p-1 hover:bg-slate-200" title="Close">
                <i className="fa-solid fa-xmark text-xl"></i>
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
        </div>,
        document.body
      )}

      {/* Snackbar */}
      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Approvals;