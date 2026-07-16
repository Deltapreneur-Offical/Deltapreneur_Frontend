export default function CartPageSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-6 xl:gap-8 animate-pulse">
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-5 rounded-[14px] border border-gray-100 bg-white"
          >
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-28 bg-gray-100 rounded-full" />
              <div className="h-4 w-48 bg-gray-100 rounded-full" />
              <div className="h-3 w-24 bg-gray-50 rounded-full" />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
          </div>
        ))}
        <div className="h-28 rounded-[14px] border border-gray-100 bg-white" />
      </div>
      <div className="w-full xl:max-w-[420px]">
        <div className="rounded-[16px] border border-gray-100 bg-white p-6 space-y-4 min-h-[420px]">
          <div className="h-5 w-36 bg-gray-100 rounded-full" />
          <div className="h-32 bg-gray-50 rounded-xl" />
          <div className="h-24 bg-gray-50 rounded-xl" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-gray-50 rounded-full" />
            <div className="h-3 w-full bg-gray-50 rounded-full" />
            <div className="h-5 w-full bg-gray-100 rounded-full mt-3" />
          </div>
          <div className="h-12 w-full bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
