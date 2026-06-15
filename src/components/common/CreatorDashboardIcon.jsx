import broAILogo from '../../assets/Cobrother_Profile.png';

export default function CreatorDashboardIcon({ size = 24, className = '', strokeWidth: _ignored, ...props }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-visible dashboard-creator-icon${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      {...props}
    >
      <img
        src={broAILogo}
        alt=""
        className="dashboard-creator-icon__img"
      />
    </span>
  );
}
