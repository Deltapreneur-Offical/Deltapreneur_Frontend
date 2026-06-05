export default function HoneypotField({ value, onChange }) {
  return (
    <input
      type="text"
      name="website"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
