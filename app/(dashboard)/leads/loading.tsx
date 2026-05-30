export default function LeadsLoading() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-6 py-4 grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted/40 rounded-2xl h-16 animate-pulse" />
        ))}
      </div>
      <div className="px-4 md:px-6 py-2 flex justify-end">
        <div className="bg-muted/40 rounded-xl h-9 w-28 animate-pulse" />
      </div>
      <div className="flex gap-3 px-4 md:px-6 overflow-x-hidden pt-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-[220px] shrink-0 space-y-2">
            <div className="bg-muted/40 rounded-xl h-8 animate-pulse" />
            {[...Array(2)].map((_, j) => (
              <div key={j} className="bg-muted/40 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
