// Mirrors frontend/src/permissions.js exactly — no web-only APIs, safe for RN.

export const ROLES = {
  ceo:     'CEO',
  admin:   'Admin',
  manager: 'Manager',
  worker:  'Worker',
};

export const PERMISSIONS = {
  dashboard:        ['ceo', 'admin', 'manager', 'worker'],
  tasks:            ['ceo', 'admin', 'manager', 'worker'],
  stock:            ['ceo', 'admin', 'manager'],
  products:         ['ceo', 'admin', 'manager'],
  dispatch:         ['ceo', 'admin', 'manager'],
  finance:          ['ceo', 'admin'],
  advanceSalary:    ['ceo', 'admin', 'manager', 'worker'],
  clientCompany:    ['ceo', 'admin', 'manager', 'worker'],
  attendance:       ['ceo', 'admin', 'manager', 'worker'],
  leaveManagement:  ['ceo', 'admin', 'manager', 'worker'],
  reports:          ['ceo', 'admin', 'manager', 'worker'],
  auditLogs:        ['ceo', 'admin'],
  userManagement:   ['ceo', 'admin'],
  signupRequests:   ['ceo', 'admin'],
  salaryManagement: ['ceo', 'admin'],
  settings:         ['ceo', 'admin', 'manager', 'worker'],
  chat:             ['ceo', 'admin', 'manager', 'worker'],
};

export const ACTION_PERMISSIONS = {
  assignTasks:  ['ceo', 'admin', 'manager'],
  approveLeave: ['ceo', 'admin', 'manager'],
  editSalary:   ['ceo', 'admin'],
  manageUsers:  ['ceo', 'admin'],
  viewAuditLogs:['ceo', 'admin'],
};

export const MENU_ITEMS = [
  { key: 'dashboard',        label: 'Dashboard',   icon: '📊', screen: 'Dashboard',       section: 'main' },
  { key: 'clientCompany',    label: 'Client Company',icon: '🏢', screen: 'ClientCompany',   section: 'main' },
  { key: 'tasks',            label: 'Tasks',        icon: '📋', screen: 'Tasks',           section: 'main' },
  { key: 'stock',            label: 'Inventory',    icon: '📦', screen: 'Inventory',       section: 'main' },
  { key: 'products',         label: 'Product Master',icon: '🏷️', screen: 'ProductMaster',   section: 'main' },
  { key: 'dispatch',         label: 'Dispatch',     icon: '🚚', screen: 'Dispatch',        section: 'main' },
  { key: 'finance',          label: 'Finance & P&L',icon: '💵', screen: 'Finance',         section: 'main' },
  { key: 'advanceSalary',    label: 'Advance Salary',icon: '💵', screen: 'AdvanceSalary',  section: 'main' },
  { key: 'attendance',       label: 'Attendance',   icon: '⏱️', screen: 'Attendance',      section: 'main' },
  { key: 'leaveManagement',  label: 'Leave',        icon: '🗓️', screen: 'Leave',           section: 'main' },
  { key: 'reports',          label: 'Reports',      icon: '📈', screen: 'Reports',         section: 'main' },
  { key: 'chat',             label: 'Messages',     icon: '💬', screen: 'Chat',            section: 'main' },
  { key: 'settings',         label: 'Settings',     icon: '⚙️', screen: 'Settings',        section: 'main' },
  { key: 'userManagement',   label: 'Users',        icon: '👥', screen: 'UserManagement',  section: 'admin' },
  { key: 'signupRequests',   label: 'Signup Requests',icon: '📝', screen: 'SignupRequests', section: 'admin' },
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
