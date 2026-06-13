export default function AuthAlert({ variant = 'error', children }) {
  if (!children) return null;

  return (
    <div className={`auth-alert auth-alert--${variant}`} role="alert">
      {children}
    </div>
  );
}
