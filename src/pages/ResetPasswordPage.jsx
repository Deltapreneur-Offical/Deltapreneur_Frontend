import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/services';
import coBrotherLogo from '../assets/Cobrother_logo.png';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!token) {
      setError('Reset token is missing. Open the link from your email again.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { data } = await authAPI.resetPassword(token, password);
      setInfo(data?.message || 'Password reset successful. Please log in.');
      setPassword('');
      setConfirm('');
    } catch (err) {
      const body = err.response?.data;
      setError(body?.error || body?.message || 'Unable to reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden bg-gradient-to-b from-gray-50 to-indigo-50">
      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] bg-white/92 px-5 pt-10 pb-6 sm:px-8 sm:pt-10 sm:pb-8 md:p-10 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/60 backdrop-blur-xl">
        <div className="text-center mb-7">
          <img
            src={coBrotherLogo}
            alt="CoBrother"
            className="w-[170px] sm:w-[190px] h-auto object-contain mx-auto mb-3"
          />
          <h1 className="font-display text-[1.7rem] sm:text-[1.9rem] font-semibold text-gray-900 leading-tight">
            Reset Password
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Set a new password for your account.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-600 text-sm mb-4">
            {error}
          </div>
        )}
        {info && (
          <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-[10px] text-emerald-700 text-sm mb-4">
            {info}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">New password</label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 chars with letter and number"
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Confirm password</label>
            <input
              name="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
          </div>

          <button type="submit" className="btn-glow w-full" disabled={busy}>
            {busy ? (
              <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin inline-block" />
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        <div className="flex justify-center gap-2 mt-6 text-sm text-gray-500">
          <span>Back to</span>
          <Link to="/login" className="text-purple-600 font-medium hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
