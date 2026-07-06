// C:\Users\HP\MediTrack\frontend\src\components\DentalExaminationReport.jsx
import React, { useState, useCallback, memo, useEffect } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '../supabase';

// ── Stable input components (memoized so they never re-mount on parent re-render)
const DentalNotesTextarea = memo(({ value, onChange, placeholder, readOnly, rows = 3 }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    rows={rows}
    style={{
      width: '100%',
      boxSizing: 'border-box',
      border: '1px solid #cbd5e1',
      borderRadius: 8,
      background: readOnly ? '#f8fafc' : '#fff',
      resize: 'none',
      outline: 'none',
      fontSize: 13,
      color: '#0f172a',
      fontFamily: 'helvetica, sans-serif',
      lineHeight: 1.7,
      padding: '8px 10px',
      marginTop: 6,
    }}
  />
));

const TextInput = memo(({ value, onChange, placeholder, readOnly, width = '100%' }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    style={{
      width: width,
      boxSizing: 'border-box',
      border: 'none',
      borderBottom: '1px solid #cbd5e1',
      background: 'transparent',
      outline: 'none',
      fontSize: 13,
      color: '#0f172a',
      fontFamily: 'helvetica, sans-serif',
      padding: '2px 4px',
      marginLeft: 8,
    }}
  />
));

