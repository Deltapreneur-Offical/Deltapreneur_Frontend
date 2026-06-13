import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { domainAPI } from '../api/services';
import { extractDomainList } from '../utils/domainApiAdapter';
import { countDomainsPendingVerification } from '../utils/domainVerification';
import { DOMAIN_VERIFICATION_CHANGED } from '../utils/domainVerificationEvents';

export function useDomainPendingVerification() {
  const { user } = useAuth();
  const location = useLocation();
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  const refreshPendingVerification = useCallback(() => {
    if (!user?.id) {
      setPendingVerificationCount(0);
      return Promise.resolve(0);
    }
    return domainAPI.getMyListings()
      .then(({ data }) => {
        const count = countDomainsPendingVerification(extractDomainList(data));
        setPendingVerificationCount(count);
        return count;
      })
      .catch(() => {
        setPendingVerificationCount(0);
        return 0;
      });
  }, [user?.id]);

  useEffect(() => {
    refreshPendingVerification();
  }, [refreshPendingVerification, location.pathname]);

  useEffect(() => {
    const onChanged = () => { refreshPendingVerification(); };
    window.addEventListener(DOMAIN_VERIFICATION_CHANGED, onChanged);
    return () => window.removeEventListener(DOMAIN_VERIFICATION_CHANGED, onChanged);
  }, [refreshPendingVerification]);

  return { pendingVerificationCount, refreshPendingVerification };
}
