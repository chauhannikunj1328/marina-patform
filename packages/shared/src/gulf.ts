// Sample marinas in the Gulf: the UAE (Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah), Saudi Arabia
// (Jeddah, Al Khobar), Qatar, Bahrain, Oman and Kuwait. Places and map positions are real marina
// areas; the marina names, addresses, phone numbers, people and boats are made up.
//
// Each marina charges in its country's currency (AED, SAR, QAR, BHD, OMR, KWD), so its berth rates,
// bookings, invoices, contracts and parts are in that currency. Names and addresses have Arabic
// versions for the Arabic website and app.
//
// Built with its own random sequence after the US sample data, so adding these marinas leaves the
// US marinas' bookings, invoices and staff exactly as they were.
import type { Berth, BerthType, Boat, BoatOwner, BoatType, Booking, BookingStatus, City, Contract, County, InventoryItem, Invoice, MaintenancePlan, MaintenanceTask, Marina, MeterReading, Staff, SystemUser, TimeEntry } from "./types";
import type { Db } from "./seed";
import { addDays, daysBetween, fromISO, today } from "./date";
import { bookingAmount } from "./pricing";
import { SERVICES } from "./actions";
import { SHIFT_START_HOUR } from "./shifts";
import { COUNTRIES, convert, localPrice, type CountryCode } from "./countries";

const COUNTIES: County[] = [
  { id: "c-dxb", name: "Dubai", nameAr: "دبي", state: "United Arab Emirates", country: "AE" },
  { id: "c-auh", name: "Abu Dhabi", nameAr: "أبوظبي", state: "United Arab Emirates", country: "AE" },
  { id: "c-shj", name: "Sharjah", nameAr: "الشارقة", state: "United Arab Emirates", country: "AE" },
  { id: "c-rak", name: "Ras Al Khaimah", nameAr: "رأس الخيمة", state: "United Arab Emirates", country: "AE" },
  { id: "c-mkh", name: "Makkah Province", nameAr: "منطقة مكة المكرمة", state: "Saudi Arabia", country: "SA" },
  { id: "c-est", name: "Eastern Province", nameAr: "المنطقة الشرقية", state: "Saudi Arabia", country: "SA" },
  { id: "c-doh", name: "Doha Municipality", nameAr: "بلدية الدوحة", state: "Qatar", country: "QA" },
  { id: "c-bcg", name: "Capital Governorate", nameAr: "محافظة العاصمة", state: "Bahrain", country: "BH" },
  { id: "c-mct", name: "Muscat Governorate", nameAr: "محافظة مسقط", state: "Oman", country: "OM" },
  { id: "c-kcg", name: "Capital Governorate", nameAr: "محافظة العاصمة", state: "Kuwait", country: "KW" },
];

const CITIES: City[] = [
  { id: "ct-dxb", name: "Dubai", nameAr: "دبي", countyId: "c-dxb", lat: 25.2048, lng: 55.2708 },
  { id: "ct-auh", name: "Abu Dhabi", nameAr: "أبوظبي", countyId: "c-auh", lat: 24.4539, lng: 54.3773 },
  { id: "ct-shj", name: "Sharjah", nameAr: "الشارقة", countyId: "c-shj", lat: 25.3463, lng: 55.4209 },
  { id: "ct-rak", name: "Ras Al Khaimah", nameAr: "رأس الخيمة", countyId: "c-rak", lat: 25.7895, lng: 55.9432 },
  { id: "ct-jed", name: "Jeddah", nameAr: "جدة", countyId: "c-mkh", lat: 21.4858, lng: 39.1925 },
  { id: "ct-khb", name: "Al Khobar", nameAr: "الخبر", countyId: "c-est", lat: 26.2172, lng: 50.1971 },
  { id: "ct-doh", name: "Doha", nameAr: "الدوحة", countyId: "c-doh", lat: 25.2854, lng: 51.531 },
  { id: "ct-mnm", name: "Manama", nameAr: "المنامة", countyId: "c-bcg", lat: 26.2285, lng: 50.586 },
  { id: "ct-mct", name: "Muscat", nameAr: "مسقط", countyId: "c-mct", lat: 23.588, lng: 58.3829 },
  { id: "ct-kwc", name: "Kuwait City", nameAr: "مدينة الكويت", countyId: "c-kcg", lat: 29.3759, lng: 47.9774 },
];

