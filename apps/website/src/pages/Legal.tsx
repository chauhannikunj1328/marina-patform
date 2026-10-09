// Legal pages: privacy policy, terms of use and booking, cookies and storage, accessibility.
// The text is a draft written from how the site and the booking rules actually work. It says so on
// every page, and needs a lawyer's review for each country before the site goes live.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_TERMS, fmtDate, mainOffice, t } from "@marina/shared";
import { useStore } from "@/data/store";
import { Card, Container, Notice, PageHero, usePageTitle } from "@/components/ui";
import { legalMeta, type LegalKey, LEGAL } from "@/lib/seo";

/** When the legal text last changed. Update it with the text. */
const UPDATED = "2026-10-09";

interface Section {
  id: string;
  heading: string;
  body?: string[];
  points?: string[];
  /** A closing paragraph after the points. */
  note?: string;
}

function LegalPage({ page, intro, sections, children }: { page: LegalKey; intro: string; sections: Section[]; children?: ReactNode }) {
  const { db } = useStore();
  usePageTitle(t(LEGAL[page].name), legalMeta(db, window.location.origin, page));
  return (
    <>
      <PageHero eyebrow={t("Legal")} title={t(LEGAL[page].name)} intro={intro} />
      <Container className="grid gap-10 py-12 lg:grid-cols-[240px_1fr]">
        <nav aria-label={t("On this page")} className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <p className="text-label text-ink-3">{t("On this page")}</p>
          <ol className="mt-3 space-y-2 text-[13px] text-ink-2">
            {sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="hover:text-ink hover:underline">{s.heading}</a></li>)}
          </ol>
          <p className="mt-6 text-label text-ink-3">{t("Also see")}</p>
          <ul className="mt-3 space-y-2 text-[13px] text-ink-2">
            {(Object.keys(LEGAL) as LegalKey[]).filter((k) => k !== page).map((k) => <li key={k}><Link to={LEGAL[k].path} className="hover:text-ink hover:underline">{t(LEGAL[k].name)}</Link></li>)}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <Notice tone="warning">{t("Draft for review. This text is a starting point, not legal advice. Have a lawyer check it for each country we operate in before the site goes live.")}</Notice>
          <p className="mt-6 text-[13px] text-ink-3">{t("Last updated {date}", { date: fmtDate(UPDATED) })}</p>
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id} className="mt-10">
              <h2 id={s.id} className="scroll-mt-24 text-[22px] leading-[30px] font-medium">{s.heading}</h2>
              {s.body?.map((p) => <p key={p} className="mt-3 text-[15px] leading-7 text-ink-2">{p}</p>)}
              {s.points && <ul className="mt-3 list-disc space-y-2 ps-5 text-[15px] leading-7 text-ink-2">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>}
              {s.note && <p className="mt-3 text-[15px] leading-7 text-ink-2">{s.note}</p>}
            </section>
          ))}
          {children}
          <Card className="mt-12 p-6">
            <h2 className="text-[17px] font-medium">{t("Questions about this page?")}</h2>
            <p className="mt-1 text-[14px] text-ink-2">{t("Email {email} or call {phone}.", { email: mainOffice().email, phone: mainOffice().phone })}</p>
          </Card>
        </article>
      </Container>
    </>
  );
}

export function Privacy() {
  const { db } = useStore();
  const company = db.settings.company;
  const email = mainOffice().email;
  return (
    <LegalPage page="privacy" intro={t("What personal data we collect when you use the website and the Marina Berths app, why, and the choices you have.")} sections={[
      { id: "who", heading: t("Who we are"), body: [t("{company} runs the marinas on this website and the Marina Berths app, and decides how your personal data is used. Questions about privacy go to {email}.", { company, email })] },
      { id: "collect", heading: t("What we collect"), points: [
        t("Account details: your name, email, phone number and password. Passwords are stored as a secure hash, never as plain text."),
        t("Your boats: name, type, length and registration."),
        t("Bookings, contracts and invoices: dates, berths, amounts and payments, and your typed name when you sign a contract."),
        t("Messages you send us through the contact form or by email."),
        t("Reviews you write after a stay. They're shown with your first name, last initial and boat."),
      ] },
      { id: "use", heading: t("How we use it"), points: [
        t("To take and manage your bookings, contracts and invoices."),
        t("To send booking updates, invoices, receipts and contract reminders."),
        t("To answer your questions."),
        t("To keep the marinas safe and meet our legal, tax and accounting duties."),
      ], note: t("We don't sell your personal data, and we don't use it for advertising.") },
      { id: "cards", heading: t("Card payments"), body: [t("Card payments are handled by our payment provider. We don't see or store your full card number.")] },
      { id: "share", heading: t("Who we share it with"), points: [
        t("The dock office at the marina you book, so they can welcome you."),
        t("Companies that host the website, process payments or send email for us, under contract and only for that work."),
        t("Authorities, when the law requires it."),
      ] },
      { id: "keep", heading: t("How long we keep it"), body: [t("Booking, invoice and payment records for as long as tax and accounting law requires. Account details until you close your account. Messages for as long as we need them to help you.")] },
      { id: "where", heading: t("Where it's kept"), body: [t("Our marinas are in the United States and the Gulf, so your data may be handled in those countries. We protect it the same way wherever it is.")] },
      { id: "rights", heading: t("Your rights"), body: [t("Depending on where you live, you can ask to see the data we hold about you, correct it, delete it, or object to how we use it. Email {email} and we'll reply within the time the law allows.", { email })] },
      { id: "changes", heading: t("Changes to this policy"), body: [t("If we change this policy, we'll update the date at the top and tell account holders about important changes by email.")] },
    ]} />
  );
}

