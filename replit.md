# Fleet Management System

## Overview

This is a comprehensive fleet management system built for Brazilian transportation companies. The application provides modules for vehicle tracking, employee management, fuel supply monitoring, maintenance scheduling, checklists, and fiscal document handling (CT-e, MDFe). It includes a mobile interface for field operations and supports multi-tenant database configurations with user permissions management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 20, 2025
- **CRITICAL FIX: Multi-tenancy in CT-e Module** - Fixed critical bug where CT-e routes were not respecting user-specific database configurations. All 4 CT-e endpoints (GET /api/cte-documentos, GET /api/cte-documentos/pendentes, PUT /api/cte-documentos/:id/status, GET /api/cte-documentos/:id) were using the main database pool instead of getTenantPool(). Now all CT-e operations correctly use tenant-specific database pools, ensuring complete data isolation between clients (e.g., SystemTruck and GDA Transportes).

### October 19, 2025
- **CRITICAL FIX: Workflow Configuration** - Resolved repeated server crashes by consolidating duplicate workflows (Backend and Server) into a single unified "App" workflow that runs both the backend (Node.js/Express on port 3000) and frontend (Vite on port 5000) simultaneously. This eliminates port conflicts and process duplication that were causing the application to crash.

### October 10, 2025
- **CRITICAL FIX: Database Connection Pool Memory Leak** - Fixed severe memory leak in `server.cjs` that was causing repeated application crashes. The issue was caused by creating new PostgreSQL connection pools on every request without caching, leading to memory exhaustion (exit code 137) and 500 errors during authentication. Implemented a `tenantPools` Map cache to reuse database connections, eliminating the memory leak and stabilizing the application.

- **MDF-e File Verification and PDF Viewing** - Added functionality to verify MDF-e files and display PDF documents:
  - "Atualizar Dados" button now checks for `-procMDFe.xml` and `-damdfe.pdf` files and auto-updates status to "emitido" when both exist
  - Added PDF viewer button (eye icon) to open DAMDFE in new tab when status is "emitido" or "aguardando"
  - Fixed CNPJ path access in MDFe.tsx to use `documento.empresa.cnpj` correctly

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom components and forms plugin
- **Routing**: React Router v6 with protected routes and role-based access
- **State Management**: React Query (@tanstack/react-query) for server state and caching
- **UI Components**: Headless UI for accessible components, Heroicons for icons
- **Mobile Support**: Responsive design with dedicated mobile routes and camera integration

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with raw SQL queries (no ORM)
- **Connection Pooling**: Cached tenant-specific database pools to prevent memory exhaustion
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **File Uploads**: Multipart form handling for images and documents
- **Security**: Helmet for security headers, CORS enabled, compression middleware
- **Process Management**: PM2 with cluster mode for production deployment

### Data Storage Solutions
- **Primary Database**: PostgreSQL with comprehensive schema including:
  - User management with role-based permissions
  - Vehicle fleet management with QR codes
  - Employee management with photo storage
  - Fuel supply tracking with station integration
  - Maintenance scheduling and alerts
  - Checklist system with photo attachments
  - Financial modules (accounts payable/receivable, cost centers)
  - Fiscal document management (CT-e, MDFe, freight)
- **Caching Strategy**: LocalStorage for authentication tokens and vehicle data
- **Multi-tenant Support**: Database configurations per user/company

### Authentication and Authorization
- **Authentication Method**: JWT tokens stored in localStorage
- **User Types**: Admin, fuel operator, checklist operator with granular permissions
- **Permission System**: Module-based permissions (access, create, edit, delete)
- **Password Security**: Bcrypt hashing with salt rounds
- **Session Management**: Token-based with configurable expiration

### Key Architectural Decisions
- **Database Choice**: PostgreSQL chosen for ACID compliance and complex relationship handling required for fleet management
- **No ORM Approach**: Raw SQL queries for better performance and control over complex fleet-related queries
- **Multi-tenant Architecture**: Database-per-tenant model for data isolation and scalability
- **Mobile-First Components**: Separate mobile routes with camera integration for field operations
- **Caching Strategy**: Client-side caching with React Query for optimal user experience
- **Modular Permission System**: Fine-grained access control for different operational roles

## External Dependencies

### Third-party Services
- **Supabase**: Database hosting and authentication fallback (PostgreSQL compatible)
- **Google Fonts**: Signika font family for consistent typography

### Key Libraries and APIs
- **PDF Generation**: jsPDF with autoTable plugin for report generation
- **Excel Generation**: ExcelJS for spreadsheet exports
- **QR Code**: qrcode.react for vehicle QR code generation and html5-qrcode for scanning
- **Camera Access**: react-webcam for mobile photo capture
- **Date Handling**: date-fns for Brazilian Portuguese date formatting
- **Notifications**: react-hot-toast for user feedback
- **HTTP Client**: Axios for API communication with timeout and retry logic

### Production Dependencies
- **Process Manager**: PM2 for cluster mode deployment
- **Security**: Helmet for HTTP security headers
- **Performance**: Compression middleware for response optimization
- **Database Driver**: pg (node-postgres) for PostgreSQL connectivity

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESLint**: Code quality and consistency
- **Tailwind CSS**: Utility-first styling with forms plugin
- **Vite**: Fast development server with HMR and optimized builds