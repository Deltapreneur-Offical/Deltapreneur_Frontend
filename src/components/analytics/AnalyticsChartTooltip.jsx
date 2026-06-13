export default function AnalyticsChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="analytics-chart-tooltip">
      {label ? <div className="analytics-chart-tooltip__label">{label}</div> : null}
      {payload.map((entry, index) => (
        <div key={`${entry.name}-${index}`} className="analytics-chart-tooltip__row">
          <span
            className="analytics-chart-tooltip__swatch"
            style={{ backgroundColor: entry.color || '#6366f1' }}
            aria-hidden
          />
          <span>
            {entry.name}: <strong>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
