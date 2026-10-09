-- Core schema: one table per collection of the app's data (packages/shared/src/backend.ts maps
-- records to rows). Ids are the app's own text ids ("m-gg", "bk-0417"), so records keep their ids.
-- Nested data the app shapes itself (payments, notes, check-in records) is jsonb.

-- ---- Locations and marinas -----------------------------------------------------------------

create table counties (
  id text primary key,
  name text not null,
  state text not null,
  country text,
  name_ar text
);

create table cities (
  id text primary key,
  name text not null,
  county_id text not null references counties (id),
  lat double precision not null,
  lng double precision not null,
  name_ar text
);

create table marinas (
  id text primary key,
  name text not null,
  city_id text not null references cities (id),
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  status text not null default 'active' check (status in ('active', 'inactive')),
  amenities text[] not null default '{}',
  name_ar text,
  address_ar text
);

create table berths (
  id text primary key,
  marina_id text not null references marinas (id),
  code text not null,
  max_length numeric not null,
  type text not null,
  daily_rate numeric not null,
  monthly_rate numeric not null,
  power boolean not null default false,
  water boolean not null default false,
  under_maintenance boolean not null default false
);
create index berths_marina_id on berths (marina_id);

-- ---- Boat owners, boats, bookings, invoices, contracts ---------------------------------------

create table boat_owners (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  since date not null
);

create table boats (
  id text primary key,
  owner_id text not null references boat_owners (id),
  name text not null,
  type text not null,
  length numeric not null,
  registration text not null default ''
);
create index boats_owner_id on boats (owner_id);

create table bookings (
  id text primary key,
  code text not null,
  boat_id text not null references boats (id),
  berth_id text not null references berths (id),
  start date not null,
  "end" date not null,
  guests integer not null default 1,
  status text not null check (status in ('pending', 'confirmed', 'checked-in', 'completed', 'cancelled')),
  created_at text not null,
  price numeric,
  prep jsonb,
  arrival jsonb,
  check ("end" > start)
);
create index bookings_berth_id on bookings (berth_id);
create index bookings_boat_id on bookings (boat_id);
create index bookings_dates on bookings (start, "end");

create table invoices (
  id text primary key,
  number text not null,
  booking_id text not null references bookings (id),
  issued date not null,
  due date not null,
  amount numeric not null,
  status text not null check (status in ('paid', 'due', 'overdue', 'void')),
  paid_at text,
  method text,
  reminders text[] not null default '{}',
  payments jsonb not null default '[]',
  lines jsonb
);
create index invoices_booking_id on invoices (booking_id);

create table contracts (
  id text primary key,
  code text not null,
  owner_id text not null references boat_owners (id),
  boat_id text not null references boats (id),
  berth_id text not null references berths (id),
  marina_id text not null references marinas (id),
  term text not null check (term in ('monthly', 'seasonal', 'annual')),
  start date not null,
  "end" date not null,
  monthly_fee numeric not null,
  auto_renew boolean not null default false,
  status text not null check (status in ('active', 'ended', 'cancelled')),
  booking_id text not null references bookings (id),
  created_at text not null,
  renewed_from_id text,
  signed jsonb
);
create index contracts_marina_id on contracts (marina_id);

create table waitlist_entries (
  id text primary key,
  marina_id text not null references marinas (id),
  name text not null,
  email text not null,
  phone text not null default '',
  boat_name text not null,
  boat_length numeric not null,
  start date not null,
  "end" date not null,
  note text,
  status text not null check (status in ('waiting', 'offered', 'booked', 'removed')),
  created_at text not null,
  offered_berth_id text,
  booking_id text
);

-- ---- People: sign-in accounts and staff -------------------------------------------------------

-- Who can sign in to the web and staff apps, their role and the marinas they look after
-- (empty = all). Linked to Supabase Auth by email (see the access migration).
create table app_users (
  id text primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'staff')),
  marina_ids text[] not null default '{}',
  last_active text not null default '',
  status text not null default 'active' check (status in ('active', 'invited', 'disabled'))
);
create unique index app_users_email on app_users (lower(email));

