export default function HomePreviewRow({ children, className = '' }) {
  return (
    <div className={`home-preview-row${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}

export function HomePreviewRowItem({ children }) {
  return (
    <div className="home-preview-row__item">
      <div className="home-preview-row__card">{children}</div>
    </div>
  );
}
