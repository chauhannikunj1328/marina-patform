// Charts styled to guide section 10 (Data visualization).
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sailboat } from "lucide-react";
import { fmtMonth } from "@/lib/date";
import { moneyShort, money } from "@/lib/format";

const axis = { fontSize: 11, fill: "var(--chart-axis)", fontFamily: "var(--font-num)" };
const tooltipStyle = {
  contentStyle: { background: "var(--raised)", border: "1px solid var(--table-line)", borderRadius: 12, fontSize: 12, color: "var(--text)", boxShadow: "var(--shadow-2)", padding: "8px 12px" },
  labelStyle: { color: "var(--text)", fontWeight: 600, marginBottom: 2 },
  itemStyle: { padding: 0 },
  cursor: { fill: "var(--surface-3)" },
};
const legendProps = { verticalAlign: "top" as const, align: "right" as const, iconType: "circle" as const, iconSize: 8, wrapperStyle: { fontSize: 12, paddingBottom: 12, color: "var(--text-2)" } };

/**
 * Categorical palette in order of use. #10B981 is left out because green means
 * positive change elsewhere in the product (section 10 "Watch" note).
 */
export const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)"];
export const MAX_SERIES = 6;

function EmptyChart() {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-3">
        <Sailboat className="size-5 text-ink-2" aria-hidden />
      </span>
      <p className="mt-3 text-[13px] text-ink-3">No bookings for this period</p>
    </div>
  );
}

/** Round an axis maximum up to a clean step (1, 2, 2.5 or 5 × 10ⁿ per tick) and return 5 ticks. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

export function RevenueChart({ months, series }: { months: string[]; series: { name: string; values: number[] }[] }) {
  const totals = months.map((_, i) => series.reduce((t, s) => t + s.values[i], 0));
  if (totals.every((t) => t === 0)) return <EmptyChart />;
  const data = months.map((m, i) => Object.fromEntries([["month", fmtMonth(m)], ...series.map((s) => [s.name, s.values[i]])]));
  const ticks = niceTicks(Math.max(...totals));
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} dy={6} />
          <YAxis tickFormatter={moneyShort} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} tick={axis} tickLine={false} axisLine={false} width={52} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(Number(v))} />
          {series.length > 1 && <Legend {...legendProps} />}
          {series.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              stackId="a"
              fill={SERIES[i % SERIES.length]}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
              animationDuration={300}
              animationEasing="ease-out"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OccupancyChart({ months, series }: { months: string[]; series: { name: string; values: number[] }[] }) {
  if (series.every((s) => s.values.every((v) => v === 0))) return <EmptyChart />;
  const data = months.map((m, i) => Object.fromEntries([["month", fmtMonth(m)], ...series.map((s) => [s.name, Math.round(s.values[i] * 1000) / 10])]));
  // Dash patterns keep lines distinguishable without relying on color (section 15).
  const dashes = ["0", "6 4", "2 3", "8 3 2 3", "4 4", "1 3"];
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} dy={6} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={axis} tickLine={false} axisLine={false} width={40} />
          <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--border-strong)" }} formatter={(v) => `${Number(v).toFixed(1)}%`} />
          {series.length > 1 && <Legend {...legendProps} iconType="circle" />}
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2}
              strokeDasharray={dashes[i % dashes.length]}
              dot={{ r: 3, strokeWidth: 0, fill: SERIES[i % SERIES.length] }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
              animationDuration={300}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Ring chart in the brand's progress-ring style (Secondary Teal scale, rounded
 * segment ends, small gaps, an Accent highlight pill in the centre).
 */
export function RingChart({ segments, center, size = 220 }: { segments: { label: string; value: number; color: string }[]; center?: ReactNode; size?: number }) {
  const total = segments.reduce((t, s) => t + s.value, 0) || 1;
  const stroke = 22;
  const r = (size - stroke) / 2 - 10;
  const c = 2 * Math.PI * r;
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 10 : 0;
  let offset = 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2 + 6} fill="none" stroke="var(--border)" strokeWidth={1} />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const dash = Math.max(0, len - gap);
          const el = s.value > 0 && (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset - gap / 2}
              style={{ transition: "stroke-dasharray 300ms ease-out" }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 flex items-center justify-center">{center}</div>}
    </div>
  );
}
