# 💊 SMART PHARMA & INDUSTRIAL MANAGEMENT SYSTEM
## Complete System Architecture, Multi-Company Control, & Technical Documentation

---

## 📋 1. Executive Overview

The **Smart Pharma & Industrial Management System** is an enterprise-grade multi-company ERP solution engineered using the **MERN Stack** (MongoDB, Express.js, React Web) and **Expo (React Native Mobile)**.

The system manages inventory tracking, product-specific dispatches, workforce management, real-time messaging, attendance, salary calculations, and automated bill-style reporting across **three distinct industrial manufacturing companies**:

1. **Company 1: Bharath Enterprises** — Pharma Printing & Packaging (Foil & Blister Materials)
2. **Company 2: Shree Ganaapathy Roto Prints** — Commercial Packaging & Printing (Plastic & Roll Materials)
3. **Company 3: Vel Gravure** — Cylinder Manufacturing & Engraving (Industrial Cylinders)

---

## 🛠️ 2. Full Technology Stack & Techniques

### **Backend Architecture (Node.js & Express)**
- **Runtime Environment:** Node.js (v24 LTS / ES6+)
- **Web Framework:** Express.js (REST API Server)
- **Database Layer:** MongoDB (Cloud Atlas & Local MongoDB fallback `mongodb://127.0.0.1:27017/pharma`)
- **ODM Library:** Mongoose v8 (Schema definition, indexing, population, middleware hooks)
- **Authentication & Security:** 
  - JSON Web Tokens (`jsonwebtoken`)
  - Password Hashing (`bcrypt` with 10 salt rounds)
  - Role-based Access Control (RBAC) & Multi-Company Scoping Middleware (`checkCompanyAccess`)
- **Real-Time Messaging & Notifications:** Socket.io (WebSockets)
- **File & Media Storage:** Multer + Cloudinary SDK
- **Document & Report Generation:**
  - **Excel Exports:** `ExcelJS` & `xlsx` (SheetJS)
  - **PDF Reports:** `pdfkit` (Backend PDF generation) & `expo-print` (Mobile printing)

### **Web Frontend (React.js)**
- **Framework:** React 18 (Single Page Application via `react-router-dom` v6)
- **UI Engine:** Vanilla CSS (Design Tokens, HSL CSS Variables, Flexbox/Grid)
- **State Management:** React Context API (`AuthContext`), `useState`, `useEffect`, `useCallback`
- **Data Export:** Client-side SheetJS (`xlsx`) and browser print engine

### **Mobile Application (React Native & Expo)**
- **Framework:** Expo SDK 53 + React Native 0.76+
- **Navigation Engine:** `@react-native-navigation/native`, `@react-native-drawer/navigation`, `@react-native-stack/navigation`
- **Storage Layer:** `@react-native-async-storage/async-storage` (Session persistence)
- **Hardware Integration:**
  - `expo-camera` / `expo-barcode-scanner` (Barcode & QR scanning)
  - `expo-print` (PDF printing directly from mobile)
  - `expo-notifications` (Device notification system)

---

## 🏢 3. Multi-Company Access Control & Role Hierarchy

The platform implements a **strict 2-tier administrative role hierarchy** with scoped data isolation:

```
                      +-----------------------------+
                      |   
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                       Admin / CEO Level   |
                      | (cross-company access to    |
                      |  Co 1, Co 2, & Co 3 data)   |
                      +--------------+--------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
+--------v-------+          +--------v-------+          +--------v-------+
|  Normal Admin  |          |  Normal Admin  |          |  Normal Admin  |
|  (Company 1)   |          |  (Company 2)   |          |  (Company 3)   |
+--------+-------+          +--------+-------+          +--------+-------+
         |                           |                           |
+--------v-------+          +--------v-------+          +--------v-------+
| Manager/Worker |          | Manager/Worker |          | Manager/Worker |
|  (Company 1)   |          |  (Company 2)   |          |  (Company 3)   |
+----------------+          +----------------+          +----------------+
```

### **1. CEO (Group Owner / System Head)**
- **Role Code:** `ceo`
- **Company Access:** `companyAccess: ['bharath', 'shree_ganaapathy', 'vel']` (All 3 companies)
- **UI Behavior:**
  - Header features a **Company Switcher Dropdown**:
    - `🏢 All Companies (Combined View)`
    - `Pharma Printing (Bharath Enterprises - Company 1)`
    - `Commercial Printing (Shree Ganaapathy - Company 2)`
    - `Cylinder Manufacturing (Vel Gravure - Company 3)`
  - Full authority to view, filter, create, and manage records across all units.
  - Can create Normal Admins, Managers, and Workers and set their `assignedCompany`.

