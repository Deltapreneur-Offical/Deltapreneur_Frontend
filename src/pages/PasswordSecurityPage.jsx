import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  KeyRound,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { authAPI } from '../api/services';
import BackButton from '../components/common/BackButton';

const TABS = [
  {
    id: 'change',
    label: 'Update password',
    shortLabel: 'Update',
    badge: 'Email sign-in',
    badgeIcon: Mail,
    accent: 'from-violet-600 to-indigo-600',
    title: 'Change your password',
    description:
      'You signed up with email and password. Enter your current password, then choose a new one.',
    hint: 'Use this if you normally log in with your email address and password.',
    mobileLine: 'For email & password accounts',
  },
  {
    id: 'set',
    label: 'Create password',
    shortLabel: 'Create',
    badge: 'Google / OAuth',
    badgeIcon: Sparkles,
    accent: 'from-emerald-600 to-teal-600',
    title: 'Add a password to your account',
    description:
      'You signed in with Google or another provider and have not set a password yet. Create one to also sign in with email.',
    hint: 'Use this only if you have never set a password on CoBrother.',
    mobileLine: 'For Google / social sign-in only',
  },
];

const fadeSlide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
};

function MessageBlock({ error, info }) {
  if (!error && !info) return null;
  const isError = Boolean(error);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm ${
        isError
          ? 'bg-red-50 border border-red-200/80 text-red-700'
          : 'bg-emerald-50 border border-emerald-200/80 text-emerald-800'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      )}
      <span className="leading-snug">{error || info}</span>
    </motion.div>
  );
}

