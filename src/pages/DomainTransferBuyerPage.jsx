import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { domainTransferAPI } from '../api/domainTransferAPI';

export default function DomainTransferBuyerPage() {
  const { transactionId } = useParams();
  const { t } = useTranslation();
  const [tx, setTx] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [revealedCode, setRevealedCode] = useState('');
  const [registrar, setRegistrar] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!transactionId) return;
    setError('');
    try {
      const { data } = await domainTransferAPI.get(transactionId);
      setTx(data);
      if (data.buyerTargetRegistrar) setRegistrar(data.buyerTargetRegistrar);
    } catch (err) {
      setError(err?.response?.data?.error || t('transferLoadFailed', { defaultValue: 'Could not load transfer.' }));
    } finally {
      setLoading(false);
    }
  }, [transactionId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const chooseSelf = async () => {
    setBusy(true);
    setError('');
    try {
      await domainTransferAPI.chooseSelfTransfer(transactionId, { buyerTargetRegistrar: registrar });
      const { data } = await domainTransferAPI.getInstructions(transactionId);
      setInstructions(data);
      await load();
      setMessage(t('transferPathAChosen', { defaultValue: 'Self-transfer selected.' }));
    } catch (err) {
      setError(err?.response?.data?.error || t('transferActionFailed', { defaultValue: 'Action failed.' }));
    } finally {
      setBusy(false);
    }
  };

  const requestHelp = async () => {
    setBusy(true);
    try {
      await domainTransferAPI.requestAssistance(transactionId);
      await load();
      setMessage(t('transferAssistanceRequested', { defaultValue: 'CoBrother assistance requested.' }));
    } catch (err) {
      setError(err?.response?.data?.error || t('transferActionFailed', { defaultValue: 'Action failed.' }));
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    setBusy(true);
    try {
      await domainTransferAPI.sendRevealOtp(transactionId);
      setMessage(t('transferOtpSent', { defaultValue: 'OTP sent to your email.' }));
    } catch (err) {
      setError(err?.response?.data?.error || t('transferActionFailed', { defaultValue: 'Action failed.' }));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    try {
      const { data } = await domainTransferAPI.verifyRevealOtp(transactionId, otp);
      setRevealedCode(data.authCode || '');
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || t('transferOtpInvalid', { defaultValue: 'Invalid OTP.' }));
    } finally {
      setBusy(false);
    }
  };

  const confirmDone = async () => {
    setBusy(true);
    try {
      await domainTransferAPI.confirmTransfer(transactionId);
      await load();
      setMessage(t('transferConfirmed', { defaultValue: 'Transfer confirmed. Payout pending.' }));
    } catch (err) {
      setError(err?.response?.data?.error || t('transferActionFailed', { defaultValue: 'Action failed.' }));
    } finally {
      setBusy(false);
    }
  };

  const hasAuth = tx?.hasAuthCode;
  const canReveal = hasAuth && ['AUTH_CODE_RECEIVED', 'AUTH_CODE_VIEWED', 'TRANSFER_IN_PROGRESS'].includes(tx?.transferStatus);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-3xl">
        <Link to="/purchases" className="inline-flex items-center gap-2 text-indigo-600 mb-4">
          <ArrowLeft size={16} /> {t('transferBackPurchases', { defaultValue: 'Back to purchases' })}
        </Link>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
        ) : !tx ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{tx.domainFqdn}</h1>
            <p className="text-gray-600 mb-4">{t('transferStatus', { defaultValue: 'Status' })}: <strong>{tx.transferStatus}</strong></p>
            {message && <p className="text-green-700 mb-3">{message}</p>}
            {error && <p className="text-red-600 mb-3">{error}</p>}

            {hasAuth && !tx.transferMethod && (
              <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
                <h2 className="font-semibold">{t('transferChoosePath', { defaultValue: 'Transfer path' })}</h2>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={t('transferYourRegistrar', { defaultValue: 'Your registrar (Path A)' })}
                  value={registrar}
                  onChange={(e) => setRegistrar(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-glow btn-glow-sm" disabled={busy || !registrar} onClick={chooseSelf}>
                    {t('transferPathA', { defaultValue: 'Transfer myself' })}
                  </button>
                  <button type="button" className="btn-glow btn-glow-sm" disabled={busy} onClick={requestHelp}>
                    {t('transferPathB', { defaultValue: 'Request CoBrother help' })}
                  </button>
                </div>
              </div>
            )}

            {instructions?.steps && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                <h3 className="font-semibold mb-2">{t('transferInstructions', { defaultValue: 'Registrar steps' })}</h3>
                <ol className="list-decimal ml-5 space-y-1 text-sm">
                  {instructions.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {canReveal && (
              <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
                <h2 className="font-semibold">{t('transferRevealAuth', { defaultValue: 'Reveal auth code' })}</h2>
                <button type="button" className="btn-glow btn-glow-sm" disabled={busy} onClick={sendOtp}>
                  {t('transferSendOtp', { defaultValue: 'Send OTP' })}
                </button>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2"
                    placeholder="OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button type="button" className="btn-glow btn-glow-sm" disabled={busy || !otp} onClick={verifyOtp}>
                    {t('transferVerifyOtp', { defaultValue: 'Verify' })}
                  </button>
                </div>
                {revealedCode && (
                  <p className="font-mono bg-gray-100 p-3 rounded-lg break-all">{revealedCode}</p>
                )}
              </div>
            )}

            {['AUTH_CODE_VIEWED', 'TRANSFER_IN_PROGRESS'].includes(tx.transferStatus) && (
              <button type="button" className="btn-glow" disabled={busy} onClick={confirmDone}>
                {t('transferMarkComplete', { defaultValue: 'I completed the transfer' })}
              </button>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
