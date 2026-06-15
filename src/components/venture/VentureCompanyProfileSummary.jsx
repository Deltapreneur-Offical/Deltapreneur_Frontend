import { normalizeCompanyProfile } from '../../utils/ventureProfileUtils';

function fmtInr(value, formatPrice) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return formatPrice(num);
}

function ProfileGrid({ items }) {
  const visible = items.filter((item) => item.value);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {visible.map((item) => (
        <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
          <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-500">{item.label}</div>
          <div className="text-sm font-medium text-gray-900 mt-0.5">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function VentureCompanyProfileSummary({ profile, formatPrice }) {
  const cp = normalizeCompanyProfile(profile);
  if (!cp) return null;

  const financialItems = [
    { label: 'Current year revenue', value: fmtInr(cp.currentYearRevenueInr, formatPrice) },
    { label: 'Previous year revenue', value: fmtInr(cp.previousYearRevenueInr, formatPrice) },
    { label: 'Two years ago revenue', value: fmtInr(cp.twoYearsAgoRevenueInr, formatPrice) },
    { label: 'Valuation', value: fmtInr(cp.valuationInr, formatPrice) },
    { label: 'Profitability', value: cp.profitabilityStatus || null },
    { label: 'Funding raised', value: cp.fundingRaisedSummary || null },
    { label: 'User base', value: cp.userBase || null },
  ];

  const teamMembers = Array.isArray(cp.teamMembers) ? cp.teamMembers : [];
  const teamItems = teamMembers.length > 0
    ? teamMembers.map((member, index) => ({
      label: member.role || `Member ${index + 1}`,
      value: `${member.name}${member.equityPercent != null ? ` · ${member.equityPercent}%` : ''}`,
    }))
    : [
      { label: 'Founder', value: cp.founderName || null },
      { label: 'Team size', value: cp.teamSize ? String(cp.teamSize) : null },
      { label: 'Key team', value: cp.keyTeamMembers || null },
    ];

  const hasBusiness = cp.businessDescription || cp.productsServices || cp.targetMarket || cp.businessModel;
  const hasFinancial = financialItems.some((item) => item.value);
  const hasTeam = teamItems.some((item) => item.value);

  if (!cp.companyName && !hasBusiness && !hasFinancial && !hasTeam) return null;

  return (
    <div className="flex flex-col gap-4">
      {cp.companyName && (
        <p className="text-sm font-semibold text-gray-900 m-0">{cp.companyName}</p>
      )}

      {hasBusiness && (
        <div className="flex flex-col gap-2">
          {cp.businessDescription && (
            <p className="text-gray-700 leading-relaxed text-sm m-0">{cp.businessDescription}</p>
          )}
          {cp.productsServices && (
            <p className="text-gray-600 text-sm m-0"><strong>Products & services:</strong> {cp.productsServices}</p>
          )}
          {cp.targetMarket && (
            <p className="text-gray-600 text-sm m-0"><strong>Target market:</strong> {cp.targetMarket}</p>
          )}
          {cp.businessModel && (
            <p className="text-gray-600 text-sm m-0"><strong>Business model:</strong> {cp.businessModel}</p>
          )}
          {cp.growthMetrics && (
            <p className="text-gray-600 text-sm m-0"><strong>Growth:</strong> {cp.growthMetrics}</p>
          )}
          {cp.marketReach && (
            <p className="text-gray-600 text-sm m-0"><strong>Market reach:</strong> {cp.marketReach}</p>
          )}
        </div>
      )}

      {hasFinancial && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Financial profile</div>
          <ProfileGrid items={financialItems} />
        </div>
      )}

      {hasTeam && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Team</div>
          <ProfileGrid items={teamItems} />
        </div>
      )}
    </div>
  );
}