// ── Main component
export const DentalExaminationReport = ({ examination, onSubmit, onEdit, readOnly = false }) => {
  // Debug: log examination data
  console.log('[DentalExaminationReport] examination:', examination);
  console.log('[DentalExaminationReport] treatments:', examination?.treatments);
  console.log('[DentalExaminationReport] treatmentRemarks:', examination?.treatmentRemarks);

  // Build full name from first, middle, last name
  const patientFullName = [examination?.firstName, examination?.middleName, examination?.lastName].filter(Boolean).join(' ');
  const [parentName, setParentName] = useState(patientFullName || examination?.parentName || '');
  const [restoration, setRestoration] = useState(examination?.restoration || '');
  const [extraction, setExtraction] = useState(examination?.extraction || '');

  // Only initialize state from examination on first load
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (examination && !initialized) {
      const name = [examination?.firstName, examination?.middleName, examination?.lastName].filter(Boolean).join(' ');
      setRestoration(examination?.restoration || '');
      setExtraction(examination?.extraction || '');
      setParentName(name || examination?.parentName || '');
      setTreatmentRemarks({
        oralProphylaxis: '',
        gumTreatment: '',
        orthodontic: '',
        prosthodontic: '',
        endodontic: '',
        tmj: '',
        xray: '',
        fluoride: '',
        sealant: '',
        ...(examination?.treatmentRemarks || {}),
      });
      setTreatments({
        oralProphylaxis: false,
        gumTreatment: false,
        orthodontic: false,
        prosthodontic: false,
        endodontic: false,
        tmj: false,
        xray: false,
        fluoride: false,
        sealant: false,
        ...(examination?.treatments || {}),
      });
      setInitialized(true);
    }
  }, [examination, initialized]);

  const [treatments, setTreatments] = useState({
    oralProphylaxis: examination?.treatments?.oralProphylaxis || false,
    gumTreatment: examination?.treatments?.gumTreatment || false,
    orthodontic: examination?.treatments?.orthodontic || false,
    prosthodontic: examination?.treatments?.prosthodontic || false,
    endodontic: examination?.treatments?.endodontic || false,
    tmj: examination?.treatments?.tmj || false,
    xray: examination?.treatments?.xray || false,
    fluoride: examination?.treatments?.fluoride || false,
    sealant: examination?.treatments?.sealant || false,
  });

  const [treatmentDetails, setTreatmentDetails] = useState({
    orthodontic: examination?.treatmentDetails?.orthodontic || '',
    prosthodontic: examination?.treatmentDetails?.prosthodontic || '',
    endodontic: examination?.treatmentDetails?.endodontic || '',
  });

  // Treatment remarks for each treatment type
  const [treatmentRemarks, setTreatmentRemarks] = useState({
    oralProphylaxis: examination?.treatmentRemarks?.oralProphylaxis || '',
    gumTreatment: examination?.treatmentRemarks?.gumTreatment || '',
    orthodontic: examination?.treatmentRemarks?.orthodontic || '',
    prosthodontic: examination?.treatmentRemarks?.prosthodontic || '',
    endodontic: examination?.treatmentRemarks?.endodontic || '',
    tmj: examination?.treatmentRemarks?.tmj || '',
    xray: examination?.treatmentRemarks?.xray || '',
    fluoride: examination?.treatmentRemarks?.fluoride || '',
    sealant: examination?.treatmentRemarks?.sealant || '',
  });

  const [familyDentist, setFamilyDentist] = useState(examination?.familyDentist || '');
  const [status, setStatus] = useState(examination?.status || { complete: false, notCompleted: false, followUp: '' });

  const [downloading, setDownloading] = useState(false);
  const logoUrl = 'https://wfwaycugvpujhqchxtdl.supabase.co/storage/v1/object/public/MediStorage/plsp-logo.jpg';

  // ── Fetch Logo from Supabase Storage ──────────────────────────────────────
  // Using direct URL from Supabase
  /* eslint-disable no-unused-vars */
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('images')
          .getPublicUrl('plsp-logo.jpg');
        if (error) throw error;
        setLogoUrl(data.publicUrl);
      } catch (error) {
        console.error('[DentalExaminationReport] Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

  const handleRestoration = useCallback((v) => setRestoration(v), []);
  const handleExtraction = useCallback((v) => setExtraction(v), []);
  const toggleTreatment = (key) => {
    console.log('[toggleTreatment] key:', key, 'current value:', treatments?.[key]);
    if (readOnly) {
      console.log('[toggleTreatment] readOnly is true, returning');
      return;
    }
    setTreatments(prev => {
      console.log('[toggleTreatment] prev:', prev);
      const newValue = !prev[key];
      console.log('[toggleTreatment] new value:', newValue);
      return { ...prev, [key]: newValue };
    });
  };
  const handleTreatmentDetail = (key, val) => setTreatmentDetails(prev => ({ ...prev, [key]: val }));
  const handleTreatmentRemark = (key, val) => setTreatmentRemarks(prev => ({ ...prev, [key]: val }));

  if (!examination) return null;

  // ── Field resolution ────────────────────────────────────────────────────
  const formatName = (name) => {
    if (!name) return { first: '', last: '' };
    const parts = name.split(', ');
    return { last: parts[0] || '', first: parts[1] || '' };
  };
  const { first, last } = formatName(examination.patientName);
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

  const fullName = [first, last].filter(Boolean).join(' ') || '';
  const yearSection = examination.yearSection || [examination.year || examination.yearLevel, examination.section].filter(Boolean).join(' - ') || '';
  const program = examination.course || examination.program || '';
  const gradeLevel = examination.gradeLevel || examination.year || '';

  // Format examDate to Month DD, YYYY (e.g., July 02, 2026)
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return currentDate;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return currentDate;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
  };
  const examDate = formatDateOnly(examination.examDate);

  // Shorten course name to abbreviation
  const shortenCourse = (courseName) => {
    if (!courseName) return '';
    const courseMap = {
      // CCSE - College of Computing Science and Engineering
      'Bachelor of Science in Information Technology': 'BSIT',
      'Bachelor of Science in Information System': 'BSIS',
      'Bachelor of Science in Computer Engineering': 'BSCpE',
      'Bachelor of Science in Industrial Engineering': 'BSIE',
      // CBAM - College of Business Administration and Management
      'Bachelor of Science in Entrepreneurship': 'BSEntrep',
      'Bachelor of Science in Public Administration': 'BSPA',
      'Bachelor of Science in Office Administration': 'BSOA',
      'Bachelor of Science in Business Administration Major in Human Resource Development Management': 'BSBA-HRDM',
      'Bachelor of Science in Business Administration Major in Financial Management': 'BSBA-FM',
      'Bachelor of Science in Business Administration Major in Marketing Management': 'BSBA-MM',
      // CAS - College of Art and Sciences
      'Bachelor of Science in Economics': 'BSEcon',
      'Bachelor of Arts in Communication': 'BAC',
      'Bachelor of Science in Psychology': 'BSPsych',
      'Bachelor of Arts in Political Science': 'BAPolSci',
      // CTHM - College of Tourism and Hospitality Management
      'Bachelor of Science in Tourism Management': 'BSTM',
      'Bachelor of Science in Hospitality Management': 'BSHM',
      // COA - College of Accountancy
      'Bachelor of Science in Accountancy': 'BSA',
      'Bachelor of Science in Accountancy Information System': 'BSAIS',
      'Bachelor of Science in Management Accounting': 'BSMA',
      // CTE - College of Teacher Education
      'Bachelor of Secondary Education Major in English': 'BSE-Eng',
      'Bachelor of Secondary Education Major in Filipino': 'BSE-Fil',
      'Bachelor of Secondary Education Major in Math': 'BSE-Math',
      'Bachelor of Secondary Education Major in Science': 'BSE-Sci',
      'Bachelor of Secondary Education Major in Social Studies': 'BSE-SS',
      'Bachelor of Elementary Education': 'BEEd',
      'Bachelor of Technical-Vocational Teacher Education': 'BTVTEd',
      'Bachelor of Special Needs Education': 'BSNEd',
      // CHK - College of Human Kinetics
      'Bachelor of Science in Physical Education': 'BSPE',
      'Bachelor of Science in Sports Science': 'BSS',
      // CNAHS - College of Nursing and Allied Health Sciences
      'Bachelor of Science in Nursing': 'BSN',
    };
    return courseMap[courseName] || courseName;
  };
  const shortProgram = shortenCourse(program);

  // ── PDF Generation (compact A4) ─────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const mar = 18;
      const cw = W - mar * 2;
      let y = 14;

      const ln = (n = 1, h = 5) => { y += n * h; };

      const field = (value, x, fieldW, baseY) => {
        const fy = baseY ?? y;
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.3);
        doc.line(x, fy + 0.8, x + fieldW, fy + 0.8);
        if (value) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(value, x + fieldW / 2, fy, { align: 'center', baseline: 'bottom' });
        }
      };

      const itext = (text, x, curY, style = 'normal', size = 9, color = [71, 85, 105]) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.text(text, x, curY, { baseline: 'bottom' });
        return x + doc.getTextWidth(text);
      };

      const checkbox = (x, cy, checked) => {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.3);
        doc.line(x, cy, x + 8, cy); // Simple underline for checks in this form style
        if (checked) {
          // Draw a proper checkmark using lines instead of unicode character
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.5);
          doc.line(x + 1, cy - 0.5, x + 3, cy + 1.5);
          doc.line(x + 3, cy + 1.5, x + 7, cy - 2);
        }
      };

      // ── Header (compact) ────────────────────────────────────────────────
      // Load logo from Supabase URL for PDF
      const logoUrlPdf = 'https://wfwaycugvpujhqchxtdl.supabase.co/storage/v1/object/public/MediStorage/plsp-logo.jpg';
      const logo = new Image();
      logo.crossOrigin = 'Anonymous';
      logo.src = logoUrlPdf;

      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = (e) => {
          console.warn('Could not load logo for PDF generation:', e);
          // Try fallback
          const fallbackLogo = new Image();
          fallbackLogo.src = '/plsp-logo.jpg';
          fallbackLogo.onload = resolve;
          fallbackLogo.onerror = resolve;
        };
      });

      if (logo.complete && logo.naturalWidth > 0) {
        try {
          doc.addImage(logo, 'JPEG', mar, y - 2, 16, 16);
        } catch (e) {
          console.warn('Error adding logo to PDF:', e);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('PAMANTASAN NG LUNGSOD NG SAN PABLO', mar + 20, y + 1.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(70, 100, 96);
      doc.text('HEALTH SERVICES OFFICE', mar + 20, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Brgy. San Jose, San Pablo City  ·  Tel No.: (049) 536-7830  ·  Email Address: plspofficial@plsp.edu.ph', mar + 20, y + 12);

      ln(1, 20);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('STUDENT ANNUAL DENTAL EXAMINATION REPORT', W / 2, y, { align: 'center', baseline: 'bottom' });

      // Date Right Aligned
      ln(1, 8);
      field(examDate, W - mar - 35, 35, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('DATE', W - mar - 17.5, y + 4, { align: 'center' });

      ln(1, 10);

      // Greeting
      let cx = mar;
      cx = itext('Dear Mr./Ms. ', cx, y, 'normal', 10, [15, 23, 42]);
      field(patientFullName, cx, 80, y);

      ln(1, 8);

      // Intro Paragraph
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const para = "We would like to inform you that we are conducting a routine dental examination to all our students to determine their oral health status and promote proper dental health care. We have given your son/daughter a dental check-up and below are the following findings and recommendations.";
      const splitPara = doc.splitTextToSize(para, cw - 10);
      doc.text(splitPara, mar + 10, y);
      ln(1, 20);

      // Findings Grid
      doc.setFont('helvetica', 'normal');
      doc.text('Needs Restoration (Filling):', mar, y);
      doc.text('For Extraction:', mar, y + 25);

      // Dental Cross Grid (Mental mapping of the quadrants)
      const gridX = mar + 45;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.line(gridX, y + 8, gridX + 80, y + 8); // Horizontal
      doc.line(gridX + 40, y - 2, gridX + 40, y + 38); // Vertical

      // Add quadrant notes if any (simplified mapping for PDF text)
      if(restoration) { doc.setFontSize(8); doc.text(doc.splitTextToSize(restoration, 35), gridX + 2, y + 4); }
      if(extraction) { doc.setFontSize(8); doc.text(doc.splitTextToSize(extraction, 35), gridX + 2, y + 14); }

      ln(1, 45);

      // Other Treatments
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Other Treatments Needed:', mar, y);
      ln(1, 6);

      const tH = 6;
      // Helper to display treatment with checkbox and remarks
      const treatmentWithRemark = (label, checked, remark, xPos) => {
        itext(label, xPos, y);
        checkbox(xPos + 30, y, checked);
        if (remark) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(80, 80, 80);
          doc.text(`(${remark})`, xPos + 35, y + 1.5);
          doc.setFont('helvetica', 'normal');
        }
      };

      // Col 1
      treatmentWithRemark('Oral Prophylaxis', treatments.oralProphylaxis, treatmentRemarks.oralProphylaxis, mar);
      treatmentWithRemark('Fluoride Treatment', treatments.fluoride, treatmentRemarks.fluoride, mar + 65);
      treatmentWithRemark('Sealant', treatments.sealant, treatmentRemarks.sealant, mar + 125);

      ln(1, tH);
      treatmentWithRemark('Gum Treatment', treatments.gumTreatment, treatmentRemarks.gumTreatment, mar);
      ln(1, tH);
      treatmentWithRemark('Orthodontic Treatment', treatments.orthodontic, treatmentRemarks.orthodontic, mar);
      field(treatmentDetails.orthodontic, mar + 45, 45, y);
      ln(1, tH);
      treatmentWithRemark('Prosthodontic Treatment', treatments.prosthodontic, treatmentRemarks.prosthodontic, mar);
      field(treatmentDetails.prosthodontic, mar + 48, 42, y);
      ln(1, tH);
      treatmentWithRemark('Endodontic Treatment', treatments.endodontic, treatmentRemarks.endodontic, mar);
      field(treatmentDetails.endodontic, mar + 45, 45, y);
      ln(1, tH);
      treatmentWithRemark('TMJ Treatment', treatments.tmj, treatmentRemarks.tmj, mar);
      ln(1, tH);
      treatmentWithRemark('Dental X-ray', treatments.xray, treatmentRemarks.xray, mar);

      ln(1, 15);
      doc.setFont('helvetica', 'normal');
      doc.text('Please let him/ her see your family dentist as soon as possible. THANK YOU.', mar, y);

      ln(1, 15);

      // Doctor Signature
      const docSigX = W - mar - 50;
      doc.setFont('helvetica', 'normal');
      doc.text('Very Truly Yours,', docSigX, y);
      ln(1, 8);
      doc.setFont('helvetica', 'bold');
      doc.text('DR. JOSELITO S. REYES', docSigX, y);
      doc.line(docSigX, y + 1, docSigX + 45, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('DENTIST II', docSigX + 22.5, y + 5, { align: 'center' });

      ln(1, 20);

      // Student Info Block
      const blockY = y;
      itext('Name of Student', mar, blockY); field(fullName, mar + 28, 60, blockY);
      itext('Course/Year/Section', mar, blockY + 7); field(`${shortProgram} ${yearSection}`, mar + 32, 56, blockY + 7);
      itext('Name of Family Dentist', mar, blockY + 14); field(familyDentist, mar + 35, 53, blockY + 14);

      itext('Grade Level', mar + 92, blockY + 7); field(gradeLevel, mar + 110, 30, blockY + 7);

      // Status Block
      ln(1, 25);
      itext('Treatment Complete', mar + 40, y);
      if (status.complete) {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.5);
        doc.line(mar + 72, y - 0.5, mar + 75, y + 2);
        doc.line(mar + 75, y + 2, mar + 80, y - 2);
      }
      ln(1, 6);
      itext('Not Completed', mar + 40, y);
      if (status.notCompleted) {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.5);
        doc.line(mar + 65, y - 0.5, mar + 68, y + 2);
        doc.line(mar + 68, y + 2, mar + 73, y - 2);
      }
      ln(1, 6);
      itext('Follow-up', mar + 40, y); field(status.followUp, mar + 57, 45, y);

      ln(1, 15);
      const famSigX = W - mar - 50;
      doc.line(famSigX, y, W - mar, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Signature of Family Dentist', famSigX + 25, y + 4, { align: 'center' });

      ln(1, 12);

      // Footer text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 40, 40);
      doc.text('NOTE: ALWAYS PRESENT THIS FORM (SCF NO. 3) EVERY TIME YOU ASK TO SIGN YOUR CLEARANCE AT THE END OF EVERY SEMESTER.', W / 2, y, { align: 'center' });

      ln(1, 6);
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('"Primed to Lead and Serve for Progress"', W / 2, y, { align: 'center' });

      // Metadata Table
      ln(1, 8);
      const tH2 = 6.5;
      const tY = y;
      const cols = [mar, mar + 34, mar + 56, mar + 100, mar + 136, W - mar];
      const cells = ['', 'Revision No.', 'Effective Date', 'February 2023', 'Page 1 of 1'];
      doc.setLineWidth(0.3);
      doc.setDrawColor(180, 180, 180);
      doc.rect(cols[0], tY, cols[5] - cols[0], tH2);
      for (let i = 1; i < 5; i++) doc.line(cols[i], tY, cols[i], tY + tH2);
      cells.forEach((cell, i) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        // Manual override for revision number based on image
        if(i === 1) doc.text('2', (cols[1] + cols[2]) / 2, tY + tH2 / 2 + 1, { align: 'center', baseline: 'middle' });
        else doc.text(cell, (cols[i] + cols[i + 1]) / 2, tY + tH2 / 2 + 1, { align: 'center', baseline: 'middle' });
      });

      const safeName = (examination.patientName || 'DentalExam').replace(/[^a-z0-9_\-]/gi, '_');
      doc.save(`${safeName}_DentalExamination.pdf`);
    } catch (err) {
      console.error('[DentalExaminationReport] PDF error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        ...examination,
        parentName,
        restoration,
        extraction,
        treatments,
        treatmentDetails,
        treatmentRemarks,
        toothData: examination?.toothData || {},
        dentalHistory: examination?.dentalHistory || {},
        intraoral: examination?.intraoral || {},
        familyDentist,
        status,
        docStatus: 'approved',
      });
    }
  };

  const checkRow = (checked, key, label, hasInput = false, inputKey = null, hasRemark = false, remarkKey = null) => {
    console.log('[checkRow] rendering:', key, 'checked:', checked, 'treatments:', treatments);
    return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={() => toggleTreatment(key)}
          disabled={readOnly}
          style={{
            width: 18,
            height: 18,
            cursor: readOnly ? 'not-allowed' : 'pointer',
            accentColor: '#466460',
          }}
        />
        <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 11, color: '#334155' }}>
          {label}
        </span>
        
      </div>
      {hasRemark && (
        <input
          type="text"
          value={treatmentRemarks[remarkKey] || ''}
          onChange={(e) => handleTreatmentRemark(remarkKey, e.target.value)}
          readOnly={readOnly}
          placeholder="Doctor's remarks..."
          style={{
            flex: 1,
            minWidth: 200,
            boxSizing: 'border-box',
            border: 'none',
            borderBottom: '1px solid #cbd5e1',
            background: 'transparent',
            outline: 'none',
            fontSize: 11,
            color: '#0f172a',
            fontFamily: 'helvetica, sans-serif',
            padding: '2px 4px',
          }}
        />
      )}
    </div>
  );
  };

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '36px 42px', marginTop: 20, position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, paddingBottom: 14 }}>
          <div style={{ width: 56, height: 56, flexShrink: 0 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="PLSP Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#f1f5f9', borderRadius: '50%' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'helvetica, sans-serif', color: '#1a2e22', letterSpacing: 0.5 }}>PAMANTASAN NG LUNGSOD NG SAN PABLO</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'helvetica, sans-serif', color: '#466460', lineHeight: 1.2 }}>HEALTH SERVICES OFFICE</div>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'helvetica, sans-serif', marginTop: 3 }}>
              Brgy. San Jose, San Pablo City &nbsp;·&nbsp; Tel No.: (049) 536-7830 &nbsp;·&nbsp; Email Address: plspofficial@plsp.edu.ph
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', margin: '24px 0 32px' }}>
          <h1 style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 800, fontSize: 16, color: '#0f172a', margin: 0, letterSpacing: 0.5 }}>
            STUDENT ANNUAL DENTAL EXAMINATION REPORT
          </h1>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <TextInput value={examDate} readOnly={readOnly} width="120px" />
            </div>
          </div>
        </div>

        {/* Greeting & Intro */}
        <div style={{ fontFamily: 'helvetica, sans-serif', fontSize: 13, color: '#334155', lineHeight: 2.0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Dear Mr./Ms.</span>
            <TextInput value={patientFullName} readOnly={true} width="300px" style={{ fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #466460' }} />
          </div>
          <p style={{ textAlign: 'justify', textIndent: '40px', marginTop: 0 }}>
            We would like to inform you that we are conducting a routine dental examination to all our students to determine their oral health status and promote proper dental health care. We have given your son/daughter a dental check-up and below are the following findings and recommendations.
          </p>
        </div>

        {/* Findings Sections */}
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <p style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>Needs Restoration (Filling):</p>
            <DentalNotesTextarea value={restoration} onChange={handleRestoration} readOnly={readOnly} rows={4} />
          </div>
          <div>
            <p style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>For Extraction:</p>
            <DentalNotesTextarea value={extraction} onChange={handleExtraction} readOnly={readOnly} rows={4} />
          </div>
        </div>

        {/* Other Treatments Grid */}
        <div style={{ marginTop: 32 }}>
          <p style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 16 }}>Other Treatments Needed:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 40px' }}>
            <div style={{ flex: '1 1 400px' }}>
              {checkRow(!!treatments?.oralProphylaxis, 'oralProphylaxis', 'Oral Prophylaxis', false, null, true, 'oralProphylaxis')}
              {checkRow(!!treatments?.gumTreatment, 'gumTreatment', 'Gum Treatment', false, null, true, 'gumTreatment')}
              {checkRow(!!treatments?.orthodontic, 'orthodontic', 'Orthodontic Treatment', true, 'orthodontic', true, 'orthodontic')}
              {checkRow(!!treatments?.prosthodontic, 'prosthodontic', 'Prosthodontic Treatment', true, 'prosthodontic', true, 'prosthodontic')}
              {checkRow(!!treatments?.endodontic, 'endodontic', 'Endodontic Treatment', true, 'endodontic', true, 'endodontic')}
              {checkRow(!!treatments?.tmj, 'tmj', 'TMJ Treatment', false, null, true, 'tmj')}
              {checkRow(!!treatments?.xray, 'xray', 'Dental X-ray', false, null, true, 'xray')}
            </div>
            <div style={{ flex: '1 1 200px' }}>
              {checkRow(!!treatments?.fluoride, 'fluoride', 'Fluoride Treatment', false, null, true, 'fluoride')}
              {checkRow(!!treatments?.sealant, 'sealant', 'Sealant', false, null, true, 'sealant')}
            </div>
          </div>
        </div>

        <p style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, color: '#334155', marginTop: 32 }}>
          Please let him/ her see your family dentist as soon as possible. THANK YOU.
        </p>

        {/* School Dentist Signature */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, color: '#334155', marginBottom: 30 }}>Very Truly Yours,</div>
            <div style={{ borderBottom: '1px solid #0f172a', paddingBottom: 4, marginBottom: 4, fontFamily: 'helvetica, sans-serif', fontWeight: 800, fontSize: 12, color: '#0f172a' }}>
              DR. JOSELITO S. REYES
            </div>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 600, fontSize: 11, color: '#475569' }}>DENTIST II</div>
          </div>
        </div>

        {/* Student Data Block */}
        <div style={{ marginTop: 40, padding: '24px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 120 }}>Name of Student</span>
              <TextInput value={fullName} readOnly={readOnly} />
            </div>
            <div></div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 120 }}>Course/Year/Section</span>
              <TextInput value={`${shortProgram} ${yearSection}`} readOnly={readOnly} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 80, marginLeft: 20 }}>Grade Level</span>
              <TextInput value={gradeLevel} readOnly={readOnly} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 120 }}>Name of Family Dentist</span>
              <TextInput value={familyDentist} onChange={setFamilyDentist} readOnly={readOnly} />
            </div>
          </div>

          <div style={{ marginTop: 24, paddingLeft: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 140 }}>Treatment Complete</span>
              <TextInput
                value={status.complete ? '✓' : ''}
                onChange={() => !readOnly && setStatus(s => ({ ...s, complete: !s.complete }))}
                readOnly={readOnly}
                width="200px"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 140 }}>Not Completed</span>
              <TextInput
                value={status.notCompleted ? '✓' : ''}
                onChange={() => !readOnly && setStatus(s => ({ ...s, notCompleted: !s.notCompleted }))}
                readOnly={readOnly}
                width="200px"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 140 }}>Follow-up</span>
              <TextInput
                value={status.followUp}
                onChange={(v) => setStatus(s => ({ ...s, followUp: v }))}
                readOnly={readOnly}
                width="200px"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 30 }}>
             <div style={{ textAlign: 'center', minWidth: 200 }}>
              <div style={{ borderBottom: '1px solid #0f172a', paddingBottom: 4, marginBottom: 4, height: 20 }}></div>
              <div style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 600, fontSize: 11, color: '#0f172a' }}>Signature of Family Dentist</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 700, fontSize: 10, color: '#dc2626', marginBottom: 8 }}>
            NOTE: ALWAYS PRESENT THIS FORM (SCF NO. 3) EVERY TIME YOU ASK TO SIGN YOUR CLEARANCE AT THE END OF EVERY SEMESTER.
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, color: '#64748b' }}>
            "Primed to Lead and Serve for Progress"
          </div>
        </div>

        {/* Metadata table */}
        <table style={{ width: '100%', marginTop: 24, fontSize: 9, color: '#94a3b8', borderCollapse: 'collapse', fontFamily: 'helvetica, sans-serif' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center', background: '#f8fafc', width: '20%' }}></td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center' }}>Revision No.<br/><span style={{ color: '#0f172a', fontWeight: 'bold'}}>2</span></td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center', fontWeight: 700, background: '#f8fafc' }}>Effective Date</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center' }}>February 2023</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center' }}>Page 1 of 1</td>
            </tr>
          </tbody>
        </table>

        {/* Admin buttons */}
        {!readOnly && (
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={onEdit}
              style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <i className="fa-solid fa-pen-to-square"></i> Edit Report
            </button>
            <button
              onClick={handleSubmit}
              style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <i className="fa-solid fa-paper-plane"></i> Save & Approve
            </button>
          </div>
        )}
      </div>

      {/* Download button */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 13,
            border: '1px solid #cbd5e1', cursor: downloading ? 'not-allowed' : 'pointer',
            background: downloading ? '#f8fafc' : '#fff', color: '#0f172a',
            opacity: downloading ? 0.7 : 1, transition: 'all 0.2s',
          }}
        >
          {downloading ? (
            <>
              <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating PDF…
            </>
          ) : (
            <>
              <i className="fa-solid fa-file-pdf" style={{ color: '#dc2626' }}></i>
              Export PDF
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default DentalExaminationReport;