/** premium: how much more a berth costs than at a typical US marina, before converting to the local currency. */
const DEFS: { id: string; name: string; nameAr: string; cityId: string; country: CountryCode; phone: string; address: string; addressAr: string; lat: number; lng: number; berths: number; docks: string; premium: number }[] = [
  { id: "m-dxm", name: "Dubai Marina Moorings", nameAr: "مراسي دبي مارينا", cityId: "ct-dxb", country: "AE", phone: "+971 4 555 0141", address: "Marina Walk, Dubai Marina", addressAr: "ممشى المارينا، دبي مارينا", lat: 25.0784, lng: 55.1399, berths: 32, docks: "ABC", premium: 1.8 },
  { id: "m-dxc", name: "Creekside Harbour", nameAr: "ميناء ضفاف الخور", cityId: "ct-dxb", country: "AE", phone: "+971 4 555 0172", address: "Dubai Creek, Port Saeed", addressAr: "خور دبي، بور سعيد", lat: 25.2418, lng: 55.3327, berths: 24, docks: "AB", premium: 1.5 },
  { id: "m-auc", name: "Corniche Harbour", nameAr: "ميناء الكورنيش", cityId: "ct-auh", country: "AE", phone: "+971 2 555 0118", address: "Corniche Road West, Al Khalidiya", addressAr: "شارع الكورنيش الغربي، الخالدية", lat: 24.4795, lng: 54.3358, berths: 26, docks: "AB", premium: 1.5 },
  { id: "m-yas", name: "Yas Bay Moorings", nameAr: "مراسي خليج ياس", cityId: "ct-auh", country: "AE", phone: "+971 2 555 0190", address: "Yas Bay Waterfront, Yas Island", addressAr: "واجهة خليج ياس، جزيرة ياس", lat: 24.4639, lng: 54.6072, berths: 28, docks: "ABC", premium: 1.7 },
  { id: "m-shj", name: "Al Khan Lagoon Marina", nameAr: "مارينا بحيرة الخان", cityId: "ct-shj", country: "AE", phone: "+971 6 555 0133", address: "Al Khan Corniche, Al Khan", addressAr: "كورنيش الخان، الخان", lat: 25.3228, lng: 55.3712, berths: 20, docks: "AB", premium: 1.1 },
  { id: "m-rak", name: "Al Hamra Moorings", nameAr: "مراسي الحمراء", cityId: "ct-rak", country: "AE", phone: "+971 7 555 0126", address: "Al Hamra Village, Al Jazirah Al Hamra", addressAr: "قرية الحمراء، الجزيرة الحمراء", lat: 25.6895, lng: 55.7846, berths: 20, docks: "AB", premium: 1.2 },
  { id: "m-jed", name: "Obhur Creek Marina", nameAr: "مارينا شرم أبحر", cityId: "ct-jed", country: "SA", phone: "+966 12 555 0147", address: "Obhur Al Shamaliyah, North Obhur", addressAr: "أبحر الشمالية، شمال أبحر", lat: 21.7062, lng: 39.0981, berths: 30, docks: "ABC", premium: 1.3 },
  { id: "m-khb", name: "Khobar Corniche Marina", nameAr: "مارينا كورنيش الخبر", cityId: "ct-khb", country: "SA", phone: "+966 13 555 0164", address: "Prince Turki Street, Al Corniche", addressAr: "شارع الأمير تركي، الكورنيش", lat: 26.2958, lng: 50.2186, berths: 22, docks: "AB", premium: 1.1 },
  { id: "m-doh", name: "Pearl Island Moorings", nameAr: "مراسي جزيرة اللؤلؤة", cityId: "ct-doh", country: "QA", phone: "+974 4455 0182", address: "Porto Arabia, The Pearl Island", addressAr: "بورتو أرابيا، جزيرة اللؤلؤة", lat: 25.3693, lng: 51.5512, berths: 28, docks: "ABC", premium: 1.6 },
  { id: "m-mnm", name: "Manama Bay Marina", nameAr: "مارينا خليج المنامة", cityId: "ct-mnm", country: "BH", phone: "+973 1755 0129", address: "Bahrain Bay, Manama", addressAr: "خليج البحرين، المنامة", lat: 26.2443, lng: 50.5747, berths: 22, docks: "AB", premium: 1.2 },
  { id: "m-mct", name: "Sea of Oman Moorings", nameAr: "مراسي بحر عُمان", cityId: "ct-mct", country: "OM", phone: "+968 2455 0156", address: "Qantab Road, Al Bustan", addressAr: "طريق قنتب، البستان", lat: 23.5818, lng: 58.6059, berths: 22, docks: "AB", premium: 1.2 },
  { id: "m-kwt", name: "Sharq Harbour", nameAr: "ميناء شرق", cityId: "ct-kwc", country: "KW", phone: "+965 2255 0138", address: "Arabian Gulf Street, Sharq", addressAr: "شارع الخليج العربي، شرق", lat: 29.3858, lng: 47.9981, berths: 24, docks: "AB", premium: 1.3 },
];

