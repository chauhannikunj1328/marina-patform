# Marina Management System

Software for companies that run several marinas: berths, bookings, staff, maintenance, billing and reporting across counties and cities.

This is a **front-end prototype**. Each app runs on its own with generated sample data. There is no server or database yet, so the apps don't share live data (see "Not built yet").

## What's in this repo

| Folder | What it is | Who uses it | Tech | Deploys to |
|---|---|---|---|---|
| `apps/web` | Admin and manager web app | Admins, marina managers | React, Vite, Tailwind | Vercel project `marina-patform` (this repo's root `vercel.json`) |
| `apps/mobile` | Marina app: splash → sign in → tabs for the person's role | Staff, marina managers, admins | React Native (Expo SDK 57, expo-router) | App Store and Google Play (EAS Build); optional web preview on its own Vercel project |
| `apps/website` | Public website and boat-owner portal | Visitors, boat owners | React, Vite, Tailwind | Its own Vercel project (Root Directory `apps/website`) |
| `apps/customer` | **Marina Berths**, the customer app: find and book berths, bookings, invoices, contracts, boats | Boat owners, visitors | React Native (Expo SDK 57, expo-router) | App Store and Google Play (EAS Build); optional web preview on its own Vercel project |
| `packages/shared` | Data types, sample data, calculations, permissions, booking rules, brand tokens and styles, demo accounts | All the apps | Plain TypeScript, no dependencies | Bundled into each app |
| `brand/` | Logo SVGs and the brand handoff guide | Design | | |

Each app has its own `package.json` and `node_modules`, so they install, build and deploy separately. They import `@marina/shared` straight from source (a Vite alias on the web, Metro `watchFolders` on mobile), so every number is calculated the same way everywhere.

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

**Public website and owner portal**

```bash
npm --prefix apps/website install
npm run dev:website
```

Opens on http://localhost:5174 if 5173 is taken by the web app.

**Customer app (Marina Berths)**

```bash
npm --prefix apps/customer install
npm run dev:customer
```

Same as the staff app: Expo Go, a simulator, or `npm run web:customer` for a browser on http://localhost:8082.

### Demo accounts

| Role | App | Email | Password |
|---|---|---|---|
| Admin (all marinas) | Web and mobile | admin@marina.com | admin123 |
| Marina manager (4 San Francisco Bay marinas) | Web and mobile | manager@marina.com | manager123 |
| Staff, dock hand (Golden Gate and Bay Harbor) | Mobile | staff@marina.com | staff123 |
| Boat owner (with a contract, invoices and stays) | Website owner portal and customer app | owner@marina.com | owner123 |

Staff who sign in to the web app are asked to use the mobile app instead. The mobile sign-in screen has Admin, Manager and Staff demo buttons (prototype only).

Reviewers can also choose **Create an account** on the web sign-in page. New accounts get admin access and are saved in that browser. On the deployed sites, the owner (chauhan.nikunj1328@gmail.com) is emailed each time someone registers or signs in (name, email, company, role, app, time, device; never the password) through [FormSubmit](https://formsubmit.co). FormSubmit asks the owner to confirm the address with the very first email. The address is set in `packages/shared/src/notify.ts`.

Changes you make are saved on that device until midnight; then fresh sample data is generated so dates stay current. Web: Settings → Demo data → **Reset demo data** starts over at any time.

## Locations and currencies

The sample data has **26 marinas**: 14 in the United States (California, Washington, Florida) and 12 in the Gulf: Dubai, Abu Dhabi, Sharjah and Ras Al Khaimah in the UAE, Jeddah and Al Khobar in Saudi Arabia, Doha, Manama, Muscat and Kuwait City. The Gulf places and map positions are real marina areas; the marina names, addresses, people and boats are made up (`packages/shared/src/gulf.ts`). They're added after the US data with their own random sequence, so the US marinas' bookings, invoices and staff are unchanged.

- **Each marina charges in its country's currency** (`countries.ts`): US dollars, UAE dirhams (AED), Saudi riyals (SAR), Qatari riyals (QAR), and the Bahraini, Omani and Kuwaiti dinars (BHD, OMR, KWD, shown to 3 decimals). A berth's rates, a booking, its invoice, payments, contracts and parts are all in that marina's currency.
- **Totals across marinas** (dashboards, Billing's cards, reports, the staff app's overview) are converted to the **reporting currency** in Settings → Company defaults (US dollars by default), using **Settings → Exchange rates**. The defaults are the Gulf currencies' dollar pegs.
- **What one boat owner owes** across countries is shown per currency, without converting ("$120 + AED 400").
- **Fuel, pump-outs, ice, laundry, electricity and water** are priced in US dollars (Settings → Pricing) and charged at each marina in its own currency.
- **Staff pay** stays in US dollars.
- **Lengths** are stored in feet and shown with metres ("40 ft (12.2 m)"). The boat length boxes show the metres as you type.
- **Arabic names:** Gulf marinas, cities and emirates have Arabic names and addresses (`nameAr`, `addressAr`). The website and customer app show them in Arabic; the web and staff apps keep the English names that staff edit.
- In Locations, a county's **Country** decides its marinas' currency; outside the US the country takes the place of the state.
- **Time zones:** each marina keeps its local time: Pacific for California and Washington, Eastern for Florida, and Gulf time (UAE, Oman) or Arabia time (Saudi Arabia, Qatar, Bahrain, Kuwait) in the Gulf. Clock-ins, timesheets, patrols, meter readings, incidents, handovers, chat and activity at a marina show in its local time wherever the reader is, and each marina page shows its local time. Settings → **Head office time zone** is only for times not tied to a marina.
- **Booking offices** (`OFFICES` in `marinas.ts`): San Francisco, +1 (415) 555-0100, for the US, and Dubai, +971 4 555 0100, for the Gulf, each with its own email and hours. The website and customer app list both, with the Gulf office first in Arabic.

## Deploying

- **Web app:** pushes to `main` deploy automatically to https://marina-patform.vercel.app. The root `vercel.json` installs and builds `apps/web`.
- **Mobile app in the stores:** from `apps/mobile`, run `npx eas-cli build --profile production --platform all`, then `npx eas-cli submit`. This needs an Expo account, an Apple Developer account and a Google Play developer account. `--profile preview` builds an Android APK you can install directly for testing.
- **Public website:** create a Vercel project from this repo with **Root Directory** set to `apps/website`. Its `vercel.json` builds the site and serves `dist`.
- **Customer app in the stores:** the same EAS steps, run from `apps/customer` (its own name, bundle id `com.marina.berths` and store listings). Once the listings are live, paste their links into `CUSTOMER_APP` in `packages/shared/src/marinas.ts`: the website's "Get the app" buttons switch from "Coming soon" to real links.
- **Mobile app web preview (optional):** create a second Vercel project from this repo with **Root Directory** set to `apps/mobile`. Its `vercel.json` runs `expo export` and serves `dist`. The customer app works the same way with **Root Directory** `apps/customer`.

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

## Public website and owner portal

A public site for visitors and an account area for boat owners, in English, Spanish and Arabic, light and dark. Each language has its own addresses: `/marinas` (English), `/es/marinas`, `/ar/marinas`.

The design is minimal and clean, in the brand's colours, type and fine square grid (no new colours or fonts): a thin dark announcement bar, a large centred headline over the brand's Accent 100 yellow and grid (the same as the page headers and promo cards), real marina photos with floating cards built from live data, product screenshots in browser and phone frames, and a dark footer.

| Page | Route | What works |
|---|---|---|
| Home | `/` | Berth search; a marina photo with what's free tonight, the lowest nightly rate and the app; the places we have berths; about Marina with key numbers; **For boat owners** tabs (search and book, your account, pay online, sign contracts) with screenshots; your account and **Get the app** cards (App Store and Google Play buttons, shown as "Coming soon" until the store links are set); stay a night, a season or the whole year; our marinas on a map; how it works (with the dock office's web app); **reviews**; questions people ask; a final call to action |
| Marinas | `/marinas`, `/marinas/:id` | Filter by US state or Gulf country (`/marinas?state=Florida` opens with it chosen), map; each marina's berth sizes and rates, amenities, dock office contact, directions, availability search, rating and reviews |
| Rates and fees | `/pricing` | Rates by marina, a price estimator, how prices are worked out (monthly rate from 28 nights, any weekend, season and long-stay rules from Settings › Pricing), contract terms and discounts, dock extras, how to pay |
| Long-term berths | `/long-term` | Monthly, seasonal and annual contracts with prices from the lowest monthly rate, why a contract, how it works, the waitlist |
| Services and amenities | `/services` | Each amenity with how many marinas have it, what services cost, asking the dock office for anything else |
| About us | `/about` | Key numbers, how we work, where we are (marinas by state and country), the booking offices |
| Help centre | `/help` | Questions and answers by topic (booking, paying, longer stays, at the marina, your account), marked up as an FAQ for search engines; how to reach us |
| Contact | `/contact` | Head office and every dock office; a message form |
| Privacy policy, Terms of use and booking, Cookies and storage, Accessibility | `/privacy`, `/terms`, `/cookies`, `/accessibility` | **Draft text for a lawyer to review** (each page says so): written from how the site and booking rules actually work. Linked from the footer, checkout and Create an account. Update `UPDATED` in `apps/website/src/pages/Legal.tsx` when the text changes |
| Site map | `/sitemap` | Every page in one list: main pages, owner pages, company and legal pages, the marinas by state and the three languages (search engines read `sitemap.xml`) |
| Book a berth | `/book`, `/book/checkout` | Free berths that fit the boat for the whole stay, cheapest marina first, exact price; checkout with the owner's boat (or a new one), people on board and the berth rules; **join a marina's waitlist** when it's full (shows on the web app's Waitlist tab) |
| Sign in, Create an account, Forgot password | `/sign-in`, `/register`, `/forgot-password` | Owner accounts; the visitor returns to where they were heading |
| My account | `/account/…` | Overview (next stay, what's owed, contracts to sign), bookings (cancel a request the marina hasn't confirmed, **rate a past stay**), invoices (pay in full or in part, print the invoice or receipt), contracts (read and sign with your typed name), boats (add and edit), waitlist requests, profile and password |

