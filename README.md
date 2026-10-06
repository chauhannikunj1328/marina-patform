# Marina Management System

Software for companies that run several marinas: berths, bookings, staff, maintenance, billing and reporting across counties and cities.

This is a **front-end prototype**. Each app runs on its own with generated sample data. There is no server or database yet, so the apps don't share live data (see "Not built yet").

## What's in this repo

| Folder | What it is | Who uses it | Tech | Deploys to |
|---|---|---|---|---|
| `apps/web` | Admin and manager web app | Admins, marina managers | React, Vite, Tailwind | Vercel project `marina-patform` (this repo's root `vercel.json`) |
| `apps/mobile` | Marina app: splash → sign in → tabs for the signed-in role (staff: Today, Bookings, Berths, Tasks, Me; managers and admins: Overview, Approvals, Bookings, Team, Me) | Dock hands, front desk, marina managers, admins | React Native (Expo SDK 57, expo-router) | App Store and Google Play (EAS Build); optional web preview on its own Vercel project |
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

**Mobile app**

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

Staff who sign in to the web app are asked to use the mobile app instead. The mobile sign-in screen has a button for each demo account.

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

## Mobile app

One app, **Marina**, for everyone. The tabs depend on who signs in.

### Staff

Opens with the brand splash screen, then sign-in, then five tabs. Staff assigned to more than one marina switch between them from the header. The header also has **Scan**, **Messages** and **Notifications**.

- **Today:** shift card with **Clock in / Clock out** and time on the clock, arrivals and departures with Check in / Check out, boats past their departure date, urgent repairs
- **Bookings:** search, Today / Upcoming / In marina, booking details, call or email the owner, **Walk-in** booking for boats that arrive without one (find or add the boat, pick a free berth that fits, check in), **Take payment** at the dock (card reader, cash or check, full or part payment)
- **Berths:** dock map with status filters, berth details, report a problem, take a berth out of service
- **Tasks:** my, open and finished work orders; start and finish with notes and camera photos; report a new problem
- **Me:** weekly schedule (with approved time off and swaps), hours worked and timesheet, **time off and shift swap requests**, edit profile, change password, appearance, sign out
- **Scan:** point the camera at a berth's QR label (or type the berth number) to open it. Labels are printed from the web app (Berths → QR labels) and link to `marinastaff://berth/<id>`, so the phone camera opens the app too.
- **Messages:** conversation with the marina's managers
- **Notifications:** new and overdue work orders, manager messages, request decisions, colleagues asking you to cover, late departures, today's arrivals and tomorrow's shift
- **Offline:** a banner shows when there's no connection. Everything keeps working and is saved on the phone; changes made offline are queued and cleared when the connection returns (they'll be sent to the server once there is one).

What staff can do follows Access Control (e.g. View only hides check-in and edit actions; billing set to No access hides Take payment).

### Managers and admins

Managers see their assigned marinas; admins see every marina. The header switcher adds **All marinas**, which is where the app opens when you have more than one.

- **Overview:** occupancy, revenue this month, boats still to arrive and leave today, who's on the clock. **Needs attention:** bookings to approve, staff requests, boats past departure, urgent repairs, overdue invoices. A 6-month revenue chart, the list of marinas and recent activity.
- **Approvals:** pending bookings with **Approve**, **Decline** and **Approve all**, plus staff time off and shift swaps. Approving a booking confirms it and creates its invoice; declining cancels it and voids any unpaid invoice (same rules as the web app). A booking that clashes with another one on the same berth, or is on a berth that's out of service, can't be approved until it's moved.
- **Bookings:** the staff Bookings tab across the marinas shown, with Approve / Decline on pending bookings. Walk-ins ask which marina when you're on All marinas.
- **Team:** who's on the clock, working or off today; hours by week; messages with staff. Tap a person for their week, hours and contact details, with Call, Email and Message.
- **Marina page** (from Overview or Me): a marina's numbers, berths, revenue, contacts and dock map, with a button to switch the app to it.
- **Work orders** (from Overview → urgent repairs, or a notification): open, unassigned and finished. Managers can **assign** them to staff and mark them done.
- **Notifications:** bookings to approve, each staff request, unread staff messages, urgent repairs, overdue invoices and late departures.
- **Me:** role, marinas (admins see a summary), appearance, change password and a link to the web app for billing, reports and settings.

App name "Marina", bundle ID `com.marina.app` (`apps/mobile/app.json`). Links use `marina://` or `marinastaff://`, so berth QR labels already printed still open the app.

### Manager side (web app)

- **Staff → Requests:** approve or decline time off and shift swaps. Approved ones update the weekly schedule and the staff member's app.
- **Staff → Hours:** each person's clock-ins by day, weekly totals and who's on the clock now.
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
- **Formats:** dates "3 Oct 2026", relative times under 24 hours, invoices with 2 decimals.
- **Logo:** source files in `brand/logo/`; the logomark paths are shared in `packages/shared/src/brand.ts`; wordmark "Marina".

Icons are from [Lucide](https://lucide.dev) (`lucide-react` on the web, `lucide-react-native` on mobile), set to a 1.5 px rounded stroke to match the guide's icon style.

## Project structure

```
apps/
  web/          Vite app: src/pages (one file per area), src/components, src/data/store.tsx
  mobile/       Expo app: src/app (routes), src/screens (Today, Overview), src/components, src/lib, src/store.tsx, assets/
  website/      public site and boat-owner portal (not started)
packages/
  shared/       types, sample data, pricing, selectors, permissions, dates, brand tokens, demo accounts
brand/          logo SVGs and the brand guide
```

## Not built yet

- Real backend, database and authentication. Until then each app keeps its own copy of the sample data, so a check-in, clock-in, request or message on the phone doesn't show up in the web app (and the other way round). A password changed in the mobile app only works on that phone. Demo password hashes live in `packages/shared/src/accounts.ts`.
- Push notifications for staff (notifications are in-app for now)
- Card payments in the app (Stripe Terminal / Tap to Pay); staff record payments taken on the marina's card reader
- Payments (Stripe) and real email/SMS delivery: reminders, invites and booking emails are recorded in the system and the audit log, but not actually sent
- Public website and boat-owner booking portal (`apps/website`)
- Map view with real map tiles
