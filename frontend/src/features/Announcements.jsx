// frontend/src/features/Announcements.jsx
import React, { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';

const initialAnnouncements = [
  { id: 1, title: "Free Check-Up", dept: "BSIT", date: "April 17, 2026", content: "Free medical check-up for IT students this Friday. Please bring your student ID." },
  { id: 2, title: "Clinic Hours Update", dept: "All Departments", date: "April 16, 2026", content: "The university clinic will be open from 8:00 AM to 6:00 PM starting next week." },
  { id: 3, title: "Flu Vaccination Drive", dept: "All Departments", date: "April 15, 2026", content: "Free flu vaccinations for all students and staff. Schedule your appointment through the clinic." }
];

export const Announcements = () => {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  
  // Active Data
  const [formData, setFormData] = useState({ title: '', content: '', dept: '' });
  const [viewData, setViewData] = useState(null);

  // --- Handlers ---
  const handleOpenForm = (editId = null) => {
    if (editId) {
      const target = announcements.find(a => a.id === editId);
      setFormData({ title: target.title, content: target.content, dept: target.dept });
      setCurrentEditId(editId);
    } else {
      setFormData({ title: '', content: '', dept: '' });
      setCurrentEditId(null);
    }
    setActiveMenuId(null);
    setIsFormModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) return alert('Please fill in both title and content.');
    
    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const finalDept = formData.dept || 'All Departments';

    if (currentEditId) {
      setAnnouncements(announcements.map(a => a.id === currentEditId ? { ...a, ...formData, dept: finalDept } : a));
    } else {
      setAnnouncements([{ id: Date.now(), ...formData, date, dept: finalDept }, ...announcements]);
    }
    setIsFormModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
    setActiveMenuId(null);
  };

  const handleView = (item) => {
    setViewData(item);
    setIsViewModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="bg-white min-h-[calc(100vh-120px)] animate-[fadeInSlide_0.4s_ease-out_forwards]">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center p-6 border-b-2 border-[#e0eceb]">
          <h3 className="font-bold text-lg text-[#466460]">Announcements</h3>
          <button onClick={() => handleOpenForm()} className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-5 py-2 rounded-full font-bold text-xs hover:shadow-md transition-all">
            + New Post
          </button>
        </div>

        {/* List */}
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No announcements yet.</div>
          ) : (
            announcements.map(item => (
              <div key={item.id} onClick={() => handleView(item)} className="bg-white p-5 rounded-xl border border-slate-200 relative cursor-pointer hover:shadow-md hover:border-[#8aacaa] transition-all group">
                {/* Custom Left Border */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#e07a5f] to-[#e9c46a] rounded-l-xl"></div>
                
                {/* 3-Dot Menu */}
                <div className="absolute top-4 right-4">
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} className="text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                  
                  {activeMenuId === item.id && (
                    <div className="absolute right-0 top-8 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-20 w-32 py-1 animate-[fadeIn_0.1s_ease-out]">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenForm(item.id); }} className="w-full text-left px-4 py-2 text-xs hover:bg-[#e0eceb] text-slate-700">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600">Delete</button>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 mb-1">{item.date}</div>
                <div className="inline-block bg-[#e0eceb] text-[#466460] text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2">{item.dept}</div>
                <h3 className="text-[#466460] font-bold text-lg mb-2 pr-12">{item.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-2">{item.content}</p>
              </div>
            ))
          )}
        </div>

      </div>

      {/* --- Create/Edit Modal --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-md animate-[fadeInSlide_0.2s_ease-out_forwards]">
            <h3 className="text-xl font-bold text-[#466460] mb-6">{currentEditId ? 'Edit Announcement' : 'Create Announcement'}</h3>
            
            <div className="space-y-4">
              <input type="text" placeholder="Title" className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#466460]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <textarea placeholder="Details..." rows="4" className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#466460] resize-none" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
              <select className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#466460] bg-white" value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                <option value="">All Departments</option>
                <option value="BSIT">BSIT</option>
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handleSave} className="flex-1 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90">Post</button>
              <button onClick={() => setIsFormModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- View Modal --- */}
      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setIsViewModalOpen(false)}>
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-lg animate-[fadeInSlide_0.2s_ease-out_forwards]" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-[#466460] mb-2">{viewData.title}</h3>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <span className="inline-block bg-[#e0eceb] text-[#466460] text-[10px] font-bold px-2.5 py-0.5 rounded-full">{viewData.dept}</span>
              <span className="text-xs text-slate-400">{viewData.date}</span>
            </div>
            
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-8">
              {viewData.content}
            </p>
            
            <button onClick={() => setIsViewModalOpen(false)} className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200">Close</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Announcements;