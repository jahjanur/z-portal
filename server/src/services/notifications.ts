import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ==================== TASK NOTIFICATIONS ====================

// Notify worker when new task is created
export async function notifyNewTask(task: any, worker: { email: string; name: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: worker.email,
      subject: `New Task Assigned: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0b0f14;">New Task Assigned</h2>
          <p>Hi ${worker.name},</p>
          <p>You have been assigned a new task.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Task Details</h3>
            <p><strong>Title:</strong> ${task.title}</p>
            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            ${task.dueDate ? `<p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
            <p><strong>Status:</strong> ${task.status}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/tasks/${task.id}" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Task
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Or copy this link: ${FRONTEND_URL}/tasks/${task.id}</p>
        </div>
      `,
    });
    console.log(`✅ New task notification sent to worker ${worker.email}`);
  } catch (error) {
    console.error(`❌ Failed to send new task notification to ${worker.email}:`, error);
  }
}

// Notify admin when task is waiting for approval
export async function notifyTaskPendingApproval(task: any, worker: { name: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: ADMIN_EMAIL,
      subject: `Task Pending Approval: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">Task Pending Approval</h2>
          <p>A task has been submitted and is waiting for your approval.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Task Details</h3>
            <p><strong>Title:</strong> ${task.title}</p>
            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            <p><strong>Worker:</strong> ${worker.name}</p>
            <p><strong>Status:</strong> PENDING APPROVAL</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/tasks/${task.id}" 
               style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Review Task
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Or copy this link: ${FRONTEND_URL}/tasks/${task.id}</p>
        </div>
      `,
    });
    console.log(`✅ Task pending approval notification sent to admin`);
  } catch (error) {
    console.error(`❌ Failed to send pending approval notification:`, error);
  }
}

// Notify worker and client when task is completed
export async function notifyTaskCompleted(task: any, recipients: { email: string; name: string; role: string }[]) {
  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: recipient.email,
        subject: `Task Completed: ${task.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10B981;">Task Completed</h2>
            <p>Hi ${recipient.name},</p>
            <p>A task has been completed.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Task Details</h3>
              <p><strong>Title:</strong> ${task.title}</p>
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
              <p><strong>Status:</strong> COMPLETED</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/tasks/${task.id}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Task
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">Or copy this link: ${FRONTEND_URL}/tasks/${task.id}</p>
          </div>
        `,
      });
      console.log(`✅ Task completed notification sent to ${recipient.email}`);
    } catch (error) {
      console.error(`❌ Failed to send completion notification to ${recipient.email}:`, error);
    }
  }
}

// Notify worker when task is updated
export async function notifyTaskUpdated(task: any, worker: { email: string; name: string }, updatedFields: string[]) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: worker.email,
      subject: `Task Updated: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Task Updated</h2>
          <p>Hi ${worker.name},</p>
          <p>A task assigned to you has been updated.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Task Details</h3>
            <p><strong>Title:</strong> ${task.title}</p>
            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            ${task.dueDate ? `<p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
            <p><strong>Status:</strong> ${task.status}</p>
            <p><strong>Updated fields:</strong> ${updatedFields.join(', ')}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/tasks/${task.id}" 
               style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Task
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Or copy this link: ${FRONTEND_URL}/tasks/${task.id}</p>
        </div>
      `,
    });
    console.log(`✅ Task updated notification sent to worker ${worker.email}`);
  } catch (error) {
    console.error(`❌ Failed to send task update notification to ${worker.email}:`, error);
  }
}

