// Boat-owner sign in and sign up. After either, the owner goes back to where they were heading.
import { useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { DEMO_OWNER_EMAIL, t } from "@marina/shared";
import { useStore } from "@/data/store";
import { Button, Card, Container, Field, Input, Notice } from "@/components/ui";

function useReturnTo() {
  const loc = useLocation();
  return (loc.state as { from?: string } | null)?.from ?? "/account";
}

function Shell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="hero-bg border-b border-line">
      <Container className="flex justify-center py-16">
        <Card className="w-full max-w-md p-8 shadow-e2 sm:p-10">
          <h1 className="text-[28px] leading-9 font-medium">{title}</h1>
          <p className="mt-2 text-[13px] leading-5 text-ink-3">{intro}</p>
          <div className="mt-8">{children}</div>
        </Card>
      </Container>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="pe-11" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("Hide password") : t("Show password")} className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-ink-3 hover:text-ink cursor-pointer">
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </span>
  );
}

export function SignIn() {
  const { owner, signIn } = useStore();
  const to = useReturnTo();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (owner) return <Navigate to={to} replace />;
  const submit = async () => {
    if (!email.trim() || !password) return setError(t("Enter your email and password."));
    setBusy(true);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) return setError(t(err));
    nav(to, { replace: true });
  };
  return (
    <Shell title={t("Sign in")} intro={t("See your bookings and invoices, pay online and sign contracts.")}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
        <Field label={t("Email")}>{(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label={t("Password")}>{(id) => <PasswordInput id={id} autoComplete="current-password" value={password} onChange={setPassword} />}</Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? t("Signing in…") : t("Sign in")}</Button>
        <p className="text-center text-[13px] text-ink-2">{t("New here?")} <Link to="/register" state={{ from: to }} className="font-semibold text-green-text hover:underline">{t("Create an account")}</Link></p>
      </form>
      {import.meta.env.DEV && (
        <div className="mt-8 border-t border-line pt-5 text-xs text-ink-3">
          <p className="mb-3 text-center">{t("Demo accounts (development only)")}</p>
          <button type="button" onClick={() => { setEmail(DEMO_OWNER_EMAIL); setPassword("owner123"); setError(null); }} className="w-full rounded-[12px] border border-line px-3 py-2.5 text-start hover:bg-sidebar cursor-pointer">
            <span className="block text-[13px] font-semibold text-ink">{t("Boat owner")}</span>
            <span className="block truncate">{DEMO_OWNER_EMAIL}</span>
          </button>
        </div>
      )}
    </Shell>
  );
}

export function Register() {
  const { owner, register } = useStore();
  const to = useReturnTo();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (owner) return <Navigate to={to} replace />;
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = t("Enter a valid email.");
    if (f.password.length < 8) e.password = t("Use at least 8 characters.");
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const err = await register(f);
    setBusy(false);
    if (err) return setError(t(err));
    nav(to, { replace: true });
  };
  return (
    <Shell title={t("Create an account")} intro={t("It takes a minute. You'll use it to book berths and manage your stays.")}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
        <Field label={t("Full name")} error={errors.name}>{(id) => <Input id={id} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label={t("Email")} error={errors.email}>{(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />}</Field>
        <Field label={t("Phone")} hint={t("Optional. The dock office calls if something comes up.")}>{(id) => <Input id={id} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />}</Field>
        <Field label={t("Password")} error={errors.password} hint={t("At least 8 characters.")}>{(id) => <PasswordInput id={id} autoComplete="new-password" value={f.password} onChange={(v) => set("password", v)} />}</Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? t("Creating your account…") : t("Create account")}</Button>
        <p className="text-center text-[13px] text-ink-2">{t("Already have an account?")} <Link to="/sign-in" state={{ from: to }} className="font-semibold text-green-text hover:underline">{t("Sign in")}</Link></p>
        <p className="text-center text-xs text-ink-3">{t("Your account is saved only in this browser for now.")}</p>
      </form>
    </Shell>
  );
}
