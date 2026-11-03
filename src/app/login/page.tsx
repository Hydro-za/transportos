import { APP_NAME } from "@/config/app";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { signIn } from "./actions";
import { Truck, ShieldCheck, ArrowUpRight, Route, PackageCheck } from "lucide-react";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-40 h-[32rem] w-[32rem] rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }} />
        <div className="absolute -bottom-48 right-[-8rem] h-[34rem] w-[34rem] rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.22]" style={{ backgroundImage: "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)", backgroundSize: "52px 52px", maskImage: "linear-gradient(to bottom, black, transparent 80%)" }} />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-14">
        <section className="hidden lg:flex lg:flex-col lg:justify-between lg:py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[17px] text-white shadow-lg" style={{ background: "var(--accent)" }}>
              <Truck size={24} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">{APP_NAME}</p>
              <p className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: "var(--muted)" }}>LOGISTICS MANAGEMENT</p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--success)" }} />
              One workspace. Every movement.
            </div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.055em] xl:text-6xl">
              Keep your operation
              <span className="block" style={{ color: "var(--accent)" }}>moving forward.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7" style={{ color: "var(--muted)" }}>
              Manage jobs, dispatch, fleet activity and the numbers behind every delivery — all from one clear workspace.
            </p>

            <div className="mt-12 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-2xl border p-4" style={{ background: "color-mix(in srgb, var(--surface) 82%, transparent)", borderColor: "var(--border)" }}>
                <Route size={19} style={{ color: "var(--accent)" }} />
                <p className="mt-5 text-sm font-semibold">Operations in view</p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Jobs and dispatch at a glance</p>
              </div>
              <div className="rounded-2xl border p-4" style={{ background: "color-mix(in srgb, var(--surface) 82%, transparent)", borderColor: "var(--border)" }}>
                <PackageCheck size={19} style={{ color: "var(--accent)" }} />
                <p className="mt-5 text-sm font-semibold">From quote to delivery</p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Keep every step connected</p>
              </div>
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--muted)" }}>A clearer view of your transport business.</p>
        </section>

        <section className="mx-auto w-full max-w-[470px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: "var(--accent)" }}>
              <Truck size={22} />
            </div>
            <div>
              <p className="font-semibold tracking-tight">{APP_NAME}</p>
              <p className="text-[10px] font-semibold tracking-[0.17em]" style={{ color: "var(--muted)" }}>LOGISTICS MANAGEMENT</p>
            </div>
          </div>

          <div className="rounded-[28px] border p-6 shadow-2xl sm:p-9" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "0 24px 80px rgba(20, 35, 65, 0.10)" }}>
            <div className="mb-8">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <ShieldCheck size={22} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>Secure workspace access</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Welcome back.</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>Sign in to continue to your transport operation.</p>
            </div>

            {error ? <Notice kind="error">{error}</Notice> : null}
            {message ? <Notice kind="info">{message}</Notice> : null}

            <form action={signIn} className="space-y-5">
              <Field label="Work email" name="email" type="email" autoComplete="email" placeholder="you@company.com" />
              <Field label="Password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" />
              <SubmitButton>Sign in to {APP_NAME} <ArrowUpRight className="ml-2 inline-block" size={17} /></SubmitButton>
            </form>

            <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <p className="text-center text-xs leading-5" style={{ color: "var(--muted)" }}>
                Your account is provided by your business administrator. Contact them if you need access or a password reset.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px]" style={{ color: "var(--muted)" }}>
            {APP_NAME} · Private business workspace
          </p>
        </section>
      </div>
    </main>
  );
}
