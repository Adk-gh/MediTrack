// C:\Users\HP\MediTrack\frontend\src\features\Records.jsx
import React, { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { useNavigate } from 'react-router-dom';

const peopleData = [
  { name: "De Vera, Jenny", id: "23-00142", type: "student", prog: "BSIT", year: "3rd Year", age: 21, email: "jenny.00142@plsp.edu.ph", department: "College of Computing", history: ["Flu symptoms; prescribed bed rest.", "Internship Medical Clearance issued."] },
  { name: "Santos, Sofia", id: "23-23406", type: "student", prog: "BSCE", year: "2nd Year", age: 20, email: "sofia.2323406@plsp.edu.ph", department: "College of Engineering", history: ["Routine dental examination.", "Vital signs within normal range."] },
  { name: "Mendoza, Paolo", id: "22-09123", type: "student", prog: "BSN", year: "4th Year", age: 22, email: "paolo.09123@plsp.edu.ph", department: "College of Health Sciences", history: ["Physical assessment for RLE.", "Immunization record updated."] },
  { name: "Garcia, Rico", id: "24-11002", type: "student", prog: "BS PSY", year: "1st Year", age: 19, email: "rico.11002@plsp.edu.ph", department: "College of Arts & Sciences", history: ["Standard first aid for minor abrasion.", "Tetanus shot administered."] },
  { name: "Dr. Reyes, Maria", id: "FAC-001", type: "instructor", prog: "PhD", department: "College of Computing", age: 45, email: "maria.reyes@plsp.edu.ph", history: ["Hypertension check-up.", "Stress management consultation."] }
];

const departments = [...new Set(peopleData.map(s => s.department))].sort();

export const Records = () => {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('view');
  const [currentDept, setCurrentDept] = useState(departments[0]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const filteredPeople = peopleData.filter(p => p.department === currentDept);

  const handleExamine = (id) => {
    navigate(`/examination?patientId=${id}`);
  };

  return (
    <DashboardLayout>
      <div className="animate-[fadeInSlide_0.4s_ease-out_forwards]">
        
        {/* Sub Navigation */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex gap-2">
          <button onClick={() => setActiveSubTab('view')} className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${activeSubTab === 'view' ? 'bg-[#466460] text-white' : 'text-slate-500 hover:bg-[#e0eceb] hover:text-[#466460]'}`}>Current</button>
          <button onClick={() => setActiveSubTab('add')} className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${activeSubTab === 'add' ? 'bg-[#466460] text-white' : 'text-slate-500 hover:bg-[#e0eceb] hover:text-[#466460]'}`}>Add New Record</button>
        </div>

        {/* Current Records View */}
        {activeSubTab === 'view' && (
          <div className="flex min-h-[calc(100vh-160px)] bg-white overflow-hidden">
            
            {/* Column 1: Departments */}
            <div className="flex-[1.2] border-r border-[#eef2f6] flex flex-col">
              <div className="bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                <h3 className="font-bold text-[11px] uppercase text-[#466460]">Colleges</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {departments.map(dept => (
                  <div key={dept} onClick={() => { setCurrentDept(dept); setSelectedPerson(null); }} className={`p-3 cursor-pointer rounded-lg transition-all border-l-[3px] ${currentDept === dept ? 'bg-gradient-to-r from-[#e0eceb] to-white border-[#466460] font-bold text-[#466460]' : 'border-transparent hover:bg-gradient-to-r hover:from-slate-50 hover:to-white'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">{dept}</span>
                      <span className="text-[10px] bg-[#e0eceb] rounded-full px-2 py-0.5 text-[#466460]">{peopleData.filter(p => p.department === dept).length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: People */}
            <div className="flex-[1.5] border-r border-[#eef2f6] flex flex-col">
              <div className="bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5 flex justify-between items-center">
                <h3 className="font-bold text-[11px] uppercase text-[#466460]">People</h3>
                <span className="text-[10px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">{filteredPeople.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredPeople.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-12">No records found</div>
                ) : (
                  filteredPeople.map(person => (
                    <div key={person.id} onClick={() => setSelectedPerson(person)} className={`p-3 cursor-pointer rounded-xl transition-all border ${selectedPerson?.id === person.id ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent' : 'border-transparent hover:bg-gradient-to-r hover:from-slate-50 hover:to-white hover:border-[#8aacaa]'} flex justify-between items-center`}>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{person.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase">{person.id} • {person.type}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleExamine(person.id); }} className="bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white px-3 py-1.5 rounded-full text-[10px] font-bold hover:scale-105 transition-transform">
                        Examine
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Profile Detail */}
            <div className="flex-[2.2] flex flex-col">
              <div className="bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                <h3 className="font-bold text-[11px] uppercase text-[#466460]">Clinical Profile</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedPerson ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <i className="fa-regular fa-user-circle text-slate-200 text-5xl mb-3"></i>
                    <p className="text-slate-400 text-sm">Select a person from the list</p>
                  </div>
                ) : (
                  <div className="animate-[fadeInSlide_0.3s_ease-out_forwards]">
                    <div className="flex items-center gap-4 pb-4 mb-5 border-b border-slate-200">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#466460] to-[#5a7a76] flex items-center justify-center text-white text-xl font-bold">
                        {selectedPerson.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{selectedPerson.name}</h3>
                        <p className="text-[10px] text-[#e07a5f] font-bold uppercase">{selectedPerson.type} • Active</p>
                      </div>
                      <button onClick={() => handleExamine(selectedPerson.id)} className="ml-auto bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform">
                        Examine Patient
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">ID Number</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedPerson.id}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedPerson.department}</p>
                      </div>
                    </div>

                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">Medical History</h4>
                    <div className="space-y-2">
                      {selectedPerson.history.map((h, i) => (
                        <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600">
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Add New Record Form */}
        {activeSubTab === 'add' && (
          <div className="p-8 bg-white min-h-[calc(100vh-160px)]">
            <h3 className="text-xl font-bold text-[#466460] mb-6">Add New Health Record</h3>
            <div className="grid grid-cols-2 gap-6 max-w-3xl">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Full Name</label>
                <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">ID Number</label>
                <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Type</label>
                <select className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option value="student">Student</option>
                  <option value="instructor">Instructor/Faculty</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Department</label>
                <select className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option>College of Computing</option>
                  <option>College of Engineering</option>
                  <option>College of Health Sciences</option>
                  <option>College of Arts & Sciences</option>
                  <option>College of Business</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <button className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:opacity-90">Save Record</button>
              <button className="bg-slate-100 text-slate-600 px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200">Clear</button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Records;