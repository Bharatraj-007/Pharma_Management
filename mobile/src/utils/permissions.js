// Mirrors frontend/src/permissions.js exactly — no web-only APIs, safe for RN.

export const ROLES = {
  super_admin: 'Super Admin',
  admin:   'Admin',
  ceo:     'CEO',
  manager: 'Manager',
  worker:  'Worker',
};

export const PERMISSIONS = {
  dashboard:        ['super_admin', 'admin', 'ceo', 'manager', 'worker'],
  tasks:            ['super_admin', 'admin', 'ceo', 'manager', 'worker'],
  stock:            ['super_admin', 'admin', 'ceo', 'manager'],
  dispatch:         ['super_admin', 'admin', 'ceo', 'manager'],
  attendance:       ['super_admin', 'admin', 'ceo', 'manager', 'worker'],
  leaveManagement:  ['super_admin', 'admin', 'ceo', 'manager', 'worker'],
  reports:          ['super_admin', 'admin', 'ceo', 'manager', 'worker'],
  auditLogs:        ['super_admin', 'admin', 'ceo'],
  userManagement:   ['super_admin', 'admin', 'ceo'],
  salaryManagement: ['super_admin', 'admin', 'ceo'],
  settings:         ['super_admin', 'admin', 'ceo', 'manager', 'worker'],
  chat:             ['super_admin', 'admin', 'ceo', 'manager', 'worker'],
};

export const ACTION_PERMISSIONS = {
  assignTasks:  ['super_admin', 'admin', 'ceo', 'manager'],
  approveLeave: ['super_admin', 'admin', 'ceo', 'manager'],
  editSalary:   ['super_admin', 'admin', 'ceo'],
  manageUsers:  ['super_admin', 'admin', 'ceo'],
  viewAuditLogs:['super_admin', 'admin', 'ceo'],
};

export const MENU_ITEMS = [
  { key: 'dashboard',        label: 'Dashboard',   icon: '📊', screen: 'Dashboard',       section: 'main' },
  { key: 'tasks',            label: 'Tasks',        icon: '📋', screen: 'Tasks',           section: 'main' },
  { key: 'stock',            label: 'Inventory',    icon: '📦', screen: 'Inventory',       section: 'main' },
  { key: 'dispatch',         label: 'Dispatch',     icon: '🚚', screen: 'Dispatch',        section: 'main' },
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
