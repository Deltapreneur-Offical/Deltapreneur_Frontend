import { useCallback, useEffect, useState } from 'react';
import { payoutProfileAPI } from '../api/domainTransferAPI';

function unwrapProfile(data) {
  if (!data) return null;
  if (data.profile) return data.profile;
  if (data.data?.profile) return data.data.profile;
  return data.data ?? data;
}

export default function usePayoutProfile({ enabled = true } = {}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      return Promise.resolve(null);
    }
    setLoading(true);
    setError('');
    return payoutProfileAPI
      .getMe()
      .then(({ data }) => {
        const next = unwrapProfile(data);
        setProfile(next);
        return next;
      })
      .catch((err) => {
        setProfile(null);
        setError(err?.response?.data?.error || err?.response?.data?.detail || 'Could not load payout profile.');
        return null;
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isComplete = Boolean(profile?.isComplete);

  return { profile, isComplete, loading, error, reload };
}
