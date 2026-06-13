import { API_ORIGIN, PRODUCTION_API_ORIGIN } from '../config/urls';
import { saveReturnLocationBeforeOAuth } from './authSession';

export function startGoogleOAuth(from) {
  saveReturnLocationBeforeOAuth(
    from || localStorage.getItem('redirectAfterLogin') || null,
  );
  const backend = (API_ORIGIN || PRODUCTION_API_ORIGIN).replace(/\/$/, '');
  window.location.href = `${backend}/oauth2/authorization/google`;
}
