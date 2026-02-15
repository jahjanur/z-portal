/**
 * Shared PDF helpers for invoice and timesheet exports.
 * Grayscale only, print-friendly (white background, clean lines).
 * Uses jsPDF + jspdf-autotable.
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

/** Footer: thin divider, page number, optional "Made with ❤️ Zulbera". */
export function renderFooter(
  doc: jsPDF,
  options: { pageNumber: number; totalPages: number; showMadeWith?: boolean }
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
  if (options.showMadeWith !== false) {
    doc.text("Made with ❤️ Zulbera", pageWidth / 2, footerY + 7, { align: "center" });
  }
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

export interface InvoicePdfData {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string;
  createdAt?: string;
  description?: string | null;
  client?: { name?: string; email?: string; company?: string } | null;
}

/** Generate and save invoice PDF (grayscale, same layout as timesheet). */
export function generateInvoicePdf(
  invoice: InvoicePdfData,
  options?: { companyInfo?: CompanyInfo; filename?: string }
): void {
  const doc = new jsPDF();
  const companyInfo = options?.companyInfo ?? DEFAULT_COMPANY;

  let y = renderHeader(doc, { logoUrl: null, companyInfo });

  const metaLines: { label: string; value: string }[] = [
    { label: "Invoice number", value: invoice.invoiceNumber },
    { label: "Due date", value: new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
    { label: "Status", value: invoice.status },
    { label: "Client", value: invoice.client?.name ?? invoice.client?.company ?? "—" },
  ];
  if (invoice.paidAt) metaLines.push({ label: "Paid", value: new Date(invoice.paidAt).toLocaleDateString() });
  y = renderMetaBlock(doc, metaLines, y);

  const description = invoice.description?.trim() || "Invoice amount";
  const columns = ["Description", "Qty", "Unit Price", "Amount"];
  const rows: (string | number)[][] = [[description, "1", `$${invoice.amount.toFixed(2)}`, `$${invoice.amount.toFixed(2)}`]];
  y = renderTable(doc, columns, rows, {
    startY: y,
    columnStyles: {
      0: { cellWidth: 90, halign: "left" },
      1: { cellWidth: 20, halign: "right" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
  });

  y += 8;
  renderTotals(doc, [{ label: "Total", value: `$${invoice.amount.toFixed(2)}` }], y, { alignRight: true });

  addPageNumbersAndFooter(doc);

  const filename = options?.filename ?? `Invoice_${invoice.invoiceNumber.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
