import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { domainTransferAPI } from '../api/domainTransferAPI';

export default function DomainTransferSellerPage() {
  const { transactionId } = useParams();
  const { t } = useTranslation();
  const [tx, setTx] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrarName, setRegistrarName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!transactionId) return;
    setError('');
    try {
      const [detail, events] = await Promise.all([
        domainTransferAPI.get(transactionId),
        domainTransferAPI.timeline(transactionId),
      ]);
      setTx(detail.data);
      setTimeline(events.data?.events || []);
    } catch (err) {
      setError(err?.response?.data?.error || t('transferLoadFailed', { defaultValue: 'Could not load transfer.' }));
    } finally {
      setLoading(false);
    }
  }, [transactionId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await domainTransferAPI.submitAuthCode(transactionId, {
        registrarName,
        authCode,
      });
      setAuthCode('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || t('transferSubmitFailed', { defaultValue: 'Submit failed.' }));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = tx && ['AWAITING_AUTH_CODE', 'ADMIN_REVIEW_REQUIRED'].includes(tx.transferStatus);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-3xl">
        <Link to="/domains/dashboard" className="inline-flex items-center gap-2 text-indigo-600 mb-4">
          <ArrowLeft size={16} /> {t('transferBackDashboard', { defaultValue: 'Back to dashboard' })}
        </Link>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
        ) : !tx ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{tx.domainFqdn}</h1>
            <p className="text-gray-600 mb-4">
              {t('transferStatus', { defaultValue: 'Status' })}: <strong>{tx.transferStatus}</strong>
            </p>
            {tx.sellerDeadlineAt && (
              <p className="text-sm text-amber-700 mb-4">
                {t('transferSellerDeadline', { defaultValue: 'Deadline' })}: {new Date(tx.sellerDeadlineAt).toLocaleString()}
              </p>
            )}
            {error && <p className="text-red-600 mb-3">{error}</p>}
            {canSubmit && (
              <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-6 space-y-3">
                <h2 className="font-semibold">{t('transferSubmitAuthCode', { defaultValue: 'Submit auth code' })}</h2>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={t('transferRegistrar', { defaultValue: 'Registrar name' })}
                  value={registrarName}
                  onChange={(e) => setRegistrarName(e.target.value)}
                  required
                />
                <input
                  className="w-full border rounded-lg px-3 py-2 font-mono"
                  placeholder={t('transferAuthCode', { defaultValue: 'Auth / EPP code' })}
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  required
                />
                <button type="submit" className="btn-glow" disabled={submitting}>
                  {submitting ? t('transferSubmitting', { defaultValue: 'Submitting…' }) : t('transferSubmit', { defaultValue: 'Submit' })}
                </button>
              </form>
            )}
            <div className="bg-gray-50 border rounded-xl p-4">
              <h3 className="font-semibold mb-2">{t('transferTimeline', { defaultValue: 'Timeline' })}</h3>
              <ul className="space-y-2 text-sm">
                {timeline.map((ev) => (
                  <li key={ev.id} className="flex justify-between gap-2">
                    <span>{ev.eventType}</span>
                    <span className="text-gray-500">{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
