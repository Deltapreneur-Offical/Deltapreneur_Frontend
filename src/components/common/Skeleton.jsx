export default function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`listing-card-skeleton flex h-full min-h-[280px] flex-col rounded-2xl border border-gray-200 p-5 shadow-sm pointer-events-none ${className}`.trim()}
    >
      <div className="mb-4 flex items-center gap-3">
        <Bone className="h-11 w-11 flex-shrink-0 rounded-[10px]" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Bone className="h-3 w-3/5 rounded-md" />
          <Bone className="h-2.5 w-2/5 rounded-md" />
        </div>
      </div>
      <Bone className="mb-2 h-3.5 w-4/5 rounded-md" />
      <Bone className="mb-1.5 h-2.5 w-full rounded-md" />
      <Bone className="mb-4 h-2.5 w-[90%] rounded-md" />
      <Bone className="mb-5 h-16 w-full rounded-xl" />
      <div className="mt-auto flex items-center justify-between gap-3">
        <Bone className="h-2.5 w-1/4 rounded-md" />
        <Bone className="h-9 w-[38%] rounded-full" />
      </div>
    </div>
  );
}

function Bone({ className }) {
  return (
    <div
      className={`animate-shimmer bg-gray-200 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgb(229 231 235) 0%, rgb(243 244 246) 50%, rgb(229 231 235) 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}
