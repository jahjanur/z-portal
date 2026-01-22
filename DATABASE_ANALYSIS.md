# ECORE Database Analysis

## What is ECORE?

**ECORE is a comprehensive business management application** designed to help businesses manage their clients, projects, tasks, and operations efficiently. It serves as a centralized platform for:

### Core Purpose
- **Client Management**: Manage client profiles, company information, branding, and contact details
- **Project & Task Management**: Organize work into projects and tasks, assign workers, track progress
- **Domain & Hosting Management**: Track client domains, hosting providers, SSL certificates, and renewal dates
- **Invoice & Billing**: Generate invoices, track payments, send payment requests, and manage billing
- **Time Tracking**: Log work hours, calculate payments, and track timesheet projects
- **File & Document Management**: Upload, organize, and comment on files related to tasks and clients
- **Team Collaboration**: Enable communication through comments on tasks and files

### User Roles
ECORE supports three distinct user roles:

1. **ADMIN** - Full system access, manages all clients, workers, tasks, invoices, and domains
2. **WORKER** - Assigned to tasks, can update task status, upload files, add comments, view assigned client invoices
3. **CLIENT** - Can view their own tasks, invoices, add comments, complete their company profile

### Key Features
- **Client Onboarding**: Invite clients via email with secure tokens to complete their company profiles
- **Task Workflow**: Status-based workflow (PENDING → IN_PROGRESS → PENDING_APPROVAL → COMPLETED)
- **Project Organization**: Group related tasks under projects for better organization
- **Automated Invoicing**: Auto-generate invoice numbers and send payment requests via email
- **Domain Tracking**: Monitor domain registrations, hosting plans, and SSL certificate expiry dates
- **Time Billing**: Track work hours with hourly rates and automatic payment calculations
- **File Versioning**: Upload and manage files with version tracking
- **Email Notifications**: Automated emails for task assignments, completions, invoice payments, and more

### Use Cases
- **Digital Agencies**: Manage multiple clients, their websites, projects, and billing
- **Freelancers**: Track work, time, and invoices for multiple clients
- **Service Businesses**: Organize client work, manage domains/hosting, and handle billing
- **Consulting Firms**: Project management, time tracking, and client invoicing

---

## Database Overview
- **Database Type**: SQLite
- **ORM**: Prisma
- **Database File**: `server/prisma/dev.db`

---

## Database Schema

### 1. **User Model** (Multi-role System)
The User model serves as the central entity supporting three roles: ADMIN, WORKER, and CLIENT.

#### Core Fields (All Roles)
- `id` (Int, Primary Key, Auto-increment)
- `email` (String, Unique)
- `password` (String, Hashed with bcrypt)
- `role` (String: "ADMIN", "WORKER", "CLIENT")
- `name` (String)
- `createdAt` (DateTime, Default: now())

#### Client-Specific Fields
- `company` (String, Optional)
- `logo` (String, Optional - File path)
- `colorHex` (String, Optional - Brand color)
- `address` (String, Optional)
- `postalAddress` (String, Optional)
- `phoneNumber` (String, Optional)
- `extraEmails` (String, Optional - Comma-separated)
- `brandPattern` (String, Optional - Color pattern)
- `shortInfo` (String, Optional - Company description)
- `profileStatus` (String, Optional, Default: "INCOMPLETE" - Values: "INCOMPLETE", "COMPLETE")

#### Invitation System
- `inviteToken` (String, Optional, Unique - For profile completion)
- `inviteExpires` (DateTime, Optional - 7 days from creation)

#### Relations
- `assignedTasks` → Task[] (as Worker)
- `clientTasks` → Task[] (as Client)
- `invoices` → Invoice[] (as Client)
- `taskComments` → TaskComment[]
- `fileComments` → FileComment[]
- `domains` → Domain[] (as Client)
- `projects` → TimesheetProject[] (as User)
- `clientProjects` → Project[] (as Client)

---

### 2. **Project Model** (Task Organization)
Projects organize tasks for better management.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `name` (String, Required)
- `description` (String, Optional)
- `clientId` (Int, Optional - Foreign Key to User)
- `status` (String, Default: "ACTIVE" - Values: "ACTIVE", "COMPLETED", "ARCHIVED")
- `startDate` (DateTime, Optional)
- `endDate` (DateTime, Optional)
- `createdAt` (DateTime, Default: now())
- `updatedAt` (DateTime, Auto-updated)

