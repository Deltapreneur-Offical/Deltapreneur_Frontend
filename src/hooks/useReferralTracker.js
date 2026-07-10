import { useEffect, useRef } from 'react';
import api from '../api/axios';

export default function useReferralTracker(listingId, listingType) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!listingId || !listingType) return;

    const params = new URLSearchParams(window.location.search);
    const refUserId = params.get('ref');

    if (refUserId && !trackedRef.current) {
      trackedRef.current = true;
      api.post('/api/v1/referrals/track', {
        referrer_id: refUserId,
        listing_id: listingId,
        listing_type: listingType
      })
      .then(res => {
        console.log('Referral tracked:', res.data);
      })
      .catch(err => {
        console.error('Failed to track referral:', err);
      });
    }
  }, [listingId, listingType]);
}
