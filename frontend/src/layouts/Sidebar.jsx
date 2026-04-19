import React, { useState } from 'react'; // Add 'React' here

// We define the data structure outside the component so it's easy to update
const DEPARTMENTS = [
  {
    id: 'CCSE',
    name: 'CCSE',
    programs: [
      { id: 'BSCE', name: 'BS Computer Engineering' },
      { id: 'BSIT', name: 'BS Information Technology' },
      { id: 'BSIE', name: 'BS Industrial Engineering' },
      { id: 'BSIS', name: 'BS Information Systems' }
    ]
  },
  {
    id: 'CNAS',
    name: 'CNAS',
    programs: [
      { id: 'BSN', name: 'BS Nursing' },
      { id: 'BSBio', name: 'BS Biology' }
    ]
  }
];

export const Sidebar = ({ onSelectFilter }) => {
  // State to track which department dropdown is open
  const [expandedDept, setExpandedDept] = useState('CCSE');
  // State to track which specific program is highlighted
  const [activeProg, setActiveProg] = useState('ALL');

  const handleProgClick = (deptId, progId) => {
    setActiveProg(progId);
    // Send the selection back to the parent (RecordsDashboard) to filter the table
    if (onSelectFilter) onSelectFilter(deptId, progId);
  };

  return (
    <aside className="w-72 sidebar-container p-4 h-fit bg-white border border-slate-200 rounded-3xl">
      <p className="text-[9px] font-bold text-gray-400 uppercase px-2 mb-3 tracking-widest">
        Departments & Programs
      </p>
      
      <div className="space-y-2">
        {DEPARTMENTS.map((dept) => {
          const isExpanded = expandedDept === dept.id;
          
          return (
            <div key={dept.id} className="dept-group">
              {/* Department Header */}
              <button 
                onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                className={`w-full text-left px-3 py-2 flex justify-between items-center rounded-xl transition-all text-sm font-bold ${
                  isExpanded ? 'bg-[#557a5b] text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span>{dept.name}</span> 
                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px]`}></i>
              </button>

              {/* Programs List (Only renders if this department is expanded) */}
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-2">
                  {dept.programs.map((prog) => (
                    <button
                      key={prog.id}
                      onClick={() => handleProgClick(dept.id, prog.id)}
                      className={`w-full text-left text-[11px] p-2 rounded-lg font-semibold transition-all ${
                        activeProg === prog.id 
                          ? 'text-[#557a5b] bg-[#f0fdf4] border-l-4 border-[#557a5b]' 
                          : 'text-slate-400 hover:bg-slate-50 hover:text-[#557a5b]'
                      }`}
                    >
                      {prog.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};