// Notify client when task is created for them
export async function notifyClientNewTask(task: any, client: { email: string; name: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `New Project Started: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">New Project Started</h2>
          <p>Dear ${client.name},</p>
          <p>We've started working on a new project for you.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Project Details</h3>
            <p><strong>Title:</strong> ${task.title}</p>
            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            ${task.dueDate ? `<p><strong>Expected Completion:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/tasks/${task.id}" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Project
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Or copy this link: ${FRONTEND_URL}/tasks/${task.id}</p>
        </div>
      `,
    });
    console.log(`✅ New project notification sent to client ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send new project notification to client ${client.email}:`, error);
  }
}

// Notify when task deadline is approaching (3 days before)
export async function notifyTaskDeadlineApproaching(task: any, worker: { email: string; name: string }, daysRemaining: number) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: worker.email,
      subject: `⚠️ Task Deadline Approaching: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">⚠️ Task Deadline Approaching</h2>
          <p>Hi ${worker.name},</p>
          <p>A task assigned to you is due in <strong>${daysRemaining} day(s)</strong>.</p>
          
          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #92400E;">Task Details</h3>
            <p><strong>Title:</strong> ${task.title}</p>
            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
            <p><strong>Current Status:</strong> ${task.status}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/tasks/${task.id}" 
               style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Task
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Or copy this link: ${FRONTEND_URL}/tasks/${task.id}</p>
        </div>
      `,
    });
    console.log(`✅ Deadline approaching notification sent to worker ${worker.email}`);
  } catch (error) {
    console.error(`❌ Failed to send deadline notification to ${worker.email}:`, error);
  }
}

// Notify when task is overdue
export async function notifyTaskOverdue(task: any, worker: { email: string; name: string }, admin: { email: string }) {
  const recipients = [
    { email: worker.email, name: worker.name },
    { email: admin, name: 'Admin' }
  ];
  
  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: worker.email,
        subject: `🚨 Task Overdue: ${task.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EF4444;">🚨 Task Overdue</h2>
            <p>${recipient.email === worker.email ? `Hi ${worker.name}` : 'Admin Alert'},</p>
            <p>A task is now <strong>overdue</strong>.</p>
            
            <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
              <h3 style="margin-top: 0; color: #991B1B;">Task Details</h3>
              <p><strong>Title:</strong> ${task.title}</p>
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
              <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
              <p><strong>Assigned to:</strong> ${worker.name}</p>
              <p><strong>Current Status:</strong> ${task.status}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/tasks/${task.id}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Task
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">Or copy this link: ${FRONTEND_URL}/tasks/${task.id}</p>
          </div>
        `,
      });
      console.log(`✅ Overdue notification sent to ${recipient.email}`);
    } catch (error) {
      console.error(`❌ Failed to send overdue notification to ${recipient.email}:`, error);
    }
  }
}

// ==================== DOMAIN NOTIFICATIONS ====================

/** First-time activation only (when status becomes ACTIVE and activationEmailSentAt was null). */
export async function sendDomainActivationEmail(domain: any, client: { email: string; name: string }) {
  try {
    const activationStr = domain.activationDate ? new Date(domain.activationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
    const expirationStr = domain.expirationDate ? new Date(domain.expirationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: "Your Domain Has Been Successfully Activated 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Your Domain Has Been Successfully Activated 🎉</h2>
          <p>Dear ${client.name},</p>
          <p>Woohoo! We have great news for you.</p>
          <p>Your domain <strong>${domain.domainName}</strong> has been successfully activated.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Domain Details</h3>
            <p><strong>Activation Date:</strong> ${activationStr}</p>
            <p><strong>Expiration Date:</strong> ${expirationStr}</p>
          </div>
          
          <p>Your domain is now active and ready to use. If you need any help, feel free to contact our support team.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Domain activation email sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send domain activation email to ${client.email}:`, error);
  }
}

