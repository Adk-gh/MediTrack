import React, { useState } from 'react';

export default function RecordsUsers() {
  const records = [
    { date: "April 27, 2026", title: "Medical Clearance", desc: "Patient is clinically fit for academic internship and physical education activities." },
    { date: "April 27, 2026", title: "Dental Clearance", desc: "Routine dental examination completed." },
  ];

  return (
    <div className="p-5 animate-fadeIn">
      <h2 className="text-xl font-black text-slate-800 mb-2">Medical Records</h2>
      <p className="text-xs text-slate-500 mb-5">Official health certifications for academic and activity clearance.</p>
      <div className="space-y-3">
        {records.map((record, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-3xl p-4 flex justify-between items-center cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 transition-all">
            <div>
              <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{record.date}</div>
              <div className="text-sm font-bold text-slate-800">{record.title}</div>
            </div>
            <div className="w-8 h-8 bg-[#e8f5ee] rounded-2.5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="2" className="w-4 h-4">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}