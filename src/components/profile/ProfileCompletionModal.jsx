import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resolvePostLoginNavigation } from '../../utils/authSession';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { readApiError } from '../../utils/apiError';


export default function ProfileCompletionModal({ forceOpen = false }) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ firstname: '', lastname: '', phoneNumber: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signUpEmail = user?.email || user?.emailAddress || '';

  useEffect(() => {
    if (user) {
      setForm({
        firstname: user.firstName || user.firstname || '',
        lastname: user.lastName || user.lastname || '',
        phoneNumber: user.phoneNumber || user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phoneNumber') {
      const numericValue = value.replace(/\D/g, '');
      setForm({ ...form, [name]: numericValue });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstname.trim() || !form.lastname.trim()) {
      setError(t('profileCompletionNameRequired'));
      return;
    }
    if (!/^\d{10}$/.test(form.phoneNumber.trim())) {
      setError(t('profileCompletionPhoneRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim() || undefined,
      };
      await authAPI.completeProfile(payload);
      const updatedUser = await refreshUser();
      const pending = location.state?.from;
      const destination = pending?.pathname
        ? resolvePostLoginNavigation(pending, updatedUser)
        : { pathname: '/' };
      navigate(destination.pathname, { replace: true, state: destination.state });
    } catch (err) {
      setError(readApiError(err, t('profileCompletionFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="relative my-auto w-full max-w-[520px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden animate-slideUp">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-5 pb-4 sm:p-8 sm:pb-6">
          <h2 className="font-display text-2xl font-bold text-gray-900 m-0 mb-2">{t('updateProfile')}</h2>
          <p className="text-gray-500 text-sm m-0 mb-6">{t('profileCompletionSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 px-5 sm:px-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('profileCompletionFirstName')} <span className="text-red-400">*</span>
              </label>
              <input
                name="firstname"
                value={form.firstname}
                onChange={handleChange}
                placeholder="e.g. Rahul"
                autoFocus
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('profileCompletionLastName')} <span className="text-red-400">*</span>
              </label>
              <input
                name="lastname"
                value={form.lastname}
                onChange={handleChange}
                placeholder="e.g. Sharma"
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('profileCompletionPhone')} <span className="text-red-400">*</span>
            </label>
            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              maxLength={10}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('profileCompletionEmail', 'Email ID')}
            </label>
            <input
              type="email"
              name="email"
              value={signUpEmail}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[10px] text-gray-600 text-sm cursor-not-allowed outline-none"
            />
            <p className="text-xs text-gray-400 m-0">
              {t('profileCompletionEmailHint', 'Read-only — collected during sign-up.')}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('profileCompletionAddress')} <span className="text-gray-400 text-xs">{t('domainsPageLogoOptional')}</span>
            </label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="e.g. Jayanagar, Bengaluru"
              maxLength={150}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 items-stretch">
            <button
              type="button"
              className="btn-glow btn-glow-sm flex-1 min-w-0 min-h-[2.75rem] bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              onClick={() => navigate(forceOpen ? '/' : -1)}
              disabled={loading}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn-glow btn-glow-sm flex-1 min-w-0 min-h-[2.75rem]"
              disabled={loading}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
              ) : (
                t('profileCompletionSubmit')
              )}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <Link
              to="/security/password"
              className="block text-center text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              Forgot password? Don&apos;t worry — manage it here
            </Link>
          </div>
        </form>

        <div className="relative z-10 px-5 sm:px-8 pb-5 sm:pb-8 pt-4 text-center text-xs text-gray-400">
          {t('profileCompletionFooterHint')}
        </div>
      </div>
    </div>
  );
}
