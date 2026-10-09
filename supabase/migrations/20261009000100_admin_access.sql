-- Who can read and change what (row-level security). Phase 1 is admins only: an active admin can
-- read and change everything; everyone else can read their own account and nothing more. Managers
-- (their marinas), staff and boat owners get their own policies in later migrations.
--
-- A signed-in person is matched to their app_users row by the email they signed in with
-- (Supabase Auth puts it in the token).

create function public.signed_in_email() returns text
language sql stable
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- True for an active admin. Security definer so it can read app_users under row-level security.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from app_users
    where lower(email) = public.signed_in_email() and role = 'admin' and status = 'active'
  )
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Signed-in users only; nothing is open to visitors (anon) yet.
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

do $$
declare
  t text;
begin
  foreach t in array array[
    'counties', 'cities', 'marinas', 'berths', 'boat_owners', 'boats', 'bookings', 'invoices', 'contracts',
    'waitlist_entries', 'app_users', 'staff', 'time_entries', 'staff_requests', 'timesheet_approvals',
    'chat_messages', 'handovers', 'patrols', 'maintenance_tasks', 'maintenance_plans', 'inventory_items',
    'meter_readings', 'incidents', 'activity_log', 'messages', 'settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Admins can do everything" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Anyone signed in can see their own account, so the app can tell them their role or status.
create policy "People can read their own account" on public.app_users
  for select to authenticated
  using (lower(email) = public.signed_in_email());
