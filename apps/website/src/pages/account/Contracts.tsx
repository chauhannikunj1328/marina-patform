// Berth contracts: read the terms and sign with your full name.
import { useState } from "react";
import { CircleCheck, FileSignature } from "lucide-react";
import { CONTRACT_TERMS, fmtDate, localDay, money, t, today, withContractSigned, type Contract } from "@marina/shared";
import { useStore } from "@/data/store";
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Input, Modal, Notice } from "@/components/ui";

function SignDialog({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const { db, ix, owner, update, toast } = useStore();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marina = ix.marina(contract.marinaId);
  const term = CONTRACT_TERMS[contract.term];
  const sign = () => {
    if (name.trim().toLowerCase() !== owner!.name.toLowerCase()) return setError(t("Type your full name exactly as it appears on your account: {name}.", { name: owner!.name }));
    if (!agree) return setError(t("Tick the box to confirm you agree."));
    update((d) => withContractSigned(d, contract.id, name, new Date().toISOString()));
    toast(t("Contract {code} signed", { code: contract.code }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Contract {code}", { code: contract.code })} description={`${marina?.name} · ${t(term.label)}`}
      footer={<><Button onClick={onClose}>{t("Not now")}</Button><Button variant="primary" icon={FileSignature} onClick={sign}>{t("Sign contract")}</Button></>}>
      <div className="space-y-4 text-[13px] leading-5 text-ink-2">
        <dl className="grid grid-cols-2 gap-3 rounded-[12px] bg-surface-2 p-4">
          <div><dt className="text-xs text-ink-3">{t("Berth")}</dt><dd className="font-medium text-ink">{ix.berth(contract.berthId)?.code}</dd></div>
          <div><dt className="text-xs text-ink-3">{t("Boat")}</dt><dd className="font-medium text-ink">{ix.boat(contract.boatId)?.name}</dd></div>
          <div><dt className="text-xs text-ink-3">{t("From")}</dt><dd className="text-ink">{fmtDate(contract.start)}</dd></div>
          <div><dt className="text-xs text-ink-3">{t("Until")}</dt><dd className="text-ink">{fmtDate(contract.end)}</dd></div>
          <div><dt className="text-xs text-ink-3">{t("Monthly fee")}</dt><dd className="num font-medium text-ink">{money(contract.monthlyFee)}</dd></div>
          <div><dt className="text-xs text-ink-3">{t("Renewal")}</dt><dd className="text-ink">{contract.autoRenew ? t("Renews automatically") : t("Ends on the last day")}</dd></div>
        </dl>
        <ol className="list-decimal space-y-1.5 ps-5">
          <li>{t("{company} lets you use the berth above for the boat named, for the whole term.", { company: db.settings.company })}</li>
          <li>{t("The whole term is invoiced up front and is due within {n} days.", { n: db.settings.invoiceDueDays })}</li>
          <li>{t("Metered power, water and services you use are billed separately.")}</li>
          <li>{t("Keep valid insurance and registration for the boat, and follow the marina's rules.")}</li>
          <li>{contract.autoRenew ? t("The contract renews for the same term unless either side gives notice before it ends.") : t("The contract ends on its last day. Ask the marina if you'd like to renew.")}</li>
        </ol>
        <Field label={t("Type your full name to sign")}>{(id) => <Input id={id} autoComplete="name" value={name} placeholder={owner?.name} onChange={(e) => { setName(e.target.value); setError(null); }} />}</Field>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(null); }} className="mt-0.5 accent-[var(--primary)]" />
          <span>{t("I have read and agree to this contract.")}</span>
        </label>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Modal>
  );
}

export function MyContracts() {
  const { db, ix, owner } = useStore();
  const [signing, setSigning] = useState<Contract | undefined>();
  if (!owner) return null;
  const now = today();
  const contracts = db.contracts.filter((c) => c.ownerId === owner.id).sort((a, b) => b.start.localeCompare(a.start));
  return (
    <div>
      <h2 className="mb-2 text-[22px] leading-[30px] font-medium">{t("Contracts")}</h2>
      <p className="mb-6 text-[13px] text-ink-3">{t("Long-term berth agreements: monthly, seasonal or annual.")}</p>
      {contracts.length === 0 ? (
        <Card><EmptyState icon={FileSignature} title={t("No contracts")} body={t("Keeping your boat with us for months at a time? A contract costs less per month.")} action={<ButtonLink to="/pricing">{t("See contract rates")}</ButtonLink>} /></Card>
      ) : (
        <ul className="space-y-3">
          {contracts.map((c) => {
            const current = c.status === "active" && c.end > now;
            return (
              <li key={c.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[17px] font-medium">{ix.marina(c.marinaId)?.name} <span className="text-[13px] font-normal text-ink-3">· <bdi>{c.code}</bdi></span></p>
                      <p className="mt-1 text-[13px] text-ink-2">{t(CONTRACT_TERMS[c.term].label)} · {fmtDate(c.start)} – {fmtDate(c.end)}</p>
                      <p className="mt-1 text-xs text-ink-3">{t("Berth {code}", { code: ix.berth(c.berthId)?.code })} · {ix.boat(c.boatId)?.name} · <span className="num">{money(c.monthlyFee)}</span> {t("/month")}</p>
                    </div>
                    {current ? <Badge tone="active">{c.autoRenew ? t("Auto-renews") : t("Fixed term")}</Badge> : <Badge tone="outline">{t("Ended")}</Badge>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    {c.signed ? (
                      <p className="inline-flex items-center gap-2 text-[13px] text-success-fg"><CircleCheck className="size-4" aria-hidden /> {t("Signed by {name} on {date}", { name: c.signed.name, date: fmtDate(localDay(c.signed.at)) })}</p>
                    ) : current ? (
                      <>
                        <p className="text-[13px] text-ink-3">{t("Waiting for your signature.")}</p>
                        <Button variant="primary" size="sm" icon={FileSignature} onClick={() => setSigning(c)}>{t("Read and sign")}</Button>
                      </>
                    ) : <p className="text-[13px] text-ink-3">{t("Not signed online.")}</p>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {signing && <SignDialog contract={signing} onClose={() => setSigning(undefined)} />}
    </div>
  );
}
