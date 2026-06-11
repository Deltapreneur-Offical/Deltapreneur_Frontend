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
    <div className={`flex flex-col gap-3 ${className}`}>
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