/** Used by scheduled job: 1 month before expiry. */
export async function sendDomainRenewalReminderEmail(domain: any, client: { email: string; name: string }) {
  try {
    const activationStr = domain.activationDate ? new Date(domain.activationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
    const expirationStr = domain.expirationDate ? new Date(domain.expirationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: "Domain Renewal Reminder",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Domain Renewal Reminder</h2>
          <p>Dear ${client.name},</p>
          <p>Your domain <strong>${domain.domainName}</strong> is scheduled to expire on <strong>${expirationStr}</strong>.</p>
          <p>Please renew your domain before this date to avoid interruption of service.</p>
          
          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #92400E;">Domain Details</h3>
            <p><strong>Domain:</strong> ${domain.domainName}</p>
            <p><strong>Activation Date:</strong> ${activationStr}</p>
            <p><strong>Expiration Date:</strong> ${expirationStr}</p>
            <p><strong>Remaining time:</strong> Approximately 1 month until expiry</p>
          </div>
          
          <p>If you have a renewal or payment link, please use it to renew before the expiration date. If you need assistance, contact our support team.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Domain renewal reminder sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send domain renewal reminder to ${client.email}:`, error);
  }
}

/** Reminder that a server's service is about to lapse (~2 weeks before expiry). */
export async function sendServerRenewalReminderEmail(server: any, client: { email: string; name: string }) {
  try {
    const activationStr = server.activationDate ? new Date(server.activationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
    const expirationStr = server.expirationDate ? new Date(server.expirationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
    const provider = server.provider ? `<p><strong>Provider:</strong> ${server.provider}</p>` : "";
    const plan = server.plan ? `<p><strong>Plan / Specs:</strong> ${server.plan}</p>` : "";
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: "Server Renewal Reminder — action needed",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Server Renewal Reminder</h2>
          <p>Dear ${client.name},</p>
          <p>Your server <strong>${server.label}</strong> is scheduled to expire on <strong>${expirationStr}</strong>.</p>
          <p><strong>Your services will stop working in about 2 weeks</strong> unless this server is renewed. Please renew before the expiration date to avoid any interruption.</p>

          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #92400E;">Server Details</h3>
            <p><strong>Server:</strong> ${server.label}</p>
            ${provider}
            ${plan}
            <p><strong>Activation Date:</strong> ${activationStr}</p>
            <p><strong>Expiration Date:</strong> ${expirationStr}</p>
            <p><strong>Remaining time:</strong> Approximately 2 weeks until services stop</p>
          </div>

          <p>If you need assistance renewing, contact our support team as soon as possible.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard"
               style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Server renewal reminder sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send server renewal reminder to ${client.email}:`, error);
  }
}

/** When admin extends expiration (renewal) — short confirmation, no first-time wording. */
export async function sendDomainRenewalConfirmationEmail(domain: any, client: { email: string; name: string }) {
  try {
    const expirationStr = domain.expirationDate ? new Date(domain.expirationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `Domain Renewed: ${domain.domainName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">Domain Renewed</h2>
          <p>Dear ${client.name},</p>
          <p>Your domain <strong>${domain.domainName}</strong> has been renewed.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>New expiration date:</strong> ${expirationStr}</p>
          </div>
          
          <p>Thank you for renewing. If you have any questions, contact our support team.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Domain renewal confirmation sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send domain renewal confirmation to ${client.email}:`, error);
  }
}

// Notify client and admin when domain is created
export async function notifyNewDomain(domain: any, client: { email: string; name: string }) {
  const recipients = [
    { email: client.email, name: client.name, role: 'client' },
    { email: ADMIN_EMAIL!, name: 'Admin', role: 'admin' }
  ];

  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: recipient.email,
        subject: `Domain Added: ${domain.domainName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #374151;">Domain Added</h2>
            <p>Hi ${recipient.name},</p>
            <p>${recipient.role === 'client' ? 'A domain has been added to your account.' : 'A new domain has been added.'}</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Domain Details</h3>
              <p><strong>Domain:</strong> ${domain.domainName}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Dashboard
              </a>
            </div>
          </div>
        `,
      });
      console.log(`✅ New domain notification sent to ${recipient.email}`);
    } catch (error) {
      console.error(`❌ Failed to send domain notification to ${recipient.email}:`, error);
    }
  }
}

// Notify when domain is expiring soon (30 days)
export async function notifyDomainExpiringSoon(domain: any, client: { email: string; name: string }, daysRemaining: number) {
  const recipients = [client.email, ADMIN_EMAIL];
  
  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: `⚠️ Domain Expiring Soon: ${domain.domainName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">⚠️ Domain Expiring Soon</h2>
            <p>${email === client.email ? `Dear ${client.name}` : 'Admin Alert'},</p>
            <p>A domain is expiring in <strong>${daysRemaining} day(s)</strong>.</p>
            
            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h3 style="margin-top: 0; color: #92400E;">Domain Details</h3>
              <p><strong>Domain:</strong> ${domain.domainName}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Domains
              </a>
            </div>
          </div>
        `,
      });
      console.log(`✅ Domain expiring notification sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send domain expiring notification to ${email}:`, error);
    }
  }
}

// Notify when hosting is expiring soon (30 days)
export async function notifyHostingExpiringSoon(domain: any, client: { email: string; name: string }, daysRemaining: number) {
  const recipients = [client.email, ADMIN_EMAIL];
  
  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: `⚠️ Hosting Expiring Soon: ${domain.domainName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">⚠️ Hosting Expiring Soon</h2>
            <p>${email === client.email ? `Dear ${client.name}` : 'Admin Alert'},</p>
            <p>Hosting for your domain is expiring in <strong>${daysRemaining} day(s)</strong>.</p>
            
            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h3 style="margin-top: 0; color: #92400E;">Hosting Details</h3>
              <p><strong>Domain:</strong> ${domain.domainName}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Domains
              </a>
            </div>
          </div>
        `,
      });
      console.log(`✅ Hosting expiring notification sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send hosting expiring notification to ${email}:`, error);
    }
  }
}

