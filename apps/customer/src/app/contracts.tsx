// Berth contracts: read the terms and sign with your full name.
import { useState } from "react";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { CircleCheck, FileSignature } from "lucide-react-native";
import { CONTRACT_TERMS, fmtDate, localDay, money, today, withContractSigned, type Contract } from "@marina/shared";
import { Badge, Button, Card, EmptyState, Field, Input, Row, Sheet, StackHeader, Txt } from "@/components/ui";
import { Body, CheckRow } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

function SignSheet({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner, update, toast } = useStore();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const marina = ix.marina(contract.marinaId);
  const term = CONTRACT_TERMS[contract.term];
  const sign = () => {
    if (name.trim().toLowerCase() !== owner!.name.toLowerCase()) return setError(tr("Type your full name exactly as it appears on your account: {name}.", { name: owner!.name }));
    if (!agree) return setError(tr("Tick the box to confirm you agree."));
    update((d) => withContractSigned(d, contract.id, name, new Date().toISOString()));
    toast(tr("Contract {code} signed", { code: contract.code }));
    onClose();
  };
  const terms = [
    tr("{company} lets you use the berth above for the boat named, for the whole term.", { company: db.settings.company }),
    tr("The whole term is invoiced up front and is due within {n} days.", { n: db.settings.invoiceDueDays }),
    tr("Metered power, water and services you use are billed separately."),
    tr("Keep valid insurance and registration for the boat, and follow the marina's rules."),
    contract.autoRenew ? tr("The contract renews for the same term unless either side gives notice before it ends.") : tr("The contract ends on its last day. Ask the marina if you'd like to renew."),
  ];
  return (
    <Sheet open onClose={onClose} title={tr("Contract {code}", { code: contract.code })} subtitle={`${marina?.name} · ${tr(term.label)}`}
      footer={<Button variant="primary" size="lg" icon={FileSignature} label={tr("Sign contract")} onPress={sign} />}>
      <View style={{ gap: 4 }}>
        <Row label={tr("Berth")} value={ix.berth(contract.berthId)?.code ?? ""} />
        <Row label={tr("Boat")} value={ix.boat(contract.boatId)?.name ?? ""} />
        <Row label={tr("From")} value={fmtDate(contract.start)} />
        <Row label={tr("Until")} value={fmtDate(contract.end)} />
        <Row label={tr("Monthly fee")} value={money(contract.monthlyFee)} />
        <Row label={tr("Renewal")} value={contract.autoRenew ? tr("Renews automatically") : tr("Ends on the last day")} />
      </View>
      <View style={{ gap: 6, marginVertical: 8 }}>
        {terms.map((x, i) => <Txt key={i} v="bodySm" color={t.text2}><Txt v="bodySm" num color={t.text3}>{i + 1}. </Txt>{x}</Txt>)}
      </View>
      <View style={{ gap: 12, marginTop: 8 }}>
        <Field label={tr("Type your full name to sign")}><Input value={name} placeholder={owner?.name} autoComplete="name" onChangeText={(v) => { setName(v); setError(""); }} /></Field>
        <CheckRow checked={agree} onChange={(v) => { setAgree(v); setError(""); }} label={tr("I have read and agree to this contract.")} />
        {error ? <Txt v="bodySm" weight="medium" color={t.error.fg}>{error}</Txt> : null}
      </View>
    </Sheet>
  );
}

export default function Contracts() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner } = useStore();
  const [signing, setSigning] = useState<Contract | undefined>();
  if (!owner) return <Redirect href="/sign-in" />;
  const now = today();
  const contracts = db.contracts.filter((c) => c.ownerId === owner.id).sort((a, b) => b.start.localeCompare(a.start));
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Contracts")} subtitle={tr("Long-term berth agreements: monthly, seasonal or annual.")} />
      <Body>
        {contracts.length === 0 ? (
          <Card>
            <EmptyState icon={FileSignature} title={tr("No contracts")} body={tr("Keeping your boat with us for months at a time? A contract costs less per month.")} />
            <Button label={tr("Explore our marinas")} onPress={() => router.push("/marinas")} />
          </Card>
        ) : contracts.map((c) => {
          const current = c.status === "active" && c.end > now;
          return (
            <Card key={c.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Txt weight="medium" style={{ flex: 1 }}>{ix.marina(c.marinaId)?.name} <Txt v="bodySm" color={t.text3}>· {c.code}</Txt></Txt>
                {current ? <Badge tone="active" label={c.autoRenew ? tr("Auto-renews") : tr("Fixed term")} /> : <Badge tone="outline" label={tr("Ended")} />}
              </View>
              <Txt v="bodySm" color={t.text2}>{tr(CONTRACT_TERMS[c.term].label)} · {fmtDate(c.start)} – {fmtDate(c.end)}</Txt>
              <Txt v="caption" color={t.text3}>{tr("Berth {code}", { code: ix.berth(c.berthId)?.code })} · {ix.boat(c.boatId)?.name} · {money(c.monthlyFee)} {tr("/month")}</Txt>
              <View style={{ borderTopWidth: 1, borderColor: t.border, marginTop: 10, paddingTop: 10 }}>
                {c.signed ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <CircleCheck size={16} color={t.success.fg} />
                    <Txt v="bodySm" color={t.success.fg} style={{ flex: 1 }}>{tr("Signed by {name} on {date}", { name: c.signed.name, date: fmtDate(localDay(c.signed.at)) })}</Txt>
                  </View>
                ) : current ? (
                  <View style={{ gap: 8 }}>
                    <Txt v="bodySm" color={t.text3}>{tr("Waiting for your signature.")}</Txt>
                    <Button variant="primary" size="sm" icon={FileSignature} label={tr("Read and sign")} onPress={() => setSigning(c)} />
                  </View>
                ) : <Txt v="bodySm" color={t.text3}>{tr("Not signed online.")}</Txt>}
              </View>
            </Card>
          );
        })}
      </Body>
      {signing && <SignSheet contract={signing} onClose={() => setSigning(undefined)} />}
    </View>
  );
}
