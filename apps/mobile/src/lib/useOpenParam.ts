import { useState } from "react";
import { useLocalSearchParams } from "expo-router";

/**
 * Id of the item a link asked a tab to open (`?open=<id>&at=<time>`), plus a setter for the
 * tab's own taps. A new link reopens the item even when the tab is already mounted.
 */
export function useOpenParam(): [string | undefined, (id?: string) => void] {
  const params = useLocalSearchParams<{ open?: string; at?: string }>();
  const key = `${params.open ?? ""}:${params.at ?? ""}`;
  const [seen, setSeen] = useState(key);
  const [id, setId] = useState<string | undefined>(params.open);
  if (key !== seen) {
    setSeen(key);
    setId(params.open);
  }
  return [id, setId];
}
