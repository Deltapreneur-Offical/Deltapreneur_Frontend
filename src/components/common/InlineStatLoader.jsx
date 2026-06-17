export default function InlineStatLoader({ size = 'md' }) {
  return (
    <span
      className={`platform-analytics-stat-loader platform-analytics-stat-loader--${size}`}
      role="status"
      aria-label="Loading"
    >
      <span className="platform-analytics-stat-loader__ring" aria-hidden />
    </span>
  );
}
