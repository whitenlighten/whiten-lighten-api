# Celeb Dent API - Comprehensive Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Design](#database-design)
4. [API Modules](#api-modules)
5. [Authentication & Authorization](#authentication--authorization)
6. [Installation & Setup](#installation--setup)
7. [API Endpoints](#api-endpoints)
8. [Performance Considerations](#performance-considerations)

## Project Overview

Celeb Dent API is a comprehensive clinic management system built with NestJS, Prisma, and PostgreSQL. It manages patient records, appointments, clinical notes, billing, dental treatments, ENT procedures, aesthetic treatments, IV therapy, and staff operations.

### Tech Stack
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator
- **Email**: NodeMailer
- **Security**: bcrypt, 2FA support

### Key Features
- Multi-role user management (Patient, Doctor, Nurse, Admin, etc.)
- Patient registration and approval workflow
- Appointment scheduling and management
- Clinical notes and medical history
- Billing and payment processing
- Dental chart management
- ENT treatment tracking
- Aesthetic procedure management
- IV therapy sessions
- Staff attendance tracking
- Audit trail and notifications

## Architecture

### Project Structure
```
src/
├── aesthetics/           # Aesthetic procedure management
├── appointments/         # Appointment scheduling
├── attendance/          # Staff attendance tracking
├── audit-trail/         # System audit logging
├── auth/               # Authentication & authorization
├── billing/            # Invoice and payment management
├── clinical-notes/     # Medical notes and suggestions
├── common/             # Shared utilities and decorators
├── dental/             # Dental treatment management
├── ent/                # ENT procedure tracking
├── iv-therapy/         # IV therapy management
├── notification/       # System notifications
├── patients/           # Patient management
├── reminders/          # Email reminders
├── users/              # User management
├── utils/              # Utility functions
├── app.module.ts       # Main application module
└── main.ts            # Application bootstrap

prisma/
├── schema.prisma       # Database schema
├── seed.ts            # Database seeding
└── migrations/        # Database migrations
```

### Design Patterns
- **Module Pattern**: Each feature is encapsulated in its own module
- **Repository Pattern**: Prisma service acts as repository layer
- **Guard Pattern**: Role-based and JWT authentication guards
- **Interceptor Pattern**: Response transformation and error handling
- **Decorator Pattern**: Custom decorators for user extraction and public routes

## Database Design

### Core Entities

#### User System
- **User**: Staff members and system users
- **Patient**: Patient profiles with medical information
- **RefreshToken**: JWT refresh token management

#### Medical Operations
- **Appointment**: Scheduling and appointment management
- **ClinicalNote**: Doctor-created medical notes
- **NoteSuggestion**: Nurse-created note suggestions
- **PatientHistory**: Medical and dental history records
- **Visit**: Patient visit tracking

#### Specialized Treatments
- **DentalChart**: Dental examination records
- **DentalTreatment**: Dental procedures
- **DentalRecall**: Follow-up scheduling
- **EntNote**: ENT examination notes
- **EntSymptom**: ENT symptom tracking
- **AestheticProcedure**: Cosmetic treatments
- **IvSession**: IV therapy sessions

#### Business Operations
- **Invoice**: Billing records
- **Payment**: Payment tracking
- **StaffAttendance**: Employee time tracking
- **AuditTrail**: System activity logging
- **Notification**: System notifications
- **Reminder**: Email reminders

### Key Relationships
- One User can have one Patient profile
- Patient has many Appointments, ClinicalNotes, Invoices
- Appointment belongs to Patient and Doctor (User)
- Invoice has many Payments
- All specialized treatments link to Patient

### Database Schema Highlights
```prisma
// Core user and patient relationship
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  role            Role
  patient         Patient?  @relation("PatientProfile")
  // ... other fields
}

model Patient {
  id              String    @id @default(cuid())
  patientId       String    @unique // System-generated ID
  userId          String?   @unique
  user            User?     @relation("PatientProfile")
  appointments    Appointment[]
  clinicalNotes   ClinicalNote[]
  // ... other relationships
}
```

## API Modules

### 1. Authentication Module (`/auth`)
**Features:**
- JWT-based authentication
- Role-based access control
- 2FA support (TOTP)
- OAuth integration (Google)
- Password reset functionality

**Key Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/2fa/setup` - Setup 2FA
- `POST /auth/refresh` - Refresh token

### 2. Patient Management (`/patients`)
**Features:**
- Patient registration (staff and self-registration)
- Approval workflow for self-registered patients
- Medical history tracking
- Communication logging

**Key Endpoints:**
- `POST /patients` - Create patient (staff)
- `POST /patients/self-register` - Self registration
- `GET /patients` - List patients (paginated)
- `PATCH /patients/:id/approve` - Approve patient

### 3. Appointment System (`/appointments`)
**Features:**
- Staff and public appointment booking
- Appointment status management
- Email notifications
- Doctor scheduling

**Key Endpoints:**
- `POST /appointments` - Staff booking
- `POST /appointments/public-book` - Public booking
- `PATCH /appointments/:id/approve` - Approve appointment
- `GET /appointments` - List appointments

### 4. Clinical Notes (`/clinical-notes`)
**Features:**
- Doctor-created clinical notes
- Nurse suggestion workflow
- Note approval system

**Key Endpoints:**
- `POST /clinical-notes/:patientId` - Add note
- `POST /clinical-notes/:patientId/suggestions` - Nurse suggestion
- `PATCH /clinical-notes/suggestions/:id/approve` - Approve suggestion

### 5. Billing System (`/billing`)
**Features:**
- Invoice generation
- Payment processing
- Multiple payment methods
- Payment status tracking

**Key Endpoints:**
- `POST /billing/invoices` - Create invoice
- `POST /billing/invoices/:id/payments` - Record payment
- `GET /billing/invoices` - List invoices

### 6. Dental Module (`/dental`)
**Features:**
- Dental chart management
- Treatment recording
- Recall scheduling

**Key Endpoints:**
- `POST /dental/charts` - Create dental chart
- `POST /dental/treatments` - Record treatment
- `POST /dental/recalls` - Schedule recall

### 7. ENT Module (`/ent`)
**Features:**
- ENT examination notes
- Symptom tracking
- Treatment history

### 8. Aesthetics Module (`/aesthetics`)
**Features:**
- Aesthetic procedure management
- Consent form handling
- Procedure add-ons

### 9. IV Therapy Module (`/iv-therapy`)
**Features:**
- IV recipe management
- Session tracking
- Reaction monitoring

### 10. Support Modules

#### Notifications (`/notifications`)
- System-wide notification management
- Patient and admin notifications

#### Attendance (`/attendance`)
- Staff time tracking
- Client attendance for appointments

#### Audit Trail (`/audit-trail`)
- System activity logging
- User action tracking

## Authentication & Authorization

### Role-Based Access Control (RBAC)

```typescript
enum Role {
  SUPERADMIN    // Full system access
  ADMIN         // Administrative functions
  DOCTOR        // Medical operations
  NURSE         // Nursing functions
  FRONTDESK     // Reception operations
  PATIENT       // Limited patient access
  PHARMACIST    // Pharmacy operations
}
```

### Permission Matrix
| Feature | Patient | Nurse | Frontdesk | Doctor | Admin | SuperAdmin |
|---------|---------|-------|-----------|--------|-------|------------|
| View Own Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Patient | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve Patient | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Appointment | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Clinical Notes | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Billing Operations | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ |
| System Administration | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

### JWT Implementation
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Role-based route protection
- User context injection

## Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm/yarn

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd celeb-dent-api
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/celeb_dent"
   JWT_SECRET="your-jwt-secret"
   REFRESH_TOKEN_SECRET="your-refresh-secret"
   SMTP_HOST="your-smtp-host"
   SMTP_PORT=587
   SMTP_USER="your-email"
   SMTP_PASS="your-password"
   ```

4. **Database Setup**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

5. **Start Application**
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

### Development Scripts
```bash
npm run build           # Build application
npm run start:dev       # Development mode
npm run start:debug     # Debug mode
npm run test           # Run tests
npm run lint           # Lint code
npm run format         # Format code
```

## API Endpoints

### Base URL
- Development: `http://localhost:3000`
- API Documentation: `http://localhost:3000/api`

### Authentication Endpoints
```
POST   /auth/login              # User login
POST   /auth/register           # User registration
POST   /auth/logout             # User logout
POST   /auth/refresh            # Refresh token
POST   /auth/forgot-password    # Password reset request
POST   /auth/reset-password     # Password reset
GET    /auth/profile            # User profile
POST   /auth/2fa/setup          # Setup 2FA
POST   /auth/2fa/verify         # Verify 2FA
```

### Patient Management
```
GET    /patients                # List patients
POST   /patients                # Create patient
POST   /patients/self-register  # Self registration
GET    /patients/:id            # Get patient
PATCH  /patients/:id            # Update patient
DELETE /patients/:id            # Archive patient
PATCH  /patients/:id/approve    # Approve patient
GET    /patients/:id/appointments # Patient appointments
POST   /patients/:id/history/medical # Add medical history
POST   /patients/:id/history/dental  # Add dental history
```

### Appointment System
```
GET    /appointments            # List appointments
POST   /appointments            # Create appointment
POST   /appointments/public-book # Public booking
GET    /appointments/:id        # Get appointment
PATCH  /appointments/:id        # Update appointment
PATCH  /appointments/:id/approve # Approve
PATCH  /appointments/:id/cancel  # Cancel
PATCH  /appointments/:id/complete # Complete
```

### Clinical Operations
```
GET    /clinical-notes          # List notes
POST   /clinical-notes/:patientId # Add note
POST   /clinical-notes/:patientId/suggestions # Add suggestion
PATCH  /clinical-notes/suggestions/:id/approve # Approve suggestion
```

### Billing System
```
GET    /billing/invoices        # List invoices
POST   /billing/invoices        # Create invoice
GET    /billing/invoices/:id    # Get invoice
POST   /billing/invoices/:id/payments # Record payment
GET    /billing/payments        # List payments
```

### Specialized Modules
```
# Dental
GET    /dental/charts           # List dental charts
POST   /dental/charts           # Create chart
GET    /dental/treatments       # List treatments
POST   /dental/treatments       # Record treatment

# ENT
GET    /ent/notes/:patientId    # List ENT notes
POST   /ent/notes               # Create note
GET    /ent/symptoms/:patientId # List symptoms
POST   /ent/symptoms            # Record symptom

# Aesthetics
GET    /aesthetics/procedures/:patientId # List procedures
POST   /aesthetics/procedures   # Create procedure
POST   /aesthetics/consents     # Upload consent

# IV Therapy
GET    /iv-therapy/recipes      # List recipes
POST   /iv-therapy/recipes      # Create recipe
GET    /iv-therapy/sessions     # List sessions
POST   /iv-therapy/sessions     # Create session
```

## Performance Considerations

### Current Issues (See DATABASE_PERFORMANCE_ANALYSIS.md)
1. Missing database indexes
2. No connection pooling
3. Inefficient query patterns
4. Excessive transactions
5. Over-fetching data

### Optimization Recommendations
1. Add strategic database indexes
2. Implement connection pooling
3. Use selective field queries
4. Implement caching layer
5. Optimize pagination

### Monitoring
- Query performance tracking
- Database connection monitoring
- Response time metrics
- Error rate monitoring

## Security Features

### Data Protection
- Password hashing with bcrypt
- JWT token security
- Role-based access control
- Input validation
- SQL injection prevention (Prisma)

### Audit Trail
- User action logging
- Data change tracking
- Access attempt monitoring

### Privacy Compliance
- Patient data encryption
- Secure file handling
- Access logging
- Data retention policies

## Future Enhancements

### Technical Improvements
1. Implement Redis caching
2. Add rate limiting
3. WebSocket for real-time notifications
4. File upload management
5. Backup and recovery systems

### Feature Enhancements
1. Mobile app support
2. Telemedicine integration
3. Advanced reporting
4. Insurance claim processing
5. Multi-clinic support

### Performance Optimizations
1. Database query optimization
2. CDN integration
3. Horizontal scaling
4. Microservices architecture
5. Event-driven architecture

## Maintenance & Support

### Regular Tasks
- Database backup verification
- Security update application
- Performance monitoring
- Log rotation
- Data cleanup

### Troubleshooting
- Check application logs
- Monitor database performance
- Verify email delivery
- Check authentication flow
- Review audit trails

This documentation provides a comprehensive overview of the Celeb Dent API system. For specific implementation details, refer to the individual module files and the database performance analysis document.