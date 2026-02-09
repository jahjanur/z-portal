import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

interface Client {
  email: string;
  name: string;
}

interface Offer {
  title: string;
  pdfBuffer: Buffer;
}

export const sendOfferPDF = async (client: Client, offer: Offer): Promise<void> => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP configuration is missing in environment variables");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();

    let logoPath = path.join(process.cwd(), "public", "ZPortalLogo.svg");
    let logoBuffer: Buffer | null = null;
    let logoBase64 = "";

    const possiblePaths = [
      path.join(process.cwd(), "public", "ZPortalLogo.svg"),
      path.join(process.cwd(), "public", "zportallogo.svg"),
      path.join(process.cwd(), "ZPortalLogo.svg"),
      path.join(process.cwd(), "public", "ZPortalLogo.png"),
      path.join(process.cwd(), "public", "logo.svg"),
      path.join(process.cwd(), "public", "logo.png"),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        logoBuffer = fs.readFileSync(possiblePath);
        const ext = path.extname(possiblePath).toLowerCase();
        const mimeType = ext === ".svg" ? "image/svg+xml" : "image/png";
        logoBase64 = `data:${mimeType};base64,${logoBuffer.toString("base64")}`;
        console.log("✅ Logo found at:", possiblePath);
        break;
      }
    }

    if (!logoBuffer) {
      console.warn("⚠️ Logo not found, using text-based branding");
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              margin: 20px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #5B4FFF 0%, #7C73FF 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 20px;
            }
            .logo {
              max-width: 120px;
              height: auto;
              filter: brightness(0) invert(1);
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 2px;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 40px 30px;
              background: white;
            }
            .content h2 {
              color: #1A1A2E;
              font-size: 22px;
              margin-top: 0;
              margin-bottom: 20px;
            }
            .content p {
              color: #666;
              font-size: 15px;
              line-height: 1.7;
              margin-bottom: 15px;
            }
            .highlight {
              color: #5B4FFF;
              font-weight: 600;
            }
            .features {
              background: #f9f9f9;
              border-left: 4px solid #5B4FFF;
              padding: 20px;
              margin: 25px 0;
              border-radius: 6px;
            }
            .features ul {
              margin: 0;
              padding-left: 20px;
            }
            .features li {
              color: #666;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #5B4FFF 0%, #7C73FF 100%);
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              margin-top: 20px;
              font-weight: 600;
              font-size: 15px;
              box-shadow: 0 4px 12px rgba(91, 79, 255, 0.3);
            }
            .footer {
              text-align: center;
              padding: 30px;
              background: #f9f9f9;
              border-top: 1px solid #eee;
            }
            .footer p {
              margin: 0;
              font-size: 13px;
              color: #999;
            }
            .divider {
              height: 1px;
              background: linear-gradient(to right, transparent, #ddd, transparent);
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoBase64 ? `
                <div class="logo-container">
                  <img src="${logoBase64}" alt="Z-Portal Logo" class="logo" />
                </div>
              ` : `
                <h1>Z-Portal</h1>
              `}
              <p>Building Digital Excellence</p>
            </div>
            
            <div class="content">
              <h2>Hello ${client.name},</h2>
              
              <p>Thank you for your interest in working with us!</p>
              
              <p>We're excited to present you with our professional offer for <span class="highlight">${offer.title}</span>.</p>
              
              <div class="features">
                <p style="margin-top: 0; font-weight: 600; color: #333;">📋 This document includes:</p>
                <ul>
                  <li>Project description and scope</li>
                  <li>Products and services breakdown</li>
                  <li>Timeline and delivery schedule</li>
                  <li>Technology stack details</li>
                  <li>Total investment required</li>
                </ul>
              </div>
              
              <p>Please find the detailed offer attached as a PDF document.</p>
              
              <div class="divider"></div>
              
              <p>If you have any questions or would like to discuss any aspect of this offer, please don't hesitate to reach out. We're here to help!</p>
              
              <p style="margin-top: 30px;">
                <strong>Best regards,</strong><br>
                <span style="color: #5B4FFF; font-weight: 600;">Z-Portal Team</span>
              </p>
            </div>
            
            <div class="footer">
              <p>Made with ❤ ePage Digital.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Hello ${client.name},

Thank you for your interest in working with us!

We're excited to present you with our professional offer for "${offer.title}".

Please find the detailed offer attached as a PDF document. This document includes:
- Project description and scope
- Products and services breakdown
- Timeline and delivery schedule
- Technology stack details
- Total investment required

If you have any questions or would like to discuss any aspect of this offer, please don't hesitate to reach out.

We look forward to the possibility of working together!

Best regards,
Z-Portal Team

---
Made with ❤ ePage Digital.
    `;

    const mailOptions: any = {
      from: `"Z-Portal" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Professional Offer: ${offer.title}`,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: `Offer_${offer.title.replace(/\s+/g, "_")}.pdf`,
          content: offer.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    if (logoBuffer) {
      mailOptions.attachments.push({
        filename: "ZPortalLogo.svg",
        content: logoBuffer,
        cid: "logo@zportal",
      });
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Offer email sent successfully:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending offer email:", error);
    throw new Error(
      `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};