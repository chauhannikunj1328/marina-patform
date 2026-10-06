// Deep link from a berth QR label (marinastaff://berth/<id>): switches to that berth's marina
// and opens it in the Berths tab.
import { useEffect } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useStore } from "@/store";

export default function BerthLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, user, scope, setMarinaId, toast } = useStore();
  const berth = db.berths.find((b) => b.id === id);
  const allowed = !!berth && scope.includes(berth.marinaId);

  useEffect(() => {
    if (!user) return;
    if (berth && allowed) setMarinaId(berth.marinaId);
    else toast(berth ? "That berth isn't at one of your marinas." : "That code isn't a Marina berth label.", undefined, "warning");
    router.replace(allowed ? { pathname: "/berths", params: { open: berth.id, at: String(Date.now()) } } : "/berths");
  }, [user, berth, allowed, setMarinaId, toast]);

  if (!user) return <Redirect href="/login" />;
  return null;
}
