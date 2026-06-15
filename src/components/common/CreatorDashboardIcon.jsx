import creatorIcon from '../../assets/CreatorDashboardIcon.png';

export default function CreatorDashboardIcon({ className = 'dashboard-icon-image', alt = '' }) {
  return (
    <img
      src={creatorIcon}
      alt={alt}
      className={className}
      aria-hidden={alt ? undefined : true}
    />
  );
}
