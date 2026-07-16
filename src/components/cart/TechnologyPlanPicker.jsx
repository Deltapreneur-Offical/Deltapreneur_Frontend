export default function TechnologyPlanPicker({
  plans,
  selectedKey,
  onSelect,
  loading = false,
  formatPrice,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-4 animate-pulse ${className}`}>
        <div className="h-3 w-24 bg-gray-100 rounded-full mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="h-16 bg-gray-50 rounded-xl" />
          <div className="h-16 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!plans.length) return null;

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-3 sm:p-4 ${className}`}>
      <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2.5">
        Pricing plan
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {plans.map((plan) => {
          const isSelected = selectedKey === plan.key;
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => onSelect(plan.key)}
              className={`relative text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-100'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              {isSelected && (
                <span className="absolute -top-2 left-3 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
                  Selected
                </span>
              )}
              <span className={`block text-xs font-semibold leading-snug pr-1 ${isSelected ? 'text-indigo-950' : 'text-gray-800'}`}>
                {plan.label}
              </span>
              <span className={`block mt-1 text-base font-bold tabular-nums ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                {formatPrice(Number(plan.price) || 0)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Compare plans and switch anytime before checkout.</p>
    </div>
  );
}
