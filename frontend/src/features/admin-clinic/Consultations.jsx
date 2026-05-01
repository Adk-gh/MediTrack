// frontend/src/features/admin-clinic/Consultations.jsx
import React, { useState, useEffect, useRef } from 'react';

// Dummy data
const allPeople = [
  { id: "S-001", name: "De Vera, Jenny", role: "student", department: "College of Computing", avatarInitial: "JD", program: "BSIT", year: "3rd Year" },
  { id: "S-002", name: "Santos, Sofia", role: "student", department: "College of Engineering", avatarInitial: "SS", program: "BSCE", year: "2nd Year" },
  { id: "S-003", name: "Mendoza, Paolo", role: "student", department: "College of Health Sciences", avatarInitial: "PM", program: "BSN", year: "4th Year" },
  { id: "I-101", name: "Dr. Reyes, Maria", role: "instructor", department: "College of Computing", avatarInitial: "MR", program: "PhD" },
  { id: "I-102", name: "Prof. Cruz, Andres", role: "instructor", department: "College of Engineering", avatarInitial: "AC", program: "Masters" },
  { id: "I-103", name: "Prof. Mercado, Liza", role: "instructor", department: "College of Arts & Sciences", avatarInitial: "LM", program: "EdD" },
  { id: "ST-201", name: "Fernandez, Leah", role: "staff", department: "Registrar's Office", avatarInitial: "LF" },
  { id: "ST-202", name: "Villanueva, Mark", role: "staff", department: "Maintenance", avatarInitial: "MV" },
  { id: "ST-203", name: "Garcia, Rosalie", role: "staff", department: "Accounting Office", avatarInitial: "RG" },
  { id: "S-004", name: "Rivera, Kevin", role: "student", department: "College of Computing", avatarInitial: "KR", program: "BSIT", year: "2nd Year" },
  { id: "I-104", name: "Dr. Villanueva, Paolo", role: "instructor", department: "College of Health Sciences", avatarInitial: "PV", program: "MD" },
  { id: "ST-204", name: "Reyes, Teresa", role: "staff", department: "Library", avatarInitial: "TR" }
];