function PasswordField({ id, label, placeholder, value, onChange, required = true }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={id.includes('current') ? 'current-password' : 'new-password'}
          className="w-full px-4 py-3 pr-11 bg-white border border-gray-300 rounded-[10px] text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function PasswordSecurityPage() {
  const [activeTab, setActiveTab] = useState('change');

  const [changeForm, setChangeForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  });
  const [setForm, setSetForm] = useState({
    newPassword: '',
    confirm: '',
  });

  const [busyChange, setBusyChange] = useState(false);
  const [busySet, setBusySet] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeInfo, setChangeInfo] = useState('');
  const [setError, setSetError] = useState('');
  const [setInfo, setSetInfo] = useState('');

  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const ActiveBadgeIcon = activeMeta.badgeIcon;

  const submitChange = async (e) => {
    e.preventDefault();
    setChangeError('');
    setChangeInfo('');
    if (changeForm.newPassword !== changeForm.confirm) {
      setChangeError('New password and confirm password do not match.');
      return;
    }
    setBusyChange(true);
    try {
      const { data } = await authAPI.changePassword(
        changeForm.currentPassword,
        changeForm.newPassword,
      );
      setChangeInfo(
        data?.message ||
          'Password changed. Please login again because all sessions were revoked.',
      );
      setChangeForm({ currentPassword: '', newPassword: '', confirm: '' });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (err) {
      const body = err.response?.data;
      setChangeError(body?.error || body?.message || 'Unable to change password.');
    } finally {
      setBusyChange(false);
    }
  };

  const submitSet = async (e) => {
    e.preventDefault();
    setSetError('');
    setSetInfo('');
    if (setForm.newPassword !== setForm.confirm) {
      setSetError('New password and confirm password do not match.');
      return;
    }
    setBusySet(true);
    try {
      const { data } = await authAPI.setPassword(setForm.newPassword);
      setSetInfo(
        data?.message ||
          'Password set. Please login again because all sessions were revoked.',
      );
      setSetForm({ newPassword: '', confirm: '' });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (err) {
      const body = err.response?.data;
      setSetError(body?.error || body?.message || 'Unable to set password.');
    } finally {
      setBusySet(false);
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/90 flex items-center justify-center px-3 py-3 sm:px-5 sm:py-4">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-4 sm:top-5 sm:left-5 z-20"
      >
        <BackButton
          to="/complete-profile"
          variant="pill"
          label="Back"
          className="relative z-30 pointer-events-auto shadow-[0_2px_12px_rgba(15,23,42,0.08)] bg-white/95 backdrop-blur-sm border-gray-200/90 hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:border-gray-300 px-3.5 py-2"
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.12, 0.18, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-16 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-violet-400/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-16 -left-16 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-indigo-400/15 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-3xl flex flex-col max-h-[calc(100dvh-1.5rem)]"
      >
        <div className="flex items-center gap-3 mb-3 sm:mb-4 shrink-0">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30 shrink-0"
          >
            <Shield className="w-5 h-5 sm:w-5 sm:h-5" strokeWidth={1.75} />
          </motion.div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-semibold text-gray-900 tracking-tight truncate">
              Password &amp; security
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              Pick the tab that matches how you sign in
            </p>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(15,23,42,0.07)] flex flex-col min-h-0 overflow-hidden">
          <div className="p-2 sm:p-2.5 border-b border-gray-100 shrink-0">
            <div className="relative flex gap-1 p-0.5 sm:p-1 bg-gray-100/90 rounded-lg sm:rounded-xl">
              {TABS.map((tab) => {
                const Icon = tab.id === 'change' ? KeyRound : Sparkles;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 z-10 ${
                      isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="security-tab-pill"
                        className="absolute inset-0 bg-white rounded-md sm:rounded-lg shadow-sm border border-gray-200/70"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" strokeWidth={2} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </span>
                    <span
                      className={`relative text-[10px] sm:hidden leading-none ${
                        isActive ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {tab.mobileLine}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] lg:divide-x lg:divide-gray-100 min-h-0 flex-1">
            <div className="hidden lg:flex flex-col justify-center p-5 xl:p-6 bg-gradient-to-br from-gray-50/60 to-transparent shrink-0">
              <motion.div
                key={activeTab}
                {...fadeSlide}
                className="space-y-2.5"
              >
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r ${activeMeta.accent} text-white shadow-sm w-fit`}
                >
                  <ActiveBadgeIcon className="w-3 h-3" />
                  {activeMeta.badge}
                </div>
                <h2 className="text-lg xl:text-xl font-semibold text-gray-900 leading-snug">
                  {activeMeta.title}
                </h2>
                <p className="text-xs xl:text-sm text-gray-600 leading-relaxed line-clamp-3">
                  {activeMeta.description}
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed border-l-2 border-gray-200 pl-2.5 line-clamp-2">
                  {activeMeta.hint}
                </p>
                {activeTab === 'change' && (
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors duration-200"
                  >
                    Forgot your current password?
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </motion.div>
              <p className="mt-4 text-[10px] text-gray-400 leading-snug">
                You&apos;ll be signed out on all devices after saving.
              </p>
            </div>

            <div className="p-3 sm:p-4 lg:p-5 flex flex-col justify-center min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`context-${activeTab}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="lg:hidden mb-2.5 shrink-0"
                >
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gradient-to-r ${activeMeta.accent} text-white mb-1.5`}
                  >
                    <ActiveBadgeIcon className="w-2.5 h-2.5" />
                    {activeMeta.badge}
                  </div>
                  <p className="text-xs text-gray-600 leading-snug">{activeMeta.mobileLine}</p>
                </motion.div>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {activeTab === 'change' ? (
                  <motion.div key="change-form" {...fadeSlide}>
                    <MessageBlock error={changeError} info={changeInfo} />
                    <form onSubmit={submitChange} className="flex flex-col gap-4">
                      <PasswordField
                        id="current-password"
                        label="Current password"
                        placeholder="Enter your current password"
                        value={changeForm.currentPassword}
                        onChange={(e) =>
                          setChangeForm((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                      />
                      <PasswordField
                        id="new-password"
                        label="New password"
                        placeholder="At least 8 characters, letter and number"
                        value={changeForm.newPassword}
                        onChange={(e) =>
                          setChangeForm((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                      />
                      <PasswordField
                        id="confirm-password"
                        label="Confirm new password"
                        placeholder="Re-enter your new password"
                        value={changeForm.confirm}
                        onChange={(e) =>
                          setChangeForm((prev) => ({ ...prev, confirm: e.target.value }))
                        }
                      />
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="btn-glow w-full mt-0.5 flex items-center justify-center gap-2 py-2.5 text-sm"
                        disabled={busyChange}
                      >
                        {busyChange ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update password'
                        )}
                      </motion.button>
                      {activeTab === 'change' && (
                        <Link
                          to="/forgot-password"
                          className="lg:hidden text-center text-xs text-violet-600 hover:text-violet-700 transition-colors duration-200"
                        >
                          Forgot your current password?
                        </Link>
                      )}
                    </form>
                  </motion.div>
                ) : (
                  <motion.div key="set-form" {...fadeSlide}>
                    <MessageBlock error={setError} info={setInfo} />
                    <form onSubmit={submitSet} className="flex flex-col gap-4">
                      <PasswordField
                        id="set-new-password"
                        label="New password"
                        placeholder="At least 8 characters, letter and number"
                        value={setForm.newPassword}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                      />
                      <PasswordField
                        id="set-confirm-password"
                        label="Confirm new password"
                        placeholder="Re-enter your new password"
                        value={setForm.confirm}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, confirm: e.target.value }))
                        }
                      />
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="btn-glow w-full mt-0.5 flex items-center justify-center gap-2 py-2.5 text-sm"
                        disabled={busySet}
                      >
                        {busySet ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create password'
                        )}
                      </motion.button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-3 py-2 sm:px-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <p className="text-[10px] sm:text-xs text-center text-gray-400 leading-snug">
              Google user?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('set')}
                className="text-violet-600 hover:underline font-medium transition-colors duration-200"
              >
                Create password
              </button>
              {' · '}
              Email user?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('change')}
                className="text-violet-600 hover:underline font-medium transition-colors duration-200"
              >
                Update password
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
