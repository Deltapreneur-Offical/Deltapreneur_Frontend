import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'va_workspace_unlock_seen_';

export function getVaApplicationUnlockId(application) {
  if (!application) return null;
  return application.id || application.applicationId || application.referenceNumber || null;
}

export function getVaUnlockSeenKey(applicationId) {
  return `${STORAGE_PREFIX}${applicationId}`;
}

export function hasSeenVaUnlock(applicationId) {
  if (!applicationId) return false;
  try {
    return localStorage.getItem(getVaUnlockSeenKey(applicationId)) === '1';
  } catch {
    return false;
  }
}

export function markVaUnlockSeen(applicationId) {
  if (!applicationId) return;
  try {
    localStorage.setItem(getVaUnlockSeenKey(applicationId), '1');
  } catch {
    /* ignore quota / private mode */
  }
}

export function useVaUnlockSeen(applicationId) {
  const [seen, setSeen] = useState(() => hasSeenVaUnlock(applicationId));

  useEffect(() => {
    setSeen(hasSeenVaUnlock(applicationId));
  }, [applicationId]);

  const markSeen = useCallback(() => {
    markVaUnlockSeen(applicationId);
    setSeen(true);
  }, [applicationId]);

  return { seen, markSeen };
}
