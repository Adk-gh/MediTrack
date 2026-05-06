// frontend/src/features/admin-clinic/Announcements.jsx
import React, { useState, useEffect, useRef } from 'react';
import * as announcementsService from '../../services/announcements.service';

// ============================================================
// FALLBACK DATA
// ============================================================
const initialAnnouncements = [
  { id: 1, title: "Flu Vaccination Drive",         dept: "All Departments",          date: "2026-04-20", content: "The University Clinic will be conducting a free flu vaccination drive for all students and faculty. Please bring your school ID and wear comfortable clothing.", category: "Vaccination", priority: "high",   image: null },
  { id: 2, title: "Clinic Schedule Update",        dept: "College of Computing",      date: "2026-04-18", content: "The university clinic will now be open from 7:00 AM to 6:00 PM starting next week. Emergency services remain available 24/7.",                        category: "General",     priority: "normal", image: null },
  { id: 3, title: "Health Screening for Athletes", dept: "College of Engineering",    date: "2026-04-15", content: "All student athletes are required to undergo mandatory health screening before the upcoming sports season.",                                         category: "Screening",   priority: "normal", image: null },
  { id: 4, title: "Mental Health Awareness Month", dept: "College of Arts & Sciences",date: "2026-04-10", content: "In celebration of Mental Health Awareness Month, free counseling sessions will be available throughout April.",                                       category: "Mental Health",priority: "normal",image: null },
  { id: 5, title: "Dental Check-up Campaign",      dept: "College of Health Sciences",date: "2026-04-05", content: "Free dental check-ups will be available for all registered students. Sign up at the clinic reception.",                                              category: "Dental",      priority: "normal", image: null },
];

const DEPARTMENTS = [
  'All Departments',
  'College of Computing',
  'College of Engineering',
  'College of Arts & Sciences',
  'College of Health Sciences',
  'College of Education',
  'College of Business',
  'Faculty',
  'Staff',
];

const CATEGORIES = [
  'General',
  'Vaccination',
  'Screening',
  'Dental',
  'Mental Health',
  'Emergency',
  'Schedule',
  'Event',
];

const CATEGORY_COLORS = {
  General:       'bg-slate-100 text-slate-600',
  Vaccination:   'bg-blue-100 text-blue-700',
  Screening:     'bg-purple-100 text-purple-700',
  Dental:        'bg-cyan-100 text-cyan-700',
  'Mental Health':'bg-pink-100 text-pink-700',
  Emergency:     'bg-red-100 text-red-700',
  Schedule:      'bg-amber-100 text-amber-700',
  Event:         'bg-green-100 text-green-700',
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent',  color: 'bg-red-500',    dot: 'bg-red-500'    },
  high:   { label: 'High',    color: 'bg-orange-400', dot: 'bg-orange-400' },
  normal: { label: 'Normal',  color: 'bg-slate-300',  dot: 'bg-slate-400'  },
};

// ============================================================
// HELPERS
// ============================================================
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (isNaN(Date.parse(dateStr))) return dateStr;
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const todayIso = () => new Date().toISOString().split('T')[0];

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const EMPTY_FORM = {
  title:    '',
  content:  '',
  dept:     'All Departments',
  category: 'General',
  priority: 'normal',
  location: '',
  contactPerson: '',
  contactEmail:  '',
  image:    null,   // base64 data URL or existing URL
  imageFile: null,  // raw File object (only during editing)
};

