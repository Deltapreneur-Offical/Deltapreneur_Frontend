import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ventureAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { readApiError } from '../utils/apiError';
import AppLayout from '../components/layout/AppLayout';
import ListingBackLink from '../components/common/ListingBackLink';
import VentureForm from '../components/venture/VentureForm';
import Confetti from '../components/common/Confetti';

export default function NewVenturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasAccessToken, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const defaultListingType = searchParams.get('type') === 'co-venture' ? 'CO_VENTURE' : 'VENTURE';
  const [createdListingMode, setCreatedListingMode] = useState(defaultListingType);
  const [currentListingType, setCurrentListingType] = useState(defaultListingType);

  const readVentureApiError = (err) => readApiError(err, t('newVentureCreateFailed'));

  const clearAuthAndGoLogin = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth:cleared'));
    const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
    navigate('/login', { state: { from: { pathname: '/ventures/new', search } }, replace: true });
  };

  const handleSubmit = async (form, imageFile, pendingVerificationFiles = []) => {
    if (!hasAccessToken) {
      setError(t('newVentureSignInRequired'));
      clearAuthAndGoLogin();
      return;
    }
    setLoading(true); setError('');
    try {
        setCreatedListingMode(form.listingMode || 'VENTURE');
        const { data } = await ventureAPI.create(form);
        const savedId = data?.id ?? data?.data?.id;

        if (imageFile && savedId) {
            await ventureAPI.uploadImage(savedId, imageFile);
        }

        if (savedId && pendingVerificationFiles.length > 0) {
          await Promise.all(
            pendingVerificationFiles.map((item) =>
              ventureAPI.uploadVerificationDocument(savedId, item.file),
            ),
          );
        }

        setShowConfetti(true);
        setTimeout(() => navigate('/ventures'), 2200);
      } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            setError(t('newVentureSessionExpired'));
            clearAuthAndGoLogin();
            return;
          }
          setError(readVentureApiError(err));
      } finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <Confetti show={showConfetti} />

      {showConfetti && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 text-center max-w-sm mx-4 animate-slideUp">
            <div className="text-5xl mb-3">{createdListingMode === 'CO_VENTURE' ? '🤝' : '🚀'}</div>
            <h2 className="font-display text-2xl font-extrabold text-gray-900 mb-1">
              {createdListingMode === 'CO_VENTURE' ? 'Co-Venture listed' : t('newVenturePublished')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('newVentureRedirecting')} Your listing is visible under My Ventures and will appear in All Ventures after admin approval.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-full w-full">
        <ListingBackLink to="/ventures" label={t('listingBackToVentures')} />
        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-bold text-purple m-0 mb-2">
            {currentListingType === 'CO_VENTURE' ? 'List a New Co-Venture' : 'List a New Venture'}
          </h1>
          <p className="text-gray-600">{t('newVentureSubtitle')}</p>
        </div>
        <VentureForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          submitLabel={t('newVenturePublish')}
          showListingTypePicker
          defaultListingType={defaultListingType}
          onListingTypeChange={setCurrentListingType}
        />
      </div>
    </AppLayout>
  );
}
