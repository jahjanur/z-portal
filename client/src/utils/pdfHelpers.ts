/**
 * Shared PDF helpers for invoice and timesheet exports.
 * Grayscale only, print-friendly (white background, clean lines).
 * Uses jsPDF + jspdf-autotable. Uses built-in Helvetica for reliable PDF rendering.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Grayscale palette
const GRAY = {
  BLACK: [0, 0, 0] as [number, number, number],
  DARK: [45, 45, 45] as [number, number, number],
  MEDIUM: [100, 100, 100] as [number, number, number],
  LIGHT: [160, 160, 160] as [number, number, number],
  BORDER: [220, 220, 220] as [number, number, number],
  ROW_ALT: [248, 249, 250] as [number, number, number],
  HEADER_BG: [55, 55, 55] as [number, number, number],
  HEADER_TEXT: [255, 255, 255] as [number, number, number],
};

const MARGIN = 18;

/** Zulbera logo aspect ratio (viewBox width/height) for non-stretched placement */
const LOGO_ASPECT = 1264.17 / 217.92;

export interface CompanyInfo {
  companyName?: string;
  address?: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  registrationNumber?: string;
}

export interface PdfHeaderOptions {
  logoUrl?: string | null;
  companyInfo: CompanyInfo;
}

function getPageWidth(doc: jsPDF): number {
  return (doc as unknown as { internal: { pageSize: { width: number } } }).internal.pageSize.width;
}
function getPageHeight(doc: jsPDF): number {
  return (doc as unknown as { internal: { pageSize: { height: number } } }).internal.pageSize.height;
}

/** Load image from URL (e.g. SVG in public), draw to canvas, return PNG data URL for jsPDF. */
function loadImageToPngDataUrl(url: string, maxW = 400, maxH = 80): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
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

/** LEFT: logo (PNG data URL, aspect ratio preserved). RIGHT: company credentials. Spacious, modern layout. */
export function renderHeader(
  doc: jsPDF,
  options: PdfHeaderOptions
): number {
  const pageWidth = getPageWidth(doc);
  const { logoUrl, companyInfo } = options;
  const headerTop = 12;
  const logoHeight = 9;
  const logoWidth = logoHeight * LOGO_ASPECT; // preserve aspect ratio so logo is not stretched

  // Left: logo (correct aspect ratio) or text fallback
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, "PNG", MARGIN, headerTop, logoWidth, logoHeight);
    } catch {
      doc.setFontSize(15);
      doc.setTextColor(...GRAY.DARK);
      doc.setFont("helvetica", "bold");
      doc.text("Zulbera", MARGIN, headerTop + logoHeight - 1);
    }
  } else {
    doc.setFontSize(15);
    doc.setTextColor(...GRAY.DARK);
    doc.setFont("helvetica", "bold");
    doc.text("Zulbera", MARGIN, headerTop + logoHeight - 1);
  }

  // Right: credentials — readable size, comfortable line spacing
  const lines: string[] = [];
  if (companyInfo.companyName) lines.push(companyInfo.companyName);
  if (companyInfo.address) lines.push(companyInfo.address);
  if (companyInfo.email) lines.push(companyInfo.email);
  if (companyInfo.phone) lines.push(companyInfo.phone);
  if (companyInfo.vatNumber) lines.push(`VAT: ${companyInfo.vatNumber}`);
  if (companyInfo.registrationNumber) lines.push(`Reg: ${companyInfo.registrationNumber}`);

  if (lines.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(...GRAY.MEDIUM);
    doc.setFont("helvetica", "normal");
    const rightX = pageWidth - MARGIN;
    const lineHeight = 5;
    lines.forEach((line, i) => {
      doc.text(line, rightX, headerTop + 5 + i * lineHeight, { align: "right" });
    });
  }

  return headerTop + logoHeight + 14;
}