// ============================================================
// SNACKBAR
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-8 left-1/2 z-[9999] flex w-[90%] sm:w-auto max-w-md items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
    ${visible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-24 opacity-0'}
    ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}>
    <i className={`fa-solid shrink-0 ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    <span className="truncate">{message}</span>
  </div>
);

// ============================================================
// IMAGE DROP ZONE
// ============================================================
const ImageDropZone = ({ value, onChange, onClear }) => {
  const inputRef   = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB.');
      return;
    }
    const b64 = await toBase64(file);
    onChange(b64, file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="mt-2.5 w-full">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-[#e2e8f0] group">
          <img src={value} alt="Preview" className="w-full max-h-52 object-cover" />
          <div className="absolute inset-0 bg-black/0 sm:group-hover:bg-black/30 transition-all flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={onClear}
              className="bg-red-500 text-white text-[11px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-red-600 transition-colors shadow-lg sm:shadow-none"
            >
              <i className="fa-solid fa-trash-can"></i> Remove Image
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            drag ? 'border-[#466460] bg-[#e0eceb]/40' : 'border-[#d1e7e5] hover:border-[#466460] hover:bg-[#f0f7f6]'
          }`}
        >
          <i className="fa-solid fa-image text-2xl text-slate-300 mb-2 block"></i>
          <p className="text-[12px] text-slate-500 font-medium">Drop an image here, or <span className="text-[#466460] underline">browse</span></p>
          <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, GIF, WEBP — max 5 MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeMenuId, setActiveMenuId]   = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentEditId, setCurrentEditId]     = useState(null);

  // Form & view data
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [viewData, setViewData] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer           = useRef(null);

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
      setFormData({
        title:         target.title        || '',
        content:       target.content      || '',
        dept:          target.dept         || 'All Departments',
        category:      target.category     || 'General',
        priority:      target.priority     || 'normal',
        location:      target.location     || '',
        contactPerson: target.contactPerson || '',
        contactEmail:  target.contactEmail  || '',
        image:         target.image        || null,
        imageFile:     null,
      });
      setCurrentEditId(editId);
    } else {
      setFormData(EMPTY_FORM);
      setCurrentEditId(null);
    }
    setActiveMenuId(null);
    setIsFormModalOpen(true);
  };

  // ── Save (create or update) ──
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showSnackbar('Title and content are required', 'error');
      return;
    }
    setFormSaving(true);

    const payload = {
      title:         formData.title.trim(),
      content:       formData.content.trim(),
      dept:          formData.dept          || 'All Departments',
      category:      formData.category      || 'General',
      priority:      formData.priority      || 'normal',
      location:      formData.location.trim(),
      contactPerson: formData.contactPerson.trim(),
      contactEmail:  formData.contactEmail.trim(),
      date:          todayIso(),
      image:         formData.image || null,
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

    setFormSaving(false);
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

  // ── Form field helper ──
  const setField = (key, val) => setFormData(f => ({ ...f, [key]: val }));

  // ── Filtered list ──
  const filtered = announcements.filter(a => {
    const catOk  = filterCategory === 'All' || a.category === filterCategory;
    const priOk  = filterPriority === 'All' || a.priority === filterPriority;
    return catOk && priOk;
  });

  const inputCls = 'w-full mt-1.5 px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white box-border';
  const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-3.5';

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="bg-white min-h-[calc(100vh-120px)] animate-[fadeInSlide_0.4s_ease-out_forwards]">

      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-5 pt-4 pb-3 border-b-2 border-[#e0eceb]">
        <h3 className="font-bold text-base text-[#466460]">Announcements</h3>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="flex-1 sm:flex-none text-[11px] border border-[#e2e8f0] rounded-full px-3 py-2 sm:py-1.5 outline-none focus:border-[#466460] bg-white text-slate-600"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="flex-1 sm:flex-none text-[11px] border border-[#e2e8f0] rounded-full px-3 py-2 sm:py-1.5 outline-none focus:border-[#466460] bg-white text-slate-600"
            >
              <option value="All">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="w-full sm:w-auto bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-4 py-2 sm:py-1.5 rounded-full font-semibold text-[11px] cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[10px]"></i> New Post
          </button>
        </div>
      </div>

      {/* ── Announcement List ── */}
      <div className="px-4 sm:px-5 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No announcements found.</div>
        ) : (
          filtered.map(item => {
            const pri = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
            const catCls = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

            return (
              <div
                key={item.id}
                onClick={() => handleView(item)}
                className="bg-white rounded-xl border border-[#e2e8f0] relative cursor-pointer hover:shadow-md hover:border-[#8aacaa] transition-all overflow-hidden"
              >
                {/* Priority stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${pri.color} pointer-events-none`}></div>

                {/* Image banner (if any) */}
                {item.image && (
                  <div className="ml-[3px] h-32 sm:h-36 overflow-hidden bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-3 sm:p-4 pl-4 sm:pl-5">
                  {/* 3-dot menu */}
                  <div className="absolute top-2.5 right-2 sm:right-3" onClick={e => e.stopPropagation()}>
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
                          className="w-full text-left px-4 py-2 text-[11px] hover:bg-[#e0eceb] text-slate-700 flex items-center gap-2"
                        >
                          <i className="fa-solid fa-pen-to-square text-[10px]"></i> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-full text-left px-4 py-2 text-[11px] hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          <i className="fa-solid fa-trash-can text-[10px]"></i> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tags row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 pr-8">
                    {item.priority !== 'normal' && (
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full text-white ${pri.color} flex items-center gap-1`}>
                        <i className={`fa-solid ${item.priority === 'urgent' ? 'fa-circle-exclamation' : 'fa-circle-dot'} text-[7px]`}></i>
                        {pri.label}
                      </span>
                    )}
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${catCls}`}>
                      {item.category || 'General'}
                    </span>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#e0eceb] text-[#466460]">
                      {item.dept}
                    </span>
                  </div>

                  <h3 className="text-[#466460] font-bold text-[13px] sm:text-[14px] mb-1 pr-8 leading-snug">{item.title}</h3>
                  <div className="flex flex-wrap text-[10px] text-slate-400 mb-2 items-center gap-x-3 gap-y-1">
                    <span><i className="fa-regular fa-calendar mr-1"></i>{formatDate(item.date)}</span>
                    {item.location && (
                      <span><i className="fa-solid fa-location-dot mr-1"></i>{item.location}</span>
                    )}
                    {item.contactPerson && (
                      <span><i className="fa-solid fa-user mr-1"></i>{item.contactPerson}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================================================================
          CREATE / EDIT MODAL
          ================================================================ */}
      {isFormModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000] py-4 px-3 sm:px-4"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-[fadeInSlide_0.2s_ease-out_forwards]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-bold text-[#466460]">
                <i className={`fa-solid ${currentEditId ? 'fa-pen-to-square' : 'fa-bullhorn'} mr-2`}></i>
                {currentEditId ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 sm:px-6 pb-6 overflow-y-auto grow">
              {/* Title */}
              <label className={labelCls}>Title <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="Announcement title"
                className={inputCls}
                value={formData.title}
                onChange={e => setField('title', e.target.value)}
              />

              {/* Content */}
              <label className={labelCls}>Details <span className="text-red-400">*</span></label>
              <textarea
                placeholder="Write the full details of this announcement…"
                rows={4}
                className={`${inputCls} resize-none`}
                value={formData.content}
                onChange={e => setField('content', e.target.value)}
              />

              {/* Category + Priority row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={formData.category} onChange={e => setField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select className={inputCls} value={formData.priority} onChange={e => setField('priority', e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Department */}
              <label className={labelCls}>Target Department</label>
              <select className={inputCls} value={formData.dept} onChange={e => setField('dept', e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>

              {/* Location */}
              <label className={labelCls}>Location / Venue <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Clinic Room 2, Gymnasium"
                className={inputCls}
                value={formData.location}
                onChange={e => setField('location', e.target.value)}
              />

              {/* Contact person + email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-3">
                <div>
                  <label className={labelCls}>Contact Person <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="Dr. Santos"
                    className={inputCls}
                    value={formData.contactPerson}
                    onChange={e => setField('contactPerson', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Contact Email <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input
                    type="email"
                    placeholder="clinic@plsp.edu.ph"
                    className={inputCls}
                    value={formData.contactEmail}
                    onChange={e => setField('contactEmail', e.target.value)}
                  />
                </div>
              </div>

              {/* Image upload */}
              <label className={labelCls}>
                <i className="fa-solid fa-image mr-1"></i>
                Infographic / Image <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <ImageDropZone
                value={formData.image}
                onChange={(b64) => setField('image', b64)}
                onClear={() => setField('image', null)}
              />

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-6">
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="w-full sm:w-auto sm:flex-1 bg-[#e2e8f0] text-slate-600 py-2.5 rounded-xl font-semibold text-[13px] hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={formSaving}
                  className="w-full sm:w-auto sm:flex-1 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-2.5 rounded-xl font-semibold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formSaving
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</>
                    : <><i className="fa-solid fa-paper-plane"></i> {currentEditId ? 'Save Changes' : 'Post'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          VIEW MODAL
          ================================================================ */}
      {isViewModalOpen && viewData && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000] py-4 px-3 sm:px-4"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-[fadeInSlide_0.2s_ease-out_forwards] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Image header */}
            {viewData.image && (
              <div className="h-40 sm:h-52 w-full shrink-0 overflow-hidden bg-slate-100">
                <img src={viewData.image} alt={viewData.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="px-5 sm:px-6 py-5 overflow-y-auto grow">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {viewData.priority && viewData.priority !== 'normal' && (
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full text-white ${PRIORITY_CONFIG[viewData.priority]?.color}`}>
                    <i className="fa-solid fa-circle-exclamation mr-0.5"></i>
                    {PRIORITY_CONFIG[viewData.priority]?.label}
                  </span>
                )}
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[viewData.category] || CATEGORY_COLORS.General}`}>
                  {viewData.category || 'General'}
                </span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#e0eceb] text-[#466460]">
                  {viewData.dept}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#466460] mb-1 leading-snug">{viewData.title}</h3>

              {/* Meta row */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-1.5 sm:gap-y-1 gap-x-4 text-[11px] sm:text-[10px] text-slate-400 mb-4">
                <span><i className="fa-regular fa-calendar mr-1 w-3 text-center"></i>{formatDate(viewData.date)}</span>
                {viewData.location && (
                  <span><i className="fa-solid fa-location-dot mr-1 w-3 text-center text-[#e07a5f]"></i>{viewData.location}</span>
                )}
                {viewData.contactPerson && (
                  <span><i className="fa-solid fa-user mr-1 w-3 text-center text-[#466460]"></i>{viewData.contactPerson}</span>
                )}
                {viewData.contactEmail && (
                  <span><i className="fa-solid fa-envelope mr-1 w-3 text-center text-[#466460]"></i>{viewData.contactEmail}</span>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{viewData.content}</p>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-full sm:w-auto sm:flex-1 bg-[#e2e8f0] text-slate-600 py-2.5 rounded-xl font-semibold text-[13px] hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => { setIsViewModalOpen(false); handleOpenForm(viewData.id); }}
                  className="w-full sm:w-auto sm:flex-1 bg-[#e0eceb] text-[#466460] py-2.5 rounded-xl font-semibold text-[13px] hover:bg-[#466460] hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-pen-to-square text-[11px]"></i> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Announcements;