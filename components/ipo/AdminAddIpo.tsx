"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ShieldCheck, Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAddIpo, type NewIpoForm } from "@/hooks/useAddIpo";
import { isAdminWallet } from "@/lib/admin";

const POSITIONS = ["FWD", "MID", "DEF", "GK"] as const;

const EMPTY: NewIpoForm = { name: "", symbol: "", club: "", position: "FWD", nat: "", pool: 1_000_000, days: 7 };

/** Deployer-only panel to open a new on-chain IPO from the connected wallet. */
export function AdminAddIpo() {
  const { address } = useAccount();
  const { addIpo, step, busy } = useAddIpo();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewIpoForm>(EMPTY);

  if (!isAdminWallet(address)) return null;

  const set = <K extends keyof NewIpoForm>(k: K, v: NewIpoForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.symbol.trim() && form.pool > 0 && form.days > 0;

  async function submit() {
    if (!valid || busy) return;
    const ok = await addIpo(form);
    if (ok) {
      setForm(EMPTY);
      setOpen(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="font-semibold">Admin · Create IPO</p>
          <Badge variant="up">Deployer</Badge>
        </div>
        <Button size="sm" variant={open ? "secondary" : "primary"} onClick={() => setOpen((o) => !o)} disabled={busy}>
          {open ? "Close" : <><Plus className="mr-1 h-4 w-4" /> New offering</>}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Player name" placeholder="Lamine Yamal" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <Input label="Token symbol" placeholder="$YAMAL" value={form.symbol} onChange={(e) => set("symbol", e.target.value)} />
            <Input label="Club" placeholder="FC Barcelona" value={form.club} onChange={(e) => set("club", e.target.value)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-content-secondary">Position</label>
              <select
                className="h-10 w-full rounded-lg border border-white/10 bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                value={form.position}
                onChange={(e) => set("position", e.target.value as NewIpoForm["position"])}
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <Input label="Nationality (2-letter)" placeholder="es" maxLength={3} value={form.nat} onChange={(e) => set("nat", e.target.value.toLowerCase())} />
            <Input label="Shares in pool" type="number" min={1} value={form.pool} onChange={(e) => set("pool", Number(e.target.value))} />
            <Input label="Open for (days)" type="number" min={1} value={form.days} onChange={(e) => set("days", Number(e.target.value))} />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={submit} loading={busy} disabled={!valid || busy}>
              Deploy & open sale
            </Button>
            {step && (
              <span className="flex items-center gap-1.5 text-sm text-content-secondary">
                <Loader2 className="h-4 w-4 animate-spin" /> {step}
              </span>
            )}
          </div>
          <p className="text-[11px] text-content-secondary">
            Signs 4 txs from your wallet (deploy token → mint → approve → createSale), then lists it. Pool minted to you and escrowed in FootballIPO.
          </p>
        </div>
      )}
    </Card>
  );
}
