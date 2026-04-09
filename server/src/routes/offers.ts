import express from "express";
import PDFDocument from "pdfkit";
import { sendOfferPDF } from "../services/email_offer";
import { verifyJWT, verifyAdmin } from "../middleware/auth";

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
  lightMedium: "#b8b8b8",
  border: "#dcdcdc",
  subtleBg: "#fafbfc",
  rowAlt: "#f3f4f6",
  white: "#FFFFFF",
  headerBg: "#1f1f1f", // very dark grey for total block
  accentDark: "#505050", // subtle dark grey accent bar
};

const MARGIN = 50;
const FOOTER_Y_OFFSET = 18;
const ACCENT_BAR_WIDTH = 5;

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

    // Left column: branding with better spacing
    doc.fontSize(16).fillColor(colors.dark).font("Helvetica-Bold").text("Zulbera", MARGIN, headerTop, { width: 220 });
    doc.fontSize(8.5).fillColor(colors.lightMedium).font("Helvetica").text("Building Digital Excellence", MARGIN, headerTop + 16, { width: 220 });

    // Right column: date then company info, each line with clear spacing (no overlap)
    const dateText = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const lineHeight = 5.5;
    let rightY = headerTop;
    doc.fontSize(8.5).fillColor(colors.medium).font("Helvetica").text(dateText, pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });
    rightY += lineHeight;
    doc.text("Zulbera", pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });
    rightY += lineHeight;
    doc.fontSize(8).text("Suite C, Level 7, World Trust Tower,", pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });
    rightY += lineHeight;
    doc.text("50 Stanley Street, Central, Hong Kong", pageWidth - MARGIN, rightY, { align: "right", width: rightColWidth });

    // Divider line below header
    doc.strokeColor(colors.border).lineWidth(0.3).moveTo(MARGIN, headerTop + 34).lineTo(pageWidth - MARGIN, headerTop + 34).stroke();

    // Content starts below header with more breathing room
    let yPos = headerTop + 46;

    // ----- Prepared For: light gray block with left accent bar -----
    const preparedH = 72;
    // Background
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, preparedH, 8).fill(colors.rowAlt);
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, preparedH, 8).lineWidth(0.5).strokeColor(colors.border).stroke();
    // Left accent bar
    doc.rect(MARGIN, yPos, ACCENT_BAR_WIDTH, preparedH).fill(colors.accentDark);
    // Content
    doc.fontSize(8.5).fillColor(colors.lightMedium).font("Helvetica-Bold").text("PREPARED FOR", MARGIN + 18, yPos + 16);
    doc.fontSize(24).fillColor(colors.dark).font("Helvetica-Bold").text(offer.clientName, MARGIN + 18, yPos + 34);
    yPos += preparedH + 22;

    // ----- Project: light gray block with left accent bar and better styling -----
    const projectContentWidth = pageWidth - MARGIN * 2 - 36;
    const descHeight = 82;
    const projectH = 32 + descHeight + 20;
    // Background
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, projectH, 8).fill(colors.rowAlt);
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, projectH, 8).lineWidth(0.5).strokeColor(colors.border).stroke();
    // Left accent bar
    doc.rect(MARGIN, yPos, ACCENT_BAR_WIDTH, projectH).fill(colors.accentDark);
    // Section header with background
    doc.rect(MARGIN, yPos, pageWidth - MARGIN * 2, 28).fill(colors.subtleBg);
    doc.fontSize(8.5).fillColor(colors.lightMedium).font("Helvetica-Bold").text("PROJECT", MARGIN + 18, yPos + 10);
    // Project title with improved typography
    doc.fontSize(19).fillColor(colors.dark).font("Helvetica-Bold").text(offer.pageTitle, MARGIN + 18, yPos + 32, { width: projectContentWidth });
    // Description with better spacing
    doc.fontSize(10).fillColor(colors.medium).font("Helvetica").text(offer.description, MARGIN + 18, yPos + 62, { width: projectContentWidth, lineGap: 3 });
    yPos += projectH + 26;

    // ----- Products & Services: section title with accent -----
    // Left accent bar before title
    doc.rect(MARGIN, yPos, ACCENT_BAR_WIDTH, 24).fill(colors.accentDark);
    doc.fontSize(15).fillColor(colors.dark).font("Helvetica-Bold").text("Products & Services", MARGIN + 18, yPos + 5);
    yPos += 32;

    const cardWidth = pageWidth - MARGIN * 2;
    const contentX = MARGIN + 16;

    offer.products.forEach((product, index) => {
      if (yPos > pageHeight - 150) {
        doc.addPage();
        yPos = 50;
      }

      const cardHeight = 96;
      // Card background with improved styling
      doc.roundedRect(MARGIN, yPos, cardWidth, cardHeight, 8).fill(colors.white);
      doc.roundedRect(MARGIN, yPos, cardWidth, cardHeight, 8).lineWidth(0.5).strokeColor(colors.border).stroke();
      // Left accent bar on product cards
      doc.rect(MARGIN, yPos, ACCENT_BAR_WIDTH, cardHeight).fill(colors.accentDark);

      let contentY = yPos + 14;

      // # index: small grey pill with better styling
      doc.roundedRect(contentX + 6, contentY - 2, 28, 20, 5).fill(colors.subtleBg);
      doc.fontSize(9.5).fillColor(colors.medium).font("Helvetica-Bold").text(`#${index + 1}`, contentX + 12, contentY + 3);

      const productName = product.name || `Product ${index + 1}`;
      doc.fontSize(13.5).fillColor(colors.dark).font("Helvetica-Bold").text(productName, contentX + 42, contentY - 1, { width: cardWidth - 220 });

      if (product.price !== undefined && product.price > 0) {
        doc.fontSize(16).fillColor(colors.dark).font("Helvetica-Bold").text(`$${product.price.toFixed(2)}`, pageWidth - MARGIN - 100, contentY - 3, { width: 90, align: "right" });
      }

      contentY += 28;
      if (product.timeline) {
        doc.fontSize(8.5).fillColor(colors.lightMedium).font("Helvetica-Bold").text("TIMELINE: ", contentX + 6, contentY, { continued: true });
        doc.fillColor(colors.medium).font("Helvetica").text(product.timeline);
      }
      contentY += 16;
      if (product.techStack) {
        const techArray = typeof product.techStack === "string" ? product.techStack.split(",").map((t) => t.trim()) : product.techStack;
        const validTech = techArray.filter((t) => t);
        if (validTech.length > 0) {
          doc.fontSize(8.5).fillColor(colors.lightMedium).font("Helvetica-Bold").text("TECH STACK: ", contentX + 6, contentY, { continued: true });
          doc.fillColor(colors.medium).font("Helvetica").text(validTech.join(" • "), { width: cardWidth - 120 });
        }
      }

      yPos += cardHeight + 14;
    });

    // ----- Total Investment: enhanced block with left accent bar -----
    yPos += 14;
    if (yPos > pageHeight - 130) {
      doc.addPage();
      yPos = 50;
    }
    const totalHeight = 80;
    // Background
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, totalHeight, 8).fill(colors.headerBg);
    doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, totalHeight, 8).lineWidth(0.5).strokeColor(colors.light).stroke();
    // Left accent bar
    doc.rect(MARGIN, yPos, ACCENT_BAR_WIDTH, totalHeight).fill("#ffffff");
    // Content
    doc.fontSize(11).fillColor(colors.white).font("Helvetica").text("TOTAL INVESTMENT", MARGIN + 20, yPos + 16);
    doc.fontSize(32).fillColor(colors.white).font("Helvetica-Bold").text(`$${offer.totalPrice.toFixed(2)}`, MARGIN + 20, yPos + 38);

    // ----- Footer: divider + page numbers + footer text -----
    const range = doc.bufferedPageRange();
    const footerY = pageHeight - 30;
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      // Top divider line
      doc.strokeColor(colors.border).lineWidth(0.5).moveTo(MARGIN, footerY - 28).lineTo(pageWidth - MARGIN, footerY - 28).stroke();
      // Page number aligned right
      doc.fontSize(8).fillColor(colors.lightMedium).font("Helvetica").text(`Page ${i + 1} of ${range.count}`, pageWidth - MARGIN - 60, footerY - 20, { width: 60, align: "right" });
      // Footer text
      doc.fontSize(8).fillColor(colors.light).font("Helvetica").text("Made with ❤ Zulbera Digital", MARGIN, footerY - 20);
    }

    doc.end();
  });
};

// POST
router.post("/send-offer", verifyJWT, verifyAdmin, async (req, res) => {
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
router.post("/download", verifyJWT, verifyAdmin, async (req, res) => {
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