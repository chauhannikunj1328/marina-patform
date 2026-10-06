// Emails the product owner when someone registers or signs in, via FormSubmit
// (https://formsubmit.co). Passwords are never included. Each app passes its own
// site and device details and decides when to send (e.g. production only).

export const OWNER_EMAIL = "chauhan.nikunj1328@gmail.com";

export interface AccessEvent {
  event: "Registered" | "Signed in";
  name: string;
  email: string;
  role: string;
  company?: string;
  /** Which product: "Web app", "Staff mobile app", … */
  app: string;
  site: string;
  device: string;
}

export function sendOwnerEmail(e: AccessEvent): Promise<unknown> {
  return fetch(`https://formsubmit.co/ajax/${OWNER_EMAIL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: `Marina: ${e.name} ${e.event.toLowerCase()} (${e.app})`,
      _template: "table",
      _captcha: "false",
      Event: e.event,
      App: e.app,
      Name: e.name,
      Email: e.email,
      Company: e.company || "Not given",
      Role: e.role,
      Time: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      Site: e.site,
      Device: e.device,
    }),
  }).catch(() => undefined);
}
