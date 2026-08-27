// frontend/src/context/AppointmentContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

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
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        ts: Date.now(),
      })
    );
  } catch {
    // sessionStorage quota exceeded
  }
};

const clearCache = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // noop
  }
};

// Maps DB row → shape the frontend components expect
const mapRow = (row) => ({
  ...row,

  name:
    row.name ??
    row.patient_name ??
    row.student_name ??
    '',

  type:
    row.type ??
    row.service_type ??
    '',

  bookedAt:
    row.bookedAt ??
    row.created_at ??
    '',

  status:
    (row.status ?? 'pending').toLowerCase(),
});

export function AppointmentProvider({ children }) {
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // Ref so callbacks always see the latest appointments
  const appointmentsRef = useRef([]);

  const syncAppointments = useCallback((data) => {
    appointmentsRef.current = data;
    setAppointments(data);
  }, []);

  // ── Fetch appointments ──────────────────────────────────────────────────────

  const fetchAppointments = useCallback(
    async (forceRefresh = false) => {
      try {
        if (!forceRefresh) {
          const cached = readCache();

          if (cached) {
            syncAppointments(cached);
            setLoadingAppts(false);
            return cached;
          }
        }

        setLoadingAppts(true);

        const { data, error } = await supabase
          .from(COL)
          .select('*')
          .eq('is_archived', false)
          .order('created_at', {
            ascending: true,
          });

        if (error) {
          console.error(
            '[AppointmentContext] Fetch failed:',
            error
          );

          throw error;
        }

        const mapped = (data || []).map(mapRow);

        syncAppointments(mapped);
        writeCache(mapped);

        return mapped;
      } catch (error) {
        console.error(
          '[AppointmentContext] fetchAppointments error:',
          error
        );

        throw error;
      } finally {
        setLoadingAppts(false);
      }
    },
    [syncAppointments]
  );

  // ── Initial load and realtime subscription ──────────────────────────────────

  useEffect(() => {
    let active = true;

    const cached = readCache();

    if (cached) {
      syncAppointments(cached);
      setLoadingAppts(false);
    } else {
      fetchAppointments(true).catch(() => {
        if (active) {
          setLoadingAppts(false);
        }
      });
    }

    const channel = supabase
      .channel(`${COL}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: COL,
        },
        (payload) => {
          if (!active) return;

          setAppointments((prev) => {
            let next = prev;

            if (payload.eventType === 'INSERT') {
              const incoming = mapRow(payload.new);

              const alreadyExists = prev.some(
                (appointment) =>
                  appointment.id === incoming.id
              );

              next = alreadyExists
                ? prev.map((appointment) =>
                    appointment.id === incoming.id
                      ? incoming
                      : appointment
                  )
                : [...prev, incoming];
            } else if (payload.eventType === 'UPDATE') {
              next = prev.map((appointment) =>
                appointment.id === payload.new.id
                  ? mapRow(payload.new)
                  : appointment
              );
            } else if (payload.eventType === 'DELETE') {
              next = prev.filter(
                (appointment) =>
                  appointment.id !== payload.old.id
              );
            }

            appointmentsRef.current = next;
            writeCache(next);

            return next;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(
            '[AppointmentContext] Realtime subscription failed.'
          );
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchAppointments, syncAppointments]);

  // ── Shared optimistic status update helper ──────────────────────────────────

  const patchStatus = useCallback(
    async (id, status, extra = {}) => {
      const previousAppointments =
        appointmentsRef.current;

      const optimisticAppointments =
        previousAppointments.map((appointment) =>
          appointment.id === id
            ? {
                ...appointment,
                status,
                ...extra,
              }
            : appointment
        );

      syncAppointments(optimisticAppointments);
      writeCache(optimisticAppointments);

      const { error } = await supabase
        .from(COL)
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...extra,
        })
        .eq('id', id);

      if (error) {
        console.error(
          `[AppointmentContext] patchStatus(${status}) failed:`,
          error
        );

        syncAppointments(previousAppointments);
        writeCache(previousAppointments);

        throw error;
      }
    },
    [syncAppointments]
  );

  // ── Submit patient appointment request ──────────────────────────────────────

  const submitRequest = useCallback(
    async ({
      name,
      idno,
      type,
      dept,
      prog,
      section,
      reason,
    }) => {
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

        if (error) {
          throw error;
        }

        const mapped = mapRow(data);

        setAppointments((prev) => {
          const alreadyExists = prev.some(
            (appointment) =>
              appointment.id === mapped.id
          );

          const next = alreadyExists
            ? prev
            : [...prev, mapped];

          appointmentsRef.current = next;
          writeCache(next);

          return next;
        });

        return data.id;
      } catch (error) {
        console.error(
          '[AppointmentContext] submitRequest failed:',
          error
        );

        throw error;
      }
    },
    []
  );

  // ── Appointment actions ─────────────────────────────────────────────────────

  const approveAppointment = useCallback(
    (id, { year, month, day, time }) =>
      patchStatus(id, 'approved', {
        year,
        month,
        day,
        time,
      }),
    [patchStatus]
  );

  const declineAppointment = useCallback(
    async (id) => {
      const previousAppointments =
        appointmentsRef.current;

      const optimisticAppointments =
        previousAppointments.map((appointment) =>
          appointment.id === id
            ? {
                ...appointment,
                status: 'rejected',
              }
            : appointment
        );

      syncAppointments(optimisticAppointments);
      writeCache(optimisticAppointments);

      try {
        const { error } = await supabase
          .from(COL)
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error(
          '[AppointmentContext] declineAppointment failed:',
          error
        );

        syncAppointments(previousAppointments);
        writeCache(previousAppointments);

        throw error;
      }
    },
    [syncAppointments]
  );

  const markDone = useCallback(
    (id) => patchStatus(id, 'done'),
    [patchStatus]
  );

  const markMissed = useCallback(
    (id) => patchStatus(id, 'missed'),
    [patchStatus]
  );

  // ── Manual local insertion ──────────────────────────────────────────────────
  // Useful immediately after creating through your Node backend, before
  // Supabase realtime delivers the INSERT event.

  const addAppointmentLocally = useCallback(
    (appointment) => {
      if (!appointment?.id) return;

      const mapped = mapRow(appointment);

      setAppointments((prev) => {
        const exists = prev.some(
          (item) => item.id === mapped.id
        );

        const next = exists
          ? prev.map((item) =>
              item.id === mapped.id
                ? mapped
                : item
            )
          : [...prev, mapped];

        appointmentsRef.current = next;
        writeCache(next);

        return next;
      });
    },
    []
  );

  // ── Cache refresh ────────────────────────────────────────────────────────────

  const refreshAppointments = useCallback(
    async () => {
      clearCache();
      return fetchAppointments(true);
    },
    [fetchAppointments]
  );

  const getPatientAppointments = useCallback(
    (idno) =>
      appointments.filter(
        (appointment) =>
          appointment.idno === idno ||
          appointment.patient_id === idno
      ),
    [appointments]
  );

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        loadingAppts,

        fetchAppointments,
        refreshAppointments,
        addAppointmentLocally,

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

  if (!ctx) {
    throw new Error(
      'useAppointments must be used inside <AppointmentProvider>'
    );
  }

  return ctx;
}