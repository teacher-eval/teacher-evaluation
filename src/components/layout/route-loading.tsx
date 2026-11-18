export function RouteLoading() {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading page content"
    >
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-slate-200" />
          <div className="h-4 w-72 rounded bg-slate-100" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs" />
        <div className="h-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs" />
        <div className="h-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs" />
        <div className="h-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs" />
      </div>

      <div className="h-64 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs" />
    </div>
  );
}
