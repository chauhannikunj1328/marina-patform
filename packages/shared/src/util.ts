/** Next sequential id for a list, e.g. nextId("bk", bookings) -> "bk-2467". */
export function nextId(prefix: string, list: { id: string }[]): string {
  const max = list.reduce((m, x) => Math.max(m, Number(x.id.split("-").pop()) || 0), 0);
  return `${prefix}-${max + 1}`;
}
