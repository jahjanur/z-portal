/**
 * Offer Proposal PDF – multi-page proposal deck (cover, overview+timeline, pricing).
 *
 * Dev note – where to tweak:
 * - Spacing: MARGIN, SECTION_GAP, HEADER_H, FOOTER_H at top of file.
 * - Fonts: Inter (TTF in public/fonts/) if present, else Helvetica. See registerInterFont.ts.
 * - Colors: PALETTE object (hex); convert to RGB for setTextColor/setFillColor/setDrawColor.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { registerInterFont } from "./registerInterFont";

/** Main platform logo from public folder (used in offer PDF cover and footer). */
function getLogoUrl(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/Zulbera-Text-Logo.svg`;
  return "/Zulbera-Text-Logo.svg";
}

/** Font for this PDF: "Inter" if TTF files are in public/fonts/, else "helvetica". Set at generation time. */
let OFFER_PDF_FONT: "Inter" | "helvetica" = "helvetica";

// ---- Layout: A4 grid, centered max width ~520pt, spacing 8/16/24/32/48 ----
const A4_W = 595;
const A4_H = 842;
const MARGIN = 38;
const CONTENT_WIDTH = A4_W - MARGIN * 2;
const SPACE_8 = 8;
const SPACE_16 = 16;
const SPACE_24 = 24;
const SPACE_32 = 32;
const SECTION_GAP = SPACE_24;
const FOOTER_H = 44;
const CARD_RADIUS = 2;
const CARD_BORDER = 0.5;
const ACCENT_RULE = 2.5; // thin accent line (2–3px)

// ---- Typography tokens: minimal luxury corporate ----
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const PALETTE = {
  text: hexToRgb("#1a1a1a"),
  textSecondary: hexToRgb("#525252"),
  meta: hexToRgb("#737373"),
  border: hexToRgb("#e5e5e5"),
  cardBg: hexToRgb("#fafafa"),
  cardBorder: hexToRgb("#e5e5e5"),
  accent: hexToRgb("#2563eb"), // single accent: thin rules only
};
const FONT = {
  keyNumber: 36, // Total / hero amount
  sectionTitle: 17, // Project title, section titles
  sectionLabel: 11, // uppercase section labels
  body: 11,
  meta: 9,
};
const LINE_HEIGHT = {
  body: 1.35,
  meta: 1.3,
};
function bodyLead(): number {
  return Math.round(FONT.body * LINE_HEIGHT.body);
}
function metaLead(): number {
  return Math.round(FONT.meta * LINE_HEIGHT.meta);
}

// Cover page (Offer style): domain, dark band colors
const COVER_MARGIN = 40;
const WEBSITE_URL = "www.zulbera.com";
const COVER_DARK_GREY = hexToRgb("#2F2F2F"); // geometric strokes
const COVER_BAND_COLOR = hexToRgb("#252525"); // bottom band (near-black)
// Artboard 2.svg viewBox 1264.17 x 217.92 — use for non-stretched logo
const COVER_LOGO_ASPECT = 1264.17 / 217.92;

export interface OfferProposalProduct {
  name: string;
  price?: number;
  timeline: string;
  techStack: string | string[];
}

export interface OfferProposalData {
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientPhone?: string;
  pageTitle: string;
  description: string;
  whatWeNeed?: string;
  roadmap?: string;
  whyToInvest?: string;
  /** Global project tech stack — shown as logos on page 2. Overrides per-product tech aggregation for that section. */
  techStack?: string[];
  products: OfferProposalProduct[];
  totalPrice: number;
}

function getPageWidth(doc: jsPDF): number {
  return (doc as unknown as { internal: { pageSize: { width: number } } }).internal.pageSize.width;
}
function getPageHeight(doc: jsPDF): number {
  return (doc as unknown as { internal: { pageSize: { height: number } } }).internal.pageSize.height;
}
function getNumberOfPages(doc: jsPDF): number {
  return (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
}

/** Convert image URL to PNG data URL for embedding (jsPDF doesn't support SVG). */
function imageUrlToPngDataUrl(url: string, maxW = 600, maxH = 120): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Logo load failed"));
    img.src = url;
  });
}

/**
 * Cover background: Background-Logo.svg (outline of Zulbera logo) scaled to fill the white zone,
 * then dark band. Paths inlined from assets/Background-Logo.svg so no extra request.
 * Positioned with more top margin so the shape extends down toward the band (like reference).
 */
function createOfferCoverBackgroundSvg(): string {
  const bandTop = Math.round(A4_H * 0.62); // ~522, band ~38%
  // Scale so logo is large and slightly cropped at sides
  const scale = 0.62; // 1080*0.62 ≈ 670
  const w = 1080 * scale;
  const tx = (A4_W - w) / 2;
  // Push logo down: more margin at top, shape extends to/near band boundary (match reference)
  const topMargin = 28;
  const ty = topMargin;
  const transform = `translate(${tx},${ty}) scale(${scale})`;

  // Paths from Background-Logo.svg (stroke-only Z outline)
  const path1 = "M511.7,490.6l-89.4-267.2c-19.5-58.4,24-118.8,85.6-118.8h302.1c60.1,0,91.1,71.8,49.8,115.5l-271.6,287.4c-23.7,25.1-65.7,15.9-76.6-16.9h0Z";
  const path2 = "M392.7,438.6l-298.2,1.6c-42-7-64.8-53.2-44.8-90.8l205.3-219.3c2.2-2.4,6.7-7.3,9-9.6,25.8-25.3,57.8-20.5,68.7,11.7l91.4,270.7c6.6,19.4-9.7,38.9-29.9,36-.5,0-.9,0-1.4,0Z";
  const path3 = "M687.3,641.4l298.2-1.6c42,7,64.8,53.2,44.8,90.8l-205.3,219.3c-2.2,2.4-6.7,7.3-9,9.6-25.8,25.3-57.8,20.5-68.7-11.7l-91.4-270.7c-6.6-19.4,9.7-38.9,29.9-36,.5,0,1,0,1.4,0h0Z";
  const path4 = "M567.7,585.4l89.4,267.2c19.5,58.4-24,118.7-85.6,118.7h-302.1c-60.1,0-91.1-71.8-49.8-115.5l271.6-287.4c23.7-25.1,65.7-15.9,76.6,16.9h0Z";

  const strokeStyle = "fill:none;stroke:#2e2e2f;stroke-miterlimit:10;stroke-width:10px";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A4_W} ${A4_H}" width="${A4_W}" height="${A4_H}">`,
    `<rect width="${A4_W}" height="${A4_H}" fill="white"/>`,
    `<g transform="${transform}" style="${strokeStyle}">`,
    `<path d="${path1}"/>`,
    `<path d="${path2}"/>`,
    `<path d="${path3}"/>`,
    `<path d="${path4}"/>`,
    `</g>`,
    `<rect x="0" y="${bandTop}" width="${A4_W}" height="${A4_H - bandTop}" fill="#252525"/>`,
    `</svg>`,
  ].join("\n");
}