export const Consultations = () => {
  const [consultationMessagesMap, setConsultationMessagesMap] = useState(new Map());
  const [currentActivePatientId, setCurrentActivePatientId] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [message, setMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize messages
  useEffect(() => {
    const initialMessages = new Map();
    initialMessages.set("S-001", [
      { text: "Good morning, doctor! I've been having headaches for 3 days.", sender: "patient", timestamp: new Date(Date.now() - 86400000).toISOString() },
      { text: "Any other symptoms like fever or nausea?", sender: "doctor", timestamp: new Date(Date.now() - 82800000).toISOString() },
      { text: "Slight dizziness, but no fever. Could it be stress?", sender: "patient", timestamp: new Date(Date.now() - 80000000).toISOString() }
    ]);
    initialMessages.set("S-002", [
      { text: "Hello doc, my throat has been sore since yesterday.", sender: "patient", timestamp: new Date(Date.now() - 172800000).toISOString() },
      { text: "I recommend drinking warm fluids and taking a rest. If persists, visit clinic.", sender: "doctor", timestamp: new Date(Date.now() - 170000000).toISOString() }
    ]);
    initialMessages.set("I-102", [
      { text: "Doctor, I need a medical certificate for my sick leave.", sender: "patient", timestamp: new Date(Date.now() - 43200000).toISOString() },
      { text: "Sure, please drop by the clinic tomorrow. I'll prepare it.", sender: "doctor", timestamp: new Date(Date.now() - 40000000).toISOString() }
    ]);
    initialMessages.set("ST-201", [
      { text: "I have back pain and I need physio recommendation.", sender: "patient", timestamp: new Date(Date.now() - 7200000).toISOString() }
    ]);
    initialMessages.set("S-004", [
      { text: "Doctor, I feel itchy after eating seafood.", sender: "patient", timestamp: new Date(Date.now() - 10800000).toISOString() },
      { text: "Likely allergic reaction. Take antihistamine and avoid seafood.", sender: "doctor", timestamp: new Date(Date.now() - 9000000).toISOString() }
    ]);
    initialMessages.set("I-104", [
      { text: "Hi doc, need a prescription for maintenance meds.", sender: "patient", timestamp: new Date(Date.now() - 21600000).toISOString() }
    ]);
    initialMessages.set("ST-203", [
      { text: "My blood pressure has been high lately. Should I adjust medication?", sender: "patient", timestamp: new Date(Date.now() - 5400000).toISOString() }
    ]);
    setConsultationMessagesMap(initialMessages);
  }, []);

  // Get all patients with messages
  const getAllPatientsWithMessages = () => {
    const activeSet = new Set();
    for (const [patientId] of consultationMessagesMap.entries()) {
      activeSet.add(patientId);
    }
    return allPeople.filter(p => activeSet.has(p.id)).sort((a, b) => {
      const msgsA = consultationMessagesMap.get(a.id) || [];
      const msgsB = consultationMessagesMap.get(b.id) || [];
      const lastA = msgsA.length ? new Date(msgsA[msgsA.length - 1].timestamp) : new Date(0);
      const lastB = msgsB.length ? new Date(msgsB[msgsB.length - 1].timestamp) : new Date(0);
      return lastB - lastA;
    });
  };

  const allPatientsWithMessages = getAllPatientsWithMessages();

  const getUnreadCount = (patientId) => {
    const messages = consultationMessagesMap.get(patientId) || [];
    let unread = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'patient') unread++;
      else break;
    }
    return unread;
  };

  const selectPatient = (patientId) => {
    setCurrentActivePatientId(patientId);
  };

  const displayChatConversation = (patientId) => {
    const messages = consultationMessagesMap.get(patientId) || [];
    return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const sendMessage = () => {
    if (!currentActivePatientId) {
      showMsg('Select a patient first', 'error');
      return;
    }
    const text = messageInput.trim();
    if (!text) return;

    const messages = consultationMessagesMap.get(currentActivePatientId) || [];
    messages.push({ text, sender: 'doctor', timestamp: new Date().toISOString() });
    const newMap = new Map(consultationMessagesMap);
    newMap.set(currentActivePatientId, messages);
    setConsultationMessagesMap(newMap);
    setMessageInput('');
    showMsg('Message sent', 'success');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const addDemoMessage = () => {
    const existing = allPeople[Math.floor(Math.random() * allPeople.length)];
    const msgs = ["Need follow-up consultation", "Medication inquiry", "Headache relief", "Clinic hours?", "Prescription refill", "Feeling unwell"];
    const randMsg = msgs[Math.floor(Math.random() * msgs.length)];
    const newMap = new Map(consultationMessagesMap);
    const patMsgs = newMap.get(existing.id) || [];
    patMsgs.push({ text: randMsg, sender: 'patient', timestamp: new Date().toISOString() });
    newMap.set(existing.id, patMsgs);
    setConsultationMessagesMap(newMap);
    showMsg(`New message from ${existing.name}`, 'success');
  };

  const showMsg = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const getRoleLabel = (role) => role === 'student' ? 'Student' : role === 'instructor' ? 'Faculty' : 'Staff';

  const getRoleClass = (role) => role === 'student' ? '' : role === 'instructor' ? 'instructor' : 'staff';

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const selectedPatient = allPeople.find(p => p.id === currentActivePatientId);
  const chatMessages = currentActivePatientId ? displayChatConversation(currentActivePatientId) : [];

  // Calculate stats
  const totalConsultCount = allPatientsWithMessages.length;
  let totalMessagesCount = 0;
  for (const msgs of consultationMessagesMap.values()) totalMessagesCount += msgs.length;

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white overflow-hidden">
      {/* Left: Patient List Panel */}
      <div className="w-[380px] border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-extrabold text-[#466460] text-base"><i className="fa-regular fa-comment-dots mr-2"></i>Message Requests</h3>
          <p className="text-[10px] text-slate-400 mt-1">Students · Staff · Instructors</p>
          <button onClick={addDemoMessage} className="text-[10px] bg-[#e0eceb] px-2 py-1 rounded-full text-teal-700 font-semibold hover:bg-[#cbdcd9] transition ml-2 mt-2">
            <i className="fa-regular fa-bell mr-1"></i>Demo Message
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {allPatientsWithMessages.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-10">No consultation messages yet</div>
          ) : (
            allPatientsWithMessages.map(patient => {
              const activeClass = currentActivePatientId === patient.id ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-4 border-[#466460]' : '';
              const unread = getUnreadCount(patient.id);
              const lastMsg = consultationMessagesMap.get(patient.id)?.slice(-1)[0];
              const preview = lastMsg ? (lastMsg.text.length > 45 ? lastMsg.text.substring(0, 42) + '...' : lastMsg.text) : 'No messages';

              return (
                <div
                  key={patient.id}
                  onClick={() => selectPatient(patient.id)}
                  className={`flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-[#e0eceb] hover:translate-x-1 ${activeClass}`}
                >
                  <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#466460] text-lg flex-shrink-0">
                    {patient.avatarInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800">{patient.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${getRoleClass(patient.role) === 'instructor' ? 'bg-purple-100 text-purple-700' : getRoleClass(patient.role) === 'staff' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {getRoleLabel(patient.role)}
                      </span>
                      <span>{patient.department}</span>
                      {patient.program && <span>{patient.program}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">{preview}</div>
                  </div>
                  {unread > 0 && (
                    <span className="bg-[#e07a5f] text-white rounded-full text-[9px] font-bold px-2 py-0.5 min-w-[22px] text-center">{unread}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div className="flex-1 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="font-extrabold text-[#466460] text-base">
            {selectedPatient ? <><i className="fa-regular fa-user mr-1"></i>{selectedPatient.name}</> : 'Consultation Thread'}
          </h3>
          {selectedPatient && (
            <p className="text-[10px] text-slate-400 mt-0.5">{getRoleLabel(selectedPatient.role)} · {selectedPatient.department}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-50">
          {!currentActivePatientId ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <i className="fa-regular fa-message text-5xl text-slate-300"></i>
              <p className="text-sm">No conversation selected</p>
              <span className="text-xs text-slate-400">Choose a patient from the list</span>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <i className="fa-regular fa-comment text-5xl text-slate-300"></i>
              <p>No messages yet</p>
            </div>
          ) : (
            chatMessages.map((msg, idx) => {
              const isDoctor = msg.sender === 'doctor';
              const bubbleClass = isDoctor ? 'self-end' : 'self-start';
              const senderName = isDoctor ? 'Dr. Reyes' : (selectedPatient?.name.split(',')[0] || 'Patient');

              return (
                <div key={idx} className={`max-w-[75%] flex flex-col ${bubbleClass}`}>
                  <div className={`px-4 py-2.5 rounded-[18px] text-sm leading-relaxed break-words ${isDoctor ? 'bg-[#466460] text-white rounded-br-md' : 'bg-white border border-slate-200 rounded-bl-md text-slate-800 shadow-sm'}`}>
                    {msg.text}
                  </div>
                  <div className={`flex items-center gap-2 text-[9px] text-slate-400 mt-1 ${isDoctor ? 'justify-end pr-3' : 'pl-3'}`}>
                    <span>{senderName}</span>
                    <span>·</span>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex gap-3 items-center">
          <input
            type="text"
            placeholder={currentActivePatientId ? "Type a reply..." : "Select a person to view conversation"}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!currentActivePatientId}
            className="flex-1 border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!currentActivePatientId}
            className="w-11 h-11 rounded-full bg-[#466460] border-none text-white cursor-pointer transition-all hover:bg-[#5a7a76] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <i className="fa-regular fa-paper-plane"></i>
          </button>
        </div>
      </div>

      {/* Stats Display */}
      <div className="fixed bottom-4 right-4 bg-white p-3 rounded-xl shadow-lg border border-slate-200 flex gap-4 text-xs">
        <div className="text-center">
          <div className="text-lg font-extrabold text-[#466460]">{totalConsultCount}</div>
          <div className="text-[9px] text-slate-400 uppercase">Active Chats</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-extrabold text-[#466460]">{totalMessagesCount}</div>
          <div className="text-[9px] text-slate-400 uppercase">Messages</div>
        </div>
      </div>

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 transition-all ${message.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default Consultations;