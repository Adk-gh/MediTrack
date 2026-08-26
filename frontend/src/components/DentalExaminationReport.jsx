// C:\Users\HP\MediTrack\frontend\src\components\DentalExaminationReport.jsx
import React, { useState, useCallback, memo, useEffect } from 'react';
import jsPDF from 'jspdf';
import { savePdf } from '../utils/pdfDownload';
import fallbackLogo from '../assets/logogo.jpg';

// ─── Environment Variable for API URL ────────────────────────────────────────
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const DEFAULT_LOGO_URL = fallbackLogo;
const BRANDING_LOGO_EVENT = 'meditrack:branding-logo-updated';
const BRANDING_LOGO_STORAGE_KEY = 'meditrack_branding_logo_updated';

const appendCacheBuster = (url) => {
  if (!url) return DEFAULT_LOGO_URL;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
};

const loadImageForPdf = (src, fallbackSrc = null) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'Anonymous';

    image.onload = () => resolve(image);

    image.onerror = () => {
      if (!fallbackSrc || fallbackSrc === src) {
        resolve(null);
        return;
      }

      const fallback = new Image();
      fallback.crossOrigin = 'Anonymous';
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = fallbackSrc;
    };

    image.src = src;
  });

const getPdfImageFormat = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();

  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) {
    return 'JPEG';
  }

  if (cleanUrl.endsWith('.webp')) {
    return 'WEBP';
  }

  return 'PNG';
};

const useDynamicBrandingLogo = () => {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);

  useEffect(() => {
    let cancelled = false;

    const loadLogo = async () => {
      try {
        const response = await fetch(`${API_URL}/storage/branding/logo`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Branding logo request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (!cancelled && result?.success && result?.url) {
          setLogoUrl(appendCacheBuster(result.url));
        }
      } catch (error) {
        console.warn('[Branding] Failed to load dynamic logo. Using fallback.', error);

        if (!cancelled) {
          setLogoUrl(DEFAULT_LOGO_URL);
        }
      }
    };

    const handleLogoUpdated = (event) => {
      if (event?.detail?.url) {
        setLogoUrl(appendCacheBuster(event.detail.url));
      } else {
        loadLogo();
      }
    };

    const handleStorage = (event) => {
      if (event.key === BRANDING_LOGO_STORAGE_KEY) {
        loadLogo();
      }
    };

    loadLogo();

    window.addEventListener(BRANDING_LOGO_EVENT, handleLogoUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(BRANDING_LOGO_EVENT, handleLogoUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return logoUrl;
};


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
      maxWidth: '100%',
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
      minWidth: 0,
    }}
  />
));

