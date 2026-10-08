import type { Guide } from "../types";

// Admin web app (apps/web), for company admins and marina managers.
export const web: Record<string, Guide> = {
  "w.login": {
    title: "Signing in",
    summary: "Sign in to the Marina web app to run your marinas, berths, bookings, staff and billing.",
    who: "Company admins and marina managers. Dock staff use the Marina phone app instead.",
    sections: [
      {
        heading: "Sign in",
        steps: [
          "Enter your work email and password.",
          "Tick Remember me on your own computer to stay signed in. Leave it off on a shared computer.",
          "Select Sign in. You go to the page you were trying to open, or to the Overview.",
        ],
        points: ["Use the eye button to show or hide the password while you type.", "If you see “That email and password don't match”, check for typing mistakes and try again."],
      },
      {
        heading: "Forgot your password",
        steps: ["Select Forgot password? under the password box.", "Enter your work email and select Send reset link.", "Open the email and follow the link within 30 minutes to choose a new password."],
      },
      {
        heading: "Create an account",
        text: "Select Create an account to try the full dashboard with sample data. Enter your name, work email, company (optional) and a password of at least 8 characters. Your account and any changes you make are kept in this browser.",
      },
      {
        heading: "Good to know",
        points: [
          "Staff who sign in here are asked to use the phone app, which is built for work on the docks.",
          "What you can see depends on your role. Admins see every marina; managers see only their own marinas.",
          "Change the language with the language button at the top of the app after signing in.",
        ],
      },
    ],
  },

  "w.overview": {
    title: "Global Overview",
    summary: "One page with the health of every marina you manage: how full they are, money booked this month, and what needs your attention today.",
    who: "Admins (all marinas) and managers (their own marinas).",
    sections: [
      {
        heading: "The numbers at the top",
        points: [
          "Marinas: how many marinas you can see.",
          "Berths occupied today: berths with a confirmed or checked-in boat today, out of all berths. The small line shows free, reserved and in-repair berths.",
          "Revenue booked this month: the price of every confirmed, checked-in or completed stay, counted only for the nights that fall in this month.",
          "Occupancy rate: occupied berths today divided by all berths, compared with 30 days ago.",
          "Hover or tap the ⓘ next to a number to see exactly how it's worked out.",
        ],
      },
      {
        heading: "Charts and rankings",
        points: [
          "Revenue shows the last months; the current month includes confirmed stays later in the month.",
          "Occupancy shows booked berth-nights over the same months.",
          "Berths today is a ring of occupied, reserved, free and in-repair berths. Select View all to open Berths.",
          "Marinas are ranked by revenue booked this month. Select a marina to open its page.",
        ],
      },
      {
        heading: "Today and what needs attention",
        points: [
          "Today lists arrivals, departures, bookings awaiting approval and open work orders. Each one opens the matching filtered list.",
          "What needs attention collects things to act on, such as bookings to approve, overdue invoices and urgent repairs.",
          "Recent activity shows the latest changes. Select Audit log for the full history.",
        ],
      },
      {
        heading: "Things you can do here",
        steps: [
          "Select New booking to book a berth (keyboard: N).",
          "Select Add marina to create a marina (admins).",
          "Select Export CSV or Download monthly report for a spreadsheet of revenue, occupancy and berths for every marina.",
          "Select View reports to open Reports.",
        ],
      },
      {
        heading: "Tips",
        points: [
          "Use the search box (press /) to find marinas, bookings, owners and staff, and the bell for notifications, at the top of every page.",
          "Press ? to see all keyboard shortcuts, such as G then B for Bookings.",
          "After most actions a message appears with Undo, in case you change your mind.",
        ],
      },
    ],
  },

  "w.county": {
    title: "County dashboard",
    summary: "The same figures as the Global Overview, for one county and the cities and marinas in it.",
    who: "Admins, and managers whose marinas are in more than one place.",
    sections: [
      {
        heading: "Choose a county",
        steps: ["Use Choose county at the top to switch counties.", "The figures, charts and lists below update for that county only."],
      },
      {
        heading: "What you see",
        points: [
          "Berths occupied today, revenue booked this month and occupancy rate for the county.",
          "Cities in the county with their figures. Select a city to open its City dashboard.",
          "Marinas in the county ranked by revenue this month. Select one to open its page.",
          "Revenue and occupancy charts for the last months.",
        ],
      },
      {
        heading: "Good to know",
        points: ["If you see “You don't have access to any county yet”, ask an admin to assign you marinas.", "Managers assigned to a single marina don't see this page; their Overview already shows that marina."],
      },
    ],
  },

  "w.city": {
    title: "City dashboard",
    summary: "Figures for one city: its marinas, how full they are and the money booked this month.",
    who: "Admins and managers with marinas in that city.",
    sections: [
      {
        heading: "Choose a city",
        steps: ["Use Choose city at the top to switch cities.", "Everything below shows that city only."],
      },
      {
        heading: "What you see",
        points: [
          "Berths occupied today, revenue booked this month and occupancy rate.",
          "Marinas in the city ranked by revenue. Select a marina to open its page.",
          "Revenue and occupancy for the last months, and today's arrivals, departures and approvals.",
        ],
      },
      { heading: "Tip", text: "From the Locations map, select a marina pin and then Open city dashboard to come straight here." },
    ],
  },

  "w.marinas": {
    title: "Marinas",
    summary: "Every marina you manage, as a list or on a street map, with today's occupancy and this month's revenue.",
    who: "Admins add and delete marinas; managers can view and edit their own.",
    sections: [
      {
        heading: "Find a marina",
        points: [
          "Search by marina or city, or filter by city.",
          "Switch between List and Map. On the map, nearby marinas are grouped into a numbered pin; select it to zoom in.",
          "Select a pin to see occupancy and revenue, then the marina's name to open it.",
          "Sort the list by name, location, occupancy or revenue by selecting a column heading.",
        ],
      },
      {
        heading: "Add a marina (admins)",
        steps: [
          "Select Add marina.",
          "Enter the name, city, status, street address, phone and office email.",
          "Set the location: click the map where the marina is, or type latitude and longitude. Leave it empty to use the city's centre.",
          "Choose the amenities, then select Add marina.",
        ],
      },
      {
        heading: "Edit or close a marina",
        points: [
          "Select the pencil to edit details, amenities or the position on the map.",
          "Admins can delete a marina with no berths. A marina with berths is set to Inactive instead, so its history is kept.",
          "An inactive marina doesn't take new bookings; boats already booked can still arrive.",
        ],
      },
    ],
  },

  "w.marina": {
    title: "Marina page",
    summary: "Everything about one marina: today's numbers, berths, bookings, staff, contact details and its location.",
    who: "Admins and the marina's managers.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Berths occupied, occupancy rate, revenue this month and bookings awaiting approval. Each card opens the matching list.",
          "Details: address, phone, email, amenities and status, with a map and Directions (opens Google Maps).",
          "Revenue for the last months, upcoming and current bookings, and the staff who work here with their shifts.",
          "Berth status: select any berth to see who's in it and what's booked next.",
        ],
      },
      {
        heading: "Things you can do",
        steps: ["Select Edit to change the details or the marina's position.", "Select New booking to book a berth at this marina.", "Select a booking to open it."],
      },
    ],
  },

  "w.berths": {
    title: "Berths & Slips",
    summary: "All dock spaces with their size, type, prices and today's status, plus a dock map, meter readings and printable QR labels.",
    who: "Admins and managers. Staff with View only can look but not change.",
    sections: [
      {
        heading: "The three views",
        points: [
          "List: every berth with size and type, status, pricing and the current or next boat. Search by berth, boat or marina and filter by marina or status.",
          "Dock map: berths drawn by dock, coloured by status. Select a berth to open it.",
          "Meters: power and water readings for berths with meters.",
        ],
      },
      {
        heading: "Add or edit a berth",
        steps: [
          "Select Add berth (or the pencil on a berth).",
          "Choose the marina and enter the berth number as dock letter and number, for example A-12.",
          "Enter the longest boat it takes, the type (floating, fixed or mooring), the daily rate and the monthly rate (used for stays of 28 nights or more).",
          "Tick shore power and fresh water if the berth has them, then save.",
        ],
      },
      {
        heading: "Take a berth out of service",
        points: [
          "Select the wrench to mark a berth for maintenance; select it again to return it to service.",
          "An occupied berth can't be taken out of service: move the boat first.",
          "A berth with booking history can't be deleted. Take it out of service instead.",
        ],
      },
      {
        heading: "Meter readings",
        steps: [
          "Open Meters and select Record reading on a berth.",
          "Type the number shown on the power and/or water meter.",
          "Save. Usage since the last reading is added to the invoice of the boat in the berth, at the rates in Settings › Pricing. With no boat in the berth, the reading just sets the starting point.",
        ],
      },
      {
        heading: "QR labels",
        text: "Select QR labels, choose a marina and print. Fix one label to each berth post. Staff scan it with the Marina phone app to open that berth straight away.",
      },
    ],
  },

  "w.bookings": {
    title: "Bookings",
    summary: "Every reservation: make new bookings, approve requests, check boats in and out, see the calendar, fix clashes and manage the waitlist.",
    who: "Admins and managers. Online bookings from the public website arrive here as requests.",
    sections: [
      {
        heading: "Make a booking",
        steps: [
          "Select New booking (or press N anywhere).",
          "Boat owner: search for an existing owner, or choose New owner and enter their name, email and boat.",
          "Stay: pick arrival and departure dates and the number of guests.",
          "Berth: only berths that are free for the whole stay and big enough for the boat are offered, with the price.",
          "Choose the status: Confirmed (send invoice), or Pending approval to decide later. Then select Confirm booking (or Save as pending).",
        ],
      },
      {
        heading: "The tabs",
        points: [
          "All bookings: search by booking, boat, owner or berth; filter by marina, status and date.",
          "Today: arrivals and departures for today, with Check in and Check out.",
          "Calendar: each day's arrivals, departures and boats in the marina. Use the arrows to change month.",
          "Conflicts: double bookings and bookings on berths that are out of service, with Move booking or Resolve.",
          "Waitlist: people waiting for a berth at a full marina.",
        ],
      },
      {
        heading: "Work with a booking",
        steps: [
          "Select a booking to open its details: owner, boat, berth, dates, price and invoice.",
          "Approve a pending booking: it's confirmed and the invoice is created.",
          "Check in when the boat arrives and Check out when it leaves.",
          "Change dates or berth: pick new dates or a free berth. An unpaid invoice is updated to the new price; a paid one stays as it is, so adjust any difference in Billing.",
          "Email details to owner sends the booking details. Cancel booking frees the berth and voids any unpaid invoice.",
        ],
      },
      {
        heading: "Approve many at once",
        text: "When bookings are waiting, a bar shows how many. Select Approve all, check the count and confirm. Each one is confirmed and invoiced, and you can undo straight after.",
      },
      {
        heading: "Waitlist",
        points: [
          "Select Add to waitlist to note someone who wants a berth at a full marina, with their boat length and dates.",
          "When a berth that fits frees up, it's shown next to the entry. Select Offer to record that you offered it, or Book to book it straight away.",
          "Requests made on the public website appear here too.",
        ],
      },
      {
        heading: "Tips",
        points: ["Export CSV downloads the bookings in the current view.", "Prices are worked out with the pricing rules in Settings › Pricing at the time of booking."],
      },
    ],
  },

  "w.contracts": {
    title: "Contracts",
    summary: "Long-term berth agreements (monthly, seasonal or annual): who holds which berth, until when, and which ones are coming up for renewal.",
    who: "Admins and managers.",
    sections: [
      {
        heading: "Create a contract",
        steps: [
          "Select New contract.",
          "Choose the boat owner and boat, the marina and the term: monthly, seasonal (6 months, 5% off) or annual (12 months, 10% off).",
          "Pick the start date. Only berths free for the whole term that fit the boat are offered.",
          "Check the suggested monthly fee, choose whether it renews automatically, and select Create contract.",
          "The berth is held for the whole term and the term is invoiced up front.",
        ],
      },
      {
        heading: "Renewals",
        points: [
          "Contracts are flagged a week before the end (monthly), a month before (seasonal) or two months before (annual).",
          "Select Renew to extend for the same term; it's invoiced right away. If the berth is booked during the next term, move that booking first.",
          "Select Don't renew to let it end; the berth goes back on sale after the last day. Let the owner know.",
        ],
      },
      {
        heading: "What the list shows",
        points: [
          "Status: Auto-renews, Fixed term, Renews in / Ends in (when it's up for renewal), Renewed or Ended.",
          "Whether the owner has signed: owners sign online in their account on the public website.",
          "The numbers at the top: active contracts, contract income a month, contracts up for renewal and berths coming back on sale.",
        ],
      },
    ],
  },

  "w.locations": {
    title: "Locations",
    summary: "The counties and cities your marinas belong to, with their figures and a map of every marina.",
    who: "Admins only.",
    sections: [
      {
        heading: "The tabs",
        points: [
          "Counties: each county with its state, cities, marinas, berths, occupancy and revenue this month.",
          "Cities: each city with its county and figures.",
          "Map: every marina on a street map. Select a pin to see that city's figures and Open city dashboard.",
        ],
      },
      {
        heading: "Add or change a location",
        steps: [
          "Select Add location and choose City or County.",
          "For a county, enter its name and state. For a city, enter its name, county, and the latitude and longitude of its centre.",
          "Save. Use the pencil to edit and the bin to delete.",
        ],
      },
      { heading: "Good to know", text: "A county with cities, or a city with marinas, can't be deleted. Move or remove what's in it first." },
    ],
  },

  "w.staff": {
    title: "Staff",
    summary: "Your team: who works where, the weekly schedule, shift coverage, time-off requests, hours and pay, and messages with staff.",
    who: "Admins and managers.",
    sections: [
      {
        heading: "Directory",
        points: [
          "Search by name, email or role and filter by marina. Each person shows their job, marina, shift and whether they're working today.",
          "Select Add staff member to add someone: name, job title, email, phone, marina, department, shift (Morning, Day, Evening or Night), status and regular days off.",
          "Use the pencil to edit and Remove to take someone off the list; their open work orders become unassigned.",
        ],
      },
      {
        heading: "Weekly schedule and coverage",
        points: [
          "Weekly schedule shows each person's shift for each day, including approved time off, swaps and cover. Move between weeks with Previous and Next.",
          "Shift coverage shows, for each marina and day, whether every shift has someone on it, and which shifts have nobody.",
        ],
      },
      {
        heading: "Requests",
        steps: ["Staff ask for time off and shift swaps from the phone app.", "Open Requests and select Approve or Decline.", "Approved requests update the schedule and the staff member sees the answer in their app."],
      },
      {
        heading: "Hours and pay",
        points: [
          "Hours shows each person's clock-ins by day, weekly totals and pay, with overtime after 40 hours at time and a half.",
          "Approve a timesheet once the week is over, or Approve all. A change after approval is flagged.",
          "Download Payroll CSV or Excel for your payroll provider.",
        ],
      },
      {
        heading: "Messages",
        text: "Read and reply to conversations from staff, or send an announcement to everyone. Staff see your messages in their app, and you can see when they've been read.",
      },
    ],
  },

  "w.maintenance": {
    title: "Maintenance",
    summary: "Work orders for berths, docks and facilities, routine jobs that repeat, and the parts and supplies in stock.",
    who: "Admins and managers. Staff work on jobs from the phone app.",
    sections: [
      {
        heading: "Work orders",
        steps: [
          "Select New work order. Describe the work, choose the marina and berth (or the whole marina), who it's assigned to, the due date and the priority.",
          "Tick Take this berth out of service if boats shouldn't use it until it's fixed.",
          "Open a work order to Start work, add notes, record parts used and Mark as done. Reopen it if needed.",
        ],
        points: ["Filter by status and priority. The numbers at the top show open, high-priority and overdue jobs, and berths out of service."],
      },
      {
        heading: "Recurring jobs",
        points: [
          "For routine work such as cleaning the pump-out station every week or inspecting pilings every month.",
          "Select New recurring job: what the job is, marina, berth or facility, how often (weekly, monthly or every 3 months), next due date, priority and who does it.",
          "Each work order is created a week before it's due. Pause a job to stop new work orders, and resume it later.",
        ],
      },
      {
        heading: "Parts & supplies",
        points: [
          "Every part with its stock, unit and cost. Items at or below their reorder level are flagged Low or Out.",
          "Select Restock and enter how many arrived. Select Add item for a new part.",
          "When parts are used on a work order, they're taken from stock automatically.",
        ],
      },
    ],
  },

  "w.incidents": {
    title: "Incidents",
    summary: "Damage, injuries, theft and spills reported by staff from the phone, and how each one was handled.",
    who: "Admins and managers.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Each incident with its type, marina and berth, when it happened, who reported it, the people involved and any photos.",
          "Serious incidents are marked. The numbers at the top show new, investigating and serious open incidents, and this month's total.",
          "Search and filter by marina and by Not closed, Closed or All.",
        ],
      },
      {
        heading: "Handle an incident",
        steps: [
          "Open the incident and select Start investigating.",
          "Add follow-up notes as you go, for example the insurer's claim number.",
          "Select Close incident and record the outcome, for example “Boards replaced, owner's insurer paid”.",
          "Reopen it if something new comes up.",
        ],
      },
    ],
  },

  "w.people": {
    title: "Boat Owners & Users",
    summary: "Your customers and their boats, and the people who can sign in to Marina.",
    who: "Admins see every owner and manage users. Managers see owners who booked at their marinas.",
    sections: [
      {
        heading: "Boat owners",
        points: [
          "Search by name, email or boat name. Each owner shows their contact details, customer since, and whether a boat is in the marina now.",
          "Select View to see their boats, bookings, lifetime value and balance owed.",
          "Select Add boat owner: name, email, phone and their first boat (name, type, length, registration).",
          "From an owner you can add a boat, edit their details or make a new booking.",
        ],
      },
      {
        heading: "System users (admins)",
        steps: [
          "Select Invite user. Enter their name and work email, choose the role (admin, manager or staff) and the marinas they can access.",
          "They get an email to set a password. Resend the invite if needed.",
          "Use the pencil to change role or marinas, and Disable to stop someone signing in. Re-enable them at any time.",
        ],
        points: ["See Access Control for what each role can do."],
      },
    ],
  },

  "w.billing": {
    title: "Billing & Invoicing",
    summary: "Invoices for every stay: what's outstanding or overdue, payments, reminders and printing.",
    who: "Admins and managers.",
    sections: [
      {
        heading: "How invoices are made",
        points: [
          "An invoice is created when a booking is confirmed, and is due after the number of days set in Settings.",
          "Fuel, pump-out, ice, laundry and metered power and water added by staff appear as extra lines.",
          "Owners can also pay online from their account on the public website.",
        ],
      },
      {
        heading: "Find invoices",
        text: "Search by invoice, booking or owner, and filter by marina and status. The numbers at the top show outstanding, overdue, collected this month and revenue booked this month.",
      },
      {
        heading: "Record a payment",
        steps: [
          "Open the invoice and select Record payment.",
          "Enter the amount (less than the balance records a part payment), the date and the method: card, bank transfer, cash or check.",
          "Save. The invoice is marked paid when payments add up to the total.",
        ],
      },
      {
        heading: "Reminders, printing and voiding",
        points: [
          "Send reminder emails the owner and saves the date on the invoice. When invoices are overdue, a bar lets you send all reminders at once.",
          "Print opens the invoice with your logo, colour and footer from Settings › Branding.",
          "Void cancels an invoice that shouldn't be paid. The booking itself isn't cancelled.",
          "Export CSV downloads the invoices in the current view.",
        ],
      },
    ],
  },

  "w.reports": {
    title: "Reports",
    summary: "Ready-made reports to preview and download, a full data export, and reports emailed on a schedule.",
    who: "Admins and managers (for their marinas).",
    sections: [
      {
        heading: "Download a report",
        steps: [
          "Choose a report: Marina performance, Bookings by status, Unpaid invoices, Top boat owners, or Fuel, services and utilities.",
          "Choose the month. The current month is marked “to date”.",
          "Check the preview, then select CSV, Excel or Download PDF.",
        ],
      },
      {
        heading: "Export all data",
        text: "Select Export all data (Excel) for one workbook with every marina, berth, booking, owner, invoice and more, one sheet each.",
      },
      {
        heading: "Scheduled emails",
        steps: ["Select Schedule a report.", "Choose the report, how often (daily, weekly or monthly) and who gets it (email addresses separated by commas).", "Save. Remove a schedule with the bin."],
        points: ["Schedules are saved now; emails start going out once Marina is connected to its server."],
      },
    ],
  },

  "w.analytics": {
    title: "Analytics",
    summary: "Trends over the last 12 months: revenue and occupancy by marina, how long people stay, how far ahead they book, and the kinds of boats.",
    who: "Admins and managers.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Average stay, average booking lead time (how far ahead of arrival people book), cancellation rate and average boat length.",
          "Revenue by marina and occupancy by marina over 12 months.",
          "Length of stay: how many bookings last a few nights, a week, a month and longer.",
          "Boat types: bookings per type of boat.",
        ],
      },
      { heading: "Filter", text: "Use the marina filter to look at one marina or all of them together." },
    ],
  },

  "w.access": {
    title: "Access Control",
    summary: "What each role can see and do, and a full log of every change made in the system.",
    who: "Admins only.",
    sections: [
      {
        heading: "Roles",
        points: [
          "Admin: runs the whole company, with full access to every marina, billing, users and settings. This can't be changed.",
          "Marina manager: runs one or more marinas day to day.",
          "Staff: day-to-day work at their marinas, from the phone app.",
        ],
      },
      {
        heading: "Permissions",
        steps: [
          "For each area (dashboards, marinas, berths, bookings, staff, maintenance, owners, billing, reports), choose what managers and staff get: Assigned marinas, View only or No access.",
          "Changes apply straight away. No access hides the page; View only hides create and edit actions.",
          "Select Reset to defaults to go back to the standard settings.",
        ],
      },
      {
        heading: "Audit log",
        text: "Every change, newest first: who did it and when. Search by person or action. Where an entry changed values, select “changes: before and after” to see each field's old and new value.",
      },
    ],
  },

  "w.settings": {
    title: "Settings",
    summary: "Your profile, notifications, company defaults, pricing rules and branding, and the demo data.",
    who: "Everyone has a profile and notifications. Company defaults, pricing and branding are for admins.",
    sections: [
      {
        heading: "Profile and notifications",
        points: [
          "Change your name. Ask an admin to change your sign-in email.",
          "Choose what shows in the bell and in emails: bookings needing approval, overdue invoices, high-priority work orders and a daily summary email at 7 am (with a preview).",
        ],
      },
      {
        heading: "Company defaults (admins)",
        points: [
          "Company name (on invoices), currency, time zone, how many days until an invoice is due, and from how many nights the monthly rate applies.",
        ],
      },
      {
        heading: "Pricing (admins)",
        steps: [
          "Set a weekend surcharge for Friday and Saturday nights and a long-stay discount from a number of nights.",
          "Add seasons with dates (MM-DD) and a rate change, for example Summer 06-15 to 09-15, +20%.",
          "Set electricity and water rates for meter readings.",
          "Check the preview and select Save pricing. New bookings use the new rules; existing bookings keep their price.",
        ],
      },
      {
        heading: "Branding (admins)",
        text: "Upload your logo (PNG, JPG, SVG or WebP, under 300 KB), pick a brand colour and write an invoice footer such as bank details. The preview shows how invoices, PDF reports and emails will look.",
      },
      {
        heading: "Demo data",
        text: "Your changes are kept in this browser until midnight, then fresh sample data is made. Select Reset demo data to start over now.",
      },
    ],
  },
};