create table staff (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  position text not null,
  department text not null,
  marina_id text not null references marinas (id),
  status text not null check (status in ('active', 'on-leave')),
  shift text not null,
  days_off integer[] not null default '{}',
  hired date not null,
  hourly_rate numeric
);
create index staff_marina_id on staff (marina_id);

create table time_entries (
  id text primary key,
  staff_id text not null,
  marina_id text not null,
  start timestamptz not null,
  "end" timestamptz
);
create index time_entries_staff_id on time_entries (staff_id);

create table staff_requests (
  id text primary key,
  staff_id text not null,
  kind text not null check (kind in ('leave', 'swap')),
  start date not null,
  "end" date not null,
  swap_with_id text,
  reason text not null default '',
  status text not null check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null,
  decided_by text,
  decided_at timestamptz
);

create table timesheet_approvals (
  id text primary key,
  staff_id text not null,
  week_start date not null,
  minutes integer not null,
  approved_by text not null,
  at timestamptz not null
);

create table chat_messages (
  id text primary key,
  staff_id text not null,
  from_staff boolean not null,
  by text not null,
  text text not null,
  at timestamptz not null,
  read boolean not null default false,
  broadcast boolean
);
create index chat_messages_staff_id on chat_messages (staff_id);

create table handovers (
  id text primary key,
  marina_id text not null,
  text text not null,
  by text not null,
  shift text,
  at timestamptz not null
);

create table patrols (
  id text primary key,
  marina_id text not null,
  staff_id text not null,
  by text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  checks jsonb not null default '[]'
);

-- ---- Maintenance, meters, incidents -------------------------------------------------------------

create table maintenance_tasks (
  id text primary key,
  code text not null,
  title text not null,
  marina_id text not null references marinas (id),
  berth_id text,
  assignee_id text,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null check (status in ('open', 'in-progress', 'done')),
  created text not null,
  due date not null,
  notes jsonb not null default '[]',
  photos text[],
  done_at text,
  plan_id text,
  parts jsonb
);
create index maintenance_tasks_marina_id on maintenance_tasks (marina_id);

create table maintenance_plans (
  id text primary key,
  marina_id text not null references marinas (id),
  title text not null,
  berth_id text,
  every text not null check (every in ('week', 'month', 'quarter')),
  next_due date not null,
  priority text not null,
  assignee_id text,
  active boolean not null default true
);

create table inventory_items (
  id text primary key,
  marina_id text not null references marinas (id),
  name text not null,
  unit text not null,
  qty numeric not null default 0,
  reorder_at numeric not null default 0,
  unit_cost numeric not null default 0
);

create table meter_readings (
  id text primary key,
  berth_id text not null,
  kind text not null check (kind in ('power', 'water')),
  value numeric not null,
  at timestamptz not null,
  by text not null,
  charged numeric,
  booking_id text
);
create index meter_readings_berth_id on meter_readings (berth_id);

create table incidents (
  id text primary key,
  code text not null,
  marina_id text not null references marinas (id),
  kind text not null check (kind in ('damage', 'injury', 'theft', 'spill', 'other')),
  serious boolean not null default false,
  at timestamptz not null,
  berth_id text,
  description text not null,
  people text,
  photos text[],
  reported_by text not null,
  reported_at timestamptz not null,
  status text not null check (status in ('open', 'investigating', 'closed')),
  notes jsonb not null default '[]',
  outcome text
);

-- ---- Activity log, messages, settings ------------------------------------------------------------

create table activity_log (
  id text primary key,
  at timestamptz not null default now(),
  by text not null,
  text text not null,
  "to" text,
  marina_id text,
  changes jsonb
);
create index activity_log_at on activity_log (at desc);

create table messages (
  id text primary key,
  at text not null,
  "to" text not null,
  subject text not null,
  kind text not null,
  ref text
);

-- Company settings (currency, time zone, pricing rules, permissions…): one row, as the app shapes it.
create table settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null
);
