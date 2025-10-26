"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendClientInviteEmail = sendClientInviteEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// Configure your email transporter - FIXED: createTransport (not createTransporter)
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function sendClientInviteEmail(email, name, inviteToken) {
    const inviteLink = `${FRONTEND_URL}/complete-profile?token=${inviteToken}`;
    const mailOptions = {
        from: process.env.SMTP_FROM || '"MyApp Team" <noreply@myapp.com>',
        to: email,
        subject: "Complete Your Company Profile",
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #5B4FFF, #7C73FF); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #5B4FFF; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to MyApp!</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Your account has been created successfully. To get started, please complete your company profile by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Complete Profile</a>
              </div>
              <p>You'll need to provide:</p>
              <ul>
                <li>Your password</li>
                <li>Company address</li>
                <li>Phone number</li>
                <li>Additional contact information (optional)</li>
                <li>Brand colors and company info (optional)</li>
              </ul>
              <p><strong>This link will expire in 7 days.</strong></p>
              <p>If you didn't request this, please ignore this email.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} MyApp. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    };
    await transporter.sendMail(mailOptions);
}
//# sourceMappingURL=emailService.js.map