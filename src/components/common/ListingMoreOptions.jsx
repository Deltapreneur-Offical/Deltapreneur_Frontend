import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Mobile/tablet disclosure for listing filters and extra nav.
 * Desktop always shows children; small screens collapse behind "More options".
 */
export default function ListingMoreOptions({ children, filterCount = 0 }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={`listing-more-options${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="listing-more-options__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="listing-more-options__label">
          {t('moreOptions', { defaultValue: 'More options' })}
          {filterCount > 0 ? (
            <span className="listing-more-options__count">{filterCount}</span>
          ) : null}
        </span>
        <span className="listing-more-options__chevron-wrap" aria-hidden="true">
          <ChevronDown
            size={14}
            strokeWidth={2.25}
            className={`listing-more-options__chevron${open ? ' is-open' : ''}`}
          />
        </span>
      </button>
      <div id={panelId} className="listing-more-options__panel">
        {children}
      </div>
    </div>
  );
}
