// Detail sheets and actions shared by the staff tabs: bookings, berths, tasks, problem reports.
import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { Camera, CircleCheck, ImagePlus, LogIn, LogOut, Mail, Phone, TriangleAlert, X } from "lucide-react-native";
import { addDays, daysBetween, fmtDate, fmtShort, nextId, relative, today, type Berth, type Booking, type BookingStatus, type MaintenanceTask, type Priority } from "@marina/shared";
import { useMe, useStore } from "../store";
import { useTheme } from "../theme";
import { pickPhoto, takePhoto } from "../lib/photos";
import { BerthBadge, BookingBadge, PriorityBadge, TaskBadge } from "./status";
import { Button, Field, Input, Row, Sheet, Txt } from "./ui";

/** Check in / check out, with Undo and an activity log entry. */
export function useBookingStatus() {
  const { db, ix, update, toast } = useStore();
  return (bk: Booking, status: BookingStatus) => {
    const boat = ix.boat(bk.boatId);
    const before = db;
    const msg = status === "checked-in" ? `${boat?.name} checked in` : `${boat?.name} checked out`;
    update((d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === bk.id ? { ...x, status } : x)) }), { text: `${msg} (${bk.code})`, to: `/bookings?q=${bk.code}`, marinaId: ix.berth(bk.berthId)?.marinaId });
    toast(msg, before);
  };
}

export function BookingSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, can } = useStore();
  const { t } = useTheme();
  const setStatus = useBookingStatus();
  const b = db.bookings.find((x) => x.id === booking.id) ?? booking;
  const boat = ix.boat(b.boatId);
  const owner = ix.ownerOfBooking(b);
  const berth = ix.berth(b.berthId);
  const canEdit = can("bookings") !== "view";
  const canCheckIn = canEdit && b.status === "confirmed" && b.start <= today();
  const canCheckOut = canEdit && b.status === "checked-in";
  return (
    <Sheet
      open
      onClose={onClose}
      title={boat?.name ?? "Booking"}
      subtitle={`${b.code} · Berth ${berth?.code}`}
      footer={
        canCheckIn ? <Button variant="primary" size="lg" icon={LogIn} label="Check in" onPress={() => { setStatus(b, "checked-in"); onClose(); }} />
        : canCheckOut ? <Button variant="primary" size="lg" icon={LogOut} label="Check out" onPress={() => { setStatus(b, "completed"); onClose(); }} />
        : <Button size="lg" label="Close" onPress={onClose} />
      }
    >
      <View style={{ marginBottom: 16 }}><BookingBadge status={b.status} /></View>
      <Row label="Boat" value={`${boat?.type} · ${boat?.length} ft`} sub={boat?.registration} />
      <Row label="Dates" value={`${fmtShort(b.start)} – ${fmtShort(b.end)}`} sub={`${daysBetween(b.start, b.end)} nights · ${b.guests} guests`} />
      <Row label="Berth" value={`${berth?.code} · up to ${berth?.maxLength} ft`} sub={`${berth?.type}${berth?.power ? " · power" : ""}${berth?.water ? " · water" : ""}`} />
      <Row label="Boat owner" value={owner?.name ?? ""} sub={owner?.email} />
      {b.status === "pending" && (
        <View style={{ backgroundColor: t.status.pending.bg, borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Txt v="bodySm" color={t.status.pending.fg}>Waiting for a manager to approve this booking.</Txt>
        </View>
      )}
      {owner && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Button style={{ flex: 1 }} icon={Phone} label="Call" disabled={!owner.phone} onPress={() => Linking.openURL(`tel:${owner.phone.replace(/[^\d+]/g, "")}`)} />
          <Button style={{ flex: 1 }} icon={Mail} label="Email" onPress={() => Linking.openURL(`mailto:${owner.email}?subject=${encodeURIComponent(`Your stay at ${ix.marinaOfBerth(b.berthId)?.name}`)}`)} />
        </View>
      )}
    </Sheet>
  );
}

