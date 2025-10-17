// src/components/Skeletons.jsx
export function SkeletonBox({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 dark:bg-white/10 ${className}`}
    />
  );
}

export function SkeletonLeagueCard({ showFixtures = true }) {
  return (
    <div className="glass border border-black/10 dark:border-white/10 rounded-2xl p-4">
      {/* Star/aktion øverst til højre */}
      <div className="flex justify-end">
        <SkeletonBox className="w-5 h-5 rounded-full" />
      </div>

      {/* Header: logo + navn + land */}
      <div className="flex items-center gap-4 mb-3">
        <SkeletonBox className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <SkeletonBox className="h-4 w-48 mb-2" />
          <SkeletonBox className="h-3 w-32" />
        </div>
      </div>

      {/* Fixtures-list placeholder */}
      {showFixtures && (
        <div>
          <SkeletonBox className="h-4 w-40 mb-2" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SkeletonBox className="w-6 h-6 rounded-full" />
                  <SkeletonBox className="h-3 w-24" />
                  <SkeletonBox className="h-3 w-6" />
                  <SkeletonBox className="w-6 h-6 rounded-full" />
                  <SkeletonBox className="h-3 w-24" />
                </div>
                <SkeletonBox className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SkeletonFixtureRow() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SkeletonBox className="w-6 h-6 rounded-full" />
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="h-3 w-6" />
        <SkeletonBox className="w-6 h-6 rounded-full" />
        <SkeletonBox className="h-3 w-24" />
      </div>
      <SkeletonBox className="h-3 w-28" />
    </div>
  );
}
