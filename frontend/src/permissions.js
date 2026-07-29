export const ROLES = {
  super_admin: "Super Admin",
  admin: "Admin",
  ceo: "CEO",
  manager: "Manager",
  worker: "Worker",
};

export const PERMISSIONS = {
  dashboard: ["super_admin", "admin", "ceo", "manager", "worker"],
  tasks: ["super_admin", "admin", "ceo", "manager", "worker"],
  stock: ["super_admin", "admin", "ceo", "manager"],
  dispatch: ["super_admin", "admin", "ceo", "manager"],
  attendance: ["super_admin", "admin", "ceo", "manager", "worker"],
  leaveManagement: ["super_admin", "admin", "ceo", "manager", "worker"],
  reports: ["super_admin", "admin", "ceo", "manager", "worker"],
  auditLogs: ["super_admin", "admin", "ceo"],
  userManagement: ["super_admin", "admin", "ceo"],
  salaryManagement: ["super_admin", "admin", "ceo"],
  settings: ["super_admin", "admin", "ceo", "manager", "worker"],
  chat: ["super_admin", "admin", "ceo", "manager", "worker"],
  profile: ["super_admin", "admin", "ceo", "manager", "worker"],
};

export const ACTION_PERMISSIONS = {
  assignTasks: ["super_admin", "admin", "ceo", "manager"],
  approveLeave: ["super_admin", "admin", "ceo", "manager"],
  editSalary: ["super_admin", "admin", "ceo"],
  manageUsers: ["super_admin", "admin", "ceo"],
  viewAuditLogs: ["super_admin", "admin", "ceo"],
};

export const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard", section: "main" },
  { key: "tasks", label: "Tasks", icon: "📋", path: "/tasks", section: "main" },
  { key: "stock", label: "Stock", icon: "📦", path: "/stock", section: "main" },
  { key: "dispatch", label: "Dispatch", icon: "🚚", path: "/dispatch", section: "main" },
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
