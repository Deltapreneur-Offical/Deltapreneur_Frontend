import TechnologyPlanPicker from './TechnologyPlanPicker';

export const COBROTHER_ASSISTANCE_FEE_INR = 1000;

/**
 * Shared Technology cart/modal product config:
 * Pricing Plan + Co-Creator Assistance (CoBrother) only.
 * Does not include VA or Compliance/Business Registration.
 */
export default function TechnologyPurchaseConfig({
  plans = [],
  selectedPlan = null,
  onPlanSelect,
  plansLoading = false,
  coBrotherOptIn = false,
  onCoBrotherToggle,
  formatPrice,
  className = '',
}) {
  const hasPlans = plans.length > 0;

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      {hasPlans && (
        <TechnologyPlanPicker
          plans={plans}
          selectedKey={selectedPlan}
          onSelect={onPlanSelect}
          loading={plansLoading}
          formatPrice={formatPrice}
        />
      )}

      <div>
        <p className="text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider mb-2">
          Optional Services
        </p>
        <div
          onClick={onCoBrotherToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCoBrotherToggle?.();
            }
          }}
          className={`flex items-start gap-3 p-3 sm:p-3.5 cursor-pointer rounded-xl border-2 transition-all ${
            coBrotherOptIn
              ? 'bg-purple-50/60 border-purple-300 shadow-sm'
              : 'bg-white border-gray-200 hover:border-purple-200'
          }`}
        >
          <div
            className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${
              coBrotherOptIn ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'
            }`}
          >
            {coBrotherOptIn && <span className="text-white text-[0.65rem] font-bold">✓</span>}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${coBrotherOptIn ? 'text-purple-900' : 'text-gray-800'}`}>
              Co-Creator Assistance
              <span className={`ml-2 font-display ${coBrotherOptIn ? 'text-purple-700' : 'text-gray-500'}`}>
                +{formatPrice(COBROTHER_ASSISTANCE_FEE_INR)}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Get a dedicated CoBrother to help you set up, deploy, and get the most out of this
              software. They&apos;ll reach out within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
