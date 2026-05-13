import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { monitoring } from '@/lib/monitoring/monitoring';
import {
  listProperties,
  createProperty,
  updateProperty,
  setPropertyStatus,
} from '@/lib/properties-api';
import type { PropertyDto, CreatePropertyInput, UpdatePropertyInput } from '@/lib/properties-api';

export function useProperties() {
  const { currentAgencyId } = useAuth();
  const [properties, setProperties] = useState<PropertyDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentAgencyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listProperties(currentAgencyId);
      setProperties(data.properties);
    } catch (err) {
      monitoring.captureException(err, { context: 'load-properties' });
      setError('Erro ao carregar imóveis.');
    } finally {
      setLoading(false);
    }
  }, [currentAgencyId]);

  // Clear stale data immediately when agency changes
  useEffect(() => {
    setProperties([]);
    setError(null);
  }, [currentAgencyId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreatePropertyInput) => {
    if (!currentAgencyId) throw new Error('No agency selected');
    const created = await createProperty(currentAgencyId, input);
    await load();
    return created;
  }, [currentAgencyId, load]);

  const update = useCallback(async (id: string, input: UpdatePropertyInput) => {
    if (!currentAgencyId) throw new Error('No agency selected');
    const updated = await updateProperty(currentAgencyId, id, input);
    await load();
    return updated;
  }, [currentAgencyId, load]);

  const setStatus = useCallback(async (
    id: string,
    status: 'ACTIVE' | 'PAUSED' | 'RENTED' | 'ARCHIVED',
  ) => {
    if (!currentAgencyId) throw new Error('No agency selected');
    await setPropertyStatus(currentAgencyId, id, status);
    await load();
  }, [currentAgencyId, load]);

  return { properties, loading, error, create, update, setStatus, refresh: load };
}
