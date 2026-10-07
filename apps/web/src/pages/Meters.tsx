// Berths › Meters: power and water readings per berth. Recording a reading bills the usage since
// the last one to the boat in the berth (as a line on its invoice).
import { useState } from "react";
import { Gauge } from "lucide-react";
import { useStore } from "@/data/store";
import { DEFAULT_UTILITIES, fmtDateTime, lastReading, METER_UNIT, money2, withMeterReading, type Berth, type MeterKind } from "@marina/shared";
import { Button, EmptyState, Field, Input, Modal, Table } from "@/components/ui";

export function MetersPanel({ berths, canEdit }: { berths: Berth[]; canEdit: boolean }) {
  const { db, ix } = useStore();
  const [reading, setReading] = useState<Berth | undefined>();
  const metered = berths.filter((b) => b.power || b.water);
  const rates = db.settings.utilities ?? DEFAULT_UTILITIES;
  const cell = (b: Berth, kind: MeterKind) => {
    if (!(kind === "power" ? b.power : b.water)) return <span className="text-ink-3">—</span>;
    const r = lastReading(db, b.id, kind);
    return r ? <span className="num">{r.value.toLocaleString()} {METER_UNIT[kind]}<span className="block text-xs text-ink-3">{fmtDateTime(r.at)}</span></span> : <span className="text-xs text-ink-3">No reading yet</span>;
  };
  return (
    <div>
      <p className="px-4 py-3 text-[13px] text-ink-2">Electricity {money2(rates.powerPerKwh)}/kWh · water {money2(rates.waterPerGallon)}/gal. Change the rates in Settings › Pricing.</p>
      {metered.length === 0 ? (
        <EmptyState icon={Gauge} title="No metered berths here" />
      ) : (
        <Table head={["Berth", "Boat here now", "Power meter", "Water meter", "Actions"]}>
          {metered.slice(0, 120).map((b) => {
            const cur = ix.currentBooking(b.id);
            return (
              <tr key={b.id}>
                <td className="font-medium">{b.code}<span className="block text-xs font-normal text-ink-3">{ix.marina(b.marinaId)?.name}</span></td>
                <td>{cur ? <>{ix.boat(cur.boatId)?.name}<span className="block text-xs text-ink-3">{cur.code}</span></> : <span className="text-ink-3">Empty</span>}</td>
                <td>{cell(b, "power")}</td>
                <td>{cell(b, "water")}</td>
                <td>{canEdit && <Button size="sm" icon={Gauge} onClick={() => setReading(b)}>Record reading</Button>}</td>
              </tr>
            );
          })}
        </Table>
      )}
      {reading && <ReadingForm berth={reading} onClose={() => setReading(undefined)} />}
    </div>
  );
}

function ReadingForm({ berth, onClose }: { berth: Berth; onClose: () => void }) {
  const { db, ix, update, toast, user } = useStore();
  const kinds = (["power", "water"] as MeterKind[]).filter((k) => (k === "power" ? berth.power : berth.water));
  const [values, setValues] = useState<Record<MeterKind, string>>({ power: "", water: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cur = ix.currentBooking(berth.id);
  const rates = db.settings.utilities ?? DEFAULT_UTILITIES;
  const preview = (k: MeterKind) => {
    const prev = lastReading(db, berth.id, k);
    const v = Number(values[k]);
    if (!values[k] || !prev || !(v >= prev.value)) return undefined;
    const usage = v - prev.value;
    return { usage, charge: Math.round(usage * (k === "power" ? rates.powerPerKwh : rates.waterPerGallon) * 100) / 100 };
  };
  const save = () => {
    const e: Record<string, string> = {};
    for (const k of kinds) {
      if (!values[k]) continue;
      const prev = lastReading(db, berth.id, k);
      if (!(Number(values[k]) >= 0)) e[k] = "Enter the number on the meter.";
      else if (prev && Number(values[k]) < prev.value) e[k] = `Lower than the last reading (${prev.value.toLocaleString()}). Check the meter.`;
    }
    if (!kinds.some((k) => values[k])) e.power = "Enter at least one reading.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const before = db;
    let total = 0;
    update((d) => {
      let next = d;
      for (const k of kinds) {
        if (!values[k]) continue;
        const r = withMeterReading(next, { berthId: berth.id, kind: k, value: Number(values[k]), at: new Date().toISOString(), by: user?.name ?? "Office" }, cur ? { id: cur.id, amount: ix.amount(cur) } : undefined);
        next = r.db;
        total += r.charge;
      }
      return next;
    }, { text: `Meter readings for berth ${berth.code}${cur ? `, billed to ${ix.boat(cur.boatId)?.name}` : ""}`, to: "/berths", marinaId: berth.marinaId });
    toast(cur && total > 0 ? `Readings saved. ${money2(total)} added to ${ix.boat(cur.boatId)?.name}'s invoice.` : "Readings saved", before);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Meter readings · berth ${berth.code}`} description={cur ? `Usage since the last reading is billed to ${ix.boat(cur.boatId)?.name} (${cur.code}).` : "No boat in the berth, so nothing is billed. The reading sets the starting point."} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save readings</Button></>}>
      <div className="space-y-4">
        {kinds.map((k) => {
          const prev = lastReading(db, berth.id, k);
          const p = preview(k);
          return (
            <Field key={k} label={`${k === "power" ? "Power" : "Water"} meter (${METER_UNIT[k]})`} hint={p ? `${p.usage.toLocaleString()} ${METER_UNIT[k]} used · ${money2(p.charge)}` : prev ? `Last: ${prev.value.toLocaleString()} on ${fmtDateTime(prev.at)}` : "First reading"} error={errors[k]}>
              {(id) => <Input id={id} type="number" min={0} inputMode="numeric" value={values[k]} onChange={(e) => { setValues({ ...values, [k]: e.target.value }); setErrors({}); }} />}
            </Field>
          );
        })}
      </div>
    </Modal>
  );
}
