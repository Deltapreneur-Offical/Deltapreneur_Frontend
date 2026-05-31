import { useState } from 'react';
import { ventureAuctionAPI } from '../../api/services';

export default function VentureGstinVerificationModal({ venture, onClose, onVerified, adminMode = false }) {
  const [gstin, setGstin]       = useState(venture?.gstin || '');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null);

  const handleVerify = async () => {
    setError('');
    const trimmed = gstin.trim().toUpperCase();
    if (trimmed.length !== 15) {
      setError('GSTIN must be exactly 15 characters.');
      return;
    }
    setLoading(true);
    try {
      const verifyCall = adminMode
        ? ventureAuctionAPI.adminVerifyGstin
        : ventureAuctionAPI.verifyGstin;
      const { data } = await verifyCall(venture.id, trimmed);
      if (data.verified) {
        setResult({ legalName: data.legalName });
      } else {
        setError(data.error || 'GSTIN verification failed. Please check and try again.');
      }
    } catch (err) {
      const d = err.response?.data;
      setError(d?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const b = venture?.brandDetails || {};
  const isAuction = venture?.saleType === 'AUCTION';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 500 }}>
        <div className="modal-glow" />
        <button className="modal-close" onClick={onClose}>✕</button>

        {result ? (
          <div className="modal-success" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            {/* Animated Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6ec896, #4caf50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              animation: 'successPulse 0.6s ease-out',
              boxShadow: '0 8px 32px rgba(110, 200, 150, 0.3)',
            }}>
              <div style={{
                fontSize: '2.5rem',
                color: 'white',
                fontWeight: 'bold',
                animation: 'checkmarkScale 0.4s ease-out 0.2s both',
              }}>✓</div>
              {/* Decorative rings */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid rgba(110, 200, 150, 0.3)',
                animation: 'ripple 1.5s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid rgba(110, 200, 150, 0.2)',
                animation: 'ripple 1.5s ease-out infinite 0.5s',
              }} />
            </div>

            {/* Success Title with Gradient */}
            <h3 style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #6ec896, #4caf50)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem',
              animation: 'slideUp 0.5s ease-out 0.3s both',
            }}>
              GSTIN Verified Successfully!
            </h3>

            {/* Success Message Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(110, 200, 150, 0.1), rgba(76, 175, 80, 0.05))',
              border: '1px solid rgba(110, 200, 150, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              animation: 'slideUp 0.5s ease-out 0.4s both',
            }}>
              <p style={{
                margin: '0',
                fontSize: '1rem',
                color: '#000000',
                lineHeight: 1.6,
              }}>
                🎉 <strong style={{ color: '#6ec896' }}>{b.brandName}</strong>
                {isAuction ? (
                  <>
                    {" "}auction is now
                    <strong style={{
                      color: '#6ec896',
                      fontSize: '1.1rem',
                      display: 'inline-block',
                      marginLeft: '0.25rem',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}> LIVE</strong> and ready for bidding!
                  </>
                ) : (
                  <> is now GST verified successfully.</>
                )}
              </p>
            </div>

            {/* Legal Name Display */}
            {result.legalName && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                animation: 'slideUp 0.5s ease-out 0.5s both',
              }}>
                <p style={{
                  margin: '0',
                  fontSize: '0.85rem',
                  color: '#000000',
                  marginBottom: '0.5rem',
                }}>
                  Legal Entity Name
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '1rem',
                  color: '#000000',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                }}>
                  {result.legalName}
                </p>
              </div>
            )}

            {/* Action Button */}
            <button 
              className="btn-primary" 
              onClick={() => onVerified()}
              style={{
                background: 'linear-gradient(135deg, #6ec896, #4caf50)',
                border: 'none',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(110, 200, 150, 0.3)',
                animation: 'slideUp 0.5s ease-out 0.6s both',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(110, 200, 150, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(110, 200, 150, 0.3)';
              }}
            >
              {isAuction ? 'View Auction →' : 'Done →'}
            </button>

            {/* CSS Animations */}
            <style>{`
              @keyframes successPulse {
                0% { transform: scale(0.8); opacity: 0; }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); opacity: 1; }
              }
              
              @keyframes checkmarkScale {
                0% { transform: scale(0) rotate(-45deg); }
                50% { transform: scale(1.2) rotate(10deg); }
                100% { transform: scale(1) rotate(0deg); }
              }
              
              @keyframes ripple {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
              }
              
              @keyframes slideUp {
                0% { transform: translateY(20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
              }
              
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
            `}</style>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div className="modal-badge">{isAuction ? '🔨 Venture Auction Verification' : '✅ Venture GST Verification'}</div>
              <h2>{b.brandName}</h2>
              <p style={{ fontSize: '0.82rem', color: '#888' }}>
                {isAuction
                  ? 'Verify your GSTIN to activate the equity auction'
                  : 'Verify your GSTIN to validate your venture listing'}
              </p>
            </div>

            <div style={{
              padding: '0.875rem 1rem', borderRadius: 8, marginBottom: '1.25rem',
              background: 'rgba(160,110,200,0.07)',
              border: '1px solid rgba(160,110,200,0.2)',
              fontSize: '0.8rem', color: '#bbb', lineHeight: 1.6,
            }}>
              <strong style={{ color: '#a06ec8' }}>Why GSTIN?</strong> It confirms you're running a
              registered, active business — giving bidders confidence before placing large bids.
              <br />
              <span style={{ color: '#c8a96e', marginTop: '0.35rem', display: 'block' }}>
                ⚠ Use the GSTIN registered for the same business as your venture name above.
              </span>
            </div>

            <div style={{
              padding: '0.65rem 0.875rem', borderRadius: 8, marginBottom: '1.25rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.82rem', color: '#aaa',
            }}>
              Venture name on file: <strong style={{ color: '#e0e0f0' }}>{b.brandName}</strong>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', color: '#aaa', display: 'block', marginBottom: '0.5rem' }}>
                GSTIN (15-digit) <span style={{ color: '#c86e6e' }}>*</span>
              </label>
              <input
                value={gstin}
                onChange={e => { setGstin(e.target.value.toUpperCase()); setError(''); }}
                placeholder="e.g. 22AAAAA0000A1Z5"
                maxLength={15}
                style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.35rem' }}>
                Format: 2-digit state code + PAN (10 chars) + entity number + Z + check digit
              </p>
            </div>

            {error && (
              <div style={{
                padding: '0.875rem 1rem', borderRadius: 8, marginBottom: '1rem',
                background: 'rgba(200,110,110,0.08)',
                border: '1px solid rgba(200,110,110,0.25)',
                fontSize: '0.82rem', color: '#c86e6e', lineHeight: 1.6,
              }}>
                {error}
              </div>
            )}

            <button
              className="btn-primary full-width"
              onClick={handleVerify}
              disabled={loading || gstin.trim().length !== 15}
            >
              {loading
                ? <span className="btn-spinner" />
                : (isAuction ? 'Verify GSTIN & Activate Auction →' : 'Verify GSTIN →')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
