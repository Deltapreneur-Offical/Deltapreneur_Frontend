export default function HomePreviewRow({ children }) {
  return (
    <div className="home-preview-row flex overflow-x-auto overflow-y-visible pb-3 -mx-1 px-1 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-4">
      {children}
    </div>
  );
}

export function HomePreviewRowItem({ children }) {
  return (
    <div className="home-preview-row__item min-w-0 w-full snap-start snap-always lg:min-w-0 lg:w-auto">
      <div className="home-preview-row__card w-full min-w-0">{children}</div>
    </div>
  );
}
