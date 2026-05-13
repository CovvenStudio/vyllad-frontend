import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { monitoring } from '@/lib/monitoring/monitoring';
import {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from '@/lib/appointments-api';
import type { AppointmentDto, CreateAppointmentInput } from '@/lib/appointments-api';

export function useAppointments() {
  const { currentAgencyId } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentAgencyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAppointments(currentAgencyId, { take: 200 });
      setAppointments(data.items);
    } catch (err) {
      monitoring.captureException(err, { context: 'load-appointments' });
      setError('Erro ao carregar agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [currentAgencyId]);

  // Clear stale data immediately when agency changes
  useEffect(() => {
    setAppointments([]);
    setError(null);
  }, [currentAgencyId]);

  useEffect(() => { load(); }, [load]);

  const schedule = useCallback(async (input: CreateAppointmentInput): Promise<AppointmentDto> => {
    if (!currentAgencyId) throw new Error('Agência não seleccionada.');
    const apt = await createAppointment(currentAgencyId, input);
    setAppointments(prev => [...prev, apt]);
    return apt;
  }, [currentAgencyId]);

  const markCompleted = useCallback(async (id: string): Promise<void> => {
    if (!currentAgencyId) return;
    const updated = await updateAppointmentStatus(currentAgencyId, id, { status: 'completed' });
    setAppointments(prev => prev.map(a => (a.id === id ? updated : a)));
  }, [currentAgencyId]);

  const cancel = useCallback(async (id: string): Promise<void> => {
    if (!currentAgencyId) return;
    const updated = await updateAppointmentStatus(currentAgencyId, id, { status: 'cancelled' });
    setAppointments(prev => prev.map(a => (a.id === id ? updated : a)));
  }, [currentAgencyId]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!currentAgencyId) return;
    await deleteAppointment(currentAgencyId, id);
    setAppointments(prev => prev.filter(a => a.id !== id));
  }, [currentAgencyId]);

  return {
    appointments,
    loading,
    error,
    refresh: load,
    schedule,
    markCompleted,
    cancel,
    remove,
  };
}
