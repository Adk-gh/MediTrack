// C:\Users\HP\MediTrack\frontend\src\components\DentalExaminationReport.jsx
import React, { useState, useCallback, memo, useEffect } from 'react';
import jsPDF from 'jspdf';
import { savePdf } from '../utils/pdfDownload';

// ─── Environment Variable for API URL ────────────────────────────────────────
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

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
  // Debug logging
  // console.log('[DentalExaminationReport] examination:', examination);

  // Build full name from first, middle, last name
  const patientFullName = [examination?.firstName, examination?.middleName, examination?.lastName].filter(Boolean).join(' ');
  const [parentName, setParentName] = useState(patientFullName || examination?.parentName || '');
  const [restoration, setRestoration] = useState(examination?.restoration || '');
  const [extraction, setExtraction] = useState(examination?.extraction || '');

  // Only initialize state from examination on first load
  const [initialized, setInitialized] = useState(false);

  // ADDED: State to hold database-fetched dentist details with default fallback values
  const [dentistInfo, setDentistInfo] = useState({
    name: 'DR. JOSELITO S. REYES',
    title: 'DENTIST II'
  });

  // ADDED: Fetch dentist info from the database on mount
  useEffect(() => {
    const fetchDentistInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/settings/dentist`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setDentistInfo({
              name: data.name || 'DR. JOSELITO S. REYES',
              title: data.title || 'DENTIST II'
            });
          }
        }
      } catch (err) {
        console.error('[DentalExaminationReport] Failed to fetch dentist settings, using defaults:', err);
      }
    };

    fetchDentistInfo();
  }, []);

  // Extract restoration and extraction from toothData
  const extractToothConditions = (toothData, conditions) => {
    if (!toothData || typeof toothData !== 'object') return '';

    const conditionLabels = {
      'Filled (●)': 'Filled',
      'Caries (C)': 'Caries',
      'Missing (M)': 'Missing',
      'Filled': 'Filled',
      'Caries': 'Caries',
      'Missing': 'Missing',
    };
    const filtered = Object.entries(toothData)
      .filter(([, data]) => data?.condition && conditions.some(c => data.condition.includes(c)))
      .map(([num, data]) => `Tooth #${num}: ${conditionLabels[data.condition] || data.condition}${data.operation ? ` (${data.operation})` : ''}`);
    return filtered.length > 0 ? filtered.join('\n') : '';
  };

  useEffect(() => {
    if (examination && !initialized) {
      const name = [examination?.firstName, examination?.middleName, examination?.lastName].filter(Boolean).join(' ');

      // Extract restoration (Filled) and extraction (Missing) from toothData
      const toothData = examination?.toothData || {};
      const extractedRestoration = extractToothConditions(toothData, ['Filled', 'Caries']);
      const extractedExtraction = extractToothConditions(toothData, ['Missing', 'Extracted']);

      // Only use existing restoration/extraction if they have actual content (not 'None')
      const existingRestoration = examination?.restoration && examination?.restoration !== 'None' ? examination?.restoration : '';
      const existingExtraction = examination?.extraction && examination?.extraction !== 'None' ? examination?.extraction : '';

      setRestoration(existingRestoration || extractedRestoration || '');
      setExtraction(existingExtraction || extractedExtraction || '');
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

  const handleRestoration = useCallback((v) => setRestoration(v), []);
  const handleExtraction = useCallback((v) => setExtraction(v), []);
  const toggleTreatment = (key) => {
    if (readOnly) {
      return;
    }
    setTreatments(prev => {
      const newValue = !prev[key];
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

  // Shorten course name to abbreviation.
  //
  // This needs to handle THREE shapes of input:
  //   1. Just the program name on its own, e.g. "Bachelor of Science in
  //      Information Technology" (exact match against the map).
  //   2. The program name embedded inside a longer combined string, e.g.
  //      "Bachelor of Science in Information Technology 3rd Year D" (the
  //      program name plus year/section glued together). This is the shape
  //      that was slipping through unabbreviated before, because the old
  //      version only ever checked for an EXACT whole-string match.
  //   3. Already abbreviated, e.g. "BSIT 3rd Year - D" — nothing to do.
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

    // Normalize whitespace/case so near-matches (trailing spaces, stray
    // casing from the DB) still map to an abbreviation instead of falling
    // through to the full, much longer name.
    const trimmed = courseName.trim();

    // 1) Fast path: value is *exactly* one of the known program names.
    if (courseMap[trimmed]) return courseMap[trimmed];
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
    const exactMatch = Object.keys(courseMap).find(
      k => k.toLowerCase().replace(/\s+/g, ' ') === normalized
    );
    if (exactMatch) return courseMap[exactMatch];

    // 2) Substring path: the program name is embedded inside a longer
    // string, e.g. "...Information Technology 3rd Year D". Find the
    // matching full name and swap out only that portion, keeping whatever
    // comes before/after (the year/section text) intact. Keys are checked
    // longest-first so a program name that's itself a substring of another,
    // longer one (e.g. "Accountancy" inside "Accountancy Information
    // System") can't match too early and clip the wrong text.
    const keysByLength = Object.keys(courseMap).sort((a, b) => b.length - a.length);
    for (const fullNameKey of keysByLength) {
      const normalizedFull = fullNameKey.toLowerCase().replace(/\s+/g, ' ');
      const idx = normalized.indexOf(normalizedFull);
      if (idx !== -1) {
        const before = trimmed.slice(0, idx);
        const after = trimmed.slice(idx + fullNameKey.length);
        return `${before}${courseMap[fullNameKey]}${after}`.replace(/\s+/g, ' ').trim();
      }
    }

    // 3) No match at all (already abbreviated, or an unrecognized program) —
    // return as-is.
    return trimmed;
  };
  const shortProgram = shortenCourse(program);

  // Abbreviate whichever combined course/year/section string is actually
  // present. `course` and `yearSection` are expected to carry the same
  // value (set that way in Records-users.jsx / Approvals.jsx), so a single
  // abbreviation pass over that combined string is enough — this replaces
  // the old include()-based dedupe check, which only worked if `yearSection`
  // was already abbreviated and broke (duplicating text, or leaving the
  // full program name untouched) whenever it wasn't.
  const courseYearSectionValue = shortenCourse(yearSection || program);

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

      // Single-page guarantee: this form must always export as exactly one
      // page, so we never call doc.addPage(). The old version had a
      // page-break safety net that started a fresh page whenever a section
      // (mainly the restoration/extraction tooth lists) ran long — that's
      // what let a busy exam spill onto a 2nd page. Instead, the
      // variable-length sections (see fitMultilineBlock below) are bounded
      // to a fixed max height and shrink their own font size to fit within
      // it, so total page height stays constant no matter how much tooth
      // data there is.

      // Auto-fitting multi-line text block: shrinks font size to keep
      // wrapped text within a fixed maxHeight, and — only as an absolute
      // last resort, if even the smallest font still overflows — truncates
      // remaining lines with an ellipsis. This is what keeps the
      // Restoration/Extraction box height constant regardless of how many
      // teeth are listed, which in turn is what keeps the whole report on
      // a single page.
      const fitMultilineBlock = (text, boxWidth, maxHeight, opts = {}) => {
        const maxFontSize = opts.maxFontSize ?? 8;
        const minFontSize = opts.minFontSize ?? 5.5;
        const vPadding = opts.vPadding ?? 6;
        const hPadding = opts.hPadding ?? 6;
        if (!text) return { lines: [], fontSize: maxFontSize, lineHeight: maxFontSize * 0.52 };

        doc.setFont('helvetica', 'normal');
        let fontSize = maxFontSize;
        let lines = [];
        let lineHeight = fontSize * 0.52;

        while (fontSize >= minFontSize) {
          doc.setFontSize(fontSize);
          lines = doc.splitTextToSize(text, boxWidth - hPadding);
          lineHeight = fontSize * 0.52;
          if (lines.length * lineHeight + vPadding <= maxHeight) break;
          fontSize -= 0.5;
        }

        // Still doesn't fit even at the smallest readable size: clip lines
        // to whatever fits in maxHeight rather than letting the box (and
        // therefore the page) grow.
        doc.setFontSize(fontSize);
        lineHeight = fontSize * 0.52;
        const maxLines = Math.max(1, Math.floor((maxHeight - vPadding) / lineHeight));
        if (lines.length > maxLines) {
          lines = lines.slice(0, maxLines);
          lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+$/, '') + ' …';
        }

        return { lines, fontSize, lineHeight };
      };

      // Auto-fitting field: shrinks font size (and, as a last resort,
      // truncates with an ellipsis) so a long value can never overflow past
      // its allotted width and bleed into neighboring labels/fields. This is
      // what was causing the garbled "double text" look on Course/Year/Section
      // whenever the course name didn't get abbreviated.
      const field = (value, x, fieldW, baseY, opts = {}) => {
        const fy = baseY ?? y;
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.3);
        doc.line(x, fy + 0.8, x + fieldW, fy + 0.8);
        if (!value) return;

        const maxSize = opts.maxFontSize ?? 9;
        const minSize = opts.minFontSize ?? 6;
        const padding = 2;
        let size = maxSize;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(size);

        while (size > minSize && doc.getTextWidth(value) > fieldW - padding) {
          size -= 0.5;
          doc.setFontSize(size);
        }

        let displayValue = value;
        if (doc.getTextWidth(displayValue) > fieldW - padding) {
          while (displayValue.length > 1 && doc.getTextWidth(displayValue + '…') > fieldW - padding) {
            displayValue = displayValue.slice(0, -1);
          }
          displayValue += '…';
        }

        doc.text(displayValue, x + fieldW / 2, fy, { align: 'center', baseline: 'bottom' });
      };

      const itext = (text, x, curY, style = 'normal', size = 9, color = [71, 85, 105]) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.text(text, x, curY, { baseline: 'bottom' });
        return x + doc.getTextWidth(text);
      };

      // Real checkbox: a small square outline vertically centered on the
      // label text (not just resting on the baseline), with the checkmark
      // drawn INSIDE it when checked. The previous version anchored the
      // box's bottom edge exactly to the text baseline, so the whole
      // 3.6mm box sat above the baseline — well above the cap-height of a
      // 9pt label — which is what made every checkbox look like it was
      // floating above its row instead of sitting level with the text.
      // Shifting it down so its vertical center lines up with the middle
      // of the label fixes this for every treatment row, since they all
      // share this same function.
      const CHECKBOX_SIZE = 3.6;
      const checkbox = (x, cy, checked) => {
        const boxY = cy - CHECKBOX_SIZE + 0.9;
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.3);
        doc.rect(x, boxY, CHECKBOX_SIZE, CHECKBOX_SIZE);
        if (checked) {
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.5);
          doc.line(x + 0.6, boxY + CHECKBOX_SIZE * 0.55, x + CHECKBOX_SIZE * 0.42, boxY + CHECKBOX_SIZE - 0.5);
          doc.line(x + CHECKBOX_SIZE * 0.42, boxY + CHECKBOX_SIZE - 0.5, x + CHECKBOX_SIZE - 0.5, boxY + 0.5);
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
      // First-line indent only (matches the on-screen text-indent style):
      // pad the start with spaces before wrapping so jsPDF's own line-break
      // measurement naturally pushes just the first line in, while wrapped
      // lines fall back to the normal left margin.
      const indentMm = 10;
      const spaceW = doc.getTextWidth(' ');
      const numSpaces = Math.max(1, Math.round(indentMm / spaceW));
      const splitPara = doc.splitTextToSize(' '.repeat(numSpaces) + para, cw);
      doc.text(splitPara, mar, y);
      ln(1, 20);

      // ── Findings: two independently-sized columns (mirrors the on-screen
      // side-by-side layout) instead of stacking both lists in one column at
      // a fixed offset. Box height now grows with however many lines each
      // list actually needs, so Restoration and Extraction can never overlap
      // regardless of how many teeth are listed.
      const colGap = 8;
      const colW = (cw - colGap) / 2;
      const restColX = mar;
      const extColX = mar + colW + colGap;

      // Bounded box: capped at maxBoxH regardless of how many teeth are
      // listed. Long lists shrink their own font (via fitMultilineBlock)
      // instead of growing the box — that's what guarantees the rest of
      // the form (treatments, signatures, footer) never gets pushed onto a
      // second page.
      //
      // Why 36mm specifically: everything else on this form (header,
      // greeting, treatments list, signatures, student info, footer note,
      // and the metadata table) adds up to a fixed ~244mm regardless of
      // content. An A4 page is 297mm tall, and we want roughly the same
      // ~14mm margin at the bottom as at the top — so the box (plus its
      // own 6mm padding) can only safely take (297 - 14 - 244) ≈ 39mm.
      // 36mm keeps a small buffer under that so the metadata table always
      // stays fully on the page instead of running past the physical
      // bottom edge, which is what was happening with the old 90mm cap.
      const minBoxH = 16;
      const maxBoxH = 36;
      const restFit = fitMultilineBlock(restoration, colW, maxBoxH);
      const extrFit = fitMultilineBlock(extraction, colW, maxBoxH);
      const boxH = Math.min(
        maxBoxH,
        Math.max(
          restFit.lines.length * restFit.lineHeight,
          extrFit.lines.length * extrFit.lineHeight,
          minBoxH - 6
        ) + 6
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Needs Restoration (Filling):', restColX, y);
      doc.text('For Extraction:', extColX, y);

      ln(1, 6);
      const boxTop = y - 4;

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(restColX, boxTop, colW, Math.max(boxH, minBoxH));
      doc.rect(extColX, boxTop, colW, Math.max(boxH, minBoxH));

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      if (restFit.lines.length) {
        doc.setFontSize(restFit.fontSize);
        doc.text(restFit.lines, restColX + 3, y + 1);
      }
      if (extrFit.lines.length) {
        doc.setFontSize(extrFit.fontSize);
        doc.text(extrFit.lines, extColX + 3, y + 1);
      }

      ln(1, Math.max(boxH, minBoxH) + 6);

      // Other Treatments
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Other Treatments Needed:', mar, y);
      ln(1, 7);

      const tH = 6;

      // treatmentRow: draws "Label ____" with the checkbox line placed right
      // after the label's ACTUAL rendered width, instead of a fixed +30mm
      // offset. The fixed offset is what made the checkbox underline collide
      // with (and strike through) longer labels like "Orthodontic Treatment"
      // / "Prosthodontic Treatment" / "Endodontic Treatment" in the exported
      // PDF. Any optional detail field and/or doctor's remark are then laid
      // out one after another starting from wherever the checkbox actually
      // ended, so nothing after it can overlap either.
      const treatmentRow = (label, checked, xPos, opts = {}) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(label, xPos, y, { baseline: 'bottom' });
        const labelW = doc.getTextWidth(label);

        const boxX = xPos + labelW + 4;
        checkbox(boxX, y, checked);
        let cursorX = boxX + CHECKBOX_SIZE + 4;

        if (opts.detailValue !== undefined) {
          // Rows with a blank line (Orthodontic/Prosthodontic/Endodontic):
          // put the remark ON the line itself instead of floating it off to
          // the side in parentheses — that's what made it look disconnected
          // from its own line in the export. Detail + remark are combined
          // when both are present.
          const detailW = opts.detailWidth || 60;
          const lineText = [opts.detailValue, opts.remark].filter(Boolean).join(' — ');
          field(lineText, cursorX, detailW, y);
          cursorX += detailW + 4;
        } else if (opts.remark) {
          // Rows with no line (Oral Prophylaxis, Gum Treatment, etc.) keep
          // the compact parenthetical remark right after the checkbox. Uses
          // the same baseline as the label and checkbox (y, baseline:
          // 'bottom') instead of an extra +1.2 offset, which was making the
          // remark sit visibly lower than the rest of the row instead of
          // reading straight across.
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(80, 80, 80);
          doc.text(`(${opts.remark})`, cursorX, y, { baseline: 'bottom' });
        }
      };

      // Row 1 — three short items side by side
      treatmentRow('Oral Prophylaxis', treatments.oralProphylaxis, mar, { remark: treatmentRemarks.oralProphylaxis });
      treatmentRow('Fluoride Treatment', treatments.fluoride, mar + 65, { remark: treatmentRemarks.fluoride });
      treatmentRow('Sealant', treatments.sealant, mar + 125, { remark: treatmentRemarks.sealant });

      ln(1, tH);
      treatmentRow('Gum Treatment', treatments.gumTreatment, mar, { remark: treatmentRemarks.gumTreatment });
      ln(1, tH);
      treatmentRow('Orthodontic Treatment', treatments.orthodontic, mar, { remark: treatmentRemarks.orthodontic });
      ln(1, tH);
      treatmentRow('Prosthodontic Treatment', treatments.prosthodontic, mar, { remark: treatmentRemarks.prosthodontic });
      ln(1, tH);
      treatmentRow('Endodontic Treatment', treatments.endodontic, mar, { remark: treatmentRemarks.endodontic });
      ln(1, tH);
      treatmentRow('TMJ Treatment', treatments.tmj, mar, { remark: treatmentRemarks.tmj });
      ln(1, tH);
      treatmentRow('Dental X-ray', treatments.xray, mar, { remark: treatmentRemarks.xray });

      ln(1, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Please let him/ her see your family dentist as soon as possible. THANK YOU.', mar, y);

      ln(1, 10);

      // Doctor Signature
      const docSigX = W - mar - 50;
      doc.setFont('helvetica', 'normal');
      doc.text('Very Truly Yours,', docSigX, y);
      ln(1, 8);
      doc.setFont('helvetica', 'bold');
      doc.text(dentistInfo.name, docSigX, y);
      doc.line(docSigX, y + 1, docSigX + 45, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(dentistInfo.title, docSigX + 22.5, y + 5, { align: 'center' });

      ln(1, 12);

      // ── Student Info Block ──────────────────────────────────────────────
      // A horizontal rule above "Name of Student" mirrors the printed form,
      // visually separating this block from the doctor's signature above it.
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(mar, y - 4, W - mar, y - 4);
      ln(1, 4);

      const blockY = y;
      itext('Name of Student', mar, blockY);
      field(fullName, mar + 30, (W - mar) - (mar + 30), blockY);

      itext('Course/Year/Section', mar, blockY + 8);
      field(courseYearSectionValue, mar + 34, 60, blockY + 8);
      itext('Grade Level', mar + 104, blockY + 8);
      field(gradeLevel, mar + 122, 24, blockY + 8);

      itext('Name of Family Dentist', mar, blockY + 16);
      field(familyDentist, mar + 38, (W - mar) - (mar + 38), blockY + 16);

      y = blockY + 16;

      // Status Block
      ln(1, 12);
      const statusLineW = 45;
      let statusLabelEnd = itext('Treatment Complete', mar + 40, y);
      let statusLineX = statusLabelEnd + 6;
      field('', statusLineX, statusLineW, y);
      if (status.complete) {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.5);
        doc.line(statusLineX + 2, y - 1.5, statusLineX + 6, y + 1);
        doc.line(statusLineX + 6, y + 1, statusLineX + 14, y - 4);
      }
      ln(1, 6);
      statusLabelEnd = itext('Not Completed', mar + 40, y);
      statusLineX = statusLabelEnd + 6;
      field('', statusLineX, statusLineW, y);
      if (status.notCompleted) {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.5);
        doc.line(statusLineX + 2, y - 1.5, statusLineX + 6, y + 1);
        doc.line(statusLineX + 6, y + 1, statusLineX + 14, y - 4);
      }
      ln(1, 6);
      itext('Follow-up', mar + 40, y); field(status.followUp, mar + 57, 45, y);

      ln(1, 15);
      const famSigX = W - mar - 50;
      doc.setDrawColor(15, 23, 42);
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
      await savePdf(doc, `${safeName}_DentalExamination.pdf`);
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
              {dentistInfo.name}
            </div>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 600, fontSize: 11, color: '#475569' }}>{dentistInfo.title}</div>
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
              <TextInput value={courseYearSectionValue} readOnly={readOnly} />
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