// Incidents: damage, injuries, theft and spills reported from the phone (or here). Managers investigate,
// add notes and close them with an outcome. Kept as a record for insurers and inspections.
import { useState } from "react";
import { CircleCheck, Search as SearchIcon, ShieldAlert, Siren, TriangleAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "@/data/store";
import { tn, t, fmtDateTime, INCIDENT_LABEL, today, type Incident } from "@marina/shared";
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
      <PageHeader title={t("Incidents")} description={t("Damage, injuries, theft and spills, and how they were handled")} />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label={t("New")} icon={Siren} value={all.filter((i) => i.status === "open").length} active={show === "active"} onClick={() => setShow("active")} />
        <StatCard label={t("Investigating")} icon={SearchIcon} value={all.filter((i) => i.status === "investigating").length} />
        <StatCard label={t("Serious, not closed")} icon={TriangleAlert} value={all.filter((i) => i.serious && i.status !== "closed").length} />
        <StatCard label={t("This month")} icon={ShieldAlert} value={thisMonth} sub={t("All incidents reported")} active={show === "all"} onClick={() => setShow("all")} />
      </div>
      <Card>
        <Toolbar active={(q ? 1 : 0) + (marinaId !== "all" ? 1 : 0)} onClear={() => { setQ(""); setMarinaId("all"); }}>
          <SearchInput value={q} onChange={setQ} placeholder={t("Search incidents")} />
          <Select aria-label={t("Filter by marina")} value={marinaId} onChange={(e) => setMarinaId(e.target.value)} className="sm:w-56">
            <option value="all">{t("All marinas")}</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select aria-label={t("Show")} value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="sm:w-44">
            <option value="active">{t("Not closed")}</option>
            <option value="closed">{t("Closed")}</option>
            <option value="all">{t("All")}</option>
          </Select>
        </Toolbar>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldAlert} title={t("No incidents here")} body={t("Staff report damage, injuries, theft and spills from the Marina app.")} />
        ) : (
          <Table head={["Incident", "What happened", "Where", "Reported", "Status"]}>
            {rows.map((i) => (
              <tr key={i.id} className="cursor-pointer hover:bg-row-hover" onClick={() => setOpenId(i.id)}>
                <td className="whitespace-nowrap font-medium">{i.code}<span className="block text-xs font-normal text-ink-3">{t(INCIDENT_LABEL[i.kind])}</span>{i.serious && <Badge tone="cancelled" icon={TriangleAlert}>{t("Serious")}</Badge>}</td>
                <td className="max-w-md">{i.description.length > 120 ? `${i.description.slice(0, 120)}…` : i.description}{(i.photos?.length ?? 0) > 0 && <span className="block text-xs text-ink-3">{tn(i.photos!.length, "{n} photo", "{n} photos")}</span>}</td>
                <td>{ix.marina(i.marinaId)?.name}<span className="block text-xs text-ink-3">{i.berthId ? t("Berth {code}", { code: ix.berth(i.berthId)?.code }) : t("Not at a berth")}</span></td>
                <td className="whitespace-nowrap">{fmtDateTime(i.reportedAt)}<span className="block text-xs text-ink-3">{t("by")} {i.reportedBy}</span></td>
                <td><Badge tone={STATUS[i.status].tone}>{t(STATUS[i.status].label)}</Badge></td>
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
    toast(t(message), before);
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
          {canEdit && i.status === "open" && <Button onClick={() => set({ status: "investigating" }, "Started investigating an incident", "Marked as investigating")}>{t("Start investigating")}</Button>}
          {canEdit && i.status !== "closed" && <Button variant="primary" icon={CircleCheck} onClick={() => setClosing(true)}>{t("Close incident")}</Button>}
          {canEdit && i.status === "closed" && <Button onClick={() => set({ status: "investigating", outcome: undefined }, "Reopened an incident", "Incident reopened")}>{t("Reopen")}</Button>}
          <Button onClick={onClose}>{t("Done")}</Button>
        </>
      }>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={STATUS[i.status].tone}>{t(STATUS[i.status].label)}</Badge>
        {i.serious && <Badge tone="cancelled" icon={TriangleAlert}>{t("Serious")}</Badge>}
      </div>
      <p className="mb-3 text-[13px] whitespace-pre-line">{i.description}</p>
      {i.people && <p className="mb-3 text-[13px]"><span className="text-ink-3">{t("People involved:")} </span>{i.people}</p>}
      <p className="mb-4 text-xs text-ink-3">{t("Reported by")} {i.reportedBy}, {fmtDateTime(i.reportedAt)}</p>
      {(i.photos?.length ?? 0) > 0 && <div className="mb-4 flex flex-wrap gap-2">{i.photos!.map((p, k) => <a key={k} href={p} target="_blank" rel="noreferrer"><img src={p} alt={t("Photo {v}", { v: k + 1 })} className="h-24 w-24 rounded-md object-cover" /></a>)}</div>}
      {i.outcome && <div className="mb-4 rounded-md bg-surface-2 p-3 text-[13px]"><p className="text-xs text-ink-3">{t("Outcome")}</p><p>{i.outcome}</p></div>}
      <h3 className="mb-2 text-[13px] font-semibold">{t("Follow-up")}</h3>
      {i.notes.length === 0 ? <p className="mb-3 text-[13px] text-ink-3">{t("No notes yet.")}</p> : (
        <ol className="mb-3 space-y-3 border-s-2 border-line ps-4">
          {i.notes.map((n, k) => <li key={k} className="text-[13px]"><p>{n.text}</p><p className="text-xs text-ink-3">{n.by} · {fmtDateTime(n.at)}</p></li>)}
        </ol>
      )}
      {canEdit && i.status !== "closed" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1"><Field label={t("Add a note")}>{(id) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("e.g. Called the owner's insurer, claim number 4471")} />}</Field></div>
          <Button onClick={addNote} disabled={!note.trim()}>{t("Add note")}</Button>
        </div>
      )}
      {closing && (
        <Modal open onClose={() => setClosing(false)} title={t("Close {code}", { code: i.code })} description={t("Record what was done, for the file.")} footer={<><Button onClick={() => setClosing(false)}>{t("Cancel")}</Button><Button variant="primary" disabled={!outcome.trim()} onClick={() => { set({ status: "closed", outcome: outcome.trim() }, "Closed an incident", t("{code} closed", { code: i.code })); setClosing(false); }}>{t("Close incident")}</Button></>}>
          <Field label={t("Outcome")}>{(id) => <Textarea id={id} rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder={t("e.g. Boards replaced, owner's insurer paid $640")} />}</Field>
        </Modal>
      )}
    </Modal>
  );
}
