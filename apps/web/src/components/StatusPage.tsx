// Guide 11: full-page states (404, errors) use a centered card on the canvas gradient with the
// logomark; in-app states (no permission) use an outline icon in a Neutral 100 circle.
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, Compass, Lock, Smartphone, WifiOff, type LucideIcon } from "lucide-react";
import { useStore } from "@/data/store";
import { Logomark } from "./Logo";
import { Button } from "./ui";
import { t } from "@marina/shared";

export function FullPageState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action: ReactNode }) {
  return (
    <div className="bg-canvas flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[20px] bg-surface p-8 text-center shadow-e3 sm:p-10">
        <div className="flex justify-center">
          <Logomark size={32} />
        </div>
        <span className="mx-auto mt-8 flex size-12 items-center justify-center rounded-full bg-surface-3">
          <Icon className="size-5 text-ink-2" aria-hidden />
        </span>
        <h1 className="mt-4 text-[22px] leading-[30px] font-medium">{title}</h1>
        <p className="mx-auto mt-2 max-w-[36ch] text-sm text-ink-2">{body}</p>
        <div className="mt-8 flex justify-center">{action}</div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <FullPageState
      icon={Compass}
      title={t("Page not found")}
      body={t("This page doesn't exist or has moved. Check the link, or go back to the overview.")}
      action={
        <Link to="/">
          <Button variant="primary">{t("Back to overview")}</Button>
        </Link>
      }
    />
  );
}

/** Shown inside the app when the signed-in role can't open a page. */
export function NoAccess({ area }: { area?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-3">
        <Lock className="size-5 text-ink-2" aria-hidden />
      </span>
      <h1 className="mt-4 text-[22px] leading-[30px] font-medium">{t("You don't have access to")} {area ?? t("this page")}</h1>
      <p className="mt-2 max-w-[44ch] text-sm text-ink-2">{t("Your role doesn't include it. Ask a company admin to change your permissions in Access Control.")}</p>
      <Link to="/" className="mt-6">
        <Button>{t("Go to overview")}</Button>
      </Link>
    </div>
  );
}

/** Catches rendering errors so a broken page shows a way back instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <FullPageState
        icon={CircleAlert}
        title={t("Something went wrong")}
        body={t("Sorry, this page couldn't load. Reload to try again. Your saved changes are safe.")}
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t("Reload page")}
          </Button>
        }
      />
    );
  }
}

/** Guide 11 Offline: Accent yellow banner across the top. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-[13px] font-medium text-on-accent">
      <WifiOff className="size-4" aria-hidden />
      {t("You're offline. Changes are saved in this browser and the app keeps working.")}
    </div>
  );
}

/** Staff accounts work in the Marina Staff mobile app, not the office web app. */
export function StaffUseMobile() {
  const { signOut } = useStore();
  return (
    <FullPageState
      icon={Smartphone}
      title={t("Use the Marina Staff app")}
      body={t("Staff accounts work in the Marina Staff app on your phone. Ask your manager for the download link, then sign in there with the same email and password.")}
      action={
        <Button
          onClick={() => {
            signOut();
            window.location.href = "/login";
          }}
        >
          {t("Sign out")}
        </Button>
      }
    />
  );
}
