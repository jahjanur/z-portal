import express from "express";
import PDFDocument from "pdfkit";
import { sendOfferPDF } from "../services/email_offer";

const router = express.Router();

interface Product {
  name: string;
  price?: number;
  timeline: string;
  techStack: string;
}

interface Offer {
  clientName: string;
  clientEmail: string;
  pageTitle: string;
  description: string;
  products: Product[];
  totalPrice: number;
}

// Grayscale only: primary/secondary colors (grey, dark grey, black, white)
const colors = {
  dark: "#2d2d2d",
  medium: "#646464",
  light: "#a0a0a0",
  border: "#dcdcdc",
  rowAlt: "#f8f9fa",
  white: "#FFFFFF",
  headerBg: "#373737", // dark grey for total block (like timesheet header)
};

const MARGIN = 50;
const FOOTER_Y_OFFSET = 18;

const generateOfferPDF = (offer: Offer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 0,
      size: "A4",
      bufferPages: true,
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // ----- Header: left = Zulbera branding, right = date + company (same layout as Time Management PDF) -----
    const headerTop = 18;
    const rightColWidth = 200;

    // Left column: branding only; tagline well below to avoid overlap
    doc.fontSize(15).fillColor(colors.dark).font("Helvetica-Bold").text("Zulbera", MARGIN, headerTop, { width: 220 });
    doc.fontSize(9).fillColor(colors.medium).font("Helvetica").text("Building Digital Excellence", MARGIN, headerTop + 14, { width: 220 });

    // Right column: date then company info, each line with clear spacing (no overlap)
    const dateText = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const lineHeight = 5.5;
    let rightY = headerTop;
    doc.fontSize(9).fillColor(colors.medium).font("Helvetica").text(dateText, pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });
    rightY += lineHeight;
    doc.text("Zulbera", pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });
    rightY += lineHeight;
    doc.text("Suite C, Level 7, World Trust Tower,", pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });
    rightY += lineHeight;
    doc.text("50 Stanley Street, Central, Hong Kong", pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });

    // Content starts below header with comfortable gap (same feel as timesheet)
    let yPos = headerTop + 38;

    // ----- Prepared For: light gray block, no orange bar -----
    const preparedH = 70;
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, preparedH, 8).fill(colors.rowAlt);
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, preparedH, 8).lineWidth(0.3).strokeColor(colors.border).stroke();
    doc.fontSize(9).fillColor(colors.light).font("Helvetica-Bold").text("PREPARED FOR", MARGIN + 16, yPos + 18);
    doc.fontSize(22).fillColor(colors.dark).font("Helvetica-Bold").text(offer.clientName, MARGIN + 16, yPos + 36);
    yPos += preparedH + 20;

    // ----- Project: light gray block, no orange line -----
    const projectContentWidth = pageWidth - MARGIN * 2 - 32;
    const descHeight = 80;
    const projectH = 30 + descHeight + 20;
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, projectH, 8).fill(colors.rowAlt);
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, projectH, 8).lineWidth(0.3).strokeColor(colors.border).stroke();
    doc.fontSize(9).fillColor(colors.light).font("Helvetica-Bold").text("PROJECT", MARGIN + 16, yPos + 18);
    doc.fontSize(18).fillColor(colors.dark).font("Helvetica-Bold").text(offer.pageTitle, MARGIN + 16, yPos + 34, { width: projectContentWidth });
    doc.fontSize(10).fillColor(colors.dark).font("Helvetica").text(offer.description, MARGIN + 16, yPos + 58, { width: projectContentWidth, lineGap: 2 });
    yPos += projectH + 24;

    // ----- Products & Services: minimal section title -----
    doc.fontSize(14).fillColor(colors.dark).font("Helvetica-Bold").text("Products & Services", MARGIN, yPos);
    yPos += 28;

    const cardWidth = pageWidth - MARGIN * 2;
    const contentX = MARGIN + 16;

    offer.products.forEach((product, index) => {
      if (yPos > pageHeight - 140) {
        doc.addPage();
        yPos = 50;
      }

      const cardHeight = 88;
      doc.roundedRect(MARGIN, yPos, cardWidth, cardHeight, 6).fill(colors.white);
      doc.roundedRect(MARGIN, yPos, cardWidth, cardHeight, 6).lineWidth(0.3).strokeColor(colors.border).stroke();

      let contentY = yPos + 16;

      // # index: small gray pill
      doc.roundedRect(contentX, contentY - 2, 26, 18, 4).fill(colors.rowAlt);
      doc.fontSize(9).fillColor(colors.medium).font("Helvetica-Bold").text(`#${index + 1}`, contentX + 6, contentY + 4);

      const productName = product.name || `Product ${index + 1}`;
      doc.fontSize(13).fillColor(colors.dark).font("Helvetica-Bold").text(productName, contentX + 38, contentY, { width: cardWidth - 200 });

      if (product.price !== undefined && product.price > 0) {
        doc.fontSize(16).fillColor(colors.dark).font("Helvetica-Bold").text(`$${product.price.toFixed(2)}`, pageWidth - MARGIN - 100, contentY - 2, { width: 90, align: "right" });
      }

      contentY += 28;
      if (product.timeline) {
        doc.fontSize(9).fillColor(colors.medium).font("Helvetica").text("Timeline: ", contentX, contentY, { continued: true });
        doc.fillColor(colors.dark).font("Helvetica-Bold").text(product.timeline);
      }
      contentY += 14;
      if (product.techStack) {
        const techArray = typeof product.techStack === "string" ? product.techStack.split(",").map((t) => t.trim()) : product.techStack;
        const validTech = techArray.filter((t) => t);
        if (validTech.length > 0) {
          doc.fontSize(9).fillColor(colors.medium).font("Helvetica").text("Tech: ", contentX, contentY, { continued: true });
          doc.fillColor(colors.dark).font("Helvetica").text(validTech.join(" • "), { width: cardWidth - 80 });
        }
      }

      yPos += cardHeight + 12;
    });

    // ----- Total Investment: single accent block (minimal, no extra circles) -----
    yPos += 16;
    if (yPos > pageHeight - 120) {
      doc.addPage();
      yPos = 50;
    }
    const totalHeight = 72;
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, totalHeight, 8).fill(colors.headerBg);
    doc.fontSize(10).fillColor(colors.white).font("Helvetica").text("TOTAL INVESTMENT", MARGIN + 20, yPos + 18);
    doc.fontSize(28).fillColor(colors.white).font("Helvetica-Bold").text(`$${offer.totalPrice.toFixed(2)}`, MARGIN + 20, yPos + 40);

    // ----- Footer: thin divider + "Page X of Y" only (same as invoice/timesheet) -----
    const range = doc.bufferedPageRange();
    const footerY = pageHeight - FOOTER_Y_OFFSET;
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.strokeColor(colors.border).lineWidth(0.3).moveTo(MARGIN, footerY - 4).lineTo(pageWidth - MARGIN, footerY - 4).stroke();
      doc.fontSize(8).fillColor(colors.light).font("Helvetica").text(`Page ${i + 1} of ${range.count}`, pageWidth / 2, footerY + 2, { align: "center" });
    }

    doc.end();
  });
};

