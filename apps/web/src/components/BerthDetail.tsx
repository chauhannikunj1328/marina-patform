import { useNavigate } from "react-router-dom";
import { CalendarPlus, Droplets, Wrench, Zap } from "lucide-react";
import { useStore } from "@/data/store";
import type { Berth } from "@marina/shared";
import { tn, t, fmtDate, fmtShort, today } from "@marina/shared";
import { money } from "@marina/shared";
import { Button, EmptyState, Modal, Table } from "./ui";
import { BerthBadge, BookingBadge, TaskBadge } from "./status";

export function BerthDetail({ berth: b, onClose, onEdit }: { berth: Berth; onClose: () => void; onEdit?: () => void }) {
  const { db, ix, update, toast } = useStore();
  const navigate = useNavigate();
  const now = today();
  const live = db.berths.find((x) => x.id === b.id) ?? b;
  const status = ix.berthStatus(live);
  const current = ix.currentBooking(live.id);
  const list = (ix.bookingsByBerth.get(live.id) ?? []).filter((x) => x.status !== "cancelled");
  const upcoming = list.filter((x) => x.start > now).sort((a, c) => a.start.localeCompare(c.start)).slice(0, 5);
  const past = list.filter((x) => x.end <= now).sort((a, c) => c.start.localeCompare(a.start)).slice(0, 5);
  const tasks = db.tasks.filter((t) => t.berthId === live.id && t.status !== "done");
  const marina = ix.marina(live.marinaId);

  const affected = ix.serviceConflicts(live.id);
  const toggle = () => {
    if (!live.underMaintenance && current) return toast(t("Berth {code} is occupied. Move the boat first.", { code: live.code }), undefined, "warning");
    const before = db;
    toast(
      live.underMaintenance ? t("Berth {code} back in service", { code: live.code }) : affected.length ? tn(affected.length, "Berth {code} out of service. Move {n} upcoming booking (Bookings › Conflicts).", "Berth {code} out of service. Move {n} upcoming bookings (Bookings › Conflicts).", { code: live.code }) : t("Berth {code} out of service", { code: live.code }),
      before,
    );
    update(
      (d) => ({ ...d, berths: d.berths.map((x) => (x.id === live.id ? { ...x, underMaintenance: !x.underMaintenance } : x)) }),
      { text: `Berth ${live.code} at ${marina?.name} ${live.underMaintenance ? "returned to service" : "taken out of service"}`, marinaId: live.marinaId },
    );
  };

  const row = (bk: (typeof list)[number]) => (
    <tr key={bk.id}>
      <td className="font-medium">{bk.code}</td>
      <td>{ix.boat(bk.boatId)?.name}<span className="block text-xs text-ink-3">{ix.ownerOfBooking(bk)?.name}</span></td>
      <td className="whitespace-nowrap">{fmtShort(bk.start)} – {fmtShort(bk.end)}</td>
      <td><BookingBadge status={bk.status} /></td>
    </tr>
  );

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={t("Berth {code}", { code: live.code })}
      description={marina?.name}
      footer={
        <>
          {onEdit && <Button onClick={onEdit}>{t("Edit berth")}</Button>}
          <Button icon={Wrench} onClick={toggle}>{live.underMaintenance ? t("Return to service") : t("Take out of service")}</Button>
          <Button variant="primary" icon={CalendarPlus} disabled={live.underMaintenance} onClick={() => navigate(`/bookings?new=1&marina=${live.marinaId}&berth=${live.id}`)}>{t("Book this berth")}</Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">{t("Status")}</p><div className="mt-1"><BerthBadge status={status} /></div></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">{t("Max length")}</p><p className="font-semibold">{live.maxLength} {t("ft ·")} {t(live.type)}</p></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">{t("Rates")}</p><p className="font-semibold">{money(live.dailyRate)}{t("/day")}</p><p className="text-xs text-ink-3">{money(live.monthlyRate)}{t("/month")}</p></div>
        <div className="rounded-md bg-surface-2 p-3">
          <p className="text-xs text-ink-3">{t("Services")}</p>
          <p className="mt-1 flex flex-wrap gap-2 text-[13px]">
            {live.power && <span className="flex items-center gap-1"><Zap className="size-3.5" aria-hidden />{t("Power")}</span>}
            {live.water && <span className="flex items-center gap-1"><Droplets className="size-3.5" aria-hidden />{t("Water")}</span>}
            {!live.power && !live.water && <span className="text-ink-3">{t("None")}</span>}
          </p>
        </div>
      </div>

      {current && (
        <div className="mb-5 rounded-md border border-line p-4">
          <p className="text-xs text-ink-3">{t("At the berth now")}</p>
          <p className="font-semibold">{ix.boat(current.boatId)?.name} · {ix.ownerOfBooking(current)?.name}</p>
          <p className="text-[13px] text-ink-2">{current.code} {t("· leaves")} {fmtDate(current.end)}</p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 text-[13px] font-semibold">{t("Open work orders")}</h3>
          <ul className="space-y-2">
            {tasks.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-[13px]">
                <span>{item.title} <span className="text-ink-3">{t("· due")} {fmtShort(item.due)}</span></span>
                <TaskBadge status={item.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mb-2 text-[13px] font-semibold">{t("Upcoming bookings")}</h3>
      {upcoming.length ? <Table head={["Booking", "Boat", "Dates", "Status"]}>{upcoming.map(row)}</Table> : <EmptyState title={t("Nothing booked ahead")} />}
      <h3 className="mt-5 mb-2 text-[13px] font-semibold">{t("Recent stays")}</h3>
      {past.length ? <Table head={["Booking", "Boat", "Dates", "Status"]}>{past.map(row)}</Table> : <EmptyState title={t("No past stays")} />}
    </Modal>
  );
}
