// Emails the product owner when someone registers or signs in, via FormSubmit
// (https://formsubmit.co), which needs no account or API key. The first email
// to a new address asks the owner to confirm; after that, emails arrive normally.
// Passwords are never included.

const OWNER_EMAIL = "chauhan.nikunj1328@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${OWNER_EMAIL}`;

export interface AccessEvent {
  event: "Registered" | "Signed in";
  name: string;
  email: string;
  role: string;
  company?: string;
}

export function notifyOwner(e: AccessEvent): void {
  const payload = {
    _subject: `Marina System: ${e.name} ${e.event.toLowerCase()}`,
    _template: "table",
    _captcha: "false",
    Event: e.event,
    Name: e.name,
    Email: e.email,
    Company: e.company || "Not given",
    Role: e.role,
    Time: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    Site: window.location.origin,
    Browser: navigator.userAgent,
  };
  // Only the deployed site sends email; local development just logs it.
  if (!import.meta.env.PROD) {
    console.info("[notify] would email owner:", payload);
    return;
  }
  // Fire and forget: sign-in must never wait on, or fail because of, the email.
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* email is best-effort */
  });
}
