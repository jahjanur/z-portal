# Z-Portal Database Schema - Complete Reference for ER Diagram

## Database Information
- **Database Type**: SQLite
- **ORM**: Prisma
- **Database File**: `server/prisma/dev.db`

---

## Entity Relationship Diagram (ERD) Reference

### 1. USER Entity
**Table Name:** `User`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| email | String | UNIQUE, NOT NULL | User email address |
| password | String | NOT NULL | Hashed password (bcrypt) |
| role | String | NOT NULL | Values: "ADMIN", "WORKER", "CLIENT" |
| name | String | NOT NULL | User's full name |
| createdAt | DateTime | NOT NULL, Default: now() | Account creation timestamp |

#### Client-Specific Attributes (Optional):
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| company | String | NULL | Company name |
| logo | String | NULL | Logo file path |
| colorHex | String | NULL | Brand color hex code |
| address | String | NULL | Physical address |
| postalAddress | String | NULL | Postal/mailing address |
| phoneNumber | String | NULL | Contact phone number |
| extraEmails | String | NULL | Comma-separated additional emails |
| brandPattern | String | NULL | Brand color pattern |
| shortInfo | String | NULL | Company description |
| profileStatus | String | NULL, Default: "INCOMPLETE" | Values: "INCOMPLETE", "COMPLETE" |
| inviteToken | String | UNIQUE, NULL | Invitation token for profile completion |
| inviteExpires | DateTime | NULL | Token expiration date |

#### Relationships:
- **One-to-Many**: `assignedTasks` → Task[] (as Worker)
- **One-to-Many**: `clientTasks` → Task[] (as Client)
- **One-to-Many**: `invoices` → Invoice[] (as Client)
- **One-to-Many**: `taskComments` → TaskComment[]
- **One-to-Many**: `fileComments` → FileComment[]
- **One-to-Many**: `domains` → Domain[] (as Client)
- **One-to-Many**: `projects` → TimesheetProject[] (as User)
- **One-to-Many**: `clientProjects` → Project[] (as Client)

#### Indexes:
- `email` (UNIQUE)
- `inviteToken` (UNIQUE)

---

### 2. PROJECT Entity
**Table Name:** `Project`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| name | String | NOT NULL | Project name |
| description | String | NULL | Project description |
| clientId | Int | FK, NULL | Foreign key to User (Client) |
| status | String | NOT NULL, Default: "ACTIVE" | Values: "ACTIVE", "COMPLETED", "ARCHIVED" |
| startDate | DateTime | NULL | Project start date |
| endDate | DateTime | NULL | Project end date |
| createdAt | DateTime | NOT NULL, Default: now() | Creation timestamp |
| updatedAt | DateTime | NOT NULL, Auto-updated | Last update timestamp |

#### Relationships:
- **Many-to-One**: `client` → User? (onDelete: SetNull)
- **One-to-Many**: `tasks` → Task[]

#### Indexes:
- `clientId`
- `status`

---

### 3. DOMAIN Entity
**Table Name:** `Domain`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| clientId | Int | FK, NOT NULL | Foreign key to User (Client) |
| domainName | String | NOT NULL | Domain name (e.g., example.com) |
| isPrimary | Boolean | NOT NULL, Default: false | Primary domain flag |
| isActive | Boolean | NOT NULL, Default: true | Active status |
| notes | String | NULL | Additional notes |
| createdAt | DateTime | NOT NULL, Default: now() | Creation timestamp |
| updatedAt | DateTime | NOT NULL, Auto-updated | Last update timestamp |

#### Relationships:
- **Many-to-One**: `client` → User (Required, onDelete: Cascade)

#### Indexes:
- `clientId`

#### Business Rules:
- Only one domain per client can have `isPrimary = true`
- When a domain is deleted, it's automatically removed (CASCADE)

---

### 4. TASK Entity
**Table Name:** `Task`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| title | String | NOT NULL | Task title |
| description | String | NULL | Task description |
| status | String | NOT NULL, Default: "PENDING" | Values: "PENDING", "IN_PROGRESS", "PENDING_APPROVAL", "COMPLETED" |
| dueDate | DateTime | NULL | Task due date |
| createdAt | DateTime | NOT NULL, Default: now() | Creation timestamp |
| updatedAt | DateTime | NOT NULL, Auto-updated | Last update timestamp |
| workerId | Int | FK, NULL | Foreign key to User (Worker) |
| clientId | Int | FK, NOT NULL | Foreign key to User (Client) |
| projectId | Int | FK, NULL | Foreign key to Project |

#### Relationships:
- **Many-to-One**: `worker` → User? (as Worker)
- **Many-to-One**: `client` → User (Required)
- **Many-to-One**: `project` → Project? (Optional, onDelete: SetNull)
- **One-to-Many**: `files` → TaskFile[]
- **One-to-Many**: `comments` → TaskComment[]

