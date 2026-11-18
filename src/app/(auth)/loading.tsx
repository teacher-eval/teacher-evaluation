export default function AuthLoading() {
  return (
    <div className="animate-pulse mx-auto w-full max-w-[400px] my-6" aria-busy="true">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-full bg-slate-200 mb-4" />
          <div className="h-6 w-48 rounded bg-slate-200 mb-2" />
          <div className="h-4 w-64 rounded bg-slate-100" />
        </div>
        <div className="space-y-4">
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
