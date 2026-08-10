export const ROLES = {
  ceo: "CEO",
  admin: "Admin",
  manager: "Manager",
  worker: "Worker",
};

export const PERMISSIONS = {
  dashboard: ["ceo", "admin", "manager", "worker"],
  clientCompany: ["ceo", "admin", "manager", "worker"],
  tasks: ["ceo", "admin", "manager", "worker"],
  stock: ["ceo", "admin", "manager"],
  dispatch: ["ceo", "admin", "manager"],
  products: ["ceo", "admin", "manager"],
  finance: ["ceo", "admin"],
  attendance: ["ceo", "admin", "manager", "worker"],
  leaveManagement: ["ceo", "admin", "manager", "worker"],
  reports: ["ceo", "admin", "manager", "worker"],
  auditLogs: ["ceo", "admin"],
  userManagement: ["ceo", "admin"],
  salaryManagement: ["ceo", "admin"],
  settings: ["ceo", "admin", "manager", "worker"],
  chat: ["ceo", "admin", "manager", "worker"],
  profile: ["ceo", "admin", "manager", "worker"],
};

export const ACTION_PERMISSIONS = {
  assignTasks: ["ceo", "admin", "manager"],
  approveLeave: ["ceo", "admin", "manager"],
  editSalary: ["ceo", "admin"],
  manageUsers: ["ceo", "admin"],
  viewAuditLogs: ["ceo", "admin"],
};

export const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard", section: "main" },
  { key: "clientCompany", label: "Client Company", icon: "🏢", path: "/client-company", section: "main" },
  { key: "tasks", label: "Tasks", icon: "📋", path: "/tasks", section: "main" },
  { key: "stock", label: "Stock", icon: "📦", path: "/stock", section: "main" },
  { key: "products", label: "Product Master", icon: "🏷️", path: "/products", section: "main" },
  { key: "dispatch", label: "Dispatch", icon: "🚚", path: "/dispatch", section: "main" },
  { key: "finance", label: "Finance & P&L", icon: "💵", path: "/finance", section: "main" },
  { key: "attendance", label: "Attendance", icon: "⏱️", path: "/attendance", section: "main" },
  { key: "leaveManagement", label: "Leave", icon: "🗓️", path: "/leave", section: "main" },
  { key: "reports", label: "Reports", icon: "📄", path: "/reports", section: "main" },
  { key: "chat", label: "Messages", icon: "💬", path: "/chat", section: "main" },
  { key: "settings", label: "Settings", icon: "⚙️", path: "/settings", section: "main" },
  { key: "userManagement", label: "Users", icon: "👥", path: "/user-management", section: "admin" },
  { key: "auditLogs", label: "Audit Logs", icon: "🔍", path: "/audit-logs", section: "admin" },
  { key: "salaryManagement", label: "Salary", icon: "💰", path: "/salary", section: "admin" }
];

export const ROLE_DISPLAY = {
  admin: "Admin",
  ceo: "CEO",
  manager: "Manager",
  worker: "Worker",
};
