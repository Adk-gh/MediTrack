// C:\Users\HP\MediTrack\frontend\src\context\AppointmentContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const AppointmentContext = createContext(null);

// Firestore collection name
const COL = 'appointments';

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppointmentProvider({ children }) {
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // ── Real-time listener: syncs Firestore → local state ─────────────────────
  // Both the clinic and patient views stay in sync automatically because
  // onSnapshot fires whenever any client writes to Firestore.
  useEffect(() => {
    const q = query(collection(db, COL), orderBy('bookedAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          // Firestore uses string IDs; keep as `id` so the rest of the app works
          id: d.id,
          ...d.data(),
          // Convert Firestore Timestamp → ISO string so Date parsing stays consistent
          bookedAt: d.data().bookedAt?.toDate?.().toISOString() ?? d.data().bookedAt,
        }));
        setAppointments(docs);
        setLoadingAppts(false);
      },
      (error) => {
        console.error('Firestore listener error:', error);
        setLoadingAppts(false);
      }
    );

    // Clean up listener when provider unmounts
    return () => unsubscribe();
  }, []);

  // ── submitRequest ─────────────────────────────────────────────────────────
  // Called by the patient side. Writes a new pending document to Firestore.
  // Returns the new Firestore document ID so the caller can track it.
  const submitRequest = useCallback(
    async ({ name, idno, type, dept, prog, section, reason }) => {
      try {
        const docRef = await addDoc(collection(db, COL), {
          name,
          idno,
          type,
          dept,
          prog,
          section,
          reason,
          status: 'pending',
          bookedAt: serverTimestamp(), // Firestore server time — accurate & consistent
          // year / month / day / time are intentionally absent until the clinic approves
        });
        return docRef.id;
      } catch (err) {
        console.error('submitRequest failed:', err);
        throw err; // re-throw so the UI can show an error if needed
      }
    },
    []
  );

  // ── approveAppointment ────────────────────────────────────────────────────
  // Called by the clinic side. Updates status + schedule fields.
  const approveAppointment = useCallback(async (id, { year, month, day, time }) => {
    try {
      await updateDoc(doc(db, COL, id), {
        status: 'approved',
        year,
        month,
        day,
        time,
      });
    } catch (err) {
      console.error('approveAppointment failed:', err);
      throw err;
    }
  }, []);

  // ── declineAppointment ────────────────────────────────────────────────────
  // Called by the clinic side. Permanently removes the document.
  const declineAppointment = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, COL, id));
    } catch (err) {
      console.error('declineAppointment failed:', err);
      throw err;
    }
  }, []);

  // ── markDone ──────────────────────────────────────────────────────────────
  // Called by the clinic side. Flips status to 'done'.
  const markDone = useCallback(async (id) => {
    try {
      await updateDoc(doc(db, COL, id), { status: 'done' });
    } catch (err) {
      console.error('markDone failed:', err);
      throw err;
    }
  }, []);

  // ── getPatientAppointments ─────────────────────────────────────────────────
  // Filters local (already-synced) state by patient ID — no extra DB call needed.
  const getPatientAppointments = useCallback(
    (idno) => appointments.filter((a) => a.idno === idno),
    [appointments]
  );

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        loadingAppts,
        submitRequest,
        approveAppointment,
        declineAppointment,
        markDone,
        getPatientAppointments,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAppointments() {
  const ctx = useContext(AppointmentContext);
  if (!ctx) throw new Error('useAppointments must be used inside <AppointmentProvider>');
  return ctx;
}