import React from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/auth.service.js';

const HomePageUsers = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.name?.split(',')[0]?.trim() || 'Student';

  const quickActions = [
    {
      title: 'Book Appointment',
      subtitle: 'Schedule a visit',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      ),
      id: 'booking'
    },
    {
      title: 'My Records',
      subtitle: 'View health files',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      id: 'records'
    },
    {
      title: 'Consult',
      subtitle: 'Talk to a doctor',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l2 2" />
        </svg>
      ),
      id: 'consult'
    },
    {
      title: 'My Account',
      subtitle: 'Profile & settings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      id: 'account'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f7faf8]">

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">

        {/* Announcement Card */}
        <div className="bg-[#e8f5ee] border border-[#c0e0ce] rounded-2xl p-4 animate-[slideUp_0.5s_ease_both]">
          <div className="flex items-center gap-1.5 mb-3.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 8a3 3 0 010 8" />
              <path d="M14 8.5l4-3v9l-4-3H6a2 2 0 01-2-2v-1a2 2 0 012-2h8z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2d7a52]">Latest Announcement</span>
          </div>

          <div className="mb-3.5">
            <div className="text-sm font-bold text-[#1a2e22] mb-1">CCSE Medical Examination 2026</div>
            <div className="text-xs text-[#6b8577]">Available at the University Clinic starting April 25.</div>
          </div>

          <div className="h-px bg-[#c8dfd3] my-3" />

          <div>
            <div className="text-sm font-bold text-[#1a2e22]">Dental Clearance</div>
            <div className="text-[11px] font-semibold text-[#9bb5a5] uppercase tracking-wide mt-0.5">Feb 18, 2026</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-[13px] font-bold text-[#6b8577] uppercase tracking-wide">Quick Access</div>
        <div className="grid grid-cols-2 gap-2.5 animate-[slideUp_0.6s_ease_both]">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={() => navigate(`/student/${action.id}`)}
              className="bg-white border border-[#ddeee5] rounded-2xl p-3.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:border-[#4aab72] transition-all active:scale-[0.97]"
            >
              <div className="w-[34px] h-[34px] bg-[#e8f5ee] rounded-[10px] flex items-center justify-center mb-2">
                {action.icon}
              </div>
              <div className="text-xs font-bold text-[#1a2e22]">{action.title}</div>
              <div className="text-[11px] text-[#9bb5a5] mt-0.5">{action.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Health Tip Banner */}
        <div className="bg-gradient-to-r from-[#1a5c3a] to-[#2d7a52] rounded-2xl p-4 flex items-center gap-3 animate-[slideUp_0.65s_ease_both]">
          <span className="text-[28px] flex-shrink-0">💧</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[1px] text-[#34c472] mb-0.5">Health Tip</div>
            <div className="text-xs text-white/90 leading-[1.45]">Stay hydrated! Drink at least 8 glasses of water daily for optimal health.</div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default HomePageUsers;