export function Terms() {
  const { db } = useStore();
  const company = db.settings.company;
  return (
    <LegalPage page="terms" intro={t("The terms for using the website and the Marina Berths app, and for booking a berth with us.")} sections={[
      { id: "about", heading: t("About these terms"), body: [t("These terms apply when you use this website or the Marina Berths app and when you book a berth with {company}. By booking, you agree to them.", { company })] },
      { id: "account", heading: t("Your account"), points: [
        t("Keep your password private. You're responsible for bookings made with your account."),
        t("Give accurate details, including your boat's real length, so we offer you a berth it fits."),
      ] },
      { id: "requests", heading: t("Booking requests"), points: [
        t("A booking is a request until the marina confirms it. Until then the berth is held for you and nothing is charged."),
        t("The marina may decline a request, for example if the berth isn't suitable for your boat."),
      ] },
      { id: "prices", heading: t("Prices and paying"), points: [
        t("The price shown when you book is the price of the berth for your stay."),
        t("Shore power, water, fuel and other services are extra and added to your invoice at the marina's rates."),
        t("The invoice is due within {n} days of confirmation. You can pay online or at the dock office.", { n: db.settings.invoiceDueDays }),
        t("Each marina charges in its own country's currency."),
      ] },
      { id: "cancel", heading: t("Cancelling"), body: [t("You can cancel a request at no cost until the marina confirms it, from your account. After that, call the dock office; the marina's cancellation terms apply.")] },
      { id: "contracts", heading: t("Berth contracts"), body: [t("Monthly, seasonal ({s} months) and annual ({a} months) contracts are invoiced for the whole term up front. The contract you sign sets out its own terms.", { s: CONTRACT_TERMS.seasonal.months, a: CONTRACT_TERMS.annual.months })] },
      { id: "rules", heading: t("At the marina"), points: [
        t("Check in at the dock office when you arrive."),
        t("Follow the dock staff's instructions and the marina's safety rules."),
        t("Keep your boat insured and in good, safe condition."),
        t("Leave the berth clear when your stay ends."),
      ] },
      { id: "liability", heading: t("Our responsibility"), body: [t("We look after our marinas with care. We aren't responsible for loss of or damage to your boat or belongings unless we caused it through negligence, or where the law says otherwise.")] },
      { id: "law", heading: t("Which law applies"), body: [t("A booking is governed by the law of the country where the marina is. Nothing in these terms limits rights you have under consumer law.")] },
    ]}>
      <p className="mt-10 text-[14px] text-ink-2">{t("How we handle your data is in the")} <Link to="/privacy" className="font-medium text-ink underline">{t("Privacy policy")}</Link>.</p>
    </LegalPage>
  );
}

export function Cookies() {
  return (
    <LegalPage page="cookies" intro={t("What this website keeps in your browser and why.")} sections={[
      { id: "none", heading: t("No tracking cookies"), body: [t("This website doesn't use advertising, analytics or tracking cookies, and doesn't share what you do here with advertisers.")] },
      { id: "browser", heading: t("What's kept in your browser"), body: [t("To work, the site keeps a few things in your browser's storage:")], points: [
        t("Your language and whether you chose light or dark mode."),
        t("That you're signed in, so you don't have to sign in on every page."),
        t("While the website is a preview: your bookings, payments, messages and reviews, until it's connected to our booking system."),
      ] },
      { id: "control", heading: t("Clearing it"), body: [t("You can clear it at any time in your browser's settings. You'll be signed out and the site goes back to its defaults.")] },
      { id: "changes", heading: t("If this changes"), body: [t("If we add analytics or other cookies, we'll update this page first and ask for your consent where the law requires it.")] },
    ]} />
  );
}

export function Accessibility() {
  const email = mainOffice().email;
  const phone = mainOffice().phone;
  return (
    <LegalPage page="accessibility" intro={t("We want everyone to be able to find and book a berth, whatever device or assistive technology they use.")} sections={[
      { id: "goal", heading: t("Our goal"), body: [t("We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA across the website and the owner account.")] },
      { id: "done", heading: t("What we've done"), points: [
        t("Every page works with a keyboard, and a Skip to content link jumps past the menu."),
        t("Pictures have text descriptions in English, Spanish and Arabic."),
        t("Text and buttons have strong contrast in light and dark mode."),
        t("Pages work at any screen width and when you zoom in."),
        t("Arabic pages read right to left."),
        t("Moving pictures stay still when your device asks for less motion."),
      ] },
      { id: "gaps", heading: t("What we know needs work"), body: [t("The map of our marinas is hard to use with a screen reader. Every marina on the map is also in the list on the Marinas page.")] },
      { id: "tell", heading: t("Tell us about a problem"), body: [t("If something is hard to use, email {email} or call {phone}. We'll help you book another way and fix the problem.", { email, phone })] },
    ]} />
  );
}