// Notify when SSL is expiring soon (30 days)
export async function notifySSLExpiringSoon(domain: any, client: { email: string; name: string }, daysRemaining: number) {
  const recipients = [client.email, ADMIN_EMAIL];
  
  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: `⚠️ SSL Certificate Expiring Soon: ${domain.domainName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">⚠️ SSL Certificate Expiring Soon</h2>
            <p>${email === client.email ? `Dear ${client.name}` : 'Admin Alert'},</p>
            <p>The SSL certificate for your domain is expiring in <strong>${daysRemaining} day(s)</strong>.</p>
            
            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h3 style="margin-top: 0; color: #92400E;">SSL Details</h3>
              <p><strong>Domain:</strong> ${domain.domainName}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Domains
              </a>
            </div>
          </div>
        `,
      });
      console.log(`✅ SSL expiring notification sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send SSL expiring notification to ${email}:`, error);
    }
  }
}

// Notify when domain has expired
export async function notifyDomainExpired(domain: any, client: { email: string; name: string }) {
  const recipients = [client.email, ADMIN_EMAIL];
  
  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: `🚨 Domain Expired: ${domain.domainName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EF4444;">🚨 Domain Expired</h2>
            <p>${email === client.email ? `Dear ${client.name}` : 'Admin Alert'},</p>
            <p>A domain has <strong>expired</strong>.</p>
            
            <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
              <h3 style="margin-top: 0; color: #991B1B;">Domain Details</h3>
              <p><strong>Domain:</strong> ${domain.domainName}</p>
              <p><strong>Status:</strong> EXPIRED</p>
            </div>
            
            <p>⚠️ <strong>Immediate action required!</strong> Please renew this domain as soon as possible to avoid losing it.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Domains
              </a>
            </div>
          </div>
        `,
      });
      console.log(`✅ Domain expired notification sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send domain expired notification to ${email}:`, error);
    }
  }
}

// Notify when domain is updated
export async function notifyDomainUpdated(domain: any, client: { email: string; name: string }, updatedFields: string[]) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `Domain Updated: ${domain.domainName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Domain Updated</h2>
          <p>Dear ${client.name},</p>
          <p>Your domain information has been updated.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Domain Details</h3>
            <p><strong>Domain:</strong> ${domain.domainName}</p>
            <p><strong>Updated fields:</strong> ${updatedFields.join(', ')}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Domains
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Domain updated notification sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send domain update notification to ${client.email}:`, error);
  }
}

// ==================== PROFILE NOTIFICATIONS ====================

