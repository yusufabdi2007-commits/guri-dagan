export default function LeadDetailLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div className="bg-muted/40 rounded-xl h-5 w-32 animate-pulse" />
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-muted/40 rounded-2xl animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="bg-muted/40 rounded-xl h-6 w-48 animate-pulse" />
          <div className="bg-muted/40 rounded-xl h-5 w-28 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-muted/40 rounded-2xl h-16 animate-pulse" />)}
      </div>
      <div className="bg-muted/40 rounded-2xl h-64 animate-pulse" />
      <div className="bg-muted/40 rounded-2xl h-48 animate-pulse" />
    </div>
  );
}