const FIRST = ["Ahmed", "Fatima", "Khalid", "Noura", "Omar", "Layla", "Yousef", "Mariam", "Saeed", "Huda", "Rashid", "Aisha", "Faisal", "Reem", "Hamad", "Sara", "Tariq", "Lina", "Majid", "Dana", "Sultan", "Hessa", "Nasser", "Amal"];
const LAST = ["Al Mansoori", "Al Hashimi", "Al Suwaidi", "Al Qasimi", "Haddad", "Nasser", "Al Harthy", "Al Kuwari", "Al Mazrouei", "Al Ghamdi", "Al Otaibi", "Khoury", "Al Balushi", "Al Sabah", "Al Thani", "Al Dosari", "Farouk", "Al Zaabi"];
const BOAT_NAMES = ["Al Bahr", "Lulu", "Sea Falcon", "Nakheel", "Desert Wind", "Marjan", "Gulf Pearl", "Zayed Star", "Dhow Spirit", "Sandpiper", "Bahia", "Noor"];
const BOAT_TYPES: BoatType[] = ["Motor Yacht", "Motor Yacht", "Sailboat", "Catamaran", "Center Console"];
const PLATE: Record<CountryCode, string> = { US: "US", AE: "DXB", SA: "JED", QA: "DOH", BH: "BAH", OM: "MCT", KW: "KWT" };

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

/** A price in a currency, rounded the way it's usually quoted there (5s for dirhams and riyals, halves for dinars). */
function round(amount: number, currency: string) {
  const step = currency === "BHD" || currency === "OMR" || currency === "KWD" ? 0.5 : currency === "USD" ? 1 : 5;
  return Math.max(step, Math.round(amount / step) * step);
}