/** Render SVG string to PNG data URL at 2x for sharp print. */
function renderSvgToPngDataUrl(svgString: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const cw = Math.round(A4_W * scale);
      const ch = Math.round(A4_H * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cover SVG load failed"));
    };
    img.src = url;
  });
}

/**
 * Convert an SVG string to a PNG data URL at a given pixel size (square).
 */
function svgStringToPng(svgText: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas ctx")); return; }
      ctx.drawImage(img, 0, 0, size, size);
      try { resolve(canvas.toDataURL("image/png")); } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img load")); };
    img.src = url;
  });
}

/**
 * Pre-fetch PNG data URLs for every selected tech name.
 * Returns a map: techName → PNG data URL.  Missing/failed logos are omitted.
 */
async function preloadTechLogos(techNames: string[]): Promise<Record<string, string>> {
  const { findTech } = await import("../techList");
  const map: Record<string, string> = {};
  await Promise.all(
    techNames.map(async (name) => {
      const tech = findTech(name);
      if (!tech) return;
      try {
        const resp = await fetch(`https://cdn.simpleicons.org/${tech.slug}/000000`);
        if (!resp.ok) return;
        const svgText = await resp.text();
        map[name] = await svgStringToPng(svgText, 96); // 96px → will be rendered ~22pt in PDF
      } catch {
        // skip — falls back to text
      }
    })
  );
  return map;
}

/** Footer on every page. Pages 2–3: premium header (logo + "Project Proposal" | date + ID) and footer (contact | page X of Y | validity). */
function drawHeaderFooter(
  doc: jsPDF,
  pageIndex: number,
  _pageCount: number,
  options: { proposalTitle: string; logoDataUrl?: string | null; proposalId?: string }
): void {
  const w = getPageWidth(doc);
  const h = getPageHeight(doc);
  const footerY = h - FOOTER_H + 14;
  const isOverviewOrPricing = pageIndex >= 2;

  if (isOverviewOrPricing && options.logoDataUrl != null && options.proposalId != null) {
    // ----- Premium header: logo and "Project Proposal" vertically centred on same line -----
    const logoW = 54;
    const logoH = Math.round(logoW / COVER_LOGO_ASPECT); // ~9.3pt, keeps aspect ratio
    const headerCenterY = MARGIN + 8; // vertical midpoint for alignment
    const logoTop = headerCenterY - logoH / 2;
    try {
      doc.addImage(options.logoDataUrl, "PNG", MARGIN, logoTop, logoW, logoH);
      doc.setFontSize(FONT.meta);
      doc.setTextColor(...PALETTE.meta);
      doc.setFont(OFFER_PDF_FONT, "normal");
      // Vertically centre text with the logo: baseline ≈ centre + half cap-height
      const textBaselineY = headerCenterY + FONT.meta * 0.35;
      doc.text("Project Proposal", MARGIN + logoW + 10, textBaselineY);
    } catch {
      doc.setFontSize(FONT.meta);
      doc.setFont(OFFER_PDF_FONT, "bold");
      doc.setTextColor(...PALETTE.text);
      const textBaselineY = headerCenterY + FONT.meta * 0.35;
      doc.text("Zulbera", MARGIN, textBaselineY);
      doc.setFont(OFFER_PDF_FONT, "normal");
      doc.setTextColor(...PALETTE.meta);
      doc.text("Project Proposal", MARGIN + 32, textBaselineY);
    }
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    doc.setFontSize(FONT.meta);
    doc.setTextColor(...PALETTE.meta);
    const headerTextY = headerCenterY + FONT.meta * 0.35;
    doc.text(dateStr, w - MARGIN, headerTextY - metaLead(), { align: "right" });
    doc.text(options.proposalId, w - MARGIN, headerTextY, { align: "right" });
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, headerCenterY + SPACE_16, w - MARGIN, headerCenterY + SPACE_16);
  } else if (pageIndex > 1 && pageIndex !== 2) {
    // Legacy: header on page 3+ when no logo/ID (fallback)
    doc.setFontSize(10);
    doc.setFont(OFFER_PDF_FONT, "bold");
    doc.setTextColor(...PALETTE.text);
    doc.text("Zulbera", MARGIN, 14);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.textSecondary);
    doc.setFontSize(FONT.meta);
    doc.text(options.proposalTitle, MARGIN, 22, { maxWidth: w - MARGIN * 2 - 50 });
  }

  // ----- Footer: line + contact left | page X of Y center | validity right -----
  const footerLineY = footerY - 10;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerLineY, w - MARGIN, footerLineY);
  const footerTextY = footerY + 2;
  doc.setFontSize(FONT.meta);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text(String(pageIndex), w / 2, footerTextY, { align: "center" });
  if (isOverviewOrPricing) {
    doc.text("Zulbera · www.zulbera.com", MARGIN, footerTextY);
    doc.text("Valid 14 days", w - MARGIN, footerTextY, { align: "right" });
  }
}

