export function SkeletonBone({ className = '' }) {
  return (
    <div
      className={`animate-shimmer bg-gray-200 ${className}`.trim()}
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgb(229 231 235) 0%, rgb(243 244 246) 50%, rgb(229 231 235) 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

/** Generic listing skeleton — used outside homepage preview rows. */
export default function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`listing-card-skeleton flex h-full min-h-[280px] flex-col rounded-2xl border border-gray-200 p-5 shadow-sm pointer-events-none ${className}`.trim()}
    >
      <div className="mb-4 flex items-center gap-3">
        <SkeletonBone className="h-11 w-11 flex-shrink-0 rounded-[10px]" />
        <div className="flex flex-1 flex-col gap-1.5">
          <SkeletonBone className="h-3 w-3/5 rounded-md" />
          <SkeletonBone className="h-2.5 w-2/5 rounded-md" />
        </div>
      </div>
      <SkeletonBone className="mb-2 h-3.5 w-4/5 rounded-md" />
      <SkeletonBone className="mb-1.5 h-2.5 w-full rounded-md" />
      <SkeletonBone className="mb-4 h-2.5 w-[90%] rounded-md" />
      <SkeletonBone className="mb-5 h-16 w-full rounded-xl" />
      <div className="mt-auto flex items-center justify-between gap-3">
        <SkeletonBone className="h-2.5 w-1/4 rounded-md" />
        <SkeletonBone className="h-9 w-[38%] rounded-full" />
      </div>
    </div>
  );
}
