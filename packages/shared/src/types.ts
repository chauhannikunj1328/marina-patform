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
}

export interface Message {
  id: ID;
  at: string;
  to: string;
  subject: string;
  kind: "reminder" | "invite" | "confirmation";
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
}
