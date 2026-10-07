# Marina website

The public face of Marina, kept separate from the admin web app and the staff mobile app.

- **Public site:** home with berth search, marinas (with a map), rates and fees, contact
- **Booking:** free berths that fit the boat for the whole stay, with the exact price; online bookings are requests the marina approves in the web app; a waitlist for full marinas
- **Owner portal** (`/account`): bookings, invoices and receipts (pay online), contracts (sign online), boats, waitlist requests, profile and password

```bash
npm install
npm run dev
```

Demo owner: `owner@marina.com` / `owner123` (the sign-in page fills it in during development).

It uses `@marina/shared` for data, pricing, booking rules (`portal.ts`), translations and the brand stylesheet (`brand.css`), and deploys as its own Vercel project with Root Directory `apps/website`. Until there's a backend, it keeps its own copy of the sample data in the browser.
