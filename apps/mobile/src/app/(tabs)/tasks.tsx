// Tasks: my work orders, open ones at the marina, and finished jobs; report a new problem.
import { useState } from "react";
import { View } from "react-native";
import { CircleCheck, Image as ImageIcon, Plus } from "lucide-react-native";
import { relative, today, type Priority } from "@marina/shared";
import { Button, Card, EmptyState, Screen, Segmented, Txt } from "@/components/ui";
import { PriorityBadge, TaskBadge } from "@/components/status";
import { ReportProblem, TaskSheet } from "@/components/sheets";
import { useOpenParam, useViewParam } from "@/lib/useOpenParam";
import { useRole } from "@/lib/role";
import { useMe, useStore } from "@/store";
import { useTheme } from "@/theme";

export default function Tasks() {
  const { db, ix, can, ids } = useStore();
  const { office } = useRole();
  const me = useMe();
  const { t } = useTheme();
  // Staff start with their own jobs; managers and admins with jobs nobody has picked up.
  const [view, setView] = useViewParam(["mine", "unassigned", "open", "done"] as const, office ? "open" : "mine");
  const [reporting, setReporting] = useState(false);
  const [openId, setOpenId] = useOpenParam();
  const open = db.tasks.find((x) => x.id === openId);
  const atMarina = db.tasks.filter((x) => ids.includes(x.marinaId));
  const lists = {
    mine: db.tasks.filter((x) => x.assigneeId === me?.id && x.status !== "done"),
    unassigned: atMarina.filter((x) => !x.assigneeId && x.status !== "done"),
    open: atMarina.filter((x) => x.status !== "done"),
    done: atMarina.filter((x) => x.status === "done").sort((a, b) => b.due.localeCompare(a.due)),
  };
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const rows = view === "done" ? lists.done : [...lists[view]].sort((a, b) => order[a.priority] - order[b.priority] || a.due.localeCompare(b.due));
  const now = today();

  return (
    <Screen title={office ? "Work orders" : "Tasks"} right={can("maintenance") !== "view" ? <Button size="sm" variant="primary" icon={Plus} label="Report" onPress={() => setReporting(true)} /> : undefined}>
      <Segmented
        value={view}
        onChange={setView}
        items={[
          office ? { value: "unassigned" as const, label: "Unassigned", count: lists.unassigned.length } : { value: "mine" as const, label: "Mine", count: lists.mine.length },
          { value: "open", label: "Open", count: lists.open.length },
          { value: "done", label: "Done", count: lists.done.length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={CircleCheck} title={view === "mine" ? "Nothing assigned to you" : view === "unassigned" ? "Every open job has someone on it" : view === "open" ? "No open work orders" : "Nothing finished yet"} body={view === "mine" ? "Open tasks you start are assigned to you." : undefined} />
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((x) => (
            <Card key={x.id} onPress={() => setOpenId(x.id)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{x.title}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Txt v="bodySm" color={t.text3}>{ids.length > 1 ? `${ix.marina(x.marinaId)?.name} · ` : ""}{x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"}{x.status !== "done" ? ` · due ${relative(x.due).toLowerCase()}` : ""}</Txt>
                    {(x.photos?.length ?? 0) > 0 && <ImageIcon size={14} color={t.text3} accessibilityLabel="Has photos" />}
                  </View>
                </View>
                <PriorityBadge priority={x.priority} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <TaskBadge status={x.status} />
                {x.status !== "done" && x.due < now && <Txt v="caption" weight="semibold" color={t.error.fg}>Overdue</Txt>}
              </View>
            </Card>
          ))}
        </View>
      )}
      {open && <TaskSheet task={open} onClose={() => setOpenId(undefined)} />}
      {reporting && <ReportProblem onClose={() => setReporting(false)} />}
    </Screen>
  );
}
