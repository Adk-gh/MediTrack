// frontend/src/components/MedicalCertificate.jsx
import React, { useState, useCallback, memo, useEffect } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '../supabase';

// ── Stable input components (memoized so they never re-mount on parent re-render)
const DoctorTextarea = memo(({ value, onChange, placeholder, readOnly }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    rows={3}
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

const RemarksTextarea = memo(({ value, onChange, placeholder, readOnly }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    rows={3}
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

// ── Main component
export const MedicalCertificate = ({ examination, onSubmit, onEdit, readOnly = false }) => {
  const [finding1, setFinding1] = useState(examination?.finding1 || '');
  const [remarks,  setRemarks]  = useState(examination?.remarks  || '');
  const [isFit,            setIsFit]           = useState(examination?.isFit           ?? true);
  const [isNormalFindings, setIsNormalFindings] = useState(examination?.isNormalFindings ?? true);
  const [downloading, setDownloading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  // ── Fetch Logo from Supabase Storage ──────────────────────────────────────
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('images')
          .getPublicUrl('plsp-logo.jpg');
        if (error) throw error;
        setLogoUrl(data.publicUrl);
      } catch (error) {
        console.error('[MedicalCertificate] Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

  const handleFinding1 = useCallback((v) => setFinding1(v), []);
  const handleRemarks  = useCallback((v) => setRemarks(v),  []);

  if (!examination) return null;

  // ── Field resolution ────────────────────────────────────────────────────
  const formatName = (name) => {
    if (!name) return { first: '', last: '' };
    const parts = name.split(', ');
    return { last: parts[0] || '', first: parts[1] || '' };
  };
  const { first, last } = formatName(examination.patientName);
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const fullName    = [first, last].filter(Boolean).join(' ') || '';
  const age         = String(examination.age || '');
  const sex         = examination.sex || examination.gender || '';
  const address     = examination.address || examination.homeAddress || '';
  const yearSection =
    examination.yearSection ||
    [examination.year || examination.yearLevel, examination.section].filter(Boolean).join(' - ') || '';
  const program     = examination.course || examination.program || '';
  const examDate    = examination.examDate || currentDate;

  // ── PDF Generation (compact A4) ─────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W   = 210;
      const mar = 18;
      const cw  = W - mar * 2;
      let   y   = 14;

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
        doc.setDrawColor(70, 100, 96);
        doc.setLineWidth(0.45);
        doc.rect(x, cy - 3.4, 3.8, 3.8);
        if (checked) {
          doc.setFillColor(70, 100, 96);
          doc.rect(x + 0.4, cy - 3.0, 3.0, 3.0, 'F');
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          doc.line(x + 0.9, cy - 1.5, x + 1.7, cy - 0.7);
          doc.line(x + 1.7, cy - 0.7, x + 3.2, cy - 2.8);
        }
      };

      const textBox = (text, x, bW, startY, lineCount = 2) => {
        const spacing = 6;
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.25);
        for (let i = 0; i < lineCount; i++) {
          doc.line(x, startY + i * spacing, x + bW, startY + i * spacing);
        }
        if (text) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          const wrapped = doc.splitTextToSize(text, bW - 4);
          wrapped.slice(0, lineCount).forEach((line, i) => {
            doc.text(line, x + 2, startY + i * spacing - 1.2);
          });
        }
      };

      const logo = new Image();
      logo.crossOrigin = 'Anonymous';
      logo.src = logoUrl || '/plsp-logo.jpg';

      await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = () => {
          console.warn('Could not load logo for PDF generation');
          resolve();
        };
      });

      if (logo.complete && logo.naturalWidth > 0) {
        doc.addImage(logo, 'JPEG', mar, y - 2, 16, 16);
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
      doc.text('Brgy. San Jose, San Pablo City  ·  Tel No.: (049) 536-7830  ·  plspofficial@plsp.edu.ph', mar + 20, y + 12);

      ln(1, 18);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(mar, y, W - mar, y);
      ln(1, 7);

      doc.setFont('times', 'bolditalic');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('MEDICAL CERTIFICATE', W / 2, y, { align: 'center', baseline: 'bottom' });
      ln(1, 2.5);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(W / 2 - 33, y, W / 2 + 33, y);
      ln(1, 9);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('To whom it May Concern:', mar, y);
      ln(1, 8);

      const sz    = 9;
      const lineH = 7.5;
      const nameW = Math.max(42, doc.getStringUnitWidth(fullName || 'XXXXXXXXXXXXXXXXX') * sz / doc.internal.scaleFactor + 6);
      const ageW  = Math.max(10, doc.getStringUnitWidth(age || 'XX') * sz / doc.internal.scaleFactor + 4);
      const tw = (txt, size = sz) => doc.getStringUnitWidth(txt) * size / doc.internal.scaleFactor;
      const genderSuffix  = '\u00A0(Gender),';
      const genderSuffixW = tw(genderSuffix);
      const yo            = '\u00A0y/o\u00A0';
      const yoW           = tw(yo);
      const prefixL1      = 'This is to certify that Mr./Ms\u00A0';
      const prefixL1W     = tw(prefixL1);
      const sexW          = Math.max(18, tw(sex || 'Female') + 6);
      const nameWfull     = (W - mar) - mar - prefixL1W - ageW - yoW - sexW - genderSuffixW - 2;
      const nameWfinal    = Math.max(nameW, nameWfull);

      let cx = mar;
      cx = itext(prefixL1, cx, y, 'normal', sz);
      field(fullName, cx, nameWfinal, y); cx += nameWfinal;
      cx = itext(yo, cx, y, 'normal', sz);
      field(age, cx, ageW, y); cx += ageW;
      field(sex, cx, sexW, y); cx += sexW;
      itext(genderSuffix, cx, y, 'normal', sz);
      ln(1, lineH);

      cx = mar;
      cx = itext('residing at\u00A0', cx, y, 'normal', sz);
      field(address, cx, (W - mar) - cx, y);
      ln(1, lineH);

      const l3suffix  = '\u00A0(Course/Year/Section) student';
      const l3suffixW = tw(l3suffix);
      const l3prefix  = 'and currently a\u00A0';
      const l3prefixW = tw(l3prefix);
      const ysW       = Math.max(22, tw(yearSection || 'XX') + 6);
      const progWfull = (W - mar) - mar - l3prefixW - ysW - l3suffixW - 2;
      const progWfinal = Math.max(progWfull, tw(program || 'XXXXXXXXXXXXXXXXXX') + 6);

      cx = mar;
      cx = itext(l3prefix, cx, y, 'normal', sz);
      field(program, cx, progWfinal, y); cx += progWfinal;
      cx = itext('\u00A0', cx, y, 'normal', sz);
      field(yearSection, cx, ysW, y); cx += ysW;
      itext(l3suffix, cx, y, 'normal', sz);
      ln(1, lineH);

      cx = mar;
      cx = itext('was seen and examined by the undersigned this\u00A0', cx, y, 'normal', sz);
      const dateW = Math.max(32, doc.getStringUnitWidth(examDate || 'XXXXXXXXXXXXXX') * sz / doc.internal.scaleFactor + 6);
      field(examDate, cx, dateW, y);
      ln(1, 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('PERTINENT FINDING:', mar, y);
      ln(1, 6);

      checkbox(mar, y, isNormalFindings);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('ESSENTIALLY NORMAL FINDINGS AT DATE AND TIME OF EXAMINATION', mar + 5.5, y, { baseline: 'bottom' });
      ln(1, 6);
      textBox(finding1, mar, cw, y, 2);
      ln(1, 14);

      checkbox(mar, y, isFit);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('PHYSICALLY FIT / FIT TO JOIN OFF CAMPUS ACTIVITY', mar + 5.5, y, { baseline: 'bottom' });
      ln(1, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('REMARKS:', mar, y);
      ln(1, 5);
      textBox(remarks, mar, cw, y, 2);
      ln(1, 18);

      const sigX = W - mar - 56;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(sigX, y, W - mar, y);
      ln(1, 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('CAREN NAVATA JOSE M.D.', (sigX + W - mar) / 2, y, { align: 'center', baseline: 'bottom' });
      ln(1, 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Medical Officer III', (sigX + W - mar) / 2, y, { align: 'center', baseline: 'bottom' });
      ln(1, 4);
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text('License no. 0114665', (sigX + W - mar) / 2, y, { align: 'center', baseline: 'bottom' });
      ln(1, 3.5);
      doc.text('PTR no. 9978569', (sigX + W - mar) / 2, y, { align: 'center', baseline: 'bottom' });
      ln(1, 11);

      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('"Primed to Lead and Serve for Progress"', W / 2, y, { align: 'center', baseline: 'bottom' });
      ln(1, 8);

      const tH   = 6.5;
      const tY   = y;
      const cols = [mar, mar + 34, mar + 56, mar + 100, mar + 136, W - mar];
      const cells = ['PLSP-OSDS-HSO', 'Revision No.', 'Effective Date', 'February 2023', 'Page 1 of 1'];
      doc.setLineWidth(0.3);
      doc.setDrawColor(180, 180, 180);
      doc.rect(cols[0], tY, cols[5] - cols[0], tH);
      for (let i = 1; i < 5; i++) doc.line(cols[i], tY, cols[i], tY + tH);
      cells.forEach((cell, i) => {
        doc.setFont('helvetica', (i === 0 || i === 2) ? 'bold' : 'normal');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text(cell, (cols[i] + cols[i + 1]) / 2, tY + tH / 2 + 1, { align: 'center', baseline: 'middle' });
      });

      const safeName = (examination.patientName || 'MedicalCertificate').replace(/[^a-z0-9_\-]/gi, '_');
      doc.save(`${safeName}_MedicalCertificate.pdf`);
    } catch (err) {
      console.error('[MedicalCertificate] PDF error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        ...examination,
        remarks,
        isFit,
        isNormalFindings,
        finding1,
        status: 'approved',
      });
    }
  };

  const UL = ({ children, width }) => (
    <span style={{
      display: 'inline-block', borderBottom: '1.5px solid #475569',
      minWidth: width || 100, textAlign: 'center',
      fontWeight: children ? 600 : 400,
      color: children ? '#0f172a' : '#94a3b8',
      fontStyle: children ? 'normal' : 'italic',
      paddingLeft: 4, paddingRight: 4, lineHeight: 1.4, verticalAlign: 'bottom',
    }}>
      {children || '—'}
    </span>
  );

  const sectionLabel = {
    fontFamily: 'helvetica, sans-serif', fontWeight: 700, fontSize: 11,
    color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5,
    margin: '0 0 10px',
  };

  const checkRow = (checked, onToggle, label) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => !readOnly && onToggle(!checked)}
        style={{
          width: 18, height: 18, flexShrink: 0,
          border: '2px solid #466460', borderRadius: 3,
          background: checked ? '#466460' : '#fff',
          cursor: readOnly ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}
      >
        {checked && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: 9 }}></i>}
      </button>
      <span style={{ fontFamily: 'helvetica, sans-serif', fontSize: 10, fontWeight: 700, color: '#0f172a', letterSpacing: 0.3, lineHeight: 1.5 }}>
        {label}
      </span>
    </div>
  );

  // ── Screen render ─────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', fontFamily: 'Georgia, serif', position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #cbd5e1' }}>
          <div style={{ width: 52, height: 52, flexShrink: 0 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="PLSP Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#f1f5f9', borderRadius: '50%' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'helvetica, sans-serif', color: '#1a2e22', letterSpacing: 0.5 }}>PAMANTASAN NG LUNGSOD NG SAN PABLO</div>
            <div style={{ fontSize: 17, fontWeight: 900, fontFamily: 'helvetica, sans-serif', color: '#466460', lineHeight: 1.2 }}>HEALTH SERVICES OFFICE</div>
            <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'helvetica, sans-serif', marginTop: 3 }}>
              Brgy. San Jose, San Pablo City &nbsp;·&nbsp; Tel No.: (049) 536-7830 &nbsp;·&nbsp; plspofficial@plsp.edu.ph
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', margin: '18px 0 22px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 22, color: '#0f172a', margin: 0, letterSpacing: 1 }}>
            MEDICAL CERTIFICATE
          </h1>
          <div style={{ width: 120, height: 2, background: '#0f172a', margin: '6px auto 0' }}></div>
        </div>

        {/* To Whom */}
        <p style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 700, fontSize: 12, color: '#0f172a', marginBottom: 16 }}>
          To whom it May Concern:
        </p>

        {/* Body */}
        <div style={{ fontFamily: 'helvetica, sans-serif', fontSize: 13, color: '#334155', lineHeight: 2.3 }}>
          <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>
            This is to certify that Mr./Ms&nbsp;<UL width={160}>{fullName}</UL>&nbsp;
            <UL width={32}>{age}</UL>&nbsp;y/o&nbsp;
            <UL width={80}>{sex}</UL>&nbsp;(Gender), residing at&nbsp;
            <UL width={220}>{address}</UL>,
          </p>
          <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>
            and currently a&nbsp;<UL width={200}>{program}</UL>&nbsp;
            <UL width={120}>{yearSection}</UL>&nbsp;(Course/Year/Section) student
          </p>
          <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>
            was seen and examined by the undersigned this&nbsp;<UL width={150}>{examDate}</UL>.
          </p>
        </div>

        {/* ── Pertinent Findings ── */}
        <div style={{ marginTop: 24 }}>
          <p style={sectionLabel}>Pertinent Finding:</p>
          <div style={{ marginBottom: 18 }}>
            {checkRow(isNormalFindings, setIsNormalFindings, 'ESSENTIALLY NORMAL FINDINGS AT DATE AND TIME OF EXAMINATION')}
            <DoctorTextarea
              value={finding1}
              onChange={handleFinding1}
              placeholder="Doctor's notes on findings…"
              readOnly={readOnly}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            {checkRow(isFit, setIsFit, 'PHYSICALLY FIT / FIT TO JOIN OFF CAMPUS ACTIVITY')}
          </div>
        </div>

        {/* ── Remarks ── */}
        <div style={{ marginTop: 18 }}>
          <p style={sectionLabel}>Remarks:</p>
          <RemarksTextarea
            value={remarks}
            onChange={handleRemarks}
            placeholder="Doctor's remarks…"
            readOnly={readOnly}
          />
        </div>

        {/* Signature */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 4, marginBottom: 4, fontFamily: 'helvetica, sans-serif', fontWeight: 900, fontSize: 11, color: '#0f172a', textTransform: 'uppercase' }}>
              CAREN NAVATA JOSE M.D.
            </div>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontWeight: 600, fontSize: 10, color: '#0f766e' }}>Medical Officer III</div>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontSize: 9, color: '#64748b', marginTop: 3 }}>License no. 0114665</div>
            <div style={{ fontFamily: 'helvetica, sans-serif', fontSize: 9, color: '#64748b' }}>PTR no. 9978569</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 28, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: '#94a3b8' }}>
          "Primed to Lead and Serve for Progress"
        </div>

        {/* Metadata table */}
        <table style={{ width: '100%', marginTop: 18, fontSize: 9, color: '#94a3b8', borderCollapse: 'collapse', fontFamily: 'helvetica, sans-serif' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center', fontWeight: 700, background: '#f8fafc' }}>PLSP-OSDS-HSO</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center' }}>Revision No.</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center', fontWeight: 700, background: '#f8fafc' }}>Effective Date</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center' }}>February 2023</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center' }}>Page 1 of 1</td>
            </tr>
          </tbody>
        </table>

        {/* --- REFACTORED ACTION BUTTONS --- */}
        <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>

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
                <i className="fa-solid fa-file-arrow-down"></i> Download PDF
              </>
            )}
          </button>

          {!readOnly && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onEdit}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #e07a5f, #c96a4f)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 4px rgba(224, 122, 95, 0.2)' }}
              >
                <i className="fa-solid fa-check-double"></i> Submit & Approve
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default MedicalCertificate;