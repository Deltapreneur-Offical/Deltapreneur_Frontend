function Spinner() {
  return (
    <span
      className="auth-btn-spinner"
      aria-hidden
    />
  );
}

export default function AuthPrimaryButton({
  type = 'button',
  disabled = false,
  busy = false,
  className = '',
  children,
  onClick,
}) {
  return (
    <button
      type={type}
      className={`auth-btn-primary w-full ${className}`.trim()}
      disabled={disabled || busy}
      onClick={onClick}
    >
      {busy ? <Spinner /> : children}
    </button>
  );
}
