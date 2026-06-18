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

  const ventureCountLabel = t('venturesPageResultsFound', { count: ventureRows.length });
  const coVentureCountLabel = t('venturesPageResultsFound', { count: coVentureRows.length });

  return (
    <div className="ventures-split">
      <section
        className="ventures-split__panel ventures-split__panel--venture"
        aria-labelledby="ventures-split-venture-heading"
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

      <div className="ventures-split__divider" aria-hidden="true">
        <span className="ventures-split__divider-line" />
      </div>

      <section
        className="ventures-split__panel ventures-split__panel--coventure"
        aria-labelledby="ventures-split-coventure-heading"
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
  );
}
