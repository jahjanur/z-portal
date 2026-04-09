import nodemailer from "nodemailer";
import prisma from "../lib/prisma";
import { zulberaEmailTemplate } from "./inviteEmails";

// ─── Event types ─────────────────────────────────────────────────────────────

export const EventType = {
  // User lifecycle
  WORKER_CREATED: "WORKER_CREATED",
  CLIENT_CREATED: "CLIENT_CREATED",
  ERASPHERE_CREATED: "ERASPHERE_CREATED",
  PROFILE_COMPLETED: "PROFILE_COMPLETED",

  // Tasks
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_CREATED: "TASK_CREATED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_PENDING_APPROVAL: "TASK_PENDING_APPROVAL",
  TASK_COMMENT_ADDED: "TASK_COMMENT_ADDED",
  TASK_FILE_UPLOADED: "TASK_FILE_UPLOADED",
  TASK_DEADLINE_APPROACHING: "TASK_DEADLINE_APPROACHING",
  TASK_OVERDUE: "TASK_OVERDUE",

  // Invoices
  INVOICE_CREATED: "INVOICE_CREATED",
  INVOICE_PAID: "INVOICE_PAID",
  INVOICE_OVERDUE: "INVOICE_OVERDUE",
  INVOICE_DUE_SOON: "INVOICE_DUE_SOON",

  // Domains
  DOMAIN_CREATED: "DOMAIN_CREATED",
  DOMAIN_ACTIVATED: "DOMAIN_ACTIVATED",
  DOMAIN_RENEWED: "DOMAIN_RENEWED",
  DOMAIN_EXPIRING_30: "DOMAIN_EXPIRING_30",
  DOMAIN_EXPIRING_14: "DOMAIN_EXPIRING_14",
  DOMAIN_EXPIRING_7: "DOMAIN_EXPIRING_7",
  DOMAIN_EXPIRED: "DOMAIN_EXPIRED",

  // Timesheets
  TIMESHEET_SUBMITTED: "TIMESHEET_SUBMITTED",

  // EraSphere
  ERASPHERE_NEW_CLIENT: "ERASPHERE_NEW_CLIENT",
  ERASPHERE_NEW_TASK: "ERASPHERE_NEW_TASK",
  ERASPHERE_REFERRED_ACCEPTED: "ERASPHERE_REFERRED_ACCEPTED",
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

export const ALL_EVENT_TYPES = Object.values(EventType);

export const CRITICAL_ADMIN_EVENTS: EventTypeValue[] = [
  EventType.DOMAIN_EXPIRING_7,
  EventType.DOMAIN_EXPIRING_14,
  EventType.DOMAIN_EXPIRING_30,
  EventType.DOMAIN_EXPIRED,
  EventType.INVOICE_OVERDUE,
];

// ─── Routing matrix ──────────────────────────────────────────────────────────

type RecipientResolver = (payload: EmitPayload) => Promise<number[]>;

function allAdmins(): RecipientResolver {
  return async () => {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    return admins.map((a) => a.id);
  };
}

function userIds(...keys: (keyof EmitPayload)[]): RecipientResolver {
  return async (payload) => {
    const ids: number[] = [];
    for (const k of keys) {
      const v = payload[k];
      if (typeof v === "number") ids.push(v);
      if (Array.isArray(v)) ids.push(...v.filter((x): x is number => typeof x === "number"));
    }
    return ids;
  };
}

function taskWorkers(): RecipientResolver {
  return async (payload) => {
    if (!payload.taskId) return [];
    const workers = await prisma.taskWorker.findMany({
      where: { taskId: payload.taskId },
      select: { userId: true },
    });
    return workers.map((w) => w.userId);
  };
}

function taskClient(): RecipientResolver {
  return async (payload) => {
    if (!payload.taskId) return payload.clientId ? [payload.clientId] : [];
    const task = await prisma.task.findUnique({ where: { id: payload.taskId }, select: { clientId: true } });
    return task ? [task.clientId] : [];
  };
}

function invoiceClient(): RecipientResolver {
  return async (payload) => {
    if (payload.clientId) return [payload.clientId];
    if (!payload.invoiceId) return [];
    const inv = await prisma.invoice.findUnique({ where: { id: payload.invoiceId }, select: { clientId: true } });
    return inv ? [inv.clientId] : [];
  };
}

function domainClient(): RecipientResolver {
  return async (payload) => {
    if (payload.clientId) return [payload.clientId];
    if (!payload.domainId) return [];
    const d = await prisma.domain.findUnique({ where: { id: payload.domainId }, select: { clientId: true } });
    return d ? [d.clientId] : [];
  };
}

function clientReferrer(): RecipientResolver {
  return async (payload) => {
    const cid = payload.clientId;
    if (!cid) return [];
    const client = await prisma.user.findUnique({ where: { id: cid }, select: { referredById: true } });
    return client?.referredById ? [client.referredById] : [];
  };
}

const ROUTING_MATRIX: Record<string, RecipientResolver[]> = {
  [EventType.WORKER_CREATED]: [allAdmins()],
  [EventType.CLIENT_CREATED]: [allAdmins()],
  [EventType.ERASPHERE_CREATED]: [allAdmins()],
  [EventType.PROFILE_COMPLETED]: [allAdmins()],

  [EventType.TASK_ASSIGNED]: [taskWorkers()],
  [EventType.TASK_CREATED]: [taskClient(), allAdmins()],
  [EventType.TASK_STATUS_CHANGED]: [taskClient(), taskWorkers()],
  [EventType.TASK_COMPLETED]: [taskClient(), taskWorkers(), allAdmins()],
  [EventType.TASK_PENDING_APPROVAL]: [allAdmins()],
  [EventType.TASK_COMMENT_ADDED]: [taskClient(), taskWorkers(), allAdmins()],
  [EventType.TASK_FILE_UPLOADED]: [taskClient(), taskWorkers(), allAdmins()],
  [EventType.TASK_DEADLINE_APPROACHING]: [taskWorkers()],
  [EventType.TASK_OVERDUE]: [taskWorkers(), allAdmins()],

  [EventType.INVOICE_CREATED]: [invoiceClient()],
  [EventType.INVOICE_PAID]: [invoiceClient(), allAdmins()],
  [EventType.INVOICE_OVERDUE]: [invoiceClient(), allAdmins()],
  [EventType.INVOICE_DUE_SOON]: [invoiceClient()],

  [EventType.DOMAIN_CREATED]: [domainClient(), allAdmins()],
  [EventType.DOMAIN_ACTIVATED]: [domainClient()],
  [EventType.DOMAIN_RENEWED]: [domainClient()],
  [EventType.DOMAIN_EXPIRING_30]: [domainClient(), allAdmins()],
  [EventType.DOMAIN_EXPIRING_14]: [domainClient(), allAdmins()],
  [EventType.DOMAIN_EXPIRING_7]: [domainClient(), allAdmins()],
  [EventType.DOMAIN_EXPIRED]: [domainClient(), allAdmins()],

  [EventType.TIMESHEET_SUBMITTED]: [allAdmins()],

  [EventType.ERASPHERE_NEW_CLIENT]: [allAdmins()],
  [EventType.ERASPHERE_NEW_TASK]: [allAdmins()],
  [EventType.ERASPHERE_REFERRED_ACCEPTED]: [clientReferrer()],
};

// ─── Emit payload ────────────────────────────────────────────────────────────

export interface EmitPayload {
  title: string;
  message: string;
  link?: string;
  actorId?: number;
  actorRole?: string; // for TASK_COMMENT_ADDED: CLIENT | WORKER | ADMIN | ERASPHERE
  taskId?: number;
  threadType?: "internal" | "client"; // for TASK_COMMENT_ADDED: per-tab badges on task detail
  invoiceId?: number;
  domainId?: number;
  clientId?: number;
  userId?: number;
  workerIds?: number[];
}

// ─── Transport (email) ───────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";

async function sendNotificationEmail(
  user: { email: string; name: string },
  title: string,
  message: string,
  link?: string
) {
  const ctaUrl = link ? `${CLIENT_URL}/login?redirect=${encodeURIComponent(link)}` : `${CLIENT_URL}/login`;
  const html = zulberaEmailTemplate({
    heading: title,
    greeting: `Hi ${user.name.split(" ")[0]},`,
    body: `<p style="margin: 0 0 12px; color: #374151; font-size: 15px;">${message}</p>`,
    ctaText: "View in Z-Portal",
    ctaUrl,
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: `Zulbera — ${title}`,
    html,
  });
}

// ─── Core emit function ──────────────────────────────────────────────────────

export async function emit(eventType: EventTypeValue, payload: EmitPayload): Promise<void> {
  const resolvers = ROUTING_MATRIX[eventType];
  if (!resolvers || resolvers.length === 0) return;

  // Resolve all recipients
  const allIds = new Set<number>();
  for (const resolver of resolvers) {
    const ids = await resolver(payload);
    ids.forEach((id) => allIds.add(id));
  }

  // Remove the actor from notifications (don't notify yourself)
  if (payload.actorId) allIds.delete(payload.actorId);

  if (allIds.size === 0) return;

  // Load preferences for all recipients
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: [...allIds] }, eventType },
  });
  const prefMap = new Map(prefs.map((p) => [p.userId, p]));

  // Load user info for email
  const users = await prisma.user.findMany({
    where: { id: { in: [...allIds] } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  for (const userId of allIds) {
    const pref = prefMap.get(userId);
    const inAppEnabled = pref ? pref.inAppEnabled : true;
    const emailEnabled = pref ? pref.emailEnabled : true;

    if (inAppEnabled) {
      try {
        await prisma.notification.create({
          data: {
            userId,
            type: eventType,
            title: payload.title,
            message: payload.message,
            link: payload.link ?? null,
            sourceRole: payload.actorRole ?? null,
            taskId: payload.taskId ?? null,
            threadType: payload.threadType ?? null,
          },
        });
      } catch (err) {
        console.error(`Failed to create in-app notification for user ${userId}:`, err);
      }
    }

    if (emailEnabled) {
      const user = userMap.get(userId);
      if (user) {
        sendNotificationEmail(user, payload.title, payload.message, payload.link).catch((err) =>
          console.error(`Failed to send notification email to ${user.email}:`, err)
        );
      }
    }
  }
}
