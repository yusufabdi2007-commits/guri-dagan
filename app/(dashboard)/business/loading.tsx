export default function BusinessLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-muted/40 rounded-2xl h-24 animate-pulse" />)}
      </div>
      <div className="bg-muted/40 rounded-2xl h-40 animate-pulse" />
      <div className="bg-muted/40 rounded-2xl h-48 animate-pulse" />
      <div className="bg-muted/40 rounded-2xl h-56 animate-pulse" />
    </div>
  );
}
