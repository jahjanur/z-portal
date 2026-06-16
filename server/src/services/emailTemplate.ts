/**
 * Premium, responsive email template for all Z-Portal emails.
 * Bulletproof table-based HTML + inline styles + a media query for mobile.
 * One source of truth — every email type renders through renderEmail().
 */

export type EmailTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

export interface EmailRow {
  label: string;
  value: string;
}

export interface RenderEmailOpts {
  /** Hidden inbox-preview text. */
  preheader?: string;
  /** Small pill above the heading, e.g. "New task". */
  badge?: { text: string; tone?: EmailTone };
  heading: string;
  /** Greeting line, e.g. "Hi John,". */
  greeting?: string;
  /** Body paragraph(s) — may contain inline HTML. */
  intro?: string;
  /** Key/value detail card. */
  rows?: EmailRow[];
  /** Primary call-to-action button. */
  cta?: { label: string; url: string };
  /** Small muted note under the CTA. */
  note?: string;
  /** Accent tone for header bar, badge and button. */
  tone?: EmailTone;
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderEmail(opts: RenderEmailOpts): string {
  const preheader = opts.preheader || opts.heading;

  const badge = opts.badge
    ? `<span style="display:inline-block;padding:6px 13px;border-radius:999px;background:#F1F2F6;color:#475569;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;">${esc(opts.badge.text)}</span>`
    : "";

  const greeting = opts.greeting
    ? `<p style="margin:0 0 14px;font-size:16px;color:#0F172A;font-weight:600;">${esc(opts.greeting)}</p>`
    : "";

  const intro = opts.intro
    ? `<div style="margin:0 0 8px;font-size:15px;line-height:1.65;color:#475569;">${opts.intro}</div>`
    : "";

  const rows = opts.rows && opts.rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:1px solid #E9ECF2;border-radius:14px;background:#FAFBFD;overflow:hidden;">
        ${opts.rows
          .map(
            (r, i) => `<tr>
              <td style="padding:12px 18px;font-size:13px;color:#64748B;${i ? "border-top:1px solid #EDF0F5;" : ""}width:42%;vertical-align:top;">${esc(r.label)}</td>
              <td style="padding:12px 18px;font-size:14px;color:#0F172A;font-weight:600;${i ? "border-top:1px solid #EDF0F5;" : ""}text-align:right;">${r.value}</td>
            </tr>`
          )
          .join("")}
      </table>`
    : "";

  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 6px;">
        <tr><td style="border-radius:12px;background:#0B0F14;">
          <a href="${opts.cta.url}" target="_blank"
             style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
            ${esc(opts.cta.label)} &rarr;
          </a>
        </td></tr>
      </table>`
    : "";

  const note = opts.note
    ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#94A3B8;">${opts.note}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${esc(opts.heading)}</title>
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    body { margin:0; padding:0; background:#ffffff; -webkit-font-smoothing:antialiased; }
    table { border-collapse:collapse; }
    a { text-decoration:none; }
    .zp-wrap { width:100%; background:#ffffff; padding:0; }
    .zp-card { width:600px; max-width:100%; margin:0 auto; }
    @media only screen and (max-width:620px) {
      .zp-card { width:100% !important; }
      .zp-pad { padding-left:22px !important; padding-right:22px !important; }
      .zp-h1 { font-size:22px !important; }
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <div class="zp-wrap">
    <table role="presentation" class="zp-card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <!-- header -->
      <tr><td style="background:#ffffff;padding:30px 40px 24px;text-align:center;border-bottom:1px solid #EEF0F5;" class="zp-pad">
        <img src="cid:zulberalogo" alt="Zulbera" height="28" style="height:28px;width:auto;border:0;display:inline-block;" />
      </td></tr>
      <!-- body -->
      <tr><td style="background:#ffffff;padding:36px 40px 40px;" class="zp-pad">
        ${badge ? `<div style="margin:0 0 16px;">${badge}</div>` : ""}
        <h1 class="zp-h1" style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:800;color:#0B0F14;letter-spacing:-.02em;">${esc(opts.heading)}</h1>
        ${greeting}
        ${intro}
        ${rows}
        ${cta}
        ${note}
      </td></tr>
      <!-- footer -->
      <tr><td style="background:#ffffff;padding:28px 40px;text-align:center;border-top:1px solid #EEF0F5;" class="zp-pad">
        <p style="margin:0;font-size:13px;color:#475569;">Powered by <a href="https://zulbera.com" target="_blank" style="color:#0B0F14;font-weight:700;text-decoration:none;">Zulbera</a></p>
        <p style="margin:8px 0 0;font-size:12px;color:#94A3B8;"><a href="https://zulbera.com" target="_blank" style="color:#64748B;text-decoration:none;">zulbera.com</a> &middot; &copy; ${new Date().getFullYear()} Zulbera</p>
      </td></tr>
    </table>
  </div>
</body>
</html>`;
}
