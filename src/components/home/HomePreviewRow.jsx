export default function HomePreviewRow({ children }) {
  return (
    <div
      className="
        home-preview-row
        grid w-full max-w-full min-w-0
        grid-flow-col auto-cols-[100%]
        overflow-x-auto overflow-y-hidden
        snap-x snap-mandatory
        lg:grid-flow-row lg:grid-cols-5 lg:auto-cols-auto lg:overflow-visible lg:gap-4
      "
    >
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
