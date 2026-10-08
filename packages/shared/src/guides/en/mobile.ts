import type { Guide } from "../types";

// Marina phone app (apps/mobile), for staff, marina managers and admins.
export const mobile: Record<string, Guide> = {
  "m.login": {
    title: "Signing in",
    summary: "Sign in to the Marina app with your work email. What you see afterwards depends on your role.",
    who: "Dock staff, marina managers and admins.",
    sections: [
      {
        heading: "Sign in",
        steps: ["Enter your work email and password.", "Tap Sign in."],
        points: [
          "Staff get the Today, Bookings, Berths, Tasks and Me tabs.",
          "Managers and admins get Overview, Approvals, Bookings, Team and Me.",
        ],
      },
      {
        heading: "Forgot your password",
        text: "Tap Forgot password? Your marina manager resets staff passwords from the Marina web app.",
      },
      {
        heading: "Good to know",
        points: [
          "Turn on Face ID or fingerprint unlock in Me › Security so you don't type your password each time.",
          "The app works without a connection. Changes are saved on the phone and sent when you're back online.",
        ],
      },
    ],
  },

  "m.overview": {
    title: "Overview",
    summary: "How your marinas are doing right now, and what needs you.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "The numbers",
        points: [
          "Occupancy today: occupied berths out of all berths, and the change on 30 days ago.",
          "Revenue this month, compared with last month.",
          "Arriving and leaving today, and how many boats are in now.",
          "Staff on the clock, out of the team.",
        ],
      },
      {
        heading: "Needs attention",
        text: "Bookings waiting for approval, boats still checked in after their last night, boats on a berth that's out of service, open work orders and overdue invoices. Tap one to deal with it.",
      },
      {
        heading: "More on this screen",
        points: [
          "Revenue for the last 6 months. Tap it for revenue by county, city and marina.",
          "Every marina ranked by occupancy. Tap one to open it, or Compare to put 2 or 3 side by side.",
          "Quick actions: Berths, Repairs, Scan, Owners, Invoices and Day report.",
          "Recent activity, with See all for the full log.",
        ],
      },
      {
        heading: "Switch marina",
        text: "Tap the marina name at the top to choose one marina or All marinas. Every screen follows your choice.",
      },
    ],
  },

  "m.today": {
    title: "Today",
    summary: "Your shift, the boats arriving and leaving, and urgent repairs, all on one screen.",
    who: "Dock staff.",
    sections: [
      {
        heading: "Your shift",
        steps: [
          "The shift card shows today's shift, or that you're on leave, swapped or off.",
          "Tap Clock in when you start. The card shows how long you've been on the clock.",
          "Tap Clock out when you finish. You can leave a hand-over note for the next shift.",
        ],
        points: ["Notes from the last shift are shown here for 24 hours. Tap Leave a note to add one at any time."],
      },
      {
        heading: "Arrivals and departures",
        points: [
          "Arriving today: tap Berth ready to go through the berth check, then Check in when the boat arrives.",
          "At check-in you record the boat's condition, take photos and the owner signs on the screen.",
          "Leaving today: tap Check out when the boat leaves.",
          "Past departure date: boats still in after their last night. Check them out or ask the owner to extend.",
        ],
      },
      {
        heading: "Also here",
        points: [
          "Urgent repairs at your marina. Tap one to open it.",
          "Report an incident for damage, injuries, theft or spills.",
          "My tasks: work orders assigned to you.",
        ],
      },
    ],
  },

  "m.approvals": {
    title: "Approvals",
    summary: "Bookings and staff requests waiting for your yes or no.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "Bookings",
        steps: [
          "Each booking shows the boat, marina and berth, dates and price.",
          "Tap Approve to confirm it and create the invoice, or Decline.",
          "Tap Approve all to approve every booking at once. Bookings that clash with another booking are skipped. You can undo straight after.",
        ],
        points: ["Online bookings from the public website and phone bookings show up here."],
      },
      {
        heading: "Staff requests",
        steps: ["Time off and shift swaps sent from the app show up here.", "Tap Approve or Decline. The staff member sees your answer in their app, and the schedule updates."],
      },
    ],
  },

  "m.bookings": {
    title: "Bookings",
    summary: "Find any booking, check boats in and out, take payments and make new bookings.",
    who: "Dock staff, managers and admins.",
    sections: [
      {
        heading: "Find a booking",
        points: ["Search by boat, owner, berth or booking code.", "Switch between Today, Upcoming and In marina."],
      },
      {
        heading: "Open a booking",
        points: [
          "See the boat, dates, berth, owner and invoice. Tap Call or Email to reach the owner.",
          "Check in or Check out the boat.",
          "Extend or move: change the dates or move the boat to another free berth that fits.",
          "Add service: fuel, pump-out, ice or laundry, added to the invoice.",
          "Managers and admins can also approve, decline or cancel.",
        ],
      },
      {
        heading: "Take a payment",
        steps: [
          "Open the booking and tap Take payment.",
          "Choose the full balance, half, or type an amount.",
          "Choose how they paid: card (run it on the marina's card reader first), cash, check or bank transfer.",
          "Tap Record. The invoice shows what's still owed, or that it's paid.",
        ],
      },
      {
        heading: "Walk-ins and new bookings",
        steps: [
          "Tap New booking.",
          "Find the boat by name, registration or owner, or add a new boat with the owner's name and phone or email.",
          "Choose arriving today or a later day, the nights and guests.",
          "Pick a free berth that fits and tap Book. For a boat arriving now, check it in straight away.",
        ],
      },
    ],
  },

  "m.berths": {
    title: "Berths",
    summary: "A dock map of your marina, coloured by status.",
    who: "Dock staff, managers and admins.",
    sections: [
      {
        heading: "Read the map",
        points: [
          "Each berth shows its number and is coloured free, occupied, reserved or in repair.",
          "Use the filters at the top to show only one status, such as free berths.",
          "The line at the top counts free, occupied, reserved and in-repair berths.",
        ],
      },
      { heading: "Open a berth", text: "Tap a berth to see the boat in it, the next arrival, open repairs and its rates, and to act on it." },
    ],
  },

  "m.berth": {
    title: "Berth",
    summary: "One berth: the boat in it now, what's next, open repairs and actions.",
    who: "Dock staff, managers and admins.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Size, type, power and water, and whether the berth is in service.",
          "Boat here now, with the leaving date and owner. Tap it to open the booking.",
          "Next arrival and open repairs.",
        ],
      },
      {
        heading: "What you can do",
        points: [
          "Report a problem: say what's wrong, how urgent it is, add photos, and choose whether to take the berth out of service. It goes straight to work orders.",
          "Out of service / Back in service. A berth with a boat in it can't be taken out of service until the boat is moved.",
          "Read meters: type the power and water meter numbers. Usage is added to the boat's invoice.",
          "Move the boat in it to another berth.",
        ],
      },
      { heading: "Tip", text: "Scan the QR label on a berth post to open its page straight away." },
    ],
  },

  "m.tasks": {
    title: "Tasks",
    summary: "Work orders: what's yours, what's open and what's done.",
    who: "Dock staff, managers and admins.",
    sections: [
      {
        heading: "The lists",
        points: [
          "Mine: work orders assigned to you. Open: everything still to do. Done: finished work.",
          "Each one shows the berth or facility, priority, due date and whether it has photos. Overdue ones are marked.",
          "Managers also see Unassigned.",
        ],
      },
      {
        heading: "Work on a task",
        steps: [
          "Tap a task and tap Start work. It's assigned to you.",
          "Add updates as notes and photos as you go, and record parts used from stock.",
          "Tap Mark as done when it's finished.",
        ],
        points: ["Managers can change the priority, due date and who it's assigned to."],
      },
      { heading: "Report a new problem", text: "Tap Report, describe the problem, choose how urgent it is, add photos and send. It goes straight to the marina's work orders." },
    ],
  },

  "m.team": {
    title: "Team",
    summary: "Who's working today, the week's schedule, hours, and chat with your staff.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "Today",
        points: [
          "Hand-over notes from staff in the last 24 hours, and today's patrols.",
          "On the clock: who's clocked in and since when. Scheduled, not clocked in: who's due but hasn't started.",
          "Who's off, on leave or swapped today. Tap a person to see their details, call, email or message them.",
        ],
      },
      {
        heading: "Week",
        steps: [
          "See each day's shifts and any gaps, such as No Evening shift.",
          "Tap Find cover on a gap to see colleagues who are off that day, and tap Ask to message them.",
          "Open a person and tap Edit schedule to change their regular shift, days off or status.",
        ],
        points: ["Single days off and swaps go through Approvals."],
      },
      {
        heading: "Hours and chat",
        points: [
          "Hours: each person's time worked this week.",
          "Chat: conversations with staff. Tap Message everyone to send an announcement to every staff member at the marinas you choose.",
        ],
      },
    ],
  },

  "m.me": {
    title: "Me",
    summary: "Your week, hours, time-off requests, and app settings.",
    who: "Everyone. Staff see their schedule and hours; managers and admins see their marinas.",
    sections: [
      {
        heading: "Your week and hours (staff)",
        points: [
          "My week: your shift each day, with approved time off, swaps and cover.",
          "Your time worked this week and last week, and whether the timesheet is approved.",
        ],
      },
      {
        heading: "Time off and swaps (staff)",
        steps: [
          "Tap Request.",
          "Time off: choose the first day and how many days, and add a reason.",
          "Swap a shift: choose the shift and a colleague who is off that day.",
          "Tap Send request. Your manager approves it, and you see the answer here. Tap Withdraw to take back a waiting request.",
        ],
      },
      {
        heading: "Settings",
        points: [
          "Shift reminders: a notification 30 minutes before each shift.",
          "Appearance: automatic, light or dark. Language: English, Español or العربية.",
          "Security: unlock with Face ID or fingerprint.",
          "Account: edit your phone number, change your password, open the web app (managers) or sign out.",
        ],
      },
    ],
  },

  "m.scan": {
    title: "Scan a berth",
    summary: "Open a berth by scanning the QR label on its post.",
    who: "Dock staff, managers and admins.",
    sections: [
      {
        heading: "Scan",
        steps: ["Tap Scan at the top of the app.", "Allow the camera the first time.", "Point the camera at the QR label on the berth post. The berth opens."],
      },
      {
        heading: "No label or no camera",
        steps: ["Type the berth number, for example A-04.", "Tap Open."],
        points: ["If several marinas have that berth number, choose a marina at the top first."],
      },
      { heading: "Tip", text: "Your phone's own camera can scan the labels too; it opens the Marina app." },
    ],
  },

  "m.patrol": {
    title: "Dock patrol",
    summary: "Walk every dock and check safety, and record each round.",
    who: "Dock staff.",
    sections: [
      {
        heading: "Do a round",
        steps: [
          "Tap Start patrol.",
          "On each dock, scan any berth label to check that dock off.",
          "Go through the safety checks and tap OK, or Issue if something's wrong. Describe the issue and choose Report as repair if it needs fixing.",
          "Tap Finish patrol. Docks or checks you skipped are shown before you finish.",
        ],
      },
      { heading: "Recent rounds", text: "Finished patrols are listed with who did them and when. Managers see today's patrols on the Team tab." },
    ],
  },

  "m.report": {
    title: "Day report",
    summary: "Today's or yesterday's summary, and the plan for tomorrow, ready to share.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "What's in it",
        points: [
          "Boats: arrived, left, new bookings and berths occupied.",
          "Money: payments taken and services sold.",
          "Work: work orders finished, new problems reported and urgent ones still open.",
          "People: staff who clocked in and hours worked.",
          "Tomorrow: arrivals, departures, staff scheduled and bookings waiting for approval.",
        ],
      },
      {
        heading: "Use it",
        steps: ["Switch between Today so far and Yesterday.", "Tap Share report to send it as text by message or email."],
        points: ["Choose All marinas at the top for a combined report."],
      },
    ],
  },

  "m.owners": {
    title: "Boat owners",
    summary: "Look up any boat owner who stays at your marinas.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "Find an owner",
        points: ["Search by name, phone, email, boat or registration.", "Each owner shows their boats and anything they owe."],
      },
      {
        heading: "Open an owner",
        points: [
          "Call or email them.",
          "What they've paid, what they owe and what isn't due yet.",
          "Whether they're in the marina now, their boats and their stays at your marinas.",
        ],
      },
    ],
  },

  "m.invoices": {
    title: "Invoices",
    summary: "What's overdue, what's due and what's been paid recently.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "The lists",
        points: ["Overdue, Due and Paid (the last 30 days).", "The line at the top shows the totals overdue and due."],
      },
      {
        heading: "Reminders and payments",
        steps: [
          "Tap Remind on an overdue invoice, or Remind all to remind every owner at once. Owners already reminded today are skipped.",
          "Tap Payment to record a payment taken at the office.",
        ],
      },
    ],
  },

  "m.inbox": {
    title: "Notifications",
    summary: "Everything that's new for you, in one list.",
    who: "Everyone.",
    sections: [
      {
        heading: "What shows up",
        points: [
          "Staff: new and overdue work orders, messages from your manager, answers to your requests, colleagues asking you to cover, late departures, today's arrivals and tomorrow's shift.",
          "Managers: bookings to approve, arrivals, overdue invoices, urgent repairs, staff requests and messages.",
        ],
      },
      { heading: "Use it", text: "Tap a notification to open it. Tap Mark all read when you've seen everything." },
    ],
  },

  "m.chat": {
    title: "Messages",
    summary: "Chat between staff and their marina managers.",
    who: "Everyone.",
    sections: [
      {
        heading: "Staff",
        text: "Your conversation with your marina's managers. Ask about shifts, boats or repairs; your message goes straight to them. Announcements to everyone show here too.",
      },
      {
        heading: "Managers",
        points: ["Choose someone to message, or open a team member on the Team tab and tap Message.", "Seen shows when they've read it."],
      },
      { heading: "Send", steps: ["Type your message.", "Tap Send."] },
    ],
  },

  "m.activity": {
    title: "Activity",
    summary: "Every change made at your marinas, newest first.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "Find a change",
        points: [
          "Search the activity, and filter by type of change or by person.",
          "Changes are grouped by day: Today, Yesterday and earlier dates.",
          "The latest 150 are shown. Filter to see older changes.",
        ],
      },
    ],
  },

  "m.compare": {
    title: "Compare marinas",
    summary: "Put 2 or 3 marinas side by side.",
    who: "Marina managers and admins with more than one marina.",
    sections: [
      {
        heading: "Compare",
        steps: ["Choose 2 or 3 marinas at the top.", "Read across each row. Green marks the best value."],
        points: [
          "Rows: occupancy today, revenue this month and the change on last month, revenue per berth, berths and free today, waiting for approval, overdue, open work orders, out of service, staff and hours this week.",
        ],
      },
    ],
  },

  "m.revenue": {
    title: "Revenue",
    summary: "Revenue month by month, broken down by county, city and marina.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "Read it",
        points: [
          "It starts By county. Tap a county to see its cities, then a city to see its marinas.",
          "Each one shows its share of the total and the change on last month.",
          "Use the trail at the top (All › county › city) to go back. Trend shows the last months for what you're looking at.",
        ],
      },
      { heading: "How it's counted", text: "Each confirmed or completed stay's price is spread across its nights, so a stay over two months counts in both." },
    ],
  },

  "m.marina": {
    title: "Marina",
    summary: "One marina at a glance: today's numbers, berths, revenue, people and contacts.",
    who: "Marina managers and admins.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Occupancy today, revenue this month, arrivals and departures, and bookings waiting for approval.",
          "Berths: available, occupied, reserved and out of service, with open work orders.",
          "Revenue for the last 6 months, staff working today and on the clock, and the manager.",
        ],
      },
      {
        heading: "What you can do",
        points: [
          "Call or email the marina or its manager, and get Directions in your map app.",
          "Show this marina in the app: switches every screen to this marina.",
          "Admins: Close to new bookings (boats already booked can still arrive) and Reopen for bookings.",
        ],
      },
    ],
  },
};
