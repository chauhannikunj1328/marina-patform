// Status badges (guide 07). Each has an icon so meaning never relies on color alone.
import { CalendarClock, Check, CircleCheck, CircleDashed, CircleX, Clock, LogIn, Sailboat, TriangleAlert, Wrench } from "lucide-react-native";
import type { BerthStatus, BookingStatus, Priority, TaskStatus } from "@marina/shared";
import { Badge } from "./ui";
import { useTr } from "../lib/i18n";

export function BookingBadge({ status }: { status: BookingStatus }) {
  const tr = useTr();
  switch (status) {
    case "confirmed": return <Badge tone="active" icon={CircleCheck} label={tr("Confirmed")} />;
    case "checked-in": return <Badge tone="neutral" icon={LogIn} label={tr("Checked in")} />;
    case "pending": return <Badge tone="pending" icon={Clock} label={tr("Pending")} />;
    case "completed": return <Badge tone="outline" icon={Check} label={tr("Completed")} />;
    case "cancelled": return <Badge tone="cancelled" icon={CircleX} label={tr("Cancelled")} />;
  }
}

export const berthLabel: Record<BerthStatus, string> = { available: "Available", occupied: "Occupied", reserved: "Reserved", maintenance: "Maintenance" };

export function BerthBadge({ status }: { status: BerthStatus }) {
  const tr = useTr();
  switch (status) {
    case "available": return <Badge tone="active" icon={CircleDashed} label={tr("Available")} />;
    case "occupied": return <Badge tone="neutral" icon={Sailboat} label={tr("Occupied")} />;
    case "reserved": return <Badge tone="neutral" icon={CalendarClock} label={tr("Reserved")} />;
    case "maintenance": return <Badge tone="maintenance" icon={Wrench} label={tr("Maintenance")} />;
  }
}

export function TaskBadge({ status }: { status: TaskStatus }) {
  const tr = useTr();
  if (status === "open") return <Badge tone="pending" icon={CircleDashed} label={tr("task|Open")} />;
  if (status === "in-progress") return <Badge tone="info" icon={Wrench} label={tr("In progress")} />;
  return <Badge tone="success" icon={Check} label={tr("task|Done")} />;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tr = useTr();
  if (priority === "high") return <Badge tone="maintenance" icon={TriangleAlert} label={tr("Urgent")} />;
  if (priority === "medium") return <Badge tone="pending" label={tr("Medium")} />;
  return <Badge tone="neutral" label={tr("Low")} />;
}
