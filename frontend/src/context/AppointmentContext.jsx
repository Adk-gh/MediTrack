// frontend/src/context/AppointmentContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

const AppointmentContext = createContext(null);
const COL = 'appointments';

// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_KEY = 'appt_cache_v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage quota exceeded — silently skip
  }
};

const clearCache = () => {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
};

// Maps DB row → shape the frontend components expect
const mapRow = (row) => ({
  ...row,
  name:     row.name     ?? row.patient_name ?? row.student_name ?? '',
  type:     row.type     ?? row.service_type ?? '',
  bookedAt: row.bookedAt ?? row.created_at   ?? '',
  status:   (row.status  ?? 'pending').toLowerCase(),
});

export function AppointmentProvider({ children }) {
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // Ref so realtime handlers always see latest appointments without re-subscribing
  const appointmentsRef = useRef([]);
  const syncRef = (data) => {
    appointmentsRef.current = data;
    setAppointments(data);
  };

  useEffect(() => {
    // ── 1. Serve from cache immediately (zero loading flicker) ────────────────
    const cached = readCache();
    if (cached) {
      syncRef(cached);
      setLoadingAppts(false);
      // Still subscribe to realtime — cache will be kept in sync below
    }

    // ── 2. Fetch from Supabase (only on cache miss or first load) ─────────────
    const fetchAppointments = async () => {
      if (cached) return; // cache hit — skip the DB round-trip

      const { data, error } = await supabase
        .from(COL)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase fetch error:', error);
      } else {
        const mapped = (data || []).map(mapRow);
        syncRef(mapped);
        writeCache(mapped);
      }
      setLoadingAppts(false);
    };

    fetchAppointments();

    // ── 3. Realtime subscription — patches cache on every DB change ───────────
    const channel = supabase
      .channel(`${COL}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: COL }, (payload) => {
        setAppointments((prev) => {
          let next;
          if (payload.eventType === 'INSERT') {
            next = [...prev, mapRow(payload.new)];
          } else if (payload.eventType === 'UPDATE') {
            next = prev.map((a) => (a.id === payload.new.id ? mapRow(payload.new) : a));
          } else if (payload.eventType === 'DELETE') {
            next = prev.filter((a) => a.id !== payload.old.id);
          } else {
            return prev;
          }
          writeCache(next); // keep cache in sync with every realtime event
          return next;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ── Shared helper: optimistic update → Supabase write ────────────────────────
  // Optimistic update patches local state + cache instantly;
  // Supabase realtime will confirm/reconcile shortly after.
  const patchStatus = useCallback(async (id, status, extra = {}) => {
    setAppointments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status, ...extra } : a));
      writeCache(next); // optimistically update cache too
      return next;
    });

    const { error } = await supabase
      .from(COL)
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id);

    if (error) {
      console.error(`patchStatus(${status}) failed:`, error);
      // Roll back optimistic update on failure
      setAppointments((prev) => {
        const rolledBack = prev.map((a) =>
          a.id === id ? { ...a, status: a._prevStatus ?? a.status } : a
        );
        writeCache(rolledBack);
        return rolledBack;
      });
      throw error;
    }
  }, []);

  const submitRequest = useCallback(
    async ({ name, idno, type, dept, prog, section, reason }) => {
      try {
        const { data, error } = await supabase
          .from(COL)
          .insert({
            patient_name: name,
            student_name: name,
            service_type: type,
            reason,
            status: 'pending',
            created_at: new Date().toISOString(),
            idno,
            dept,
            prog,
            section,
          })
          .select()
          .single();

        if (error) throw error;
        // Realtime INSERT event will update state + cache automatically
        return data.id;
      } catch (err) {
        console.error('submitRequest failed:', err);
        throw err;
      }
    },
    []
  );

  const approveAppointment = useCallback(
    (id, { year, month, day, time }) =>
      patchStatus(id, 'approved', { year, month, day, time }),
    [patchStatus]
  );

  const declineAppointment = useCallback(async (id) => {
    try {
      // Optimistic update - set status to 'declined' instead of deleting
      setAppointments((prev) => {
        const next = prev.map(a =>
          a.id === id ? { ...a, status: 'declined' } : a
        );
        writeCache(next);
        return next;
      });

      // Update status to 'declined' instead of deleting
      const { error } = await supabase
        .from(COL)
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('declineAppointment failed:', err);
      throw err;
    }
  }, []);

  const markDone   = useCallback((id) => patchStatus(id, 'done'),   [patchStatus]);
  const markMissed = useCallback((id) => patchStatus(id, 'missed'), [patchStatus]);

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
        markMissed,
        getPatientAppointments,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(AppointmentContext);
  if (!ctx) throw new Error('useAppointments must be used inside <AppointmentProvider>');
  return ctx;
}