import React from 'react';
import VerifiedIcon from '../../assets/Verified_Icon.png';
import OfficeIcon from '../../assets/Deltapreneur_icon.png';
import './HubRegistrarOfficeCard.css';

const HubRegistrarOfficeCard = ({ office, compact = false }) => {
  const handleCall = (e) => {
    e.preventDefault();
    if (office.phone_number) {
      window.open(`tel:${office.phone_number}`, '_self');
    }
  };

  const handleMap = (e) => {
    e.preventDefault();
    if (office.map_link) {
      window.open(office.map_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="hro-card">
      {/* Top Section */}
      <div className="hro-card-top">
        <div className="hro-card-office-icon">
          <img src={OfficeIcon} alt="Delta Registrar Office" className="hro-office-img" />
        </div>
        <div className="hro-card-info">
          <h3 className="hro-card-name">Delta Registrar</h3>
          <div className="hro-card-subtitle-line">
            <span className="hro-card-dot"></span>
            <span className="hro-card-dot hro-card-dot-sm"></span>
          </div>
          <p className="hro-card-type">Official Delta Registrar Office</p>
        </div>
        <div className="hro-card-verified-area">
          <div className="hro-card-verified-badge">
            <img src={VerifiedIcon} alt="Verified" className="hro-verified-icon" />
            <div className="hro-verified-text">
              <span className="hro-verified-label">VERIFIED</span>
              <span className="hro-verified-sub">Delta Registrar</span>
            </div>
          </div>
          {office.zone > 0 && (
            <div className="hro-zone-badge">Zone-{office.zone}</div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="hro-card-divider"></div>

      {/* Middle Section */}
      <div className="hro-card-middle">
        <div className="hro-card-address-section">
          <div className="hro-address-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="hro-pin-icon">
              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="hro-card-address">{office.full_address}</p>
        </div>
        <div className="hro-card-divider-v"></div>
        <div className="hro-card-badges">
          <div className="hro-trust-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="hro-badge-icon hro-badge-icon-blue">
              <path d="M11.42 15.17l-5.657-5.657a1 1 0 010-1.414l.707-.707a1 1 0 011.414 0L12 11.93l4.121-4.121a1 1 0 011.414 0l.707.707a1 1 0 010 1.414l-5.657 5.657a1 1 0 01-1.414 0z"/>
              <path d="M3 3h18a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v14h16V5H4z"/>
            </svg>
            <span>Trusted Office</span>
          </div>
          <div className="hro-secure-badge">
            <img src={VerifiedIcon} alt="Verified" className="hro-secure-icon" />
            <span>Secure & Verified</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - hidden in compact mode */}
      {!compact && (<div className="hro-card-actions">
        <button
          className="hro-action-btn hro-action-call"
          onClick={handleCall}
          disabled={!office.phone_number}
        >
          <div className="hro-action-icon-wrap hro-action-icon-call">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="hro-action-svg">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="hro-action-text">
            <span className="hro-action-title">Call Office</span>
            <span className="hro-action-subtitle">Tap to call now</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-action-arrow">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          className="hro-action-btn hro-action-map"
          onClick={handleMap}
          disabled={!office.map_link}
        >
          <div className="hro-action-icon-wrap hro-action-icon-map">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="hro-action-svg">
              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="hro-action-text">
            <span className="hro-action-title">View on Map</span>
            <span className="hro-action-subtitle">Get directions</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-action-arrow">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>)}
    </div>
  );
};

export default HubRegistrarOfficeCard;
