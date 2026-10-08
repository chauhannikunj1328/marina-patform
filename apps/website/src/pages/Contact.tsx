// Contact: the head office, each marina's dock office, and a message form.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, Mail, Phone } from "lucide-react";
import { officesFor, t, telLink } from "@marina/shared";
import { useStore } from "@/data/store";
import { Button, Card, Container, Field, Input, Notice, PageHero, Select, Textarea, usePageTitle } from "@/components/ui";
import { openMarinas } from "@/lib/marinas";
import { contactMeta } from "@/lib/seo";

const TOPICS = ["A booking", "A long-term contract", "An invoice or payment", "Something else"];
const INQUIRIES_KEY = "marina.site.inquiries";

export function Contact() {
  const { db, ix, owner } = useStore();
  usePageTitle(t("Contact us"), contactMeta(db, window.location.origin));
  const marinas = openMarinas(db);
  // Links like /contact?topic=contract&marina=m-gg (from Pricing and marina pages) fill the form in.
  const [params] = useSearchParams();
  const topic = params.get("topic") === "contract" ? TOPICS[1] : TOPICS[0];
  const marinaParam = marinas.some((m) => m.id === params.get("marina")) ? params.get("marina")! : "";
  const [f, setF] = useState({ name: owner?.name ?? "", email: owner?.email ?? "", marinaId: marinaParam, topic, message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t("Enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = t("Enter a valid email.");
    if (f.message.trim().length < 10) e.message = t("Tell us a little more (at least 10 characters).");
    setErrors(e);
    if (Object.keys(e).length) return;
    // Kept in this browser until the site has a server to send it.
    try {
      const list = JSON.parse(localStorage.getItem(INQUIRIES_KEY) ?? "[]") as unknown[];
      localStorage.setItem(INQUIRIES_KEY, JSON.stringify([...list, { ...f, at: new Date().toISOString() }]));
    } catch {
      /* storage unavailable */
    }
    setSent({ name: f.name.trim().split(" ")[0], email: f.email.trim() });
    setF((s) => ({ ...s, message: "" }));
  };

  return (
    <>
      <PageHero eyebrow={t("Contact")} title={t("Contact us")} intro={t("Questions about a berth, a booking or an invoice? Call the dock office directly or send us a message.")} />
      <Container className="py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <Card className="p-6 sm:p-8">
            {sent ? (
              <div className="py-6 text-center">
                <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
                <h2 className="mt-4 text-[22px] font-medium">{t("Thanks, {name}", { name: sent.name })}</h2>
                <p className="mt-2 text-[15px] text-ink-2">{t("We'll reply to {email} within one business day.", { email: sent.email })}</p>
                <p className="mt-4 text-xs text-ink-3">{t("Preview: messages are kept in this browser until the website is connected to the office.")}</p>
                <Button className="mt-6" onClick={() => setSent(null)}>{t("Send another message")}</Button>
              </div>
            ) : (
              <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Your name")} error={errors.name}>{(id) => <Input id={id} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} />}</Field>
                <Field label={t("Email")} error={errors.email}>{(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />}</Field>
                <Field label={t("Marina")}>{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)}><option value="">{t("Not about one marina")}</option>{marinas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
                <Field label={t("It's about")}>{(id) => <Select id={id} value={f.topic} onChange={(e) => set("topic", e.target.value)}>{TOPICS.map((x) => <option key={x} value={x}>{t(x)}</option>)}</Select>}</Field>
                <div className="sm:col-span-2">
                  <Field label={t("Message")} error={errors.message}>{(id) => <Textarea id={id} rows={6} value={f.message} onChange={(e) => set("message", e.target.value)} />}</Field>
                </div>
                {Object.keys(errors).length > 0 && <div className="sm:col-span-2"><Notice tone="error">{t("Check the highlighted fields.")}</Notice></div>}
                <div className="sm:col-span-2"><Button type="submit" variant="primary" size="lg">{t("Send message")}</Button></div>
              </form>
            )}
          </Card>

          <aside className="space-y-4">
            <Card className="p-6">
              <h2 className="text-[17px] font-medium">{db.settings.company}</h2>
              <div className="mt-4 space-y-3 text-[13px]">
                {officesFor().map((o) => (
                  <div key={o.id} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
                    <p className="font-medium">{t(o.region)}</p>
                    <a href={telLink(o.phone)} className="flex items-center gap-3 hover:underline"><Phone className="size-4 text-ink-3" aria-hidden /><bdi className="num">{o.phone}</bdi></a>
                    <a href={`mailto:${o.email}`} className="flex items-center gap-3 hover:underline"><Mail className="size-4 text-ink-3" aria-hidden /><bdi>{o.email}</bdi></a>
                    <p className="text-ink-3">{t(o.hours)}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="text-[17px] font-medium">{t("Dock offices")}</h2>
              <ul className="mt-4 divide-y divide-line text-[13px]">
                {marinas.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span><Link to={`/marinas/${m.id}`} className="font-medium hover:underline">{m.name}</Link><span className="block text-xs text-ink-3">{ix.city(m.cityId)?.name}</span></span>
                    {m.phone && <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="num whitespace-nowrap text-ink-2 hover:underline"><bdi>{m.phone}</bdi></a>}
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </Container>
    </>
  );
}
