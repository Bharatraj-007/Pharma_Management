// Mirrors frontend/src/permissions.js exactly — no web-only APIs, safe for RN.

export const ROLES = {
  admin: 'Admin',
  ceo: 'CEO',
  manager: 'Manager',
  worker: 'Worker',
};

export const PERMISSIONS = {
  dashboard:        ['admin', 'ceo', 'manager', 'worker'],
  tasks:            ['admin', 'ceo', 'manager', 'worker'],
  stock:            ['admin', 'ceo', 'manager'],
  attendance:       ['admin', 'ceo', 'manager', 'worker'],
  leaveManagement:  ['admin', 'ceo', 'manager', 'worker'],
  reports:          ['admin', 'ceo', 'manager', 'worker'],
  auditLogs:        ['admin', 'ceo'],
  userManagement:   ['admin', 'ceo'],
  salaryManagement: ['admin', 'ceo'],
  settings:         ['admin', 'ceo', 'manager', 'worker'],
  chat:             ['admin', 'ceo', 'manager', 'worker'],
};

export const ACTION_PERMISSIONS = {
  assignTasks:  ['admin', 'ceo', 'manager'],
  approveLeave: ['admin', 'ceo', 'manager'],
  editSalary:   ['admin', 'ceo'],
  manageUsers:  ['admin', 'ceo'],
  viewAuditLogs:['admin', 'ceo'],
};

export const MENU_ITEMS = [
  { key: 'dashboard',        label: 'Dashboard',   icon: '📊', screen: 'Dashboard',       section: 'main' },
  { key: 'tasks',            label: 'Tasks',        icon: '📋', screen: 'Tasks',           section: 'main' },
  { key: 'stock',            label: 'Inventory',    icon: '📦', screen: 'Inventory',       section: 'main' },
  { key: 'attendance',       label: 'Attendance',   icon: '⏱️', screen: 'Attendance',      section: 'main' },
  { key: 'leaveManagement',  label: 'Leave',        icon: '🗓️', screen: 'Leave',           section: 'main' },
  { key: 'reports',          label: 'Reports',      icon: '📈', screen: 'Reports',         section: 'main' },
  { key: 'chat',             label: 'Messages',     icon: '💬', screen: 'Chat',            section: 'main' },
  { key: 'settings',         label: 'Settings',     icon: '⚙️', screen: 'Settings',        section: 'main' },
  { key: 'userManagement',   label: 'Users',        icon: '👥', screen: 'UserManagement',  section: 'admin' },
  { key: 'auditLogs',        label: 'Audit Logs',   icon: '🔍', screen: 'AuditLogs',       section: 'admin' },
  { key: 'salaryManagement', label: 'Salary',       icon: '💰', screen: 'SalaryManagement',section: 'admin' },
];

export const ROLE_DISPLAY = {
  admin:   'Admin',
  ceo:     'CEO',
  manager: 'Manager',
  worker:  'Worker',
};

export const COMPANY_NAMES = {
  bharath:         'Bharath Enterprises',
  shree_ganaapathy:'Shree Ganaapathy Roto Prints',
  vel:             'Vel Gravure',
};
