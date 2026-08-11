// frontend/src/components/admin/DoctorSettings.jsx
import React, { useState, useEffect } from 'react';

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
    ptrNo: ''
  });
  const [isLoading, setIsLoading] = useState(false);

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
          setFormData(data);
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
        body: JSON.stringify(formData)
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