#### Relations
- `client` → User? (onDelete: SetNull)
- `tasks` → Task[]

#### Indexes
- `clientId`
- `status`

---

### 3. **Domain Model** (Client Domain Management)
Tracks domain and hosting information for clients.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `clientId` (Int, Required - Foreign Key to User, onDelete: Cascade)
- `domainName` (String, Required)
- `domainRegistrar` (String, Optional)
- `domainExpiry` (DateTime, Optional)
- `hostingProvider` (String, Optional)
- `hostingPlan` (String, Optional)
- `hostingExpiry` (DateTime, Optional)
- `sslExpiry` (DateTime, Optional)
- `isPrimary` (Boolean, Default: false)
- `isActive` (Boolean, Default: true)
- `notes` (String, Optional)
- `createdAt` (DateTime, Default: now())
- `updatedAt` (DateTime, Auto-updated)

#### Relations
- `client` → User (Required, onDelete: Cascade)

#### Indexes
- `clientId`

#### Business Logic
- Only one domain per client can be marked as `isPrimary`
- When setting a domain as primary, all other domains for that client are set to `isPrimary: false`

---

### 4. **Task Model** (Core Work Management)
Central entity for managing work assignments and progress.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `title` (String, Required)
- `description` (String, Optional)
- `status` (String, Default: "PENDING" - Values: "PENDING", "IN_PROGRESS", "PENDING_APPROVAL", "COMPLETED")
- `dueDate` (DateTime, Optional)
- `createdAt` (DateTime, Default: now())
- `updatedAt` (DateTime, Auto-updated)
- `workerId` (Int, Optional - Foreign Key to User)
- `clientId` (Int, Required - Foreign Key to User)
- `projectId` (Int, Optional - Foreign Key to Project, onDelete: SetNull)

#### Relations
- `worker` → User? (as Worker)
- `client` → User (Required)
- `project` → Project? (Optional, onDelete: SetNull)
- `files` → TaskFile[]
- `comments` → TaskComment[]

#### Indexes
- `projectId`

#### Status Flow
1. **PENDING** - Task created, not started
2. **IN_PROGRESS** - Worker is actively working
3. **PENDING_APPROVAL** - Worker completed, awaiting client/admin approval
4. **COMPLETED** - Task approved and finished

#### Permissions
- **ADMIN**: Full CRUD access
- **WORKER**: Can view assigned tasks, update status, add comments/files
- **CLIENT**: Can view their tasks, add comments, cannot update status

---

### 5. **TaskFile Model** (File Attachments)
Files attached to tasks, can be work deliverables or reference materials.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `taskId` (Int, Required - Foreign Key to Task, onDelete: Cascade)
- `fileName` (String, Required)
- `fileUrl` (String, Required - Path to uploaded file)
- `fileType` (String, Required - e.g., "document", "image", "pdf")
- `caption` (String, Optional)
- `section` (String, Optional - For organizing files)
- `isCompleted` (Boolean, Default: false - For work items)
- `completedAt` (DateTime, Optional)
- `completedBy` (Int, Optional - User ID)
- `uploadedAt` (DateTime, Default: now())
- `uploadedBy` (Int, Required - User ID)
- `version` (Int, Default: 1)

#### Relations
- `task` → Task (Required, onDelete: Cascade)
- `comments` → FileComment[]

#### File Storage
- Files stored in `server/uploads/` directory
- Unique filenames: `{timestamp}-{random}.{ext}`
- Task files: `uploads/{filename}`
- Invoice files: `uploads/invoices/{filename}`
- Profile files: `uploads/profile-files/{userId}/{filename}`

---

### 6. **FileComment Model** (Comments on Files)
Comments attached to specific files within tasks.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `fileId` (Int, Required - Foreign Key to TaskFile, onDelete: Cascade)
- `userId` (Int, Required - Foreign Key to User)
- `content` (String, Required)
- `createdAt` (DateTime, Default: now())

#### Relations
- `file` → TaskFile (Required, onDelete: Cascade)
- `user` → User (Required)

---

