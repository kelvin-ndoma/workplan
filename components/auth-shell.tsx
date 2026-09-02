export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
      <div className="hidden flex-col justify-between bg-[oklch(0.205_0.035_255)] p-10 text-white xl:p-16 lg:flex">
        <div>
          <p className="text-2xl font-semibold">WorkPlan</p>
          <p className="mt-2 text-sm tracking-[0.2em] text-white/50 uppercase">
            Plan. Track. Review. Deliver.
          </p>
        </div>
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl leading-tight font-semibold">
            The team’s live work plan.
          </h1>
          <p className="text-white/70">
            Update your status, follow the monthly focus, and review together on the call.
          </p>
        </div>
        <p className="text-sm text-white/40">Burns Brothers · Internal</p>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