#### Indexes:
- `projectId`

#### Status Flow:
1. PENDING → Task created, not started
2. IN_PROGRESS → Worker actively working
3. PENDING_APPROVAL → Awaiting client/admin approval
4. COMPLETED → Task finished and approved

---

### 5. TASKFILE Entity
**Table Name:** `TaskFile`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| taskId | Int | FK, NOT NULL | Foreign key to Task |
| fileName | String | NOT NULL | Original file name |
| fileUrl | String | NOT NULL | File storage path |
| fileType | String | NOT NULL | File type (e.g., "document", "image", "pdf") |
| caption | String | NULL | File caption |
| section | String | NULL | File section/category |
| isCompleted | Boolean | NOT NULL, Default: false | Completion status |
| completedAt | DateTime | NULL | Completion timestamp |
| completedBy | Int | NULL | User ID who completed |
| uploadedAt | DateTime | NOT NULL, Default: now() | Upload timestamp |
| uploadedBy | Int | NOT NULL | User ID who uploaded |
| version | Int | NOT NULL, Default: 1 | File version number |

#### Relationships:
- **Many-to-One**: `task` → Task (Required, onDelete: Cascade)
- **One-to-Many**: `comments` → FileComment[]

#### Business Rules:
- When task is deleted, all files are deleted (CASCADE)
- Files support versioning

---

### 6. FILECOMMENT Entity
**Table Name:** `FileComment`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| fileId | Int | FK, NOT NULL | Foreign key to TaskFile |
| userId | Int | FK, NOT NULL | Foreign key to User |
| content | String | NOT NULL | Comment text |
| createdAt | DateTime | NOT NULL, Default: now() | Comment timestamp |

#### Relationships:
- **Many-to-One**: `file` → TaskFile (Required, onDelete: Cascade)
- **Many-to-One**: `user` → User (Required)

#### Business Rules:
- When file is deleted, all comments are deleted (CASCADE)

---

### 7. TASKCOMMENT Entity
**Table Name:** `TaskComment`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| taskId | Int | FK, NOT NULL | Foreign key to Task |
| userId | Int | FK, NOT NULL | Foreign key to User |
| content | String | NOT NULL | Comment text |
| createdAt | DateTime | NOT NULL, Default: now() | Comment timestamp |

#### Relationships:
- **Many-to-One**: `task` → Task (Required, onDelete: Cascade)
- **Many-to-One**: `user` → User (Required)

#### Business Rules:
- When task is deleted, all comments are deleted (CASCADE)

---