/** Meta block: clear label/value pairs with comfortable spacing. */
export function renderMetaBlock(
  doc: jsPDF,
  lines: { label: string; value: string }[],
  startY: number
): number {
  if (lines.length === 0) return startY;
  doc.setFontSize(9);
  doc.setTextColor(...GRAY.DARK);
  doc.setFont("helvetica", "normal");
  let y = startY;
  const lineHeight = 5.5;
  lines.forEach(({ label, value }) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}: `, MARGIN, y);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN + labelWidth, y);
    y += lineHeight;
  });
  return y + 8;
}

/** Table with grayscale header; returns final Y. */
export function renderTable(
  doc: jsPDF,
  columns: string[],
  rows: (string | number)[][],
  options?: {
    columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }>;
    lastRowBold?: boolean;
    startY?: number;
  }
): number {
  const startY = options?.startY ?? 40;
  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: GRAY.HEADER_BG,
      textColor: GRAY.HEADER_TEXT,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: GRAY.BORDER,
      lineWidth: 0.3,
      textColor: GRAY.DARK,
    },
    columnStyles: options?.columnStyles ?? {},
    didParseCell: (data) => {
      if (options?.lastRowBold && data.row.index === rows.length - 1) {
        data.cell.styles.fillColor = GRAY.ROW_ALT;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = GRAY.DARK;
      }
    },
  });
  const docWithFinalY = doc as typeof doc & { lastAutoTable?: { finalY: number } };
  return docWithFinalY.lastAutoTable?.finalY ?? startY + 30;
}

/** Totals block (label + amount pairs). */
export function renderTotals(
  doc: jsPDF,
  items: { label: string; value: string }[],
  startY: number,
  options?: { alignRight?: boolean }
): number {
  const pageWidth = getPageWidth(doc);
  doc.setFontSize(10);
  doc.setTextColor(...GRAY.DARK);
  let y = startY;
  items.forEach(({ label, value }) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, options?.alignRight ? pageWidth - MARGIN - 50 : MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, options?.alignRight ? pageWidth - MARGIN : MARGIN + 50, y, {
      align: options?.alignRight ? "right" : "left",
    });
    y += 7;
  });
  return y;
}

/** Footer: thin divider and page number only. */
export function renderFooter(
  doc: jsPDF,
  options: { pageNumber: number; totalPages: number }
): void {
  const pageHeight = getPageHeight(doc);
  const pageWidth = getPageWidth(doc);
  const footerY = pageHeight - 18;

  doc.setDrawColor(...GRAY.BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 4, pageWidth - MARGIN, footerY - 4);

  doc.setFontSize(8);
  doc.setTextColor(...GRAY.LIGHT);
  doc.text(
    `Page ${options.pageNumber} of ${options.totalPages}`,
    pageWidth / 2,
    footerY + 2,
    { align: "center" }
  );
}

/** Add footer to all pages (call after content + any new pages from table). */
export function addPageNumbersAndFooter(doc: jsPDF): void {
  const internal = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal;
  const pageCount = internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    renderFooter(doc, { pageNumber: i, totalPages: pageCount });
  }
}

const DEFAULT_COMPANY: CompanyInfo = {
  companyName: "Zulbera",
  address: "Suite C, Level 7, World Trust Tower, 50 Stanley Street, Central, Hong Kong",
};

export interface InvoiceLineItemPdf {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string;
  createdAt?: string;
  description?: string | null;
  client?: {
    name?: string;
    email?: string;
    company?: string;
    phoneNumber?: string;
    postalAddress?: string;
    address?: string;
  } | null;
  issueDate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  lineItems?: InvoiceLineItemPdf[];
  subtotal?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  paymentLink?: string | null;
}

/** Generate and save invoice PDF (grayscale, professional layout). */
export async function generateInvoicePdf(
  invoice: InvoicePdfData,
  options?: { companyInfo?: CompanyInfo; filename?: string }
): Promise<void> {
  // Load logo from public folder (main platform logo); fallback to text "Zulbera" if it fails or times out
  const logoPath = "/Zulbera-Text-Logo.svg";
  let logoUrl: string | null = null;
  try {
    logoUrl = await Promise.race([
      loadImageToPngDataUrl(logoPath, 400, 80),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);
  } catch {
    try {
      logoUrl = await loadImageToPngDataUrl("/ZPortalLogo.svg", 400, 80);
    } catch {
      try {
        logoUrl = await loadImageToPngDataUrl("/ZPortalFavIcon.svg", 400, 80);
      } catch {
        // keep null, renderHeader will use "Zulbera" text
      }
    }
  }

  const doc = new jsPDF();
  const companyInfo = options?.companyInfo ?? DEFAULT_COMPANY;
  const pageWidth = getPageWidth(doc);
  const pageHeight = getPageHeight(doc);

  let y = renderHeader(doc, { logoUrl, companyInfo });

  const issueDate = invoice.issueDate || invoice.createdAt;
  const metaLines: { label: string; value: string }[] = [
    { label: "Invoice number", value: invoice.invoiceNumber },
    { label: "Issue date", value: issueDate ? new Date(issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
    { label: "Due date", value: new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
    { label: "Status", value: invoice.status },
  ];
  if (invoice.paidAt) metaLines.push({ label: "Paid", value: new Date(invoice.paidAt).toLocaleDateString() });

  const startY = y;
  const lineHeight = 5.5;

  // Left column: invoice meta
  let metaEndY = startY;
  doc.setFontSize(9);
  doc.setTextColor(...GRAY.DARK);
  metaLines.forEach(({ label, value }) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}: `, MARGIN, metaEndY);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN + labelWidth, metaEndY);
    metaEndY += lineHeight;
  });
  metaEndY += 8;

  // Right column: Bill to (same startY, right-aligned)
  let billToEndY = startY;
  if (invoice.client) {
    const rightX = pageWidth - MARGIN;
    doc.setFontSize(9);
    doc.setTextColor(...GRAY.MEDIUM);
    doc.setFont("helvetica", "bold");
    doc.text("Bill to", rightX, billToEndY, { align: "right" });
    billToEndY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY.DARK);
    const billLines: string[] = [];
    if (invoice.client.name) billLines.push(invoice.client.name);
    if (invoice.client.company) billLines.push(invoice.client.company);
    if (invoice.client.email) billLines.push(invoice.client.email);
    if (invoice.client.phoneNumber) billLines.push(invoice.client.phoneNumber);
    const addr = invoice.client.postalAddress || invoice.client.address;
    if (addr) billLines.push(addr);
    billLines.forEach((line) => {
      doc.text(line, rightX, billToEndY, { align: "right" });
      billToEndY += 5;
    });
    billToEndY += 10;
  }

  y = Math.max(metaEndY, billToEndY);

  const hasLineItems = invoice.lineItems && invoice.lineItems.length > 0;
  const columns = ["Item / Service", "Description", "Qty", "Unit Price", "Total"];
  let rows: (string | number)[][];

  if (hasLineItems) {
    rows = (invoice.lineItems!).map((li) => {
      const total = li.quantity * li.unitPrice;
      return [
        li.name,
        (li.description || "").slice(0, 40),
        String(li.quantity),
        `$${li.unitPrice.toFixed(2)}`,
        `$${total.toFixed(2)}`,
      ];
    });
  } else {
    const description = invoice.description?.trim() || "Invoice amount";
    rows = [[description, "", "1", `$${invoice.amount.toFixed(2)}`, `$${invoice.amount.toFixed(2)}`]];
  }

  y = renderTable(doc, columns, rows, {
    startY: y,
    columnStyles: {
      0: { cellWidth: 55, halign: "left" },
      1: { cellWidth: 45, halign: "left" },
      2: { cellWidth: 18, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
  });

  y += 10;
  const totalsItems: { label: string; value: string }[] = [];
  if (hasLineItems && invoice.subtotal != null) {
    totalsItems.push({ label: "Subtotal", value: `$${invoice.subtotal.toFixed(2)}` });
    if (invoice.taxRate != null && invoice.taxRate > 0 && invoice.taxAmount != null) {
      totalsItems.push({ label: `Tax (${invoice.taxRate}%)`, value: `$${invoice.taxAmount.toFixed(2)}` });
    }
  }
  totalsItems.push({ label: "Total", value: `$${invoice.amount.toFixed(2)}` });
  doc.setFontSize(10);
  doc.setTextColor(...GRAY.DARK);
  totalsItems.forEach(({ label, value }) => {
    doc.setFont("helvetica", label === "Total" ? "bold" : "normal");
    doc.text(label, pageWidth - MARGIN - 55, y);
    doc.text(value, pageWidth - MARGIN, y, { align: "right" });
    y += 7;
  });

  // Lower block: Payment terms, Notes, Pay online — horizontal three columns
  const footerBlockY = pageHeight - 52;
  const colGap = 8;
  const colWidth = (pageWidth - 2 * MARGIN - 2 * colGap) / 3;
  const col1X = MARGIN;
  const col2X = MARGIN + colWidth + colGap;
  const col3X = MARGIN + 2 * (colWidth + colGap);
  const lineH = 4.5;
  const maxLines = 4;

  doc.setFontSize(9);
  doc.setTextColor(...GRAY.MEDIUM);
  doc.setFont("helvetica", "bold");

  let col1Y = footerBlockY;
  if (invoice.paymentTerms && invoice.paymentTerms.trim()) {
    doc.text("Payment terms", col1X, col1Y);
    col1Y += lineH;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY.DARK);
    const termsLines = doc.splitTextToSize(invoice.paymentTerms.trim(), colWidth);
    termsLines.slice(0, maxLines).forEach((line: string) => {
      doc.text(line, col1X, col1Y);
      col1Y += lineH;
    });
    col1Y += lineH;
  }

  let col2Y = footerBlockY;
  if (invoice.notes && invoice.notes.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY.MEDIUM);
    doc.text("Notes", col2X, col2Y);
    col2Y += lineH;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY.DARK);
    const notesLines = doc.splitTextToSize(invoice.notes.trim(), colWidth);
    notesLines.slice(0, maxLines).forEach((line: string) => {
      doc.text(line, col2X, col2Y);
      col2Y += lineH;
    });
    col2Y += lineH;
  }

  let col3Y = footerBlockY;
  if (invoice.paymentLink && invoice.paymentLink.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY.MEDIUM);
    doc.text("Pay online", col3X, col3Y);
    col3Y += lineH;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY.DARK);
    const linkLines = doc.splitTextToSize(invoice.paymentLink.trim(), colWidth);
    linkLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, col3X, col3Y);
      col3Y += lineH;
    });
    col3Y += 10;
    const btnW = 28;
    const btnH = 10;
    const btnX = col3X;
    const btnY = col3Y;
    const rectTop = btnY - btnH + 2;
    doc.setDrawColor(...GRAY.DARK);
    doc.setFillColor(...GRAY.HEADER_BG);
    doc.roundedRect(btnX, rectTop, btnW, btnH, 2, 2, "FD");
    doc.setTextColor(...GRAY.HEADER_TEXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const centerX = btnX + btnW / 2;
    const centerY = rectTop + btnH / 2;
    const lineHeight = doc.getLineHeight();
    const baselineY = centerY + lineHeight * 0.1;
    doc.text("Pay", centerX, baselineY, { align: "center" });
    doc.setTextColor(...GRAY.DARK);
    const payUrl = invoice.paymentLink.trim();
    const linkUrl = /^https?:\/\//i.test(payUrl) ? payUrl : `https://${payUrl}`;
    doc.link(btnX, rectTop, btnW, btnH, { url: linkUrl });
  }

  addPageNumbersAndFooter(doc);

  const filename = options?.filename ?? `Invoice_${invoice.invoiceNumber.replace(/\s+/g, "_")}.pdf`;
  // Use blob + link click so download works even after async (browsers may block doc.save() after await)
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
