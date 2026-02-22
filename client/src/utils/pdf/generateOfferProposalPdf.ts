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
import logoUrl from "../../assets/Artboard 2.svg";
import { registerInterFont } from "./registerInterFont";

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
const SPACE_48 = 48;
const SECTION_GAP = SPACE_24;
const HEADER_H = 44;
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

/** Footer on every page. Pages 2–3: premium header (logo + "Project Proposal" | date + ID) and footer (contact | page X of Y | validity). */
function drawHeaderFooter(
  doc: jsPDF,
  pageIndex: number,
  pageCount: number,
  options: { proposalTitle: string; logoDataUrl?: string | null; proposalId?: string }
): void {
  const w = getPageWidth(doc);
  const h = getPageHeight(doc);
  const footerY = h - FOOTER_H + 14;
  const isOverviewOrPricing = pageIndex >= 2;

  if (isOverviewOrPricing && options.logoDataUrl != null && options.proposalId != null) {
    // ----- Premium header: logo and "Project Proposal" on same baseline -----
    const logoW = 36;
    const logoH = 8;
    const headerBaselineY = MARGIN + 8;
    const logoTop = headerBaselineY - logoH;
    try {
      doc.addImage(options.logoDataUrl, "PNG", MARGIN, logoTop, logoW, logoH);
      doc.setFontSize(FONT.meta);
      doc.setTextColor(...PALETTE.meta);
      doc.setFont(OFFER_PDF_FONT, "normal");
      doc.text("Project Proposal", MARGIN + logoW + 8, headerBaselineY);
    } catch {
      doc.setFontSize(FONT.meta);
      doc.setFont(OFFER_PDF_FONT, "bold");
      doc.setTextColor(...PALETTE.text);
      doc.text("Zulbera", MARGIN, headerBaselineY);
      doc.setFont(OFFER_PDF_FONT, "normal");
      doc.setTextColor(...PALETTE.meta);
      doc.text("Project Proposal", MARGIN + 32, headerBaselineY);
    }
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    doc.setFontSize(FONT.meta);
    doc.setTextColor(...PALETTE.meta);
    doc.text(dateStr, w - MARGIN, headerBaselineY - metaLead(), { align: "right" });
    doc.text(options.proposalId, w - MARGIN, headerBaselineY, { align: "right" });
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, headerBaselineY + SPACE_16, w - MARGIN, headerBaselineY + SPACE_16);
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
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 4, w - MARGIN, footerY - 4);
  doc.setFontSize(FONT.meta);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text(String(pageIndex), w / 2, footerY + 2, { align: "center" });
  if (isOverviewOrPricing) {
    doc.text("Zulbera · www.zulbera.com", MARGIN, footerY + 2);
    doc.text("Valid 14 days", w - MARGIN, footerY + 2, { align: "right" });
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

  // ----- Top white zone -----
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text(WEBSITE_URL, w - COVER_MARGIN, COVER_MARGIN, { align: "right" });

  // ----- Logo on boundary (white part), right-of-center; preserve aspect ratio (no stretch) -----
  const logoW = 118;
  const logoH = Math.round(logoW / COVER_LOGO_ASPECT);
  const logoX = w - COVER_MARGIN - logoW;
  const logoBottomMargin = 12; // ~10–15pt space above dark band
  const logoY = bandTop - logoH - logoBottomMargin;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      doc.setFontSize(18);
      doc.setTextColor(...COVER_DARK_GREY);
      doc.setFont(OFFER_PDF_FONT, "bold");
      doc.text("Zulbera", logoX, logoY + logoH - 6);
    }
  } else {
    doc.setFontSize(18);
    doc.setTextColor(...COVER_DARK_GREY);
    doc.setFont(OFFER_PDF_FONT, "bold");
    doc.text("Zulbera", logoX, logoY + logoH - 6);
  }

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
  doc.text(dateStr, w - bandPadding, h - bandPadding, { align: "right" });
}

const MAX_DESC_LENGTH = 380;
const MAX_SCOPE_ITEMS = 12;
const OVERVIEW_HEADER_RESERVED = 48;

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

// ---- Reusable building blocks ----

/** SectionLabel: uppercase, letter-spacing feel, medium weight. Returns Y after label. */
function SectionLabel(doc: jsPDF, x: number, y: number, label: string): number {
  doc.setFontSize(FONT.sectionLabel);
  doc.setTextColor(...PALETTE.meta);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text(label.toUpperCase(), x, y + 3);
  return y + 4 + metaLead();
}

/** Thin horizontal Divider. Returns Y after line. */
function Divider(doc: jsPDF, x: number, y: number, w: number): number {
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
  return y + SPACE_8;
}

