import type { Guide } from "../types";

// Public website and owner portal (apps/website), for visitors and boat owners.
export const site: Record<string, Guide> = {
  "s.home": {
    title: "Home",
    summary: "Find a free berth for your dates and boat, see our marinas on a map, and learn how booking works.",
    who: "Everyone: visitors looking for a berth and boat owners with an account.",
    sections: [
      {
        heading: "Search for a berth",
        steps: [
          "Choose a marina, or leave Any marina to search them all.",
          "Pick your arrival and departure dates.",
          "Enter your boat's length in feet.",
          "Select Search to see every berth that's free for the whole stay and fits your boat, with the price.",
        ],
      },
      {
        heading: "Also on this page",
        points: [
          "Our marinas: a card for each marina with its city, berths, longest boat, amenities and the lowest nightly rate. Select a card to open the marina.",
          "The map: select a marina's pin to open it. Numbered pins hold several marinas close together; select one to zoom in.",
          "How it works: search, book, arrive.",
          "For boat owners: what your account does, with buttons to sign in or create one.",
          "Staying longer: stays of 28 nights or more use the monthly rate, and contracts save more.",
        ],
      },
      {
        heading: "Around the site",
        points: [
          "The language button switches between English, Español and العربية. Arabic reads right to left.",
          "The moon and sun button switches dark and light mode. Until you choose, it follows your device.",
          "Book a berth, Sign in or My account are always at the top. On a phone, open the menu button.",
        ],
      },
    ],
  },

  "s.marinas": {
    title: "Marinas",
    summary: "All our marinas, by state, with a map.",
    who: "Everyone.",
    sections: [
      {
        heading: "Browse",
        steps: [
          "Select a state at the top to show only its marinas, or All states.",
          "Each card shows the city, number of berths, the longest boat taken, amenities and the lowest nightly rate.",
          "Select a card, or a pin on the map, to open that marina.",
        ],
      },
      { heading: "Tip", text: "Numbered pins on the map hold several marinas close together. Select one to zoom in until they separate." },
    ],
  },

  "s.marina": {
    title: "Marina page",
    summary: "Everything about one marina: berth sizes and rates, amenities, where it is and how to reach the dock office.",
    who: "Everyone.",
    sections: [
      {
        heading: "Check availability",
        steps: ["Pick your arrival and departure dates and your boat's length.", "Select Search to see the free berths at this marina, with prices."],
      },
      {
        heading: "Berths and rates",
        points: [
          "Each berth size with how many berths there are, the lowest nightly rate and the lowest monthly rate.",
          "Stays of 28 nights or more are charged at the monthly rate, prorated by the night.",
          "Shore power and fresh water are shown when the marina's berths have them.",
        ],
      },
      {
        heading: "Contact and location",
        points: [
          "Dock office: address, phone and email. Select the phone number or email to call or write.",
          "Directions opens Google Maps with the route to the marina.",
          "Staying a season or longer: monthly rates here and a link to contract prices.",
        ],
      },
    ],
  },

  "s.pricing": {
    title: "Rates and fees",
    summary: "What a stay costs at each marina, how the price is worked out, contract discounts, dock extras and how to pay.",
    who: "Everyone.",
    sections: [
      {
        heading: "Rates by marina",
        text: "The lowest nightly and monthly rate at each marina and the longest boat it takes. Larger berths cost more; you always see the exact price before you book.",
      },
      {
        heading: "Estimate a stay",
        steps: ["Choose a marina, enter your boat's length and the number of nights.", "The estimate shows the cheapest berth your boat fits, starting tomorrow.", "To see what's free on your dates, use Find a berth at the bottom of the page."],
      },
      {
        heading: "How the price is worked out",
        points: [
          "Shorter stays: the berth's nightly rate for each night.",
          "28 nights or more: the monthly rate, prorated (a month counts as 30 nights).",
          "Any weekend, seasonal or long-stay rules the marinas use are listed here too.",
        ],
      },
      {
        heading: "Contracts, extras and paying",
        points: [
          "Berth contracts: monthly, seasonal (6 months, 5% off) or annual (12 months, 10% off). We remind you before a contract ends.",
          "Extras at the dock: metered shore power and fresh water, fuel, pump-out, ice and laundry, added to your invoice when you use them.",
          "Paying: the marina confirms your booking and sends the invoice. Pay online from your account, or at the dock office.",
        ],
      },
    ],
  },

  "s.contact": {
    title: "Contact us",
    summary: "Reach the head office or any dock office, or send us a message.",
    who: "Everyone.",
    sections: [
      {
        heading: "Send a message",
        steps: [
          "Enter your name and email. If you're signed in, they're filled in for you.",
          "Choose the marina it's about (if any) and the topic: a booking, a long-term contract, an invoice or payment, or something else.",
          "Write your message (at least 10 characters) and select Send message.",
          "We reply by email within one business day.",
        ],
      },
      {
        heading: "Call or write directly",
        points: ["The head office phone, email and opening hours are on the right.", "Dock offices lists every marina with its phone number. Select a marina's name to open its page."],
      },
      { heading: "Preview", text: "For now, messages are kept in this browser until the website is connected to the office." },
    ],
  },

  "s.book": {
    title: "Book a berth",
    summary: "See every berth that's free for your whole stay and fits your boat, with the exact price, and pick one to book.",
    who: "Everyone. You sign in or create an account when you choose a berth.",
    sections: [
      {
        heading: "Search",
        steps: [
          "Choose a marina or Any marina, your arrival and departure dates, and your boat's length in feet.",
          "Select Search. Marinas with the cheapest stay come first.",
          "Each marina shows its free berths: the berth number and type, the longest boat it takes, power and water, and the total price.",
          "Select Show more berths to see all of a marina's free berths.",
        ],
      },
      {
        heading: "Book",
        steps: ["Select Book next to the berth you want.", "If you aren't signed in, sign in or create an account. You come straight back.", "Confirm the booking on the next page."],
      },
      {
        heading: "When nothing is free",
        points: [
          "Try other dates or another marina, or call a dock office: they can sometimes move bookings around.",
          "Select Join the waitlist (or Join its waitlist under the results) to be told when a berth frees up. Choose the marina, add your details and boat, and send. The dock office offers freed-up berths in order, and nothing is charged until you book.",
        ],
      },
      {
        heading: "Search rules",
        points: ["Arrival can't be in the past, and departure must be at least one night later.", "For stays over 6 months, ask us about a contract."],
      },
    ],
  },

  "s.checkout": {
    title: "Confirm your booking",
    summary: "Choose your boat, add the stay details and send the booking request.",
    who: "Signed-in boat owners.",
    sections: [
      {
        heading: "Send the request",
        steps: [
          "Your boat: pick one of your boats that fits the berth, or choose Add your boat / A different boat and enter its name, type, length and registration (optional).",
          "Stay details: enter how many people will be on board (1 to 12).",
          "Tick the box to agree to the berth rules: check in at the dock office on arrival, keep the berth clear on departure, and pay the invoice by its due date.",
          "Select Send booking request.",
        ],
      },
      {
        heading: "What happens next",
        points: [
          "Nothing is charged now. The berth is held for you while the marina confirms it, usually within one business day.",
          "Once confirmed, the marina sends the invoice. You'll find it under Invoices in your account.",
          "The summary on the right shows the marina, berth, dates, nights and the total. Power, water and fuel you use are added to the invoice.",
        ],
      },
      { heading: "If the berth was just taken", text: "If someone books the same berth first, you'll be asked to go back to the results and choose another." },
    ],
  },

  "s.signin": {
    title: "Sign in and accounts",
    summary: "Sign in to your owner account, create one, or reset your password.",
    who: "Boat owners.",
    sections: [
      {
        heading: "Sign in",
        steps: ["Enter your email and password and select Sign in.", "You go back to the page you were on, for example the booking you were making, or to My account."],
        points: ["Use the eye button to show the password while you type."],
      },
      {
        heading: "Create an account",
        steps: ["Select Create an account.", "Enter your full name, email, phone (optional) and a password of at least 8 characters.", "Select Create account. You're signed in straight away."],
      },
      {
        heading: "Forgot your password",
        steps: ["Select Forgot password? on the sign-in page.", "Enter the email you signed up with and select Send reset link.", "Follow the link in the email within 30 minutes."],
      },
      { heading: "Preview", text: "For now, accounts are saved only in this browser, and reset emails are sent once the website is connected to the office." },
    ],
  },

  "s.account": {
    title: "My account",
    summary: "Your stays, what you owe and anything that needs your attention, at a glance.",
    who: "Signed-in boat owners.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Next stay (or Staying now): the marina, dates, berth and status. With nothing booked, select Book a berth.",
          "To pay: the total of your open invoices. Select Pay now to pay.",
          "Contracts waiting for your signature, with Read and sign.",
          "On the waitlist: your open waitlist requests. When a berth is offered, the dock office calls you.",
          "Recent bookings and how many boats are on your account.",
        ],
      },
      {
        heading: "Around your account",
        points: [
          "Use the menu to open Bookings, Invoices, Contracts, My boats and Profile.",
          "Select Sign out when you're done, especially on a shared computer.",
        ],
      },
    ],
  },

  "s.bookings": {
    title: "My bookings",
    summary: "All your stays: upcoming, past and cancelled.",
    who: "Signed-in boat owners.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Upcoming, Past and Cancelled tabs, each with a count.",
          "Each booking shows the marina, dates and nights, booking code, berth, boat, status and price.",
          "Status: Waiting for confirmation, Confirmed, Checked in, Completed or Cancelled.",
        ],
      },
      {
        heading: "Cancel a request",
        steps: ["A booking the marina hasn't confirmed yet shows Cancel request.", "Select it and confirm. The berth is released for others; nothing has been charged."],
        points: ["To change or cancel a confirmed booking, contact the marina's dock office."],
      },
      { heading: "Book again", text: "Select Book a berth at the top to make a new booking." },
    ],
  },

  "s.invoices": {
    title: "Invoices",
    summary: "Every invoice for your stays, what's still owed, and receipts for what you've paid.",
    who: "Signed-in boat owners.",
    sections: [
      {
        heading: "What you see",
        points: [
          "At the top, the total still owed across your open invoices.",
          "Each invoice shows its number, marina, issue and due dates, the amount and its status: Due, Part paid, Overdue, Paid or Void.",
          "Select an invoice to open it, pay it or print it.",
        ],
      },
      { heading: "When invoices appear", text: "The marina sends an invoice once it confirms a booking. Contracts are invoiced for the whole term up front." },
    ],
  },

  "s.invoice": {
    title: "Invoice and receipt",
    summary: "One invoice in full, with payments made so far. Pay it online or print it.",
    who: "Signed-in boat owners.",
    sections: [
      {
        heading: "What's on it",
        points: [
          "Who it's billed to and the stay: boat, berth, dates and booking code.",
          "The berth charge, any extras such as fuel or metered power and water, and the total.",
          "Every payment made, and the balance still owed.",
          "Once it's fully paid, it becomes a receipt.",
        ],
      },
      {
        heading: "Pay online",
        steps: [
          "Select Pay and the amount still owed.",
          "Keep the full balance, or enter a smaller amount to pay part of it.",
          "Select Pay. The invoice shows Part paid, or Paid when nothing is left.",
        ],
        points: ["Preview: no card is charged yet. Card payments go live when the website is connected to the payment provider."],
      },
      { heading: "Print", text: "Select Print invoice (or Print receipt once paid) to print it or save it as a PDF." },
    ],
  },

  "s.contracts": {
    title: "Contracts",
    summary: "Your long-term berth agreements, and signing them online.",
    who: "Signed-in boat owners with a monthly, seasonal or annual contract.",
    sections: [
      {
        heading: "What you see",
        points: [
          "Each contract: marina, contract code, term and dates, berth, boat and monthly fee.",
          "Status: Auto-renews, Fixed term or Ended.",
          "Whether it's signed, and when.",
        ],
      },
      {
        heading: "Read and sign",
        steps: [
          "Select Read and sign on a contract waiting for your signature.",
          "Read the berth, boat, dates, monthly fee, renewal and the terms.",
          "Type your full name exactly as it appears on your account.",
          "Tick the box to confirm you agree, then select Sign contract.",
        ],
        points: ["The marina sees straight away that you've signed."],
      },
    ],
  },

  "s.boats": {
    title: "My boats",
    summary: "The boats on your account, used to match you to berths they fit.",
    who: "Signed-in boat owners.",
    sections: [
      {
        heading: "Add a boat",
        steps: ["Select Add a boat.", "Enter its name, type, length in feet and registration (optional).", "Select Add boat."],
      },
      {
        heading: "Edit a boat",
        steps: ["Select Edit on the boat.", "Change what you need and select Save changes."],
        points: ["If the boat gets longer than a berth you've booked, you're asked to contact the marina to change berths first."],
      },
    ],
  },

  "s.profile": {
    title: "Profile",
    summary: "Your contact details and password.",
    who: "Signed-in boat owners.",
    sections: [
      {
        heading: "Your details",
        steps: ["Change your full name or phone number.", "Select Save changes."],
        points: ["To change your email, contact us."],
      },
      {
        heading: "Change your password",
        steps: ["Enter your current password.", "Enter a new password (at least 8 characters) twice.", "Select Change password."],
        points: ["The demo account's password can't be changed. Create your own account to set one."],
      },
    ],
  },
};