- **Bookings made online** are requests (`pending`), exactly like the front desk's: the berth is held, and the web app's Bookings page approves and invoices them. They're logged as "Online booking".
- **Card payments** and **contract signatures** follow the same rules as the admin apps (`packages/shared/src/portal.ts`); the web app's Contracts page shows whether the owner has signed.
- **Until there's a backend,** the website keeps its own copy of the sample data in the browser, so a booking made here doesn't reach the web or staff app. Payments are simulated (no card is charged) and contact messages are kept in the browser.

### Search engines and link previews

- **One HTML file per public page and language.** The site is a single-page app, so at build time `vite.config.ts` writes a static HTML file for Home, Marinas, every marina, Rates and fees, Long-term berths, Services, About us, the Help centre, Contact, Book a berth, the Site map and the four legal pages, in English, Spanish and Arabic (`/es/…`, `/ar/…`, with `<html lang dir>` set), each with its own title, description, canonical URL, Open Graph and Twitter tags, and schema.org data (Organization, WebSite, FAQ, breadcrumbs, and a LocalBusiness for each marina with address, phone, map position, price range and amenities). Crawlers and link previews see these without running JavaScript; in the browser `usePageTitle` keeps the tags in step as people move around. The definitions are in `apps/website/src/lib/seo.ts`.
- **Languages:** every page lists its Spanish, Arabic and English versions (`hreflang`, plus `x-default` → English) and has its own canonical URL and `og:locale`. The address decides the language; the language menu keeps you on the same page (`/marinas?state=Florida` → `/es/marinas?state=Florida`). Someone who chose Spanish or Arabic before and comes back to an English address from outside the site is moved to their language.
- **`robots.txt` and `sitemap.xml`** are generated too. The sitemap lists every page in every language (120 addresses), each with its translations. Account, sign-in, checkout and search-result pages are `noindex` in every language. Unknown addresses return a real 404.
- **The site's address** comes from `SITE_URL`, or from the production domain Vercel sets while building (`VERCEL_PROJECT_PRODUCTION_URL`), so the `.vercel.app` address works with no setup. When you add a custom domain: in the Vercel project, **Settings → Environment Variables**, add `SITE_URL` = `https://www.your-domain.com` (no trailing slash) for Production, then redeploy. The sitemap, canonical URLs, language links and structured data all switch to it.
- **Link preview image:** `apps/website/public/og-image.png` (1200 × 630).
- The admin web app and the staff and customer app web previews send `X-Robots-Tag: noindex` so they stay out of search results (link previews still work).
- **Alt text:** every photo and screenshot has a description in all three languages (`apps/website/src/lib/photos.tsx`); decorative pictures are hidden from screen readers.

