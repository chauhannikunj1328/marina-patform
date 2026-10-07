# Marina Management System

Software for companies that run several marinas: berths, bookings, staff, maintenance, billing and reporting across counties and cities.

This is a **front-end prototype**. Each app runs on its own with generated sample data. There is no server or database yet, so the apps don't share live data (see "Not built yet").

## What's in this repo

| Folder | What it is | Who uses it | Tech | Deploys to |
|---|---|---|---|---|
| `apps/web` | Admin and manager web app | Admins, marina managers | React, Vite, Tailwind | Vercel project `marina-patform` (this repo's root `vercel.json`) |
| `apps/mobile` | Marina app: splash → sign in → tabs for the person's role | Staff, marina managers, admins | React Native (Expo SDK 57, expo-router) | App Store and Google Play (EAS Build); optional web preview on its own Vercel project |
| `apps/website` | Public website and boat-owner portal | Boat owners, visitors | Not started | Its own project |
| `packages/shared` | Data types, sample data, calculations, permissions, brand tokens, demo accounts | Both apps | Plain TypeScript, no dependencies | Bundled into each app |
| `brand/` | Logo SVGs and the brand handoff guide | Design | | |

Each app has its own `package.json` and `node_modules`, so they install, build and deploy separately. They import `@marina/shared` straight from source (a Vite alias on the web, Metro `watchFolders` on mobile), so every number is calculated the same way in both.

## Run it

**Web app** (admin and manager)

```bash
npm --prefix apps/web install
npm run dev:web
```

Opens on http://localhost:5173.

**Staff mobile app**

```bash
npm --prefix apps/mobile install
npm run dev:mobile
```

Scan the QR code with Expo Go on a phone, or press `i` / `a` for the iOS simulator or Android emulator. `npm run web:mobile` opens it in a browser on http://localhost:8081.

### Demo accounts

| Role | App | Email | Password |
|---|---|---|---|
| Admin (all marinas) | Web and mobile | admin@marina.com | admin123 |
| Marina manager (4 San Francisco Bay marinas) | Web and mobile | manager@marina.com | manager123 |
| Staff, dock hand (Golden Gate and Bay Harbor) | Mobile | staff@marina.com | staff123 |

Staff who sign in to the web app are asked to use the mobile app instead. The mobile sign-in screen has Admin, Manager and Staff demo buttons (prototype only).

Reviewers can also choose **Create an account** on the web sign-in page. New accounts get admin access and are saved in that browser. On the deployed sites, the owner (chauhan.nikunj1328@gmail.com) is emailed each time someone registers or signs in (name, email, company, role, app, time, device; never the password) through [FormSubmit](https://formsubmit.co). FormSubmit asks the owner to confirm the address with the very first email. The address is set in `packages/shared/src/notify.ts`.

Changes you make are saved on that device until midnight; then fresh sample data is generated so dates stay current. Web: Settings → Demo data → **Reset demo data** starts over at any time.

## Deploying

- **Web app:** pushes to `main` deploy automatically to https://marina-patform.vercel.app. The root `vercel.json` installs and builds `apps/web`.
- **Mobile app in the stores:** from `apps/mobile`, run `npx eas-cli build --profile production --platform all`, then `npx eas-cli submit`. This needs an Expo account, an Apple Developer account and a Google Play developer account. `--profile preview` builds an Android APK you can install directly for testing.
- **Mobile app web preview (optional):** create a second Vercel project from this repo with **Root Directory** set to `apps/mobile`. Its `vercel.json` runs `expo export` and serves `dist`.

## Web app

## Screens

| Area | Route | What works |
|---|---|---|
| Login, Forgot password | `/login`, `/forgot-password` | Validation, show/hide password, reset-link confirmation |
| Global / County / City dashboards | `/`, `/county/:id`, `/city/:id` | KPIs, revenue and occupancy charts, rankings, today's to-dos, recent activity, CSV export |
| Marinas | `/marinas`, `/marinas/:id` | Add, edit, deactivate; **List / Map** views (street map with a pin per marina, nearby pins grouped); set a marina's position by clicking the map or typing coordinates; detail page with bookings, staff, clickable berth status, a map and **Directions** |
| Berths & Slips | `/berths` | List, dock map and **Meters** (power and water readings billed to the boat in the berth); berth detail; add/edit/delete; maintenance toggle; printable **QR labels** |
| Bookings | `/bookings` | New booking (only free berths that fit the boat, priced with the pricing rules), change dates or berth (re-prices unpaid invoices), approve, check in/out, cancel, email details, calendar, today's arrivals/departures, double-booking check, **Waitlist** (matches freed-up berths, offer, one-click book), CSV |
| Contracts | `/contracts` | Monthly, seasonal and annual berth contracts held through a booking for the whole term and invoiced up front; renewal alerts (a week, a month or two months ahead); Renew / Don't renew |
| Locations | `/locations` | Counties, cities and a street map of every marina (click a pin for its city's figures); add, edit, delete (admin only) |
| Staff | `/staff` | Directory, weekly schedule (follows approved time off and swaps), shift coverage, **Requests** (approve or decline), **Hours** (pay, overtime, timesheet approval, payroll CSV/Excel), **Messages** with staff |
| Maintenance | `/maintenance` | Work orders with notes and **parts used**, start/complete/reopen, filters; **Recurring jobs** (weekly, monthly, quarterly; work orders created a week ahead); **Parts & supplies** stock with low-stock flags and restocking |
| Incidents | `/incidents` | Damage, injuries, theft and spills reported from the phone; investigate, follow-up notes, close with an outcome |
| Boat Owners & Users | `/users` | Add/edit owners and boats, owner history and balance; invite, edit, disable users |
| Billing | `/billing` | Invoice view and print with company branding and service lines (fuel, pump-out, electricity, water…), record payment, reminders (logged), void, CSV |
| Reports, Analytics | `/reports`, `/analytics` | 5 reports (incl. fuel, services and utilities) as CSV, Excel or PDF; **Export all data** as one Excel workbook; **scheduled report emails** (saved; sent once there's a server); stay length, lead time, boat mix |
| Access Control | `/access` | Role permission matrix and a searchable audit log of every change, with **before and after values** |
| Settings | `/settings` | Profile, notifications, company defaults; **Pricing** (seasons, weekend surcharge, long-stay discount, utility rates; new bookings keep the price they were made at); **Branding** (logo, colour, invoice footer) |

The bell menu is built from live data: pending approvals, today's arrivals, overdue invoices, urgent work orders, staff requests and messages, waitlist matches, contract renewals, low stock, new incidents and unaccepted invites.

## Mobile app

One app, **Marina**, for every role (bundle ID `com.marina.app`). The tabs depend on who signs in.

### Managers and admins

- **Overview:** occupancy, revenue this month, arrivals and departures, staff on the clock; what needs attention; 6-month revenue (tap for **revenue by county, city and marina**); every marina ranked by occupancy with **Compare** (2–3 side by side); recent activity with a full **activity log**
- **Marina page:** one marina's numbers, berths, revenue, people and contacts, with **Directions** that open the phone's map app; admins can **close a marina to new bookings** and reopen it
- **Approvals:** pending bookings (approve creates the invoice) and staff time off / swaps; Approve all with a confirmation
- **Bookings:** make future bookings, change dates or berth, extend, cancel, approve or decline, take payments, move a boat to another berth
- **Team:** today (on the clock, scheduled, off, patrols, hand-over notes), **Week** (shift gaps, Find cover, edit someone's regular schedule), hours, chat, and **Message everyone** announcements
- **Owners, Invoices, Day report:** owner lookup with stays and balance; overdue / due / paid invoices with reminders and payments; today's or yesterday's report with the plan for tomorrow, shareable as text
- **Work orders:** assign, set priority and due date, mark done
- **All marinas** in the header switcher. Setup (marinas, locations, users, access control) stays in the web app; **Me → Open the web app** links to it.

### Staff


The app opens with the brand splash screen, then sign-in. Staff get five tabs. Staff assigned to more than one marina switch between them from the header. The header also has **Scan**, **Messages** and **Notifications**.

- **Today:** shift card with **Clock in / Clock out** and time on the clock, arrivals and departures with Check in / Check out, boats past their departure date, urgent repairs
- **Bookings:** search, Today / Upcoming / In marina, booking details, call or email the owner, **Walk-in** booking for boats that arrive without one (find or add the boat, pick a free berth that fits, check in), **Take payment** at the dock (card reader, cash or check, full or part payment)
- **Berths:** dock map with status filters, berth details, report a problem, take a berth out of service
- **Tasks:** my, open and finished work orders; start and finish with notes and camera photos; report a new problem
- **Me:** weekly schedule (with approved time off and swaps), hours worked and timesheet, **time off and shift swap requests**, edit profile, change password, appearance, sign out
- **Scan:** point the camera at a berth's QR label (or type the berth number) to open it. Labels are printed from the web app (Berths → QR labels) and link to `marinastaff://berth/<id>` (the app answers to both `marina://` and `marinastaff://`), so the phone camera opens the app too.
- **Messages:** conversation with the marina's managers
- **Notifications:** new and overdue work orders, manager messages, request decisions, colleagues asking you to cover, late departures, today's arrivals and tomorrow's shift
- **Also:** **shift reminders** 30 minutes before each shift (phone notification), a **berth ready check** before arrivals, **check-in sign-off** (boat condition, photos, the owner's signature on screen), **Add service** (fuel, pump-out, ice, laundry) and **Read meters** charged to the boat's invoice, **hand-over notes** at clock-out, **dock patrol** rounds (scan a berth label on each dock, safety checklist), **incident reports**, **Face ID / fingerprint unlock**, **English, Español and العربية**
- **Offline:** a banner shows when there's no connection. Everything keeps working and is saved on the phone; changes made offline are queued and cleared when the connection returns (they'll be sent to the server once there is one).

What staff can do follows Access Control (e.g. View only hides check-in and edit actions; billing set to No access hides Take payment). Settings are in `apps/mobile/app.json`.

### Manager side (web app)

- **Staff → Requests:** approve or decline time off and shift swaps. Approved ones update the weekly schedule and the staff member's app.
- **Staff → Hours:** each person's clock-ins by day, weekly totals, pay with overtime, timesheet approval and payroll export.
- **Staff → Messages:** reply to staff conversations.
- **Berths → QR labels:** printable labels for every berth post at a marina.
- The bell shows new staff requests and unread staff messages.

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

## Maps

The web app's maps use [Leaflet](https://leafletjs.com) with OpenStreetMap tiles; dark mode tints them into a night map. Marinas saved without a position show at their city's center until one is set.

OpenStreetMap's tiles are for light use only. For production, set these in `apps/web/.env` (or the Vercel project) to a tile provider you have an account with, such as MapTiler, Stadia Maps or Mapbox:

- `VITE_MAP_TILES`: tile URL template, e.g. `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=…`
- `VITE_MAP_TILES_DARK` (optional): a dark style, used in dark mode instead of tinting
- `VITE_MAP_ATTRIBUTION` (optional): the provider's credit line (HTML)

## Languages

Both apps run in **English** (default), **Spanish** and **Arabic**. Switch from the language button in the web app's top bar, or **Me → Language** on the phone; the choice is remembered.

- **Arabic reads right to left:** the layout is mirrored (sidebar and tab order on the right, arrows and chevrons flipped, chart axes reversed) and text uses **IBM Plex Sans Arabic**. Numbers stay in Western digits (0–9), and codes, emails, phone numbers and amounts keep reading left to right.
- Dates, times, currency and plurals follow the language (Arabic has its own forms for 1, 2, 3–10 and 11+).
- Text is written in English in the code (`t("Check in")` on the web, `tr("Check in")` on mobile, where `t` is the theme). Translations live in `packages/shared/src/i18n/es.ts` and `ar.ts`, keyed by the English text; anything missing falls back to English. The web app downloads a language's translations only when someone picks it, so English visitors don't load them.
- The activity log and notifications are stored in English and shown in the reader's language.
- Names, addresses and text people type (work order titles, notes, messages) are shown as entered.
- On a phone, switching to or from Arabic mirrors the layout right away; the system's right-to-left setting is applied the next time the app opens.

## How the numbers stay consistent

Every figure is calculated from one data set (`packages/shared/src/seed.ts`) by the functions in `packages/shared/src/selectors.ts`. Totals on one page always match the same totals on another, because nothing is typed in by hand.

- **Occupancy today** = berths with a confirmed or checked-in booking covering today ÷ all berths.
- **Revenue booked this month** = each non-cancelled, non-pending booking's price spread across its nights, counting the nights that fall in this month (includes confirmed stays later this month).
- **Price** = nights × daily rate, or the monthly rate prorated for stays of 28+ nights (`packages/shared/src/pricing.ts`).

## Brand

The UI follows the **Marina Brand to Product Handoff Guide v1**. Web tokens live at the top of `apps/web/src/index.css` (light and dark); the mobile app uses the same values from `packages/shared/src/brand.ts`.

- **Color:** Slate `#2F3740` for primary buttons and the active nav bar, Teal `#497079` for rings and focus, Sunlight `#F7E8A6` for highlight pills and update cards, Green `#0E9A50` for links, progress and "new" (Green 700 `#0B6B37` for small text). Warm sidebar `#F1F0EC`.
- **Type:** Poppins for UI, Inter with tabular figures for numbers (`.num` class).
- **Shape:** pill buttons and badges, 12 px inputs, 16 px cards, 20 px dialogs; borders instead of shadows.
- **Status badges:** section 07 colors (ocean blue, amber, red, coral, slate), always with an icon.
- **Charts:** section 10 palette, horizontal dashed gridlines, legend top right.
- **Formats:** dates "3 Oct 2026" (localized month names in Spanish and Arabic), relative times under 24 hours, invoices with 2 decimals.
- **Logo:** source files in `brand/logo/`; the logomark paths are shared in `packages/shared/src/brand.ts`; wordmark "Marina".

Icons are from [Lucide](https://lucide.dev) (`lucide-react` on the web, `lucide-react-native` on mobile), set to a 1.5 px rounded stroke to match the guide's icon style.

## Tests

Run `npm test` from the project root (the first time, run `npm install` in `packages/shared`). The tests in `packages/shared/test` cover pricing, dates, permissions, map helpers, recurring maintenance, contract renewals, overtime pay and the dashboard numbers (each marina's figures add up to the totals). They also fail if any text in either app is missing its Spanish or Arabic translation, or if a translation drops a `{placeholder}`.

`npm run lint` checks both apps: Oxlint for the web app (TypeScript 7 isn't supported by typescript-eslint yet) and `expo lint` for the phone app. Both must finish with no warnings.

## Project structure

```
apps/
  web/          Vite app: src/pages (one file per area), src/components, src/data/store.tsx
  mobile/       Expo app: src/app (screens and routes), src/components, src/store.tsx, assets/
  website/      public site and boat-owner portal (not started)
packages/
  shared/       types, sample data, pricing, selectors, permissions, dates, brand tokens, demo accounts
brand/          logo SVGs and the brand guide
```

## Not built yet

- Real backend, database and authentication. Until then each app keeps its own copy of the sample data, so a check-in, clock-in, request or message on the phone doesn't show up in the web app (and the other way round). A password changed in the staff app only works on that phone. Demo password hashes live in `packages/shared/src/accounts.ts`.
- Push notifications from the server (shift reminders are local phone notifications; everything else is in-app for now)
- Scheduled report emails are saved but not sent
- Card payments in the app (Stripe Terminal / Tap to Pay); staff record payments taken on the marina's card reader
- Payments (Stripe) and real email/SMS delivery: reminders, invites and booking emails are recorded in the system and the audit log, but not actually sent
- Public website and boat-owner booking portal (`apps/website`)
