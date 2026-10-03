import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, CircleAlert, Eye, EyeOff, MailCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/data/store";
import { Button, Field, Input } from "@/components/ui";

/** 14 Login and sign-up: canvas gradient background, centered white card (radius 20), logo top, Slate pill button. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[20px] bg-surface p-8 shadow-e3 sm:p-10">{children}</div>
      <p className="mt-6 text-xs text-ink-2">© {new Date().getFullYear()} Marina Management System</p>
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    const err = signIn(email, password);
    if (err) setError(err);
    else navigate("/");
  };

  return (
    <Shell>
      <Brand />
      <div className="mb-8 text-center">
        <h1 className="text-[22px] leading-[30px] font-medium">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-2">Sign in to manage your marinas, berths and bookings.</p>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email address">
          {(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />}
        </Field>
        <Field label="Password">
          {(id) => (
            <div className="relative">
              <Input id={id} type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                title={show ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2 text-ink-2">
            <input type="checkbox" className="size-4 rounded-sm border-line-strong accent-[var(--primary)]" /> Remember me
          </label>
          <Link to="/forgot-password" className="font-semibold text-green-text hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-[12px] border border-error-border bg-error-bg px-3.5 py-2.5 text-[13px] text-error-fg">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="h-12 w-full text-[15px]">
          Sign in
        </Button>
      </form>
      {import.meta.env.DEV && (
        <div className="mt-8 border-t border-line pt-5 text-xs text-ink-3">
          <p className="mb-3 text-center">Demo accounts (development only)</p>
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
                className="rounded-[12px] border border-line px-3 py-2.5 text-left hover:bg-sidebar cursor-pointer"
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
          <h1 className="mt-4 text-[22px] leading-[30px] font-medium">Check your email</h1>
          <p className="mt-2 text-[13px] text-ink-2">
            If an account exists for <strong>{email}</strong>, we sent a link to reset your password. It expires in 30 minutes.
          </p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-[13px] font-semibold text-green-text hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <Brand />
          <div className="mb-8 text-center">
            <h1 className="text-[22px] leading-[30px] font-medium">Reset your password</h1>
            <p className="mt-1 text-sm text-ink-2">Enter your work email and we'll send you a reset link.</p>
          </div>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
              setSent(true);
            }}
          >
            <Field label="Email address" error={error}>
              {(id) => <Input id={id} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" />}
            </Field>
            <Button type="submit" variant="primary" className="h-12 w-full text-[15px]">
              Send reset link
            </Button>
            <Link to="/login" className="flex items-center justify-center gap-1 text-[13px] font-semibold text-green-text hover:underline">
              <ArrowLeft className="size-4" aria-hidden /> Back to sign in
            </Link>
          </form>
        </>
      )}
    </Shell>
  );
}