/** Adds the Gulf marinas, with their berths, boat owners, bookings, invoices, contracts, staff and supplies. */
export function withGulf(db: Db): Db {
  const r = rng(20261009);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const now = today();
  const currencyOf = (m: (typeof DEFS)[number]) => COUNTRIES[m.country].currency;

  const AMENITIES = ["Wi-Fi", "Shore power", "Fresh water", "Fuel dock", "Pump-out", "Showers", "Laundry", "Security", "Parking"];
  const marinas: Marina[] = DEFS.map((m) => ({
    id: m.id, name: m.name, nameAr: m.nameAr, cityId: m.cityId, phone: m.phone,
    email: `office@${m.name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
    address: m.address, addressAr: m.addressAr, lat: m.lat, lng: m.lng, status: "active",
    amenities: ["Shore power", "Fresh water", "Security", ...AMENITIES.filter((a) => !["Shore power", "Fresh water", "Security"].includes(a) && r() > 0.35)],
  }));

  const berths: Berth[] = [];
  for (const m of DEFS) {
    const cur = currencyOf(m);
    const docks = m.docks.split("");
    const perDock = Math.ceil(m.berths / docks.length);
    for (let i = 0; i < m.berths; i++) {
      const dock = docks[Math.floor(i / perDock)];
      const n = (i % perDock) + 1;
      const maxLength = pick([30, 35, 40, 45, 50, 60, 70, 80]);
      const type: BerthType = maxLength >= 50 ? "Floating" : pick(["Floating", "Fixed", "Floating", "Mooring"]);
      const usd = (maxLength * 1.3 + (type === "Mooring" ? -12 : 4)) * m.premium;
      const dailyRate = round(convert(usd, "USD", cur), cur);
      berths.push({
        id: `${m.id}-${dock}${n}`, marinaId: m.id, code: `${dock}-${String(n).padStart(2, "0")}`, maxLength, type,
        dailyRate, monthlyRate: round(dailyRate * 22, cur), power: type !== "Mooring", water: type !== "Mooring" || r() > 0.5, underMaintenance: false,
      });
    }
    const list = berths.filter((b) => b.marinaId === m.id);
    list[2].underMaintenance = true;
  }

  // Boat owners from around the region, each with one boat.
  const owners: BoatOwner[] = [];
  const boats: Boat[] = [];
  for (let i = 0; i < 90; i++) {
    const home = DEFS[i % DEFS.length];
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 5 + Math.floor(i / 24)) % LAST.length]}`;
    const id = `o-g${i + 1}`;
    owners.push({
      id, name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${i > 23 ? i : ""}@email.com`,
      phone: `${COUNTRIES[home.country].dial} 5${between(0, 9)} 555 ${String(1000 + i * 41).slice(-4)}`,
      since: addDays(now, -between(60, 1200)),
    });
    boats.push({
      id: `bt-g${i + 1}`, ownerId: id,
      name: `${BOAT_NAMES[i % BOAT_NAMES.length]}${i >= BOAT_NAMES.length ? ` ${["II", "III", "IV", "V", "VI", "VII", "VIII"][Math.floor(i / BOAT_NAMES.length) - 1]}` : ""}`,
      type: pick(BOAT_TYPES), length: pick([28, 32, 36, 40, 45, 52, 60, 68]),
      registration: `${PLATE[home.country]} ${10000 + between(0, 89999)}`,
    });
  }

  // Bookings: the same pattern as the US marinas (nightly and monthly stays, some on contracts).
  const boatCountry = new Map(boats.map((bt, i) => [bt.id, DEFS[i % DEFS.length].country]));
  const bookings: Booking[] = [];
  let seq = db.bookings.length + 1;
  const contractStays = new Map<string, "monthly" | "annual">();
  for (const [i, b] of berths.entries()) {
    const home = DEFS.find((m) => m.id === b.marinaId)!;
    // Mostly boats from the same country, sometimes a visitor from a neighbour.
    const local = boats.filter((bt) => bt.length <= b.maxLength && boatCountry.get(bt.id) === home.country);
    const fits = local.length > 3 ? local : boats.filter((bt) => bt.length <= b.maxLength);
    if (!fits.length) continue;
    if (i % 8 === 3 && !b.underMaintenance) {
      const term = i % 2 ? "annual" : "monthly";
      const end = addDays(now, between(1, term === "monthly" ? 25 : 70));
      const start = term === "monthly" ? addDays(end, -30) : addDays(end, -365);
      const id = `bk-${seq}`;
      bookings.push({ id, code: `BK-${String(seq).padStart(4, "0")}`, boatId: pick(fits).id, berthId: b.id, start, end, guests: between(1, 6), status: "checked-in", createdAt: addDays(start, -between(7, 30)) });
      contractStays.set(id, term);
      seq++;
      continue;
    }
    let cursor = addDays(now, -150 + between(0, 10));
    while (daysBetween(cursor, addDays(now, 60)) > 0) {
      const monthly = r() < 0.3;
      const nights = monthly ? between(28, 31) : between(2, 10);
      const start = cursor;
      const end = addDays(start, nights);
      if (b.underMaintenance && end > now && start <= addDays(now, 14)) {
        cursor = addDays(now, between(15, 20));
        continue;
      }
      let status: BookingStatus;
      if (r() < 0.06) status = "cancelled";
      else if (end <= now) status = "completed";
      else if (start <= now) status = "checked-in";
      else status = r() < 0.12 ? "pending" : "confirmed";
      bookings.push({ id: `bk-${seq}`, code: `BK-${String(seq).padStart(4, "0")}`, boatId: pick(fits).id, berthId: b.id, start, end, guests: between(1, 10), status, createdAt: addDays(start, -between(3, 40)) });
      seq++;
      cursor = addDays(end, status === "cancelled" ? 0 : between(0, 6));
    }
  }

  // Invoices in each marina's currency, with fuel, pump-outs and ice priced locally.
  const berthById = new Map(berths.map((b) => [b.id, b]));
  const curOfBerth = (berthId: string) => currencyOf(DEFS.find((m) => m.id === berthById.get(berthId)!.marinaId)!);
  const invoices: Invoice[] = [];
  let inv = db.invoices.length + 1;
  for (const bk of bookings) {
    if (bk.status === "cancelled" || bk.status === "pending") continue;
    const cur = curOfBerth(bk.berthId);
    const issued = bk.start <= now ? bk.start : bk.createdAt;
    const due = addDays(issued, 14);
    let status: Invoice["status"];
    if (bk.status === "completed") status = r() < 0.05 && due < now ? "overdue" : "paid";
    else if (due < now) status = r() < 0.85 ? "paid" : "overdue";
    else status = r() < 0.4 ? "paid" : "due";
    const invoice: Invoice = {
      id: `inv-${inv}`, number: `INV-${String(10000 + inv)}`, bookingId: bk.id, issued, due,
      amount: bookingAmount(bk.start, bk.end, berthById.get(bk.berthId)!),
      status,
      paidAt: status === "paid" ? (due < now ? addDays(issued, between(0, 13)) : issued) : undefined,
      method: status === "paid" ? pick(["Card", "Card", "Card", "Bank transfer", "Cash"] as const) : undefined,
      reminders: status === "overdue" ? [addDays(due, 3) < now ? addDays(due, 3) : now] : [],
      payments: [],
    };
    if (bk.start <= now && bk.start >= addDays(now, -100) && daysBetween(bk.start, bk.end) < 28 && r() < 0.35) {
      const svc = pick([SERVICES[0], SERVICES[1], SERVICES[1], SERVICES[2], SERVICES[3]]);
      const qty = svc.unit === "gal" ? between(6, 30) * 5 : between(1, 3);
      const unitPrice = localPrice(svc.price, cur);
      const at = new Date(fromISO(addDays(bk.start, between(0, Math.max(0, Math.min(daysBetween(bk.start, bk.end), daysBetween(bk.start, now)) - 1)))).getTime() + 10 * 3_600_000).toISOString();
      const amount = Math.round(qty * unitPrice * 1000) / 1000;
      invoice.lines = [{ label: svc.label, qty, unit: svc.unit, unitPrice, amount, at, by: "Fuel dock" }];
      invoice.amount = Math.round((invoice.amount + amount) * 1000) / 1000;
    }
    if (invoice.status === "paid") invoice.payments = [{ date: invoice.paidAt!, amount: invoice.amount, method: invoice.method! }];
    invoices.push(invoice);
    inv++;
  }

  // Long stays on contracts.
  const contracts: Contract[] = bookings.filter((b) => contractStays.has(b.id)).map((b, i) => {
    const berth = berthById.get(b.berthId)!;
    const boat = boats.find((x) => x.id === b.boatId)!;
    const annual = contractStays.get(b.id) === "annual";
    const n = db.contracts.length + i + 1;
    return { id: `ct-${n}`, code: `CT-${String(n).padStart(3, "0")}`, ownerId: boat.ownerId, boatId: b.boatId, berthId: b.berthId, marinaId: berth.marinaId, term: annual ? "annual" : "monthly", start: b.start, end: b.end, monthlyFee: annual ? round(berth.monthlyRate * 0.9, curOfBerth(b.berthId)) : berth.monthlyRate, autoRenew: i % 3 !== 0, status: "active", bookingId: b.id, createdAt: b.createdAt };
  });

  // Four people at each marina, and a manager account for each.
  const POSITIONS: [string, Staff["department"]][] = [["Marina Manager", "Operations"], ["Dock Hand", "Maintenance"], ["Front Desk Associate", "Front Desk"], ["Security Guard", "Security"]];
  const SHIFTS: Staff["shift"][] = ["Morning", "Day", "Evening", "Night"];
  const staff: Staff[] = [];
  let si = 0;
  for (const m of DEFS) {
    for (let k = 0; k < 4; k++) {
      const [position, department] = POSITIONS[k];
      const name = `${FIRST[(si * 7 + 3) % FIRST.length]} ${LAST[(si * 11 + 2) % LAST.length]}`;
      staff.push({
        id: `s-${db.staff.length + si + 1}`, name, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@marinaops.com`,
        phone: `${COUNTRIES[m.country].dial} 5${k} 555 ${String(3000 + si * 37).slice(-4)}`,
        position, department, marinaId: m.id, status: "active", shift: k === 0 ? "Day" : SHIFTS[(si + k) % 4],
        // The working week here is Sunday to Thursday: Friday and Saturday off.
        daysOff: k % 2 ? [5, 6] : [[5, 6], [4, 5], [6, 0]][si % 3], hired: addDays(now, -between(120, 1800)),
      });
      si++;
    }
  }
  const users: SystemUser[] = staff.filter((s) => s.position === "Marina Manager").map((s, i) => ({
    id: `u-g${i + 1}`, name: s.name, email: s.email, role: "manager", marinaIds: [s.marinaId], lastActive: addDays(now, -(i % 5)), status: "active",
  }));

  // Clock-ins for the last two weeks, so hours and payroll have numbers.
  const timeEntries: TimeEntry[] = [];
  for (const st of staff) {
    for (let back = 14; back >= 1; back--) {
      const d = addDays(now, -back);
      if (st.daysOff.includes(fromISO(d).getDay())) continue;
      const startMin = SHIFT_START_HOUR[st.shift] * 60 - 10 + between(0, 15);
      const length = 8 * 60 + between(-20, st.position === "Marina Manager" ? 90 : 35);
      const base = fromISO(d).getTime();
      timeEntries.push({ id: `te-g${timeEntries.length + 1}`, staffId: st.id, marinaId: st.marinaId, start: new Date(base + startMin * 60_000).toISOString(), end: new Date(base + (startMin + length) * 60_000).toISOString() });
    }
  }

  // Work orders for berths under repair, routine jobs, parts in local prices, last month's meters.
  const tasks: MaintenanceTask[] = berths.filter((b) => b.underMaintenance).map((b, i) => {
    const n = db.tasks.length + i + 1;
    const hand = staff.find((s) => s.marinaId === b.marinaId && s.department === "Maintenance");
    return {
      id: `t-${n}`, code: `WO-${String(n).padStart(3, "0")}`, title: pick(["Repair shore power pedestal", "Replace dock boards", "Fix water line leak", "Replace dock lighting"]),
      marinaId: b.marinaId, berthId: b.id, assigneeId: hand?.id, priority: i % 3 ? "high" : "medium", status: i % 2 ? "in-progress" : "open",
      created: addDays(now, -between(1, 8)), due: addDays(now, between(1, 7)), notes: [{ at: addDays(now, -1), by: hand?.name ?? "Dock team", text: "Parts ordered, berth closed to boats until repaired." }],
    };
  });
  const PARTS: [string, string, number, number][] = [
    ["Dock cleat, 10 in", "each", 18, 4], ["Dock line, 25 ft", "each", 24, 6], ["Fender, medium", "each", 32, 4], ["Shore power cord, 30 A", "each", 120, 2],
    ["Pedestal fuse, 30 A", "each", 9, 10], ["Hose fitting", "each", 6, 10], ["Deck screws", "box", 14, 3], ["Marine epoxy kit", "kit", 38, 2], ["Dock light bulb", "each", 11, 8],
  ];
  const inventory: InventoryItem[] = DEFS.flatMap((m, i) =>
    PARTS.map(([name, unit, cost, reorder], k) => ({ id: `inv-${m.id}-${k + 1}`, marinaId: m.id, name, unit, unitCost: localPrice(cost, currencyOf(m)), reorderAt: reorder, qty: Math.max(0, reorder + between(-3, 14) - ((i + k) % 6 === 0 ? reorder : 0)) })),
  );
  const maintenancePlans: MaintenancePlan[] = DEFS.flatMap((m, i) => {
    const hand = staff.find((st) => st.marinaId === m.id && st.position === "Dock Hand");
    return [
      { id: `mp-g${i * 2 + 1}`, marinaId: m.id, title: "Clean pump-out station", every: "week" as const, nextDue: addDays(now, 1 + (i % 6)), priority: "low" as const, assigneeId: hand?.id, active: true },
      { id: `mp-g${i * 2 + 2}`, marinaId: m.id, title: "Inspect pilings and cleats", every: "month" as const, nextDue: addDays(now, 10 + (i % 8)), priority: "medium" as const, assigneeId: hand?.id, active: true },
    ];
  });
  const meterReadings: MeterReading[] = [];
  for (const b of berths) {
    const at = new Date(fromISO(addDays(now, -between(20, 30))).getTime() + 9 * 3_600_000).toISOString();
    if (b.power) meterReadings.push({ id: `mr-g${meterReadings.length + 1}`, berthId: b.id, kind: "power", value: between(2000, 14000), at, by: "Dock team" });
    if (b.water) meterReadings.push({ id: `mr-g${meterReadings.length + 1}`, berthId: b.id, kind: "water", value: between(4000, 40000), at, by: "Dock team" });
  }

  return {
    ...db,
    counties: [...db.counties, ...COUNTIES],
    cities: [...db.cities, ...CITIES],
    marinas: [...db.marinas, ...marinas],
    berths: [...db.berths, ...berths],
    owners: [...db.owners, ...owners],
    boats: [...db.boats, ...boats],
    bookings: [...db.bookings, ...bookings],
    invoices: [...db.invoices, ...invoices],
    contracts: [...db.contracts, ...contracts],
    staff: [...db.staff, ...staff],
    users: [...db.users, ...users],
    timeEntries: [...db.timeEntries, ...timeEntries],
    tasks: [...db.tasks, ...tasks],
    inventory: [...db.inventory, ...inventory],
    maintenancePlans: [...db.maintenancePlans, ...maintenancePlans],
    meterReadings: [...db.meterReadings, ...meterReadings],
  };
}
