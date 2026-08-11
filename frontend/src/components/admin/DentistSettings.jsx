// C:\Users\HP\MediTrack\frontend\src\components\admin\DentistSettings.jsx
import React, { useState, useEffect, useRef } from 'react';

// ─── Snackbar Component ───────────────────────────────────────────────────────
const Snackbar = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl text-white text-sm font-semibold flex items-center gap-3 z-50 transition-all ${type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 text-xl leading-none px-1 outline-none"
      >
        &times;
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DentistSettings = () => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    signatureUrl: ''
  });

  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Fetch existing settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/dentist');
        if (response.ok) {
          const data = await response.json();
          setFormData(data);
          if (data.signatureUrl) {
            setSignaturePreview(data.signatureUrl);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dentist settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
      }
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Update text fields
      const response = await fetch('/api/settings/dentist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          title: formData.title
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update text settings');
      }

      // 2. If a new signature image was picked, upload it
      if (signatureFile) {
        const uploadData = new FormData();
        uploadData.append('signature', signatureFile);

        const sigResponse = await fetch('/api/settings/dentist/signature', {
          method: 'POST',
          body: uploadData
        });

        if (!sigResponse.ok) {
          throw new Error('Failed to upload signature file');
        }

        const sigResult = await sigResponse.json();
        setFormData(prev => ({ ...prev, signatureUrl: sigResult.signatureUrl }));
        setSignatureFile(null);
      }

      showToast('Dentist settings updated successfully!', 'success');
    } catch (error) {
      console.error('Update error:', error);
      showToast('An error occurred while saving details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 relative">
      {/* Floating Snackbar */}
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}

      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">School Dentist Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Update the dentist credentials and signature displayed on the Dental Examination Reports.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
            Full Name (with Title)
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="e.g. DR. JOSELITO S. REYES"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors uppercase"
            required
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1">
            Position / Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            placeholder="e.g. DENTIST II"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
            required
          />
        </div>

        {/* Digital Signature Upload Section */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Digital Signature
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Upload a transparent PNG of the dentist's signature. This appears above the name on every generated dental report.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex items-center gap-4">
            {signaturePreview ? (
              <div className="w-48 h-20 border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2 bg-slate-50">
                <img
                  src={signaturePreview}
                  alt="Dentist Signature"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-20 border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2 bg-slate-50 text-xs text-slate-400">
                No signature uploaded
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {signaturePreview ? 'Choose a different file' : 'Upload Signature'}
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 focus:ring-4 focus:ring-slate-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Saving...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DentistSettings;