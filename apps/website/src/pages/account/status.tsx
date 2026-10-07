// Status badges for the owner's bookings and invoices.
import { t, today, type Booking, type Invoice } from "@marina/shared";
import { Badge, type BadgeTone } from "@/components/ui";

const BOOKING: Record<Booking["status"], { label: string; tone: BadgeTone }> = {
  pending: { label: "Waiting for confirmation", tone: "pending" },
  confirmed: { label: "Confirmed", tone: "active" },
  "checked-in": { label: "Checked in", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "outline" },
};

export const BookingStatus = ({ b }: { b: Booking }) => <Badge tone={BOOKING[b.status].tone}>{t(BOOKING[b.status].label)}</Badge>;

export function InvoiceStatus({ inv }: { inv: Invoice }) {
  if (inv.status === "paid") return <Badge tone="success">{t("Paid")}</Badge>;
  if (inv.status === "void") return <Badge tone="outline">{t("invoice|Void")}</Badge>;
  if (inv.status === "overdue" || inv.due < today()) return <Badge tone="cancelled">{t("Overdue")}</Badge>;
  return <Badge tone="pending">{inv.payments.length ? t("Part paid") : t("Due")}</Badge>;
}
