import { ChevronDown } from 'lucide-react';

/**
 * Styled select with a visible dropdown chevron — use on listing forms
 * where plain <select> looks like a text field.
 */
export default function FormSelect({
  className = '',
  wrapperClassName = '',
  iconClassName = 'text-gray-500',
  children,
  ...props
}) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        className={`w-full appearance-none pr-9 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={2.25}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${iconClassName}`}
        aria-hidden
      />
    </div>
  );
}
