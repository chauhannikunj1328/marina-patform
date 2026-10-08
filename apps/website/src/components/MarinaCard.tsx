import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { money, t, tn, type Marina } from "@marina/shared";
import { useStore } from "@/data/store";
import { marinaFacts, stateOf } from "@/lib/marinas";
import { flip } from "./ui";
import { freeTonight } from "./Trust";

export function MarinaCard({ marina }: { marina: Marina }) {
  const { db, ix } = useStore();
  const f = marinaFacts(db, marina.id);
  const city = ix.city(marina.cityId);
  const free = freeTonight(db, marina.id);
  return (
    <Link to={`/marinas/${marina.id}`} className="group flex flex-col rounded-[16px] border border-line bg-surface p-5 transition-colors hover:bg-row-hover">
      <span className="flex items-center justify-between gap-2 text-xs text-ink-3">
        <span className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden />{city?.name}, {t(stateOf(db, marina))}</span>
        {free > 0 ? <span className="rounded-full bg-success-bg px-2 py-0.5 font-medium text-success-fg">{tn(free, "{n} free tonight", "{n} free tonight")}</span> : <span className="rounded-full bg-surface-3 px-2 py-0.5 font-medium text-ink-2">{t("Full tonight")}</span>}
      </span>
      <span className="mt-2 text-[17px] leading-6 font-medium">{marina.name}</span>
      <span className="mt-1 text-[13px] text-ink-2">{t("{n} berths · boats up to {ft} ft", { n: f.berths, ft: f.maxLength })}</span>
      <span className="mt-4 flex flex-wrap gap-1.5">
        {marina.amenities.slice(0, 4).map((a) => <span key={a} className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs text-ink-2">{t(a)}</span>)}
        {marina.amenities.length > 4 && <span className="rounded-full px-1 py-0.5 text-xs text-ink-3">+{marina.amenities.length - 4}</span>}
      </span>
      <span className="mt-auto flex items-end justify-between pt-5">
        <span className="text-[13px] text-ink-3">{t("from")} <span className="num text-[17px] font-semibold text-ink">{money(f.fromDaily)}</span> {t("/night")}</span>
        <ArrowRight className={`size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 ${flip(ArrowRight) ?? ""}`} aria-hidden />
      </span>
    </Link>
  );
}
