// Contracts: long-term berth agreements (monthly, seasonal or annual). Each holds its berth through a
// booking for the whole term and is invoiced up front. Renewals are flagged 30 days before the end.
import { useMemo, useState } from "react";
import { FilePlus2, FileSignature, RefreshCw, Repeat, TriangleAlert, Wallet } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import { tn, t, addMonths, daysBetween, fmtDate, fmtShort, money, RENEWAL_NOTICE_DAYS, renewalsDue, today, withInvoice, type Booking, type Contract, type ContractTerm } from "@marina/shared";
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
    if (!ix.isFree(c.berthId, start, end)) return toast(t("Berth {code} is booked during the next term. Move that booking first.", { code: ix.berth(c.berthId)?.code }), undefined, "warning");
    update((d) => withContract(d, { ownerId: c.ownerId, boatId: c.boatId, berthId: c.berthId, marinaId: c.marinaId, term: c.term, start, end, monthlyFee: c.monthlyFee, autoRenew: c.autoRenew, renewedFromId: c.id }), { text: `Renewed contract ${c.code} for ${ix.boat(c.boatId)?.name}: ${fmtShort(start)} – ${fmtShort(end)}`, to: "/contracts", marinaId: c.marinaId });
    toast(t("{code} renewed to {date} and invoiced", { code: c.code, date: fmtDate(end) }), before);
  };
  const end = (c: Contract) => {
    const before = db;
    update((d) => ({ ...d, contracts: (d.contracts ?? []).map((x) => (x.id === c.id ? { ...x, autoRenew: false } : x)) }), { text: `Contract ${c.code} won't renew after ${fmtShort(c.end)}`, to: "/contracts", marinaId: c.marinaId });
    toast(t("{code} ends on {date}. The berth goes back on sale after that.", { code: c.code, date: fmtDate(c.end) }), before);
  };

  return (
    <>
      <PageHeader title={t("Contracts")} description={t("Long-term berth agreements and renewals")} actions={canEdit && <Button variant="primary" icon={FilePlus2} onClick={() => setCreating(true)}>{t("New contract")}</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label={t("Active contracts")} icon={FileSignature} value={active.length} active={show === "active"} onClick={() => setShow("active")} />
        <StatCard label={t("Contract income a month")} icon={Wallet} value={money(active.reduce((s, c) => s + c.monthlyFee, 0))} sub={t("Monthly fees of active contracts")} />
        <StatCard label={t("Up for renewal")} icon={RefreshCw} value={all.filter(dueSoon).length} sub={t("A week before monthly, a month before seasonal, 2 months before annual")} active={show === "renewal"} onClick={() => setShow(show === "renewal" ? "active" : "renewal")} />
        <StatCard label={t("Won't renew")} icon={TriangleAlert} value={active.filter((c) => !c.autoRenew && !renewedIds.has(c.id)).length} sub={t("Berths coming back on sale")} />
      </div>
      <Card>
        <Toolbar active={(q ? 1 : 0) + (marinaId !== "all" ? 1 : 0)} onClear={() => { setQ(""); setMarinaId("all"); }}>
          <SearchInput value={q} onChange={setQ} placeholder={t("Search contract, owner, boat or berth")} />
          <Select aria-label={t("Filter by marina")} value={marinaId} onChange={(e) => setMarinaId(e.target.value)} className="sm:w-56">
            <option value="all">{t("All marinas")}</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select aria-label={t("Show")} value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="sm:w-48">
            <option value="active">{t("Active")}</option>
            <option value="renewal">{t("Up for renewal")}</option>
            <option value="all">{t("All, including ended")}</option>
          </Select>
        </Toolbar>
        {rows.length === 0 ? (
          <EmptyState icon={FileSignature} title={show === "renewal" ? t("Nothing up for renewal") : t("No contracts here")} body={t("Long-term berth holders on monthly, seasonal or annual terms show up here.")} />
        ) : (
          <Table head={["Contract", "Boat owner", "Berth", "Term", "Monthly fee", "Status", "Actions"]}>
            {rows.map((c) => {
              const left = daysBetween(now, c.end);
              const renewed = renewedIds.has(c.id);
              return (
                <tr key={c.id}>
                  <td className="font-medium">{c.code}<span className="block text-xs font-normal text-ink-3">{t("since")} {fmtDate(c.start)}</span></td>
                  <td>{ix.owner(c.ownerId)?.name}<span className="block text-xs text-ink-3">{ix.boat(c.boatId)?.name} · {ix.boat(c.boatId)?.length} {t("ft")}</span></td>
                  <td>{ix.berth(c.berthId)?.code}<span className="block text-xs text-ink-3">{ix.marina(c.marinaId)?.name}</span></td>
                  <td className="whitespace-nowrap">{t(TERMS[c.term].label)}<span className="block text-xs text-ink-3">{fmtShort(c.start)} – {fmtShort(c.end)}</span></td>
                  <td className="num">{money(c.monthlyFee)}</td>
                  <td>
                    {c.status !== "active" || c.end <= now ? <Badge tone="muted">{t("Ended")}</Badge>
                      : renewed ? <Badge tone="success" icon={Repeat}>{t("Renewed")}</Badge>
                      : due.has(c.id) ? <Badge tone={c.autoRenew ? "pending" : "maintenance"}>{c.autoRenew ? tn(left, "Renews in {n} day", "Renews in {n} days") : tn(left, "Ends in {n} day", "Ends in {n} days")}</Badge>
                      : <Badge tone="active">{c.autoRenew ? t("Auto-renews") : t("Fixed term")}</Badge>}
                  </td>
                  <td className="whitespace-nowrap">
                    {canEdit && c.status === "active" && c.end > now && !renewed && (
                      <span className="inline-flex gap-2">
                        <Button size="sm" variant={due.has(c.id) ? "primary" : "secondary"} icon={RefreshCw} onClick={() => renew(c)}>{t("Renew")}</Button>
                        {c.autoRenew && <Button size="sm" onClick={() => setEnding(c)}>{t("Don't renew")}</Button>}
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
        title={t("Stop {code} renewing?", { code: ending?.code })}
        body={t("It ends on {v} and berth {v2} goes back on sale after that. Let {v3} know.", { v: ending ? fmtDate(ending.end) : "", v2: ending ? ix.berth(ending.berthId)?.code : "", v3: ending ? ix.owner(ending.ownerId)?.name : "" })}
        confirmLabel={t("Don't renew")}
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
    if (!f.ownerId) e.owner = t("Choose the boat owner.");
    if (!f.boatId) e.boat = t("Choose the boat.");
    if (!berth || !berths.some((b) => b.id === berth.id)) e.berth = berths.length ? t("Choose a berth.") : t("No berth is free for the whole term and fits this boat.");
    if (!(fee > 0)) e.fee = t("Enter the monthly fee.");
    setErrors(e);
    if (Object.keys(e).length || !berth) return;
    update((d) => withContract(d, { ownerId: f.ownerId, boatId: f.boatId, berthId: berth.id, marinaId: f.marinaId, term: f.term, start: f.start, end, monthlyFee: fee, autoRenew: f.autoRenew }), { text: `New ${TERMS[f.term].label.toLowerCase()} contract for ${boat?.name} at berth ${berth.code}`, to: "/contracts", marinaId: f.marinaId });
    toast(t("Contract created, berth {code} held to {date} and invoiced {amount}", { code: berth.code, date: fmtDate(end), amount: money(fee * TERMS[f.term].months) }));
    onClose();
  };
  return (
    <Modal open wide dirty={dirty} onClose={onClose} title={t("New contract")} description={t("Holds the berth for the whole term. The term is invoiced up front.")} footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Create contract")}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("Boat owner")} error={errors.owner}>{(id) => <Select id={id} value={f.ownerId} onChange={(e) => set({ ownerId: e.target.value, boatId: "", berthId: "" })}><option value="">{t("Choose…")}</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>}</Field>
        <Field label={t("Boat")} error={errors.boat}>{(id) => <Select id={id} value={f.boatId} disabled={!f.ownerId} onChange={(e) => set({ boatId: e.target.value, berthId: "" })}><option value="">{t("Choose…")}</option>{boats.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.length} {t("ft")}</option>)}</Select>}</Field>
        <Field label={t("Marina")}>{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set({ marinaId: e.target.value, berthId: "" })}>{db.marinas.filter((m) => ids.includes(m.id) && m.status === "active").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label={t("Term")}>{(id) => <Select id={id} value={f.term} onChange={(e) => set({ term: e.target.value as ContractTerm, berthId: "", fee: "" })}>{(Object.keys(TERMS) as ContractTerm[]).map((item) => <option key={item} value={item}>{t(TERMS[item].label)}{TERMS[item].discount ? t(", {v}% off", { v: TERMS[item].discount * 100 }) : ""}</option>)}</Select>}</Field>
        <Field label={t("Starts")} hint={t("Ends {date}", { date: fmtDate(end) })}>{(id) => <Input id={id} type="date" min={today()} value={f.start} onChange={(e) => set({ start: e.target.value, berthId: "" })} />}</Field>
        <Field label={t("Berth")} hint={boat ? t("{n} free for the whole term and fit {n2} ft", { n: berths.length, n2: boat.length }) : t("Choose the boat first")} error={errors.berth}>{(id) => <Select id={id} value={f.berthId} disabled={!boat} onChange={(e) => set({ berthId: e.target.value, fee: "" })}><option value="">{t("Choose…")}</option>{berths.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.maxLength} {t("ft ·")} {money(b.monthlyRate)}{t("/month")}</option>)}</Select>}</Field>
        <Field label={t("Monthly fee")} hint={berth ? t("Suggested {amount}{v}", { amount: money(suggested), v: TERMS[f.term].discount ? t(" ({x}% off the monthly rate)", { x: TERMS[f.term].discount * 100 }) : "" }) : undefined} error={errors.fee}>{(id) => <Input id={id} type="number" min={1} placeholder={suggested ? String(suggested) : ""} value={f.fee} onChange={(e) => set({ fee: e.target.value })} />}</Field>
        <label className="flex items-center gap-2 self-end pb-2 text-[13px]"><input type="checkbox" checked={f.autoRenew} onChange={(e) => set({ autoRenew: e.target.checked })} /> {t("Renews (flagged {n} days before the end)", { n: RENEWAL_NOTICE_DAYS[f.term] })}</label>
      </div>
      {berth && <p className="mt-4 rounded-md bg-surface-2 px-4 py-3 text-[13px]">{t("Invoice for the term:")} <span className="num font-semibold">{money(fee * TERMS[f.term].months)}</span> ({TERMS[f.term].months} × {money(fee)})</p>}
    </Modal>
  );
}
