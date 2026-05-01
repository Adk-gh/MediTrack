// frontend/src/features/admin-clinic/Announcements.jsx
import React, { useState, useEffect, useRef } from 'react';
import * as announcementsService from '../../services/announcements.service';

// ============================================================
// FALLBACK DATA (matches announcements.html)
// ============================================================
const initialAnnouncements = [
  { id: 1, title: "Flu Vaccination Drive",      dept: "All Departments",         date: "2026-04-20", content: "The University Clinic will be conducting a free flu vaccination drive for all students and faculty. Please bring your school ID and wear comfortable clothing." },
  { id: 2, title: "Clinic Schedule Update",     dept: "College of Computing",    date: "2026-04-18", content: "The university clinic will now be open from 7:00 AM to 6:00 PM starting next week. Emergency services remain available 24/7." },
  { id: 3, title: "Health Screening for Athletes", dept: "College of Engineering", date: "2026-04-15", content: "All student athletes are required to undergo mandatory health screening before the upcoming sports season." },
  { id: 4, title: "Mental Health Awareness Month", dept: "College of Arts & Sciences", date: "2026-04-10", content: "In celebration of Mental Health Awareness Month, free counseling sessions will be available throughout April." },
  { id: 5, title: "Dental Check-up Campaign",   dept: "College of Health Sciences", date: "2026-04-05", content: "Free dental check-ups will be available for all registered students. Sign up at the clinic reception." },
];

// ============================================================
// HELPERS
// ============================================================
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (isNaN(Date.parse(dateStr))) return dateStr;
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const todayIso = () => new Date().toISOString().split('T')[0];

