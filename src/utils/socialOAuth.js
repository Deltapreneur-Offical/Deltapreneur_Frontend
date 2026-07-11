import { API_ORIGIN, PRODUCTION_API_ORIGIN } from '../config/urls';
import { saveReturnLocationBeforeOAuth } from './authSession';

function initiateOAuth(provider, from) {
  saveReturnLocationBeforeOAuth(
    from || localStorage.getItem('redirectAfterLogin') || null,
  );
  const backend = (API_ORIGIN || PRODUCTION_API_ORIGIN).replace(/\/$/, '');
  window.location.href = `${backend}/oauth2/authorization/${provider}`;
}

export function startGoogleOAuth(from) {
  initiateOAuth('google', from);
}

export function startLinkedInOAuth(from) {
  initiateOAuth('linkedin', from);
}