/**
 * Cover page (Offer style): background image (SVG-rendered rounded polygons + band),
 * then website text, logo on boundary, "Offer", "For: {CLIENT}", date.
 */
function drawCoverPage(
  doc: jsPDF,
  data: OfferProposalData,
  logoDataUrl: string | null,
  _proposalId: string,
  coverBgDataUrl: string | null
): void {
  const w = getPageWidth(doc);
  const h = getPageHeight(doc);
  const bandTop = h * 0.62;

  if (coverBgDataUrl) {
    try {
      doc.addImage(coverBgDataUrl, "PNG", 0, 0, w, h);
    } catch {
      // Fallback: solid white + dark band only
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, w, h, "F");
      doc.setFillColor(...COVER_BAND_COLOR);
      doc.rect(0, bandTop, w, h - bandTop, "F");
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, w, h, "F");
    doc.setFillColor(...COVER_BAND_COLOR);
    doc.rect(0, bandTop, w, h - bandTop, "F");
  }

  // ----- Top white zone: logo top-left, website URL top-right -----
  const logoW = 96;
  const logoH = Math.round(logoW / COVER_LOGO_ASPECT);
  const logoX = COVER_MARGIN;
  const logoY = COVER_MARGIN - logoH / 2; // vertically centred on the top margin line
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      doc.setFontSize(18);
      doc.setTextColor(...COVER_DARK_GREY);
      doc.setFont(OFFER_PDF_FONT, "bold");
      doc.text("Zulbera", logoX, COVER_MARGIN + 4);
    }
  } else {
    doc.setFontSize(18);
    doc.setTextColor(...COVER_DARK_GREY);
    doc.setFont(OFFER_PDF_FONT, "bold");
    doc.text("Zulbera", logoX, COVER_MARGIN + 4);
  }

  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text(WEBSITE_URL, w - COVER_MARGIN, COVER_MARGIN, { align: "right" });

  // ----- Bottom dark band: Offer (upper part), For (lower part), date -----
  const white: [number, number, number] = [255, 255, 255];
  const bandPadding = COVER_MARGIN;
  // "Offer" in upper portion of band (aligned with logo area), not too low
  const offerY = bandTop + (h - bandTop) * 0.18;

  doc.setFontSize(52);
  doc.setFont(OFFER_PDF_FONT, "bold");
  doc.setTextColor(...white);
  doc.text("Offer", w - bandPadding, offerY, { align: "right" });

  const forLabel = "For: ";
  const clientName = (data.clientName || "").trim().toUpperCase() || "CLIENT";
  const forText = forLabel + clientName;
  const forMaxW = w * 0.5;
  const forLines = doc.splitTextToSize(forText, forMaxW);
  const forFontSize = forLines.length > 1 ? 14 : 18;
  doc.setFontSize(forFontSize);
  doc.setFont(OFFER_PDF_FONT, "bold");
  doc.setTextColor(...white);
  // "For: {Client}" — pushed well up (extra margin from bottom)
  const forBottomMargin = 130;
  const forY = h - bandPadding - forBottomMargin - (forLines.length > 1 ? 18 : 0);
  doc.text(forLines, bandPadding, forY);

  // 3) Date bottom-right (DD.MM.YYYY), small, light grey
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const dateStr = `${day}.${month}.${year}`;
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text(dateStr, w - bandPadding, h - bandPadding - 18, { align: "right" });
}

const MAX_DESC_LENGTH = 380;
const MAX_SCOPE_ITEMS = 12;
const OVERVIEW_HEADER_RESERVED = 48;

