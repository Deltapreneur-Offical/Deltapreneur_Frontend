/** Deltapreneur contact handoff after partnership is finalized — no Pay Now by default. */
export default function PartnershipTimelineCard({ ventureName, partnerName }) {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0" aria-hidden>🤝</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-teal-900 m-0 mb-1">Partnership Finalized</h3>
          <p className="text-sm text-teal-800 m-0 mb-3">
            {partnerName
              ? `${partnerName} was selected as partner for ${ventureName || 'your venture'}.`
              : `A partner was selected for ${ventureName || 'your venture'}.`}
            {' '}Deltapreneur will assist both parties with next steps.
          </p>
          <div className="text-sm bg-white/80 border border-teal-100 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Deltapreneur support</div>
            <a href="mailto:support@hubregistrar.com" className="text-teal-900 font-medium hover:underline">
              support@hubregistrar.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
