export default function HomePreviewRow({ children }) {
  return (
    <div className="home-preview-row">
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
