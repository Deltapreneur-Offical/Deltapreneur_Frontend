import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { adminAPI, virtualAssistantAPI } from '../../api/services';
import { unwrapApiData } from '../../utils/apiResponse';
import { resolveVaProfilePhotoUrl } from '../../utils/virtualAssistantDisplay';

async function fetchFreshProfilePhotoUrl(applicationId, refreshScope) {
  if (!applicationId && refreshScope !== 'workspace') return null;

  if (refreshScope === 'admin') {
    const response = await adminAPI.getVirtualAssistantProfilePhotoUrl(applicationId);
    return unwrapApiData(response)?.profilePhotoUrl || null;
  }
  if (refreshScope === 'public') {
    const response = await virtualAssistantAPI.getPublicProfilePhotoUrl(applicationId);
    const payload = unwrapApiData(response);
    return payload?.profilePhotoUrl || null;
  }
  if (refreshScope === 'workspace') {
    const response = await virtualAssistantAPI.getWorkspaceProfilePhotoUrl();
    return unwrapApiData(response)?.profilePhotoUrl || null;
  }
  return null;
}

/**
 * Renders a VA profile photo with fallback avatar and one automatic URL refresh
 * when the stored/presigned image fails to load.
 */
export default function VaProfilePhoto({
  source,
  applicationId,
  refreshScope = 'admin',
  alt = '',
  className = '',
  fallbackClassName = '',
  fallback = 'initial',
  fallbackIcon: FallbackIcon = User,
  fallbackIconSize = 36,
  fallbackIconClassName = '',
  imgProps = {},
}) {
  const [url, setUrl] = useState(() => resolveVaProfilePhotoUrl(source));
  const [errored, setErrored] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);

  useEffect(() => {
    setUrl(resolveVaProfilePhotoUrl(source));
    setErrored(false);
    setRefreshAttempted(false);
  }, [
    source?.profilePhotoUrl,
    source?.profile_photo_url,
    source?.profilePhotoKey,
    source?.profile_photo_key,
    source?.photoUrl,
    source?.photo_url,
  ]);

  const handleError = async () => {
    if (refreshAttempted) {
      setErrored(true);
      return;
    }
    setRefreshAttempted(true);
    try {
      const freshUrl = await fetchFreshProfilePhotoUrl(applicationId || source?.id, refreshScope);
      if (freshUrl) {
        setUrl(freshUrl);
        setErrored(false);
        return;
      }
    } catch {
      /* fall through to fallback */
    }
    setErrored(true);
  };

  if (url && !errored) {
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        onError={handleError}
        {...imgProps}
      />
    );
  }

  const initial = (source?.fullName || source?.name || source?.full_name || '?')[0]?.toUpperCase();

  if (fallback === 'icon') {
    return (
      <div className={fallbackClassName || className} aria-hidden>
        <FallbackIcon size={fallbackIconSize} className={fallbackIconClassName} />
      </div>
    );
  }

  return (
    <div className={fallbackClassName || className} aria-hidden>
      <span>{initial || '?'}</span>
    </div>
  );
}
