export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden flex-col justify-between bg-[oklch(0.205_0.035_255)] p-12 text-white lg:flex">
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
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
