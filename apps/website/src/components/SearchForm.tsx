// Berth search: marina, dates and boat length. Sends the visitor to the results page.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { addDays, cx, t, today } from "@marina/shared";
import { useStore } from "@/data/store";
import { openMarinas } from "@/lib/marinas";
import { Button, Field, Input, Select } from "./ui";

export interface SearchValues { marina: string; start: string; end: string; length: string }

export const defaultSearch = (): SearchValues => ({ marina: "", start: addDays(today(), 1), end: addDays(today(), 4), length: "30" });

export const searchParams = (v: SearchValues) => new URLSearchParams({ ...(v.marina ? { marina: v.marina } : {}), start: v.start, end: v.end, length: v.length }).toString();

export function SearchForm({ initial, compact, lockMarina }: { initial?: Partial<SearchValues>; compact?: boolean; lockMarina?: boolean }) {
  const { db } = useStore();
  const nav = useNavigate();
  const [v, setV] = useState<SearchValues>({ ...defaultSearch(), ...initial });
  const set = (k: keyof SearchValues, value: string) =>
    setV((s) => {
      const next = { ...s, [k]: value };
      // Moving arrival past departure keeps the stay the same length.
      if (k === "start" && next.end <= value) next.end = addDays(value, Math.max(1, Math.round((Date.parse(s.end) - Date.parse(s.start)) / 86_400_000)));
      return next;
    });
  return (
    <form
      role="search"
      aria-label={t("Find a berth")}
      onSubmit={(e) => { e.preventDefault(); nav(`/book?${searchParams(v)}`); }}
      className={cx("grid gap-3", compact ? "sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] lg:items-end" : "sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] lg:items-end")}
    >
      {!lockMarina && (
        <Field label={t("Marina")}>
          {(id) => (
            <Select id={id} value={v.marina} onChange={(e) => set("marina", e.target.value)}>
              <option value="">{t("Any marina")}</option>
              {openMarinas(db).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          )}
        </Field>
      )}
      <Field label={t("Arrive")}>{(id) => <Input id={id} type="date" required min={today()} value={v.start} onChange={(e) => set("start", e.target.value)} />}</Field>
      <Field label={t("date|Leave")}>{(id) => <Input id={id} type="date" required min={addDays(v.start || today(), 1)} value={v.end} onChange={(e) => set("end", e.target.value)} />}</Field>
      <Field label={t("Boat length (ft)")}>{(id) => <Input id={id} type="number" required min={10} max={200} inputMode="numeric" value={v.length} onChange={(e) => set("length", e.target.value)} />}</Field>
      <Button type="submit" variant="primary" size="lg" icon={Search} className={cx(lockMarina && "sm:col-span-2 lg:col-span-1")}>{t("Search")}</Button>
    </form>
  );
}
