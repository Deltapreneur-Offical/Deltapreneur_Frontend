import deltapreneursIcon from '../../assets/Deltapreneurs_icon.png';

export default function CreatorDashboardIcon({ size = 24, className = '', strokeWidth: _ignored, ...props }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-visible dashboard-creator-icon${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      {...props}
    >
      <img
        src={deltapreneursIcon}
        alt=""
        className="dashboard-creator-icon__img"
      />
    </span>
  );
}
