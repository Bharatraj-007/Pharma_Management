# 💊 Smart Pharma System

A full-stack **MERN** (MongoDB, Express, React, Node.js) enterprise resource management system designed for pharmaceutical packaging companies. The platform manages inventory (foils & cylinders), task workflows, attendance tracking with salary calculation, QR code integration, audit logging, and role-based access control across multiple companies.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Setup](#-environment-setup)
- [Mock Users](#-mock-users)
- [API Reference](#-api-reference)
- [Role-Based Access Control](#-role-based-access-control)
- [Module Details](#-module-details)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## ✨ Features

### 🏭 Core Business
- **Multi-Company Support** — Manage `Bharath Enterprises`, `Shree Ganaapathy Roto Prints`, and `Vel Gravure` from one system
- **Foil Inventory** — Add, track, and consume foil rolls with auto-generated QR codes and serial numbers
- **Cylinder Inventory** — Manage cylinders with barcode generation and tracking
- **Task Workflow** — Create tasks, assign to workers, track progress (pending → in-progress → completed)
- **Material Consumption** — Automatic foil balance updates on task completion with waste tracking

### 👥 People Management
- **Role-Based Access** — CEO, Admin, Manager, Worker — each with different permissions
- **Profile System** — Full user profiles with DOB, joining date, phone, address, emergency contact
- **Staff Directory** — CEO and Admin can view all company staff profiles
- **Attendance Management** — Mark check-in/check-out with auto-captured timestamps
- **Salary System** — Set per-hour or per-day rates, auto-calculate earnings on check-out

### 🔧 Operations
- **QR Code Integration** — Generate and scan QR codes for foil tracking (camera-based scanner)
- **Barcode System** — Generate barcodes for cylinders
- **Audit Logging** — Track all actions across the system with timestamps
- **Photo Uploads** — Workers upload foil photos when starting tasks
- **Waste Tracking** — Record used KG, waste KG, and remaining KG per task

### 🎨 User Experience
- **Modern CSS Design System** — Unified, responsive UI with CSS variables
- **Responsive Layout** — Works on desktop, tablet, and mobile
- **Dark Sidebar Navigation** — Professional sidebar with role-based menu items
- **Smooth Animations** — Fade-in transitions and hover effects
- **Dual-Mode Input** — Manual entry or QR camera scanner for foil tracking

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v7, html5-qrcode, react-barcode |
| **Backend** | Node.js, Express 4 |
| **Database** | MongoDB (Mongoose ODM) |
| **Authentication** | JWT (jsonwebtoken), bcrypt |
| **File Upload** | Multer |
| **QR/Barcode** | qrcode (server), html5-qrcode (client), bwip-js |
| **Styling** | Vanilla CSS with CSS Variables (Design System) |
| **Email** | Nodemailer (mock transporter for OTP) |

---

## 📁 Project Structure

```
smart-pharma-system/
├── backend/
│   ├── models/
│   │   ├── Attendance.js      # Attendance with hours & earnings tracking
│   │   ├── AuditLog.js        # System-wide audit trail
│   │   ├── BarcodeScanLog.js  # Barcode scan history
│   │   ├── Cylinder.js        # Cylinder inventory
│   │   ├── Foil.js            # Foil inventory with QR payloads
│   │   ├── QrScanLog.js       # QR code scan history
│   │   ├── Task.js            # Task management
│   │   ├── User.js            # User profiles with salary config
│   │   └── UserRequest.js     # Signup/approval requests
│   ├── routes/
│   │   ├── barcodeRoutes.js   # Barcode generation endpoints
│   │   └── qrRoutes.js        # QR code generation & label endpoints
│   ├── qr/
│   │   ├── qrPayload.js       # QR payload build/parse utilities
│   │   └── qrSvg.js           # QR SVG generation
│   ├── server.js              # Main Express server (all routes)
│   ├── seedUsers.js           # Seed script for mock users
│   ├── seed.js                # Seed script for inventory data
│   ├── .env                   # Environment variables (JWT, DB)
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html         # HTML entry with Google Fonts (Inter)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js      # Sidebar + content layout
│   │   │   ├── Navbar.js      # Top navigation bar
│   │   │   └── PrivateRoute.js # Auth guard for protected routes
│   │   ├── pages/
│   │   │   ├── Login.js       # Login page
│   │   │   ├── Signup.js      # Registration with company selection
│   │   │   ├── VerifyOTP.js   # OTP verification
│   │   │   ├── Signout.js     # Logout handler
│   │   │   ├── NotFound.js    # 404 page
│   │   │   ├── DashboardRouter.js  # Routes to role-specific dashboards
│   │   │   ├── AdminDashboard.js   # Admin overview
│   │   │   ├── CEODashboard.js     # CEO overview
│   │   │   ├── ManagerDashboard.js # Manager overview
│   │   │   ├── WorkerDashboard.js  # Worker task view + QR scanner
│   │   │   ├── Inventory.js   # Foil & cylinder management
│   │   │   ├── Tasks.js       # Task CRUD & assignment
│   │   │   ├── Reports.js     # Attendance + salary + analytics
│   │   │   ├── Profile.js     # User profile + staff directory
│   │   │   └── AuditLogs.js   # System audit trail viewer
│   │   ├── index.css          # Global design system (CSS variables)
│   │   ├── WorkerDashboard.css # Worker-specific styles
│   │   ├── App.js             # React Router configuration
│   │   └── index.js           # React entry point
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or later)
- **MongoDB** (v6+ running locally or MongoDB Atlas)
- **npm** (v9+)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/smart-pharma-system.git
cd smart-pharma-system

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Terminal 1 — Start MongoDB (if local)
mongod

# Terminal 2 — Start Backend (port 5001)
cd backend
node server.js

# Terminal 3 — Start Frontend (port 3000)
cd frontend
npm start
```

### Seed Mock Users

```bash
cd backend
node seedUsers.js
```

This creates 4 test accounts (see [Mock Users](#-mock-users) below).

---

## ⚙ Environment Setup

| Service | Default URL |
|---------|------------|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:5001` |
| MongoDB | `mongodb://127.0.0.1:27017/pharma` |

> **Note:** For production, update all `localhost:5001` references in the frontend to your deployed API URL.

---

## 👤 Mock Users

Run `node seedUsers.js` in the backend directory to create these accounts:

| Email | Password | Role | Company |
|-------|----------|------|---------|
| `admin@bharath.com` | `Admin@123` | **Admin** | Bharath Enterprises |
| `ceo@bharath.com` | `Admin@123` | **CEO** | Bharath Enterprises |
| `manager@bharath.com` | `Admin@123` | **Manager** | Bharath Enterprises |
| `worker@bharath.com` | `Admin@123` | **Worker** | Bharath Enterprises |

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/login` | Login with email/password, returns JWT | ❌ |
| POST | `/signup` | Register new user | ❌ |
| POST | `/verify-otp` | Verify OTP for registration | ❌ |

### Profile & Staff

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/profile` | Get own profile | ✅ | All |
| PUT | `/profile` | Update own profile | ✅ | All |
| GET | `/staff` | List all company staff | ✅ | Admin, CEO |
| GET | `/staff/:id` | View specific staff profile | ✅ | Admin, CEO |
| PUT | `/staff/:id/salary` | Set salary rate for staff | ✅ | Admin, CEO |

### Inventory — Foils

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| POST | `/add-foil` | Add new foil (auto QR) | ✅ | Admin, Manager, CEO |
| GET | `/foils` | List all foils for company | ✅ | All |
| PUT | `/foils/:id` | Update foil details | ✅ | Admin, Manager, CEO |
| DELETE | `/foils/:id` | Delete foil | ✅ | Admin, CEO |

### Inventory — Cylinders

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| POST | `/add-cylinder` | Add new cylinder | ✅ | Admin, Manager, CEO |
| GET | `/cylinders` | List all cylinders | ✅ | All |
| PUT | `/cylinders/:id` | Update cylinder | ✅ | Admin, Manager, CEO |
| DELETE | `/cylinders/:id` | Delete cylinder | ✅ | Admin, CEO |

### Tasks

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| POST | `/tasks` | Create new task | ✅ | Admin, Manager, CEO |
| GET | `/tasks` | List tasks for company | ✅ | All |
| PUT | `/tasks/:id` | Update task | ✅ | Admin, Manager, CEO |
| DELETE | `/tasks/:id` | Delete task | ✅ | Admin, CEO |
| POST | `/tasks/:id/start` | Worker starts task (upload foil photo) | ✅ | Worker |
| POST | `/tasks/:id/complete` | Worker completes task (waste tracking) | ✅ | Worker |

### Attendance

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| POST | `/attendance` | Mark attendance (check-in) | ✅ | Admin, Manager, CEO |
| GET | `/attendance?date=YYYY-MM-DD` | Get attendance records | ✅ | All |
| PUT | `/attendance/:id` | Edit attendance (check-out) | ✅ | Admin, CEO |
| DELETE | `/attendance/:id` | Delete attendance record | ✅ | Admin, CEO |
| GET | `/workers` | List staff for attendance dropdown | ✅ | Admin, Manager, CEO |

### QR & Barcode

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/qrs/foil/:payload/label` | Generate QR label image | ❌ |
| GET | `/qrs/foil/:payload/svg` | Generate QR SVG | ❌ |
| GET | `/barcode/:code` | Generate barcode image | ❌ |

### Audit Logs

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/audit-logs` | Get audit trail | ✅ | Admin, Manager, CEO |

---

## 🔐 Role-Based Access Control

### Permission Matrix

| Feature | CEO | Admin | Manager | Worker |
|---------|-----|-------|---------|--------|
| **Dashboard** | CEO Dashboard | Admin Dashboard | Manager Dashboard | Worker Dashboard |
| **Inventory** | Full CRUD | Full CRUD | Add/Edit | View only |
| **Tasks** | Full CRUD | Full CRUD | Create/Assign | Start/Complete own |
| **Attendance — View** | ✅ All | ✅ All | ✅ All | ✅ Own |
| **Attendance — Mark** | ✅ All staff | ✅ Manager + Worker | ✅ Worker only | ❌ |
| **Attendance — Edit/Delete** | ✅ All | ✅ Manager + Worker | ❌ | ❌ |
| **Salary Management** | ✅ Set for all | ✅ Set for Manager + Worker | ❌ | ❌ |
| **Profile — Own** | ✅ View/Edit | ✅ View/Edit | ✅ View/Edit | ✅ View/Edit |
| **Staff Directory** | ✅ All staff | ✅ All staff | ❌ | ❌ |
| **Audit Logs** | ✅ | ✅ | ✅ | ❌ |
| **QR Scanner** | ❌ | ❌ | ❌ | ✅ |

### Hierarchy Rules
- **CEO** → Full access to everything including admin records
- **Admin** → Can manage manager and worker data, but **cannot** edit/delete CEO records
- **Manager** → Can mark attendance for workers, manage tasks
- **Worker** → Can only view assigned tasks and start/complete them

---

## 📦 Module Details

### 1. 🔐 Authentication
- JWT-based token authentication (24h expiry)
- Password hashing with bcrypt (10 salt rounds)
- Strong password validation: min 8 chars, uppercase, lowercase, digit, special char
- OTP-based email verification (mock transporter logs to console)

### 2. 📦 Inventory Management
- **Foils**: Auto-incremented serial numbers, QR code generation per foil
- **Cylinders**: Barcode generation with `CYL-{size}-{color}CLR-{random}` format
- Company-scoped: each company sees only their own inventory
- Supports foil types: `aluminium`, `blister`, `strip`, `plastic`
- Material kind varies by company (`foil` vs `plastic`)

### 3. 📋 Task Workflow
```
Create Task → Assign to Worker → Worker Starts (upload foil photo + QR scan)
→ Worker Completes (enter used/waste KG) → System auto-updates foil balance
```
- Tasks track: foil, cylinder, company, worker, status, photos
- On completion: remaining foil KG is calculated and a new QR payload is generated

### 4. 📷 QR Code System
- **Server-side**: `qrcode` library generates QR images and SVGs
- **Client-side**: `html5-qrcode` provides camera-based QR scanning
- **Payload format**: `qr:{company}|{type}|{size}|{kg}|{version}|{serial}`
- Workers can toggle between manual text entry and camera scan mode

### 5. 📊 Attendance & Salary

#### Attendance Flow:
```
Admin/Manager selects worker → Marks Check-In (time auto-captured)
→ Later marks Check-Out (time auto-captured) → Hours & earnings calculated
```

#### Salary Calculation:
| Pay Type | Calculation |
|----------|-------------|
| **Per Day** | ≥ 4 hours = full day pay, < 4 hours = half day pay |
| **Per Hour** | Hours Worked × Hourly Rate |
| **Absent** | ₹0 |

### 6. 👤 Profile System
- All users can view and edit their own profile
- Profile fields: name, email, phone, DOB, age, joining date, address, emergency contact, ID proof
- CEO and Admin can view the Staff Directory with all company members
- Click any staff member to see their full profile

### 7. 🔍 Audit Logging
- Tracks all CRUD operations across foils, cylinders, and tasks
- Records: action, actor, item type, before/after states, timestamp
- Company-scoped: each company sees only their own audit trail

---

## 🎨 Design System

The application uses a centralized CSS design system defined in `index.css` with:

- **CSS Variables** (`:root`) for colors, spacing, typography, shadows, radii
- **Component Classes**: `.sp-card`, `.sp-table`, `.sp-btn`, `.sp-badge`, `.sp-input`, `.sp-select`
- **Button Variants**: `sp-btn-primary`, `sp-btn-success`, `sp-btn-danger`, `sp-btn-warning`, `sp-btn-secondary`
- **Badge Variants**: `sp-badge-success`, `sp-badge-danger`, `sp-badge-warning`, `sp-badge-primary`, `sp-badge-neutral`
- **Layout**: `.sp-layout`, `.sp-sidebar`, `.sp-content`
- **Responsive**: Mobile-first with breakpoints at 768px and 480px
- **Dark Mode Ready**: Supports `data-theme="dark"` attribute
- **Typography**: Inter font from Google Fonts

---

## 🗄 Database Schema

### User
```javascript
{
  name, email, password, role, company,
  phone, dob, joiningDate, age,
  idProofType, idProofNumber, address, emergencyContact, profilePhoto,
  salaryRate, salaryType, currency,
  createdAt, updatedAt
}
```

### Foil
```javascript
{
  company, type, size, kg, serial,
  qrPayload, version, status
}
```

### Cylinder
```javascript
{
  company, size, color, barcode, status
}
```

### Task
```javascript
{
  company, foil, cylinder, worker, status,
  foilPhoto, qrPayload, usedKg, wasteKg, remainingKg,
  completedPhoto
}
```

### Attendance
```javascript
{
  workerName, company, date,
  checkIn, checkOut, status, workerRole,
  hoursWorked, earnings, salaryRate, salaryType,
  markedBy, markedByRole, notes,
  createdAt, updatedAt
}
```

### AuditLog
```javascript
{
  action, itemType, company, itemId,
  actor, before, after,
  createdAt
}
```

---

## 🧪 Utility Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Seed Users | `node seedUsers.js` | Create/update 4 mock users with profiles |
| Seed Data | `node seed.js` | Seed sample inventory data |
| Backfill QR | `node backfillQr.js` | Generate QR codes for existing foils |
| Check Tasks | `node checkTasks.js` | Debug: list tasks in DB |

---

## 📝 License

This project is developed for **Bharath Enterprises** and affiliated companies.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

> Built with ❤️ using the MERN Stack
