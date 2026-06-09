/**
 * Side-by-side business registration + virtual assistant add-on selectors.
 */
import AddonSelector from './AddonSelector';
import VirtualAssistantSelector from './VirtualAssistantSelector';

export default function AddonSections({
  businessSelected = [],
  onBusinessChange,
  vaSelected = [],
  onVaChange,
  className = 'mt-4',
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 items-start ${className}`}>
      <AddonSelector
        selected={businessSelected}
        onChange={onBusinessChange}
        className="mt-0 min-w-0"
      />
      <VirtualAssistantSelector
        selected={vaSelected}
        onChange={onVaChange}
        className="mt-0 min-w-0"
      />
    </div>
  );
}