/** KeyValueStack: label (meta) + value (body) pairs. Returns final Y. */
function KeyValueStack(
  doc: jsPDF,
  x: number,
  y: number,
  items: { label: string; value: string }[],
  valueWidth: number,
  rowGap: number = SPACE_8
): number {
  const bl = bodyLead();
  items.forEach((item) => {
    doc.setFontSize(FONT.meta);
    doc.setTextColor(...PALETTE.meta);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.text(item.label, x, y + 2);
    doc.setFontSize(FONT.body);
    doc.setTextColor(...PALETTE.text);
    const lines = doc.splitTextToSize(normalizeText(item.value), valueWidth);
    doc.text(lines, x + 64, y + 2);
    y += Math.max(metaLead() + 2, lines.length * bl) + rowGap;
  });
  return y;
}

/** TagList: pills with subtle border (no fill). Returns Y after last tag row. */
function TagList(doc: jsPDF, x: number, y: number, tags: string[], maxW: number): number {
  const tagH = 16;
  const pad = 6;
  let cx = x;
  let rowY = y;
  doc.setFontSize(FONT.body);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.setTextColor(...PALETTE.text);
  tags.forEach((tag) => {
    const t = normalizeText(tag) || "—";
    const tw = doc.getTextWidth(t) + pad * 2;
    if (cx + tw > x + maxW && cx > x) {
      cx = x;
      rowY += tagH + 4;
    }
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, rowY - 10, tw, tagH, 1.5, 1.5, "S");
    doc.text(t, cx + pad, rowY);
    cx += tw + 6;
  });
  return rowY + 6;
}

/** MilestoneList: items with subtle left accent line. Returns final Y. */
function MilestoneList(doc: jsPDF, x: number, y: number, items: { label: string; duration: string }[], colW: number): number {
  const bl = bodyLead();
  const accentX = x + 4;
  doc.setDrawColor(...PALETTE.accent);
  doc.setLineWidth(ACCENT_RULE * 0.5);
  const startY = y;
  let lastY = y;
  items.forEach((item, i) => {
    const text = `${normalizeText(item.label)}${item.duration ? ` — ${normalizeText(item.duration)}` : ""}`;
    const lines = doc.splitTextToSize(text, colW - 16);
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.text);
    doc.text(lines, accentX + 8, y + 4);
    const h = lines.length * bl + SPACE_8;
    if (i > 0) {
      doc.setDrawColor(...PALETTE.border);
      doc.setLineWidth(0.2);
      doc.line(accentX, y - 2, x + colW, y - 2);
    }
    lastY = y + h;
    y = lastY;
  });
  doc.setDrawColor(...PALETTE.accent);
  doc.setLineWidth(ACCENT_RULE * 0.5);
  doc.line(accentX, startY, accentX, lastY);
  return lastY + SPACE_8;
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

/** Draw section title: uppercase label + thin divider. Returns Y after title block. */
function drawSectionTitle(doc: jsPDF, x: number, y: number, label: string, w: number): number {
  doc.setFontSize(FONT.sectionLabel);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text(label.toUpperCase(), x, y + 3);
  const lineY = y + 8;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.5);
  doc.line(x, lineY, x + Math.min(24, w), lineY);
  return lineY + SPACE_8;
}

/** Draw a light card (fill + 1px border, rounded). */
function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "F");
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.setLineWidth(CARD_BORDER);
  doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "S");
}