### 7. **TaskComment Model** (General Task Comments)
General comments on tasks (not file-specific).

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `taskId` (Int, Required - Foreign Key to Task, onDelete: Cascade)
- `userId` (Int, Required - Foreign Key to User)
- `content` (String, Required)
- `createdAt` (DateTime, Default: now())

#### Relations
- `task` → Task (Required, onDelete: Cascade)
- `user` → User (Required)

---

### 8. **Invoice Model** (Billing Management)
Invoices for client billing and payment tracking.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `invoiceNumber` (String, Required, Unique - Format: "INV-{number}")
- `amount` (Float, Required)
- `dueDate` (DateTime, Required)
- `status` (String, Default: "PENDING" - Values: "PENDING", "PAID")
- `description` (String, Optional)
- `paidAt` (DateTime, Optional)
- `createdAt` (DateTime, Default: now())
- `fileUrl` (String, Optional - PDF invoice file)
- `paymentLink` (String, Optional - External payment URL)
- `clientId` (Int, Required - Foreign Key to User)

#### Relations
- `client` → User (Required)

#### Invoice Number Generation
- Auto-generated: `INV-{nextNumber}` (4-digit padded)
- Increments from last invoice number

#### Permissions
- **ADMIN**: Full CRUD access, can send payment requests via email
- **WORKER**: Can view invoices for clients they have tasks with
- **CLIENT**: Can view only their own invoices

#### Email Integration
- Payment request emails sent with invoice PDF attachment
- Payment reminders can be sent
- Payment link can be included in emails

---

### 9. **TimesheetProject Model** (Time Tracking)
Projects for tracking work hours and billing.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `projectName` (String, Required)
- `clientId` (Int, Optional - Foreign Key to User, onDelete: SetNull)
- `description` (String, Optional)
- `isPaid` (Boolean, Default: false)
- `paidAt` (DateTime, Optional)
- `createdAt` (DateTime, Default: now())
- `updatedAt` (DateTime, Auto-updated)

#### Relations
- `client` → User? (Optional, onDelete: SetNull)
- `entries` → TimesheetEntry[]

#### Indexes
- `clientId`
- `isPaid`

#### Note
This is separate from the `Project` model. `Project` is for task organization, while `TimesheetProject` is for time tracking and billing.

---

### 10. **TimesheetEntry Model** (Time Log Entries)
Individual time entries for timesheet projects.

#### Fields
- `id` (Int, Primary Key, Auto-increment)
- `projectId` (Int, Required - Foreign Key to TimesheetProject, onDelete: Cascade)
- `date` (DateTime, Required)
- `hoursWorked` (Float, Required)
- `hourlyRate` (Float, Required)
- `totalPay` (Float, Required - Calculated: hoursWorked × hourlyRate)
- `notes` (String, Optional)
- `createdAt` (DateTime, Default: now())
- `updatedAt` (DateTime, Auto-updated)

#### Relations
- `project` → TimesheetProject (Required, onDelete: Cascade)

#### Indexes
- `projectId`
- `date`

#### Calculations
- `totalPay` is automatically calculated when creating/updating entries
- Total hours and total pay are computed at the project level

---

## Database Relationships Summary

```
User (ADMIN/WORKER/CLIENT)
├── assignedTasks (as Worker) → Task[]
├── clientTasks (as Client) → Task[]
├── invoices (as Client) → Invoice[]
├── taskComments → TaskComment[]
├── fileComments → FileComment[]
├── domains (as Client) → Domain[]
├── projects (as User) → TimesheetProject[]
└── clientProjects (as Client) → Project[]

Project
├── client → User? (onDelete: SetNull)
└── tasks → Task[]

Task
├── worker → User? (as Worker)
├── client → User (Required)
├── project → Project? (onDelete: SetNull)
├── files → TaskFile[]
└── comments → TaskComment[]

TaskFile
├── task → Task (onDelete: Cascade)
└── comments → FileComment[]

Domain
└── client → User (onDelete: Cascade)

Invoice
└── client → User

TimesheetProject
├── client → User? (onDelete: SetNull)
└── entries → TimesheetEntry[]

TimesheetEntry
└── project → TimesheetProject (onDelete: Cascade)
```

---

## Key Database Operations

### User Management
- **Create User**: Admin creates users with role-specific fields
- **Client Invitation**: Clients receive invite tokens (7-day expiry) to complete profile
- **Profile Completion**: Clients complete profile using invite token
- **User Roles**: ADMIN, WORKER, CLIENT with different permissions

