import React, { useState, useEffect, useRef } from 'react';

const OCR_SERVICE_URL = (import.meta.env.VITE_OCR_SERVICE_URL || 'http://localhost:5001').replace(/\/$/, '');

export default function OcrSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInstKeyword, setNewInstKeyword] = useState('');
  const [newRoleKeywords, setNewRoleKeywords] = useState({});
  const hasFetched = useRef(false);  // ← stops the fetch loop

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${OCR_SERVICE_URL}/config`);
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch OCR config:", error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${OCR_SERVICE_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error("Server error");
      alert('OCR Configuration saved successfully!');
    } catch (error) {
      alert('Failed to save config. Make sure the OCR server is running.');
    }
    setSaving(false);
  };

  const addInstitutionKeyword = () => {
    if (!newInstKeyword.trim()) return;
    setConfig(prev => ({
      ...prev,
      institution_keywords: [...prev.institution_keywords, newInstKeyword.toUpperCase().trim()]
    }));
    setNewInstKeyword('');
  };

  const removeInstitutionKeyword = (index) => {
    setConfig(prev => ({
      ...prev,
      institution_keywords: prev.institution_keywords.filter((_, i) => i !== index)
    }));
  };

  const addRoleKeyword = (mapIdx) => {
    const value = (newRoleKeywords[mapIdx] || '').trim();
    if (!value) return;
    setConfig(prev => ({
      ...prev,
      role_mappings: prev.role_mappings.map((mapping, i) =>
        i !== mapIdx ? mapping : { ...mapping, keywords: [...mapping.keywords, value.toUpperCase()] }
      )
    }));
    setNewRoleKeywords(prev => ({ ...prev, [mapIdx]: '' }));
  };

  const removeRoleKeyword = (mapIdx, kwIdx) => {
    setConfig(prev => ({
      ...prev,
      role_mappings: prev.role_mappings.map((mapping, i) =>
        i !== mapIdx ? mapping : { ...mapping, keywords: mapping.keywords.filter((_, j) => j !== kwIdx) }
      )
    }));
  };

  if (loading) return <div className="p-6 text-slate-500 text-sm">Loading OCR settings...</div>;

  if (!config) return (
    <div className="p-6 text-red-500 text-sm">
      Failed to connect to OCR Server at: <strong>{OCR_SERVICE_URL}</strong>
      <p className="mt-2 text-xs text-slate-500">Make sure the OCR server is running and CORS is enabled.</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 w-full h-full overflow-y-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">OCR Scanner Configuration</h2>
            <p className="text-xs text-slate-500">Teach the AI engine how to read ID cards by updating keywords.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#466460] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#3a524f] transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-1">Institution Triggers</h3>
          <p className="text-xs text-slate-500 mb-3">
            If the ID contains any of these words, the scanner will capture the rest of the line as the school/company name.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {config.institution_keywords.map((kw, idx) => (
              <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                {kw}
                <button onClick={() => removeInstitutionKeyword(idx)} className="text-emerald-900 hover:text-red-500">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newInstKeyword}
              onChange={e => setNewInstKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInstitutionKeyword()}
              placeholder="e.g. DALUBHASAAN"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#466460]"
            />
            <button onClick={addInstitutionKeyword} className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200">Add</button>
          </div>
        </div>

        <hr className="my-6 border-slate-100" />

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">Role Detection Keywords</h3>
          <p className="text-xs text-slate-500 mb-4">
            Keywords used to assign a role to the scanned ID (e.g. "BSIT" = Student). Order matters — first match wins.
          </p>
          <div className="grid gap-4">
            {config.role_mappings.map((mapping, mapIdx) => (
              <div key={mapIdx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-[#466460] text-sm">
                    {mapping.name}
                    <span className="ml-2 text-xs font-normal text-slate-400">({mapping.id_type})</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {mapping.keywords.map((kw, kwIdx) => (
                    <span key={kwIdx} className="bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5">
                      {kw}
                      <button onClick={() => removeRoleKeyword(mapIdx, kwIdx)} className="hover:text-red-500">✕</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newRoleKeywords[mapIdx] || ''}
                    onChange={e => setNewRoleKeywords(prev => ({ ...prev, [mapIdx]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addRoleKeyword(mapIdx)}
                    placeholder="+ Add Keyword"
                    className="bg-transparent border border-dashed border-slate-300 rounded-md px-2 py-1 text-[11px] w-28 focus:outline-none focus:border-[#466460]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}