### Conversion

The booking path keeps the next step visible and answers the usual worries before they stop a booking. Every claim is true to the booking rules, and availability is worked out from the bookings, never made up.

- No booking fees, nothing to pay until the marina confirms, free to cancel before it's confirmed, usually confirmed within one business day: shown under the Home search, on each marina's availability search, on the results and at checkout.
- "N free tonight" on marina cards and marina pages; "Lowest price" on the cheapest berth in the results.
- Questions people ask (Home), with a call-us line and a search button; the booking office's number in the header on wide screens.
- On phones, a bar pinned to the bottom of each marina page with the lowest price and Check availability.
- Checkout explains what happens next and gives the dock office's number.
- Rates and fees: Check availability at the top, Best value on the annual contract, and Ask about a contract buttons that open the contact form with the topic (and marina) filled in.

### Reviews

- **Owners rate their stays:** in **My account → Bookings → Past**, each stay has **Rate your stay** (1–5 stars and a few words). The review appears on the marina's page and on Home with the owner's first name, last initial and boat. Until there's a backend, reviews are kept in the browser.
- **Sample reviews:** `SAMPLE_REVIEWS` in `apps/website/src/data/reviews.ts` are **dummy reviews for the preview**, marked `sample: true`, and the site says so under them. **Replace them with real reviews before going live:** showing made-up reviews to customers is misleading and illegal in many places (e.g. the US FTC's rule on fake reviews).
- Ratings aren't added to the structured data (no `AggregateRating`) while the reviews are samples; add it once real reviews come from a server.

### Photos and screenshots

- **Marina photos** (`apps/website/public/photos/`, 1600 px and 800 px WebP) are from [Unsplash](https://unsplash.com) under the Unsplash License (free for commercial use; credit appreciated, not required): Cristina Gottardi (sailboats at sunrise), Zach Lisko (pier with a life ring), Eric Ward (sailboat from above), Umberto Gorni (dock in morning mist), Manny Peralta (yachts along a walkway), Christine Caswell (wooden dock). They show marinas in general, not ours, so captions never name a marina. Swap in photos of your own marinas when you have them.
- **Product screenshots** (`apps/website/public/shots/`): the website's search results, owner account, an invoice and contracts, the dock office's web app, and the Marina Berths app, in every language. To retake them, start the website, web app and customer app dev servers and run `npm run site-shots` (set `SITE_URL`, `WEB_URL` and `CUSTOMER_URL` if they aren't on 5174, 5173 and 8082).

## Customer app (Marina Berths)

A separate phone app for boat owners, in English, Spanish and Arabic (right to left), light and dark. It uses the same booking, payment and contract rules as the website's owner portal (`packages/shared/src/portal.ts`) and the same owner accounts. Visitors can look around and search without an account; they sign in (or sign up) when they book, and then go straight on to checkout.

| Tab or screen | What works |
|---|---|
| Home | Visitors: what the app does, the marinas, how booking works. Owners: the stay now or next (call the dock office, directions), what's owed, contracts to sign, waitlist requests, recent bookings |
| Book, results, checkout | Any marina or one, arrival day, nights and boat; free berths that fit, cheapest marina first, with the exact price; checkout with the owner's boat (or a new one), people on board and the berth rules; join a full marina's waitlist |
| Bookings | Upcoming, past and cancelled; details, call, directions, the invoice, cancel a request the marina hasn't confirmed |
| Invoices | What's owed; each invoice or receipt with its lines and payments; pay in full or in part (simulated, no card is charged) |
| Account | Profile and password, boats (add and edit), contracts (read and sign), all marinas with rates and amenities, language, appearance, call or email the office, sign out |

Like the other apps it keeps its own copy of the sample data until there's a backend, so a booking made in the app doesn't reach the website or the web app yet.

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

## Page guides

Every page in all three apps has a **Read** button at the bottom centre. It opens a large pop-up guide to that page, in English, Spanish or Arabic (whichever the app is set to):

- An **Overview** tab says what the page is for and who uses it, then a tab for each part of the page, with **Previous** and **Next** to go through them in order.
- Each part has a **screenshot** of the real page in the reader's language, with **red boxes** around what to use, numbered in the order you use them, next to the step-by-step instructions.

How it's put together:

- The text lives in `packages/shared/src/guides/` (`en`, `es`, `ar`, one file each for the web app, the website and the phone app). The web app and website download a language's guides the first time someone opens one; the phone app ships the text, so it works offline.
- The screenshots are taken automatically (the website's in each language's own address, `/es/…`). `packages/shared/src/guides/specs.ts` says, for each guide section, which page to open, what to click first and what to box in red. `npm run shots` (in `tools/guide-shots`, using your installed Google Chrome) opens every page in every language, draws the boxes and saves WebP pictures to `apps/web/public/guides/` (web app and phone app) and `apps/website/public/guides/` (website). The phone app loads its pictures from the deployed web app, so they show when there's a connection.
- To retake pictures after a page changes, start the three dev servers (`npm run dev:web`, `npm run dev:website`, `npm run web:mobile`) and run `npm run shots`, or `npm run shots -- --only w.bookings --lang es` for one guide and language. Set `DEBUG=1` to list what's on the page when a target isn't found.
- Tests check that every page has a guide in every language, that Spanish and Arabic match the English section for section, and that every screenshot exists in every language.
- When a page changes, update its guide text in all three languages and retake its pictures.

## Languages

Every app runs in **English** (default), **Spanish** and **Arabic**. Switch from the language button in the web app's and website's top bar (the website also has the languages in its footer and its own address per language), **Me → Language** in the staff app, or **Account → Language** in the customer app; the choice is remembered.

- **Arabic reads right to left:** the layout is mirrored (sidebar and tab order on the right, arrows and chevrons flipped, chart axes reversed) and text uses **IBM Plex Sans Arabic**. Numbers stay in Western digits (0–9), and codes, emails, phone numbers and amounts keep reading left to right.
- Dates, times, number formats and plurals follow the language (Arabic has its own forms for 1, 2, 3–10 and 11+). Each amount is in its marina's currency (see "Locations and currencies").
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

The UI follows the **Marina Brand to Product Handoff Guide v1**. Web tokens, themes and shared styles live in `packages/shared/src/brand.css`, used by both the web app and the website (light and dark); the mobile app uses the same values from `packages/shared/src/brand.ts`.

- **Color:** Slate `#2F3740` for primary buttons and the active nav bar, Teal `#497079` for rings and focus, Sunlight `#F7E8A6` for highlight pills and update cards, Green `#0E9A50` for links, progress and "new" (Green 700 `#0B6B37` for small text). Warm sidebar `#F1F0EC`.
- **Type:** Poppins for UI, Inter with tabular figures for numbers (`.num` class).
- **Shape:** pill buttons and badges, 12 px inputs, 16 px cards, 20 px dialogs; borders instead of shadows.
- **Status badges:** section 07 colors (ocean blue, amber, red, coral, slate), always with an icon.
- **Charts:** section 10 palette, horizontal dashed gridlines, legend top right.
- **Formats:** dates "3 Oct 2026" (localized month names in Spanish and Arabic), relative times under 24 hours, invoices with 2 decimals.
- **Logo:** source files in `brand/logo/`; the logomark paths are shared in `packages/shared/src/brand.ts`; wordmark "Marina".

Icons are from [Lucide](https://lucide.dev) (`lucide-react` on the web, `lucide-react-native` on mobile), set to a 1.5 px rounded stroke to match the guide's icon style.

## Tests

Run `npm test` from the project root (the first time, run `npm install` in `packages/shared`). The tests in `packages/shared/test` cover pricing, dates, permissions, map helpers, recurring maintenance, contract renewals, overtime pay, the dashboard numbers (each marina's figures add up to the totals) and the website's booking, payment and signing rules. They also fail if any text in any app is missing its Spanish or Arabic translation, or if a translation drops a `{placeholder}`.

`npm run lint` checks all three apps: Oxlint for the web app and the website (TypeScript 7 isn't supported by typescript-eslint yet) and `expo lint` for the phone app. All must finish with no warnings.

## Project structure

```
apps/
  web/          Vite app: src/pages (one file per area), src/components, src/data/store.tsx
  mobile/       Expo app: src/app (screens and routes), src/components, src/store.tsx, assets/
  website/      Vite app: public site and boat-owner portal (src/pages, src/pages/account)
  customer/     Expo app for boat owners (Marina Berths): src/app (tabs and screens), src/components, src/store.tsx
tools/
  guide-shots/  takes the page guides' screenshots and the website's product screenshots in every language
packages/
  shared/       types, sample data, pricing, selectors, permissions, dates, brand tokens, demo accounts
brand/          logo SVGs and the brand guide
```

## Backend (Supabase, in progress)

The apps are moving onto a real database: **Supabase's free plan** (Postgres, sign-in and row-level security). It's built in phases, **admins first**:

1. **Database** (done): a table for every kind of record, sample data, tests.
2. **Admin sign-in and the web app on the database** (done, ready to connect): with the keys set, admins sign in with Supabase and every change is saved to the database.
3. Managers (their marinas only), 4. the staff app, 5. boat owners (website and customer app), 6. payments in test mode, email and push notifications, scheduled jobs.

Without the keys every app still runs as the demo, on sample data in the browser.

| Where | What |
|---|---|
| `supabase/migrations/` | The tables (`…_core_schema.sql`) and who can see what (`…_admin_access.sql`: active admins can do everything; others only read their own account). Ids are the apps' own (`m-gg`, `bk-0417`). |
| `packages/shared/src/backend.ts` | Which table holds each collection, its columns, records ↔ rows, and the changes to save. A test checks it matches the migrations. |
| `tools/db/` | `npm run db:setup` applies new migrations (and `-- --seed` loads the sample data); `npm run db:seed` writes the sample data to `supabase/seed.sql`. |
| `apps/web/src/data/remote.ts` | The web app's sign-in, loading and saving. The Supabase library only downloads when the backend is on. |

**Connect your project (once):**

1. Create a free project at [supabase.com](https://supabase.com).
2. Load the tables and sample data from your computer. Copy the connection string from **Project Settings → Database → Connection string → URI** (it contains your database password; keep it to yourself), then run:
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@…" npm run db:setup -- --seed
   ```
   It needs `psql` (`brew install libpq` on a Mac). Running it again is safe.
3. **Authentication → Users → Add user**: `admin@marina.com` (or any admin in `app_users`) with a password you choose. The account is matched to `app_users` by email.
4. In `apps/web`, copy `.env.example` to `.env.local` and fill in the project URL and **anon** key from **Project Settings → API**. On Vercel, add the same two variables to the web app project. Never use the `service_role` key in an app.
5. `npm run dev:web` and sign in as the admin.

**For now:** only admins can sign in with the database (managers and staff are told it's coming). Accounts are added in Supabase, not with Create account. Changes are saved as they happen; if a save fails, the app says so and reloads the saved data. New records still get their ids in the browser, so two admins adding records at the same moment could clash: fine for testing, and it moves to the database in a later phase along with recurring work orders and overdue invoices.

## Not built yet

- Backend for managers, staff and boat owners (admins are connected; see "Backend"). Until then each app keeps its own copy of the sample data, so a check-in, clock-in, request or message on the phone doesn't show up in the web app (and the other way round). A password changed in the staff app only works on that phone. Demo password hashes live in `packages/shared/src/accounts.ts`.
- Push notifications from the server (shift reminders are local phone notifications; everything else is in-app for now)
- Scheduled report emails are saved but not sent
- Card payments in the app (Stripe Terminal / Tap to Pay); staff record payments taken on the marina's card reader
- Payments (Stripe) and real email/SMS delivery: reminders, invites and booking emails are recorded in the system and the audit log, but not actually sent
- Owner portal and customer app against a real backend: today bookings, payments and signatures made on the website stay in that browser, and those made in the customer app stay on that phone
