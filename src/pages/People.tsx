import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ban, CalendarPlus, MailPlus, Pencil, Plus, RotateCcw, Sailboat, UserPlus, Users } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { Boat, BoatOwner, BoatType, Role, SystemUser } from "@/data/types";
import { withMessage } from "@/data/actions";
import { fmtDate, relative, today } from "@/lib/date";
import { money } from "@/lib/format";
import { Avatar, Badge, Button, Card, Field, IconButton, Input, Modal, PageHeader, Pagination, paginate, SearchInput, Select, StatCard, Table, Tabs, Toolbar, useDirty, useSort } from "@/components/ui";
import { ActiveBadge, BookingBadge, InvoiceBadge } from "@/components/status";

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", manager: "Marina manager", staff: "Staff" };
const BOAT_TYPES: BoatType[] = ["Sailboat", "Motor Yacht", "Catamaran", "Center Console", "Trawler"];
const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s);

function OwnerForm({ owner, onClose, onSaved }: { owner?: BoatOwner; onClose: () => void; onSaved?: (id: string) => void }) {
  const { db, update, toast } = useStore();
  const [f, setF] = useState({ name: owner?.name ?? "", email: owner?.email ?? "", phone: owner?.phone ?? "", boat: "", type: "Sailboat" as BoatType, length: "32", registration: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Enter the owner's name.";
    if (!isEmail(f.email)) e.email = "Enter a valid email.";
    else if (db.owners.some((o) => o.email.toLowerCase() === f.email.trim().toLowerCase() && o.id !== owner?.id)) e.email = "Another owner already uses this email.";
    if (!owner) {
      if (!f.boat.trim()) e.boat = "Enter the boat name.";
      if (!(Number(f.length) >= 10)) e.length = "Enter the length in feet.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = owner?.id ?? nextId("o", db.owners);
    update((d) => {
      if (owner) return { ...d, owners: d.owners.map((o) => (o.id === owner.id ? { ...o, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() } : o)) };
      return {
        ...d,
        owners: [...d.owners, { id, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), since: today() }],
        boats: [...d.boats, { id: nextId("bt", d.boats), ownerId: id, name: f.boat.trim(), type: f.type, length: Number(f.length), registration: f.registration.trim() || "Pending" }],
      };
    }, { text: `${owner ? "Updated" : "Added"} boat owner ${f.name.trim()}`, to: `/users?owner=${id}` });
    toast(owner ? `${f.name} updated` : `${f.name} added`);
    onSaved?.(id);
    onClose();
  };
  return (
    <Modal open dirty={dirty} onClose={onClose} title={owner ? `Edit ${owner.name}` : "Add boat owner"} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{owner ? "Save changes" : "Add owner"}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Full name" error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field></div>
        <Field label="Email" error={errors.email}>{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}</Field>
        {!owner && (
          <>
            <p className="pt-2 text-[13px] font-semibold sm:col-span-2">First boat</p>
            <Field label="Boat name" error={errors.boat}>{(id) => <Input id={id} value={f.boat} onChange={(e) => setF({ ...f, boat: e.target.value })} />}</Field>
            <Field label="Registration">{(id) => <Input id={id} value={f.registration} onChange={(e) => setF({ ...f, registration: e.target.value })} placeholder="Optional" />}</Field>
            <Field label="Type">{(id) => <Select id={id} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as BoatType })}>{BOAT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
            <Field label="Length (ft)" error={errors.length}>{(id) => <Input id={id} type="number" min={10} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} />}</Field>
          </>
        )}
      </div>
    </Modal>
  );
}

