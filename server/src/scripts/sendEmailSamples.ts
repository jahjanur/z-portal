/**
 * Sends one sample of every Z-Portal email use-case to a recipient, using the
 * premium responsive template. Run:
 *   npx ts-node -r dotenv/config src/scripts/sendEmailSamples.ts [recipient]
 */
import nodemailer from "nodemailer";
import { renderEmail, RenderEmailOpts } from "../services/emailTemplate";
import { logoAttachment } from "../services/logoAsset";

const TO = process.argv[2] || process.env.SMTP_USER || "zulberalabs@gmail.com";
const APP = process.env.CLIENT_URL || "http://localhost:5174";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

interface Sample { subject: string; opts: RenderEmailOpts }

const samples: Sample[] = [
  // ---- Onboarding / invites ----
  { subject: "You're invited to Z-Portal", opts: {
    badge: { text: "Invitation" }, heading: "Zulbera created a workspace for TechCorp",
    greeting: "Hi Sarah,", intro: "<p>Zulbera has set up a workspace for <strong>TechCorp</strong> on Z-Portal. You'll be able to track projects, view invoices, monitor domains and chat with the team.</p>",
    cta: { label: "Accept invitation & set up account", url: `${APP}/invite/accept?token=sample` }, note: "This link expires in 72 hours. If you didn't expect this, you can ignore it." } },
  { subject: "You've been invited to join Zulbera (Worker)", opts: {
    badge: { text: "Team invite", tone: "info" }, tone: "info", heading: "You've been invited to join Zulbera",
    greeting: "Hi John,", intro: "<p>Zulbera has invited you to join Z-Portal as a <strong>Worker</strong>. You'll be able to view assigned tasks, upload deliverables and track deadlines.</p>",
    cta: { label: "Set up your account", url: `${APP}/invite/accept?token=sample` }, note: "This link expires in 72 hours." } },
  { subject: "EraSphere Partner Program invitation", opts: {
    badge: { text: "Partner program", tone: "brand" }, heading: "You've been invited to EraSphere",
    greeting: "Hi Alex,", intro: "<p>You've been invited to the <strong>EraSphere Partner Program</strong>. Refer clients, manage their projects and track your revenue from a dedicated dashboard.</p>",
    cta: { label: "Join EraSphere", url: `${APP}/invite/accept?token=sample` } } },
  { subject: "Welcome to Zulbera!", opts: {
    badge: { text: "Welcome", tone: "success" }, tone: "success", heading: "Welcome to Zulbera, TechCorp!",
    greeting: "Hi Sarah,", intro: "<p>Your workspace is ready. Log in to track your projects, view invoices and manage your domains.</p>",
    cta: { label: "Go to dashboard", url: `${APP}/login` } } },

  // ---- Tasks ----
  { subject: "New task assigned: Build Landing Page", opts: {
    badge: { text: "New task", tone: "info" }, tone: "info", heading: "New task assigned",
    greeting: "Hi John,", intro: "<p>You've been assigned a new task.</p>",
    rows: [{ label: "Task", value: "Build Landing Page" }, { label: "Client", value: "TechCorp" }, { label: "Due date", value: "Nov 1, 2026" }, { label: "Status", value: "Pending" }],
    cta: { label: "View task", url: `${APP}/tasks/1` } } },
  { subject: "Task pending approval: Build Landing Page", opts: {
    badge: { text: "Needs approval", tone: "warning" }, tone: "warning", heading: "A task is waiting for your approval",
    intro: "<p>John Worker submitted a task for review.</p>",
    rows: [{ label: "Task", value: "Build Landing Page" }, { label: "Worker", value: "John Worker" }, { label: "Status", value: "Pending approval" }],
    cta: { label: "Review task", url: `${APP}/tasks/1` } } },
  { subject: "Task completed: Build Landing Page", opts: {
    badge: { text: "Completed", tone: "success" }, tone: "success", heading: "Task completed",
    intro: "<p><strong>Build Landing Page</strong> has been marked as completed.</p>",
    rows: [{ label: "Task", value: "Build Landing Page" }, { label: "Client", value: "TechCorp" }],
    cta: { label: "View task", url: `${APP}/tasks/1` } } },
  { subject: "Task updated: Build Landing Page", opts: {
    badge: { text: "Updated" }, heading: "A task was updated",
    intro: "<p>Changes were made to a task assigned to you.</p>",
    rows: [{ label: "Task", value: "Build Landing Page" }, { label: "Updated", value: "Due date, Description" }],
    cta: { label: "View task", url: `${APP}/tasks/1` } } },
  { subject: "Deadline approaching: Brand Identity", opts: {
    badge: { text: "Due in 2 days", tone: "warning" }, tone: "warning", heading: "A deadline is approaching",
    greeting: "Hi John,", intro: "<p>This task is due soon. Please make sure it's on track.</p>",
    rows: [{ label: "Task", value: "Brand Identity Design" }, { label: "Due", value: "in 2 days · Nov 30" }],
    cta: { label: "View task", url: `${APP}/tasks/4` } } },
  { subject: "Task overdue: Brand Identity", opts: {
    badge: { text: "Overdue", tone: "danger" }, tone: "danger", heading: "A task is overdue",
    intro: "<p><strong>Brand Identity Design</strong> has passed its due date and is not yet complete.</p>",
    rows: [{ label: "Task", value: "Brand Identity Design" }, { label: "Was due", value: "Nov 30, 2026" }],
    cta: { label: "View task", url: `${APP}/tasks/4` } } },
  { subject: "New file uploaded: hero-v2.png", opts: {
    badge: { text: "New deliverable", tone: "info" }, tone: "info", heading: "A new file was shared",
    greeting: "Hi Sarah,", intro: "<p>A new deliverable was uploaded to your task.</p>",
    rows: [{ label: "File", value: "hero-v2.png" }, { label: "Task", value: "Build Landing Page" }],
    cta: { label: "View & review", url: `${APP}/tasks/1` } } },

  // ---- Invoices ----
  { subject: "New invoice INV-2025-001", opts: {
    badge: { text: "Invoice", tone: "info" }, tone: "info", heading: "You have a new invoice",
    greeting: "Hi Sarah,", intro: "<p>A new invoice has been issued to your account.</p>",
    rows: [{ label: "Invoice", value: "INV-2025-001" }, { label: "Amount", value: "$3,400.00" }, { label: "Due date", value: "Nov 15, 2026" }],
    cta: { label: "View invoice", url: `${APP}/dashboard?tab=invoices` } } },
  { subject: "Payment received — INV-2025-001", opts: {
    badge: { text: "Paid", tone: "success" }, tone: "success", heading: "Payment received — thank you!",
    greeting: "Hi Sarah,", intro: "<p>We've received your payment. Here's your receipt.</p>",
    rows: [{ label: "Invoice", value: "INV-2025-001" }, { label: "Amount paid", value: "$3,400.00" }, { label: "Paid on", value: "Jun 13, 2026" }] } },
  { subject: "Invoice overdue — INV-2025-003", opts: {
    badge: { text: "Overdue", tone: "danger" }, tone: "danger", heading: "An invoice is overdue",
    greeting: "Hi Michael,", intro: "<p>The following invoice is past its due date. Please arrange payment at your earliest convenience.</p>",
    rows: [{ label: "Invoice", value: "INV-2025-003" }, { label: "Amount", value: "$7,500.00" }, { label: "Was due", value: "Dec 1, 2025" }],
    cta: { label: "Pay invoice", url: `${APP}/dashboard?tab=invoices` } } },
  { subject: "Invoice due soon — INV-2025-002", opts: {
    badge: { text: "Due in 3 days", tone: "warning" }, tone: "warning", heading: "An invoice is due soon",
    greeting: "Hi Michael,", intro: "<p>A friendly reminder that this invoice is due shortly.</p>",
    rows: [{ label: "Invoice", value: "INV-2025-002" }, { label: "Amount", value: "$2,200.00" }, { label: "Due", value: "in 3 days" }],
    cta: { label: "View invoice", url: `${APP}/dashboard?tab=invoices` } } },

  // ---- Domains & hosting ----
  { subject: "Domain activated: techcorp.com", opts: {
    badge: { text: "Active", tone: "success" }, tone: "success", heading: "Your domain is active",
    greeting: "Hi Sarah,", intro: "<p>Your domain has been activated and is live.</p>",
    rows: [{ label: "Domain", value: "techcorp.com" }, { label: "Status", value: "Active" }],
    cta: { label: "View domains", url: `${APP}/dashboard?tab=domains` } } },
  { subject: "Renewal reminder: techcorp.com", opts: {
    badge: { text: "Renewal", tone: "warning" }, tone: "warning", heading: "Your domain renews soon",
    greeting: "Hi Sarah,", intro: "<p>This domain is approaching its renewal date.</p>",
    rows: [{ label: "Domain", value: "techcorp.com" }, { label: "Renews", value: "in 14 days · Jun 30" }],
    cta: { label: "Manage domain", url: `${APP}/dashboard?tab=domains` } } },
  { subject: "Domain expiring soon: techcorp.com", opts: {
    badge: { text: "Expires in 7 days", tone: "warning" }, tone: "warning", heading: "Domain expiring soon",
    greeting: "Hi Sarah,", intro: "<p>Renew now to avoid any interruption to your website and email.</p>",
    rows: [{ label: "Domain", value: "techcorp.com" }, { label: "Expires", value: "in 7 days" }],
    cta: { label: "Renew now", url: `${APP}/dashboard?tab=domains` } } },
  { subject: "Hosting expiring soon: techcorp.com", opts: {
    badge: { text: "Hosting", tone: "warning" }, tone: "warning", heading: "Your hosting expires soon",
    intro: "<p>Your hosting plan is about to expire.</p>",
    rows: [{ label: "Domain", value: "techcorp.com" }, { label: "Hosting expires", value: "in 10 days" }],
    cta: { label: "Manage hosting", url: `${APP}/dashboard?tab=domains` } } },
  { subject: "SSL certificate expiring: techcorp.com", opts: {
    badge: { text: "SSL", tone: "warning" }, tone: "warning", heading: "Your SSL certificate expires soon",
    intro: "<p>Renew your SSL to keep your site secure (HTTPS).</p>",
    rows: [{ label: "Domain", value: "techcorp.com" }, { label: "SSL expires", value: "in 5 days" }],
    cta: { label: "View details", url: `${APP}/dashboard?tab=domains` } } },
  { subject: "Domain expired: techcorp.com", opts: {
    badge: { text: "Expired", tone: "danger" }, tone: "danger", heading: "Your domain has expired",
    intro: "<p>Your domain has expired. Renew immediately to restore service before it's released.</p>",
    rows: [{ label: "Domain", value: "techcorp.com" }, { label: "Status", value: "Expired" }],
    cta: { label: "Renew now", url: `${APP}/dashboard?tab=domains` } } },

  // ---- Account / summaries ----
  { subject: "Profile completed", opts: {
    badge: { text: "Profile", tone: "success" }, tone: "success", heading: "Profile completed",
    greeting: "Hi Sarah,", intro: "<p>Thanks for completing your profile — your workspace is now fully set up.</p>",
    cta: { label: "Go to dashboard", url: `${APP}/login` } } },
  { subject: "Your weekly summary", opts: {
    badge: { text: "Weekly summary" }, heading: "Your week at a glance",
    greeting: "Hi Sarah,", intro: "<p>Here's what happened on your projects this week.</p>",
    rows: [{ label: "Active tasks", value: "5" }, { label: "Completed", value: "3" }, { label: "New deliverables", value: "8" }, { label: "Open invoices", value: "$5,600.00" }],
    cta: { label: "Open dashboard", url: `${APP}/dashboard` } } },
];

(async () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("SMTP not configured (SMTP_USER / SMTP_PASS).");
    process.exit(1);
  }
  const list = process.argv.includes("--one") ? [samples[4]] : samples; // index 4 = "New task assigned"
  console.log(`Sending ${list.length} sample email(s) to ${TO}…`);
  let ok = 0;
  for (const s of list) {
    try {
      await transporter.sendMail({
        from: `"Zulbera" <${process.env.SMTP_USER}>`,
        to: TO,
        subject: `[Z-Portal sample] ${s.subject}`,
        html: renderEmail(s.opts),
        attachments: [logoAttachment()],
      });
      ok++;
      console.log(`  ✓ ${s.subject}`);
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      console.log(`  ✗ ${s.subject} — ${e?.message}`);
    }
  }
  console.log(`Done. ${ok}/${list.length} sent to ${TO}.`);
  process.exit(0);
})();
