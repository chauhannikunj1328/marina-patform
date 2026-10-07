// Incidents: damage, injuries, theft and spills reported from the phone (or here). Managers investigate,
// add notes and close them with an outcome. Kept as a record for insurers and inspections.
import { useState } from "react";
import { CircleCheck, Search as SearchIcon, ShieldAlert, Siren, TriangleAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "@/data/store";
import { fmtDateTime, INCIDENT_LABEL, today, type Incident } from "@marina/shared";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, SearchInput, Select, StatCard, Table, Textarea, Toolbar } from "@/components/ui";

const STATUS: Record<Incident["status"], { tone: "pending" | "info" | "success"; label: string }> = {
  open: { tone: "pending", label: "New" },
  investigating: { tone: "info", label: "Investigating" },
  closed: { tone: "success", label: "Closed" },
};

export function Incidents() {
  const { db, ix, scope, can } = useStore();
  const canEdit = can("maintenance") !== "view";
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [marinaId, setMarinaId] = useState("all");
  const [show, setShow] = useState<"active" | "closed" | "all">("active");
  const [openId, setOpenId] = useState<string | undefined>(params.get("open") ?? undefined);
  const ids = marinaId === "all" ? scope : [marinaId];
  const all = (db.incidents ?? []).filter((i) => ids.includes(i.marinaId));
  const s = q.trim().toLowerCase();
  const rows = all
    .filter((i) => (show === "all" ? true : show === "closed" ? i.status === "closed" : i.status !== "closed"))
    .filter((i) => !s || i.description.toLowerCase().includes(s) || i.code.toLowerCase().includes(s) || i.reportedBy.toLowerCase().includes(s))
    .sort((a, b) => Number(b.serious) - Number(a.serious) || b.at.localeCompare(a.at));
  const open = all.find((i) => i.id === openId);
  const thisMonth = all.filter((i) => i.at.slice(0, 7) === today().slice(0, 7)).length;
  return (
    <>
      <PageHeader title="Incidents" description="Damage, injuries, theft and spills, and how they were handled" />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label="New" icon={Siren} value={all.filter((i) => i.status === "open").length} active={show === "active"} onClick={() => setShow("active")} />
        <StatCard label="Investigating" icon={SearchIcon} value={all.filter((i) => i.status === "investigating").length} />
        <StatCard label="Serious, not closed" icon={TriangleAlert} value={all.filter((i) => i.serious && i.status !== "closed").length} />
        <StatCard label="This month" icon={ShieldAlert} value={thisMonth} sub="All incidents reported" active={show === "all"} onClick={() => setShow("all")} />
      </div>
      <Card>
        <Toolbar active={(q ? 1 : 0) + (marinaId !== "all" ? 1 : 0)} onClear={() => { setQ(""); setMarinaId("all"); }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search incidents" />
          <Select aria-label="Filter by marina" value={marinaId} onChange={(e) => setMarinaId(e.target.value)} className="sm:w-56">
            <option value="all">All marinas</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select aria-label="Show" value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="sm:w-44">
            <option value="active">Not closed</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </Select>
        </Toolbar>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No incidents here" body="Staff report damage, injuries, theft and spills from the Marina app." />
        ) : (
          <Table head={["Incident", "What happened", "Where", "Reported", "Status"]}>
            {rows.map((i) => (
              <tr key={i.id} className="cursor-pointer hover:bg-row-hover" onClick={() => setOpenId(i.id)}>
                <td className="whitespace-nowrap font-medium">{i.code}<span className="block text-xs font-normal text-ink-3">{INCIDENT_LABEL[i.kind]}</span>{i.serious && <Badge tone="cancelled" icon={TriangleAlert}>Serious</Badge>}</td>
                <td className="max-w-md">{i.description.length > 120 ? `${i.description.slice(0, 120)}…` : i.description}{(i.photos?.length ?? 0) > 0 && <span className="block text-xs text-ink-3">{i.photos!.length} photo{i.photos!.length > 1 ? "s" : ""}</span>}</td>
                <td>{ix.marina(i.marinaId)?.name}<span className="block text-xs text-ink-3">{i.berthId ? `Berth ${ix.berth(i.berthId)?.code}` : "Not at a berth"}</span></td>
                <td className="whitespace-nowrap">{fmtDateTime(i.reportedAt)}<span className="block text-xs text-ink-3">by {i.reportedBy}</span></td>
                <td><Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {open && <IncidentDetail incident={open} canEdit={canEdit} onClose={() => setOpenId(undefined)} />}
    </>
  );
}

function IncidentDetail({ incident, canEdit, onClose }: { incident: Incident; canEdit: boolean; onClose: () => void }) {
  const { db, ix, update, toast, user } = useStore();
  const i = (db.incidents ?? []).find((x) => x.id === incident.id) ?? incident;
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("");
  const [closing, setClosing] = useState(false);
  const log = (text: string) => ({ text: `${text} (${i.code})`, to: `/incidents?open=${i.id}`, marinaId: i.marinaId });
  const set = (patch: Partial<Incident>, text: string, message: string) => {
    const before = db;
    update((d) => ({ ...d, incidents: (d.incidents ?? []).map((x) => (x.id === i.id ? { ...x, ...patch } : x)) }), log(text));
    toast(message, before);
  };
  const addNote = () => {
    if (!note.trim()) return;
    set({ notes: [...i.notes, { at: new Date().toISOString(), by: user?.name ?? "Manager", text: note.trim() }], status: i.status === "open" ? "investigating" : i.status }, "Added a note to an incident", "Note added");
    setNote("");
  };
  return (
    <Modal open wide onClose={onClose} title={`${i.code} · ${INCIDENT_LABEL[i.kind]}`} description={`${ix.marina(i.marinaId)?.name}${i.berthId ? `, berth ${ix.berth(i.berthId)?.code}` : ""} · ${fmtDateTime(i.at)}`}
      footer={
        <>
          {canEdit && i.status === "open" && <Button onClick={() => set({ status: "investigating" }, "Started investigating an incident", "Marked as investigating")}>Start investigating</Button>}
          {canEdit && i.status !== "closed" && <Button variant="primary" icon={CircleCheck} onClick={() => setClosing(true)}>Close incident</Button>}
          {canEdit && i.status === "closed" && <Button onClick={() => set({ status: "investigating", outcome: undefined }, "Reopened an incident", "Incident reopened")}>Reopen</Button>}
          <Button onClick={onClose}>Done</Button>
        </>
      }>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
        {i.serious && <Badge tone="cancelled" icon={TriangleAlert}>Serious</Badge>}
      </div>
      <p className="mb-3 text-[13px] whitespace-pre-line">{i.description}</p>
      {i.people && <p className="mb-3 text-[13px]"><span className="text-ink-3">People involved: </span>{i.people}</p>}
      <p className="mb-4 text-xs text-ink-3">Reported by {i.reportedBy}, {fmtDateTime(i.reportedAt)}</p>
      {(i.photos?.length ?? 0) > 0 && <div className="mb-4 flex flex-wrap gap-2">{i.photos!.map((p, k) => <a key={k} href={p} target="_blank" rel="noreferrer"><img src={p} alt={`Photo ${k + 1}`} className="h-24 w-24 rounded-md object-cover" /></a>)}</div>}
      {i.outcome && <div className="mb-4 rounded-md bg-surface-2 p-3 text-[13px]"><p className="text-xs text-ink-3">Outcome</p><p>{i.outcome}</p></div>}
      <h3 className="mb-2 text-[13px] font-semibold">Follow-up</h3>
      {i.notes.length === 0 ? <p className="mb-3 text-[13px] text-ink-3">No notes yet.</p> : (
        <ol className="mb-3 space-y-3 border-l-2 border-line pl-4">
          {i.notes.map((n, k) => <li key={k} className="text-[13px]"><p>{n.text}</p><p className="text-xs text-ink-3">{n.by} · {fmtDateTime(n.at)}</p></li>)}
        </ol>
      )}
      {canEdit && i.status !== "closed" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1"><Field label="Add a note">{(id) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called the owner's insurer, claim number 4471" />}</Field></div>
          <Button onClick={addNote} disabled={!note.trim()}>Add note</Button>
        </div>
      )}
      {closing && (
        <Modal open onClose={() => setClosing(false)} title={`Close ${i.code}`} description="Record what was done, for the file." footer={<><Button onClick={() => setClosing(false)}>Cancel</Button><Button variant="primary" disabled={!outcome.trim()} onClick={() => { set({ status: "closed", outcome: outcome.trim() }, "Closed an incident", `${i.code} closed`); setClosing(false); }}>Close incident</Button></>}>
          <Field label="Outcome">{(id) => <Textarea id={id} rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Boards replaced, owner's insurer paid $640" />}</Field>
        </Modal>
      )}
    </Modal>
  );
}
