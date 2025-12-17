# AbsensiKu - Digital School Attendance System

## Overview

AbsensiKu is a digital school attendance system ("Sistem Absensi Sekolah Digital") built with a modern, futuristic design aesthetic. The application provides comprehensive attendance tracking with GPS validation, photo verification, real-time monitoring, and role-based access control for educational institutions.

Key features include:
- Multi-role user management (Super Admin, School Admin, Teacher, Student, Parent)
- GPS-based attendance validation with geofencing
- Photo selfie verification for check-in/check-out
- Real-time student location tracking for leave requests
- Leave request workflow with approval system
- Dashboard analytics and reporting

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React Context for auth and theme
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens supporting dark/light themes and glassmorphism effects
- **Design System**: Futuristic enterprise dashboard aesthetic with neon accents, inspired by Linear and Vercel

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Authentication**: JWT tokens with express-session for session management
- **File Uploads**: Multer for handling photo uploads (profile pictures, attendance selfies)
- **Real-time**: Socket.IO for live tracking and notifications

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions and Zod validation schemas
- **Migrations**: Drizzle Kit for database migrations (`drizzle-kit push`)

### Project Structure
```
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # UI components (shadcn/ui + custom)
│   │   ├── pages/       # Route page components
│   │   ├── lib/         # Utilities, auth, theme, query client
│   │   └── hooks/       # Custom React hooks
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Data access layer
│   └── db.ts            # Database connection
├── shared/              # Shared code between client/server
│   └── schema.ts        # Database schema and types
└── migrations/          # Database migration files
```

### Role-Based Access Control (RBAC)
Five user roles with hierarchical permissions:
1. **Super Admin** - Full system access across all schools
2. **Admin Sekolah** - School-level administration
3. **Guru** (Teacher) - Class management, attendance approval
4. **Siswa** (Student) - Personal attendance, leave requests
5. **Orang Tua** (Parent) - View child's attendance data

### Key Design Patterns
- **Shared Schema**: Single source of truth for types between frontend and backend
- **API Request Wrapper**: Centralized fetch handling with error management in `queryClient.ts`
- **Protected Routes**: Authentication HOC wrapping authenticated pages
- **Storage Interface**: Abstracted data layer for database operations

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication & Security
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT token generation and verification
- **express-session**: Session management

### File Storage
- **Multer**: Multipart form handling for image uploads
- Local file storage in `./uploads` directory

### Real-time Communication
- **Socket.IO**: WebSocket connections for live tracking features

### UI Framework Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **React Hook Form + Zod**: Form handling with validation

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server-side bundling for production
- **tsx**: TypeScript execution for development