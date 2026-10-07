export type ID = string;

export interface County {
  id: ID;
  name: string;
  state: string;
}

export interface City {
  id: ID;
  name: string;
  countyId: ID;
  lat: number;
  lng: number;
}

export type MarinaStatus = "active" | "inactive";

export interface Marina {
  id: ID;
  name: string;
  cityId: ID;
  phone: string;
  email: string;
  address: string;
  status: MarinaStatus;
  amenities: string[];
}

export type BerthType = "Floating" | "Fixed" | "Mooring";

export interface Berth {
  id: ID;
  marinaId: ID;
  code: string;
  maxLength: number;
  type: BerthType;
  dailyRate: number;
  monthlyRate: number;
  power: boolean;
  water: boolean;
  underMaintenance: boolean;
}

export interface BoatOwner {
  id: ID;
  name: string;
  email: string;
  phone: string;
  since: string;
}

export type BoatType = "Sailboat" | "Motor Yacht" | "Catamaran" | "Center Console" | "Trawler";

export interface Boat {
  id: ID;
  ownerId: ID;
  name: string;
  type: BoatType;
  length: number;
  registration: string;
}

export type BookingStatus = "pending" | "confirmed" | "checked-in" | "completed" | "cancelled";

export interface Booking {
  id: ID;
  code: string;
  boatId: ID;
  berthId: ID;
  start: string; // ISO date
  end: string; // ISO date (checkout day, exclusive)
  guests: number;
  status: BookingStatus;
  createdAt: string;
  /** Price agreed when booked (with the pricing rules in force then). Older bookings work it out from the berth's rates. */
  price?: number;
  /** Berth checks done before arrival (staff app). */
  prep?: { done: string[]; by: string; at: string };
  /** Check-in record: boat condition, photos and the owner's signature (staff app). */
  arrival?: ArrivalRecord;
}

export type BoatCondition = "good" | "marks" | "damage";

export interface ArrivalRecord {
  condition: BoatCondition;
  notes: string;
  photos: string[];
  /** Signature strokes as an SVG path, drawn in a box of w × h points. */
  signature?: { d: string; w: number; h: number };
  signedBy?: string;
  /** Owner wasn't there to sign. */
  unsigned?: boolean;
  by: string;
  at: string;
}

export type StaffStatus = "active" | "on-leave";
export type Shift = "Morning" | "Day" | "Evening" | "Night";

export interface Staff {
  id: ID;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: "Operations" | "Maintenance" | "Front Desk" | "Security";
  marinaId: ID;
  status: StaffStatus;
  shift: Shift;
  /** Days of the week off, 0 = Sunday */
  daysOff: number[];
  hired: string;
  /** Pay per hour for payroll. Defaults by position when not set. */
  hourlyRate?: number;
}

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "open" | "in-progress" | "done";

export interface MaintenanceTask {
  id: ID;
  code: string;
  title: string;
  marinaId: ID;
  berthId?: ID;
  assigneeId?: ID;
  priority: Priority;
  status: TaskStatus;
  created: string;
  due: string;
  notes: { at: string; by: string; text: string }[];
  /** Small compressed photos (data URLs) taken from the staff app. */
  photos?: string[];
  /** Day the work order was marked done. */
  doneAt?: string;
  /** The recurring plan that created it. */
  planId?: ID;
  /** Parts and supplies used on the job. */
  parts?: { itemId: ID; qty: number }[];
}

/** A part or supply kept in stock at a marina. */
export interface InventoryItem {
  id: ID;
  marinaId: ID;
  name: string;
  unit: string;
  qty: number;
  /** Flag for reordering at or below this. */
  reorderAt: number;
  unitCost: number;
}

export type Recurrence = "week" | "month" | "quarter";

/** Maintenance that repeats (weekly pump-out cleaning, monthly piling checks). */
export interface MaintenancePlan {
  id: ID;
  marinaId: ID;
  title: string;
  berthId?: ID;
  every: Recurrence;
  /** Due date of the next work order. */
  nextDue: string;
  priority: Priority;
  assigneeId?: ID;
  active: boolean;
}

export type InvoiceStatus = "paid" | "due" | "overdue" | "void";

export interface Invoice {
  id: ID;
  number: string;
  bookingId: ID;
  issued: string;
  due: string;
  amount: number;
  status: InvoiceStatus;
  paidAt?: string;
  method?: PaymentMethod;
  reminders: string[];
  /** Payments received. The invoice is paid when they add up to the amount. */
  payments: Payment[];
  /** Extra charges added during the stay (fuel, pump-out…). Included in `amount`. */
  lines?: InvoiceLine[];
}

export interface InvoiceLine {
  label: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  at: string; // ISO date-time
  by: string;
}

export interface Payment {
  date: string;
  amount: number;
  method: PaymentMethod;
}

export type PaymentMethod = "Card" | "Bank transfer" | "Cash" | "Check";

export type Role = "admin" | "manager" | "staff";

export interface SystemUser {
  id: ID;
  name: string;
  email: string;
  role: Role;
  marinaIds: ID[]; // empty = all marinas
  lastActive: string;
  status: "active" | "invited" | "disabled";
}

