import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";
import { CURRENCIES, isCurrency } from "../lib/currency";

const router = Router();

export interface AppSettings {
  displayCurrency: string;
  usdPerEur: number;
  usdPerCad: number;
}

const DEFAULTS: AppSettings = { displayCurrency: "USD", usdPerEur: 1.08, usdPerCad: 0.73 };

/** Load the singleton settings row, creating it with defaults if missing. */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { id: 1 } });
    if (row) return { displayCurrency: row.displayCurrency, usdPerEur: row.usdPerEur, usdPerCad: row.usdPerCad };
    const created = await prisma.appSetting.create({ data: { id: 1, ...DEFAULTS } });
    return { displayCurrency: created.displayCurrency, usdPerEur: created.usdPerEur, usdPerCad: created.usdPerCad };
  } catch (e) {
    console.error("getAppSettings failed, using defaults:", e);
    return DEFAULTS;
  }
}

// GET /settings/currency — display currency + exchange rates (any signed-in user).
router.get("/currency", verifyJWT, async (_req, res) => {
  const s = await getAppSettings();
  res.json({ ...s, currencies: CURRENCIES });
});

// PUT /settings/currency — admin updates display currency and/or rates.
router.put("/currency", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const data: Partial<AppSettings> = {};
    if (req.body.displayCurrency !== undefined) {
      if (!isCurrency(req.body.displayCurrency)) return res.status(400).json({ error: "Unsupported currency" });
      data.displayCurrency = req.body.displayCurrency;
    }
    if (req.body.usdPerEur !== undefined) {
      const v = Number(req.body.usdPerEur);
      if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ error: "EUR rate must be a positive number" });
      data.usdPerEur = v;
    }
    if (req.body.usdPerCad !== undefined) {
      const v = Number(req.body.usdPerCad);
      if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ error: "CAD rate must be a positive number" });
      data.usdPerCad = v;
    }
    const row = await prisma.appSetting.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...DEFAULTS, ...data },
    });
    res.json({ displayCurrency: row.displayCurrency, usdPerEur: row.usdPerEur, usdPerCad: row.usdPerCad, currencies: CURRENCIES });
  } catch (e) {
    console.error("Failed to update currency settings:", e);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
