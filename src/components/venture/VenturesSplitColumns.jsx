import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ventureListChooseUrl } from '../../constants/ventureListingTypeContent';
import '../../styles/ventures-split-columns.css';

function SplitPanelHeader({ variant, title, subtitle, count, countLabel }) {
  const Icon = variant === 'coventure' ? Handshake : Rocket;

  return (
    <header className={`ventures-split__header ventures-split__header--${variant}`}>
      <div className="ventures-split__header-main">
        <span className={`ventures-split__icon ventures-split__icon--${variant}`} aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="ventures-split__header-text">
          <h2 className="ventures-split__title">{title}</h2>
          {subtitle ? <p className="ventures-split__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <span className={`ventures-split__count ventures-split__count--${variant}`}>
        {countLabel ?? count}
      </span>
    </header>
  );
}

function SplitEmptyState({ variant, message, actionLabel, actionTo }) {
  return (
    <div className={`ventures-split__empty ventures-split__empty--${variant}`}>
      <p>{message}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="btn-glow btn-glow-sm">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function VenturesSplitColumns({
  ventureRows,
  coVentureRows,
  filterTab,
  renderVentureCards,
}) {
  const { t } = useTranslation();
  const [activeMobileTab, setActiveMobileTab] = useState('venture');

  const ventureCountLabel = t('venturesPageResultsFound', { count: ventureRows.length });
  const coVentureCountLabel = t('venturesPageResultsFound', { count: coVentureRows.length });

  return (
    <div className="ventures-split">
      {/* ── Mobile-only segmented tab bar ─────────────────────────────── */}
      <div className="ventures-split__mobile-tabs" role="tablist" aria-label={t('venture')}>
        <button
          role="tab"
          aria-selected={activeMobileTab === 'venture'}
          aria-controls="vsc-panel-venture"
          id="vsc-tab-venture"
          className={`ventures-split__mobile-tab ventures-split__mobile-tab--venture${
            activeMobileTab === 'venture' ? ' ventures-split__mobile-tab--active' : ''
          }`}
          onClick={() => setActiveMobileTab('venture')}
        >
          <Rocket size={14} strokeWidth={2} aria-hidden />
          {t('venture', { defaultValue: 'Venture' })}
          <span className="ventures-split__mobile-tab-count">{ventureRows.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeMobileTab === 'coventure'}
          aria-controls="vsc-panel-coventure"
          id="vsc-tab-coventure"
          className={`ventures-split__mobile-tab ventures-split__mobile-tab--coventure${
            activeMobileTab === 'coventure' ? ' ventures-split__mobile-tab--active' : ''
          }`}
          onClick={() => setActiveMobileTab('coventure')}
        >
          <Handshake size={14} strokeWidth={2} aria-hidden />
          {t('coVentureSectionTitle', { defaultValue: 'Co-Venture' })}
          <span className="ventures-split__mobile-tab-count">{coVentureRows.length}</span>
        </button>
      </div>

      {/* ── Sliding viewport (controls mobile animation) ───────────────── */}
      <div className="ventures-split__mobile-viewport">
        <div className={`ventures-split__mobile-track${
          activeMobileTab === 'coventure' ? ' ventures-split__mobile-track--coventure' : ''
        }`}>

          <section
            className="ventures-split__panel ventures-split__panel--venture ventures-split__mobile-panel"
            aria-labelledby="vsc-panel-venture"
            id="vsc-panel-venture"
            role="tabpanel"
          >
            <SplitPanelHeader
              variant="venture"
              title={t('venture')}
              subtitle={t('venturesSplitVentureHint', {
                defaultValue: 'Acquisition, equity sale & ownership listings',
              })}
              count={ventureRows.length}
              countLabel={ventureCountLabel}
            />
            <h2 id="ventures-split-venture-heading" className="sr-only">
              {t('venture')}
            </h2>
            <div className="ventures-split__body">
              {ventureRows.length === 0 ? (
                <SplitEmptyState
                  variant="venture"
                  message={t('noVentures')}
                  actionLabel={filterTab === 'mine' ? t('venturesPageListVentureCta') : null}
                  actionTo={filterTab === 'mine' ? ventureListChooseUrl('venture') : null}
                />
              ) : (
                renderVentureCards(ventureRows, { compact: true })
              )}
            </div>
          </section>

          {/* Divider: hidden on mobile (panels are stacked in slider) */}
          <div className="ventures-split__divider ventures-split__mobile-divider" aria-hidden="true">
            <span className="ventures-split__divider-line" />
          </div>

          <section
            className="ventures-split__panel ventures-split__panel--coventure ventures-split__mobile-panel"
            aria-labelledby="vsc-panel-coventure"
            id="vsc-panel-coventure"
            role="tabpanel"
          >
            <SplitPanelHeader
              variant="coventure"
              title={t('coVentureSectionTitle', { defaultValue: 'Co-Venture' })}
              subtitle={t('venturesSplitCoVentureHint', {
                defaultValue: 'Partnership & co-founder opportunities',
              })}
              count={coVentureRows.length}
              countLabel={coVentureCountLabel}
            />
            <h2 id="ventures-split-coventure-heading" className="sr-only">
              {t('coVentureSectionTitle', { defaultValue: 'Co-Venture' })}
            </h2>
            <div className="ventures-split__body">
              {coVentureRows.length === 0 ? (
                <SplitEmptyState
                  variant="coventure"
                  message={t('noCoVenturesAvailable', { defaultValue: 'No co-ventures are available yet.' })}
                  actionLabel={filterTab === 'mine' ? t('venturesPageCoVenture', { defaultValue: 'Co-Ventures →' }) : null}
                  actionTo={filterTab === 'mine' ? ventureListChooseUrl('co-venture') : null}
                />
              ) : (
                renderVentureCards(coVentureRows, { compact: true })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
