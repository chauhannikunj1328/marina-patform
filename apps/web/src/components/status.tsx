// Status badges from guide section 07. Every badge also carries an icon, so meaning
// never depends on color alone (section 15).
import { Ban, CalendarClock, Check, CircleCheck, CircleDashed, CircleX, Clock, LogIn, Mail, Pause, Sailboat, TriangleAlert, Wrench } from "lucide-react";
import type { BookingStatus, InvoiceStatus, Priority, TaskStatus } from "@marina/shared";
import type { BerthStatus } from "@marina/shared";
import { Badge } from "./ui";
import { t } from "@marina/shared";

export const bookingLabel: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  "checked-in": "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function BookingBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case "confirmed":
      return <Badge tone="active" icon={CircleCheck}>{t("Confirmed")}</Badge>;
    case "checked-in":
      return <Badge tone="neutral" icon={LogIn}>{t("Checked in")}</Badge>;
    case "pending":
      return <Badge tone="pending" icon={Clock}>{t("Pending")}</Badge>;
    case "completed":
      return <Badge tone="outline" icon={Check}>{t("Completed")}</Badge>;
    case "cancelled":
      return <Badge tone="cancelled" icon={CircleX}>{t("Cancelled")}</Badge>;
  }
}

export const berthLabel: Record<BerthStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Maintenance",
};

export function BerthBadge({ status }: { status: BerthStatus }) {
  switch (status) {
    case "available":
      return <Badge tone="active" icon={CircleDashed}>{t("Available")}</Badge>;
    case "occupied":
      return <Badge tone="neutral" icon={Sailboat}>{t("Occupied")}</Badge>;
    case "reserved":
      return <Badge tone="neutral" icon={CalendarClock}>{t("Reserved")}</Badge>;
    case "maintenance":
      return <Badge tone="maintenance" icon={Wrench}>{t("Maintenance")}</Badge>;
  }
}

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  switch (status) {
    case "paid":
      return <Badge tone="success" icon={Check}>{t("Paid")}</Badge>;
    case "due":
      return <Badge tone="pending" icon={Clock}>{t("Due")}</Badge>;
    case "overdue":
      return <Badge tone="cancelled" icon={TriangleAlert}>{t("Overdue")}</Badge>;
    case "void":
      return <Badge tone="muted" icon={Ban}>{t("Void")}</Badge>;
  }
}

export function TaskBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case "open":
      return <Badge tone="pending" icon={CircleDashed}>{t("Open")}</Badge>;
    case "in-progress":
      return <Badge tone="info" icon={Wrench}>{t("In progress")}</Badge>;
    case "done":
      return <Badge tone="success" icon={Check}>{t("Done")}</Badge>;
  }
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "high") return <Badge tone="maintenance" icon={TriangleAlert}>{t("High")}</Badge>;
  if (priority === "medium") return <Badge tone="pending">{t("Medium")}</Badge>;
  return <Badge tone="neutral">{t("Low")}</Badge>;
}

export function ActiveBadge({ status }: { status: "active" | "on-leave" | "inactive" | "invited" | "disabled" }) {
  if (status === "active") return <Badge tone="active" icon={CircleCheck}>{t("Active")}</Badge>;
  if (status === "on-leave") return <Badge tone="neutral" icon={Pause}>{t("On leave")}</Badge>;
  if (status === "invited") return <Badge tone="pending" icon={Mail}>{t("Invited")}</Badge>;
  return <Badge tone="muted" icon={Ban}>{status === "disabled" ? t("Disabled") : t("Inactive")}</Badge>;
}
