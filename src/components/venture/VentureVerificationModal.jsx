import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { ventureAPI } from '../../api/services';
import { unwrapApiData } from '../../utils/apiResponse';
import {
  canOpenVentureVerification,
  isVentureVerificationApproved,
  ventureVerificationStatusLabel,
} from '../../utils/ventureVerification';
import VentureVerificationSection from './VentureVerificationSection';

function VentureVerificationForm({ venture, onBack, onClose, onSaved }) {
  const [requested, setRequested] = useState(
    Boolean(venture?.verificationRequested ?? venture?.verification_requested),
  );
  const [videoUrl, setVideoUrl] = useState(
    venture?.verificationVideoUrl ?? venture?.verification_video_url ?? '',
  );
  const [documents, setDocuments] = useState(
    venture?.verificationDocuments ?? venture?.verification_documents ?? [],
  );
  const [status, setStatus] = useState(
    venture?.verificationStatus ?? venture?.verification_status ?? 'NONE',
  );
  const [rejectionReason, setRejectionReason] = useState(
    venture?.verificationRejectionReason ?? venture?.verification_rejection_reason ?? '',
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    ventureAPI.get(venture.id)
      .then(({ data }) => {
        if (cancelled) return;
        const fresh = unwrapApiData(data) || data;
        setRequested(Boolean(fresh.verificationRequested ?? fresh.verification_requested));
        setVideoUrl(fresh.verificationVideoUrl ?? fresh.verification_video_url ?? '');
        setDocuments(fresh.verificationDocuments ?? fresh.verification_documents ?? []);
        setStatus(fresh.verificationStatus ?? fresh.verification_status ?? 'NONE');
        setRejectionReason(
          fresh.verificationRejectionReason ?? fresh.verification_rejection_reason ?? '',
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [venture.id]);

  const brandName = venture?.brandDetails?.brandName
    ?? venture?.brand_details?.brand_name
    ?? 'Listing';

  const handleUpload = async (file) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const res = await ventureAPI.uploadVerificationDocument(venture.id, file);
      const body = unwrapApiData(res.data) || res.data;
      const docs = body?.verificationDocuments ?? body?.verification_documents ?? documents;
      setDocuments(Array.isArray(docs) ? docs : documents);
    } catch (err) {
      setUploadError(
        err.response?.data?.error
        || err.response?.data?.message
        || 'Could not upload verification document.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await ventureAPI.update(venture.id, {
        verificationRequested: requested,
        verificationVideoUrl: videoUrl.trim() || null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error
        || err.response?.data?.detail
        || err.response?.data?.message
        || 'Could not save verification request.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          {onBack ? (
            <button
              type="button"
              className="text-sm text-indigo-600 hover:text-indigo-800 mb-2"
              onClick={onBack}
            >
              ← Back to listings
            </button>
          ) : null}
          <h2 className="font-display text-xl font-bold text-gray-900 m-0 flex items-center gap-2">
            <ShieldCheck size={20} className="text-indigo-600" aria-hidden />
            Verify listing (optional)
          </h2>
          <p className="text-sm text-gray-600 mt-1 mb-0">{brandName}</p>
        </div>
        <button
          type="button"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <VentureVerificationSection
        requested={requested}
        videoUrl={videoUrl}
        documents={documents}
        status={status}
        rejectionReason={rejectionReason}
        onRequestedChange={setRequested}
        onVideoUrlChange={setVideoUrl}
        onUploadDocument={handleUpload}
        uploading={uploading}
        uploadError={uploadError}
        pendingUploadHint="Documents upload immediately when you select a file."
      />

      {error && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button type="button" className="btn-glow flex-1" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn-glow flex-1" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save verification'}
        </button>
      </div>
    </>
  );
}

export default function VentureVerifyListingModal({
  ventures = [],
  onClose,
  onSaved,
}) {
  const [selected, setSelected] = useState(null);
  const eligible = ventures.filter(canOpenVentureVerification);
  const verified = ventures.filter(isVentureVerificationApproved);

  useEffect(() => {
    if (ventures.length === 1 && canOpenVentureVerification(ventures[0])) {
      setSelected(ventures[0]);
    }
  }, [ventures]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSaved = () => {
    onSaved?.();
    setSelected(null);
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 animate-fadeIn backdrop-blur-md"
      style={{ background: 'rgba(17, 24, 39, 0.42)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="venture-verify-modal-title"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-[0_24px_60px_rgba(17,24,39,0.2)] animate-slideUp p-6 sm:p-8">
        {selected ? (
          <VentureVerificationForm
            venture={selected}
            onBack={ventures.length > 1 ? () => setSelected(null) : null}
            onClose={onClose}
            onSaved={handleSaved}
          />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 id="venture-verify-modal-title" className="font-display text-xl font-bold text-gray-900 m-0 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-indigo-600" aria-hidden />
                  Verify listing (optional)
                </h2>
                <p className="text-sm text-gray-600 mt-1 mb-0">
                  Optional verification helps buyers trust your listing. Submit supporting documents and a video for admin review.
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {ventures.length === 0 ? (
              <p className="text-sm text-gray-600">You do not have any listings in this section yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ventures.map((venture) => {
                  const brand = venture.brandDetails || venture.brand_details || {};
                  const name = brand.brandName || brand.brand_name || 'Listing';
                  const canVerify = canOpenVentureVerification(venture);
                  const statusLabel = ventureVerificationStatusLabel(venture);
                  const approved = isVentureVerificationApproved(venture);

                  return (
                    <div
                      key={venture.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3"
                    >
                      <div>
                        <div className="font-semibold text-gray-900">{name}</div>
                        <span className={`inline-flex mt-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
                          approved
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : statusLabel === 'Pending review'
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : statusLabel === 'Rejected'
                                ? 'text-red-700 bg-red-50 border-red-200'
                                : 'text-gray-600 bg-white border-gray-200'
                        }`}>
                          {statusLabel}
                        </span>
                      </div>
                      {canVerify ? (
                        <button
                          type="button"
                          className="btn-glow btn-glow-sm"
                          onClick={() => setSelected(venture)}
                        >
                          Verify (optional)
                        </button>
                      ) : (
                        <span className="text-xs text-green-700 font-medium">Verified</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {verified.length > 0 && eligible.length === 0 && ventures.length > 0 ? (
              <p className="text-sm text-gray-500 mt-4 mb-0">
                All listings in this section are verified.
              </p>
            ) : null}

            <div className="mt-6">
              <button type="button" className="btn-glow w-full sm:w-auto" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
