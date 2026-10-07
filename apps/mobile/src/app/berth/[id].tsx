// Deep link from a berth QR label (marinastaff://berth/<id>): switches to that berth's marina
// and opens it in the Berths tab.
import { useEffect } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useStore } from "@/store";
import { useTr } from "@/lib/i18n";

export default function BerthLink() {
  const tr = useTr();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, user, scope, setMarinaId, toast } = useStore();
  const berth = db.berths.find((b) => b.id === id);
  const allowed = !!berth && scope.includes(berth.marinaId);

  useEffect(() => {
    if (!user) return;
    if (berth && allowed) setMarinaId(berth.marinaId);
    else toast(berth ? tr("That berth isn't at one of your marinas.") : tr("That code isn't a Marina berth label."), undefined, "warning");
    router.replace(allowed ? { pathname: "/berths", params: { open: berth.id, at: String(Date.now()) } } : "/berths");
  }, [user, berth, allowed, setMarinaId, toast, tr]);

  if (!user) return <Redirect href="/login" />;
  return null;
}