/** Format amount as Euro with symbol after the number (e.g. "1,500.00 €"). */
function formatEuro(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Normalize text for PDF: trim, collapse whitespace, strip weird chars, fallback "—". */
function normalizeText(s: string | undefined, fallback = "—"): string {
  if (s == null) return fallback;
  const t = String(s)
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .trim();
  return t.length > 0 ? t : fallback;
}
function trim(s: string | undefined): string {
  return (s || "").trim();
}
function hasContent(s: string | undefined): boolean {
  return trim(s).length > 0;
}

/** Refined card: optional very subtle fill, thin border. */
function RefinedCard(doc: jsPDF, x: number, y: number, w: number, h: number, filled: boolean = false): void {
  if (filled) {
    doc.setFillColor(...PALETTE.cardBg);
    doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "F");
  }
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.setLineWidth(CARD_BORDER);
  doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "S");
}

/** Draw a light card (fill + 1px border, rounded). */
function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "F");
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.setLineWidth(CARD_BORDER);
  doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "S");
}

/** Page 2 (Overview): split client card (info left | project title right), then 2-col body. */
function drawOverviewPage(
  doc: jsPDF,
  data: OfferProposalData,
  _proposalId: string,
  _logoDataUrl: string | null,
  techLogos: Record<string, string> = {}
): void {
  doc.addPage();
  const contentW = CONTENT_WIDTH;
  let y = MARGIN + OVERVIEW_HEADER_RESERVED;

  // ── Section header helper: full-width rule under label ──────────────
  const drawSection = (x: number, curY: number, label: string, colW: number): number => {
    doc.setFontSize(FONT.meta);
    doc.setTextColor(...PALETTE.meta);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.text(label.toUpperCase(), x, curY + 3);
    curY += 10;
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.3);
    doc.line(x, curY, x + colW, curY);
    return curY + SPACE_8 + 2;
  };

  // ── Client + Project card (full width) ──────────────────────────────
  // Left 48%: accent bar + "PREPARED FOR" + hero name + contact details
  // Vertical divider
  // Right 52%: "PROJECT" micro-label + title (vertically centred)
  const cardPad = 18;
  const accentW = 4;
  const cardX = MARGIN;
  const cardW = contentW;
  const dividerRatio = 0.48;
  const dividerX = cardX + Math.round(cardW * dividerRatio);

  const rightContentX = dividerX + cardPad;
  const rightContentW = cardX + cardW - rightContentX - cardPad;
  const leftContentX = cardX + cardPad;
  const leftContentW = dividerX - cardX - cardPad * 2;

  doc.setFontSize(FONT.sectionTitle + 2);
  const titleLines = hasContent(data.pageTitle)
    ? doc.splitTextToSize(trim(data.pageTitle), rightContentW)
    : ["—"];

  // Measure hero name
  const heroName = trim(data.clientName) || "—";
  doc.setFontSize(20);
  doc.setFont(OFFER_PDF_FONT, "bold");
  const heroNameLines = doc.splitTextToSize(heroName, leftContentW);

  // Contact items below separator (email | company+phone)
  const emailStr = trim(data.clientEmail || "");
  const companyPhone = [trim(data.clientCompany || ""), trim(data.clientPhone || "")].filter(Boolean).join("  ·  ");

  // Calculate card height from content
  const leftH =
    cardPad           // top
    + metaLead()      // "PREPARED FOR" label
    + 8               // gap
    + heroNameLines.length * 24  // hero name lines
    + 12              // gap before separator
    + 1               // separator
    + 11              // gap after separator
    + (emailStr ? 14 : 0)  // email line
    + (companyPhone ? 14 : 0)  // company+phone line
    + cardPad;        // bottom

  const rightH = cardPad * 2 + metaLead() + 12 + titleLines.length * (FONT.sectionTitle + 6);
  const cardH = Math.max(leftH, rightH, 100);

  drawCard(doc, cardX, y, cardW, cardH);

  // Left accent bar (dark, full card height)
  doc.setFillColor(...PALETTE.text);
  doc.rect(cardX, y, accentW, cardH, "F");

  // "PREPARED FOR" micro-label
  doc.setFontSize(FONT.meta - 1);
  doc.setTextColor(...PALETTE.meta);
  doc.setFont(OFFER_PDF_FONT, "normal");
  const prepLabelY = y + cardPad + 3;
  doc.text("PREPARED FOR", leftContentX, prepLabelY);

  // Hero client name
  const heroY = prepLabelY + metaLead() + 8;
  doc.setFontSize(20);
  doc.setFont(OFFER_PDF_FONT, "bold");
  doc.setTextColor(...PALETTE.text);
  doc.text(heroNameLines, leftContentX, heroY);

  // Thin separator line below name
  const sepY = heroY + heroNameLines.length * 24 + 10;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(leftContentX, sepY, dividerX - cardPad, sepY);

  // Contact details below separator
  let contactY = sepY + 12;
  doc.setFont(OFFER_PDF_FONT, "normal");
  if (emailStr) {
    doc.setFontSize(FONT.body - 1);
    doc.setTextColor(...PALETTE.textSecondary);
    doc.text(emailStr, leftContentX, contactY, { maxWidth: leftContentW });
    contactY += 14;
  }
  if (companyPhone) {
    doc.setFontSize(FONT.body - 1);
    doc.setTextColor(...PALETTE.meta);
    doc.text(companyPhone, leftContentX, contactY, { maxWidth: leftContentW });
  }

  // Vertical divider
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.4);
  doc.line(dividerX, y + cardPad, dividerX, y + cardH - cardPad);

  // Right: "PROJECT" micro-label + title vertically centred
  doc.setFontSize(FONT.meta - 1);
  doc.setTextColor(...PALETTE.meta);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text("PROJECT", rightContentX, prepLabelY);

  if (hasContent(data.pageTitle)) {
    const titleBlockH = titleLines.length * (FONT.sectionTitle + 6);
    const titleY = y + (cardH - titleBlockH) / 2 + FONT.sectionTitle;
    doc.setFontSize(FONT.sectionTitle + 2);
    doc.setFont(OFFER_PDF_FONT, "bold");
    doc.setTextColor(...PALETTE.text);
    doc.text(titleLines, rightContentX, titleY);
  }

  y += cardH + SPACE_32 + 14;

  // ── Two-column body: left 60% narrative | right 40% specs ───────────
  const colGap = SPACE_32;
  const leftColW = Math.round(contentW * 0.575);
  const rightColW = contentW - leftColW - colGap;
  const leftColX = MARGIN;
  const rightColX = MARGIN + leftColW + colGap;
  const lineH = 8;
  const sectionGap = 34;

  let leftY = y;
  let rightY = y;

  // ── LEFT: Project Summary (description only — title lives in the card)
  if (hasContent(data.description)) {
    leftY = drawSection(leftColX, leftY, "Project Summary", leftColW);
    leftY += 8; // breathing room between rule and subtitle
    if (hasContent(data.pageTitle)) {
      doc.setFontSize(FONT.body + 1);
      doc.setFont(OFFER_PDF_FONT, "bold");
      doc.setTextColor(...PALETTE.text);
      const subTitle = doc.splitTextToSize(trim(data.pageTitle), leftColW);
      doc.text(subTitle, leftColX, leftY);
      leftY += subTitle.length * 13 + 4;
    }
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setFontSize(FONT.body);
    doc.setTextColor(...PALETTE.textSecondary);
    const rawDesc = trim(data.description) || "—";
    const desc = rawDesc.length > MAX_DESC_LENGTH ? rawDesc.slice(0, MAX_DESC_LENGTH).trim() + "…" : rawDesc;
    const descLines = doc.splitTextToSize(desc, leftColW);
    doc.text(descLines, leftColX, leftY);
    leftY += descLines.length * lineH + sectionGap + 12;
  }

  // ── LEFT: What We Need ──────────────────────────────────────────────
  if (hasContent(data.whatWeNeed)) {
    leftY = drawSection(leftColX, leftY, "What We Need", leftColW);
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.textSecondary);
    const lines = doc.splitTextToSize(trim(data.whatWeNeed!), leftColW);
    doc.text(lines, leftColX, leftY);
    leftY += lines.length * lineH + sectionGap;
  }

  // ── LEFT: Roadmap ────────────────────────────────────────────────────
  if (hasContent(data.roadmap)) {
    leftY = drawSection(leftColX, leftY, "Roadmap", leftColW);
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.textSecondary);
    const lines = doc.splitTextToSize(trim(data.roadmap!), leftColW);
    doc.text(lines, leftColX, leftY);
    leftY += lines.length * lineH + sectionGap;
  }

  // ── RIGHT: Tech Stack (logos if available, text fallback) ───────────
  const globalTechs: string[] =
    data.techStack && data.techStack.length > 0
      ? data.techStack
      : (() => {
          const s = new Set<string>();
          data.products.forEach((p) => {
            const arr = Array.isArray(p.techStack)
              ? p.techStack
              : String(p.techStack || "").split(",").map((t) => t.trim()).filter(Boolean);
            arr.forEach((t) => s.add(t));
          });
          return Array.from(s);
        })();

  if (globalTechs.length > 0) {
    rightY = drawSection(rightColX, rightY, "Tech Stack", rightColW);

    const LOGO_PT = 22;   // rendered size in PDF points
    const LOGO_GAP = 10;  // gap between icons
    const ROW_STRIDE = LOGO_PT + LOGO_GAP;
    let lx = rightColX;
    let ly = rightY;

    globalTechs.forEach((techName) => {
      // Wrap to next row if needed
      if (lx + LOGO_PT > rightColX + rightColW) {
        lx = rightColX;
        ly += ROW_STRIDE;
      }

      const logoDataUrl = techLogos[techName];
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, "PNG", lx, ly, LOGO_PT, LOGO_PT);
        } catch {
          // fallback: small text label
          doc.setFontSize(7);
          doc.setFont(OFFER_PDF_FONT, "normal");
          doc.setTextColor(...PALETTE.meta);
          doc.text(techName.slice(0, 8), lx, ly + LOGO_PT - 4, { maxWidth: LOGO_PT + 4 });
        }
      } else {
        // No logo fetched — draw a subtle bordered square with initials
        doc.setDrawColor(...PALETTE.border);
        doc.setLineWidth(0.4);
        doc.roundedRect(lx, ly, LOGO_PT, LOGO_PT, 2, 2, "S");
        const initials = techName.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase();
        doc.setFontSize(7);
        doc.setFont(OFFER_PDF_FONT, "bold");
        doc.setTextColor(...PALETTE.meta);
        doc.text(initials, lx + LOGO_PT / 2, ly + LOGO_PT / 2 + 2.5, { align: "center" });
      }

      lx += LOGO_PT + LOGO_GAP;
    });

    rightY = ly + LOGO_PT + sectionGap;
  }

  // ── RIGHT: Timeline ──────────────────────────────────────────────────
  const productsWithTimeline = data.products.filter((p) => hasContent(p.timeline) || hasContent(p.name));
  if (productsWithTimeline.length > 0) {
    rightY = drawSection(rightColX, rightY, "Timeline", rightColW);
    productsWithTimeline.forEach((p, i) => {
      const label = normalizeText(p.name) || `Phase ${i + 1}`;
      const duration = hasContent(p.timeline) ? ` — ${p.timeline}` : "";
      const wrapped = doc.splitTextToSize(label + duration, rightColW - 8);
      doc.setFontSize(FONT.body);
      doc.setTextColor(...PALETTE.text);
      doc.setFont(OFFER_PDF_FONT, "normal");
      doc.text(wrapped, rightColX + 6, rightY + 4);
      rightY += wrapped.length * lineH + 10;
    });
    rightY += sectionGap;
  }

  // ── RIGHT: Services & Deliverables ──────────────────────────────────
  const deliverables = data.products.map((p) => p.name?.trim()).filter(Boolean).slice(0, MAX_SCOPE_ITEMS);
  if (deliverables.length > 0) {
    rightY = drawSection(rightColX, rightY, "Services & Deliverables", rightColW);
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.text);
    deliverables.forEach((name) => {
      const wrapped = doc.splitTextToSize("• " + name, rightColW);
      doc.text(wrapped, rightColX, rightY);
      rightY += wrapped.length * lineH + 7;
    });
    rightY += sectionGap;
  }

  // ── RIGHT: Next Steps ────────────────────────────────────────────────
  rightY = drawSection(rightColX, rightY, "Next Steps", rightColW);
  const nextSteps = ["Review this proposal and confirm scope.", "Sign off and kickoff schedule."];
  doc.setFontSize(FONT.body);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.setTextColor(...PALETTE.text);
  nextSteps.forEach((step, i) => {
    const wrapped = doc.splitTextToSize(`${i + 1}. ${step}`, rightColW);
    doc.text(wrapped, rightColX, rightY);
    rightY += wrapped.length * lineH + 9;
  });
  rightY += 16;

  doc.setFontSize(FONT.meta);
  doc.setTextColor(...PALETTE.meta);
  doc.text("Valid for 14 days", rightColX, rightY);
}