### **2. Normal Admin / Manager / Worker**
- **Role Codes:** `admin`, `manager`, `worker`
- **Company Access:** `assignedCompany: 'bharath'` (or `'shree_ganaapathy'` / `'vel'`)
- **UI Behavior:**
  - **No Company Switcher** is visible; UI is locked exclusively to their assigned company.
  - All screens (Inventory, Dispatch, Attendance, Tasks, Reports, Chat) automatically query and restrict data to their assigned company.
- **Security Middleware (`checkCompanyAccess`):**
  - Intercepts API requests. If a non-CEO user attempts to query data from a company outside their `companyAccess`, the server overrides it server-side and returns **HTTP 403 Access Denied**.

---

## 🗄️ 4. Data Models & Database Schemas

### **1. User Schema (`User.js`)**
```javascript
{
  employeeNo: { type: String, unique: true, sparse: true },
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: 'ceo' | 'admin' | 'manager' | 'worker',
  company: String,             // Primary company code ('bharath' | 'shree_ganaapathy' | 'vel')
  assignedCompany: String,     // Scoped company assignment
  companyAccess: [String],     // Array of authorized companies
  department: String,
  shiftTiming: String,
  phone: String,
  joiningDate: String,         // YYYY-MM-DD
  salaryRate: Number,          // Base salary rate
  salaryType: 'hourly' | 'daily' | 'monthly',
  otRate: Number,              // Overtime rate per hour
  expoPushToken: String
}
```

### **2. Dispatch Schema (`Dispatch.js`)**
```javascript
{
  company: 'bharath' | 'shree_ganaapathy' | 'vel',
  productType: 'foil' | 'roll' | 'cylinder',

  // Common Fields
  productName: String,
  quantity: Number,
  destinationType: 'internal' | 'external',
  destinationCompany: String,
  dispatchDate: Date,
  deliveryMethod: 'Rapido' | 'VRL' | 'A1 Transport' | 'Own Vehicle' | 'Other',
  customDeliveryMethod: String,
  status: 'pending' | 'dispatched' | 'delivered',
  dispatchedBy: ObjectId,
  dispatchedByName: String,
  remarks: String,

  // Company 3 (Cylinder) Specific
  numberOfColors: Number,
  size: String,              // Cylinder size in inches
  manufacturer: String,      // Default: 'Vel Gravure'

  // Company 1 (Foil) Specific
  colors: [String],
  weightKg: Number,
  dimensions: String,

  // Company 2 (Roll) Specific
  rollColors: [String],
  rollWeightKg: Number,
  rollSize: String
}
```

### **3. Cylinder Schema (`Cylinder.js`)**
```javascript
{
  company: String,
  client_company: String,    // Customer / Printing Client Company Name
  product_name: String,
  colors: Number,
  size_inches: Number,
  manufacturer: String,      // Pre-filled: 'Vel Gravure'
  manufacture_date: Date,
  barcode: String,           // Auto-generated unique barcode (e.g. CYL-10-4CLR-8821)
  cylinderKind: String       // 'standard' | 'plastic_cylinder'
}
```

### **4. Foil Schema (`Foil.js`)**
```javascript
{
  company: String,
  type: String,              // 'blister' | 'alualu' | 'plastic'
  size: String,
  weight: Number,            // Weight in KG
  qrPayload: String,         // Formatted payload for QR generation
  serial: String,
  materialKind: String       // 'foil' | 'plastic'
}
```

---

## 📦 5. Core System Modules & Specifications

### **A. Product-Type Specific Dispatch Module**
- **Dynamic Input Form:** Form fields automatically update depending on the active company:
  - **Vel Gravure (Co 3):** Product Name, Colors Count, Size (inches), Manufacturer, Qty, Destination, Delivery Transport, Date, Remarks.
  - **Bharath Enterprises (Co 1):** Foil Type/Product, Colors Used, Weight (kg), Dimensions, Qty, Destination, Delivery Transport, Date, Remarks.
  - **Shree Ganaapathy (Co 2):** Roll Product Name, Roll Colors Used, Weight (kg), Roll Size, Qty, Destination, Delivery Transport, Date, Remarks.