// Notify admin when client completes profile
export async function notifyProfileCompleted(client: { name: string; email: string; company?: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: ADMIN_EMAIL,
      subject: `Client Profile Completed: ${client.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Client Profile Completed</h2>
          <p>A client has completed their profile setup.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Client Details</h3>
            <p><strong>Name:</strong> ${client.name}</p>
            <p><strong>Email:</strong> ${client.email}</p>
            ${client.company ? `<p><strong>Company:</strong> ${client.company}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Profile completion notification sent to admin`);
  } catch (error) {
    console.error(`❌ Failed to send profile completion notification:`, error);
  }
}

// ==================== INVOICE NOTIFICATIONS ====================

// Notify client when new invoice is created
export async function notifyNewInvoice(invoice: any, client: { email: string; name: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `New Invoice: ${invoice.invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">New Invoice</h2>
          <p>Dear ${client.name},</p>
          <p>A new invoice has been created for your account.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount:</strong> $${invoice.amount.toFixed(2)}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invoice
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ New invoice notification sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send new invoice notification:`, error);
  }
}

// Notify admin when invoice is paid
export async function notifyInvoicePaid(invoice: any, client: { name: string; email: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: ADMIN_EMAIL,
      subject: `Invoice Paid: ${invoice.invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">Invoice Paid</h2>
          <p>An invoice has been marked as paid.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount:</strong> $${invoice.amount.toFixed(2)}</p>
            <p><strong>Client:</strong> ${client.name} (${client.email})</p>
            <p><strong>Paid Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Invoice paid notification sent to admin`);
  } catch (error) {
    console.error(`❌ Failed to send invoice paid notification:`, error);
  }
}

// Notify when invoice is overdue
export async function notifyInvoiceOverdue(invoice: any, client: { email: string; name: string }) {
  const recipients = [client.email, ADMIN_EMAIL];
  
  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: `🚨 Invoice Overdue: ${invoice.invoiceNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EF4444;">🚨 Invoice Overdue</h2>
            <p>${email === client.email ? `Dear ${client.name}` : 'Admin Alert'},</p>
            <p>An invoice is now <strong>overdue</strong>.</p>
            
            <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
              <h3 style="margin-top: 0; color: #991B1B;">Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Amount:</strong> $${invoice.amount.toFixed(2)}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> OVERDUE</p>
            </div>
            
            <p>Please process payment immediately to avoid any service interruption.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Invoice
              </a>
            </div>
          </div>
        `,
      });
      console.log(`✅ Invoice overdue notification sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send invoice overdue notification to ${email}:`, error);
    }
  }
}

// Notify when invoice deadline is approaching (3 days before)
export async function notifyInvoiceDueSoon(invoice: any, client: { email: string; name: string }, daysRemaining: number) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `⚠️ Invoice Due Soon: ${invoice.invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">⚠️ Invoice Due Soon</h2>
          <p>Dear ${client.name},</p>
          <p>An invoice is due in <strong>${daysRemaining} day(s)</strong>.</p>
          
          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #92400E;">Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount:</strong> $${invoice.amount.toFixed(2)}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><strong>Days Remaining:</strong> ${daysRemaining} days</p>
          </div>
          
          <p>Please ensure payment is made before the due date.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invoice
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Invoice due soon notification sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send invoice due soon notification to ${client.email}:`, error);
  }
}

// ==================== WELCOME & ACCOUNT NOTIFICATIONS ====================

// Welcome email for new client
export async function sendWelcomeEmail(client: { email: string; name: string; company?: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `Welcome to Our Platform!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Welcome Aboard! 🎉</h2>
          <p>Dear ${client.name},</p>
          <p>Welcome to our platform! We're excited to have you${client.company ? ` and ${client.company}` : ''} as part of our community.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Getting Started</h3>
            <p>Here's what you can do:</p>
            <ul>
              <li>Complete your profile to get the most out of our services</li>
              <li>Track your projects and tasks in real-time</li>
              <li>View and manage your invoices</li>
              <li>Monitor your domain and hosting information</li>
              <li>Upload and access project files</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <p>If you have any questions or need assistance, feel free to reach out to us anytime.</p>
          
          <p>Best regards,<br>Your Team</p>
        </div>
      `,
    });
    console.log(`✅ Welcome email sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${client.email}:`, error);
  }
}

// Welcome email for new worker
export async function sendWorkerWelcomeEmail(worker: { email: string; name: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: worker.email,
      subject: `Welcome to the Team!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Welcome to the Team! 🎉</h2>
          <p>Hi ${worker.name},</p>
          <p>Welcome aboard! We're thrilled to have you join our team.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Dashboard Features</h3>
            <p>As a team member, you can:</p>
            <ul>
              <li>View and manage assigned tasks</li>
              <li>Update task progress and status</li>
              <li>Upload project files and deliverables</li>
              <li>Submit tasks for approval</li>
              <li>Track deadlines and priorities</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <p>Please log in to your dashboard to get started. If you have any questions, don't hesitate to reach out!</p>
          
          <p>Best regards,<br>Your Team</p>
        </div>
      `,
    });
    console.log(`✅ Welcome email sent to worker ${worker.email}`);
  } catch (error) {
    console.error(`❌ Failed to send welcome email to worker ${worker.email}:`, error);
  }
}

// Notify admin of new user registration (if you have public registration)
export async function notifyAdminNewUser(user: { email: string; name: string; role: string; company?: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: ADMIN_EMAIL,
      subject: `New User Registration: ${user.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">New User Registration</h2>
          <p>A new user has registered on the platform.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">User Details</h3>
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            ${user.company ? `<p><strong>Company:</strong> ${user.company}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Review User
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ New user notification sent to admin`);
  } catch (error) {
    console.error(`❌ Failed to send new user notification to admin:`, error);
  }
}

// ==================== FILE UPLOAD NOTIFICATIONS ====================

// Notify client when files are uploaded to their task
export async function notifyFileUploaded(task: any, client: { email: string; name: string }, fileName: string) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `New File Uploaded: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">New File Uploaded</h2>
          <p>Dear ${client.name},</p>
          <p>A new file has been uploaded to your project.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Upload Details</h3>
            <p><strong>Project:</strong> ${task.title}</p>
            <p><strong>File Name:</strong> ${fileName}</p>
            <p><strong>Uploaded:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/tasks/${task.id}" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Project
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ File upload notification sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send file upload notification to ${client.email}:`, error);
  }
}

// ==================== WEEKLY/MONTHLY SUMMARY NOTIFICATIONS ====================

// Send weekly summary to client
export async function sendWeeklySummary(client: { email: string; name: string }, summary: {
  activeTasks: number;
  completedTasks: number;
  pendingInvoices: number;
  totalOwed: number;
}) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: client.email,
      subject: `Your Weekly Summary`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Your Weekly Summary</h2>
          <p>Dear ${client.name},</p>
          <p>Here's what happened this week:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Project Overview</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold; color: #3B82F6;">${summary.activeTasks}</div>
                <div style="font-size: 12px; color: #6B7280; text-transform: uppercase;">Active Tasks</div>
              </div>
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold; color: #10B981;">${summary.completedTasks}</div>
                <div style="font-size: 12px; color: #6B7280; text-transform: uppercase;">Completed</div>
              </div>
            </div>
            
            ${summary.pendingInvoices > 0 ? `
              <div style="margin-top: 20px; padding: 15px; background: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0;"><strong>Pending Invoices:</strong> ${summary.pendingInvoices}</p>
                <p style="margin: 5px 0 0 0;"><strong>Total Outstanding:</strong> $${summary.totalOwed.toFixed(2)}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
          
          <p>Thank you for your continued trust in our services!</p>
        </div>
      `,
    });
    console.log(`✅ Weekly summary sent to ${client.email}`);
  } catch (error) {
    console.error(`❌ Failed to send weekly summary to ${client.email}:`, error);
  }
}