/** Page 3 (Pricing): PricingHero (refined band), light table, TotalsBreakdown, Commercial Notes, Terms + Acceptance. */
function drawPricingPage(doc: jsPDF, data: OfferProposalData, proposalId: string): void {
  doc.addPage();
  const contentW = CONTENT_WIDTH;
  let y = MARGIN + OVERVIEW_HEADER_RESERVED;
  const bl = bodyLead();

  // ----- PricingHero: left = Total Investment + amount + currency; right = payment terms + validity + ID; thin accent, no heavy fill -----
  const bandH = 56;
  doc.setDrawColor(...PALETTE.accent);
  doc.setLineWidth(ACCENT_RULE);
  doc.line(MARGIN, y, MARGIN, y + bandH);
  doc.setFontSize(FONT.sectionLabel);
  doc.setTextColor(...PALETTE.meta);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text("TOTAL INVESTMENT", MARGIN + 12, y + 14);
  doc.setFontSize(22);
  doc.setFont(OFFER_PDF_FONT, "bold");
  doc.setTextColor(...PALETTE.text);
  doc.text(formatEuro(data.totalPrice), MARGIN + 12, y + 38);
  doc.setFontSize(FONT.meta);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.setTextColor(...PALETTE.meta);
  doc.text("EUR", MARGIN + 12, y + 48);
  doc.setFontSize(FONT.meta);
  doc.text("Payment: deposit & milestones as agreed.", MARGIN + contentW - 12, y + 10, { align: "right" });
  doc.text("Valid 14 days from issue date.", MARGIN + contentW - 12, y + 10 + metaLead(), { align: "right" });
  doc.text(proposalId, MARGIN + contentW - 12, y + 10 + metaLead() * 2, { align: "right" });
  y += bandH + SECTION_GAP;

  // ----- Deliverables table: balanced column widths so content fits; light header -----
  const tableWidth = contentW;
  const colWidths: Record<number, number> = {
    0: tableWidth * 0.35,
    1: tableWidth * 0.24,
    2: tableWidth * 0.23,
    3: tableWidth * 0.18,
  };
  const columns = ["Deliverable", "Timeline", "Tech", "Price"];
  const bodyRows = data.products.map((p) => {
    const tech = Array.isArray(p.techStack) ? (p.techStack as string[]).map((t) => normalizeText(t)).join(", ") : normalizeText(String(p.techStack || ""));
    return [normalizeText(p.name), normalizeText(p.timeline), tech || "—", p.price != null ? formatEuro(p.price) : "—"];
  });
  const rowAlt: [number, number, number] = [252, 252, 252];

  autoTable(doc, {
    startY: y,
    head: [columns],
    body: bodyRows,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth,
    showHead: "everyPage",
    headStyles: {
      fillColor: [250, 250, 250],
      textColor: PALETTE.text as unknown as [number, number, number],
      fontStyle: "bold",
      fontSize: FONT.sectionLabel,
      cellPadding: { top: 10, right: 8, bottom: 10, left: 8 },
      lineWidth: 0.3,
      lineColor: PALETTE.border as unknown as [number, number, number],
    },
    bodyStyles: {
      fontSize: FONT.body,
      cellPadding: { top: 10, right: 8, bottom: 10, left: 8 },
      textColor: PALETTE.text as unknown as [number, number, number],
      lineColor: PALETTE.border as unknown as [number, number, number],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: colWidths[0], halign: "left" },
      1: { cellWidth: colWidths[1], halign: "left" },
      2: { cellWidth: colWidths[2], halign: "left" },
      3: { cellWidth: colWidths[3], halign: "right" },
    },
    didParseCell: (cellData) => {
      if (cellData.section === "body" && cellData.row.index % 2 === 1) {
        cellData.cell.styles.fillColor = rowAlt;
      }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + SPACE_24;

  // ----- TotalsBreakdown: Subtotal / Taxes / Total, right-aligned -----
  const subtotal = data.totalPrice;
  const taxes = 0;
  const total = subtotal + taxes;
  const breakdownW = 140;
  const breakdownX = MARGIN + contentW - breakdownW;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(breakdownX, y, breakdownX + breakdownW, y);
  y += SPACE_16;
  doc.setFontSize(FONT.body);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.setTextColor(...PALETTE.text);
  doc.text("Subtotal", breakdownX, y);
  doc.text(formatEuro(subtotal), breakdownX + breakdownW, y, { align: "right" });
  y += bl + 4;
  doc.setTextColor(...PALETTE.meta);
  doc.text("Taxes (if any)", breakdownX, y);
  doc.text(taxes === 0 ? "—" : formatEuro(taxes as number), breakdownX + breakdownW, y, { align: "right" });
  y += bl + 8;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.5);
  doc.line(breakdownX, y, breakdownX + breakdownW, y);
  y += SPACE_8;
  doc.setFontSize(FONT.sectionLabel);
  doc.setFont(OFFER_PDF_FONT, "bold");
  doc.setTextColor(...PALETTE.text);
  doc.text("Total", breakdownX, y);
  doc.text(formatEuro(total), breakdownX + breakdownW, y, { align: "right" });
  y += bl + SECTION_GAP;

  // ----- Commercial Notes: refined block, thin border, bullets max 1 line -----
  const notesBullets = hasContent(data.whyToInvest)
    ? normalizeText(data.whyToInvest).split(/\n|\.\s+/).map((s) => normalizeText(s).slice(0, 70)).filter((s) => s !== "—").slice(0, 5)
    : [
        "Pricing assumes scope as described; changes require a revised quote.",
        "Payment terms: deposit and milestones to be agreed in contract.",
        "Deliverables subject to acceptance criteria and sign-off.",
      ];
  const notesPad = 12;
  const notesH = 12 + notesBullets.length * (bl + 6) + notesPad;
  RefinedCard(doc, MARGIN, y, contentW, notesH, true);
  doc.setFontSize(FONT.sectionLabel);
  doc.setTextColor(...PALETTE.meta);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text("COMMERCIAL NOTES & ASSUMPTIONS", MARGIN + notesPad, y + 12);
  doc.setFontSize(FONT.body);
  doc.setTextColor(...PALETTE.text);
  let ny = y + 12 + metaLead() + 4;
  notesBullets.forEach((b) => {
    const oneLine = b.length > 72 ? b.slice(0, 69) + "…" : b;
    doc.text(`· ${oneLine}`, MARGIN + notesPad, ny);
    ny += bl + 6;
  });
  y += notesH + SECTION_GAP;

  // ----- Terms (left) + Acceptance (right): equal-height cards; Terms text wraps inside card; signature lines full width -----
  const bottomCardW = (contentW - SPACE_24) / 2;
  const cardPad = 14;
  const termsTextW = bottomCardW - cardPad * 2;
  const termsBullets = [
    "Revisions: 2 rounds included; further changes quoted separately.",
    "Delivery: milestones and handover as per timeline.",
    "Communication: regular check-ins; 2 business days response.",
    "Support: 30-day post-delivery window for defects.",
    "Scope changes: written change request and revised quote required.",
  ];
  doc.setFontSize(FONT.body);
  doc.setFont(OFFER_PDF_FONT, "normal");
  let termsContentH = 12 + metaLead() + 8;
  termsBullets.forEach((line) => {
    const wrapped = doc.splitTextToSize(`· ${line}`, termsTextW);
    termsContentH += wrapped.length * bl + 4;
  });
  termsContentH += cardPad;

  const acceptBlockH = 172;
  const cardH = Math.max(termsContentH, acceptBlockH);

  RefinedCard(doc, MARGIN, y, bottomCardW, cardH, true);
  doc.setFontSize(FONT.sectionLabel);
  doc.setTextColor(...PALETTE.meta);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text("TERMS", MARGIN + cardPad, y + 12);
  doc.setFontSize(FONT.body);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.setTextColor(...PALETTE.text);
  let ty = y + 12 + metaLead() + 8;
  termsBullets.forEach((line) => {
    const wrapped = doc.splitTextToSize(`· ${line}`, termsTextW);
    doc.text(wrapped, MARGIN + cardPad, ty);
    ty += wrapped.length * bl + 4;
  });

  RefinedCard(doc, MARGIN + bottomCardW + SPACE_24, y, bottomCardW, cardH, true);
  doc.setFontSize(FONT.sectionLabel);
  doc.setTextColor(...PALETTE.meta);
  doc.text("ACCEPTANCE", MARGIN + bottomCardW + SPACE_24 + cardPad, y + 12);
  doc.setFontSize(FONT.body);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.setTextColor(...PALETTE.text);
  const clientLabel = normalizeText(data.clientName);
  const companyLabel = hasContent(data.clientCompany) ? `, ${normalizeText(data.clientCompany)}` : "";
  const prepLines = doc.splitTextToSize(`Prepared for: ${clientLabel}${companyLabel}`, termsTextW);
  doc.text(prepLines, MARGIN + bottomCardW + SPACE_24 + cardPad, y + 12 + metaLead() + 8);
  let acceptY = y + 12 + metaLead() + 8 + prepLines.length * bl + 6;
  const acceptStmtLines = doc.splitTextToSize("By signing below, the client accepts this proposal and its terms.", termsTextW);
  doc.text(acceptStmtLines, MARGIN + bottomCardW + SPACE_24 + cardPad, acceptY);
  acceptY += acceptStmtLines.length * bl + 20;
  const sigLineW = bottomCardW - cardPad * 2;
  const sigLineX = MARGIN + bottomCardW + SPACE_24 + cardPad;
  const sigLabelGap = 6;
  const sigRowMargin = 12;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.5);
  doc.line(sigLineX, acceptY, sigLineX + sigLineW, acceptY);
  doc.setFontSize(FONT.meta);
  doc.setTextColor(...PALETTE.meta);
  doc.text("Signature", sigLineX, acceptY + sigLabelGap + metaLead());
  const line2Y = acceptY + sigLabelGap + metaLead() + sigRowMargin;
  doc.line(sigLineX, line2Y, sigLineX + sigLineW, line2Y);
  doc.text("Date", sigLineX, line2Y + sigLabelGap + metaLead());
  const line3Y = line2Y + sigLabelGap + metaLead() + sigRowMargin;
  doc.line(sigLineX, line3Y, sigLineX + sigLineW, line3Y);
  doc.text("Name & Title (optional)", sigLineX, line3Y + sigLabelGap + metaLead());
}

