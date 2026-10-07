// Page guides: what each page is for and how to use it, in every app and language.

/** One part of a guide: a short paragraph, numbered steps, bullet points, or any mix. */
export interface GuideSection {
  heading: string;
  text?: string;
  steps?: string[];
  points?: string[];
}

export interface Guide {
  title: string;
  /** One or two sentences: what the page is for. */
  summary: string;
  /** Who uses the page. */
  who: string;
  sections: GuideSection[];
}

/**
 * Guide keys, by app: "w." the admin web app, "s." the public website, "m." the phone app.
 * Every language has a guide for every key (a test checks this).
 */
export const GUIDE_KEYS = [
  "w.login", "w.overview", "w.county", "w.city", "w.marinas", "w.marina", "w.berths", "w.bookings", "w.contracts", "w.locations",
  "w.staff", "w.maintenance", "w.incidents", "w.people", "w.billing", "w.reports", "w.analytics", "w.access", "w.settings",
  "s.home", "s.marinas", "s.marina", "s.pricing", "s.contact", "s.book", "s.checkout", "s.signin", "s.account", "s.bookings",
  "s.invoices", "s.invoice", "s.contracts", "s.boats", "s.profile",
  "m.login", "m.overview", "m.today", "m.approvals", "m.bookings", "m.berths", "m.berth", "m.tasks", "m.team", "m.me", "m.scan",
  "m.patrol", "m.report", "m.owners", "m.invoices", "m.inbox", "m.chat", "m.activity", "m.compare", "m.revenue", "m.marina",
] as const;

export type GuideKey = (typeof GUIDE_KEYS)[number];
export type GuideBook = Record<GuideKey, Guide>;
