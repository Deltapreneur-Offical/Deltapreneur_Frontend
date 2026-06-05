import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/services';
import coBrotherLogo from '../assets/Cobrother_logo.png';
import AuthRegionalSettings from '../components/common/AuthRegionalSettings';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError(t('passwordsNoMatch'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('passwordMinLength'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.register({ email: form.email, password: form.password });
      setSuccess(true);
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 409) {
        setError(body?.error || body?.message || t('emailAlreadyRegistered', 'This email is already registered. Sign in or use Forgot password.'));
      } else {
        setError(body?.error || body?.message || t('registrationFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-gradient-to-b from-gray-50 to-indigo-50">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute w-[500px] h-[500px] bg-purple/16 rounded-full blur-[80px] opacity-70 -top-[150px] -right-[100px]" />
          <div className="absolute w-[400px] h-[400px] bg-blue-500/12 rounded-full blur-[80px] opacity-70 -bottom-[100px] -left-[100px]" />
        </div>
        <div className="relative z-10 w-full max-w-[440px] bg-white/92 p-10 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/60 backdrop-blur-xl text-center">
          <AuthRegionalSettings />
          <div className="text-5xl mb-4">✉</div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">{t('checkInbox')}</h2>
          <p className="text-gray-600 mb-6">{t('verificationSent', { email: form.email })}</p>
          <Link to="/login" className="btn-glow w-full mt-6">
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-gradient-to-b from-gray-50 to-indigo-50">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-purple/16 rounded-full blur-[80px] opacity-70 -top-[150px] -right-[100px]" />
        <div className="absolute w-[400px] h-[400px] bg-blue-500/12 rounded-full blur-[80px] opacity-70 -bottom-[100px] -left-[100px]" />
        <div className="absolute inset-0 opacity-65" style={{backgroundImage: 'linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-white/92 p-10 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/60 backdrop-blur-xl">
        <AuthRegionalSettings />
        <div className="text-center mb-8">
          <img src={coBrotherLogo} alt="CoBrother" className="w-[100px] h-auto object-contain mx-auto mb-4 block" />
          <h1 className="font-display text-[2rem] font-semibold text-gray-900">{t('registerTitle')}</h1>
          <p className="text-gray-600 text-[0.95rem] mt-1.5">{t('registerSubtitle')}</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-400 text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('emailLabel')}</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder={t('emailPlaceholder')} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('passwordLabel')}</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder={t('passwordPlaceholder')} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('confirmPasswordLabel')}</label>
            <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder={t('confirmPasswordPlaceholder')} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
          </div>
          <button type="submit" className="btn-glow w-full" disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /> : t('registerTitle')}
          </button>
        </form>

        <div className="flex gap-2 justify-center mt-6 text-sm text-gray-500">
          <span>{t('alreadyHaveAccount')}</span>
          <Link to="/login" className="text-purple-600 font-medium hover:underline">{t('signIn')}</Link>
        </div>
      </div>
    </div>
  );
}
