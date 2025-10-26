import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  await prisma.taskComment.deleteMany({});
  await prisma.fileComment.deleteMany({});
  await prisma.taskFile.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.domain.deleteMany({});
  await prisma.user.deleteMany({});

  const usersData = [
    { email: 'admin@test.com', password: 'admin123', role: 'ADMIN', name: 'Admin User' },
    { email: 'worker1@test.com', password: 'worker123', role: 'WORKER', name: 'John Worker' },
    { email: 'worker2@test.com', password: 'worker456', role: 'WORKER', name: 'Jane Developer' },
    { email: 'client1@test.com', password: 'client123', role: 'CLIENT', name: 'Sarah Johnson', company: 'TechCorp Inc', logo: 'https://via.placeholder.com/150', colorHex: '#FF6B6B', postalAddress: '123 Business St, Suite 100', profileStatus: 'INCOMPLETE' },
    { email: 'client2@test.com', password: 'client456', role: 'CLIENT', name: 'Michael Brown', company: 'StartupXYZ', logo: 'https://via.placeholder.com/150', colorHex: '#4ECDC4', postalAddress: '456 Innovation Ave', address: '456 Innovation Ave, Floor 3', phoneNumber: '+1-555-0123', extraEmails: 'support@startupxyz.com, info@startupxyz.com', brandPattern: '#4ECDC4, #44A08D', shortInfo: 'A cutting-edge startup focused on AI solutions', profileStatus: 'COMPLETE' },
    { email: 'client3@test.com', password: 'client789', role: 'CLIENT', name: 'Emily Davis', company: 'DesignHub', logo: 'https://via.placeholder.com/150', colorHex: '#95E1D3', postalAddress: '789 Creative Blvd', profileStatus: 'INCOMPLETE' },
  ];

  const users = [];
  for (const u of usersData) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.create({
      data: { ...u, password: hashedPassword }
    });
    users.push(user);
    console.log(`Created user: ${user.email} (${user.role})`);
  }

  const clientUsers = users.filter(u => u.role === 'CLIENT');
  for (const client of clientUsers) {
    await prisma.domain.create({
      data: {
        clientId: client.id,
        domainName: `${client.company?.toLowerCase().replace(/\s/g,'') || 'example'}.com`,
        domainRegistrar: 'Namecheap',
        domainExpiry: new Date('2026-01-01'),
        hostingProvider: 'Hostinger',
        hostingPlan: 'Basic',
        hostingExpiry: new Date('2026-01-01'),
        sslExpiry: new Date('2025-12-01'),
        isPrimary: true,
        isActive: true,
        notes: 'Primary client domain',
      },
    });
    console.log(`Created domain for client: ${client.email}`);
  }

  const workerUsers = users.filter(u => u.role === 'WORKER');
  const tasksData = [
    { title: 'Build Landing Page', description: 'Create a modern landing page with animations', status: 'IN_PROGRESS', client: clientUsers[0], worker: workerUsers[0], dueDate: new Date('2025-11-01') },
    { title: 'Design Mobile App UI', description: 'Design UI/UX for mobile application', status: 'PENDING', client: clientUsers[1], worker: workerUsers[1], dueDate: new Date('2025-11-15') },
    { title: 'API Integration', description: 'Integrate third-party payment API', status: 'COMPLETED', client: clientUsers[0], worker: workerUsers[0], dueDate: new Date('2025-10-20') },
    { title: 'Brand Identity Design', description: 'Create complete brand identity package', status: 'PENDING', client: clientUsers[2], worker: workerUsers[1], dueDate: new Date('2025-11-30') },
  ];

  const tasks = [];
  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        clientId: t.client.id,
        workerId: t.worker.id,
        dueDate: t.dueDate,
      },
    });
    tasks.push(task);
    console.log(`Created task: ${task.title}`);
  }

  const invoicesData = [
    { invoiceNumber: 'INV-2025-001', amount: 5000, dueDate: new Date('2025-11-15'), status: 'PENDING', description: 'Landing page development', client: clientUsers[0] },
    { invoiceNumber: 'INV-2025-002', amount: 3500, dueDate: new Date('2025-10-25'), status: 'PAID', description: 'API Integration services', paidAt: new Date('2025-10-20'), client: clientUsers[0] },
    { invoiceNumber: 'INV-2025-003', amount: 7500, dueDate: new Date('2025-12-01'), status: 'PENDING', description: 'Mobile app UI design', client: clientUsers[1] },
  ];

  for (const inv of invoicesData) {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: inv.dueDate,
        status: inv.status,
        description: inv.description,
        paidAt: inv.paidAt,
        clientId: inv.client.id,
      },
    });
    console.log(`Created invoice: ${invoice.invoiceNumber}`);
  }

  await prisma.taskComment.create({
    data: {
      taskId: tasks[0].id,
      userId: workerUsers[0].id,
      content: 'Started working on the homepage layout',
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: tasks[0].id,
      userId: users.find(u => u.role === 'ADMIN')!.id,
      content: 'Looks great! Keep it up.',
    },
  });

  console.log('✅ Seeding finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
