import { describe, expect, it } from "vitest";
import { linesTotal, renewalsDue, withRecurringTasks } from "../src/actions";
import { weeklyPay } from "../src/workforce";
import { createSeed } from "../src/seed";
import type { Contract, MaintenancePlan } from "../src/types";

describe("weekly pay", () => {
  it("pays time and a half after 40 hours", () => {
    expect(weeklyPay(40 * 60, 20)).toEqual({ regular: 40, overtime: 0, gross: 800 });
    expect(weeklyPay(45 * 60, 20)).toEqual({ regular: 40, overtime: 5, gross: 950 });
  });
});

describe("contract renewals", () => {
  const contract = (c: Partial<Contract>): Contract => ({ id: "k-1", code: "C-1", ownerId: "o", boatId: "b", berthId: "x", marinaId: "m", term: "monthly", start: "2026-09-15", end: "2026-10-15", monthlyFee: 500, autoRenew: false, status: "active", bookingId: "bk", createdAt: "2026-09-01", ...c });

  it("flags active contracts inside their notice period", () => {
    expect(renewalsDue([contract({})], "2026-10-08")).toHaveLength(1); // 7 days left, monthly notice is 7
    expect(renewalsDue([contract({})], "2026-10-07")).toHaveLength(0);
    expect(renewalsDue([contract({ term: "annual", end: "2026-12-01" })], "2026-10-08")).toHaveLength(1);
  });

  it("skips contracts already renewed, ended or past", () => {
    expect(renewalsDue([contract({}), contract({ id: "k-2", renewedFromId: "k-1", start: "2026-10-15", end: "2026-11-15" })], "2026-10-08")).toHaveLength(0);
    expect(renewalsDue([contract({ status: "ended" })], "2026-10-08")).toHaveLength(0);
    expect(renewalsDue([contract({})], "2026-10-15")).toHaveLength(0);
  });
});

describe("recurring maintenance", () => {
  const plan: MaintenancePlan = { id: "p-1", marinaId: "m-gg", title: "Check fire extinguishers", every: "month", nextDue: "2026-10-10", priority: "medium", active: true };

  it("creates the work order a week ahead and moves the plan on", () => {
    const db = { ...createSeed(), tasks: [], maintenancePlans: [plan] };
    const out = withRecurringTasks(db, "2026-10-04");
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0]).toMatchObject({ title: plan.title, due: "2026-10-10", planId: "p-1", status: "open" });
    expect(out.maintenancePlans[0].nextDue).toBe("2026-11-10");
  });

  it("never creates duplicates when run again", () => {
    const db = { ...createSeed(), tasks: [], maintenancePlans: [plan] };
    const once = withRecurringTasks(db, "2026-10-04");
    const twice = withRecurringTasks(once, "2026-10-04");
    expect(twice.tasks).toHaveLength(1);
  });

  it("waits until the plan is within a week, and ignores paused plans", () => {
    const db = { ...createSeed(), tasks: [], maintenancePlans: [plan] };
    expect(withRecurringTasks(db, "2026-10-02")).toBe(db);
    const paused = { ...db, maintenancePlans: [{ ...plan, active: false }] };
    expect(withRecurringTasks(paused, "2026-10-09").tasks).toHaveLength(0);
  });
});

describe("invoice lines", () => {
  it("adds up extra charges", () => {
    expect(linesTotal({ lines: [{ id: "l1", label: "Fuel", amount: 40 }, { id: "l2", label: "Pump-out", amount: 25 }] } as never)).toBe(65);
    expect(linesTotal(undefined)).toBe(0);
  });
});
