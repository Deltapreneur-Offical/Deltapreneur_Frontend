export default function PageContentSkeleton({ variant = 'cards', rows = 6 }) {
  if (variant === 'table') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-16 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-[320px] rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse"
        />
      ))}
    </div>
  );
}
