// What each guide section's screenshot shows. One entry per section, in order; null means the
// section has no picture (a short note). Used by tools/guide-shots to take the pictures, and by a
// test that checks every picture exists in every language.
import type { GuideKey } from "./types";
import type { Shot, Target } from "./shots";

const firstRow: Target = { css: "main tbody tr" };
/** A row in the phone app's lists ("Pelican II · Berth B-05 · …"). */
const phoneRow: Target = { css: '[role=button]:has-text(" · ")' };
const GG = { name: "Golden Gate Marina" };

export const SHOTS: Partial<Record<GuideKey, (Shot | null)[]>> = {
  // ---- Admin web app ---------------------------------------------------------------------------
  "w.login": [
    { path: "/login", as: "visitor", boxes: [{ label: "Email address" }, { label: "Password" }, { text: "Remember me" }, { role: "button", name: "Sign in" }] },
    { path: "/forgot-password", as: "visitor", boxes: [{ label: "Email address" }, { role: "button", name: "Send reset link" }] },
    { path: "/register", as: "visitor", boxes: [{ label: "Full name" }, { label: "Work email" }, { label: "Password" }, { role: "button", name: "Create account" }] },
    null,
  ],
  "w.overview": [
    { path: "/", as: "admin", boxes: [{ text: "Berths occupied today", exact: false, card: true }, { text: "Revenue booked this month", exact: false, card: true }, { text: "Occupancy rate", exact: false, card: true }] },
    { path: "/", as: "admin", boxes: [{ role: "heading", name: "Revenue", card: true }, { role: "heading", name: "Occupancy", card: true }] },
    { path: "/", as: "admin", boxes: [{ role: "heading", name: "Today", card: true }, { role: "heading", name: "Recent activity" }] },
    { path: "/", as: "admin", boxes: [{ role: "button", name: "New booking" }, { role: "button", name: "Export CSV" }] },
    { path: "/", as: "admin", boxes: [{ css: "#global-search" }, { role: "button", name: "Notifications", exact: false }, { role: "button", name: "Keyboard shortcuts (?)" }] },
  ],
  "w.county": [
    { path: "/county", as: "admin", boxes: [{ role: "combobox", name: "Choose county" }] },
    { path: "/county", as: "admin", boxes: [{ role: "heading", name: "Cities in {name}", vars: { name: "San Francisco County" } }] },
    null,
  ],
  "w.city": [
    { path: "/city", as: "admin", boxes: [{ role: "combobox", name: "Choose city" }] },
    { path: "/city", as: "admin", boxes: [{ role: "heading", name: "Marinas in {name}", vars: { name: "San Francisco" } }] },
    { path: "/locations", as: "admin", actions: [{ click: { role: "tab", name: "Map" } }, { wait: 1200 }], boxes: [{ css: ".map-shell" }] },
  ],
  "w.marinas": [
    { path: "/marinas", as: "admin", boxes: [{ label: "Search by marina or city" }, { label: "Filter by city" }, { role: "button", name: "Map" }] },
    { path: "/marinas", as: "admin", actions: [{ click: { role: "button", name: "Add marina" } }], boxes: [{ label: "Marina name", inDialog: true }, { label: "Street address", inDialog: true }, { text: "Location on the map", inDialog: true }, { role: "button", name: "Add marina", inDialog: true }] },
    { path: "/marinas", as: "admin", boxes: [{ role: "button", name: "Edit {name}", vars: GG }, { role: "button", name: "Delete {name}", vars: GG }] },
  ],
  "w.marina": [
    { path: "/marinas/m-gg", as: "admin", boxes: [{ text: "Berths occupied", card: true }, { role: "heading", name: "Details" }] },
    { path: "/marinas/m-gg", as: "admin", boxes: [{ role: "button", name: "Edit" }, { role: "button", name: "New booking" }] },
  ],
  "w.berths": [
    { path: "/berths", as: "admin", boxes: [{ role: "tab", name: "List" }, { role: "tab", name: "Dock map" }, { role: "tab", name: "Meters" }, { label: "Search berth, boat or marina" }] },
    { path: "/berths", as: "admin", actions: [{ click: { role: "button", name: "Add berth" } }], boxes: [{ label: "Berth number", inDialog: true }, { label: "Max boat length (ft)", inDialog: true }, { label: "Daily rate ($)", inDialog: true }, { label: "Monthly rate ($)", inDialog: true }] },
    { path: "/berths", as: "admin", boxes: [{ role: "button", name: "Mark {code} for maintenance", vars: { code: "A-01" } }, { role: "button", name: "Return {code} to service", vars: { code: "A-04" } }] },
    { path: "/berths", as: "admin", actions: [{ click: { role: "tab", name: "Meters" } }], boxes: [{ role: "button", name: "Record reading" }] },
    { path: "/berths", as: "admin", boxes: [{ role: "button", name: "QR labels" }] },
  ],
  "w.bookings": [
    { path: "/bookings", as: "admin", actions: [{ click: { role: "button", name: "New booking" } }], boxes: [{ role: "button", name: "Existing owner", inDialog: true }, { label: "Arrival", inDialog: true }, { label: "Departure", inDialog: true }, { label: "Status", inDialog: true }, { role: "button", name: "Confirm booking", inDialog: true }] },
    { path: "/bookings", as: "admin", boxes: [{ role: "tab", name: "All bookings" }, { role: "tab", name: "Today", exact: false }, { role: "tab", name: "Calendar" }, { role: "tab", name: "Conflicts", exact: false }, { role: "tab", name: "Waitlist", exact: false }] },
    { path: "/bookings", as: "admin", actions: [{ click: firstRow }], boxes: [{ role: "button", name: "Change dates or berth", inDialog: true }, { role: "button", name: "Email details to owner", inDialog: true }] },
    { path: "/bookings?status=pending", as: "admin", boxes: [{ role: "button", name: "Approve all", exact: false }] },
    { path: "/bookings?view=waitlist", as: "admin", boxes: [{ role: "button", name: "Add to waitlist" }] },
    { path: "/bookings", as: "admin", boxes: [{ role: "button", name: "Export CSV" }] },
  ],
  "w.contracts": [
    { path: "/contracts", as: "admin", actions: [{ click: { role: "button", name: "New contract" } }], boxes: [{ label: "Boat owner", inDialog: true }, { label: "Term", inDialog: true }, { label: "Starts", inDialog: true }, { label: "Monthly fee", inDialog: true }, { role: "button", name: "Create contract", inDialog: true }] },
    { path: "/contracts", as: "admin", boxes: [{ role: "button", name: "Renew" }, { role: "button", name: "Don't renew" }] },
    { path: "/contracts", as: "admin", boxes: [{ text: "Active contracts", card: true }, { text: "Not signed yet" }] },
  ],
  "w.locations": [
    { path: "/locations", as: "admin", boxes: [{ role: "tab", name: "Counties", exact: false }, { role: "tab", name: "Cities", exact: false }, { role: "tab", name: "Map" }] },
    { path: "/locations", as: "admin", actions: [{ click: { role: "button", name: "Add location" } }], boxes: [{ label: "Type", inDialog: true }, { label: "County name", inDialog: true }, { label: "State", inDialog: true }, { role: "button", name: "Add {kind}", vars: { kind: "county" }, translateVars: true, inDialog: true }] },
    null,
  ],
  "w.staff": [
    { path: "/staff", as: "admin", boxes: [{ label: "Search by name, email or role" }, { role: "button", name: "Add staff member" }] },
    { path: "/staff", as: "admin", actions: [{ click: { role: "tab", name: "Weekly schedule" } }], boxes: [{ role: "tab", name: "Weekly schedule" }, { role: "tab", name: "Shift coverage" }, { role: "button", name: "Next" }] },
    { path: "/staff", as: "admin", actions: [{ click: { role: "tab", name: "Requests", exact: false } }], boxes: [{ role: "button", name: "Approve" }, { role: "button", name: "Decline" }] },
    { path: "/staff", as: "admin", actions: [{ click: { role: "tab", name: "Hours" } }], boxes: [{ role: "button", name: "Payroll CSV" }, { role: "button", name: "Excel" }] },
    { path: "/staff", as: "admin", actions: [{ click: { role: "tab", name: "Messages" } }], boxes: [{ role: "button", name: "Send" }] },
  ],
  "w.maintenance": [
    { path: "/maintenance", as: "admin", actions: [{ click: { role: "button", name: "New work order" } }], boxes: [{ label: "Work needed", inDialog: true }, { label: "Assign to", inDialog: true }, { label: "Due date", inDialog: true }, { label: "Priority", inDialog: true }] },
    { path: "/maintenance", as: "admin", boxes: [{ role: "heading", name: "Recurring jobs" }, { role: "button", name: "New recurring job" }] },
    { path: "/maintenance", as: "admin", boxes: [{ role: "heading", name: "Parts & supplies" }, { role: "button", name: "Restock" }, { role: "button", name: "Add item" }] },
  ],
  "w.incidents": [
    { path: "/incidents", as: "admin", boxes: [{ label: "Search incidents" }, { label: "Show" }, firstRow] },
    { path: "/incidents", as: "admin", actions: [{ click: firstRow }], boxes: [{ role: "button", name: "Close incident", inDialog: true }, { role: "button", name: "Add note", inDialog: true }] },
  ],
  "w.people": [
    { path: "/users", as: "admin", boxes: [{ label: "Search owners, emails or boat names" }, { role: "button", name: "Add boat owner" }, { role: "button", name: "View" }] },
    { path: "/users", as: "admin", actions: [{ click: { role: "tab", name: "System users", exact: false } }], boxes: [{ role: "button", name: "Invite user" }] },
  ],
  "w.billing": [
    { path: "/billing", as: "admin", boxes: [{ text: "Outstanding", card: true }, { text: "Overdue", card: true }] },
    { path: "/billing", as: "admin", boxes: [{ label: "Search invoice, booking or owner" }, { label: "Filter by marina" }, { label: "Filter by status" }] },
    { path: "/billing", as: "admin", actions: [{ click: firstRow }, { click: { role: "button", name: "Record payment", inDialog: true } }], boxes: [{ label: "Amount", inDialog: true }, { label: "Paid on", inDialog: true }, { label: "Method", inDialog: true }] },
    { path: "/billing", as: "admin", actions: [{ click: firstRow }], boxes: [{ role: "button", name: "Send reminder", inDialog: true }, { role: "button", name: "Print", inDialog: true }, { role: "button", name: "Void", inDialog: true }] },
  ],
  "w.reports": [
    { path: "/reports", as: "admin", boxes: [{ label: "Report" }, { label: "Month" }, { role: "button", name: "CSV" }, { role: "button", name: "Excel" }, { role: "button", name: "Download PDF" }] },
    { path: "/reports", as: "admin", boxes: [{ role: "button", name: "Export all data (Excel)" }] },
    { path: "/reports", as: "admin", boxes: [{ role: "button", name: "Schedule a report" }] },
  ],
  "w.analytics": [
    { path: "/analytics", as: "admin", boxes: [{ text: "Average stay", card: true }, { text: "Cancellation rate", card: true }, { role: "heading", name: "Revenue by marina" }] },
    { path: "/analytics", as: "admin", boxes: [{ label: "Filter by marina" }] },
  ],
  "w.access": [
    { path: "/access", as: "admin", boxes: [{ text: "Runs one or more marinas day to day.", card: true }] },
    { path: "/access", as: "admin", boxes: [{ css: "main select", nth: 6 }, { css: "main select", nth: 7 }] },
    { path: "/access", as: "admin", boxes: [{ label: "Search by person or action" }] },
  ],
  "w.settings": [
    { path: "/settings", as: "admin", boxes: [{ role: "heading", name: "Your profile", card: true }, { role: "heading", name: "Notifications", card: true }] },
    { path: "/settings", as: "admin", boxes: [{ role: "heading", name: "Company defaults", card: true }] },
    { path: "/settings", as: "admin", boxes: [{ label: "Weekend surcharge (%)" }, { label: "Long-stay discount (%)" }, { role: "button", name: "Add season" }, { role: "button", name: "Save pricing" }] },
    { path: "/settings", as: "admin", boxes: [{ role: "heading", name: "Branding", card: true }] },
    { path: "/settings", as: "admin", boxes: [{ role: "button", name: "Reset demo data" }] },
  ],

  // ---- Public website ----------------------------------------------------------------------------
  "s.home": [
    { path: "/", as: "visitor", boxes: [{ label: "Marina" }, { label: "Arrive" }, { label: "date|Leave" }, { label: "Boat length (ft)" }, { role: "button", name: "Search" }] },
    { path: "/", as: "visitor", boxes: [{ css: ".map-shell" }] },
    { path: "/", as: "visitor", boxes: [{ role: "button", name: "Language" }, { role: "button", name: "Dark mode" }, { css: "header a[href='/sign-in']" }, { css: "header a[href='/book']" }] },
  ],
  "s.marinas": [
    { path: "/marinas", as: "visitor", boxes: [{ role: "group", name: "State" }, { css: "main a[href^='/marinas/']" }] },
    { path: "/marinas", as: "visitor", boxes: [{ css: ".map-shell" }] },
  ],
  "s.marina": [
    { path: "/marinas/m-gg", as: "visitor", boxes: [{ label: "Arrive" }, { label: "date|Leave" }, { label: "Boat length (ft)" }, { role: "button", name: "Search" }] },
    { path: "/marinas/m-gg", as: "visitor", boxes: [{ css: "main table" }] },
    { path: "/marinas/m-gg", as: "visitor", boxes: [{ role: "heading", name: "Dock office", card: true }, { role: "link", name: "Directions" }] },
  ],
  "s.pricing": [
    { path: "/pricing", as: "visitor", boxes: [{ css: "main table" }] },
    { path: "/pricing", as: "visitor", boxes: [{ role: "heading", name: "Estimate a stay", card: true }] },
    { path: "/pricing", as: "visitor", boxes: [{ role: "heading", name: "How the price is worked out", card: true }] },
    { path: "/pricing", as: "visitor", boxes: [{ role: "heading", name: "Berth contracts", up: 1 }] },
  ],
  "s.contact": [
    { path: "/contact", as: "visitor", boxes: [{ label: "Your name" }, { label: "Email" }, { label: "It's about" }, { label: "Message" }, { role: "button", name: "Send message" }] },
    { path: "/contact", as: "visitor", boxes: [{ role: "heading", name: "Dock offices", card: true }] },
    null,
  ],
  "s.book": [
    { path: "/book?start=2027-03-10&end=2027-03-13&length=34", as: "visitor", boxes: [{ css: "form[role=search]" }, { css: "main ul li" }] },
    { path: "/book?start=2027-03-10&end=2027-03-13&length=34", as: "visitor", boxes: [{ role: "link", name: "Book" }] },
    { path: "/book?start=2027-03-10&end=2027-03-13&length=150", as: "visitor", boxes: [{ role: "button", name: "Join the waitlist" }] },
    null,
  ],
  "s.checkout": [
    { path: "/book?start=2027-03-10&end=2027-03-13&length=30", as: "owner", actions: [{ click: { role: "link", name: "Book" } }, { wait: 800 }], boxes: [{ css: "[role=radiogroup]" }, { label: "People on board" }, { role: "checkbox" }, { role: "button", name: "Send booking request" }] },
    { path: "/book?start=2027-03-10&end=2027-03-13&length=30", as: "owner", actions: [{ click: { role: "link", name: "Book" } }, { wait: 800 }], boxes: [{ text: "Total", card: true }] },
    null,
  ],
  "s.signin": [
    { path: "/sign-in", as: "visitor", boxes: [{ label: "Email" }, { label: "Password" }, { role: "button", name: "Sign in" }] },
    { path: "/register", as: "visitor", boxes: [{ label: "Full name" }, { label: "Email" }, { label: "Phone" }, { label: "Password" }, { role: "button", name: "Create account" }] },
    { path: "/forgot-password", as: "visitor", boxes: [{ label: "Email" }, { role: "button", name: "Send reset link" }] },
    null,
  ],
  "s.account": [
    { path: "/account", as: "owner", boxes: [{ text: "Staying now", card: true }, { text: "To pay", card: true }, { role: "heading", name: "Recent bookings", card: true }] },
    { path: "/account", as: "owner", boxes: [{ css: "main nav" }] },
  ],
  "s.bookings": [
    { path: "/account/bookings", as: "owner", boxes: [{ role: "tab", name: "Upcoming", exact: false }, { role: "tab", name: "Past", exact: false }, { role: "tab", name: "Cancelled", exact: false }, { css: "main ul li" }] },
    { path: "/account/bookings", as: "owner", boxes: [{ css: "main ul li" }] },
    { path: "/account/bookings", as: "owner", boxes: [{ css: "main a[href='/book']" }] },
  ],
  "s.invoices": [
    { path: "/account/invoices", as: "owner", boxes: [{ css: "main a[href^='/account/invoices/']" }] },
    null,
  ],
  "s.invoice": [
    { path: "/account/invoices", as: "owner", actions: [{ click: { text: "Due" } }, { wait: 800 }], boxes: [{ css: ".print-area" }] },
    { path: "/account/invoices", as: "owner", actions: [{ click: { text: "Due" } }, { wait: 800 }, { click: { role: "button", name: "Pay {amount}", vars: { amount: "" }, exact: false } }], boxes: [{ label: "Amount", inDialog: true }, { role: "button", name: "Pay {amount}", vars: { amount: "" }, exact: false, inDialog: true }] },
    { path: "/account/invoices", as: "owner", actions: [{ click: { text: "Due" } }, { wait: 800 }], boxes: [{ role: "button", name: "Print invoice" }] },
  ],
  "s.contracts": [
    { path: "/account/contracts", as: "owner", boxes: [{ css: "main ul li" }] },
    { path: "/account/contracts", as: "owner", actions: [{ click: { role: "button", name: "Read and sign" } }], boxes: [{ label: "Type your full name to sign", inDialog: true }, { role: "checkbox", inDialog: true }, { role: "button", name: "Sign contract", inDialog: true }] },
  ],
  "s.boats": [
    { path: "/account/boats", as: "owner", actions: [{ click: { role: "button", name: "Add a boat" } }], boxes: [{ label: "Boat name", inDialog: true }, { label: "Type", inDialog: true }, { label: "Length (ft)", inDialog: true }, { label: "Registration", inDialog: true }, { role: "button", name: "Add boat", inDialog: true }] },
    { path: "/account/boats", as: "owner", boxes: [{ role: "button", name: "Edit" }] },
  ],
  "s.profile": [
    { path: "/account/profile", as: "owner", boxes: [{ label: "Full name" }, { label: "Phone" }, { role: "button", name: "Save changes" }] },
    { path: "/account/profile", as: "owner", boxes: [{ role: "heading", name: "Password", card: true }] },
  ],

  // ---- Phone app ---------------------------------------------------------------------------------
  "m.login": [
    { path: "/login", as: "visitor", boxes: [{ placeholder: "you@company.com" }, { label: "Password", exact: false }, { role: "button", name: "Sign in" }] },
    { path: "/login", as: "visitor", boxes: [{ role: "button", name: "Forgot password?" }] },
    null,
  ],
  "m.overview": [
    { path: "/", as: "admin", boxes: [{ text: "Occupancy today", up: 1 }, { text: "Revenue this month", up: 1 }] },
    { path: "/", as: "admin", boxes: [{ text: "Needs attention" }] },
    { path: "/", as: "admin", boxes: [{ text: "Quick actions" }] },
    { path: "/", as: "admin", boxes: [{ role: "button", name: "Showing {label}. Change marina", vars: { label: "All marinas" }, translateVars: true }] },
  ],
  "m.today": [
    { path: "/", as: "staff", boxes: [{ role: "button", name: "Clock in" }, { role: "button", name: "Leave a note" }] },
    { path: "/", as: "staff", boxes: [{ text: "Arriving today" }] },
    { path: "/", as: "staff", boxes: [{ role: "button", name: "Report an incident" }, { role: "button", name: "Dock patrol", exact: false }] },
  ],
  "m.approvals": [
    { path: "/approvals", as: "admin", boxes: [{ role: "button", name: "Approve all" }, { role: "button", name: "Approve" }, { role: "button", name: "Decline" }] },
    { path: "/approvals", as: "admin", boxes: [{ text: "Staff requests" }] },
  ],
  "m.bookings": [
    { path: "/bookings", as: "staff", boxes: [{ placeholder: "Boat, owner, berth or code" }, { role: "tab", name: "Upcoming", exact: false }, { role: "tab", name: "In marina", exact: false }] },
    { path: "/bookings", as: "staff", actions: [{ click: phoneRow }, { wait: 800 }], boxes: [{ role: "button", name: "Call" }, { role: "button", name: "Extend or move" }, { role: "button", name: "Add service" }] },
    { path: "/bookings", as: "staff", actions: [{ click: phoneRow }, { wait: 800 }], boxes: [{ role: "button", name: "Take payment" }] },
    { path: "/bookings", as: "staff", boxes: [{ role: "button", name: "New booking" }] },
  ],
  "m.berths": [
    { path: "/berths", as: "staff", boxes: [{ role: "button", name: "Berth {code}", vars: { code: "A-01" }, exact: false }, { role: "button", name: "Berth {code}", vars: { code: "A-04" }, exact: false }] },
    { path: "/berths", as: "staff", actions: [{ click: { role: "button", name: "Berth {code}", vars: { code: "A-01" }, exact: false } }, { wait: 800 }], boxes: [{ inDialog: true, role: "button", name: "Close" }] },
  ],
  "m.berth": [
    { path: "/berths", as: "staff", actions: [{ click: { role: "button", name: "Berth {code}", vars: { code: "A-01" }, exact: false } }, { wait: 800 }], boxes: [{ text: "Boat here now" }] },
    { path: "/berths", as: "staff", actions: [{ click: { role: "button", name: "Berth {code}", vars: { code: "A-01" }, exact: false } }, { wait: 800 }], boxes: [{ role: "button", name: "Report", inDialog: true }, { role: "button", name: "Out of service", inDialog: true }] },
    null,
  ],
  "m.tasks": [
    { path: "/tasks", as: "staff", boxes: [{ role: "tab", name: "Mine", exact: false }, { role: "tab", name: "Open", exact: false }, { role: "tab", name: "Done", exact: false }] },
    { path: "/tasks", as: "staff", actions: [{ click: phoneRow }, { wait: 800 }], boxes: [{ role: "button", name: "Add update" }, { role: "button", name: "Mark as done" }] },
    { path: "/tasks", as: "staff", boxes: [{ role: "button", name: "Report" }] },
  ],
  "m.team": [
    { path: "/team", as: "admin", boxes: [{ text: "On the clock" }] },
    { path: "/team", as: "admin", actions: [{ click: { role: "tab", name: "Week" } }], boxes: [{ role: "button", name: "Find cover" }] },
    { path: "/team", as: "admin", actions: [{ click: { role: "tab", name: "Chat" } }], boxes: [{ role: "button", name: "Message everyone" }] },
  ],
  "m.me": [
    { path: "/me", as: "staff", boxes: [{ text: "My week" }] },
    { path: "/me", as: "staff", boxes: [{ role: "button", name: "Request" }] },
    { path: "/me", as: "staff", actions: [{ scroll: { role: "button", name: "Sign out" } }], boxes: [{ role: "button", name: "Edit profile" }, { role: "button", name: "Change password" }, { role: "button", name: "Sign out" }] },
  ],
  "m.scan": [
    { path: "/", as: "staff", boxes: [{ role: "button", name: "Scan berth QR code" }] },
    { path: "/scan", as: "staff", boxes: [{ placeholder: "e.g. A-04" }, { role: "button", name: "Open" }] },
    null,
  ],
  "m.patrol": [
    { path: "/patrol", as: "staff", boxes: [{ role: "button", name: "Start patrol" }] },
    { path: "/patrol", as: "staff", boxes: [{ text: "Recent rounds" }] },
  ],
  "m.report": [
    { path: "/report", as: "admin", boxes: [{ text: "Boats" }, { text: "Money" }] },
    { path: "/report", as: "admin", boxes: [{ role: "tab", name: "Yesterday" }] },
  ],
  "m.owners": [
    { path: "/owners", as: "admin", boxes: [{ placeholder: "Name, phone, email, boat or registration" }] },
    { path: "/owners", as: "admin", boxes: [{ role: "button", nth: 1 }] },
  ],
  "m.invoices": [
    { path: "/invoices", as: "admin", boxes: [{ role: "tab", name: "Overdue", exact: false }, { role: "tab", name: "Due", exact: false }, { role: "tab", name: "Paid", exact: false }] },
    { path: "/invoices", as: "admin", boxes: [{ role: "button", name: "Remind", exact: false }, { role: "button", name: "Remind", nth: 0 }] },
  ],
  "m.inbox": [
    { path: "/inbox", as: "staff", boxes: [{ role: "button", nth: 2 }] },
    { path: "/inbox", as: "staff", boxes: [{ role: "button", name: "Mark all read" }] },
  ],
  "m.chat": [
    { path: "/chat", as: "staff", boxes: [{ placeholder: "Message" }] },
    { path: "/chat", as: "admin", boxes: [{ text: "Choose someone to message" }] },
    { path: "/chat", as: "staff", boxes: [{ placeholder: "Message" }, { role: "button", name: "Send" }] },
  ],
  "m.activity": [
    { path: "/activity", as: "admin", boxes: [{ placeholder: "Search activity" }] },
  ],
  "m.compare": [
    { path: "/compare", as: "admin", boxes: [{ text: "Choose 2 or 3" }, { text: "Green marks the best value in each row." }] },
  ],
  "m.revenue": [
    { path: "/revenue", as: "admin", actions: [{ click: { text: "San Francisco County" } }], boxes: [{ role: "button", name: "All" }, { text: "By city" }] },
    null,
  ],
  "m.marina": [
    { path: "/marina/m-gg", as: "admin", boxes: [{ text: "Occupancy today", up: 1 }, { text: "Berths" }] },
    { path: "/marina/m-gg", as: "admin", actions: [{ scroll: { role: "button", name: "Show this marina in the app" } }], boxes: [{ role: "button", name: "Call marina" }, { role: "button", name: "Show this marina in the app" }, { role: "button", name: "Close to new bookings" }] },
  ],
};
