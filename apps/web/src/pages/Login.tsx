import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CircleAlert, Eye, EyeOff, MailCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/data/store";
import { Button, Field, Input } from "@/components/ui";
import { t } from "@marina/shared";

/** 14 Login and sign-up: canvas gradient background, centered white card (radius 20), logo top, Slate pill button. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[20px] bg-surface p-8 shadow-e3 sm:p-10">{children}</div>
      <p className="mt-6 text-xs text-ink-2">© {new Date().getFullYear()} {t("Marina Management System")}</p>
    </div>
  );
}

function Brand() {
  return (
    <div className="mb-8 flex justify-center">
      <Logo />
    </div>
  );
}

export function Login() {
  const { signIn, user } = useStore();
  const navigate = useNavigate();
  // A shared link sends people here first; after signing in, take them to the page they opened.
  const from = (useLocation().state as { from?: string } | null)?.from;
  const target = from && from.startsWith("/") && !from.startsWith("/login") ? from : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={target} replace />;

  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(t("Enter your email and password."));
      return;
    }
    setBusy(true);
    const err = await signIn(email, password, remember);
    setBusy(false);
    if (err) setError(err);
    else navigate(target, { replace: true });
  };

  return (
    <Shell>
      <Brand />
      <div className="mb-8 text-center">
        <h1 className="text-[22px] leading-[30px] font-medium">{t("Welcome back")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("Sign in to manage your marinas, berths and bookings.")}</p>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t("Email address")}>
          {(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />}
        </Field>
        <Field label={t("Password")}>
          {(id) => (
            <div className="relative">
              <Input id={id} type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pe-10" />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? t("Hide password") : t("Show password")}
                title={show ? t("Hide password") : t("Show password")}
                className="absolute top-1/2 end-2 -translate-y-1/2 rounded-full p-1.5 text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2 text-ink-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 rounded-sm border-line-strong accent-[var(--primary)]" /> {t("Remember me")}
          </label>
          <Link to="/forgot-password" className="font-semibold text-green-text hover:underline">
            {t("Forgot password?")}
          </Link>
        </div>
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-[12px] border border-error-border bg-error-bg px-3.5 py-2.5 text-[13px] text-error-fg">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="h-12 w-full text-[15px]" disabled={busy}>
          {busy ? t("Signing in…") : t("Sign in")}
        </Button>
        <p className="text-center text-[13px] text-ink-2">
          {t("New here?")}{" "}
          <Link to="/register" state={{ from }} className="font-semibold text-green-text hover:underline">
            {t("Create an account")}
          </Link>
        </p>
      </form>
      {import.meta.env.DEV && (
        <div className="mt-8 border-t border-line pt-5 text-xs text-ink-3">
          <p className="mb-3 text-center">{t("Demo accounts (development only)")}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Admin", "admin@marina.com", "admin123"],
              ["Manager", "manager@marina.com", "manager123"],
            ].map(([role, e, p]) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setEmail(e);
                  setPassword(p);
                  setError(null);
                }}
                className="rounded-[12px] border border-line px-3 py-2.5 text-start hover:bg-sidebar cursor-pointer"
              >
                <span className="block text-[13px] font-semibold text-ink">{role}</span>
                <span className="block truncate">{e}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <Shell>
      {sent ? (
        <div className="text-center">
          <Brand />
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-bg">
            <MailCheck className="size-5 text-success-fg" aria-hidden />
          </span>
          <h1 className="mt-4 text-[22px] leading-[30px] font-medium">{t("Check your email")}</h1>
          <p className="mt-2 text-[13px] text-ink-2">
            {t("If an account exists for")} <strong>{email}</strong>{t(", we sent a link to reset your password. It expires in 30 minutes.")}
          </p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-[13px] font-semibold text-green-text hover:underline">
            <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("Back to sign in")}
          </Link>
        </div>
      ) : (
        <>
          <Brand />
          <div className="mb-8 text-center">
            <h1 className="text-[22px] leading-[30px] font-medium">{t("Reset your password")}</h1>
            <p className="mt-1 text-sm text-ink-2">{t("Enter your work email and we'll send you a reset link.")}</p>
          </div>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("Enter a valid email address."));
              setSent(true);
            }}
          >
            <Field label={t("Email address")} error={error}>
              {(id) => <Input id={id} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" />}
            </Field>
            <Button type="submit" variant="primary" className="h-12 w-full text-[15px]">
              {t("Send reset link")}
            </Button>
            <Link to="/login" className="flex items-center justify-center gap-1 text-[13px] font-semibold text-green-text hover:underline">
              <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("Back to sign in")}
            </Link>
          </form>
        </>
      )}
    </Shell>
  );
}

export function Register() {
  const { register, user } = useStore();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const target = from && from.startsWith("/") && !from.startsWith("/login") && !from.startsWith("/register") ? from : "/";
  const [f, setF] = useState({ name: "", email: "", company: "", password: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={target} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) errs.email = "Enter a valid email address.";
    if (f.password.length < 8) errs.password = "Use at least 8 characters.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const err = await register(f);
    setBusy(false);
    if (err) setErrors({ form: err });
    else navigate(target, { replace: true });
  };

  return (
    <Shell>
      <Brand />
      <div className="mb-8 text-center">
        <h1 className="text-[22px] leading-[30px] font-medium">{t("Create your account")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("Explore the full Marina dashboard with sample data.")}</p>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t("Full name")} error={errors.name}>
          {(id) => <Input id={id} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        </Field>
        <Field label={t("Work email")} error={errors.email}>
          {(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@company.com" />}
        </Field>
        <Field label={t("Company")} hint={t("Optional")}>
          {(id) => <Input id={id} autoComplete="organization" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />}
        </Field>
        <Field label={t("Password")} error={errors.password} hint={t("At least 8 characters")}>
          {(id) => (
            <div className="relative">
              <Input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="pe-10" />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? t("Hide password") : t("Show password")}
                className="absolute top-1/2 end-2 -translate-y-1/2 rounded-full p-1.5 text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
        {errors.form && (
          <p role="alert" className="flex items-start gap-2 rounded-[12px] border border-error-border bg-error-bg px-3.5 py-2.5 text-[13px] text-error-fg">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {errors.form}
          </p>
        )}
        <p className="rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-xs leading-[18px] text-ink-3">
          {t("The product owner is emailed your name, email, company and sign-in times so they know who is reviewing the demo. Your password is never shared. Your account and any changes you make are saved only in this browser.")}
        </p>
        <Button type="submit" variant="primary" className="h-12 w-full text-[15px]" disabled={busy}>
          {busy ? t("Creating account…") : t("Create account")}
        </Button>
        <p className="text-center text-[13px] text-ink-2">
          {t("Already have an account?")}{" "}
          <Link to="/login" state={{ from }} className="font-semibold text-green-text hover:underline">
            {t("Sign in")}
          </Link>
        </p>
      </form>
    </Shell>
  );
}
