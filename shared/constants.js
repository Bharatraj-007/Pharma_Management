// Shared Constants across Web and Mobile
export const ROLES = {
  WORKER: 'worker',
  MANAGER: 'manager',
  ADMIN: 'admin',
  CEO: 'ceo',
};

export const COMPANIES = [
  { value: 'bharath', label: 'Bharath Enterprises' },
  { value: 'shree_ganaapathy', label: 'Shree Ganaapathy Roto Prints' },
  { value: 'vel', label: 'Vel Gravure' },
];

export const COMPANY_NAMES = {
  bharath: 'Bharath Enterprises',
  shree_ganaapathy: 'Shree Ganaapathy Roto Prints',
  vel: 'Vel Gravure',
};

export const DISPATCH_STATUSES = ['Pending', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];

export const FOIL_TYPES = ['blister', 'alualu', 'wrapper', 'pouch', 'laminated', 'roll'];

export const COLOUR_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8];

export const ATTENDANCE_STATUSES = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Late', label: 'Late' },
  { value: 'Half Day', label: 'Half Day' },
  { value: 'OD', label: 'On Duty' },
  { value: 'WFH', label: 'Work From Home' },
];

export const FINANCE_INCOME_CATEGORIES = ['Dispatch Sale', 'Service Revenue', 'Other Income'];

export const FINANCE_EXPENSE_CATEGORIES = [
  'Raw Material',
  'Salaries',
  'Rent',
  'Utilities',
  'Maintenance',
  'Transport',
  'Other Expense',
];
