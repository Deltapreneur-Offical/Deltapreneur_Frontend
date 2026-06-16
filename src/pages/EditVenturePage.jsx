import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ventureAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import { isCoVentureListing } from '../utils/ventureListingHelpers';
import AppLayout from '../components/layout/AppLayout';
import VentureForm from '../components/venture/VentureForm';

export default function EditVenturePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [venture, setVenture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ventureAPI.get(id)
      .then(({ data }) => setVenture(unwrapApiData(data) || data))
      .catch(() => navigate('/ventures'))
      .finally(() => setFetching(false));
  }, [id, navigate]);

  useEffect(() => {
    if (fetching || window.location.hash !== '#company-profile') return;
    const timer = window.setTimeout(() => {
      document.getElementById('company-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [fetching]);

  const handleSubmit = async (form, imageFile) => {
    setLoading(true); setError('');
    try {
        await ventureAPI.update(id, form);

        if (imageFile) {
            await ventureAPI.uploadImage(id, imageFile);
        }

        navigate('/ventures');
      } catch (err) {
          setError(err.response?.data?.error || t('editVentureUpdateFailed'));
      } finally { setLoading(false); }
  };

  if (fetching) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  const coVentureMode = isCoVentureListing(venture);

  return (
    <AppLayout>
      <div className="max-w-full w-full">
        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-bold text-gray-900 m-0 mb-2">
            {coVentureMode ? 'Edit Co-Venture Listing' : t('editVentureTitle')}
          </h1>
          <p className="text-gray-600">
            {coVentureMode ? 'Update your partnership listing and co-founder requirements.' : t('editVentureSubtitle')}
          </p>
        </div>
        <VentureForm
          initialData={venture}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/ventures/dashboard')}
          loading={loading}
          error={error}
          coVentureMode={coVentureMode}
          submitLabel={t('editVentureSaveChanges')}
        />
      </div>
    </AppLayout>
  );
}