### Task Management
- **Create Task**: Admin creates tasks, optionally assigns worker and project
- **Task Status Updates**: Workers update status (PENDING → IN_PROGRESS → PENDING_APPROVAL → COMPLETED)
- **File Uploads**: Files attached to tasks with versioning
- **Comments**: Both task-level and file-level comments
- **Project Organization**: Tasks can be grouped under projects

### Domain Management
- **Domain Tracking**: Track domain registration, hosting, and SSL expiry dates
- **Primary Domain**: One primary domain per client
- **Domain CRUD**: Full CRUD operations for domain management

### Invoice Management
- **Invoice Creation**: Auto-generated invoice numbers
- **Payment Tracking**: Status (PENDING/PAID) with payment dates
- **Email Integration**: Send payment requests and reminders
- **File Attachments**: PDF invoices can be attached

### Timesheet Management
- **Project Creation**: Create timesheet projects for time tracking
- **Time Entries**: Log hours worked with hourly rate
- **Automatic Calculations**: Total pay calculated automatically
- **Payment Status**: Mark projects as paid/unpaid

---

## Database Constraints & Rules

### Cascade Deletes
- **Domain** → Deleted when client is deleted
- **TaskFile** → Deleted when task is deleted
- **FileComment** → Deleted when file is deleted
- **TaskComment** → Deleted when task is deleted
- **TimesheetEntry** → Deleted when timesheet project is deleted

### Set Null on Delete
- **Project.clientId** → Set to null if client deleted
- **Task.projectId** → Set to null if project deleted
- **Task.workerId** → Set to null if worker deleted
- **TimesheetProject.clientId** → Set to null if client deleted

### Unique Constraints
- `User.email` - Unique
- `User.inviteToken` - Unique
- `Invoice.invoiceNumber` - Unique

### Default Values
- `User.profileStatus` = "INCOMPLETE"
- `Project.status` = "ACTIVE"
- `Task.status` = "PENDING"
- `Invoice.status` = "PENDING"
- `Domain.isPrimary` = false
- `Domain.isActive` = true
- `TaskFile.isCompleted` = false
- `TaskFile.version` = 1
- `TimesheetProject.isPaid` = false

---

## Indexes

### Performance Indexes
- `User.email` (Unique)
- `User.inviteToken` (Unique)
- `Project.clientId`
- `Project.status`
- `Domain.clientId`
- `Task.projectId`
- `Invoice.invoiceNumber` (Unique)
- `TimesheetProject.clientId`
- `TimesheetProject.isPaid`
- `TimesheetEntry.projectId`
- `TimesheetEntry.date`

---

## Seed Data

The seed file (`server/prisma/seed.ts`) creates:
- **3 Test Users**:
  - 1 Admin: `admin@test.com` / `admin123`
  - 2 Workers: `worker1@test.com`, `worker2@test.com`
  - 3 Clients: `client1@test.com`, `client2@test.com`, `client3@test.com`
- **Domains**: One domain per client
- **Tasks**: 4 sample tasks with various statuses
- **Invoices**: 3 sample invoices (1 paid, 2 pending)
- **Comments**: Sample task comments

---

## Security Considerations

1. **Password Hashing**: All passwords hashed with bcrypt (10 rounds)
2. **JWT Authentication**: Routes protected with JWT middleware
3. **Role-Based Access Control**: Different permissions per role
4. **Invite Token Expiry**: 7-day expiry for profile completion
5. **File Upload Limits**: 100MB for general files, 10MB for invoices

---

## File Storage Structure

```
server/uploads/
├── {timestamp}-{random}.{ext}          # General uploads
├── invoices/
│   └── invoice-{timestamp}-{random}.pdf # Invoice PDFs
├── files/
│   └── file-{timestamp}-{random}-{name} # Task files
└── profile-files/
    └── {userId}/
        └── {filename}                   # Client profile files
```

---

## Migration History

1. **Initial Migration** (`20251101161633_add_projects`):
   - Created all tables
   - Added indexes
   - Set up foreign key relationships
   - Added Project model for task organization

---

## API Endpoints Using Database

