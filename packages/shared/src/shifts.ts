import type { Shift } from "./types";

export const SHIFT_HOURS: Record<Shift, string> = { Morning: "6 am – 2 pm", Day: "9 am – 5 pm", Evening: "2 pm – 10 pm", Night: "10 pm – 6 am" };
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Hour each shift starts (24 h clock). */
export const SHIFT_START_HOUR: Record<Shift, number> = { Morning: 6, Day: 9, Evening: 14, Night: 22 };
