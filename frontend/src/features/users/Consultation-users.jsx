import React, { useState } from 'react';

export default function ConsultationUsers() {
  const [messages, setMessages] = useState([
    { type: 'date', text: "February 20, 2026" },
    { text: "Good morning! How can I help you today?", isSent: false, time: "8:42 AM" },
    { text: "Hi Doc! I've been having headaches for the past few days.", isSent: true, time: "8:44 AM" },
    { text: "I see. Have you been getting enough sleep and staying hydrated?", isSent: false, time: "8:45 AM" },
    { text: "I think so. I drink around 6-8 glasses a day.", isSent: true, time: "8:46 AM" },
    { 
      type: 'system', 
      clinic: "UNIVERSITY CLINIC", 
      doctor: "DR. CARMEN NAVATA, MEDICAL OFFICER III", 
      date: "Feb 20, 2026", 
      status: "Sent.", 
      time: "8:47 AM" 
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    const newMessage = { text: inputValue, isSent: true, time: timeString };
    setMessages([...messages, newMessage]);
    setInputValue("");
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f4f7f5] font-sans relative">

      {/* Doctor Header (Fixed at the top below the global layout header) */}
      <div className="sticky top-0 bg-white px-5 py-4 border-b border-[#edf3f0] flex items-center gap-4 shadow-sm z-20">
        <div className="w-14 h-14 bg-[#e8f5ee] rounded-full flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="1.5" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle strokeLinecap="round" strokeLinejoin="round" cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-[#1a2e22] tracking-tight">Dr. Carmen Navata</h3>
          <p className="text-[11px] text-[#6b8577] font-medium mb-1">Medical Officer III</p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e8f5ee] text-[9px] font-bold text-[#1a5c3a] uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a5c3a]"></span>
            Online
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 px-5 py-6 space-y-4 bg-[#f4f7f5]">
        {messages.map((msg, i) => {
          
          if (msg.type === 'date') {
            return (
              <div key={i} className="flex justify-center my-4">
                <span className="bg-[#ddeee5] text-[#1a5c3a] px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide">
                  {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === 'system') {
            return (
              <div key={i} className="flex flex-col items-start mt-6 w-full">
                <div className="bg-white border border-[#ddeee5] rounded-[24px] p-5 shadow-sm max-w-[85%]">
                  <h4 className="text-[11px] font-black text-[#1a2e22] uppercase tracking-wide mb-1">
                    {msg.clinic}
                  </h4>
                  <p className="text-[11px] text-[#6b8577] uppercase mb-4 leading-relaxed">
                    {msg.doctor}
                  </p>
                  <p className="text-[12px] text-[#1a2e22] font-medium mb-4">
                    {msg.date}
                  </p>
                  <p className="text-[12px] text-[#1a2e22] font-medium">
                    {msg.status}
                  </p>
                </div>
                <div className="text-[9px] font-bold text-[#9bb5a5] mt-1.5 ml-3">
                  {msg.time}
                </div>
              </div>
            );
          }

          return (
            <div key={i} className={`flex flex-col ${msg.isSent ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[80%] px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                  msg.isSent
                    ? 'bg-[#1a5c3a] text-white rounded-[20px] rounded-br-sm'
                    : 'bg-white text-[#1a2e22] rounded-[20px] rounded-bl-sm border border-[#ddeee5]'
                }`}
              >
                {msg.text}
              </div>
              <div className={`text-[9px] font-bold text-[#9bb5a5] mt-1.5 mx-2 ${msg.isSent ? 'text-right' : 'text-left'}`}>
                {msg.time}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area (Fixed to the bottom of the scroll container) */}
      <div className="mt-auto sticky bottom-0 bg-white border-t border-[#edf3f0] px-4 py-3 flex gap-3 items-center z-20 w-full shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 border border-[#ddeee5] rounded-full px-5 py-3.5 text-[13px] bg-[#f9fbfa] text-[#1a2e22] outline-none focus:border-[#1a5c3a] transition-colors placeholder:text-[#9bb5a5]"
        />
        <button
          onClick={handleSend}
          className="w-11 h-11 bg-[#1a5c3a] rounded-full flex items-center justify-center text-white hover:bg-[#124028] transition-colors flex-shrink-0 shadow-md shadow-green-900/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-[-2px] mt-[2px]">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

    </div>
  );
}