### Tasks (`/api/tasks`)
- GET `/` - List tasks (role-filtered)
- GET `/:id` - Get task details
- POST `/` - Create task (Admin only)
- PATCH `/:id/status` - Update task status
- PUT `/:id` - Update task
- DELETE `/:id` - Delete task (Admin only)
- POST `/:id/files` - Upload file to task
- POST `/:id/comments` - Add task comment
- POST `/:taskId/files/:fileId/comments` - Add file comment

### Users (`/api/users`)
- GET `/` - List all users (Admin only)
- GET `/:id` - Get user details (Admin only)
- GET `/by-token/:token` - Get user by invite token
- GET `/clients/list` - List clients (Admin/Worker)
- GET `/files/client/:clientId` - Get client files (Admin)
- GET `/profile-files/client/:clientId` - Get profile files (Admin)
- POST `/` - Create user (Admin only)
- POST `/complete-profile` - Complete client profile
- POST `/:id/resend-invite` - Resend invite email (Admin)
- DELETE `/:id` - Delete user (Admin only)

### Invoices (`/api/invoices`)
- GET `/` - List invoices (role-filtered)
- GET `/:id` - Get invoice details
- POST `/` - Create invoice (Admin only)
- POST `/:id/request-payment` - Send payment request email (Admin)
- PUT `/:id` - Update invoice (Admin only)
- DELETE `/:id` - Delete invoice (Admin only)

### Domains (`/api/domains`)
- GET `/client/:clientId` - List client domains
- GET `/:id` - Get domain details
- POST `/` - Create domain (Admin only)
- PUT `/:id` - Update domain (Admin only)
- DELETE `/:id` - Delete domain (Admin only)
- POST `/:id/set-primary` - Set domain as primary (Admin)

### Projects (`/api/projects`)
- GET `/` - List all projects
- GET `/:id` - Get project details
- POST `/` - Create project
- PATCH `/:id` - Update project
- PATCH `/:id/status` - Update project status
- DELETE `/:id` - Delete project

### Timesheet (`/api/timesheet`)
- GET `/projects` - List timesheet projects
- GET `/projects/:id` - Get timesheet project details
- POST `/projects` - Create timesheet project
- POST `/projects/:id/entries` - Add time entry
- PATCH `/entries/:id` - Update time entry
- DELETE `/entries/:id` - Delete time entry
- DELETE `/projects/:id` - Delete timesheet project
- PATCH `/projects/:id/mark-paid` - Mark project as paid
- PATCH `/projects/:id/mark-unpaid` - Mark project as unpaid

---

## Summary

**ECORE is a business management application** that provides a complete solution for managing clients, projects, tasks, and business operations. The database architecture supports:

### Core Business Functions
- **Client Management**: Complete client profiles with company information, branding, contact details, and profile completion workflow
- **Project & Task Management**: Organize work into projects, assign tasks to workers, track progress through status workflows
- **Domain & Hosting Management**: Track client domains, registrars, hosting providers, SSL certificates, and renewal dates
- **Invoice & Payment Management**: Generate invoices, track payment status, send automated payment requests, and manage billing
- **Time Tracking & Billing**: Log work hours, calculate payments based on hourly rates, and track timesheet projects
- **File & Document Management**: Upload, organize, version, and comment on files related to tasks and clients
- **Team Collaboration**: Enable communication through task comments and file-specific comments

### Technical Architecture
- **Database**: SQLite with Prisma ORM for type-safe database access
- **Multi-role System**: ADMIN (full control), WORKER (task execution), CLIENT (view and collaborate)
- **Security**: Password hashing (bcrypt), JWT authentication, role-based access control
- **Email Integration**: Automated notifications for tasks, invoices, and profile completions
- **File Storage**: Organized file system for uploads, invoices, and client profile files

### Business Value
ECORE helps businesses:
- **Streamline Operations**: Centralized platform for all client-related activities
- **Improve Communication**: Clear task workflows and comment systems
- **Track Finances**: Automated invoicing and payment tracking
- **Monitor Assets**: Domain and hosting expiry tracking to prevent service interruptions
- **Measure Productivity**: Time tracking with automatic billing calculations
- **Maintain Organization**: Project-based task organization and file management

The database structure is designed with proper relationships, cascade behaviors, and constraints to ensure data integrity while supporting the complex workflows of a modern business management system.

