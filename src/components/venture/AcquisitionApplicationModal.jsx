import { useState } from 'react';
import { ventureAcquisitionAPI } from '../../api/services';

export default function AcquisitionApplicationModal({ venture, onClose, onSubmitted }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const brandName = venture?.brandDetails?.brandName || 'this venture';

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await ventureAcquisitionAPI.apply(venture.id, { message: message.trim() || null });
      onSubmitted?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-badge">Acquisition Application</div>
          <h2>Apply to acquire {brandName}</h2>
          <p>Express your interest. The seller will review your application. CoBrother will contact you if accepted.</p>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message to the seller..."
          rows={4}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-3"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}