export function BerthSheet({ berth, onClose, onReport }: { berth: Berth; onClose: () => void; onReport: () => void }) {
  const { db, ix, update, toast, can } = useStore();
  const b = db.berths.find((x) => x.id === berth.id) ?? berth;
  const status = ix.berthStatus(b);
  const current = ix.currentBooking(b.id);
  const next = ix.nextBooking(b.id);
  const tasks = db.tasks.filter((x) => x.berthId === b.id && x.status !== "done");
  const toggle = () => {
    if (!b.underMaintenance && current) return toast("A boat is in this berth. Check it out or move it first.", undefined, "warning");
    const before = db;
    update((d) => ({ ...d, berths: d.berths.map((x) => (x.id === b.id ? { ...x, underMaintenance: !x.underMaintenance } : x)) }), { text: `Berth ${b.code} ${b.underMaintenance ? "returned to service" : "taken out of service"}`, marinaId: b.marinaId });
    toast(b.underMaintenance ? `Berth ${b.code} back in service` : `Berth ${b.code} out of service`, before);
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Berth ${b.code}`}
      subtitle={`${b.maxLength} ft · ${b.type}${b.power ? " · power" : ""}${b.water ? " · water" : ""}`}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          {can("berths") !== "view" && <Button style={{ flex: 1 }} label={b.underMaintenance ? "Back in service" : "Out of service"} onPress={toggle} />}
          {can("maintenance") !== "view" && <Button style={{ flex: 1 }} variant="primary" icon={TriangleAlert} label="Report" onPress={onReport} />}
        </View>
      }
    >
      <View style={{ marginBottom: 16 }}><BerthBadge status={status} /></View>
      {current && <Row label="Boat here now" value={ix.boat(current.boatId)?.name ?? ""} sub={`Leaves ${fmtShort(current.end)} · ${ix.ownerOfBooking(current)?.name}`} />}
      <Row label="Next arrival" value={next ? fmtShort(next.start) : "None booked"} sub={next ? `${ix.boat(next.boatId)?.name} · ${relative(next.start).toLowerCase()}` : undefined} />
      <Row label="Open repairs" value={tasks.length ? String(tasks.length) : "None"} sub={tasks.map((x) => x.title).join(", ") || undefined} />
    </Sheet>
  );
}

export function PhotoPicker({ photos, onChange, max = 3 }: { photos: string[]; onChange: (p: string[]) => void; max?: number }) {
  const { t } = useTheme();
  const { toast } = useStore();
  const add = async (from: "camera" | "library") => {
    try {
      const p = from === "camera" ? await takePhoto() : await pickPhoto();
      if (p) onChange([...photos, p]);
      else if (from === "camera") toast("Camera not available. Choose a photo instead.", undefined, "warning");
    } catch {
      toast("Couldn't add that photo. Try another.", undefined, "error");
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Txt v="bodySm" weight="medium">Photos <Txt v="bodySm" color={t.text3}>(optional, up to {max})</Txt></Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {photos.map((p, i) => (
          <View key={i}>
            <Image source={{ uri: p }} style={{ width: 80, height: 80, borderRadius: 12 }} accessibilityLabel={`Photo ${i + 1}`} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} onPress={() => onChange(photos.filter((_, j) => j !== i))} style={{ position: "absolute", top: -8, right: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={t.onPrimary} />
            </Pressable>
          </View>
        ))}
        {photos.length < max && (
          <>
            <PhotoTile icon="camera" onPress={() => add("camera")} />
            <PhotoTile icon="library" onPress={() => add("library")} />
          </>
        )}
      </View>
    </View>
  );
}

function PhotoTile({ icon, onPress }: { icon: "camera" | "library"; onPress: () => void }) {
  const { t } = useTheme();
  const IconCmp = icon === "camera" ? Camera : ImagePlus;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={icon === "camera" ? "Take photo" : "Choose photo"} onPress={onPress} style={({ pressed }) => ({ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <IconCmp size={20} color={t.text2} />
      <Txt v="caption" color={t.text2}>{icon === "camera" ? "Camera" : "Library"}</Txt>
    </Pressable>
  );
}

export function ReportProblem({ berthId, onClose }: { berthId?: string; onClose: () => void }) {
  const { db, update, toast, marinaId } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const [title, setTitle] = useState("");
  const [berth, setBerth] = useState(berthId ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [takeOut, setTakeOut] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const save = () => {
    if (!title.trim()) return setError("Say what's wrong.");
    update((d) => {
      const task: MaintenanceTask = {
        id: nextId("t", d.tasks), code: `WO-${String(d.tasks.length + 1).padStart(3, "0")}`, title: title.trim(), marinaId, berthId: berth || undefined,
        priority, status: "open", created: today(), due: addDays(today(), priority === "high" ? 1 : 7),
        notes: [{ at: today(), by: me?.name ?? "Staff", text: "Reported from the staff app." }], photos,
      };
      const berths = takeOut && berth ? d.berths.map((b) => (b.id === berth ? { ...b, underMaintenance: true } : b)) : d.berths;
      return { ...d, tasks: [...d.tasks, task], berths };
    }, { text: `Reported a problem: ${title.trim()}`, to: "/maintenance", marinaId });
    toast("Problem reported. Your manager can see it now.");
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Report a problem" subtitle="It goes straight to the marina's work orders." footer={<Button variant="primary" size="lg" label="Send report" onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label="What's wrong?" error={error}>
          <Input multiline value={title} onChangeText={(v) => { setTitle(v); setError(""); }} placeholder="e.g. Power pedestal sparks when plugged in" invalid={!!error} />
        </Field>
        <Field label="Berth">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ id: "", code: "Not a berth" }, ...db.berths.filter((b) => b.marinaId === marinaId)].map((b) => {
              const on = berth === b.id;
              return (
                <Pressable key={b.id || "none"} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setBerth(b.id)} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", borderWidth: 1, borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primary : t.surface }}>
                  <Txt v="bodySm" weight="semibold" num color={on ? t.onPrimary : t.text}>{b.code}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>
        <Field label="How urgent?">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["low", "medium", "high"] as Priority[]).map((p) => (
              <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: priority === p }} onPress={() => setPriority(p)} style={{ flex: 1, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: priority === p ? t.primary : t.border, backgroundColor: priority === p ? t.primary : t.surface }}>
                <Txt v="bodySm" weight="semibold" color={priority === p ? t.onPrimary : t.text}>{p === "high" ? "Urgent" : p === "medium" ? "Medium" : "Low"}</Txt>
              </Pressable>
            ))}
          </View>
        </Field>
        <PhotoPicker photos={photos} onChange={setPhotos} />
        {berth ? (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: takeOut }} onPress={() => setTakeOut(!takeOut)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: t.primary, backgroundColor: takeOut ? t.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
              {takeOut && <CircleCheck size={14} color={t.onPrimary} />}
            </View>
            <Txt v="bodySm">Take this berth out of service</Txt>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

export function TaskSheet({ task, onClose }: { task: MaintenanceTask; onClose: () => void }) {
  const { db, ix, update, toast, can } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const x = db.tasks.find((y) => y.id === task.id) ?? task;
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const canEdit = can("maintenance") !== "view";
  const log = (text: string) => ({ text: `${text} (${x.code})`, to: `/maintenance?open=${x.id}`, marinaId: x.marinaId });
  const setStatus = (status: MaintenanceTask["status"]) => {
    const before = db;
    update(
      (d) => ({
        ...d,
        tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, status, assigneeId: y.assigneeId ?? me?.id } : y)),
        // Finishing the last open job on a berth puts it back in service.
        berths: status === "done" ? d.berths.map((b) => (b.id === x.berthId && !d.tasks.some((y) => y.id !== x.id && y.berthId === b.id && y.status !== "done") ? { ...b, underMaintenance: false } : b)) : d.berths,
      }),
      log(status === "done" ? `Finished: ${x.title}` : `Started: ${x.title}`),
    );
    toast(status === "done" ? "Marked as done" : "Started. It's now assigned to you.", before);
  };
  const addUpdate = () => {
    if (!note.trim() && photos.length === 0) return;
    update((d) => ({
      ...d,
      tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, notes: note.trim() ? [...y.notes, { at: today(), by: me?.name ?? "Staff", text: note.trim() }] : y.notes, photos: [...(y.photos ?? []), ...photos].slice(-6) } : y)),
    }), log("Added an update"));
    setNote("");
    setPhotos([]);
    toast("Update added");
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={x.title}
      subtitle={`${x.code} · ${x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"}`}
      footer={
        canEdit && x.status === "open" ? <Button variant="primary" size="lg" label="Start work" onPress={() => setStatus("in-progress")} />
        : canEdit && x.status === "in-progress" ? <Button variant="primary" size="lg" icon={CircleCheck} label="Mark as done" onPress={() => { setStatus("done"); onClose(); }} />
        : <Button size="lg" label="Close" onPress={onClose} />
      }
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TaskBadge status={x.status} />
        <PriorityBadge priority={x.priority} />
      </View>
      <Txt v="bodySm" color={t.text3} style={{ marginBottom: 16 }}>Due {fmtDate(x.due)} · {x.assigneeId ? `Assigned to ${ix.staffMember(x.assigneeId)?.name}` : "Unassigned"}</Txt>
      {(x.photos?.length ?? 0) > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {x.photos!.map((p, i) => <Image key={i} source={{ uri: p }} style={{ width: 96, height: 96, borderRadius: 12 }} accessibilityLabel={`Task photo ${i + 1}`} />)}
        </View>
      )}
      {x.notes.map((n, i) => (
        <View key={i} style={{ borderLeftWidth: 2, borderColor: t.border, paddingLeft: 12, marginBottom: 12 }}>
          <Txt v="bodySm">{n.text}</Txt>
          <Txt v="caption" color={t.text3}>{n.by} · {fmtShort(n.at)}</Txt>
        </View>
      ))}
      {canEdit && (
        <View style={{ gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, marginTop: 4 }}>
          <Input multiline value={note} onChangeText={setNote} placeholder="Add a note…" accessibilityLabel="Add a note" />
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <Button size="sm" label="Add update" disabled={!note.trim() && photos.length === 0} onPress={addUpdate} style={{ alignSelf: "flex-start" }} />
        </View>
      )}
    </Sheet>
  );
}
