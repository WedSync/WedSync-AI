'use client';

function GuestListLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}

export { GuestListLoadingSkeleton };
export default GuestListLoadingSkeleton;
