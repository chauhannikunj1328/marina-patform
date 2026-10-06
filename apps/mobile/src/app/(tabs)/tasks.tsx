// Tasks: my work orders, open ones at the marina, and finished jobs; report a new problem.
// Managers and admins reach it from Overview and see open, unassigned and finished work orders.
import { useState } from "react";
import { View } from "react-native";
import { CircleCheck, Image as ImageIcon, Plus } from "lucide-react-native";
import { relative, today, type Priority } from "@marina/shared";
import { Button, Card, EmptyState, Screen, Segmented, Txt } from "@/components/ui";
import { PriorityBadge, TaskBadge } from "@/components/status";
import { ReportProblem, TaskSheet } from "@/components/sheets";
import { useOpenParam } from "@/lib/useOpenParam";
import { ALL, useMe, useStore } from "@/store";
import { useTheme } from "@/theme";

export default function Tasks() {
  const { db, ix, can, marinaId, ids, isManager } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const [view, setView] = useState<"mine" | "open" | "done" | "unassigned">(isManager ? "open" : "mine");
  const [reporting, setReporting] = useState(false);
  const [openId, setOpenId] = useOpenParam();
  const open = db.tasks.find((x) => x.id === openId);
  const inIds = new Set(ids);
  const atMarina = db.tasks.filter((x) => inIds.has(x.marinaId));
  const lists = {
    mine: db.tasks.filter((x) => x.assigneeId === me?.id && x.status !== "done"),
    unassigned: atMarina.filter((x) => x.status !== "done" && !x.assigneeId),
    open: atMarina.filter((x) => x.status !== "done"),
    done: atMarina.filter((x) => x.status === "done").sort((a, b) => b.due.localeCompare(a.due)),
  };
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const rows = view === "done" ? lists.done : [...lists[view]].sort((a, b) => order[a.priority] - order[b.priority] || a.due.localeCompare(b.due));
  const now = today();

  return (
    <Screen title={isManager ? "Work orders" : "Tasks"} right={can("maintenance") !== "view" ? <Button size="sm" variant="primary" icon={Plus} label={isManager ? "New" : "Report"} onPress={() => setReporting(true)} /> : undefined}>
      <Segmented
        value={view}
        onChange={setView}
        items={[
          isManager ? { value: "open" as const, label: "Open", count: lists.open.length } : { value: "mine" as const, label: "Mine", count: lists.mine.length },
          isManager ? { value: "unassigned" as const, label: "Unassigned", count: lists.unassigned.length } : { value: "open" as const, label: "Open", count: lists.open.length },
          { value: "done", label: "Done", count: lists.done.length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={CircleCheck} title={view === "mine" ? "Nothing assigned to you" : view === "open" ? "No open work orders" : view === "unassigned" ? "Everything is assigned" : "Nothing finished yet"} body={view === "mine" ? "Open tasks you start are assigned to you." : undefined} />
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((x) => (
            <Card key={x.id} onPress={() => setOpenId(x.id)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{x.title}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Txt v="bodySm" color={t.text3} style={{ flexShrink: 1 }} numberOfLines={1}>{x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"}{marinaId === ALL ? ` · ${ix.marina(x.marinaId)?.name}` : ""}{x.status !== "done" ? ` · due ${relative(x.due).toLowerCase()}` : ""}</Txt>
                    {(x.photos?.length ?? 0) > 0 && <ImageIcon size={14} color={t.text3} accessibilityLabel="Has photos" />}
                  </View>
                </View>
                <PriorityBadge priority={x.priority} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <TaskBadge status={x.status} />
                {x.status !== "done" && x.due < now && <Txt v="caption" weight="semibold" color={t.error.fg}>Overdue</Txt>}
                {isManager && x.status !== "done" && <Txt v="caption" color={t.text3} numberOfLines={1} style={{ flexShrink: 1 }}>{x.assigneeId ? ix.staffMember(x.assigneeId)?.name : "Not assigned"}</Txt>}
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
