import {
  allowedReturnOrigin,
  PRODUCTION_API_ORIGIN,
  resolveBackendOrigin,
} from '../config/urls';
import { saveReturnLocationBeforeOAuth } from './authSession';

function initiateOAuth(provider, from) {
  saveReturnLocationBeforeOAuth(
    from || localStorage.getItem('redirectAfterLogin') || null,
  );
  const backend = (resolveBackendOrigin() || PRODUCTION_API_ORIGIN).replace(
    /\/$/,
    '',
  );
  const origin =
    typeof window !== 'undefined'
      ? allowedReturnOrigin(window.location.origin)
      : null;
  const query = origin
    ? `?return_origin=${encodeURIComponent(origin)}`
    : '';
  window.location.href = `${backend}/oauth2/authorization/${provider}${query}`;
}

export function startGoogleOAuth(from) {
  initiateOAuth('google', from);
}

export function startLinkedInOAuth(from) {
  initiateOAuth('linkedin', from);
}

export function startFacebookOAuth(from) {
  initiateOAuth('facebook', from);
}

export function startInstagramOAuth(from) {
  initiateOAuth('instagram', from);
}
