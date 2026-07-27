export const ROLES = {
  admin: "Admin",
  ceo: "CEO",
  manager: "Manager",
  worker: "Worker",
};

export const PERMISSIONS = {
  dashboard: ["admin", "ceo", "manager", "worker"],
  tasks: ["admin", "ceo", "manager", "worker"],
  stock: ["admin", "ceo", "manager"],
  attendance: ["admin", "ceo", "manager", "worker"],
  leaveManagement: ["admin", "ceo", "manager", "worker"],
  reports: ["admin", "ceo", "manager", "worker"],
  auditLogs: ["admin", "ceo"],
  userManagement: ["admin", "ceo"],
  salaryManagement: ["admin", "ceo"],
  settings: ["admin", "ceo", "manager", "worker"],
  chat: ["admin", "ceo", "manager", "worker"],
  profile: ["admin", "ceo", "manager", "worker"],
};

export const ACTION_PERMISSIONS = {
  assignTasks: ["admin", "ceo", "manager"],
  approveLeave: ["admin", "ceo", "manager"],
  editSalary: ["admin", "ceo"],
  manageUsers: ["admin", "ceo"],
  viewAuditLogs: ["admin", "ceo"],
};

export const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard", section: "main" },
  { key: "tasks", label: "Tasks", icon: "📋", path: "/tasks", section: "main" },
  { key: "stock", label: "Stock", icon: "📦", path: "/stock", section: "main" },
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