### 8. INVOICE Entity
**Table Name:** `Invoice`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| invoiceNumber | String | UNIQUE, NOT NULL | Invoice number (format: INV-####) |
| amount | Float | NOT NULL | Invoice amount |
| dueDate | DateTime | NOT NULL | Payment due date |
| status | String | NOT NULL, Default: "PENDING" | Values: "PENDING", "PAID" |
| description | String | NULL | Invoice description |
| paidAt | DateTime | NULL | Payment timestamp |
| createdAt | DateTime | NOT NULL, Default: now() | Creation timestamp |
| fileUrl | String | NULL | PDF invoice file path |
| paymentLink | String | NULL | External payment URL |
| clientId | Int | FK, NOT NULL | Foreign key to User (Client) |

#### Relationships:
- **Many-to-One**: `client` → User (Required)

#### Indexes:
- `invoiceNumber` (UNIQUE)

#### Business Rules:
- Invoice numbers are auto-generated and unique
- Format: INV-{4-digit number}

---

### 9. TIMESHEETPROJECT Entity
**Table Name:** `TimesheetProject`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| projectName | String | NOT NULL | Project name |
| clientId | Int | FK, NULL | Foreign key to User (Client) |
| description | String | NULL | Project description |
| isPaid | Boolean | NOT NULL, Default: false | Payment status |
| paidAt | DateTime | NULL | Payment timestamp |
| createdAt | DateTime | NOT NULL, Default: now() | Creation timestamp |
| updatedAt | DateTime | NOT NULL, Auto-updated | Last update timestamp |

#### Relationships:
- **Many-to-One**: `client` → User? (Optional, onDelete: SetNull)
- **One-to-Many**: `entries` → TimesheetEntry[]

#### Indexes:
- `clientId`
- `isPaid`

#### Note:
This is separate from the `Project` model. `Project` is for task organization, while `TimesheetProject` is for time tracking and billing.

---

### 10. TIMESHEETENTRY Entity
**Table Name:** `TimesheetEntry`  
**Primary Key:** `id` (Int, Auto-increment)

#### Attributes:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto-increment | Unique identifier |
| projectId | Int | FK, NOT NULL | Foreign key to TimesheetProject |
| date | DateTime | NOT NULL | Work date |
| hoursWorked | Float | NOT NULL | Hours worked |
| hourlyRate | Float | NOT NULL | Hourly rate |
| totalPay | Float | NOT NULL | Calculated: hoursWorked × hourlyRate |
| notes | String | NULL | Work notes |
| createdAt | DateTime | NOT NULL, Default: now() | Creation timestamp |
| updatedAt | DateTime | NOT NULL, Auto-updated | Last update timestamp |

#### Relationships:
- **Many-to-One**: `project` → TimesheetProject (Required, onDelete: Cascade)

#### Indexes:
- `projectId`
- `date`

#### Business Rules:
- `totalPay` is automatically calculated
- When timesheet project is deleted, all entries are deleted (CASCADE)

---

## Complete Relationship Map

```
USER (1) ──< (N) TASK [as Worker via workerId]
USER (1) ──< (N) TASK [as Client via clientId]
USER (1) ──< (N) INVOICE [as Client via clientId]
USER (1) ──< (N) DOMAIN [as Client via clientId]
USER (1) ──< (N) PROJECT [as Client via clientId]
USER (1) ──< (N) TIMESHEETPROJECT [as User via clientId]
USER (1) ──< (N) TASKCOMMENT [via userId]
USER (1) ──< (N) FILECOMMENT [via userId]

PROJECT (1) ──< (N) TASK [via projectId]

TASK (1) ──< (N) TASKFILE [via taskId]
TASK (1) ──< (N) TASKCOMMENT [via taskId]

TASKFILE (1) ──< (N) FILECOMMENT [via fileId]

TIMESHEETPROJECT (1) ──< (N) TIMESHEETENTRY [via projectId]
```

---

## Cardinality Summary

| Parent Entity | Child Entity | Relationship Type | Delete Behavior |
|--------------|-------------|------------------|----------------|
| User | Task (Worker) | One-to-Many | SetNull |
| User | Task (Client) | One-to-Many | Restrict |
| User | Invoice | One-to-Many | Restrict |
| User | Domain | One-to-Many | Cascade |
| User | Project | One-to-Many | SetNull |
| User | TimesheetProject | One-to-Many | SetNull |
| User | TaskComment | One-to-Many | Restrict |
| User | FileComment | One-to-Many | Restrict |
| Project | Task | One-to-Many | SetNull |
| Task | TaskFile | One-to-Many | Cascade |
| Task | TaskComment | One-to-Many | Cascade |
| TaskFile | FileComment | One-to-Many | Cascade |
| TimesheetProject | TimesheetEntry | One-to-Many | Cascade |

---

## Entity Count Summary

- **Total Entities**: 10
- **User-related**: 1 (User - multi-role)
- **Task-related**: 3 (Task, TaskFile, TaskComment, FileComment)
- **Project-related**: 2 (Project, TimesheetProject)
- **Billing-related**: 2 (Invoice, TimesheetEntry)
- **Client-related**: 1 (Domain)

---

## Key Constraints

### Unique Constraints:
- `User.email` - Unique
- `User.inviteToken` - Unique
- `Invoice.invoiceNumber` - Unique

### Foreign Key Constraints:
- All foreign keys have referential integrity
- Cascade deletes: Domain, TaskFile, FileComment, TaskComment, TimesheetEntry
- SetNull on delete: Project.clientId, Task.projectId, Task.workerId, TimesheetProject.clientId
- Restrict on delete: Task.clientId, Invoice.clientId, TaskComment.userId, FileComment.userId

### Default Values:
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

## ER Diagram Drawing Tips

1. **Central Entity**: User is the central entity with multiple relationships
2. **Role-based**: User has different relationships based on role (ADMIN, WORKER, CLIENT)
3. **Cascade Deletes**: Show with double-line or special notation for:
   - Domain → User (CASCADE)
   - TaskFile → Task (CASCADE)
   - FileComment → TaskFile (CASCADE)
   - TaskComment → Task (CASCADE)
   - TimesheetEntry → TimesheetProject (CASCADE)
4. **Optional Relationships**: Show with dashed lines:
   - Task.workerId (nullable)
   - Task.projectId (nullable)
   - Project.clientId (nullable)
   - TimesheetProject.clientId (nullable)
5. **Status Fields**: Include status fields as attributes (they're important for workflow)
6. **Timestamps**: Include createdAt/updatedAt for audit trail

---

## Sample ER Diagram Notation

```
┌─────────────┐
│    USER     │
├─────────────┤
│ PK id       │
│    email    │ (UNIQUE)
│    password │
│    role     │
│    name     │
│    ...      │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐
│    TASK     │
├─────────────┤
│ PK id       │
│ FK workerId │──┐
│ FK clientId │──┼──┐
│ FK projectId│──┘  │
│    title    │     │
│    status   │     │
└─────────────┘     │
                     │
                     │
              ┌──────┴──────┐
              │    USER     │
              └─────────────┘
```

---

This document provides all the information needed to create a comprehensive ER diagram for the Z-Portal database.


