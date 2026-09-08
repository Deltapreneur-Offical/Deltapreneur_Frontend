/**
 * Side-by-side business registration + virtual assistant add-on selectors.
 */
import AddonSelector from './AddonSelector';
import VirtualAssistantSelector from './VirtualAssistantSelector';

export default function AddonSections({
  businessSelected = [],
  onBusinessChange,
  businessServices = null,
  businessCategories = null,
  businessLoading = false,
  businessError = '',
  vaSelected = [],
  onVaChange,
  vaServices = null,
  vaLoading = false,
  showVirtualAssistant = true,
  className = 'mt-4',
}) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <AddonSelector
        selected={businessSelected}
        onChange={onBusinessChange}
        services={businessServices}
        categories={businessCategories}
        loading={businessLoading}
        error={businessError}
        className="mt-0 min-w-0"
      />
      {showVirtualAssistant && (
        <VirtualAssistantSelector
          selected={vaSelected}
          onChange={onVaChange}
          services={vaServices}
          loading={vaLoading}
          className="mt-0 min-w-0"
        />
      )}
    </div>
  );
}
