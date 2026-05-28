import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ventureAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import VentureForm from '../components/venture/VentureForm';
import Confetti from '../components/common/Confetti';

export default function NewVenturePage() {
  const navigate = useNavigate();
  const { hasAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  const readApiError = (err) => {
    const body = err?.response?.data;
    const firstValidation = Array.isArray(body?.data) ? body.data[0] : null;
    if (firstValidation?.field && firstValidation?.message) {
      return `${firstValidation.field}: ${firstValidation.message}`;
    }
    return (
      body?.error ||
      body?.detail ||
      body?.message ||
      'Failed to create venture.'
    );
  };

  const clearAuthAndGoLogin = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth:cleared'));
    navigate('/login', { state: { from: { pathname: '/ventures/new' } }, replace: true });
  };

  const handleSubmit = async (form, imageFile) => {
    if (!hasAccessToken) {
      setError('Please sign in again before creating a venture.');
      clearAuthAndGoLogin();
      return;
    }
    setLoading(true); setError('');
    try {
        const { data } = await ventureAPI.create(form);
        const savedId = data?.id ?? data?.data?.id;

        if (imageFile && savedId) {
            await ventureAPI.uploadImage(savedId, imageFile);
        }

        setShowConfetti(true);
        setTimeout(() => navigate('/ventures'), 2200);
      } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            setError('Your session expired. Please sign in again.');
            clearAuthAndGoLogin();
            return;
          }
          setError(readApiError(err));
      } finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <Confetti show={showConfetti} />

      {showConfetti && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 text-center max-w-sm mx-4 animate-slideUp">
            <div className="text-5xl mb-3">🚀</div>
            <h2 className="font-display text-2xl font-extrabold text-gray-900 mb-1">Venture Published!</h2>
            <p className="text-sm text-gray-500">Your venture is live. Redirecting…</p>
          </div>
        </div>
      )}

      <div className="max-w-full w-full">
        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-bold text-purple m-0 mb-2">List a New Venture</h1>
          <p className="text-gray-600">Fill in the details to attract the right co-venturers.</p>
        </div>
        <VentureForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          submitLabel="Publish Venture →"
        />
      </div>
    </AppLayout>
  );
}
