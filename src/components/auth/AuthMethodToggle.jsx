export default function AuthMethodToggle({ value, onChange, googleLabel, emailLabel }) {
  return (
    <div className="auth-method-toggle" role="tablist" aria-label="Sign-in method">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'google'}
        className={value === 'google' ? 'is-active' : ''}
        onClick={() => onChange('google')}
      >
        {googleLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'email'}
        className={value === 'email' ? 'is-active' : ''}
        onClick={() => onChange('email')}
      >
        {emailLabel}
      </button>
    </div>
  );
}