// ============================================================
// SNACKBAR
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
    ${visible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-20'}
    ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeMenuId, setActiveMenuId]   = useState(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentEditId, setCurrentEditId]     = useState(null);

  // Form & view data
  const [formData, setFormData] = useState({ title: '', content: '', dept: '' });
  const [viewData, setViewData] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar]   = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer             = useRef(null);

  // ── Load from API ──
  useEffect(() => {
    const load = async () => {
      try {
        const data = await announcementsService.getAllAnnouncements();
        setAnnouncements(data && data.length > 0 ? data : initialAnnouncements);
      } catch (err) {
        console.log('Using fallback data:', err.message);
        setAnnouncements(initialAnnouncements);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = () => setActiveMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Snackbar helper ──
  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  // ── Open create / edit form ──
  const handleOpenForm = (editId = null) => {
    if (editId) {
      const target = announcements.find(a => a.id === editId);
      setFormData({ title: target.title, content: target.content, dept: target.dept || '' });
      setCurrentEditId(editId);
    } else {
      setFormData({ title: '', content: '', dept: '' });
      setCurrentEditId(null);
    }
    setActiveMenuId(null);
    setIsFormModalOpen(true);
  };

  // ── Save (create or update) ──
  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      showSnackbar('Please fill required fields', 'error');
      return;
    }
    const payload = {
      title:   formData.title,
      content: formData.content,
      dept:    formData.dept || 'All Departments',
      date:    todayIso(),
    };

    try {
      if (currentEditId) {
        await announcementsService.updateAnnouncement(currentEditId, payload);
        setAnnouncements(prev => prev.map(a => a.id === currentEditId ? { ...a, ...payload } : a));
        showSnackbar('Announcement updated');
      } else {
        const created = await announcementsService.createAnnouncement(payload);
        setAnnouncements(prev => [{ id: created?.id ?? Date.now(), ...payload }, ...prev]);
        showSnackbar('Announcement posted');
      }
    } catch (_) {
      if (currentEditId) {
        setAnnouncements(prev => prev.map(a => a.id === currentEditId ? { ...a, ...payload } : a));
        showSnackbar('Announcement updated');
      } else {
        setAnnouncements(prev => [{ id: Date.now(), ...payload }, ...prev]);
        showSnackbar('Announcement posted');
      }
    }
    setIsFormModalOpen(false);
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) { setActiveMenuId(null); return; }
    try { await announcementsService.deleteAnnouncement(id); } catch (_) {}
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    setActiveMenuId(null);
    showSnackbar('Announcement deleted');
  };

  // ── View ──
  const handleView = (item) => {
    setViewData(item);
    setIsViewModalOpen(true);
  };

  // ── Shared input style ──
  const inputCls = 'w-full mt-2.5 p-2.5 border border-[#e2e8f0] rounded-xl text-[13px] outline-none focus:border-[#466460] box-border';

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="bg-white min-h-[calc(100vh-120px)] animate-[fadeInSlide_0.4s_ease-out_forwards]">

      {/* ── Header Bar ── */}
      <div className="flex justify-between items-center px-5 pt-4 pb-3 border-b-2 border-[#e0eceb]">
        <h3 className="font-bold text-base text-[#466460]">Announcements</h3>
        <button
          onClick={() => handleOpenForm()}
          className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-3.5 py-1.5 rounded-full font-semibold text-[11px] cursor-pointer hover:opacity-90 transition-opacity"
        >
          + New Post
        </button>
      </div>

      {/* ── Announcement List ── */}
      <div className="px-5 py-4 space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No announcements yet.</div>
        ) : (
          announcements.map(item => (
            <div
              key={item.id}
              onClick={() => handleView(item)}
              className="bg-white p-4 rounded-xl border border-[#e2e8f0] relative cursor-pointer hover:shadow-md hover:border-[#8aacaa] transition-all"
            >
              {/* Left accent border */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#e07a5f] to-[#e9c46a] rounded-l-xl pointer-events-none"></div>

              {/* 3-dot menu */}
              <div className="absolute top-2.5 right-3" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                  className="text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-sm"
                >
                  <i className="fa-solid fa-ellipsis"></i>
                </button>
                {activeMenuId === item.id && (
                  <div className="absolute right-0 top-9 bg-white border border-[#e2e8f0] shadow-xl rounded-lg overflow-hidden z-20 w-28 py-1">
                    <button
                      onClick={() => handleOpenForm(item.id)}
                      className="w-full text-left px-4 py-2 text-[11px] hover:bg-[#e0eceb] text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-full text-left px-4 py-2 text-[11px] hover:bg-red-50 text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-[#466460] font-bold text-[14px] mb-1 pr-10">{item.title}</h3>
              <div className="text-[10px] text-slate-400 mb-1">{formatDate(item.date)}</div>
              <span className="inline-block bg-[#e0eceb] text-[#466460] text-[9px] font-semibold px-2 py-0.5 rounded-full mb-1.5">
                {item.dept}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.content}</p>
            </div>
          ))
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {isFormModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000]"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl w-full max-w-md animate-[fadeInSlide_0.2s_ease-out_forwards]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#466460] mb-4">
              {currentEditId ? 'Edit Announcement' : 'Create Announcement'}
            </h3>
            <input
              type="text"
              placeholder="Title"
              className={inputCls}
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
            />
            <textarea
              placeholder="Details..."
              rows={3}
              className={`${inputCls} resize-none`}
              value={formData.content}
              onChange={e => setFormData(f => ({ ...f, content: e.target.value }))}
            />
            <select
              className={`${inputCls} bg-white`}
              value={formData.dept}
              onChange={e => setFormData(f => ({ ...f, dept: e.target.value }))}
            >
              <option value="">All Departments</option>
              <option>BSIT</option>
              <option>Faculty</option>
              <option>Staff</option>
            </select>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-2.5 rounded-xl font-semibold text-[13px] hover:opacity-90"
              >
                Post
              </button>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="flex-1 bg-[#e2e8f0] text-slate-600 py-2.5 rounded-xl font-semibold text-[13px] hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {isViewModalOpen && viewData && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000]"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl w-full max-w-md animate-[fadeInSlide_0.2s_ease-out_forwards]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#466460] mb-1">{viewData.title}</h3>
            <span className="inline-block bg-[#e0eceb] text-[#466460] text-[9px] font-semibold px-2 py-0.5 rounded-full mb-1">
              {viewData.dept}
            </span>
            <div className="text-[10px] text-slate-400 mb-3">{formatDate(viewData.date)}</div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{viewData.content}</p>
            </div>
            <div className="mt-5">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="w-full bg-[#e2e8f0] text-slate-600 py-2.5 rounded-xl font-semibold text-[13px] hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Announcements;