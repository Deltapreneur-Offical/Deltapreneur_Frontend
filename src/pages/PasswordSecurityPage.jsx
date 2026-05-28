import { useState } from 'react';
import { authAPI } from '../api/services';

function MessageBlock({ error, info }) {
  return (
    <>
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
    </>
  );
}

export default function PasswordSecurityPage() {
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-indigo-50 py-10 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/92 rounded-[20px] border border-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-6">
          <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            For accounts that already have a password.
          </p>
          <MessageBlock error={changeError} info={changeInfo} />
          <form onSubmit={submitChange} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Current password"
              value={changeForm.currentPassword}
              onChange={(e) =>
                setChangeForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-sm outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
            <input
              type="password"
              placeholder="New password"
              value={changeForm.newPassword}
              onChange={(e) =>
                setChangeForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-sm outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={changeForm.confirm}
              onChange={(e) => setChangeForm((prev) => ({ ...prev, confirm: e.target.value }))}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-sm outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
            <button type="submit" className="btn-glow w-full" disabled={busyChange}>
              {busyChange ? 'Updating...' : 'Change password'}
            </button>
          </form>
        </div>

        <div className="bg-white/92 rounded-[20px] border border-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-6">
          <h2 className="text-xl font-semibold text-gray-900">Set Password</h2>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            For social-login users who do not have a password yet.
          </p>
          <MessageBlock error={setError} info={setInfo} />
          <form onSubmit={submitSet} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="New password"
              value={setForm.newPassword}
              onChange={(e) => setSetForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-sm outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={setForm.confirm}
              onChange={(e) => setSetForm((prev) => ({ ...prev, confirm: e.target.value }))}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-sm outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
            />
            <button type="submit" className="btn-glow w-full" disabled={busySet}>
              {busySet ? 'Updating...' : 'Set password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