// Send monthly summary to admin
export async function sendMonthlyAdminSummary(summary: {
  newClients: number;
  completedTasks: number;
  totalRevenue: number;
  pendingTasks: number;
  expiringDomains: number;
}) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: ADMIN_EMAIL,
      subject: `Monthly Admin Summary`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">Monthly Summary - Admin Dashboard</h2>
          <p>Here's your monthly business overview:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Key Metrics</h3>
            
            <div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #374151;">${summary.newClients}</div>
              <div style="font-size: 12px; color: #6B7280;">New Clients This Month</div>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #10B981;">${summary.completedTasks}</div>
              <div style="font-size: 12px; color: #6B7280;">Tasks Completed</div>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #F59E0B;">$${summary.totalRevenue.toFixed(2)}</div>
              <div style="font-size: 12px; color: #6B7280;">Total Revenue</div>
            </div>
            
            ${summary.pendingTasks > 0 ? `
              <div style="margin-bottom: 15px; padding: 15px; background: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0;"><strong>⚠️ Pending Tasks:</strong> ${summary.pendingTasks}</p>
              </div>
            ` : ''}
            
            ${summary.expiringDomains > 0 ? `
              <div style="padding: 15px; background: #FEE2E2; border-radius: 8px; border-left: 4px solid #EF4444;">
                <p style="margin: 0;"><strong>🚨 Expiring Domains:</strong> ${summary.expiringDomains}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #374151; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>
      `,
    });
    console.log(`✅ Monthly admin summary sent`);
  } catch (error) {
    console.error(`❌ Failed to send monthly admin summary:`, error);
  }
}

// ==================== UTILITY FUNCTION ====================

// Test email configuration
export async function sendTestEmail(recipient: string) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipient,
      subject: 'Test Email - Configuration Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">✅ Email Configuration Test</h2>
          <p>Congratulations! Your email configuration is working correctly.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
            <p><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</p>
            <p><strong>From:</strong> ${process.env.SMTP_USER}</p>
          </div>
          
          <p>All email notifications are now ready to be sent.</p>
        </div>
      `,
    });
    console.log(`✅ Test email sent successfully to ${recipient}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send test email:`, error);
    return false;
  }
}