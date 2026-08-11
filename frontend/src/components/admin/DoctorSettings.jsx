// frontend/src/components/admin/DoctorSettings.jsx
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
export const DoctorSettings = () => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    licenseNo: '',
    ptrNo: '',
    signatureUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingSig, setIsUploadingSig] = useState(false);
  const [sigPreview, setSigPreview] = useState(null); // local preview before the upload completes
  const fileInputRef = useRef(null);

  // Replaced static message state with a toast state
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  // Helper to show and auto-hide the snackbar
  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Fetch existing settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/doctor');
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error('Failed to fetch doctor settings:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/settings/doctor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // If you are using JWT auth
        },
        body: JSON.stringify({
          name: formData.name,
          title: formData.title,
          licenseNo: formData.licenseNo,
          ptrNo: formData.ptrNo
        })
      });

      if (response.ok) {
        showToast('Medical Officer configuration saved successfully!', 'success');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Update error:', error);
      showToast('An error occurred while saving the details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Digital signature upload ──────────────────────────────────────────
  const handleSignatureFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB.', 'error');
      return;
    }

    setSigPreview(URL.createObjectURL(file));
    uploadSignature(file);
  };

  const uploadSignature = async (file) => {
    setIsUploadingSig(true);
    try {
      const body = new FormData();
      body.append('signature', file);

      const response = await fetch('/api/settings/doctor/signature', {
        method: 'POST',
        body
      });

      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();

      setFormData(prev => ({ ...prev, signatureUrl: result.signatureUrl }));
      showToast('Signature uploaded successfully!', 'success');
    } catch (error) {
      console.error('Signature upload error:', error);
      showToast('Failed to upload signature. Please try again.', 'error');
    } finally {
      setIsUploadingSig(false);
    }
  };

  const currentSigSrc = sigPreview || formData.signatureUrl;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 relative">

      {/* Floating Snackbar rendered when toast.show is true */}
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}

      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Medical Officer Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Update the doctor information that appears on the generated Medical Certificates.
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
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. CAREN NAVATA JOSE M.D."
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
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Medical Officer III"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="licenseNo" className="block text-sm font-semibold text-slate-700 mb-1">
              License Number
            </label>
            <input
              type="text"
              id="licenseNo"
              name="licenseNo"
              value={formData.licenseNo}
              onChange={handleChange}
              placeholder="e.g. 0114665"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="ptrNo" className="block text-sm font-semibold text-slate-700 mb-1">
              PTR Number
            </label>
            <input
              type="text"
              id="ptrNo"
              name="ptrNo"
              value={formData.ptrNo}
              onChange={handleChange}
              placeholder="e.g. 9978569"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* ── Digital Signature Upload ── */}
        <div className="pt-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Digital Signature
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Upload a transparent PNG of the doctor's signature. This appears above the name on every generated certificate.
          </p>

          <div className="flex items-center gap-5">
            <div className="w-40 h-20 border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
              {currentSigSrc ? (
                <img src={currentSigSrc} alt="Signature preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400">No signature yet</span>
              )}
            </div>

            <div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                ref={fileInputRef}
                onChange={handleSignatureFileChange}
                className="hidden"
                id="signatureFile"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingSig}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {isUploadingSig ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Uploading...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-upload"></i> {formData.signatureUrl ? 'Replace signature' : 'Upload signature'}
                  </>
                )}
              </button>
            </div>
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

export default DoctorSettings;