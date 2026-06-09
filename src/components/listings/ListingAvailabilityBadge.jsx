function resolveStatus(status) {
  const key = (status || 'AVAILABLE').toUpperCase();
  if (key === 'AVAILABLE') {
    return {
      dot: 'listing-availability-badge__dot--available',
      label: 'Available',
      tone: 'listing-availability-badge--available',
    };
  }
  if (key === 'SOLD') {
    return {
      dot: 'listing-availability-badge__dot--sold',
      label: 'Taken',
      tone: 'listing-availability-badge--sold',
    };
  }
  return {
    dot: 'listing-availability-badge__dot--muted',
    label: key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    tone: 'listing-availability-badge--muted',
  };
}

export default function ListingAvailabilityBadge({ status, className = '' }) {
  const config = resolveStatus(status);

  return (
    <span className={`listing-availability-badge ${config.tone} ${className}`.trim()}>
      <span className={`listing-availability-badge__dot ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
