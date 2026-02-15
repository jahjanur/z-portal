/**
 * Offer Proposal PDF – multi-page proposal deck (cover, overview+timeline, pricing).
 *
 * Dev note – where to tweak:
 * - Spacing: MARGIN, SECTION_GAP, HEADER_H, FOOTER_H at top of file.
 * - Fonts: Helvetica used throughout; to use Inter, add font file and register with jsPDF.
 * - Colors: PALETTE object (hex); convert to RGB for setTextColor/setFillColor/setDrawColor.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../../assets/Artboard 2.svg";

// ---- Layout: margins 48–60pt, spacing 8/12/16/22/32 ----
const MARGIN = 52;
const SPACE_16 = 16;
const SPACE_22 = 22;
const SPACE_32 = 32;
const SECTION_GAP = SPACE_22;
const HEADER_H = 44;
const FOOTER_H = 44;

// ---- Color palette (B/W/grey only). RGB [0-255] for jsPDF ----
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const PALETTE = {
  text: hexToRgb("#0B0F14"),
  textSecondary: hexToRgb("#6B7280"),
  border: hexToRgb("#E5E7EB"),
  block: hexToRgb("#F6F7F9"),
  grid: hexToRgb("#E8E8E8"),
  pricingCard: hexToRgb("#F5F6F7"),
  cardBg: hexToRgb("#F4F4F5"),
};

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

// A4 in pt (matches jsPDF default)
const A4_W = 595;
const A4_H = 842;

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

/** Footer on every page; header (Zulbera + proposal title) on non-cover pages only. No "Made with" text. */
function drawHeaderFooter(
  doc: jsPDF,
  pageIndex: number,
  pageCount: number,
  options: { proposalTitle: string }
): void {
  const w = getPageWidth(doc);
  const h = getPageHeight(doc);
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  const footerY = h - FOOTER_H + 14;
  doc.line(MARGIN, footerY - 4, w - MARGIN, footerY - 4);
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${pageIndex} of ${pageCount}`, w / 2, footerY + 2, { align: "center" });
  if (pageIndex > 1 && pageIndex !== 2) {
    doc.setFontSize(10);
    doc.setTextColor(...PALETTE.text);
    doc.setFont("helvetica", "bold");
    doc.text("Zulbera", MARGIN, 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PALETTE.textSecondary);
    doc.setFontSize(9);
    doc.text(options.proposalTitle, MARGIN, 22, { maxWidth: w - MARGIN * 2 - 50 });
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
  doc.setFont("helvetica", "normal");
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
      doc.setFont("helvetica", "bold");
      doc.text("Zulbera", logoX, logoY + logoH - 6);
    }
  } else {
    doc.setFontSize(18);
    doc.setTextColor(...COVER_DARK_GREY);
    doc.setFont("helvetica", "bold");
    doc.text("Zulbera", logoX, logoY + logoH - 6);
  }

  // ----- Bottom dark band: Offer (upper part), For (lower part), date -----
  const white: [number, number, number] = [255, 255, 255];
  const bandPadding = COVER_MARGIN;
  // "Offer" in upper portion of band (aligned with logo area), not too low
  const offerY = bandTop + (h - bandTop) * 0.18;

  doc.setFontSize(52);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...white);
  doc.text("Offer", w - bandPadding, offerY, { align: "right" });

  const forLabel = "For: ";
  const clientName = (data.clientName || "").trim().toUpperCase() || "CLIENT";
  const forText = forLabel + clientName;
  const forMaxW = w * 0.5;
  const forLines = doc.splitTextToSize(forText, forMaxW);
  const forFontSize = forLines.length > 1 ? 14 : 18;
  doc.setFontSize(forFontSize);
  doc.setFont("helvetica", "bold");
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
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, w - bandPadding, h - bandPadding, { align: "right" });
}

const MAX_DESC_LENGTH = 380;
const MAX_SCOPE_ITEMS = 8;

function trim(s: string | undefined): string {
  return (s || "").trim();
}
function hasContent(s: string | undefined): boolean {
  return trim(s).length > 0;
}

/** Page 2: Detailed overview — sections only when data is present. Prepared for (detailed), Project summary, What we need, Timeline, Roadmap, Services, Tech, Next steps. */
function drawOverviewPage(doc: jsPDF, data: OfferProposalData, proposalId: string, logoDataUrl: string | null): void {
  doc.addPage();
  const w = getPageWidth(doc);
  const gap = SPACE_32;
  const totalContentW = w - MARGIN * 2;
  const leftColW = (totalContentW - gap) * (1.2 / 2);
  const rightColW = (totalContentW - gap) * (0.8 / 2);
  const leftColX = MARGIN;
  const rightColX = MARGIN + leftColW + gap;

  const lineHeightBody = 8;
  const sectionTitleToBody = 14;
  const sectionBottomGap = 28;
  const sectionTitleSize = 12;
  const bodySize = 10;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ----- A) HEADER BAND -----
  const headerTop = MARGIN + 8;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", leftColX, headerTop - 4, 56, 12);
      doc.setFontSize(10);
      doc.setTextColor(...PALETTE.textSecondary);
      doc.setFont("helvetica", "normal");
      doc.text("Project Proposal", leftColX + 62, headerTop + 4);
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(...PALETTE.textSecondary);
      doc.setFont("helvetica", "bold");
      doc.text("Zulbera", leftColX, headerTop + 4);
      doc.setFont("helvetica", "normal");
      doc.text("Project Proposal", leftColX + 38, headerTop + 4);
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...PALETTE.textSecondary);
    doc.setFont("helvetica", "bold");
    doc.text("Zulbera", leftColX, headerTop + 4);
    doc.setFont("helvetica", "normal");
    doc.text("Project Proposal", leftColX + 38, headerTop + 4);
  }
  doc.setFontSize(9);
  doc.text(dateStr, w - MARGIN, headerTop, { align: "right" });
  doc.text(proposalId, w - MARGIN, headerTop + 14, { align: "right" });
  const dividerY = headerTop + SPACE_16 + 18;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, dividerY, w - MARGIN, dividerY);

  let contentY = dividerY + SPACE_32;

  // ----- B) PREPARED FOR (only if we have at least name) — each line wrapped to avoid overflow -----
  if (hasContent(data.clientName)) {
    const prepLines: { label: string; value: string }[] = [];
    prepLines.push({ label: "Name", value: trim(data.clientName) });
    if (hasContent(data.clientEmail)) prepLines.push({ label: "Email", value: trim(data.clientEmail!) });
    if (hasContent(data.clientCompany)) prepLines.push({ label: "Company", value: trim(data.clientCompany!) });
    if (hasContent(data.clientPhone)) prepLines.push({ label: "Phone", value: trim(data.clientPhone!) });
    const prepPad = 14;
    const prepW = totalContentW - prepPad * 2;
    const lineH = 11;
    doc.setFontSize(10);
    let totalTextH = 0;
    const wrappedRows: string[][] = [];
    prepLines.forEach((row, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      const text = `${row.label}: ${row.value}`;
      const wrapped = doc.splitTextToSize(text, prepW);
      wrappedRows.push(wrapped);
      totalTextH += wrapped.length * lineH;
    });
    const cardH = Math.max(36, prepPad + 10 + totalTextH + prepPad);
    doc.setFillColor(...PALETTE.cardBg);
    doc.roundedRect(leftColX, contentY, totalContentW, cardH, 4, 4, "F");
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text("Prepared for", leftColX + prepPad, contentY + prepPad - 2);
    let prepY = contentY + prepPad + 10;
    prepLines.forEach((_, i) => {
      doc.setFontSize(10);
      doc.setTextColor(...PALETTE.text);
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      const wrapped = wrappedRows[i];
      doc.text(wrapped, leftColX + prepPad, prepY);
      prepY += wrapped.length * lineH;
    });
    contentY += cardH + SECTION_GAP;
  }

  let leftY = contentY;
  let rightY = contentY;

  // ----- C) LEFT: PROJECT SUMMARY (only if title or description) -----
  if (hasContent(data.pageTitle) || hasContent(data.description)) {
    doc.setFontSize(sectionTitleSize);
    doc.setTextColor(...PALETTE.text);
    doc.setFont("helvetica", "bold");
    doc.text("PROJECT SUMMARY", leftColX, leftY);
    leftY += sectionTitleToBody;
    if (hasContent(data.pageTitle)) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(trim(data.pageTitle), leftColX, leftY);
      leftY += 12;
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PALETTE.text);
    const rawDesc = trim(data.description) || "—";
    const desc = rawDesc.length > MAX_DESC_LENGTH ? rawDesc.slice(0, MAX_DESC_LENGTH).trim() + "…" : rawDesc;
    const summaryLines = doc.splitTextToSize(desc, leftColW);
    doc.text(summaryLines, leftColX, leftY);
    leftY += summaryLines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- D) LEFT: WHAT WE NEED (only if filled) -----
  if (hasContent(data.whatWeNeed)) {
    doc.setFontSize(sectionTitleSize);
    doc.setFont("helvetica", "bold");
    doc.text("WHAT WE NEED", leftColX, leftY);
    leftY += sectionTitleToBody;
    doc.setFontSize(bodySize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PALETTE.text);
    const lines = doc.splitTextToSize(trim(data.whatWeNeed!), leftColW);
    doc.text(lines, leftColX, leftY);
    leftY += lines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- E) LEFT: TIMELINE (only if any product has timeline) — wrapped rows to avoid overflow -----
  const productsWithTimeline = data.products.filter((p) => hasContent(p.timeline) || hasContent(p.name));
  if (productsWithTimeline.length > 0) {
    doc.setFontSize(sectionTitleSize);
    doc.setFont("helvetica", "bold");
    doc.text("TIMELINE", leftColX, leftY);
    leftY += sectionTitleToBody;
    const timelineLeft = leftColX + 8;
    const timelineW = leftColW - 18;
    const lineH = 8;
    doc.setFontSize(bodySize);
    const timelineRowHeights: number[] = [];
    productsWithTimeline.forEach((p) => {
      const label = p.name?.trim() || "Phase";
      const duration = hasContent(p.timeline) ? ` — ${p.timeline}` : "";
      const wrapped = doc.splitTextToSize(label + duration, timelineW);
      timelineRowHeights.push(Math.max(20, wrapped.length * lineH + 8));
    });
    const lastY = leftY + timelineRowHeights.reduce((a, b) => a + b, 0) + 4;
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.4);
    doc.line(timelineLeft, leftY + 4, timelineLeft, lastY + 4);
    let rowY = leftY;
    productsWithTimeline.forEach((p, i) => {
      if (i > 0) rowY += timelineRowHeights[i - 1];
      const y = rowY + 6;
      if (i > 0) {
        doc.setDrawColor(...PALETTE.border);
        doc.setLineWidth(0.2);
        doc.line(timelineLeft, y - 4, leftColX + leftColW, y - 4);
      }
      doc.setFontSize(bodySize);
      doc.setTextColor(...PALETTE.text);
      doc.setFont("helvetica", "normal");
      const label = p.name?.trim() || `Phase ${i + 1}`;
      const duration = hasContent(p.timeline) ? ` — ${p.timeline}` : "";
      const wrapped = doc.splitTextToSize(label + duration, timelineW);
      doc.text(wrapped, timelineLeft + 10, y);
    });
    leftY = lastY + 4 + sectionBottomGap;
  }

  // ----- F) LEFT: ROADMAP (only if filled) -----
  if (hasContent(data.roadmap)) {
    doc.setFontSize(sectionTitleSize);
    doc.setFont("helvetica", "bold");
    doc.text("ROADMAP", leftColX, leftY);
    leftY += sectionTitleToBody;
    doc.setFontSize(bodySize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PALETTE.text);
    const lines = doc.splitTextToSize(trim(data.roadmap!), leftColW);
    doc.text(lines, leftColX, leftY);
    leftY += lines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- G) LEFT: SERVICES & DELIVERABLES (only if we have products with names) — wrap long names -----
  const deliverables = data.products.map((p) => p.name?.trim()).filter(Boolean);
  if (deliverables.length > 0) {
    doc.setFontSize(sectionTitleSize);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICES & DELIVERABLES", leftColX, leftY);
    leftY += sectionTitleToBody;
    doc.setFontSize(bodySize);
    doc.setFont("helvetica", "normal");
    const showCount = Math.min(deliverables.length, MAX_SCOPE_ITEMS);
    const bulletGap = 10;
    for (let i = 0; i < showCount; i++) {
      const wrapped = doc.splitTextToSize("• " + deliverables[i], leftColW);
      doc.text(wrapped, leftColX, leftY);
      leftY += wrapped.length * lineHeightBody + bulletGap;
    }
    if (deliverables.length > MAX_SCOPE_ITEMS) {
      doc.setTextColor(...PALETTE.textSecondary);
      doc.text(`+ ${deliverables.length - MAX_SCOPE_ITEMS} more`, leftColX, leftY);
      doc.setTextColor(...PALETTE.text);
      leftY += bulletGap;
    }
    leftY += sectionBottomGap;
  }

  // ----- RIGHT: TECH STACK (only if any product has tech) -----
  const techSet = new Set<string>();
  data.products.forEach((p) => {
    const arr = Array.isArray(p.techStack) ? p.techStack : String(p.techStack || "").split(",").map((t) => t.trim()).filter(Boolean);
    arr.forEach((t) => techSet.add(t));
  });
  if (techSet.size > 0) {
    doc.setFontSize(sectionTitleSize);
    doc.setTextColor(...PALETTE.text);
    doc.setFont("helvetica", "bold");
    doc.text("TECH STACK", rightColX, rightY);
    rightY += sectionTitleToBody;
    const techStr = Array.from(techSet).join(" • ");
    doc.setFontSize(bodySize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PALETTE.text);
    const techLines = doc.splitTextToSize(techStr, rightColW);
    doc.text(techLines, rightColX, rightY);
    rightY += techLines.length * lineHeightBody + sectionBottomGap;
  }

  // ----- RIGHT: NEXT STEPS -----
  doc.setFontSize(sectionTitleSize);
  doc.setFont("helvetica", "bold");
  doc.text("NEXT STEPS", rightColX, rightY);
  rightY += sectionTitleToBody;
  doc.setFontSize(bodySize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.text);
  const nextSteps = [
    "Review this proposal and confirm scope.",
    "Sign-off and kickoff schedule.",
  ];
  nextSteps.forEach((step, i) => {
    doc.text(`${i + 1}. ${step}`, rightColX, rightY);
    rightY += 12 + lineHeightBody;
  });
  rightY += 14;
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.text("Valid for 14 days", rightColX, rightY);
}

/** Page 3: Total investment (prominent), Why to invest (only if filled), then deliverables table. */
function drawPricingPage(doc: jsPDF, data: OfferProposalData): void {
  doc.addPage();
  const w = getPageWidth(doc);
  let y = MARGIN + HEADER_H;
  const tableWidth = w - MARGIN * 2;
  const lineHeight = 7.5;

  // ----- TOTAL INVESTMENT (prominent at top) — label and amount with clear vertical separation -----
  doc.setFontSize(11);
  doc.setTextColor(...PALETTE.textSecondary);
  doc.setFont("helvetica", "normal");
  doc.text("Total investment", MARGIN, y);
  y += 28; /* space so 28pt amount sits fully below the label (no overlap) */
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.text);
  doc.text(`$${data.totalPrice.toFixed(2)}`, MARGIN, y);
  y += 44;

  // ----- WHY TO INVEST (only if filled) -----
  if (hasContent(data.whyToInvest)) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("WHY TO INVEST", MARGIN, y);
    y += 14;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PALETTE.text);
    const whyLines = doc.splitTextToSize(trim(data.whyToInvest!), tableWidth);
    doc.text(whyLines, MARGIN, y);
    y += whyLines.length * lineHeight + 24;
  }

  // ----- DELIVERABLES TABLE -----
  const colWidths = {
    0: tableWidth * 0.42,
    1: tableWidth * 0.18,
    2: tableWidth * 0.25,
    3: tableWidth * 0.15,
  };
  const columns = ["Deliverable", "Timeline", "Tech", "Price"];
  const rows = data.products.map((p) => {
    const tech = Array.isArray(p.techStack) ? (p.techStack as string[]).join(", ") : String(p.techStack || "");
    return [p.name || "—", p.timeline || "—", tech || "—", p.price != null ? `$${p.price.toFixed(2)}` : "—"];
  });
  rows.push(["Total", "", "", `$${data.totalPrice.toFixed(2)}`]);

  const headBg: [number, number, number] = [45, 45, 45];
  const rowAlt: [number, number, number] = [246, 247, 249];

  autoTable(doc, {
    startY: y,
    head: [columns],
    body: rows,
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H + 24 },
    tableWidth,
    headStyles: {
      fillColor: headBg,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
      cellPadding: 6,
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: PALETTE.border as unknown as [number, number, number],
      lineWidth: 0.3,
      textColor: PALETTE.text as unknown as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: colWidths[0], halign: "left" },
      1: { cellWidth: colWidths[1], halign: "left" },
      2: { cellWidth: colWidths[2], halign: "left" },
      3: { cellWidth: colWidths[3], halign: "right" },
    },
    didParseCell: (cellData) => {
      if (cellData.row.index === rows.length - 1) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fillColor = rowAlt;
      } else if (cellData.section === "body" && cellData.row.index % 2 === 1) {
        cellData.cell.styles.fillColor = rowAlt;
      }
    },
  });
}

/** Add footer to every page (cover included). */
function addFootersToAllPages(doc: jsPDF, proposalTitle: string): void {
  const n = getNumberOfPages(doc);
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    drawHeaderFooter(doc, i, n, { proposalTitle });
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
  doc.setFont("helvetica", "normal");

  drawCoverPage(doc, data, logoDataUrl, proposalId, coverBgDataUrl);
  drawOverviewPage(doc, data, proposalId, logoDataUrl);
  drawPricingPage(doc, data);

  addFootersToAllPages(doc, data.pageTitle);

  const safeName = data.clientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "") || "proposal";
  doc.save(`${safeName}_proposal.pdf`);
}
