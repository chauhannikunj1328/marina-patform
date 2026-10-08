// The owner's boats: add one, or update its name, type, length and registration.
import { useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { Pencil, Plus, Ship } from "lucide-react-native";
import { ownerBookings, today, withBoat, type Boat } from "@marina/shared";
import { Button, Card, Chip, EmptyState, Field, Input, Sheet, StackHeader, Txt } from "@/components/ui";
import { Body } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { BOAT_TYPES } from "@/lib/boats";

function BoatSheet({ boat, onClose }: { boat?: Boat; onClose: () => void }) {
  const tr = useTr();
  const { db, ix, owner, update, toast } = useStore();
  const [f, setF] = useState({ name: boat?.name ?? "", type: boat?.type ?? BOAT_TYPES[0], length: boat ? String(boat.length) : "", registration: boat?.registration ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = () => {
    const e: Record<string, string> = {};
    const length = Number(f.length);
    if (!f.name.trim()) e.name = tr("Enter your boat's name.");
    if (!(length > 0 && length <= 200)) e.length = tr("Enter your boat's length in feet.");
    // A longer boat must still fit the berths it's booked into.
    if (boat && length > boat.length) {
      const tooSmall = ownerBookings(db, owner!.id).find((b) => b.boatId === boat.id && b.end > today() && b.status !== "cancelled" && b.status !== "completed" && (ix.berth(b.berthId)?.maxLength ?? 0) < length);
      if (tooSmall) e.length = tr("Booking {code} is for a berth that takes up to {ft} ft. Contact the marina to change berths first.", { code: tooSmall.code, ft: ix.berth(tooSmall.berthId)?.maxLength });
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    update((d) => withBoat(d, owner!.id, { id: boat?.id, name: f.name.trim(), type: f.type, length, registration: f.registration.trim() }).db);
    toast(boat ? tr("{name} updated", { name: f.name.trim() }) : tr("{name} added", { name: f.name.trim() }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={boat ? tr("Edit {name}", { name: boat.name }) : tr("Add a boat")}
      footer={<Button variant="primary" size="lg" label={boat ? tr("Save changes") : tr("Add boat")} onPress={save} />}>
      <View style={{ gap: 14 }}>
        <Field label={tr("Boat name")} error={errors.name}><Input value={f.name} onChangeText={(v) => setF((s) => ({ ...s, name: v }))} invalid={!!errors.name} /></Field>
        <Field label={tr("Type")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {BOAT_TYPES.map((x) => <Chip key={x} label={tr(x)} on={f.type === x} onPress={() => setF((s) => ({ ...s, type: x }))} />)}
          </View>
        </Field>
        <Field label={tr("Length (ft)")} error={errors.length}><Input value={f.length} keyboardType="number-pad" onChangeText={(v) => setF((s) => ({ ...s, length: v.replace(/[^\d]/g, "") }))} invalid={!!errors.length} /></Field>
        <Field label={tr("Registration")} hint={tr("Optional")}><Input value={f.registration} autoCapitalize="characters" onChangeText={(v) => setF((s) => ({ ...s, registration: v }))} /></Field>
      </View>
    </Sheet>
  );
}

export default function Boats() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, owner } = useStore();
  const [editing, setEditing] = useState<Boat | "new" | undefined>();
  if (!owner) return <Redirect href="/sign-in" />;
  const boats = db.boats.filter((b) => b.ownerId === owner.id);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("My boats")} right={<Button size="sm" variant="primary" icon={Plus} label={tr("Add")} onPress={() => setEditing("new")} />} />
      <Body>
        {boats.length === 0 ? (
          <Card>
            <EmptyState icon={Ship} title={tr("No boats yet")} body={tr("Add your boat so we can match it to berths it fits.")} />
            <Button variant="primary" icon={Plus} label={tr("Add a boat")} onPress={() => setEditing("new")} />
          </Card>
        ) : boats.map((b) => (
          <Card key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ship size={22} color={t.text3} strokeWidth={1.5} />
            <View style={{ flex: 1 }}>
              <Txt weight="medium">{b.name}</Txt>
              <Txt v="bodySm" color={t.text2}>{tr(b.type)} · {tr("{ft} ft", { ft: b.length })}</Txt>
              <Txt v="caption" color={t.text3}>{b.registration || tr("No registration on file")}</Txt>
            </View>
            <Button size="sm" icon={Pencil} label={tr("Edit")} onPress={() => setEditing(b)} />
          </Card>
        ))}
      </Body>
      {editing && <BoatSheet boat={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </View>
  );
}