- **Bill-Copy Style Report:**
  - **Date Filters:** Single Day view or Custom Date Range (`From Date` → `To Date`).
  - **Itemized Bill Table:** Formatted with company-specific columns matching industrial delivery notes.
  - **Summary Totals:** Calculates Total Quantity Dispatched, Total by Destination, and Total by Delivery Method.
- **Excel & PDF Exports:**
  - **Excel Export:** SheetJS (`xlsx`) / `ExcelJS` outputting structured `.xlsx` files (`Dispatch_Report_[Company]_[Dates].xlsx`).
  - **PDF Export:** PDFKit server-side / `expo-print` mobile client-side generating formatted bill copies.

### **B. Inventory & Stock Management**
- **Cylinder Management (Vel Gravure):** Tracks printing client company (`client_company`), product name, cylinder dimensions, colors count, and barcode. Features interactive **Visual Calendar Date Picker** (no manual date typing allowed!).
- **Foil & Plastic Stock:** Manages stock weights, roll sizes, material kinds, and auto-generates QR payloads.
- **Barcode & QR Scanner:** Camera integration for mobile scanning of cylinder barcodes and foil QR labels.

### **C. Visual Calendar Date Picker Modal**
- Built custom visual calendar modal for mobile app (`InventoryScreen.js`):
  - Month/Year header with prev/next navigation controls (`◀` `July 2026` `▶`).
  - Days of week header (`S M T W T F S`).
  - 1-Tap date grid selection.
  - **Zero Text Input Typing:** Date fields are pressable buttons opening the visual calendar popup.

---

## 🔌 6. API Route Specification

| HTTP Method | Route Endpoint | Access Scope | Description |
|---|---|---|---|
| `POST` | `/login` | Public | User login, returns JWT with `assignedCompany` & `companyAccess` |
| `POST` | `/api/dispatch` | Auth + Scoped | Create new dispatch with product-type validation |
| `GET` | `/api/dispatch` | Auth + Scoped | List dispatches with company, date range & status filters |
| `GET` | `/api/dispatch/report` | Auth + Scoped | Fetch bill report data & summary totals |
| `GET` | `/api/dispatch/report/export` | Auth + Scoped | Export report as Excel (`.xlsx`) or PDF (`.pdf`) |
| `GET` | `/cylinders` | Auth + Scoped | Fetch cylinder inventory list |
| `POST` | `/add-cylinder` | Auth + Scoped | Add new cylinder stock record |
| `PUT` | `/cylinders/:id` | Auth + Scoped | Update existing cylinder record |
| `DELETE` | `/cylinders/:id` | Auth + Scoped | Remove cylinder from inventory |
| `GET` | `/foils` | Auth + Scoped | Fetch foil / plastic stock list |
| `POST` | `/add-foil` | Auth + Scoped | Add new foil stock item |
| `GET` | `/api/users` | Auth + Scoped | Fetch employee directory for messaging |
| `POST` | `/api/conversations` | Auth + Scoped | Initialize chat conversation |
| `GET` | `/api/tasks` | Auth + Scoped | Fetch task assignments |
| `POST` | `/api/tasks` | Admin / Manager | Create and assign task |

---

## 🔑 7. Default System Credentials Matrix

| Account Role | Email Address | Assigned Company | Default Password |
|---|---|---|---|
| **Group CEO (Owner / System Head)** | `ceo@system.com` | All Companies | `Admin@123` |
| **Bharath Admin (Company 1)** | `admin@bharath.com` | Bharath Enterprises | `Admin@123` |
| **Bharath CEO** | `ceo@bharath.com` | Bharath Enterprises | `Admin@123` |
| **Bharath Manager** | `manager@bharath.com` | Bharath Enterprises | `Admin@123` |
| **Bharath Worker** | `worker@bharath.com` | Bharath Enterprises | `Admin@123` |
| **Shree Ganaapathy Admin (Company 2)** | `admin@shree.com` | Shree Ganaapathy Roto Prints | `Admin@123` |
| **Shree Ganaapathy Manager** | `manager@shree.com` | Shree Ganaapathy Roto Prints | `Admin@123` |
| **Vel Gravure Admin (Company 3)** | `admin@vel.com` | Vel Gravure | `Admin@123` |
| **Vel Gravure Manager** | `manager@vel.com` | Vel Gravure | `Admin@123` |

---

## 📄 Document Information
- **Document Title:** Smart Pharma System Architecture & Technical Manual
- **File Location:** `d:\smart-pharma-system\SYSTEM_DOCUMENTATION.md`
- **Generated On:** July 29, 2026
