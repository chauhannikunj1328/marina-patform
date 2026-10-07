// The operating company's logo on invoices, PDF reports and emails: their uploaded logo when set
// (Settings › Branding), otherwise the Marina logomark.
import { useStore } from "@/data/store";
import { Logomark } from "./Logo";

export function CompanyMark({ size = 36 }: { size?: number }) {
  const { db } = useStore();
  const logo = db.settings.branding?.logo;
  return logo ? <img src={logo} alt={db.settings.company} style={{ height: size, maxWidth: size * 4 }} className="object-contain" /> : <Logomark size={size} />;
}

/** Brand colour for documents, falling back to Marina Slate. */
export const useBrandColor = () => useStore().db.settings.branding?.color ?? "#2F3740";