export interface Activity {
  id: ID;
  at: string; // ISO date-time
  by: string;
  text: string;
  to?: string;
  /** Marina the change belongs to, so managers only see their own marinas' activity. */
  marinaId?: ID;
  /** What changed, field by field (before → after). */
  changes?: import("./audit").FieldChange[];
}

export interface Message {
  id: ID;
  at: string;
  to: string;
  subject: string;
  kind: "reminder" | "invite" | "confirmation" | "offer";
  ref?: ID;
}

export interface Settings {
  company: string;
  currency: "USD" | "CAD" | "EUR" | "GBP";
  timezone: string;
  invoiceDueDays: number;
  monthlyFromNights: number;
  notify: { pending: boolean; overdue: boolean; maintenance: boolean; digest: boolean };
  permissions: import("./permissions").Permissions;
  pricing?: import("./pricing").PricingRules;
  /** Utility rates for metered berths. */
  utilities?: { powerPerKwh: number; waterPerGallon: number };
  /** Reports emailed on a schedule (sent once the app has a server). */
  reportSchedules?: ReportSchedule[];
  /** The company's own logo and colour on invoices, PDF reports and emails. */
  branding?: { logo?: string; color?: string; invoiceFooter?: string };
}

export interface ReportSchedule {
  id: ID;
  report: string;
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  createdBy: string;
}

/** A clock-in / clock-out pair from the staff app. `end` is empty while clocked in. */
export interface TimeEntry {
  id: ID;
  staffId: ID;
  marinaId: ID;
  start: string; // ISO date-time
  end?: string; // ISO date-time
}

export type RequestKind = "leave" | "swap";
export type RequestStatus = "pending" | "approved" | "declined";

/** Time off or a shift swap, sent from the staff app and decided by a manager. */
export interface StaffRequest {
  id: ID;
  staffId: ID;
  kind: RequestKind;
  start: string; // ISO date
  end: string; // ISO date, last day (inclusive). Same as start for a swap.
  /** Colleague who covers the shift (swaps only). */
  swapWithId?: ID;
  reason: string;
  status: RequestStatus;
  createdAt: string; // ISO date-time
  decidedBy?: string;
  decidedAt?: string;
}

/** One message in the conversation between a staff member and their marina's managers. */
export interface ChatMessage {
  id: ID;
  /** The staff member whose conversation this belongs to. */
  staffId: ID;
  fromStaff: boolean;
  by: string;
  text: string;
  at: string; // ISO date-time
  /** Read by the other side. */
  read: boolean;
  /** Sent to everyone at a marina at once (an announcement). */
  broadcast?: boolean;
}

/** A note for the next shift at a marina. */
export interface Handover {
  id: ID;
  marinaId: ID;
  text: string;
  by: string;
  shift?: Shift;
  at: string; // ISO date-time
}

/** One stop on a dock patrol: checked by scanning a berth label on that dock, or by hand. */
export interface PatrolCheck {
  id: string; // checkpoint id, e.g. "dock-A" or "safety-lights"
  at: string;
  ok: boolean;
  note?: string;
  scanned?: boolean;
}

/** A dock patrol round and its safety checklist. */
export interface Patrol {
  id: ID;
  marinaId: ID;
  staffId: ID;
  by: string;
  startedAt: string;
  endedAt?: string;
  checks: PatrolCheck[];
}

export type WaitlistStatus = "waiting" | "offered" | "booked" | "removed";

/** A boat owner waiting for a berth at a full marina. */
export interface WaitlistEntry {
  id: ID;
  marinaId: ID;
  name: string;
  email: string;
  phone: string;
  boatName: string;
  boatLength: number;
  start: string;
  end: string;
  note?: string;
  status: WaitlistStatus;
  createdAt: string;
  /** Berth offered to them, when status is offered. */
  offeredBerthId?: ID;
  bookingId?: ID;
}

export type ContractTerm = "monthly" | "seasonal" | "annual";

/** A long-term berth agreement. It holds the berth through a booking for the whole term. */
export interface Contract {
  id: ID;
  code: string;
  ownerId: ID;
  boatId: ID;
  berthId: ID;
  marinaId: ID;
  term: ContractTerm;
  start: string;
  end: string; // exclusive, like bookings
  monthlyFee: number;
  autoRenew: boolean;
  status: "active" | "ended" | "cancelled";
  bookingId: ID;
  createdAt: string;
  /** The contract this one renewed. */
  renewedFromId?: ID;
}

export type MeterKind = "power" | "water";

/** A meter reading on a berth's pedestal. Usage since the last reading is billed to the boat there. */
export interface MeterReading {
  id: ID;
  berthId: ID;
  kind: MeterKind;
  /** Meter value: kWh for power, gallons for water. */
  value: number;
  at: string; // ISO date-time
  by: string;
  /** Amount charged to the stay's invoice for this reading. */
  charged?: number;
  bookingId?: ID;
}

/** A manager's sign-off on someone's hours for a week (Sunday start). */
export interface TimesheetApproval {
  id: ID;
  staffId: ID;
  weekStart: string;
  minutes: number;
  approvedBy: string;
  at: string;
}
