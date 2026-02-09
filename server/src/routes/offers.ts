import express from "express";
import PDFDocument from "pdfkit";
import { sendOfferPDF } from "../services/email_offer";
import fs from "fs";
import path from "path";

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

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
  dark: "#1A1A2E",
  gray: "#666666",
  lightGray: "#F5F5F5",
  mediumGray: "#CCCCCC",
  white: "#FFFFFF",
};

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
    const margin = 50;

    // header with gradient background
    doc.rect(0, 0, pageWidth, 180).fill(colors.primary);

    // decorative circles (top right)
    doc
      .save()
      .circle(pageWidth - 80, 60, 100)
      .fillOpacity(0.1)
      .fill(colors.white)
      .restore();

    doc
      .save()
      .circle(pageWidth - 40, 120, 60)
      .fillOpacity(0.08)
      .fill(colors.white)
      .restore();

    // company Name
    doc
      .fontSize(36)
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .text("Z-Portal", margin, 45);

    // tagline
    doc
      .fontSize(12)
      .fillColor(colors.white)
      .font("Helvetica")
      .fillOpacity(0.9)
      .text("Building Digital Excellence", margin, 90)
      .fillOpacity(1);

    // date in top right
    const dateText = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    doc
      .fontSize(11)
      .fillColor(colors.white)
      .font("Helvetica")
      .fillOpacity(0.9)
      .text(dateText, pageWidth - 200, 50, {
        width: 150,
        align: "right",
      })
      .fillOpacity(1);

    // company details section on header
    doc
      .fontSize(10)
      .fillColor(colors.white)
      .font("Helvetica")
      .fillOpacity(0.85)
      .text("Z-Portal", margin, 130)
      .text("Suite C, Level 7, World Trust Tower,", margin, 145)
      .text("50 Stanley Street, Central,", margin, 157)
      .text("Hong Kong", margin, 169)
      .fillOpacity(1);

    // client section
    let yPos = 220;

    // client card
    doc
      .save()
      .roundedRect(margin, yPos, pageWidth - margin * 2, 90, 12)
      .fillOpacity(0.05)
      .fill(colors.dark)
      .restore();

    // accent bar on left
    doc.rect(margin, yPos, 6, 90).fill(colors.accent);

    // "PREPARED FOR" label
    doc
      .fontSize(10)
      .fillColor(colors.gray)
      .font("Helvetica-Bold")
      .text("PREPARED FOR", margin + 30, yPos + 20);

    // client name
    doc
      .fontSize(26)
      .fillColor(colors.dark)
      .font("Helvetica-Bold")
      .text(offer.clientName, margin + 30, yPos + 40);

    yPos += 120;

    // project card
    doc
      .save()
      .roundedRect(margin, yPos, pageWidth - margin * 2, 140, 12)
      .fill(colors.lightGray)
      .restore();

    // "PROJECT" label
    doc
      .fontSize(10)
      .fillColor(colors.gray)
      .font("Helvetica-Bold")
      .text("PROJECT", margin + 20, yPos + 20);

    // project title
    doc
      .fontSize(20)
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .text(offer.pageTitle, margin + 20, yPos + 40, {
        width: pageWidth - margin * 2 - 40,
      });

    // decorative line
    doc
      .strokeColor(colors.accent)
      .lineWidth(2)
      .moveTo(margin + 20, yPos + 75)
      .lineTo(margin + 100, yPos + 75)
      .stroke();

    // description
    doc
      .fontSize(11)
      .fillColor(colors.dark)
      .font("Helvetica")
      .text(offer.description, margin + 20, yPos + 90, {
        width: pageWidth - margin * 2 - 40,
        align: "left",
        lineGap: 2,
      });

    yPos += 170;

    // products and services
    doc
      .fontSize(20)
      .fillColor(colors.dark)
      .font("Helvetica-Bold")
      .text("Products & Services", margin, yPos);

    yPos += 35;

    offer.products.forEach((product, index) => {
      if (yPos > pageHeight - 220) {
        doc.addPage();
        yPos = 60;
      }

      const cardHeight = 100;
      const cardWidth = pageWidth - margin * 2;

      // product card
      doc
        .save()
        .roundedRect(margin, yPos, cardWidth, cardHeight, 8)
        .lineWidth(1)
        .strokeOpacity(0.1)
        .stroke(colors.mediumGray)
        .fillOpacity(1)
        .fill(colors.white)
        .restore();

      // left colored stripe
      doc
        .save()
        .roundedRect(margin, yPos, 4, cardHeight, 8)
        .fill(colors.primary)
        .restore();

      // product number
      const contentX = margin + 20;
      let contentY = yPos + 18;

      doc
        .save()
        .roundedRect(contentX, contentY, 32, 24, 12)
        .fillOpacity(0.1)
        .fill(colors.primary)
        .restore();

      doc
        .fontSize(12)
        .fillColor(colors.primary)
        .font("Helvetica-Bold")
        .text(`#${index + 1}`, contentX + 8, contentY + 5);

      // product name
      const productName = product.name || `Product ${index + 1}`;
      doc
        .fontSize(15)
        .fillColor(colors.dark)
        .font("Helvetica-Bold")
        .text(productName, contentX + 45, contentY + 2, {
          width: cardWidth - 250,
        });

      // price
      if (product.price !== undefined && product.price > 0) {
        doc
          .fontSize(20)
          .fillColor(colors.primary)
          .font("Helvetica-Bold")
          .text(
            `$${product.price.toFixed(2)}`,
            pageWidth - margin - 130,
            contentY,
            {
              width: 110,
              align: "right",
            }
          );
      }

      contentY += 40;

      // timeline and tech stack
      if (product.timeline) {
        doc
          .fontSize(10)
          .fillColor(colors.gray)
          .font("Helvetica")
          .text("Timeline: ", contentX, contentY, { continued: true })
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text(product.timeline);
      }

      contentY += 18;

      // tech stack
      if (product.techStack) {
        const techArray =
          typeof product.techStack === "string"
            ? product.techStack.split(",").map((t) => t.trim())
            : product.techStack;

        const validTech = techArray.filter((t) => t);

        if (validTech.length > 0) {
          const techText = validTech.join(" • ");

          doc
            .fontSize(10)
            .fillColor(colors.gray)
            .font("Helvetica")
            .text("Tech: ", contentX, contentY, { continued: true })
            .fillColor(colors.dark)
            .font("Helvetica")
            .text(techText, {
              width: cardWidth - 60,
            });
        }
      }

      yPos += cardHeight + 12;
    });

    // total investment
    yPos += 25;

    if (yPos > pageHeight - 180) {
      doc.addPage();
      yPos = 60;
    }

    const totalHeight = 90;

    // total card
    doc
      .save()
      .roundedRect(margin, yPos, pageWidth - margin * 2, totalHeight, 10)
      .fill(colors.primary)
      .restore();

    doc
      .save()
      .roundedRect(margin, yPos + 45, pageWidth - margin * 2, 45, 10)
      .fillOpacity(0.3)
      .fill(colors.secondary)
      .restore();

    // decorative accent
    doc
      .save()
      .circle(pageWidth - margin - 60, yPos + 45, 60)
      .fillOpacity(0.1)
      .fill(colors.white)
      .restore();

    // "TOTAL INVESTMENT" label
    doc
      .fontSize(13)
      .fillColor(colors.white)
      .font("Helvetica")
      .fillOpacity(0.9)
      .text("TOTAL INVESTMENT", margin + 25, yPos + 22)
      .fillOpacity(1);

    // total price
    doc
      .fontSize(32)
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .text(`$${offer.totalPrice.toFixed(2)}`, margin + 25, yPos + 42);

    // footer
    const footerY = pageHeight - 60;

    // separator line
    doc
      .strokeColor(colors.lightGray)
      .lineWidth(1)
      .moveTo(margin, footerY)
      .lineTo(pageWidth - margin, footerY)
      .stroke();

    // footer text
    doc
      .fontSize(10)
      .fillColor(colors.gray)
      .font("Helvetica")
      .text("Made with love ePage Digital.", margin, footerY + 20, {
        align: "center",
        width: pageWidth - margin * 2,
      });

    // page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);

      const pageNumText = `${i + 1} / ${range.count}`;
      doc
        .fontSize(9)
        .fillColor(colors.gray)
        .font("Helvetica")
        .text(pageNumText, pageWidth - margin - 40, pageHeight - 35);
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