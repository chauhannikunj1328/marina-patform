// Contracts: long-term berth agreements (monthly, seasonal or annual). Each holds its berth through a
// booking for the whole term and is invoiced up front. Renewals are flagged 30 days before the end.
import { useMemo, useState } from "react";
import { FilePlus2, FileSignature, RefreshCw, Repeat, TriangleAlert, Wallet } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import { addMonths, daysBetween, fmtDate, fmtShort, money, RENEWAL_NOTICE_DAYS, renewalsDue, today, withInvoice, type Booking, type Contract, type ContractTerm } from "@marina/shared";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Select, StatCard, Table, Toolbar, useDirty } from "@/components/ui";

const TERMS: Record<ContractTerm, { label: string; months: number; discount: number }> = {
  monthly: { label: "Monthly", months: 1, discount: 0 },
  seasonal: { label: "Seasonal (6 months)", months: 6, discount: 0.05 },
  annual: { label: "Annual (12 months)", months: 12, discount: 0.1 },
};

/** Create the booking (held for the whole term), the contract and its invoice. */
function withContract(d: Parameters<typeof withInvoice>[0], c: Omit<Contract, "id" | "code" | "bookingId" | "createdAt" | "status">) {
  const bookingId = nextId("bk", d.bookings);
  const months = TERMS[c.term].months;
  const price = Math.round(c.monthlyFee * months);
  const booking: Booking = { id: bookingId, code: `BK-${String(Number(bookingId.split("-")[1])).padStart(4, "0")}`, boatId: c.boatId, berthId: c.berthId, start: c.start, end: c.end, guests: 2, status: c.start <= today() ? "checked-in" : "confirmed", createdAt: today(), price };
  const id = nextId("ct", d.contracts ?? []);
  const contract: Contract = { ...c, id, code: `CT-${String(Number(id.split("-")[1])).padStart(3, "0")}`, bookingId, createdAt: today(), status: "active" };
  return withInvoice({ ...d, bookings: [...d.bookings, booking], contracts: [...(d.contracts ?? []), contract] }, bookingId, price);
}

