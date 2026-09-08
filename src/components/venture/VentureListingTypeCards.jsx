import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Users } from 'lucide-react';
import { COVENTURE_SCENARIOS, VENTURE_SCENARIOS } from '../../constants/ventureListingTypeContent';

const VentureCard = forwardRef(function VentureCard({ cardRef, ...props }, ref) {
  const resolvedRef = cardRef ?? ref;
  const {
    variant,
    title,
    subtitle,
    description,
    scenarios,
    ctaLabel,
    ctaTo,
  } = props;

  const isCoVenture = variant === 'co-venture';
  const Icon = isCoVenture ? Users : Rocket;
  const borderCls = isCoVenture ? 'border-purple-200' : 'border-indigo-200';
  const iconWrapCls = isCoVenture
    ? 'bg-purple-100 text-purple-600'
    : 'bg-indigo-100 text-indigo-600';

  return (
    <div
      ref={resolvedRef}
      className={`flex flex-col rounded-xl border ${borderCls} bg-white p-5 shadow-sm`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconWrapCls}`}>
          <Icon className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-base font-bold text-gray-900 m-0">{title}</h3>
          <p className="text-xs text-gray-500 m-0">{subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 m-0 mb-3">{description}</p>
      <ul className="text-sm text-gray-600 flex-1 m-0 mb-4 pl-4 space-y-1 list-disc">
        {scenarios.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Link to={ctaTo} className="btn-glow btn-glow-sm w-full text-center">
        {ctaLabel}
      </Link>
    </div>
  );
});

export default function VentureListingTypeCards({ ventureCardRef, coVentureCardRef }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <VentureCard
        cardRef={ventureCardRef}
        variant="venture"
        title="Venture Listing"
        subtitle="Sell, raise, or find a buyer"
        description="Choose this if you want to sell your business, sell ownership, raise investment, or find a buyer to acquire you."
        scenarios={VENTURE_SCENARIOS}
        ctaLabel="List Venture"
        ctaTo="/ventures/new"
      />
      <VentureCard
        cardRef={coVentureCardRef}
        variant="co-venture"
        title="Delta-Venture Listing"
        subtitle="Find a partner to build with"
        description="Choose this if you want a business partner, co-founder, or collaborator to grow the company together — not sell out."
        scenarios={COVENTURE_SCENARIOS}
        ctaLabel="List Delta-Venture"
        ctaTo="/ventures/new?type=co-venture"
      />
    </div>
  );
}
