// Status badges (guide 07). Each has an icon so meaning never relies on color alone.
import { CalendarClock, Check, CircleCheck, CircleDashed, CircleX, Clock, LogIn, Sailboat, TriangleAlert, Wrench } from "lucide-react-native";
import type { BerthStatus, BookingStatus, Priority, TaskStatus } from "@marina/shared";
import { Badge } from "./ui";

export function BookingBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case "confirmed": return <Badge tone="active" icon={CircleCheck} label="Confirmed" />;
    case "checked-in": return <Badge tone="neutral" icon={LogIn} label="Checked in" />;
    case "pending": return <Badge tone="pending" icon={Clock} label="Pending" />;
    case "completed": return <Badge tone="outline" icon={Check} label="Completed" />;
    case "cancelled": return <Badge tone="cancelled" icon={CircleX} label="Cancelled" />;
  }
}

export const berthLabel: Record<BerthStatus, string> = { available: "Available", occupied: "Occupied", reserved: "Reserved", maintenance: "Maintenance" };

export function BerthBadge({ status }: { status: BerthStatus }) {
  switch (status) {
    case "available": return <Badge tone="active" icon={CircleDashed} label="Available" />;
    case "occupied": return <Badge tone="neutral" icon={Sailboat} label="Occupied" />;
    case "reserved": return <Badge tone="neutral" icon={CalendarClock} label="Reserved" />;
    case "maintenance": return <Badge tone="maintenance" icon={Wrench} label="Maintenance" />;
  }
}

export function TaskBadge({ status }: { status: TaskStatus }) {
  if (status === "open") return <Badge tone="pending" icon={CircleDashed} label="Open" />;
  if (status === "in-progress") return <Badge tone="info" icon={Wrench} label="In progress" />;
  return <Badge tone="success" icon={Check} label="Done" />;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "high") return <Badge tone="maintenance" icon={TriangleAlert} label="Urgent" />;
  if (priority === "medium") return <Badge tone="pending" label="Medium" />;
  return <Badge tone="neutral" label="Low" />;
}
