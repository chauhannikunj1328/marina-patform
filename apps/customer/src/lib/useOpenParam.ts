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

/**
 * A screen's list choice (Segmented) that a link can set with `?view=<value>&at=<time>`.
 * Falls back to `initial` when the link doesn't name a known view.
 */
export function useViewParam<T extends string>(views: readonly T[], initial: T): [T, (v: T) => void] {
  const params = useLocalSearchParams<{ view?: string; at?: string }>();
  const pick = (v?: string) => (views.includes(v as T) ? (v as T) : initial);
  const key = `${params.view ?? ""}:${params.at ?? ""}`;
  const [seen, setSeen] = useState(key);
  const [view, setView] = useState<T>(() => pick(params.view));
  if (key !== seen) {
    setSeen(key);
    setView(pick(params.view));
  }
  return [view, setView];
}

/** A fresh value for a link's `at` parameter, so following the same link again reopens the item. */
export const stamp = () => String(Date.now());
