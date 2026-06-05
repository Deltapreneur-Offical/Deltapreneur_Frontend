import LanguageDropdown from './LanguageDropdown';

/** Language selector for auth pages (login / register) without the home top nav. */
export default function AuthRegionalSettings({ className = '' }) {
  return (
    <div
      className={`absolute top-3 right-3 z-20 sm:top-4 sm:right-4 ${className}`.trim()}
      role="group"
      aria-label="Language"
    >
      <LanguageDropdown />
    </div>
  );
}
