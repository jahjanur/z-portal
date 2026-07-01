import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api";
import { setCurrencySettings } from "../utils";
import { CURRENCIES, CURRENCY_LABEL } from "../utils/currency";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT } from "../components/ui/controls";

export default function CurrencySettingsPage() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "ADMIN";

  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [usdPerEur, setUsdPerEur] = useState("1.08");
  const [usdPerCad, setUsdPerCad] = useState("0.73");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    API.get("/settings/currency")
      .then(({ data }) => {
        setDisplayCurrency(data.displayCurrency ?? "USD");
        setUsdPerEur(String(data.usdPerEur ?? 1.08));
        setUsdPerCad(String(data.usdPerCad ?? 0.73));
      })
      .catch(() => toast.error("Couldn't load currency settings"))
      .finally(() => setLoading(false));
  }, [isAdmin, navigate]);

  const save = async () => {
    const eur = parseFloat(usdPerEur);
    const cad = parseFloat(usdPerCad);
    if (!Number.isFinite(eur) || eur <= 0 || !Number.isFinite(cad) || cad <= 0) {
      toast.error("Rates must be positive numbers");
      return;
    }
    setSaving(true);
    try {
      const { data } = await API.put("/settings/currency", { displayCurrency, usdPerEur: eur, usdPerCad: cad });
      setCurrencySettings(data);
      toast.success("Currency settings saved");
      // Reload so every total across the app re-computes in the new display currency.
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl p-6 text-sm text-[var(--color-text-muted)]">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Currency"
        subtitle="Choose the currency your dashboard totals are shown in, and set the exchange rates used to convert invoices."
      />

      <div className="card-panel space-y-5 rounded-2xl p-5 sm:p-6">
        <div>
          <label className={CONTROL_LABEL}>Display currency</label>
          <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className={CONTROL_SELECT}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{CURRENCY_LABEL[c]}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Analytics and dashboard totals convert into this currency. Each invoice still shows in its own currency.
          </p>
        </div>

        <div className="border-t border-[var(--color-border)] pt-5">
          <p className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Exchange rates</p>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            How many US dollars one unit is worth. USD is the pivot (always 1.00).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={CONTROL_LABEL}>1 EUR = ? USD</label>
              <input type="number" step="0.0001" min="0" value={usdPerEur} onChange={(e) => setUsdPerEur(e.target.value)} className={CONTROL_INPUT} />
            </div>
            <div>
              <label className={CONTROL_LABEL}>1 CAD = ? USD</label>
              <input type="number" step="0.0001" min="0" value={usdPerCad} onChange={(e) => setUsdPerCad(e.target.value)} className={CONTROL_INPUT} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" loading={saving} onClick={save}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
