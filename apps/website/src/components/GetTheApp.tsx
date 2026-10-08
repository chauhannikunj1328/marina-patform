// "Get the app": the Marina Berths customer app for boat owners, with App Store and Google Play
// buttons. Until the store listings are live (CUSTOMER_APP links empty) the buttons show
// "Coming soon" and don't link anywhere.
import { CalendarCheck, CircleCheck, CreditCard, Navigation } from "lucide-react";
import { CUSTOMER_APP, t } from "@marina/shared";
import { Eyebrow } from "@/components/ui";
import { Shot } from "@/lib/photos";

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden>
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.15-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66ZM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.05-.51 2.69-1.28Z" />
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <path d="M4.2 2.6 13.6 12l-9.4 9.4c-.3-.2-.5-.6-.5-1V3.6c0-.4.2-.8.5-1Z" fill="#00D7FE" />
      <path d="m16.7 8.9-3.1 3.1-9.4-9.4c.3-.2.8-.3 1.2-.1l11.3 6.4Z" fill="#00F076" />
      <path d="m16.7 15.1-11.3 6.4c-.4.2-.9.1-1.2-.1l9.4-9.4 3.1 3.1Z" fill="#FF3A44" />
      <path d="M20.2 13.1 16.7 15.1 13.6 12l3.1-3.1 3.5 2c.8.5.8 1.7 0 2.2Z" fill="#FFD400" />
    </svg>
  );
}

/** App Store / Google Play button. With no link it shows "Coming soon" and isn't clickable. */
export function StoreButton({ store, href }: { store: "apple" | "google"; href: string }) {
  const top = store === "apple" ? t("Download on the") : t("Get it on");
  const name = store === "apple" ? "App Store" : "Google Play";
  const body = (
    <>
      {store === "apple" ? <AppleLogo /> : <PlayLogo />}
      <span className="text-start leading-tight">
        <span className="block text-[11px] opacity-80">{href ? top : t("Coming soon to")}</span>
        <span className="block text-[17px] font-semibold">{name}</span>
      </span>
    </>
  );
  const cls = "inline-flex h-14 min-w-44 items-center gap-3 rounded-[12px] bg-[#111316] px-4 text-white";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${cls} hover:bg-black`}>{body}</a>
  ) : (
    <span role="img" aria-label={t("{store}: coming soon", { store: name })} className={`${cls} cursor-default opacity-90`}>{body}</span>
  );
}

/**
 * The "Get the app" card on Home (#app): the brand's promo card, Accent 100 with the fine square
 * grid (guide 06), store buttons and the app's home screen in a phone frame.
 */
export function AppCard() {
  const live = !!(CUSTOMER_APP.appStore || CUSTOMER_APP.playStore);
  const points: [typeof CalendarCheck, string][] = [
    [CalendarCheck, t("Find a free berth and book it in a few taps.")],
    [CreditCard, t("Pay invoices and sign your berth contract on your phone.")],
    [Navigation, t("Call the dock office or get directions to your berth in one tap.")],
  ];
  return (
    <section id="app" aria-labelledby="app-title" className="bg-promo relative flex scroll-mt-24 flex-col overflow-hidden rounded-[28px] p-8 sm:p-10">
      <Eyebrow>{t("The Marina Berths app")}</Eyebrow>
      <h2 id="app-title" className="max-w-sm text-[28px] leading-9 font-medium text-ink sm:text-[32px] sm:leading-10">{t("Your berth in your pocket")}</h2>
      <p className="mt-3 max-w-md text-[15px] text-ink-2">{t("Everything you do on the website, on your phone: book berths, keep track of your stays and pay what you owe. Free for iPhone and Android.")}</p>
      <div className="mt-8 grid flex-1 items-end gap-8 sm:grid-cols-[1fr_200px]">
        <div>
          <ul className="space-y-3">
            {points.map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-3 text-[14px] text-ink">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-e1"><Icon className="size-4" aria-hidden /></span>
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <StoreButton store="apple" href={CUSTOMER_APP.appStore} />
            <StoreButton store="google" href={CUSTOMER_APP.playStore} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-2">
            <CircleCheck className="size-3.5" aria-hidden />
            {live ? t("Sign in with the same account you use here.") : t("The app is coming soon. Your account here will work in it too.")}
          </p>
        </div>
        <div className="float-slow mx-auto -mb-24 w-[200px] rounded-[36px] border-[8px] border-[#111316] bg-[#111316] shadow-e3 sm:mx-0">
          <Shot name="appHome" className="rounded-[28px]" />
        </div>
      </div>
    </section>
  );
}
