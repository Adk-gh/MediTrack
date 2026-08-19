import React, { useState } from 'react';
// Make sure this relative path is correct based on your folder structure
import logo from '../../assets/logo.jpg';

// ─── HOW TO ADD REAL PHOTOS ──────────────────────────────────────────────────
// 1. Put your team photos in your assets folder (e.g., src/assets/team/)
// 2. Import them here like this:
// import abdullaImg from '../../assets/team/abdulla.jpg';
// import bermasImg from '../../assets/team/bermas.jpg';
// 3. Replace the 'image' property in the array below with the imported variable!

const TEAM_MEMBERS = [
  {
    name: "Abdulla, Mohammad A.",
    role: "QA Tester / Researcher",
    image: "https://placehold.co/400x400/edf4f2/466460?text=MA"
  },
  {
    name: "Bermas, Aderik P.",
    role: "Programmer & Assistant Project Manager / Researcher",
    image: "https://placehold.co/400x400/edf4f2/466460?text=AB"
  },
  {
    name: "Concibido, Shanaya T.",
    role: "Technical Writer / Researcher",
    image: "https://placehold.co/400x400/edf4f2/466460?text=SC"
  },
  {
    name: "De Vera, Jenny L.",
    role: "Project Manager & UI/UX Designer / Researcher",
    image: "https://placehold.co/400x400/edf4f2/466460?text=JD"
  },
  {
    name: "Latina, Hanessa Kimberly O.",
    role: "System Analyst / Researcher",
    image: "https://placehold.co/400x400/edf4f2/466460?text=HL"
  },
  {
    name: "Tenorio, Paula Eunice M.",
    role: "Technical Writer / Researcher",
    image: "https://placehold.co/400x400/edf4f2/466460?text=PT"
  }
];

// ─── Local UI Helpers ────────────────────────────────────────────────────────
const SectionCard = ({ children }) => (
  <div style={{
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #e2ebe8',
    overflow: 'hidden',
  }}>
    {children}
  </div>
);

const Row = ({ label, sub, right, last, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid #eef3f1',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafa'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <div style={{ flex: 1, paddingRight: 12 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e22', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 0' }}>{sub}</p>}
    </div>
    {right}
  </div>
);

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 11, fontWeight: 800, color: '#466460',
    textTransform: 'uppercase', letterSpacing: 1,
    margin: '0 0 8px 4px',
  }}>
    {children}
  </p>
);

// Close Icon for the Full-Screen Modal
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function StudentAboutSettings({ isMobile }) {
  const [showTeamModal, setShowTeamModal] = useState(false);

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── App Info ── */}
      <SectionLabel>Application</SectionLabel>
      <SectionCard>
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <img src={logo} alt="MediTrack Logo" style={{ height: 64, borderRadius: 16, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
          <h4 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e22', margin: '0 0 6px' }}>MediTrack</h4>
          <span style={{ display: 'inline-block', background: '#edf4f2', color: '#466460', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 40, marginBottom: 20 }}>
            Version 0.1.0
          </span>
          <p style={{ fontSize: 13, color: '#7a9e8e', lineHeight: 1.7, margin: '0 0 8px' }}>
            A cross-platform student health record management system designed to make campus healthcare simple, secure, and accessible.
          </p>
          <p style={{ fontSize: 12, color: '#b0c8be', margin: 0 }}>© 2026 MediTrack. All rights reserved.</p>
        </div>
      </SectionCard>

      {/* ── Team Section ── */}
      <SectionLabel>Team</SectionLabel>
      <SectionCard>
        <Row
          label="Contributors"
          sub="See the team behind MediTrack"
          last
          onClick={() => setShowTeamModal(true)}
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
      </SectionCard>

      {/* ── Full Screen Team Modal ── */}
      {showTeamModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#f4f8f6', zIndex: 99999,
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Modal Header */}
          <div style={{
            background: '#fff', padding: '16px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #e2ebe8', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            position: 'sticky', top: 0, zIndex: 10
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a2e22', margin: 0 }}>About MediTrack</h2>
            <button
              onClick={() => setShowTeamModal(false)}
              style={{
                background: '#edf4f2', border: 'none', color: '#466460',
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 0.2s'
              }}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Modal Content */}
          <div style={{
            padding: '32px 24px', overflowY: 'auto', flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>

            {/* Modal App Info Section */}
            <div style={{ textAlign: 'center', maxWidth: 600, marginBottom: 40 }}>
              <h4 style={{ fontSize: 26, fontWeight: 800, color: '#1a2e22', margin: '0 0 6px' }}>MediTrack</h4>
              <span style={{ display: 'inline-block', background: '#dce8e4', color: '#38524e', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 40, marginBottom: 20 }}>
                Version 0.1.0
              </span>
              <p style={{ fontSize: 14, color: '#6b8577', lineHeight: 1.7, margin: '0 0 12px' }}>
                A cross-platform student health record management system designed to make campus healthcare simple, secure, and accessible.
              </p>
              <p style={{ fontSize: 12, color: '#a0b3ac', margin: 0 }}>© 2026 MediTrack. All rights reserved.</p>
            </div>

            {/* Divider */}
            <div style={{ width: '100%', maxWidth: 1600, borderTop: '1px solid #e2ebe8', margin: '0 0 32px' }}></div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e22', margin: '0 0 24px', alignSelf: 'center', textAlign: 'center' }}>
              Meet the Capstone Team
            </h3>

            {/* Responsive Team Container */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row', // Stack vertically on mobile, horizontal row on desktop
              flexWrap: 'nowrap',
              overflowX: isMobile ? 'visible' : 'auto',   // Scroll sideways ONLY on desktop
              alignItems: isMobile ? 'center' : 'stretch', // Center the cards on mobile
              gap: 24,
              maxWidth: 1600,
              width: '100%',
              paddingBottom: 24,
            }}>
              {TEAM_MEMBERS.map((member, index) => (
                <div key={index} style={{
                  background: '#fff', borderRadius: 16, overflow: 'hidden',
                  border: '1px solid #e2ebe8', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column',
                  flex: isMobile ? 'none' : '1 0 220px',  // Fix size on desktop
                  width: isMobile ? '100%' : 'auto',      // Full width on mobile
                  maxWidth: isMobile ? '320px' : 'none',  // Don't let it get TOO wide on mobile
                }}>
                  {/* Member Image */}
                  <img
                    src={member.image}
                    alt={member.name}
                    style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', background: '#edf4f2' }}
                  />

                  {/* Member Info */}
                  <div style={{ padding: '20px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#1a2e22', margin: '0 0 8px', lineHeight: 1.3 }}>
                      {member.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#7a9e8e', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.4 }}>
                      {member.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Inline Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}