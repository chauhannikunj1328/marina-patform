// Web app wrapper around the shared owner-notification email. Only the deployed site sends.
import { sendOwnerEmail, type AccessEvent } from "@marina/shared";

export function notifyOwner(e: Omit<AccessEvent, "app" | "site" | "device">): void {
  const event: AccessEvent = { ...e, app: "Web app", site: window.location.origin, device: navigator.userAgent };
  if (!import.meta.env.PROD) {
    console.info("[notify] would email owner:", event);
    return;
  }
  void sendOwnerEmail(event);
}
