// C:\Users\HP\MediTrack\frontend\src\components\MedicalCertificate.jsx
import React, { useState } from 'react';

export const MedicalCertificate = ({ examination, onSubmit, onEdit }) => {
  const [remarks, setRemarks] = useState(examination?.remarks || '');
  const [isFit, setIsFit] = useState(true);
  const [isNormalFindings, setIsNormalFindings] = useState(true);

  if (!examination) return null;

  const formatName = (name) => {
    if (!name) return { first: '', last: '' };
    const parts = name.split(', ');
    return {
      last: parts[0] || '',
      first: parts[1] || ''
    };
  };

  const { first, last } = formatName(examination.patientName);
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        ...examination,
        remarks,
        isFit,
        isNormalFindings,
        status: 'approved'
      });
    }
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl mt-5 relative overflow-hidden">
      {/* Background watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <i className="fa-solid fa-file-medical text-[200px] text-[#466460]/[0.03]"></i>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2 text-[#466460] text-xl font-extrabold">
            <i className="fa-solid fa-house-medical"></i> MediTrack
          </div>
          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">
            Pamantasan ng Lungsod ng San Pablo<br />
            Health Services Office<br />
            Brgy. San Jose, San Pablo City
          </div>
        </div>
        <div className="text-right text-[9px] text-slate-400">
          <p>Tel: (049) 536-7830</p>
          <p>plspofficial@plsp.edu.ph</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight m-0">MEDICAL CERTIFICATE</h1>
        <div className="h-1 w-16 bg-[#e07a5f] mx-auto mt-2 rounded-full"></div>
      </div>

      {/* Certificate Body */}
      <div className="text-slate-700 leading-relaxed relative z-10 text-sm">
        <p className="font-extrabold text-slate-900 mb-4 uppercase tracking-wider text-xs">To whom it may concern:</p>

        <p className="mb-6">
          This is to certify that Mr./Ms. <span className="border-b border-slate-400 inline-block px-1 min-w-[120px] font-semibold">{first} {last}</span>,
          <span className="border-b border-slate-400 inline-block px-1 w-12 text-center font-semibold">{examination.age || '—'}</span> years old,
          <span className="border-b border-slate-400 inline-block px-1 w-20 text-center font-semibold">{examination.gender || 'Male/Female'}</span> (Gender),
          residing at <span className="border-b border-slate-400 inline-block px-1 w-[200px]"></span>
          and currently enrolled as <span className="border-b border-slate-400 inline-block px-1 w-[140px] font-semibold">{examination.program} {examination.year}</span>
          (Course/Year/Section) was seen and examined by the undersigned health officer on this date
          <span className="border-b border-slate-400 inline-block px-1 w-24 text-center font-semibold">{examination.examDate || currentDate}</span>.
        </p>

        <div className="mb-6">
          <p className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider">Pertinent Findings:</p>
          <div className="flex items-center mb-2">
            <button
              type="button"
              onClick={() => setIsNormalFindings(!isNormalFindings)}
              className={`w-5 h-5 border-2 border-[#466460] rounded mr-2 flex items-center justify-center transition-colors ${isNormalFindings ? 'bg-[#466460]' : 'bg-white'}`}
            >
              {isNormalFindings && <i className="fa-solid fa-check text-white text-[10px]"></i>}
            </button>
            <span className="text-xs font-medium">Essentially normal findings at date and time of examination.</span>
          </div>
        </div>

        <div className="mb-6">
          <p className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider">Remarks & Recommendations:</p>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border border-slate-200 bg-slate-50 rounded-lg p-3 text-xs resize-none focus:outline-none focus:border-[#466460] min-h-[80px]"
            placeholder="Enter remarks and recommendations..."
            rows={3}
          />
        </div>

        <div className="flex items-center mb-8">
          <button
            type="button"
            onClick={() => setIsFit(!isFit)}
            className={`w-5 h-5 border-2 border-[#466460] rounded mr-2 flex items-center justify-center transition-colors ${isFit ? 'bg-[#466460]' : 'bg-white'}`}
          >
            {isFit && <i className="fa-solid fa-check text-white text-[10px]"></i>}
          </button>
          <span className="text-xs font-black text-slate-900">PHYSICALLY FIT / FIT TO JOIN OFF-CAMPUS ACTIVITY</span>
        </div>
      </div>

      {/* Signature */}
      <div className="flex justify-end mt-12 relative z-10">
        <div className="text-center w-56">
          <div className="mb-2 font-black text-slate-900 border-b-2 border-slate-900 pb-1 uppercase text-xs">
            Caren Navata Jose, M.D.
          </div>
          <p className="text-xs font-bold text-teal-800 uppercase m-0">Medical Officer III</p>
          <div className="text-[9px] text-slate-500 mt-1">
            <p>License No. 0114665</p>
            <p>PTR No. 9978569</p>
          </div>
        </div>
      </div>

      {/* Footer quote */}
      <div className="mt-12 text-center italic text-slate-400 text-xs font-medium">
        "Primed to Lead and Serve for Progress"
      </div>

      {/* Metadata table */}
      <table className="w-full mt-6 text-[9px] text-slate-400 border-collapse">
        <tbody>
          <tr>
            <td className="border border-slate-200 p-2 text-center font-semibold bg-slate-50">PLSP-OSDS-HSO</td>
            <td className="border border-slate-200 p-2 text-center">Rev. No: 2</td>
            <td className="border border-slate-200 p-2 text-center font-semibold bg-slate-50">Effective Date</td>
            <td className="border border-slate-200 p-2 text-center">February 2023</td>
            <td className="border border-slate-200 p-2 text-center">Page 1 of 1</td>
          </tr>
        </tbody>
      </table>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onEdit}
          className="bg-slate-100 text-slate-600 border-none px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition flex items-center gap-2"
        >
          <i className="fa-solid fa-pen-to-square"></i> Edit Certificate
        </button>
        <button
          onClick={handleSubmit}
          className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-7 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition flex items-center gap-2"
        >
          <i className="fa-solid fa-paper-plane"></i> Submit Approval
        </button>
      </div>
    </div>
  );
};

export default MedicalCertificate;