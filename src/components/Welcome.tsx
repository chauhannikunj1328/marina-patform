// Guide 14 Onboarding: welcome steps in a white card, green pill progress bar, Accent yellow highlight.
// Shown once per user per browser.
import { useState } from "react";
import { CalendarDays, Gauge, Keyboard, MousePointerClick, Undo2, Warehouse, type LucideIcon } from "lucide-react";
import { useStore } from "@/data/store";
import { Button, HighlightPill, Modal } from "./ui";

const KEY = (id: string) => `mms.welcomed.${id}`;

const STEPS: { title: string; body: string; points: { icon: LucideIcon; text: string }[] }[] = [
  {
    title: "Welcome to Marina",
    body: "One place to run every marina: occupancy, bookings, staff and billing across all your locations. Everything here uses sample data, so feel free to try things.",
    points: [
      { icon: Gauge, text: "Dashboards show today's occupancy and this month's revenue" },
      { icon: CalendarDays, text: "Bookings is where you approve, check in and check out boats" },
      { icon: Warehouse, text: "Berths shows every dock space, with a visual dock map" },
    ],
  },
  {
    title: "Work faster",
    body: "A few things that save time once you know them.",
    points: [
      { icon: MousePointerClick, text: "Click a number card to filter the list below it" },
      { icon: Undo2, text: "Made a mistake? Press Undo on the message that appears" },
      { icon: Keyboard, text: "Press ? for keyboard shortcuts, / to search" },
    ],
  },
  {
    title: "You're all set",
    body: "Start with the overview, or create your first booking. Your changes are saved in this browser until midnight.",
    points: [],
  },
];

export function Welcome() {
  const { user } = useStore();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(() => {
    try {
      return !!user && !localStorage.getItem(KEY(user.id));
    } catch {
      return false;
    }
  });
  if (!user || !open) return null;
  const done = () => {
    try {
      localStorage.setItem(KEY(user.id), "1");
    } catch {
      /* storage unavailable */
    }
    setOpen(false);
  };
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Modal
      open
      onClose={done}
      title={s.title}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button onClick={done} className="text-[13px] font-medium text-ink-3 hover:text-ink cursor-pointer">
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
            <Button variant="primary" onClick={() => (last ? done() : setStep(step + 1))}>
              {last ? "Start exploring" : "Next"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label="Welcome progress">
          <div className="h-full rounded-full bg-green transition-[width] duration-300 ease-brand" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <span className="num text-xs font-medium text-ink-3">
          {step + 1}/{STEPS.length}
        </span>
      </div>
      {step === 0 && (
        <div className="mb-4">
          <HighlightPill>Hi {user.name.split(" ")[0]}</HighlightPill>
        </div>
      )}
      <p className="text-[15px] text-ink-2">{s.body}</p>
      {s.points.length > 0 && (
        <ul className="mt-5 space-y-3">
          {s.points.map((p) => (
            <li key={p.text} className="flex items-center gap-3 rounded-[12px] border border-line px-4 py-3 text-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-3">
                <p.icon className="size-4 text-ink-2" aria-hidden />
              </span>
              {p.text}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
