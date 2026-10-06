# Marina website (not started)

The public face of Marina, kept separate from the admin web app and the staff mobile app.

Planned:

- **Marketing site:** what Marina does, pricing, contact and demo request
- **Boat-owner portal:** find a marina, check berth availability, book and pay, see past stays, invoices and receipts, update boat details

It will use `@marina/shared` for types, pricing and brand tokens, and deploy as its own Vercel project with Root Directory `apps/website`. Boat owners will need a real backend first, so bookings made here appear in the web and staff apps.