// ── Main component
export const DentalExaminationReport = ({ examination, onSubmit, onEdit, readOnly = false }) => {
  const patientFullName = [examination?.firstName, examination?.middleName, examination?.lastName].filter(Boolean).join(' ');
  const [parentName, setParentName] = useState(patientFullName || examination?.parentName || '');
  const [restoration, setRestoration] = useState(examination?.restoration || '');
  const [extraction, setExtraction] = useState(examination?.extraction || '');

  const [initialized, setInitialized] = useState(false);

  // State to hold database-fetched dentist details
  const [dentistInfo, setDentistInfo] = useState({
    name: 'DR. JOSELITO S. REYES',
    title: 'DENTIST II',
    signatureUrl: ''
  });

useEffect(() => {
  const fetchDentistInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings/dentist`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setDentistInfo({
            name: data.name || 'DR. JOSELITO S. REYES',
            title: data.title || 'DENTIST II',
            signatureUrl: data.signatureUrl || ''
          });
        }
      } else {
        console.error('[DentalExaminationReport] Dentist settings fetch failed:', response.status);
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

      const toothData = examination?.toothData || {};
      const extractedRestoration = extractToothConditions(toothData, ['Filled', 'Caries']);
      const extractedExtraction = extractToothConditions(toothData, ['Missing', 'Extracted']);

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
  const logoUrl = useDynamicBrandingLogo();

  const handleRestoration = useCallback((v) => setRestoration(v), []);
  const handleExtraction = useCallback((v) => setExtraction(v), []);
  const toggleTreatment = (key) => {
    if (readOnly) return;
    setTreatments(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const handleTreatmentRemark = (key, val) => setTreatmentRemarks(prev => ({ ...prev, [key]: val }));

  if (!examination) return null;

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

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return currentDate;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return currentDate;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
  };
  const examDate = formatDateOnly(examination.examDate);

  const shortenCourse = (courseName) => {
    if (!courseName) return '';
    const courseMap = {
      'Bachelor of Science in Information Technology': 'BSIT',
      'Bachelor of Science in Information System': 'BSIS',
      'Bachelor of Science in Computer Engineering': 'BSCpE',
      'Bachelor of Science in Industrial Engineering': 'BSIE',
      'Bachelor of Science in Entrepreneurship': 'BSEntrep',
      'Bachelor of Science in Public Administration': 'BSPA',
      'Bachelor of Science in Office Administration': 'BSOA',
      'Bachelor of Science in Business Administration Major in Human Resource Development Management': 'BSBA-HRDM',
      'Bachelor of Science in Business Administration Major in Financial Management': 'BSBA-FM',
      'Bachelor of Science in Business Administration Major in Marketing Management': 'BSBA-MM',
      'Bachelor of Science in Economics': 'BSEcon',
      'Bachelor of Arts in Communication': 'BAC',
      'Bachelor of Science in Psychology': 'BSPsych',
      'Bachelor of Arts in Political Science': 'BAPolSci',
      'Bachelor of Science in Tourism Management': 'BSTM',
      'Bachelor of Science in Hospitality Management': 'BSHM',
      'Bachelor of Science in Accountancy': 'BSA',
      'Bachelor of Science in Accountancy Information System': 'BSAIS',
      'Bachelor of Science in Management Accounting': 'BSMA',
      'Bachelor of Secondary Education Major in English': 'BSE-Eng',
      'Bachelor of Secondary Education Major in Filipino': 'BSE-Fil',
      'Bachelor of Secondary Education Major in Math': 'BSE-Math',
      'Bachelor of Secondary Education Major in Science': 'BSE-Sci',
      'Bachelor of Secondary Education Major in Social Studies': 'BSE-SS',
      'Bachelor of Elementary Education': 'BEEd',
      'Bachelor of Technical-Vocational Teacher Education': 'BTVTEd',
      'Bachelor of Special Needs Education': 'BSNEd',
      'Bachelor of Science in Physical Education': 'BSPE',
      'Bachelor of Science in Sports Science': 'BSS',
      'Bachelor of Science in Nursing': 'BSN',
    };

    const trimmed = courseName.trim();
    if (courseMap[trimmed]) return courseMap[trimmed];
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
    const exactMatch = Object.keys(courseMap).find(
      k => k.toLowerCase().replace(/\s+/g, ' ') === normalized
    );
    if (exactMatch) return courseMap[exactMatch];

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

    return trimmed;
  };

  const courseYearSectionValue = shortenCourse(yearSection || program);

  // ── PDF Generation (compact A4) ─────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [215.9, 330.2] });
      const W = 215.9;
      const mar = 18;
      const cw = W - mar * 2;
      let y = 14;

      const ln = (n = 1, h = 5) => { y += n * h; };

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

        doc.setFontSize(fontSize);
        lineHeight = fontSize * 0.52;
        const maxLines = Math.max(1, Math.floor((maxHeight - vPadding) / lineHeight));
        if (lines.length > maxLines) {
          lines = lines.slice(0, maxLines);
          lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+$/, '') + ' …';
        }

        return { lines, fontSize, lineHeight };
      };

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

      // Load the active branding logo and dentist signature in parallel.
      const [logo, sigImage] = await Promise.all([
        loadImageForPdf(logoUrl, DEFAULT_LOGO_URL),
        dentistInfo.signatureUrl
          ? loadImageForPdf(dentistInfo.signatureUrl)
          : Promise.resolve(null),
      ]);

      if (logo && logo.naturalWidth > 0) {
        try {
          doc.addImage(
            logo,
            getPdfImageFormat(logo.src || logoUrl),
            mar,
            y - 2,
            16,
            16
          );
        } catch (e) {
          console.warn('Error adding dynamic logo to PDF:', e);
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
      const indentMm = 10;
      const spaceW = doc.getTextWidth(' ');
      const numSpaces = Math.max(1, Math.round(indentMm / spaceW));
      const splitPara = doc.splitTextToSize(' '.repeat(numSpaces) + para, cw);
      doc.text(splitPara, mar, y);
      ln(1, 20);

      // Findings: two columns
      const colGap = 8;
      const colW = (cw - colGap) / 2;
      const restColX = mar;
      const extColX = mar + colW + colGap;

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
          const detailW = opts.detailWidth || 60;
          const lineText = [opts.detailValue, opts.remark].filter(Boolean).join(' — ');
          field(lineText, cursorX, detailW, y);
          cursorX += detailW + 4;
        } else if (opts.remark) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(80, 80, 80);
          doc.text(`(${opts.remark})`, cursorX, y, { baseline: 'bottom' });
        }
      };

      // Row 1
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

      ln(1, 8);

      // ── School Dentist Signature Block ──────────────────────────────────
      const sigBlockW = 55;
      const docSigX = W - mar - sigBlockW;
      const sigCenterX = docSigX + sigBlockW / 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Very Truly Yours,', sigCenterX, y, { align: 'center', baseline: 'bottom' });
      ln(1, 12);

      // 1. Digital Signature Image (placed above name)
      if (sigImage && sigImage.complete && sigImage.naturalWidth > 0) {
        const sigMaxW = 38;
        const sigMaxH = 12;
        const sigAspect = sigImage.naturalWidth / sigImage.naturalHeight;
        let drawW = sigMaxW, drawH = sigMaxW / sigAspect;
        if (drawH > sigMaxH) { drawH = sigMaxH; drawW = sigMaxH * sigAspect; }
        const sigFormat = /\.(jpe?g)(\?|$)/i.test(dentistInfo.signatureUrl) ? 'JPEG' : 'PNG';
        try {
          doc.addImage(sigImage, sigFormat, sigCenterX - drawW / 2, y - drawH, drawW, drawH);
        } catch (e) {
          console.warn('Error adding signature to PDF:', e);
        }
      }

      // 2. Dentist Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(dentistInfo.name, sigCenterX, y, { align: 'center', baseline: 'bottom' });

      // 3. Line directly UNDER the dentist's name
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(docSigX, y + 1.2, W - mar, y + 1.2);

      // 4. Dentist Position/Title
      ln(1, 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(dentistInfo.title, sigCenterX, y, { align: 'center', baseline: 'bottom' });

      ln(1, 8);

      // ── Student Info Block ──────────────────────────────────────────────
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

ln(1, 13);
const famSigX = W - mar - 50;

doc.setDrawColor(15, 23, 42);
doc.line(famSigX, y, W - mar, y);

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(15, 23, 42);
doc.text(
  'Signature of Family Dentist',
  famSigX + 25,
  y + 4,
  { align: 'center' }
);

// Footer text
ln(1, 8);

doc.setFont('helvetica', 'bold');
doc.setFontSize(7);
doc.setTextColor(180, 40, 40);
doc.text(
  'NOTE: ALWAYS PRESENT THIS FORM (SCF NO. 3) EVERY TIME YOU ASK TO SIGN YOUR CLEARANCE AT THE END OF EVERY SEMESTER.',
  W / 2,
  y,
  { align: 'center' }
);

ln(1, 5);

doc.setFont('times', 'italic');
doc.setFontSize(8);
doc.setTextColor(100, 100, 100);
doc.text(
  '"Primed to Lead and Serve for Progress"',
  W / 2,
  y,
  { align: 'center' }
);

// Metadata Table
ln(1, 5);
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
        if (i === 1) doc.text('2', (cols[1] + cols[2]) / 2, tY + tH2 / 2 + 1, { align: 'center', baseline: 'middle' });
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
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '36px 42px', marginTop: 20, position: 'relative', overflowX: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, paddingBottom: 14 }}>
          <div style={{ width: 56, height: 56, flexShrink: 0 }}>
            {logoUrl ? (
<img
  src={logoUrl || fallbackLogo}
  alt="PLSP Logo"
  onError={(event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallbackLogo;
  }}
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  }}
/>
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#f1f5f9', borderRadius: '50%' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
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
          <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Dear Mr./Ms.</span>
            <TextInput value={patientFullName} readOnly={true} width="300px" style={{ fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #466460' }} />
          </div>
          <p style={{ textAlign: 'justify', textIndent: '40px', marginTop: 0 }}>
            We would like to inform you that we are conducting a routine dental examination to all our students to determine their oral health status and promote proper dental health care. We have given your son/daughter a dental check-up and below are the following findings and recommendations.
          </p>
        </div>

        {/* Findings Sections */}
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
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
          <div style={{ textAlign: 'center', minWidth: 200, maxWidth: '100%' }}>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, color: '#334155', marginBottom: 8 }}>Very Truly Yours,</div>

            {dentistInfo.signatureUrl && (
              <img
                src={dentistInfo.signatureUrl}
                alt="Dentist's signature"
                style={{ maxHeight: 48, maxWidth: 180, objectFit: 'contain', marginBottom: -6 }}
              />
            )}

            <div style={{ borderBottom: '1px solid #0f172a', paddingBottom: 4, marginBottom: 4, fontFamily: 'helvetica, sans-serif', fontWeight: 800, fontSize: 12, color: '#0f172a', wordBreak: 'break-word' }}>
              {dentistInfo.name}
            </div>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 600, fontSize: 11, color: '#475569' }}>{dentistInfo.title}</div>
          </div>
        </div>

        {/* Student Data Block */}
        <div style={{ marginTop: 40, padding: '24px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 120, flexShrink: 0 }}>Name of Student</span>
              <TextInput value={fullName} readOnly={readOnly} width="100%" />
            </div>
            <div></div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 120, flexShrink: 0 }}>Course/Year/Section</span>
              <TextInput value={courseYearSectionValue} readOnly={readOnly} width="100%" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 80, flexShrink: 0 }}>Grade Level</span>
              <TextInput value={gradeLevel} readOnly={readOnly} width="100%" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 120, flexShrink: 0 }}>Name of Family Dentist</span>
              <TextInput value={familyDentist} onChange={setFamilyDentist} readOnly={readOnly} width="100%" />
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 140, flexShrink: 0 }}>Treatment Complete</span>
              <TextInput
                value={status.complete ? '✓' : ''}
                onChange={() => !readOnly && setStatus(s => ({ ...s, complete: !s.complete }))}
                readOnly={readOnly}
                width="100px"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 140, flexShrink: 0 }}>Not Completed</span>
              <TextInput
                value={status.notCompleted ? '✓' : ''}
                onChange={() => !readOnly && setStatus(s => ({ ...s, notCompleted: !s.notCompleted }))}
                readOnly={readOnly}
                width="100px"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
              <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 12, minWidth: 140, flexShrink: 0 }}>Follow-up</span>
              <TextInput
                value={status.followUp}
                onChange={(v) => setStatus(s => ({ ...s, followUp: v }))}
                readOnly={readOnly}
                width="180px"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 30 }}>
             <div style={{ textAlign: 'center', minWidth: 200, maxWidth: '100%' }}>
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
        <table style={{ width: '100%', marginTop: 24, fontSize: 9, color: '#94a3b8', borderCollapse: 'collapse', fontFamily: 'helvetica, sans-serif', tableLayout: 'fixed' }}>
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

        {/* Action buttons */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
              border: '1px solid #cbd5e1', cursor: downloading ? 'not-allowed' : 'pointer',
              background: '#fff', color: '#475569',
              opacity: downloading ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            {downloading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Generating PDF...
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-pdf" style={{ color: '#dc2626' }}></i> Export PDF
              </>
            )}
          </button>

          {!readOnly && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onEdit}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="fa-solid fa-pen-to-square"></i> Edit Report
              </button>
              <button
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #e07a5f, #c96a4f)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 4px rgba(224, 122, 95, 0.2)' }}
              >
                <i className="fa-solid fa-check-double"></i> Save & Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DentalExaminationReport;