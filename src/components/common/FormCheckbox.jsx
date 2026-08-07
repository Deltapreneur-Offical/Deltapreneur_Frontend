/**
 * Accessible custom checkbox matching VentureForm agreement styling.
 */
export default function FormCheckbox({
  checked,
  onChange,
  children,
  disabled = false,
  accent = '#2563eb',
  borderAccent = '#bfdbfe',
  className = '',
}) {
  return (
    <label
      className={`inline-flex items-start gap-3 text-sm text-gray-600 cursor-pointer max-w-full rounded-[12px] border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        className="relative w-5 h-5 rounded-[7px] border-2 bg-white flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          backgroundColor: checked ? accent : 'white',
          borderColor: checked ? accent : borderAccent,
        }}
        aria-hidden
      >
        {checked && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="4" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </span>
      <span className="leading-snug flex-1 min-w-0">{children}</span>
    </label>
  );
}