/** Page 2 (Overview): full-width Client & Project card, then 2-column (Summary, What We Need, Timeline, Roadmap, Deliverables | Tech, Next Steps). */
function drawOverviewPage(doc: jsPDF, data: OfferProposalData, _proposalId: string, _logoDataUrl: string | null): void {
  doc.addPage();
  const w = getPageWidth(doc);
  const contentW = CONTENT_WIDTH;
  const colGap = SPACE_24;
  const leftColW = (contentW - colGap) / 2;
  const rightColW = leftColW;
  const leftColX = MARGIN;
  const rightColX = MARGIN + leftColW + colGap;
  const lineHeightBody = 8;
  const sectionTitleToBody = 14;
  const sectionBottomGap = 24;
  const bl = bodyLead();

  let y = MARGIN + OVERVIEW_HEADER_RESERVED;

  // ----- Client & Project card (full width) -----
  const rows: { label: string; value: string }[] = [];
  if (hasContent(data.clientName)) rows.push({ label: "Name", value: trim(data.clientName) });
  if (hasContent(data.clientEmail)) rows.push({ label: "Email", value: trim(data.clientEmail!) });
  if (hasContent(data.clientCompany)) rows.push({ label: "Company", value: trim(data.clientCompany!) });
  if (hasContent(data.clientPhone)) rows.push({ label: "Phone", value: trim(data.clientPhone!) });
  if (rows.length === 0) rows.push({ label: "Prepared for", value: "—" });

  const cardPad = 14;
  let cardContentH = 0;
  doc.setFontSize(FONT.body);
  rows.forEach((r) => {
    const valLines = doc.splitTextToSize(r.value, contentW - cardPad * 2 - 80);
    cardContentH += Math.max(12, valLines.length * lineHeightBody) + 2;
  });
  if (hasContent(data.pageTitle)) {
    cardContentH += SPACE_8;
    const titleLines = doc.splitTextToSize(trim(data.pageTitle), contentW - cardPad * 2);
    cardContentH += titleLines.length * (FONT.body + 2);
  }
  const cardH = cardPad + Math.max(32, cardContentH) + cardPad;
  drawCard(doc, leftColX, y, contentW, cardH);

  doc.setFontSize(FONT.meta);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.text("Prepared for", leftColX + cardPad, y + cardPad - 2);
  let rowY = y + cardPad + 10;
  rows.forEach((r) => {
    doc.setFontSize(FONT.meta);
    doc.setTextColor(...PALETTE.textSecondary);
    doc.text(r.label + ":", leftColX + cardPad, rowY + 2);
    doc.setFontSize(FONT.body);
    doc.setTextColor(...PALETTE.text);
    const valLines = doc.splitTextToSize(r.value, contentW - cardPad * 2 - 80);
    doc.text(valLines, leftColX + cardPad + 76, rowY + 2);
    rowY += Math.max(12, valLines.length * lineHeightBody) + 2;
  });
  if (hasContent(data.pageTitle)) {
    rowY += SPACE_8;
    doc.setFontSize(FONT.sectionTitle);
    doc.setFont(OFFER_PDF_FONT, "bold");
    doc.setTextColor(...PALETTE.text);
    const titleLines = doc.splitTextToSize(trim(data.pageTitle), contentW - cardPad * 2);
    doc.text(titleLines, leftColX + cardPad, rowY);
  }
  y += cardH + SECTION_GAP;

  let leftY = y;
  let rightY = y;

  // ----- Left: Project Summary -----
  if (hasContent(data.pageTitle) || hasContent(data.description)) {
    leftY = drawSectionTitle(doc, leftColX, leftY, "Project Summary", leftColW);
    if (hasContent(data.pageTitle)) {
      doc.setFontSize(FONT.body + 1);
      doc.setFont(OFFER_PDF_FONT, "bold");
      doc.text(trim(data.pageTitle), leftColX, leftY);
      leftY += 12;
    }
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setFontSize(FONT.body);
    doc.setTextColor(...PALETTE.text);
    const rawDesc = trim(data.description) || "—";
    const desc = rawDesc.length > MAX_DESC_LENGTH ? rawDesc.slice(0, MAX_DESC_LENGTH).trim() + "…" : rawDesc;
    const summaryLines = doc.splitTextToSize(desc, leftColW);
    doc.text(summaryLines, leftColX, leftY);
    leftY += summaryLines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- Left: What We Need -----
  if (hasContent(data.whatWeNeed)) {
    leftY = drawSectionTitle(doc, leftColX, leftY, "What We Need", leftColW);
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.text);
    const lines = doc.splitTextToSize(trim(data.whatWeNeed!), leftColW);
    doc.text(lines, leftColX, leftY);
    leftY += lines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- Left: Timeline -----
  const productsWithTimeline = data.products.filter((p) => hasContent(p.timeline) || hasContent(p.name));
  if (productsWithTimeline.length > 0) {
    leftY = drawSectionTitle(doc, leftColX, leftY, "Timeline", leftColW);
    const timelineLeft = leftColX + 8;
    const timelineW = leftColW - 18;
    productsWithTimeline.forEach((p, i) => {
      const label = normalizeText(p.name) || `Phase ${i + 1}`;
      const duration = hasContent(p.timeline) ? ` — ${p.timeline}` : "";
      const wrapped = doc.splitTextToSize(label + duration, timelineW);
      doc.setFontSize(FONT.body);
      doc.setTextColor(...PALETTE.text);
      doc.setFont(OFFER_PDF_FONT, "normal");
      doc.text(wrapped, timelineLeft + 10, leftY + 6);
      leftY += wrapped.length * lineHeightBody + 10;
    });
    leftY += sectionBottomGap;
  }

  // ----- Left: Roadmap -----
  if (hasContent(data.roadmap)) {
    leftY = drawSectionTitle(doc, leftColX, leftY, "Roadmap", leftColW);
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.text);
    const lines = doc.splitTextToSize(trim(data.roadmap!), leftColW);
    doc.text(lines, leftColX, leftY);
    leftY += lines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- Left: Services & Deliverables -----
  const deliverables = data.products.map((p) => p.name?.trim()).filter(Boolean).slice(0, MAX_SCOPE_ITEMS);
  if (deliverables.length > 0) {
    leftY = drawSectionTitle(doc, leftColX, leftY, "Services & Deliverables", leftColW);
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.text);
    deliverables.forEach((name, i) => {
      const wrapped = doc.splitTextToSize("• " + name, leftColW);
      doc.text(wrapped, leftColX, leftY);
      leftY += wrapped.length * lineHeightBody + 8;
    });
    leftY += sectionBottomGap;
  }

  // ----- Right: Tech Stack -----
  const techSet = new Set<string>();
  data.products.forEach((p) => {
    const arr = Array.isArray(p.techStack) ? p.techStack : String(p.techStack || "").split(",").map((t) => t.trim()).filter(Boolean);
    arr.forEach((t) => techSet.add(t));
  });
  if (techSet.size > 0) {
    rightY = drawSectionTitle(doc, rightColX, rightY, "Tech Stack", rightColW);
    const techStr = Array.from(techSet).join(" · ");
    doc.setFontSize(FONT.body);
    doc.setFont(OFFER_PDF_FONT, "normal");
    doc.setTextColor(...PALETTE.text);
    const techLines = doc.splitTextToSize(techStr, rightColW);
    doc.text(techLines, rightColX, rightY);
    rightY += techLines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- Right: Next Steps -----
  rightY = drawSectionTitle(doc, rightColX, rightY, "Next Steps", rightColW);
  doc.setFontSize(FONT.body);
  doc.setFont(OFFER_PDF_FONT, "normal");
  doc.setTextColor(...PALETTE.text);
  const nextSteps = ["Review this proposal and confirm scope.", "Sign off and kickoff schedule."];
  nextSteps.forEach((step, i) => {
    doc.text(`${i + 1}. ${step}`, rightColX, rightY);
    rightY += 12 + lineHeightBody;
  });
  rightY += 14;
  doc.setFontSize(FONT.meta);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.text("Valid for 14 days", rightColX, rightY);
}

/** Page 3 (Pricing): PricingHero (refined band), light table, TotalsBreakdown, Commercial Notes, Terms + Acceptance. */
function drawPricingPage(doc: jsPDF, data: OfferProposalData, proposalId: string): void {
  doc.addPage();
  const contentW = CONTENT_WIDTH;
  let y = MARGIN + OVERVIEW_HEADER_RESERVED;
  const bl = bodyLead();
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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
  doc.text(`€${data.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, MARGIN + 12, y + 38);
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
    return [normalizeText(p.name), normalizeText(p.timeline), tech || "—", p.price != null ? `€${p.price.toFixed(2)}` : "—"];
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
  doc.text(`€${subtotal.toFixed(2)}`, breakdownX + breakdownW, y, { align: "right" });
  y += bl + 4;
  doc.setTextColor(...PALETTE.meta);
  doc.text("Taxes (if any)", breakdownX, y);
  doc.text(taxes === 0 ? "—" : `€${taxes.toFixed(2)}`, breakdownX + breakdownW, y, { align: "right" });
  y += bl + 8;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.5);
  doc.line(breakdownX, y, breakdownX + breakdownW, y);
  y += SPACE_8;
  doc.setFontSize(FONT.sectionLabel);
  doc.setFont(OFFER_PDF_FONT, "bold");
  doc.setTextColor(...PALETTE.text);
  doc.text("Total", breakdownX, y);
  doc.text(`€${total.toFixed(2)}`, breakdownX + breakdownW, y, { align: "right" });
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
    logoDataUrl = await imageUrlToPngDataUrl(logoUrl, 600, 120);
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

  const proposalId = `PROP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  OFFER_PDF_FONT = await registerInterFont(doc);
  doc.setFont(OFFER_PDF_FONT, "normal");

  drawCoverPage(doc, data, logoDataUrl, proposalId, coverBgDataUrl);
  drawOverviewPage(doc, data, proposalId, logoDataUrl);
  drawPricingPage(doc, data, proposalId);

  addFootersToAllPages(doc, data.pageTitle, { logoDataUrl: logoDataUrl ?? null, proposalId });

  const safeName = data.clientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "") || "proposal";
  doc.save(`${safeName}_proposal.pdf`);
}
