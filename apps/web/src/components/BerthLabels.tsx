// Printable QR labels for berth posts. Staff scan them with the Marina Staff app to open the berth.
import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Printer } from "lucide-react";
import { useStore } from "@/data/store";
import { Button, Field, Modal, Select } from "@/components/ui";
import { Logomark } from "@/components/Logo";

/** Link the staff app opens: marinastaff://berth/<id>. Phone cameras open the app from it too. */
export const berthLink = (berthId: string) => `marinastaff://berth/${berthId}`;

export function QrCode({ value, size = 112 }: { value: string; size?: number }) {
  const cells = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const dark: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) dark.push([c, r]);
    return { n, dark };
  }, [value]);
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} role="img" aria-label={`QR code for ${value}`} shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={cells.n + 4} height={cells.n + 4} fill="#FFFFFF" />
      <path d={cells.dark.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join("")} fill="#17191E" />
    </svg>
  );
}

export function BerthLabels({ defaultMarina, onClose }: { defaultMarina: string; onClose: () => void }) {
  const { db, ix, scope } = useStore();
  const marinas = db.marinas.filter((m) => scope.includes(m.id));
  const [marinaId, setMarinaId] = useState(defaultMarina !== "all" ? defaultMarina : marinas[0]?.id ?? "");
  const berths = ix.berthsIn([marinaId]).sort((a, b) => a.code.localeCompare(b.code));
  const marina = ix.marina(marinaId);
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Berth QR labels"
      description="Print and fix one to each berth post. Staff scan it in the Marina Staff app to open that berth."
      footer={<Button variant="primary" icon={Printer} onClick={() => window.print()}>Print {berths.length} labels</Button>}
    >
      <div className="mb-4 max-w-xs">
        <Field label="Marina">{(id) => (
          <Select id={id} value={marinaId} onChange={(e) => setMarinaId(e.target.value)}>
            {marinas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        )}</Field>
      </div>
      <div className="print-area grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4">
        {berths.map((b) => (
          <div key={b.id} className="flex break-inside-avoid flex-col items-center rounded-md border border-line bg-white p-3 text-center text-[#17191E]">
            <QrCode value={berthLink(b.id)} />
            <p className="mt-2 text-xl font-semibold">Berth {b.code}</p>
            <p className="text-[11px] text-[#656565]">{marina?.name} · {b.maxLength} ft</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-[#656565]"><Logomark size={10} /> Scan with Marina Staff</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
