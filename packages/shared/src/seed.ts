// Deterministic sample data. Everything the UI shows is derived from these records,
// and dates are generated relative to today so the data never looks stale.
import type {
  Berth, BerthType, Boat, BoatOwner, BoatType, Booking, BookingStatus, City, County,
  Activity, ChatMessage, Contract, Handover, Incident, InventoryItem, Invoice, MaintenancePlan, MeterReading, TimesheetApproval, Patrol, WaitlistEntry, MaintenanceTask, Marina, Message, Settings, Shift, Staff, StaffRequest, SystemUser, TimeEntry,
} from "./types";
import { addDays, daysBetween, fromISO, today, zonedTime } from "./date";
import { marinaTimeZones } from "./selectors";
import { bookingAmount } from "./pricing";
import { DEFAULT_PERMISSIONS } from "./permissions";
import { SHIFT_START_HOUR } from "./shifts";
import { SERVICES } from "./actions";
import { withGulf } from "./gulf";

export interface Db {
  counties: County[];
  cities: City[];
  marinas: Marina[];
  berths: Berth[];
  owners: BoatOwner[];
  boats: Boat[];
  bookings: Booking[];
  staff: Staff[];
  tasks: MaintenanceTask[];
  invoices: Invoice[];
  users: SystemUser[];
  activity: Activity[];
  messages: Message[];
  /** Clock-ins from the staff app */
  timeEntries: TimeEntry[];
  /** Time off and shift swap requests */
  requests: StaffRequest[];
  /** Staff ↔ manager conversations */
  chat: ChatMessage[];
  /** Notes left for the next shift */
  handovers: Handover[];
  /** Dock patrol rounds */
  patrols: Patrol[];
  /** Boat owners waiting for a berth */
  waitlist: WaitlistEntry[];
  /** Long-term berth agreements */
  contracts: Contract[];
  /** Power and water meter readings */
  meterReadings: MeterReading[];
  /** Weekly hours signed off by a manager */
  timesheetApprovals: TimesheetApproval[];
  /** Recurring maintenance */
  maintenancePlans: MaintenancePlan[];
  /** Parts and supplies at each marina */
  inventory: InventoryItem[];
  /** Damage, injuries, theft and spills */
  incidents: Incident[];
  settings: Settings;
  /** Notification ids the user has dismissed or read */
  readNotifications: string[];
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["James", "Olivia", "Liam", "Emma", "Noah", "Ava", "Lucas", "Mia", "Ethan", "Sofia", "Mason", "Isla", "Logan", "Chloe", "Daniel", "Grace", "Henry", "Zoe", "Owen", "Lily", "Caleb", "Nora", "Ryan", "Maya", "Leo", "Ella", "Adam", "Ruby", "Jack", "Hana"];
const LAST = ["Carter", "Nguyen", "Patel", "Smith", "Garcia", "Kim", "Brooks", "Rivera", "Walsh", "Chen", "Foster", "Reyes", "Bennett", "Park", "Hughes", "Lopez", "Morgan", "Silva", "Ward", "Ito", "Murphy", "Cruz", "Hayes", "Khan", "Price", "Ortiz", "Reed", "Sato", "Gray", "Diaz"];
const BOAT_NAMES = ["Sea Breeze", "Blue Haven", "Wind Chaser", "Ocean Explorer", "Salt Whisper", "Tide Runner", "Northern Star", "Harbor Light", "Driftwood", "Silver Gull", "Morning Mist", "Wave Dancer", "Second Wind", "Calypso", "Serenity", "Nautilus", "Pelican", "Sea Spirit", "Island Time", "Kestrel"];
const BOAT_TYPES: BoatType[] = ["Sailboat", "Motor Yacht", "Catamaran", "Center Console", "Trawler"];

export function createSeed(): Db {
  const r = rng(20261003);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const now = today();

  const counties: County[] = [
    { id: "c-sf", name: "San Francisco County", state: "California" },
    { id: "c-md", name: "Miami-Dade County", state: "Florida" },
    { id: "c-king", name: "King County", state: "Washington" },
    { id: "c-marin", name: "Marin County", state: "California" },
    { id: "c-sd", name: "San Diego County", state: "California" },
    { id: "c-brow", name: "Broward County", state: "Florida" },
    { id: "c-mon", name: "Monroe County", state: "Florida" },
  ];

  const cities: City[] = [
    { id: "ct-sf", name: "San Francisco", countyId: "c-sf", lat: 37.7749, lng: -122.4194 },
    { id: "ct-mia", name: "Miami", countyId: "c-md", lat: 25.7617, lng: -80.1918 },
    { id: "ct-mb", name: "Miami Beach", countyId: "c-md", lat: 25.7907, lng: -80.13 },
    { id: "ct-sea", name: "Seattle", countyId: "c-king", lat: 47.6062, lng: -122.3321 },
    { id: "ct-kir", name: "Kirkland", countyId: "c-king", lat: 47.6769, lng: -122.206 },
    { id: "ct-sau", name: "Sausalito", countyId: "c-marin", lat: 37.8591, lng: -122.4853 },
    { id: "ct-sd", name: "San Diego", countyId: "c-sd", lat: 32.7157, lng: -117.1611 },
    { id: "ct-cor", name: "Coronado", countyId: "c-sd", lat: 32.6859, lng: -117.1831 },
    { id: "ct-ftl", name: "Fort Lauderdale", countyId: "c-brow", lat: 26.1224, lng: -80.1373 },
    { id: "ct-kw", name: "Key West", countyId: "c-mon", lat: 24.5551, lng: -81.78 },
  ];

  const marinaDefs = [
    { id: "m-gg", name: "Golden Gate Marina", cityId: "ct-sf", phone: "(415) 555-0123", berths: 36, docks: "ABC", address: "1 Marina Blvd", lat: 37.8067, lng: -122.443 },
    { id: "m-bh", name: "Bay Harbor Marina", cityId: "ct-sf", phone: "(415) 555-0456", berths: 28, docks: "AB", address: "400 Embarcadero", lat: 37.7955, lng: -122.3937 },
    { id: "m-mbh", name: "Miami Bay Harbor", cityId: "ct-mia", phone: "(305) 555-0789", berths: 32, docks: "ABC", address: "301 Biscayne Blvd", lat: 25.7783, lng: -80.1866 },
    { id: "m-bp", name: "Biscayne Point Marina", cityId: "ct-mb", phone: "(305) 555-0341", berths: 24, docks: "AB", address: "1800 West Ave", lat: 25.793, lng: -80.143 },
    { id: "m-sw", name: "Seattle Waterfront", cityId: "ct-sea", phone: "(206) 555-0321", berths: 30, docks: "ABC", address: "2601 Alaskan Way", lat: 47.6162, lng: -122.3557 },
    { id: "m-lw", name: "Lake Washington Marina", cityId: "ct-kir", phone: "(425) 555-0198", berths: 20, docks: "AB", address: "25 Lake St", lat: 47.6756, lng: -122.2079 },
    { id: "m-sau", name: "Sausalito Yacht Harbor", cityId: "ct-sau", phone: "(415) 555-0612", berths: 26, docks: "AB", address: "300 Bridgeway", lat: 37.858, lng: -122.4805 },
    { id: "m-mb", name: "Mission Bay Moorings", cityId: "ct-sf", phone: "(415) 555-0733", berths: 22, docks: "AB", address: "650 Terry Francois Blvd", lat: 37.7713, lng: -122.3866 },
    { id: "m-pl", name: "Point Loma Harbor", cityId: "ct-sd", phone: "(619) 555-0144", berths: 34, docks: "ABC", address: "2600 Shelter Island Dr", lat: 32.7166, lng: -117.2263 },
    { id: "m-cb", name: "Coronado Bay Marina", cityId: "ct-cor", phone: "(619) 555-0277", berths: 22, docks: "AB", address: "1715 Strand Way", lat: 32.687, lng: -117.166 },
    { id: "m-lo", name: "Las Olas Harbor", cityId: "ct-ftl", phone: "(954) 555-0390", berths: 30, docks: "ABC", address: "240 E Las Olas Cir", lat: 26.1189, lng: -80.1067 },
    { id: "m-nr", name: "New River Moorings", cityId: "ct-ftl", phone: "(954) 555-0518", berths: 18, docks: "AB", address: "15 SW 1st Ave", lat: 26.1189, lng: -80.144 },
    { id: "m-kw", name: "Southernmost Harbor", cityId: "ct-kw", phone: "(305) 555-0921", berths: 24, docks: "AB", address: "201 William St", lat: 24.5612, lng: -81.8 },
    { id: "m-sp", name: "Shilshole Point Marina", cityId: "ct-sea", phone: "(206) 555-0466", berths: 28, docks: "AB", address: "7001 Seaview Ave NW", lat: 47.6806, lng: -122.4061 },
  ];
  const AMENITIES = ["Wi-Fi", "Shore power", "Fresh water", "Fuel dock", "Pump-out", "Showers", "Laundry", "Security", "Parking"];

  const marinas: Marina[] = marinaDefs.map((m) => ({
    id: m.id,
    name: m.name,
    cityId: m.cityId,
    phone: m.phone,
    email: `office@${m.name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
    address: m.address,
    lat: m.lat,
    lng: m.lng,
    status: "active",
    amenities: AMENITIES.filter(() => r() > 0.3),
  }));

  const berths: Berth[] = [];
  for (const m of marinaDefs) {
    const docks = m.docks.split("");
    const perDock = Math.ceil(m.berths / docks.length);
    for (let i = 0; i < m.berths; i++) {
      const dock = docks[Math.floor(i / perDock)];
      const n = (i % perDock) + 1;
      const maxLength = pick([26, 30, 35, 40, 45, 50, 60]);
      const type: BerthType = maxLength >= 50 ? "Floating" : pick(["Floating", "Fixed", "Floating", "Mooring"]);
      const dailyRate = Math.round(maxLength * 1.3 + (type === "Mooring" ? -12 : 4));
      berths.push({
        id: `${m.id}-${dock}${n}`,
        marinaId: m.id,
        code: `${dock}-${String(n).padStart(2, "0")}`,
        maxLength,
        type,
        dailyRate,
        monthlyRate: dailyRate * 22,
        power: type !== "Mooring",
        water: type !== "Mooring" || r() > 0.5,
        underMaintenance: false,
      });
    }
  }
  // Two berths per marina under maintenance right now.
  for (const m of marinaDefs) {
    const list = berths.filter((b) => b.marinaId === m.id);
    list[3].underMaintenance = true;
    list[list.length - 2].underMaintenance = true;
  }

  const owners: BoatOwner[] = [];
  const boats: Boat[] = [];
  for (let i = 0; i < 260; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / 30)) % LAST.length]}`;
    const id = `o-${i + 1}`;
    owners.push({
      id,
      name,
      email: `${name.toLowerCase().replace(" ", ".")}${i > 29 ? i : ""}@email.com`,
      phone: `(${pick(["415", "305", "206", "425", "650"])}) 555-${String(1000 + i * 37).slice(-4)}`,
      since: addDays(now, -between(60, 1400)),
    });
    boats.push({
      id: `bt-${i + 1}`,
      ownerId: id,
      name: `${BOAT_NAMES[i % BOAT_NAMES.length]}${i >= BOAT_NAMES.length ? ` ${["II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"][Math.floor(i / BOAT_NAMES.length) - 1]}` : ""}`,
      type: pick(BOAT_TYPES),
      length: pick([24, 28, 32, 35, 38, 42, 48, 55]),
      registration: `${pick(["CA", "FL", "WA"])} ${1000 + between(0, 8999)} ${String.fromCharCode(65 + between(0, 25))}${String.fromCharCode(65 + between(0, 25))}`,
    });
  }

  const bookings: Booking[] = [];
  let seq = 1;
  const HISTORY = 185;
  const FUTURE = 60;
  /** Berths held by long-term contract holders: one stay for the whole term, free afterwards. */
  const contractStays = new Map<string, "monthly" | "annual">();
  for (const [i, b] of berths.entries()) {
    const fits = boats.filter((bt) => bt.length <= b.maxLength);
    if (i % 9 === 4 && !b.underMaintenance && fits.length) {
      const term = i % 2 ? "annual" : "monthly";
      const end = addDays(now, between(1, term === "monthly" ? 25 : 70));
      const start = term === "monthly" ? addDays(end, -30) : addDays(end, -365);
      const id = `bk-${seq}`;
      bookings.push({ id, code: `BK-${String(seq).padStart(4, "0")}`, boatId: pick(fits).id, berthId: b.id, start, end, guests: between(1, 4), status: "checked-in", createdAt: addDays(start, -between(7, 30)) });
      contractStays.set(id, term);
      seq++;
      continue;
    }
    let cursor = addDays(now, -HISTORY + between(0, 10));
    while (daysBetween(cursor, addDays(now, FUTURE)) > 0) {
      const monthly = r() < 0.35;
      const nights = monthly ? between(28, 31) : between(2, 12);
      const start = cursor;
      const end = addDays(start, nights);
      // Berths under repair are kept free for the next two weeks.
      if (b.underMaintenance && end > now && start <= addDays(now, 14)) {
        cursor = addDays(now, between(15, 20));
        continue;
      }
      let status: BookingStatus;
      if (r() < 0.06) status = "cancelled";
      else if (end <= now) status = "completed";
      else if (start <= now) status = "checked-in";
      else status = r() < 0.1 ? "pending" : "confirmed";
      bookings.push({
        id: `bk-${seq}`,
        code: `BK-${String(seq).padStart(4, "0")}`,
        boatId: pick(fits).id,
        berthId: b.id,
        start,
        end,
        guests: between(1, 8),
        status,
        createdAt: addDays(start, -between(3, 40)),
      });
      seq++;
      cursor = addDays(end, status === "cancelled" ? 0 : between(0, 5));
    }
  }

  const berthById = new Map(berths.map((b) => [b.id, b]));
  // Times at a marina are set in its local time: a 9 am shift starts at 9 am there.
  const zones = marinaTimeZones({ marinas, cities, counties });
  const atMarina = (marinaId: string, day: string, minutes: number) => zonedTime(day, minutes, zones[marinaId]).toISOString();
  const invoices: Invoice[] = [];
  let inv = 1;
  for (const bk of bookings) {
    if (bk.status === "cancelled" || bk.status === "pending") continue;
    const issued = bk.start <= now ? bk.start : bk.createdAt;
    const due = addDays(issued, 14);
    let status: Invoice["status"];
    if (bk.status === "completed") status = r() < 0.06 && due < now ? "overdue" : "paid";
    else if (due < now) status = r() < 0.8 ? "paid" : "overdue";
    else status = r() < 0.4 ? "paid" : "due";
    invoices.push({
      id: `inv-${inv}`,
      number: `INV-${String(10000 + inv)}`,
      bookingId: bk.id,
      issued,
      due,
      amount: bookingAmount(bk.start, bk.end, berthById.get(bk.berthId)!),
      status,
      paidAt: status === "paid" ? (due < now ? addDays(issued, between(0, 13)) : issued) : undefined,
      method: status === "paid" ? pick(["Card", "Card", "Card", "Bank transfer", "Check", "Cash"] as const) : undefined,
      // A reminder goes out a few days after the due date, never later than today.
      reminders: status === "overdue" ? [addDays(due, 3) < now ? addDays(due, 3) : now] : [],
      payments: [],
    });
    const last = invoices[invoices.length - 1];
    // About a third of recent stays bought fuel, a pump-out or ice during the stay.
    if (bk.start <= now && bk.start >= addDays(now, -100) && daysBetween(bk.start, bk.end) < 28 && r() < 0.35) {
      const svc = pick([SERVICES[0], SERVICES[0], SERVICES[1], SERVICES[2], SERVICES[3]]);
      const qty = svc.unit === "gal" ? between(4, 16) * 5 : between(1, 3);
      const at = atMarina(berthById.get(bk.berthId)!.marinaId, addDays(bk.start, between(0, Math.max(0, Math.min(daysBetween(bk.start, bk.end), daysBetween(bk.start, now)) - 1))), 11 * 60);
      const amount = Math.round(qty * svc.price * 100) / 100;
      last.lines = [{ label: svc.label, qty, unit: svc.unit, unitPrice: svc.price, amount, at, by: "Fuel dock" }];
      last.amount = Math.round((last.amount + amount) * 100) / 100;
    }
    if (last.status === "paid") last.payments = [{ date: last.paidAt!, amount: last.amount, method: last.method! }];
    inv++;
  }

  const POSITIONS: [string, Staff["department"]][] = [
    ["Marina Manager", "Operations"],
    ["Dock Hand", "Maintenance"],
    ["Front Desk Associate", "Front Desk"],
    ["Security Guard", "Security"],
  ];
  const SHIFTS: Shift[] = ["Morning", "Day", "Evening", "Night"];
  const staff: Staff[] = [];
  let si = 0;
  for (const m of marinaDefs) {
    for (let k = 0; k < 4; k++) {
      const [position, department] = POSITIONS[k];
      const name = `${FIRST[(si * 11 + 5) % FIRST.length]} ${LAST[(si * 13 + 3) % LAST.length]}`;
      staff.push({
        id: `s-${si + 1}`,
        name,
        email: `${name.toLowerCase().replace(" ", ".")}@marinaops.com`,
        phone: `${m.phone.slice(0, 5)} 555-${String(2000 + si * 41).slice(-4)}`,
        position,
        department,
        marinaId: m.id,
        status: si % 9 === 4 ? "on-leave" : "active",
        shift: k === 0 ? "Day" : SHIFTS[(si + k) % 4],
        daysOff: [[0, 6], [1, 2], [3, 4], [5, 6], [0, 1], [2, 3]][si % 6],
        hired: addDays(now, -between(120, 2200)),
      });
      si++;
    }
  }

  const TASKS = [
    "Replace dock cleat", "Repair shore power pedestal", "Fix water line leak", "Replace dock boards",
    "Inspect pilings", "Service fuel dock pump", "Repaint berth numbers", "Repair gangway hinge",
    "Replace dock lighting", "Clean pump-out station",
  ];
  // Demo staff member who signs in to the staff app (staff@marina.com).
  const priya: Staff = {
    id: `s-${staff.length + 1}`, name: "Priya Shah", email: "staff@marina.com", phone: "(415) 555-2087",
    position: "Dock Hand", department: "Operations", marinaId: "m-gg", status: "active", shift: "Day", daysOff: [0, 6], hired: addDays(now, -420),
  };
  staff.push(priya);

  const tasks: MaintenanceTask[] = [];
  let ti = 1;
  for (const b of berths.filter((x) => x.underMaintenance)) {
    const maint = staff.find((s) => s.marinaId === b.marinaId && s.department === "Maintenance");
    tasks.push({
      id: `t-${ti}`, code: `WO-${String(ti).padStart(3, "0")}`, title: pick(TASKS.slice(0, 5)),
      marinaId: b.marinaId, berthId: b.id, assigneeId: maint?.id,
      priority: ti % 3 === 0 ? "medium" : "high", status: ti % 2 ? "in-progress" : "open",
      created: addDays(now, -between(1, 9)), due: addDays(now, between(-2, 7)),
      notes: [{ at: addDays(now, -1), by: maint?.name ?? "Dock team", text: "Parts ordered, berth closed to boats until repaired." }],
    });
    ti++;
  }
  for (let k = 0; k < marinaDefs.length + 4; k++) {
    const m = marinaDefs[k % marinaDefs.length];
    const done = k < 6;
    tasks.push({
      id: `t-${ti}`, code: `WO-${String(ti).padStart(3, "0")}`, title: TASKS[(k + 3) % TASKS.length],
      marinaId: m.id, assigneeId: k % 3 ? staff.find((s) => s.marinaId === m.id && s.department === "Maintenance")?.id : undefined,
      priority: (["low", "medium", "high"] as const)[k % 3], status: done ? "done" : "open",
      created: addDays(now, -between(5, 40)), due: addDays(now, done ? -between(1, 20) : between(2, 20)),
      notes: done ? [{ at: addDays(now, -between(1, 4)), by: "Dock team", text: "Completed and inspected." }] : [],
    });
    if (done) tasks[tasks.length - 1].doneAt = tasks[tasks.length - 1].notes[0].at;
    ti++;
  }

  // Give the demo staff member some open work orders at her marinas.
  tasks.filter((t) => (t.marinaId === "m-gg" || t.marinaId === "m-bh") && t.status !== "done").slice(0, 3).forEach((t) => (t.assigneeId = priya.id));

  const users: SystemUser[] = [
    { id: "u-1", name: "Alex Morgan", email: "admin@marina.com", role: "admin", marinaIds: [], lastActive: now, status: "active" },
    ...staff
      .filter((s) => s.position === "Marina Manager")
      .map((s, i): SystemUser => ({
        id: `u-${i + 2}`, name: s.name, email: i === 0 ? "manager@marina.com" : s.email, role: "manager",
        // The demo manager runs the San Francisco Bay group; other managers run one marina each.
        marinaIds: i === 0 ? ["m-gg", "m-bh", "m-mb", "m-sau"] : [s.marinaId], lastActive: addDays(now, -(i % 7)), status: "active",
      })),
    { id: "u-staff-1", name: "Priya Shah", email: "staff@marina.com", role: "staff", marinaIds: ["m-gg", "m-bh"], lastActive: addDays(now, -1), status: "active" },
    { id: "u-staff-2", name: "Tom Becker", email: "tom.becker@marinaops.com", role: "staff", marinaIds: ["m-sw"], lastActive: addDays(now, -20), status: "invited" },
  ];

  const settings: Settings = {
    company: "Marina Operations Co.",
    currency: "USD",
    timezone: "America/Los_Angeles",
    invoiceDueDays: 14,
    monthlyFromNights: 28,
    notify: { pending: true, overdue: true, maintenance: true, digest: false },
    permissions: DEFAULT_PERMISSIONS,
  };

  const marinaName = new Map(marinas.map((m) => [m.id, m.name]));
  const boatName = new Map(boats.map((b) => [b.id, b.name]));
  const activity: Activity[] = bookings
    .filter((b) => b.createdAt <= now && b.status !== "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40)
    .map((b, i) => ({
      id: `a-${i + 1}`,
      // Entries from today are spaced back from the current time so none are in the future.
      at: b.createdAt === now ? new Date(Date.now() - (i + 1) * 23 * 60_000).toISOString() : new Date(Math.min(Date.parse(atMarina(berthById.get(b.berthId)!.marinaId, b.createdAt, (18 - (i % 10)) * 60 + ((i * 17) % 60))), Date.now() - (i + 1) * 23 * 60_000)).toISOString(),
      by: i % 3 === 0 ? "Online booking" : "Front desk",
      text: `New booking ${b.code} for ${boatName.get(b.boatId)} at ${marinaName.get(berthById.get(b.berthId)!.marinaId)}`,
      to: `/bookings?q=${b.code}`,
      marinaId: berthById.get(b.berthId)!.marinaId,
    }));
  const messages: Message[] = [];

  // Everyone else's clock-ins for the last two weeks, so hours and payroll have real numbers.
  const clockIns: TimeEntry[] = [];
  for (const st of staff) {
    if (st.status !== "active" || st.email === "staff@marina.com") continue;
    for (let back = 14; back >= 1; back--) {
      const d = addDays(now, -back);
      if (st.daysOff.includes(fromISO(d).getDay())) continue;
      const startMin = SHIFT_START_HOUR[st.shift] * 60 - 10 + between(0, 15);
      const length = 8 * 60 + between(-20, st.position === "Marina Manager" ? 90 : 35);
      clockIns.push({ id: `te-x${clockIns.length + 1}`, staffId: st.id, marinaId: st.marinaId, start: atMarina(st.marinaId, d, startMin), end: atMarina(st.marinaId, d, startMin + length) });
    }
  }

  // Priya's clock-ins for the days she has already worked this week.
  const at = (day: string, h: number, m: number) => atMarina(priya.marinaId, day, h * 60 + m);
  const timeEntries: TimeEntry[] = [];
  const weekStart = addDays(now, -fromISO(now).getDay());
  for (let d = weekStart; d < now; d = addDays(d, 1)) {
    if (priya.daysOff.includes(fromISO(d).getDay())) continue;
    const n = timeEntries.length;
    timeEntries.push({ id: `te-${n + 1}`, staffId: priya.id, marinaId: priya.marinaId, start: at(d, 8, 52 + (n % 3) * 3), end: at(d, 17, 4 + (n % 4) * 6) });
  }

  // A few requests: Priya's approved day off, and colleagues' requests waiting for the Golden Gate manager.
  const gg = staff.filter((s) => s.marinaId === "m-gg" && s.id !== priya.id && s.position !== "Marina Manager");
  const ggManager = staff.find((s) => s.marinaId === "m-gg" && s.position === "Marina Manager")!;
  // A day Priya is off and her colleague works, so she can cover the swap.
  const offDay = (s: Staff, d: string) => s.daysOff.includes(fromISO(d).getDay());
  let swapDay = addDays(now, 3);
  for (let i = 0; i < 14 && (!offDay(priya, swapDay) || offDay(gg[1], swapDay)); i++) swapDay = addDays(swapDay, 1);
  const created = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const requests: StaffRequest[] = [
    { id: "rq-1", staffId: priya.id, kind: "leave", start: addDays(now, 17), end: addDays(now, 18), reason: "Family wedding", status: "approved", createdAt: created(6), decidedBy: ggManager.name, decidedAt: created(5) },
    { id: "rq-2", staffId: gg[0].id, kind: "leave", start: addDays(now, 9), end: addDays(now, 11), reason: "Dentist and a long weekend", status: "pending", createdAt: created(1) },
    { id: "rq-3", staffId: gg[1].id, kind: "swap", start: swapDay, end: swapDay, swapWithId: priya.id, reason: "Kid's school event", status: "pending", createdAt: created(0.2) },
  ];

  const chat: ChatMessage[] = [
    { id: "ch-1", staffId: priya.id, fromStaff: false, by: ggManager.name, text: "Thanks for sorting out the cleat on A-04 so quickly yesterday.", at: created(1.2), read: true },
    { id: "ch-2", staffId: priya.id, fromStaff: true, by: priya.name, text: "No problem. The new one needs a final check once the epoxy sets.", at: created(1.15), read: true },
    { id: "ch-3", staffId: priya.id, fromStaff: false, by: ggManager.name, text: "Morning Priya. The fuel dock pump is playing up again. Can you take a look when you have a minute?", at: created(0.06), read: false },
  ];

  const nightGuard = staff.find((s) => s.marinaId === "m-gg" && s.department === "Security");
  const handovers: Handover[] = [
    { id: "ho-1", marinaId: "m-gg", text: "Gate 2 keypad is slow to respond, use the side gate. Boat on C-07 asked for a pump-out first thing.", by: nightGuard?.name ?? "Night shift", shift: "Night", at: new Date(Date.now() - 5 * 3_600_000).toISOString() },
  ];

  const patrols: Patrol[] = [];
  const waitlist: WaitlistEntry[] = [
    { id: "wl-1", marinaId: "m-gg", name: "Grace Lindqvist", email: "grace.lindqvist@email.com", phone: "(415) 555-0144", boatName: "Northwind", boatLength: 32, start: addDays(now, 3), end: addDays(now, 7), note: "Flexible by a day either side.", status: "waiting", createdAt: addDays(now, -2) },
    { id: "wl-2", marinaId: "m-gg", name: "Omar Haddad", email: "omar.haddad@email.com", phone: "(650) 555-0190", boatName: "Blue Lantern", boatLength: 44, start: addDays(now, 10), end: addDays(now, 24), status: "waiting", createdAt: addDays(now, -5) },
    { id: "wl-3", marinaId: "m-bh", name: "Keiko Tanaka", email: "keiko.tanaka@email.com", phone: "(510) 555-0117", boatName: "Sakura", boatLength: 28, start: addDays(now, 1), end: addDays(now, 4), status: "waiting", createdAt: addDays(now, -1) },
  ];

  // Monthly stays in the marina now are held on contracts; a few come up for renewal soon.
  const contracts: Contract[] = bookings
    .filter((b) => contractStays.has(b.id))
    .map((b, i) => {
      const berth = berthById.get(b.berthId)!;
      const boat = boats.find((x) => x.id === b.boatId)!;
      const annual = contractStays.get(b.id) === "annual";
      return { id: `ct-${i + 1}`, code: `CT-${String(i + 1).padStart(3, "0")}`, ownerId: boat.ownerId, boatId: b.boatId, berthId: b.berthId, marinaId: berth.marinaId, term: annual ? "annual" : "monthly", start: b.start, end: b.end, monthlyFee: annual ? Math.round(berth.monthlyRate * 0.9) : berth.monthlyRate, autoRenew: i % 3 !== 0, status: "active", bookingId: b.id, createdAt: b.createdAt };
    });

  // Last month's meter readings on serviced berths, as the starting point for this month's bills.
  const meterReadings: MeterReading[] = [];
  for (const b of berths) {
    if (b.power) meterReadings.push({ id: `mr-${meterReadings.length + 1}`, berthId: b.id, kind: "power", value: between(1200, 9000), at: atMarina(b.marinaId, addDays(now, -between(20, 30)), 9 * 60), by: "Dock team" });
    if (b.water) meterReadings.push({ id: `mr-${meterReadings.length + 1}`, berthId: b.id, kind: "water", value: between(4000, 40000), at: atMarina(b.marinaId, addDays(now, -between(20, 30)), 9 * 60), by: "Dock team" });
  }

  timeEntries.push(...clockIns);

  const PARTS: [string, string, number, number][] = [
    ["Dock cleat, 10 in", "each", 18, 4], ["Dock line, 25 ft", "each", 24, 6], ["Fender, medium", "each", 32, 4], ["Shore power cord, 30 A", "each", 120, 2],
    ["Pedestal fuse, 30 A", "each", 9, 10], ["Hose fitting", "each", 6, 10], ["Deck screws", "box", 14, 3], ["Marine epoxy kit", "kit", 38, 2], ["Dock light bulb", "each", 11, 8],
  ];
  const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const incidents: Incident[] = [
    { id: "ic-1", code: "INC-001", marinaId: "m-gg", kind: "damage", serious: false, at: ago(30), berthId: berths.find((b) => b.marinaId === "m-gg" && b.code === "B-04")?.id, description: "Visiting boat clipped the end of the finger pier while docking in a gust. Two boards cracked, no one hurt.", people: "Skipper of the visiting boat", reportedBy: "Henry Morgan", reportedAt: ago(29), status: "investigating", notes: [{ at: ago(20), by: "Ava Smith", text: "Spoke to the skipper; their insurer has the details. Boards ordered." }] },
    { id: "ic-2", code: "INC-002", marinaId: "m-gg", kind: "injury", serious: false, at: ago(52), description: "Guest slipped on the wet gangway at night and grazed a knee. First aid given, declined further help.", people: "Guest from C-07; witness: Ethan Bennett", reportedBy: "Ethan Bennett", reportedAt: ago(51), status: "open", notes: [] },
    { id: "ic-3", code: "INC-003", marinaId: "m-bh", kind: "theft", serious: true, at: ago(96), description: "Outboard motor taken from a tender on Dock A overnight. Police informed.", people: "Owner of the tender", reportedBy: "Night security", reportedAt: ago(90), status: "closed", notes: [{ at: ago(70), by: "Manager", text: "Police report filed, CCTV footage shared." }], outcome: "Police report filed; extra lighting ordered for Dock A." },
  ];
  const inventory: InventoryItem[] = marinaDefs.flatMap((m, i) =>
    PARTS.map(([name, unit, cost, reorder], k) => ({ id: `inv-${m.id}-${k + 1}`, marinaId: m.id, name, unit, unitCost: cost, reorderAt: reorder, qty: Math.max(0, reorder + between(-3, 14) - ((i + k) % 7 === 0 ? reorder : 0)) })),
  );

  // Each marina's routine jobs. Work orders appear a week before they're due.
  const maintenancePlans: MaintenancePlan[] = marinaDefs.flatMap((m, i) => {
    const hand = staff.find((st) => st.marinaId === m.id && st.position === "Dock Hand");
    return [
      { id: `mp-${i * 3 + 1}`, marinaId: m.id, title: "Clean pump-out station", every: "week" as const, nextDue: addDays(now, 2 + (i % 5)), priority: "low" as const, assigneeId: hand?.id, active: true },
      { id: `mp-${i * 3 + 2}`, marinaId: m.id, title: "Inspect pilings and cleats", every: "month" as const, nextDue: addDays(now, 12 + (i % 9)), priority: "medium" as const, assigneeId: hand?.id, active: true },
      { id: `mp-${i * 3 + 3}`, marinaId: m.id, title: "Test fire extinguishers and life rings", every: "quarter" as const, nextDue: addDays(now, 20 + i), priority: "medium" as const, active: true },
    ];
  });

  // The Gulf marinas are added after the US ones, with their own random sequence.
  return withGulf({ counties, cities, marinas, berths, owners, boats, bookings, staff, tasks, invoices, users, activity, messages, timeEntries, requests, chat, handovers, patrols, waitlist, contracts, meterReadings, timesheetApprovals: [], maintenancePlans, inventory, incidents, settings, readNotifications: [] });
}