// POST
router.post("/send-offer", async (req, res) => {
  try {
    const offer: Offer = req.body;

    if (!offer.clientEmail) {
      return res.status(400).json({ message: "Client email is required" });
    }

    if (!offer.clientName || !offer.pageTitle || !offer.description) {
      return res.status(400).json({
        message: "Client name, page title, and description are required",
      });
    }

    if (!Array.isArray(offer.products)) {
      return res.status(400).json({ message: "Products must be an array" });
    }

    console.log("📄 Generating PDF for:", offer.clientName);
    console.log("📦 Products:", offer.products.length);

    const pdfBuffer = await generateOfferPDF(offer);

    console.log("✅ PDF generated successfully, size:", pdfBuffer.length);

    await sendOfferPDF(
      { email: offer.clientEmail, name: offer.clientName },
      { title: offer.pageTitle, pdfBuffer }
    );

    res.status(200).json({
      message: "Offer PDF sent successfully",
      sentTo: offer.clientEmail,
    });
  } catch (err) {
    console.error("❌ Error sending offer PDF:", err);
    res.status(500).json({
      message: "Failed to send offer PDF",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// POST
router.post("/download", async (req, res) => {
  try {
    const offer: Offer = req.body;

    if (!offer.clientName || !offer.pageTitle || !offer.description) {
      return res.status(400).json({
        message: "Client name, page title, and description are required",
      });
    }

    if (!Array.isArray(offer.products)) {
      return res.status(400).json({ message: "Products must be an array" });
    }

    console.log("📄 Generating PDF for download:", offer.clientName);
    console.log("📦 Products:", offer.products.length);

    const pdfBuffer = await generateOfferPDF(offer);

    console.log("✅ PDF generated successfully, size:", pdfBuffer.length);

    const filename = `${offer.clientName
      .replace(/\s+/g, "_")
      .toLowerCase()}_offer.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Error generating offer PDF:", err);
    res.status(500).json({
      message: "Failed to generate offer PDF",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;