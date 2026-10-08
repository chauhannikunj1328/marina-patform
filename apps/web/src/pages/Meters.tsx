// Berths › Meters: power and water readings per berth. Recording a reading bills the usage since
// the last one to the boat in the berth (as a line on its invoice).
import { useState } from "react";
import { Gauge } from "lucide-react";
import { useStore } from "@/data/store";
import { t, DEFAULT_UTILITIES, fmtDateTime, lastReading, METER_UNIT, money2, roundMoney, utilityRates, withMeterReading, type Berth, type MeterKind } from "@marina/shared";
import { Button, EmptyState, Field, Input, Modal, Table } from "@/components/ui";

export function MetersPanel({ berths, canEdit }: { berths: Berth[]; canEdit: boolean }) {
  const { db, ix } = useStore();
  const [reading, setReading] = useState<Berth | undefined>();
  const metered = berths.filter((b) => b.power || b.water);
  // One currency on screen: that marina's rates. Marinas in several countries: the US dollar rates they're set in.
  const mixed = ix.mixedCurrencies([...new Set(metered.map((b) => b.marinaId))]);
  const rates = metered.length && !mixed ? utilityRates(db, metered[0].marinaId) : { ...(db.settings.utilities ?? DEFAULT_UTILITIES), currency: "USD" };
  const cell = (b: Berth, kind: MeterKind) => {
    if (!(kind === "power" ? b.power : b.water)) return <span className="text-ink-3">—</span>;
    const r = lastReading(db, b.id, kind);
    return r ? <span className="num">{r.value.toLocaleString()} {METER_UNIT[kind]}<span className="block text-xs text-ink-3">{fmtDateTime(r.at)}</span></span> : <span className="text-xs text-ink-3">{t("No reading yet")}</span>;
  };
  return (
    <div>
      <p className="px-4 py-3 text-[13px] text-ink-2">{t("Electricity")} {money2(rates.powerPerKwh, rates.currency)}{t("/kWh · water")} {money2(rates.waterPerGallon, rates.currency)}{t("/gal. Change the rates in Settings › Pricing.")}{mixed && ` ${t("Marinas outside the US charge the same in their own currency.")}`}</p>
      {metered.length === 0 ? (
        <EmptyState icon={Gauge} title={t("No metered berths here")} />
      ) : (
        <Table head={["Berth", "Boat here now", "Power meter", "Water meter", "Actions"]}>
          {metered.slice(0, 120).map((b) => {
            const cur = ix.currentBooking(b.id);
            return (
              <tr key={b.id}>
                <td className="font-medium">{b.code}<span className="block text-xs font-normal text-ink-3">{ix.marina(b.marinaId)?.name}</span></td>
                <td>{cur ? <>{ix.boat(cur.boatId)?.name}<span className="block text-xs text-ink-3">{cur.code}</span></> : <span className="text-ink-3">{t("Empty")}</span>}</td>
                <td>{cell(b, "power")}</td>
                <td>{cell(b, "water")}</td>
                <td>{canEdit && <Button size="sm" icon={Gauge} onClick={() => setReading(b)}>{t("Record reading")}</Button>}</td>
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
  const rates = utilityRates(db, berth.marinaId);
  const preview = (k: MeterKind) => {
    const prev = lastReading(db, berth.id, k);
    const v = Number(values[k]);
    if (!values[k] || !prev || !(v >= prev.value)) return undefined;
    const usage = v - prev.value;
    return { usage, charge: roundMoney(usage * (k === "power" ? rates.powerPerKwh : rates.waterPerGallon), rates.currency) };
  };
  const save = () => {
    const e: Record<string, string> = {};
    for (const k of kinds) {
      if (!values[k]) continue;
      const prev = lastReading(db, berth.id, k);
      if (!(Number(values[k]) >= 0)) e[k] = t("Enter the number on the meter.");
      else if (prev && Number(values[k]) < prev.value) e[k] = t("Lower than the last reading ({toLocaleString}). Check the meter.", { toLocaleString: prev.value.toLocaleString() });
    }
    if (!kinds.some((k) => values[k])) e.power = t("Enter at least one reading.");
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
    toast(cur && total > 0 ? t("Readings saved. {amount} added to {name}'s invoice.", { amount: money2(total, rates.currency), name: ix.boat(cur.boatId)?.name }) : t("Readings saved"), before);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Meter readings · berth {code}", { code: berth.code })} description={cur ? t("Usage since the last reading is billed to {name} ({code}).", { name: ix.boat(cur.boatId)?.name, code: cur.code }) : t("No boat in the berth, so nothing is billed. The reading sets the starting point.")} footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Save readings")}</Button></>}>
      <div className="space-y-4">
        {kinds.map((k) => {
          const prev = lastReading(db, berth.id, k);
          const p = preview(k);
          return (
            <Field key={k} label={t("{v} meter ({v2})", { v: k === "power" ? t("Power") : t("Water"), v2: METER_UNIT[k] })} hint={p ? t("{toLocaleString} {v} used · {amount}", { toLocaleString: p.usage.toLocaleString(), v: METER_UNIT[k], amount: money2(p.charge, rates.currency) }) : prev ? t("Last: {toLocaleString} on {at}", { toLocaleString: prev.value.toLocaleString(), at: fmtDateTime(prev.at) }) : t("First reading")} error={errors[k]}>
              {(id) => <Input id={id} type="number" min={0} inputMode="numeric" value={values[k]} onChange={(e) => { setValues({ ...values, [k]: e.target.value }); setErrors({}); }} />}
            </Field>
          );
        })}
      </div>
    </Modal>
  );
}
