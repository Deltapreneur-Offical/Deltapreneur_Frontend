const MESSAGES = [
  'Searching Premium Marketplace…',
  'Checking Afternic…',
  'Finding Exclusive Domains…',
];

/**
 * Premium-tab skeleton + rotating status copy.
 */
export default function RegistryPremiumLoader({ messageIndex = 0 }) {
  const text = MESSAGES[messageIndex % MESSAGES.length];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50/80 to-yellow-50/40 px-4 py-3">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
        <p className="text-sm font-semibold text-amber-900/90 transition-opacity duration-300">{text}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-amber-100/80 bg-gradient-to-br from-amber-50/50 via-white to-white p-4 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-4 w-20 rounded-full bg-amber-100/80 mb-3" />
            <div className="h-6 w-3/4 rounded bg-gray-100 mb-2" />
            <div className="h-5 w-1/2 rounded bg-amber-50 mb-4" />
            <div className="h-9 w-[30%] min-w-[7rem] rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
