import { writeFileSync } from "node:fs";
import { renderEmail } from "../services/emailTemplate";

const html = renderEmail({
  badge: { text: "New task", tone: "info" },
  tone: "info",
  heading: "New task assigned",
  greeting: "Hi John,",
  intro: "<p>You've been assigned a new task. Here are the details:</p>",
  rows: [
    { label: "Task", value: "Build Landing Page" },
    { label: "Client", value: "TechCorp" },
    { label: "Due date", value: "Nov 1, 2026" },
    { label: "Status", value: "Pending" },
  ],
  cta: { label: "View task", url: "http://localhost:5174/tasks/1" },
  note: "You can reply to this email or open the task to leave a comment.",
});

const out = process.argv[2] || "../client/public/mockups/email-preview.html";
// For browser preview only: cid: images don't resolve in a browser, so swap to the hosted path.
writeFileSync(out, html.replace("cid:zulberalogo", "/zulbera-email-logo.png"));
console.log("wrote", out);
