# Marina Management System

Admin portal for companies that run several marinas: berths, bookings, staff, maintenance, billing and reporting across counties and cities.

This is a **front-end prototype**. It runs entirely in the browser with generated sample data. There is no server or database yet.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a demo account (shown on the login page in development):

| Role | Email | Password |
|---|---|---|
| Admin (all marinas) | admin@marina.com | admin123 |
| Marina manager (4 San Francisco Bay marinas) | manager@marina.com | manager123 |

Reviewers can also choose **Create an account** on the sign-in page. New accounts get admin access and are saved in that browser. On the deployed site, the owner (chauhan.nikunj1328@gmail.com) is emailed each time someone registers or signs in (name, email, company, role, time, browser; never the password) through [FormSubmit](https://formsubmit.co). FormSubmit asks the owner to confirm the address with the very first email. Edit `src/lib/notify.ts` to change the address.

Changes you make are saved in your browser until midnight; then fresh sample data is generated so dates stay current. Settings → Demo data → **Reset demo data** starts over at any time.

## Screens

| Area | Route | What works |
|---|---|---|
| Login, Forgot password | `/login`, `/forgot-password` | Validation, show/hide password, reset-link confirmation |
| Global / County / City dashboards | `/`, `/county/:id`, `/city/:id` | KPIs, revenue and occupancy charts, rankings, today's to-dos, recent activity, CSV export |
| Marinas | `/marinas`, `/marinas/:id` | Add, edit, deactivate; detail page with bookings, staff and clickable berth status |
| Berths & Slips | `/berths` | List and dock map; berth detail (current boat, upcoming and past stays, work orders, "Book this berth"); add/edit/delete; maintenance toggle |
| Bookings | `/bookings` | New booking (only free berths that fit the boat), change dates or berth (re-prices unpaid invoices), approve, check in/out, cancel, email details, calendar, today's arrivals/departures, double-booking check, CSV |
| Locations | `/locations` | Counties, cities and a map; add, edit, delete (admin only) |
| Staff | `/staff` | Directory, weekly schedule with shift-gap warnings, shift coverage, days off, add/edit/remove |
| Maintenance | `/maintenance` | Work orders with notes, start/complete/reopen, filters; completing the last order returns the berth to service |
| Boat Owners & Users | `/users` | Add/edit owners and boats, owner history and balance; invite, edit, disable users |
| Billing | `/billing` | Invoice view and print, record payment, reminders (logged), void, CSV |
| Reports, Analytics | `/reports`, `/analytics` | 4 downloadable reports; stay length, lead time, boat mix |
| Access Control | `/access` | Role permission matrix and a searchable audit log of every change |
| Settings | `/settings` | Profile, notification preferences, company name, currency, invoice due days, monthly-rate threshold (all applied live) |

The bell menu is built from live data: pending approvals, today's arrivals, overdue invoices, urgent work orders and unaccepted invites.

## Roles

| | Admin | Marina manager |
|---|---|---|
| Marinas visible | All | Only assigned marinas (everywhere, including direct links) |
| County / City dashboards | Yes | Hidden when assigned to one marina |
| Boat owners | All | Owners who booked at their marinas (and new owners) |
| System users, Locations, Access Control, company defaults | Yes | No |
| Activity feed | Everything | Their marinas only |

## Working faster

- **Undo** appears on the confirmation message after cancelling, approving, checking in/out, recording a payment, voiding, completing a work order, removing staff, taking a berth out of service and deleting.
- **Keyboard:** `/` search, `N` new booking, `G` then `D`/`B`/`I` to go to overview, bookings or billing, `?` for the list.
- **Bulk actions:** filter Bookings by *Pending* to approve all; filter Billing by *Overdue* to remind all.
- Sortable columns, a "Clear filters" link, unsaved-changes warning on every form, and an ⓘ on dashboard numbers explaining how they're calculated.

## Also included

- **Remember me** keeps you signed in after the browser closes; otherwise sign-in ends with the tab.
- **Access Control** is editable: set each role to Assigned marinas, View only or No access per area. "No access" hides the page; "View only" hides create and edit actions.
- **Part payments** on invoices, with payment history and remaining balance everywhere totals are shown.
- **Reports → Download PDF** prints a branded report (use "Save as PDF" in the print dialog). Invoices print the same way.
- **Time zone** from Settings is used for every time shown; **Preview daily summary** shows the 7 am email.
- First sign-in **welcome steps**, a soft glow on your **first booking**, an **offline** banner, branded **404 / error / no-access** pages, loading **skeletons**, and **phone-friendly tables** (rows become cards).
- Home-screen icons, a web app manifest and a 1200 × 630 **link preview image** (`public/`).

## How the numbers stay consistent

Every figure is calculated from one data set (`src/data/seed.ts`) by the functions in `src/data/selectors.ts`. Totals on one page always match the same totals on another, because nothing is typed in by hand.

- **Occupancy today** = berths with a confirmed or checked-in booking covering today ÷ all berths.
- **Revenue booked this month** = each non-cancelled, non-pending booking's price spread across its nights, counting the nights that fall in this month (includes confirmed stays later this month).
- **Price** = nights × daily rate, or the monthly rate prorated for stays of 28+ nights (`src/data/pricing.ts`).

## Brand

The UI follows the **Marina Brand to Product Handoff Guide v1**. All values live as tokens at the top of `src/index.css` (light and dark), with comments pointing to the guide section.

- **Color:** Slate `#2F3740` for primary buttons and the active nav bar, Teal `#497079` for rings and focus, Sunlight `#F7E8A6` for highlight pills and update cards, Green `#0E9A50` for links, progress and "new" (Green 700 `#0B6B37` for small text). Warm sidebar `#F1F0EC`.
- **Type:** Poppins for UI, Inter with tabular figures for numbers (`.num` class).
- **Shape:** pill buttons and badges, 12 px inputs, 16 px cards, 20 px dialogs; borders instead of shadows.
- **Status badges:** section 07 colors (ocean blue, amber, red, coral, slate), always with an icon.
- **Charts:** section 10 palette, horizontal dashed gridlines, legend top right.
- **Formats:** dates "3 Oct 2026", relative times under 24 hours, invoices with 2 decimals.
- **Logo:** the brand logomark lives in `src/components/Logo.tsx` (in-app) and `public/brand/logomark-ink.svg` / `logomark-white.svg`; wordmark "Marina".

Icons are from [Lucide](https://lucide.dev) via `lucide-react`, set to a 1.5 px rounded stroke to match the guide's icon style.

## Project structure

```
src/
  data/        types, sample-data generator, pricing, selectors (all calculations), store
  components/  Layout (sidebar, header, search, notifications), ui kit, status badges, charts
  pages/       one file per area
  lib/         date, number and CSV helpers
```

## Not built yet

- Real backend, database and authentication (demo passwords live in `src/data/store.tsx`)
- Payments (Stripe) and real email/SMS delivery: reminders, invites and booking emails are recorded in the system and the audit log, but not actually sent
- Customer-facing booking portal and mobile app
- Map view with real map tiles