function BoatForm({ ownerId, boat, onClose }: { ownerId: string; boat?: Boat; onClose: () => void }) {
  const { update, toast } = useStore();
  const [f, setF] = useState({ name: boat?.name ?? "", type: boat?.type ?? ("Sailboat" as BoatType), length: String(boat?.length ?? 32), registration: boat?.registration ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Enter the boat name.";
    if (!(Number(f.length) >= 10 && Number(f.length) <= 300)) e.length = "Enter a length between 10 and 300 ft.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { name: f.name.trim(), type: f.type, length: Number(f.length), registration: f.registration.trim() || "Pending" };
    update((d) => (boat ? { ...d, boats: d.boats.map((b) => (b.id === boat.id ? { ...b, ...data } : b)) } : { ...d, boats: [...d.boats, { ...data, id: nextId("bt", d.boats), ownerId }] }), `${boat ? "Updated" : "Added"} boat ${data.name}`);
    toast(boat ? `${data.name} updated` : `${data.name} added`);
    onClose();
  };
  return (
    <Modal open dirty={dirty} onClose={onClose} title={boat ? `Edit ${boat.name}` : "Add boat"} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{boat ? "Save changes" : "Add boat"}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Boat name" error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Registration">{(id) => <Input id={id} value={f.registration} onChange={(e) => setF({ ...f, registration: e.target.value })} />}</Field>
        <Field label="Type">{(id) => <Select id={id} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as BoatType })}>{BOAT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
        <Field label="Length (ft)" error={errors.length}>{(id) => <Input id={id} type="number" value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

function OwnerDetail({ owner, onClose }: { owner: BoatOwner; onClose: () => void }) {
  const { db, ix, scope, user } = useStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [boatForm, setBoatForm] = useState<Boat | "new" | undefined>();
  const o = db.owners.find((x) => x.id === owner.id) ?? owner;
  const boats = db.boats.filter((b) => b.ownerId === o.id);
  // Managers only see stays at their own marinas.
  const bookings = db.bookings
    .filter((b) => boats.some((bt) => bt.id === b.boatId) && (user?.role === "admin" || scope.includes(ix.berth(b.berthId)?.marinaId ?? "")))
    .sort((a, b) => b.start.localeCompare(a.start));
  const spent = bookings.filter((b) => b.status !== "cancelled" && b.status !== "pending").reduce((s, b) => s + ix.amount(b), 0);
  const invoices = db.invoices.filter((i) => bookings.some((b) => b.id === i.bookingId));
  const owed = invoices.filter((i) => i.status === "due" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  if (editing) return <OwnerForm owner={o} onClose={() => setEditing(false)} />;
  if (boatForm) return <BoatForm ownerId={o.id} boat={boatForm === "new" ? undefined : boatForm} onClose={() => setBoatForm(undefined)} />;

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={o.name}
      description={`${o.email}${o.phone ? ` · ${o.phone}` : ""} · customer since ${fmtDate(o.since)}`}
      footer={
        <>
          <Button icon={Pencil} onClick={() => setEditing(true)}>Edit owner</Button>
          <Button variant="primary" icon={CalendarPlus} onClick={() => navigate("/bookings?new=1")}>New booking</Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Boats</p><p className="text-lg font-semibold">{boats.length}</p></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Bookings</p><p className="text-lg font-semibold">{bookings.length}</p></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Lifetime value</p><p className="text-lg font-semibold">{money(spent)}</p></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Balance owed</p><p className="text-lg font-semibold">{money(owed)}</p></div>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">Boats</h3>
        <Button size="sm" icon={Plus} onClick={() => setBoatForm("new")}>Add boat</Button>
      </div>
      <ul className="mb-5 space-y-2">
        {boats.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-[13px]">
            <Sailboat className="size-4 text-ink-3" aria-hidden />
            <span className="font-medium">{b.name}</span>
            <span className="flex-1 text-ink-3">{b.type} · {b.length} ft · {b.registration}</span>
            <IconButton icon={Pencil} label={`Edit ${b.name}`} onClick={() => setBoatForm(b)} />
          </li>
        ))}
      </ul>
      <h3 className="mb-2 text-[13px] font-semibold">Bookings</h3>
      <Table head={["Booking", "Marina", "Dates", "Status", "Invoice"]} empty={bookings.length === 0}>
        {bookings.slice(0, 8).map((b) => {
          const inv = invoices.find((i) => i.bookingId === b.id);
          return (
            <tr key={b.id} className="cursor-pointer hover:bg-row-hover" onClick={() => navigate(`/bookings?q=${b.code}`)}>
              <td className="font-medium">{b.code}</td>
              <td>{ix.marinaOfBerth(b.berthId)?.name}</td>
              <td className="whitespace-nowrap">{fmtDate(b.start)}</td>
              <td><BookingBadge status={b.status} /></td>
              <td>{inv ? <InvoiceBadge status={inv.status} /> : <span className="text-xs text-ink-3">—</span>}</td>
            </tr>
          );
        })}
      </Table>
      {bookings.length > 8 && <p className="mt-2 text-xs text-ink-3">Showing the latest 8 of {bookings.length} bookings.</p>}
    </Modal>
  );
}

function InviteForm({ user, onClose }: { user?: SystemUser; onClose: () => void }) {
  const { db, update, toast } = useStore();
  const [f, setF] = useState({ name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? ("manager" as Role), marinaIds: user?.marinaIds ?? [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Enter a name.";
    if (!isEmail(f.email)) e.email = "Enter a valid email.";
    else if (db.users.some((u) => u.email.toLowerCase() === f.email.toLowerCase() && u.id !== user?.id)) e.email = "This person already has access.";
    if (f.role !== "admin" && f.marinaIds.length === 0) e.marinas = "Choose at least one marina.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { ...f, marinaIds: f.role === "admin" ? [] : f.marinaIds };
    update((d) => {
      if (user) return { ...d, users: d.users.map((u) => (u.id === user.id ? { ...u, ...data } : u)) };
      const next = { ...d, users: [...d.users, { ...data, id: nextId("u", d.users), lastActive: today(), status: "invited" as const }] };
      return withMessage(next, { to: data.email, subject: `You're invited to ${d.settings.company}`, kind: "invite" });
    }, user ? `Changed ${f.name}'s access to ${ROLE_LABEL[f.role]}` : `Invited ${f.name} as ${ROLE_LABEL[f.role]}`);
    toast(user ? `${f.name} updated` : `Invite sent to ${f.email}`);
    onClose();
  };
  return (
    <Modal open dirty={dirty} onClose={onClose} title={user ? `Edit ${user.name}` : "Invite user"} description={user ? undefined : "They'll get an email to set a password."} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{user ? "Save changes" : "Send invite"}</Button></>}>
      <div className="space-y-4">
        <Field label="Full name" error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Work email" error={errors.email}>{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} disabled={!!user} />}</Field>
        <Field label="Role" hint="See Access Control for what each role can do.">{(id) => <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>}</Field>
        {f.role !== "admin" && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Marinas they can access</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {db.marinas.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={f.marinaIds.includes(m.id)} onChange={(e) => setF({ ...f, marinaIds: e.target.checked ? [...f.marinaIds, m.id] : f.marinaIds.filter((x) => x !== m.id) })} />
                  {m.name}
                </label>
              ))}
            </div>
            {errors.marinas && <p className="mt-1.5 text-xs font-medium">⚠ {errors.marinas}</p>}
          </fieldset>
        )}
      </div>
    </Modal>
  );
}

