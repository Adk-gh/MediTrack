import React, { useState } from 'react';

// ─── Dummy FAQ Data (Edit these to match your clinic!) ──────────────
const FAQ_DATA = [
  {
    question: 'How do I update my medical records?',
    answer: 'To update your medical records, navigate to the "Profile" tab on your dashboard. From there, you can edit your basic medical history and upload any new medical certificates. Clinic staff will review your updates.',
  },
  {
    question: 'How do I book a clinic appointment?',
    answer: 'Go to the "Appointments" page and click "New Appointment". Select your preferred date, time, and the reason for your visit. Wait for a confirmation notification from the clinic staff.',
  },
  {
    question: 'Is my medical data kept private?',
    answer: 'Yes, your medical data is highly secure. It is only accessible to authorized clinic staff (Doctors, Nurses, Dentists) and yourself in accordance with data privacy laws.',
  },
  {
    question: 'What do I do if I cannot log in?',
    answer: 'If you are having trouble logging in, ensure you are using your official student email. If you forgot your password, click "Forgot Password" on the login screen to reset it.',
  },
  {
    question: 'How do I submit an excused absence letter?',
    answer: 'If you were absent due to medical reasons, go to the "Clearance/Certificates" section. You can upload your external medical certificate there for the school clinic to validate.',
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

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 11, fontWeight: 800, color: '#466460',
    textTransform: 'uppercase', letterSpacing: 1,
    margin: '0 0 8px 4px',
  }}>
    {children}
  </p>
);

// Accordion Item Component
const FAQItem = ({ question, answer, isOpen, onClick, isLast }) => {
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #eef3f1' }}>
      <div
        onClick={onClick}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 18px',
          cursor: 'pointer',
          background: isOpen ? '#f9fafa' : 'transparent',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = '#fbfcfc'; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <p style={{
          fontSize: 14, fontWeight: 600, margin: 0,
          color: isOpen ? '#466460' : '#1a2e22',
          transition: 'color 0.2s'
        }}>
          {question}
        </p>
        <span style={{
          color: '#b0c8be', fontSize: 20, fontWeight: 300,
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease-in-out'
        }}>
          +
        </span>
      </div>

      <div style={{
        maxHeight: isOpen ? '200px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease-in-out, padding 0.3s ease-in-out',
        background: '#f9fafa',
        padding: isOpen ? '0 18px 16px 18px' : '0 18px',
      }}>
        <p style={{ fontSize: 13, color: '#7a9e8e', margin: 0, lineHeight: 1.6 }}>
          {answer}
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HelpCenter({ isMobile, onBack }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease-in-out' }}>

      {/* Header / Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#466460', fontSize: 28, padding: '0 8px 4px 0', display: 'flex', alignItems: 'center',
              lineHeight: 1
            }}
          >
            ‹
          </button>
        )}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a2e22', margin: 0 }}>
          Help Center & FAQs
        </h2>
      </div>

      <SectionLabel>Frequently Asked Questions</SectionLabel>
      <SectionCard>
        {FAQ_DATA.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onClick={() => toggleFAQ(index)}
            isLast={index === FAQ_DATA.length - 1}
          />
        ))}
      </SectionCard>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#a0b3ac', marginTop: 10 }}>
        Can't find what you're looking for? Use the "Contact Support" button on the previous page.
      </p>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}