/** Add header/footer to every page (cover gets footer only; pages 2–3 get premium header + footer). */
function addFootersToAllPages(
  doc: jsPDF,
  proposalTitle: string,
  opts: { logoDataUrl: string | null; proposalId: string }
): void {
  const n = getNumberOfPages(doc);
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    drawHeaderFooter(doc, i, n, {
      proposalTitle,
      logoDataUrl: opts.logoDataUrl,
      proposalId: opts.proposalId,
    });
  }
}

/**
 * Generate and download the proposal PDF. Uses form data: client, project, products, total.
 * Logo is loaded from assets; on failure, "Zulbera" text is used on cover.
 */
export async function generateOfferProposalPdf(data: OfferProposalData): Promise<void> {
  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await imageUrlToPngDataUrl(getLogoUrl(), 600, 120);
  } catch {
    // fallback: no logo, use text on cover
  }

  let coverBgDataUrl: string | null = null;
  try {
    const coverSvg = createOfferCoverBackgroundSvg();
    coverBgDataUrl = await renderSvgToPngDataUrl(coverSvg, 2);
  } catch {
    // fallback: cover drawn without SVG background in drawCoverPage
  }

  // Pre-fetch tech logos (best-effort — failures fall back to initials box)
  const techsToLoad =
    data.techStack && data.techStack.length > 0
      ? data.techStack
      : (() => {
          const s = new Set<string>();
          data.products.forEach((p) => {
            const arr = Array.isArray(p.techStack)
              ? p.techStack
              : String(p.techStack || "").split(",").map((t) => t.trim()).filter(Boolean);
            arr.forEach((t) => s.add(t));
          });
          return Array.from(s);
        })();
  const techLogos = techsToLoad.length > 0 ? await preloadTechLogos(techsToLoad) : {};

  const proposalId = `PROP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  OFFER_PDF_FONT = await registerInterFont(doc);
  doc.setFont(OFFER_PDF_FONT, "normal");

  drawCoverPage(doc, data, logoDataUrl, proposalId, coverBgDataUrl);
  drawOverviewPage(doc, data, proposalId, logoDataUrl, techLogos);
  drawPricingPage(doc, data, proposalId);

  addFootersToAllPages(doc, data.pageTitle, { logoDataUrl: logoDataUrl ?? null, proposalId });

  const safeName = data.clientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "") || "proposal";
  doc.save(`${safeName}_proposal.pdf`);
}
