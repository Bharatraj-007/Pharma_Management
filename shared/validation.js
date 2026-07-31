// Shared Validation Rules across Web and Mobile

export const isValidEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const isValidPhone = (phone) => {
  if (!phone) return true; // optional
  const re = /^[0-9+\-\s]{8,15}$/;
  return re.test(String(phone));
};

export const isPositiveNumber = (val) => {
  const num = Number(val);
  return !isNaN(num) && num > 0;
};