export function Contracts() {
  const { db, ix, scope, update, toast, can } = useStore();
  const canEdit = can("bookings") !== "view";
  const [q, setQ] = useState("");
  const [marinaId, setMarinaId] = useState("all");
  const [show, setShow] = useState<"active" | "renewal" | "all">("active");
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState<Contract | undefined>();
  const now = today();
  const ids = marinaId === "all" ? scope : [marinaId];
  const all = (db.contracts ?? []).filter((c) => ids.includes(c.marinaId));
  const renewedIds = new Set(all.map((c) => c.renewedFromId).filter(Boolean));
  const due = new Set(renewalsDue(all, now).map((c) => c.id));
  const dueSoon = (c: Contract) => due.has(c.id);
  const active = all.filter((c) => c.status === "active" && c.end > now);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((c) => (show === "all" ? true : show === "renewal" ? dueSoon(c) : c.status === "active" && c.end > now))
      .filter((c) => !s || c.code.toLowerCase().includes(s) || ix.owner(c.ownerId)?.name.toLowerCase().includes(s) || ix.boat(c.boatId)?.name.toLowerCase().includes(s) || ix.berth(c.berthId)?.code.toLowerCase().includes(s))
      .sort((a, b) => a.end.localeCompare(b.end));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, show]);

  const renew = (c: Contract) => {
    const before = db;
    const start = c.end;
    const end = addMonths(start, TERMS[c.term].months);
    if (!ix.isFree(c.berthId, start, end)) return toast(`Berth ${ix.berth(c.berthId)?.code} is booked during the next term. Move that booking first.`, undefined, "warning");
    update((d) => withContract(d, { ownerId: c.ownerId, boatId: c.boatId, berthId: c.berthId, marinaId: c.marinaId, term: c.term, start, end, monthlyFee: c.monthlyFee, autoRenew: c.autoRenew, renewedFromId: c.id }), { text: `Renewed contract ${c.code} for ${ix.boat(c.boatId)?.name}: ${fmtShort(start)} – ${fmtShort(end)}`, to: "/contracts", marinaId: c.marinaId });
    toast(`${c.code} renewed to ${fmtDate(end)} and invoiced`, before);
  };
  const end = (c: Contract) => {
    const before = db;
    update((d) => ({ ...d, contracts: (d.contracts ?? []).map((x) => (x.id === c.id ? { ...x, autoRenew: false } : x)) }), { text: `Contract ${c.code} won't renew after ${fmtShort(c.end)}`, to: "/contracts", marinaId: c.marinaId });
    toast(`${c.code} ends on ${fmtDate(c.end)}. The berth goes back on sale after that.`, before);
  };

  return (
    <>
      <PageHeader title="Contracts" description="Long-term berth agreements and renewals" actions={canEdit && <Button variant="primary" icon={FilePlus2} onClick={() => setCreating(true)}>New contract</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label="Active contracts" icon={FileSignature} value={active.length} active={show === "active"} onClick={() => setShow("active")} />
        <StatCard label="Contract income a month" icon={Wallet} value={money(active.reduce((s, c) => s + c.monthlyFee, 0))} sub="Monthly fees of active contracts" />
        <StatCard label="Up for renewal" icon={RefreshCw} value={all.filter(dueSoon).length} sub="A week before monthly, a month before seasonal, 2 months before annual" active={show === "renewal"} onClick={() => setShow(show === "renewal" ? "active" : "renewal")} />
        <StatCard label="Won't renew" icon={TriangleAlert} value={active.filter((c) => !c.autoRenew && !renewedIds.has(c.id)).length} sub="Berths coming back on sale" />
      </div>
      <Card>
        <Toolbar active={(q ? 1 : 0) + (marinaId !== "all" ? 1 : 0)} onClear={() => { setQ(""); setMarinaId("all"); }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search contract, owner, boat or berth" />
          <Select aria-label="Filter by marina" value={marinaId} onChange={(e) => setMarinaId(e.target.value)} className="sm:w-56">
            <option value="all">All marinas</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select aria-label="Show" value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="sm:w-48">
            <option value="active">Active</option>
            <option value="renewal">Up for renewal</option>
            <option value="all">All, including ended</option>
          </Select>
        </Toolbar>
        {rows.length === 0 ? (
          <EmptyState icon={FileSignature} title={show === "renewal" ? "Nothing up for renewal" : "No contracts here"} body="Long-term berth holders on monthly, seasonal or annual terms show up here." />
        ) : (
          <Table head={["Contract", "Boat owner", "Berth", "Term", "Monthly fee", "Status", "Actions"]}>
            {rows.map((c) => {
              const left = daysBetween(now, c.end);
              const renewed = renewedIds.has(c.id);
              return (
                <tr key={c.id}>
                  <td className="font-medium">{c.code}<span className="block text-xs font-normal text-ink-3">since {fmtDate(c.start)}</span></td>
                  <td>{ix.owner(c.ownerId)?.name}<span className="block text-xs text-ink-3">{ix.boat(c.boatId)?.name} · {ix.boat(c.boatId)?.length} ft</span></td>
                  <td>{ix.berth(c.berthId)?.code}<span className="block text-xs text-ink-3">{ix.marina(c.marinaId)?.name}</span></td>
                  <td className="whitespace-nowrap">{TERMS[c.term].label}<span className="block text-xs text-ink-3">{fmtShort(c.start)} – {fmtShort(c.end)}</span></td>
                  <td className="num">{money(c.monthlyFee)}</td>
                  <td>
                    {c.status !== "active" || c.end <= now ? <Badge tone="muted">Ended</Badge>
                      : renewed ? <Badge tone="success" icon={Repeat}>Renewed</Badge>
                      : due.has(c.id) ? <Badge tone={c.autoRenew ? "pending" : "maintenance"}>{`${c.autoRenew ? "Renews" : "Ends"} in ${left} ${left === 1 ? "day" : "days"}`}</Badge>
                      : <Badge tone="active">{c.autoRenew ? "Auto-renews" : "Fixed term"}</Badge>}
                  </td>
                  <td className="whitespace-nowrap">
                    {canEdit && c.status === "active" && c.end > now && !renewed && (
                      <span className="inline-flex gap-2">
                        <Button size="sm" variant={due.has(c.id) ? "primary" : "secondary"} icon={RefreshCw} onClick={() => renew(c)}>Renew</Button>
                        {c.autoRenew && <Button size="sm" onClick={() => setEnding(c)}>Don&apos;t renew</Button>}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
      {creating && <ContractForm ids={scope} onClose={() => setCreating(false)} />}
      <ConfirmDialog
        open={!!ending}
        onClose={() => setEnding(undefined)}
        title={`Stop ${ending?.code} renewing?`}
        body={`It ends on ${ending ? fmtDate(ending.end) : ""} and berth ${ending ? ix.berth(ending.berthId)?.code : ""} goes back on sale after that. Let ${ending ? ix.owner(ending.ownerId)?.name : ""} know.`}
        confirmLabel="Don't renew"
        onConfirm={() => ending && end(ending)}
      />
    </>
  );
}

function ContractForm({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const [f, setF] = useState({ ownerId: "", boatId: "", marinaId: ids[0], berthId: "", term: "annual" as ContractTerm, start: today(), fee: "", autoRenew: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const boats = db.boats.filter((b) => b.ownerId === f.ownerId);
  const boat = ix.boat(f.boatId);
  const end = addMonths(f.start, TERMS[f.term].months);
  const berths = db.berths.filter((b) => b.marinaId === f.marinaId && !b.underMaintenance && b.maxLength >= (boat?.length ?? 0) && ix.isFree(b.id, f.start, end)).sort((a, b) => a.maxLength - b.maxLength);
  const berth = ix.berth(f.berthId);
  const suggested = berth ? Math.round(berth.monthlyRate * (1 - TERMS[f.term].discount)) : 0;
  const fee = Number(f.fee) || suggested;
  const owners = useMemo(() => [...db.owners].sort((a, b) => a.name.localeCompare(b.name)), [db.owners]);
  const set = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setErrors({}); };
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.ownerId) e.owner = "Choose the boat owner.";
    if (!f.boatId) e.boat = "Choose the boat.";
    if (!berth || !berths.some((b) => b.id === berth.id)) e.berth = berths.length ? "Choose a berth." : "No berth is free for the whole term and fits this boat.";
    if (!(fee > 0)) e.fee = "Enter the monthly fee.";
    setErrors(e);
    if (Object.keys(e).length || !berth) return;
    update((d) => withContract(d, { ownerId: f.ownerId, boatId: f.boatId, berthId: berth.id, marinaId: f.marinaId, term: f.term, start: f.start, end, monthlyFee: fee, autoRenew: f.autoRenew }), { text: `New ${TERMS[f.term].label.toLowerCase()} contract for ${boat?.name} at berth ${berth.code}`, to: "/contracts", marinaId: f.marinaId });
    toast(`Contract created, berth ${berth.code} held to ${fmtDate(end)} and invoiced ${money(fee * TERMS[f.term].months)}`);
    onClose();
  };
  return (
    <Modal open wide dirty={dirty} onClose={onClose} title="New contract" description="Holds the berth for the whole term. The term is invoiced up front." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Create contract</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Boat owner" error={errors.owner}>{(id) => <Select id={id} value={f.ownerId} onChange={(e) => set({ ownerId: e.target.value, boatId: "", berthId: "" })}><option value="">Choose…</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>}</Field>
        <Field label="Boat" error={errors.boat}>{(id) => <Select id={id} value={f.boatId} disabled={!f.ownerId} onChange={(e) => set({ boatId: e.target.value, berthId: "" })}><option value="">Choose…</option>{boats.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.length} ft</option>)}</Select>}</Field>
        <Field label="Marina">{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set({ marinaId: e.target.value, berthId: "" })}>{db.marinas.filter((m) => ids.includes(m.id) && m.status === "active").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label="Term">{(id) => <Select id={id} value={f.term} onChange={(e) => set({ term: e.target.value as ContractTerm, berthId: "", fee: "" })}>{(Object.keys(TERMS) as ContractTerm[]).map((t) => <option key={t} value={t}>{TERMS[t].label}{TERMS[t].discount ? `, ${TERMS[t].discount * 100}% off` : ""}</option>)}</Select>}</Field>
        <Field label="Starts" hint={`Ends ${fmtDate(end)}`}>{(id) => <Input id={id} type="date" min={today()} value={f.start} onChange={(e) => set({ start: e.target.value, berthId: "" })} />}</Field>
        <Field label="Berth" hint={boat ? `${berths.length} free for the whole term and fit ${boat.length} ft` : "Choose the boat first"} error={errors.berth}>{(id) => <Select id={id} value={f.berthId} disabled={!boat} onChange={(e) => set({ berthId: e.target.value, fee: "" })}><option value="">Choose…</option>{berths.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.maxLength} ft · {money(b.monthlyRate)}/month</option>)}</Select>}</Field>
        <Field label="Monthly fee" hint={berth ? `Suggested ${money(suggested)}${TERMS[f.term].discount ? ` (${TERMS[f.term].discount * 100}% off the monthly rate)` : ""}` : undefined} error={errors.fee}>{(id) => <Input id={id} type="number" min={1} placeholder={suggested ? String(suggested) : ""} value={f.fee} onChange={(e) => set({ fee: e.target.value })} />}</Field>
        <label className="flex items-center gap-2 self-end pb-2 text-[13px]"><input type="checkbox" checked={f.autoRenew} onChange={(e) => set({ autoRenew: e.target.checked })} /> Renews (flagged {RENEWAL_NOTICE_DAYS[f.term]} days before the end)</label>
      </div>
      {berth && <p className="mt-4 rounded-md bg-surface-2 px-4 py-3 text-[13px]">Invoice for the term: <span className="num font-semibold">{money(fee * TERMS[f.term].months)}</span> ({TERMS[f.term].months} × {money(fee)})</p>}
    </Modal>
  );
}