export function People() {
  const { db, ix, scope, user: me, update, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"owners" | "users">(params.get("tab") === "users" && me?.role === "admin" ? "users" : "owners");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [addingOwner, setAddingOwner] = useState(false);
  const [editing, setEditing] = useState<SystemUser | "new" | undefined>();
  const ownerId = params.get("owner");
  const isAdmin = me?.role === "admin";
  const visibleOwners = useMemo(() => ix.ownersIn(scope, isAdmin), [ix, scope, isAdmin]);
  const owner = ownerId ? visibleOwners.find((o) => o.id === ownerId) : undefined;
  const openOwner = (id?: string) => setParams((p) => { if (id) p.set("owner", id); else p.delete("owner"); return p; });

  const owners = useMemo(() => {
    const s = q.trim().toLowerCase();
    const active = new Set(db.bookings.filter((b) => b.status === "checked-in").map((b) => ix.boat(b.boatId)?.ownerId));
    return visibleOwners
      .filter((o) => !s || o.name.toLowerCase().includes(s) || o.email.toLowerCase().includes(s) || db.boats.some((b) => b.ownerId === o.id && b.name.toLowerCase().includes(s)))
      .map((o) => ({ o, boats: db.boats.filter((b) => b.ownerId === o.id), active: active.has(o.id) }))
      .sort((a, b) => a.o.name.localeCompare(b.o.name));
  }, [db, ix, q, visibleOwners]);
  const { sorted, sort } = useSort(owners, { name: (r) => r.o.name, since: (r) => r.o.since, boats: (r) => r.boats.length });
  const pg = paginate(sorted, page);
  const users = db.users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
  const boatsIn = ix.bookingsIn(scope).filter((b) => b.status === "checked-in").length;

  return (
    <>
      <PageHeader
        title={isAdmin ? "Boat Owners & Users" : "Boat Owners"}
        description={isAdmin ? "Customers who book berths, and team members who sign in" : "Customers who book berths at your marinas"}
        actions={
          tab === "owners" ? (
            <Button variant="primary" icon={UserPlus} onClick={() => setAddingOwner(true)}>Add boat owner</Button>
          ) : (
            isAdmin && <Button variant="primary" icon={MailPlus} onClick={() => setEditing("new")}>Invite user</Button>
          )
        }
      />
      <div className={`mb-4 grid grid-cols-2 gap-4 ${isAdmin ? "min-[1400px]:grid-cols-4" : "min-[1400px]:grid-cols-3"}`}>
        <StatCard label="Boat owners" icon={Users} value={visibleOwners.length} active={tab === "owners"} onClick={() => { setTab("owners"); setQ(""); setPage(1); }} />
        <StatCard label="Boats registered" icon={Sailboat} value={db.boats.filter((b) => visibleOwners.some((o) => o.id === b.ownerId)).length} />
        <StatCard to="/bookings?status=checked-in" label="Boats in your marinas now" icon={Sailboat} value={boatsIn} />
        {isAdmin && <StatCard active={tab === "users"} onClick={() => { setTab("users"); setQ(""); }} label="System users" icon={UserPlus} value={db.users.length} sub={`${db.users.filter((u) => u.status === "invited").length} invite pending`} />}
      </div>
      {isAdmin && <Tabs value={tab} onChange={(t) => { setTab(t); setQ(""); setPage(1); }} items={[{ value: "owners", label: "Boat owners", count: visibleOwners.length }, { value: "users", label: "System users", count: db.users.length }]} />}
      <Card>
        <Toolbar><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={tab === "owners" ? "Search owners, emails or boat names" : "Search users"} /></Toolbar>
        {tab === "owners" ? (
          <>
            <Table sort={sort} head={[{ label: "Owner", sortKey: "name" }, "Contact", { label: "Boats", sortKey: "boats" }, "Status", { label: "Customer since", sortKey: "since" }, ""]} empty={owners.length === 0}>
              {pg.rows.map(({ o, boats, active }) => (
                <tr key={o.id} className="cursor-pointer hover:bg-row-hover" onClick={() => openOwner(o.id)}>
                  <td><div className="flex items-center gap-3"><Avatar name={o.name} /><span className="font-medium">{o.name}</span></div></td>
                  <td>{o.email}<span className="block text-xs text-ink-3">{o.phone || "No phone"}</span></td>
                  <td>{boats.map((b) => b.name).join(", ")}</td>
                  <td>{active ? <Badge tone="info" icon={Sailboat}>Boat in marina</Badge> : <Badge tone="outline">No current stay</Badge>}</td>
                  <td className="whitespace-nowrap">{fmtDate(o.since)}</td>
                  <td><Button size="sm" onClick={(e) => { e.stopPropagation(); openOwner(o.id); }}>View</Button></td>
                </tr>
              ))}
            </Table>
            <Pagination page={pg.page} pages={pg.pages} total={owners.length} onPage={setPage} />
          </>
        ) : (
          <Table head={["User", "Role", "Marinas", "Last active", "Status", "Actions"]} empty={users.length === 0}>
            {users.map((u) => (
              <tr key={u.id}>
                <td><div className="flex items-center gap-3"><Avatar name={u.name} /><div><p className="font-medium">{u.name}{u.id === me?.id && <span className="ml-1 text-xs text-ink-3">(you)</span>}</p><p className="text-xs text-ink-3">{u.email}</p></div></div></td>
                <td>{ROLE_LABEL[u.role]}</td>
                <td className="max-w-64">{u.marinaIds.length ? u.marinaIds.map((id) => ix.marina(id)?.name).join(", ") : "All marinas"}</td>
                <td className="whitespace-nowrap">{u.status === "invited" ? "Never" : relative(u.lastActive)}</td>
                <td><ActiveBadge status={u.status} /></td>
                <td className="whitespace-nowrap">
                  {isAdmin && u.id !== me?.id && (
                    <>
                      <IconButton icon={Pencil} label={`Edit ${u.name}`} onClick={() => setEditing(u)} />
                      {u.status === "invited" && (
                        <IconButton
                          icon={MailPlus}
                          label={`Resend invite to ${u.name}`}
                          onClick={() => {
                            update((d) => withMessage(d, { to: u.email, subject: `Reminder: you're invited to ${d.settings.company}`, kind: "invite" }), `Resent invite to ${u.name}`);
                            toast(`Invite resent to ${u.email}`);
                          }}
                        />
                      )}
                      <IconButton
                        icon={u.status === "disabled" ? RotateCcw : Ban}
                        label={u.status === "disabled" ? `Re-enable ${u.name}` : `Disable ${u.name}`}
                        onClick={() => {
                          const before = db;
                          update((d) => ({ ...d, users: d.users.map((x) => (x.id === u.id ? { ...x, status: u.status === "disabled" ? "active" : "disabled" } : x)) }), `${u.status === "disabled" ? "Re-enabled" : "Disabled"} ${u.name}`);
                          toast(u.status === "disabled" ? `${u.name} re-enabled` : `${u.name} can no longer sign in`, before);
                        }}
                      />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {owner && <OwnerDetail owner={owner} onClose={() => openOwner()} />}
      {addingOwner && <OwnerForm onClose={() => setAddingOwner(false)} onSaved={(id) => openOwner(id)} />}
      {editing && <InviteForm user={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </>
  );
}
