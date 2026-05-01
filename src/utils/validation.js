function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function asText(value) {
  return String(firstValue(value) ?? '').trim();
}

function addError(errors, field, message) {
  errors[field] = message;
}

function requiredText(form, field, label, errors, options = {}) {
  const value = asText(form[field]);
  const min = options.min ?? 1;
  const max = options.max ?? 255;

  if (!value) {
    addError(errors, field, `กรุณากรอก${label}`);
    return '';
  }

  if (value.length < min) {
    addError(errors, field, `${label}ต้องมีอย่างน้อย ${min} ตัวอักษร`);
  }

  if (value.length > max) {
    addError(errors, field, `${label}ต้องไม่เกิน ${max} ตัวอักษร`);
  }

  return value;
}

function optionalText(form, field, max = 1000) {
  const value = asText(form[field]);
  return value.length > max ? value.slice(0, max) : value;
}

function parseNumber(form, field, label, errors, options = {}) {
  const raw = asText(form[field]);
  const min = options.min ?? 0;
  const max = options.max ?? 100000000;

  if (raw === '') {
    addError(errors, field, `กรุณากรอก${label}`);
    return 0;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    addError(errors, field, `${label}ต้องเป็นตัวเลข`);
    return 0;
  }

  if (value < min) {
    addError(errors, field, `${label}ต้องไม่น้อยกว่า ${min}`);
  }

  if (value > max) {
    addError(errors, field, `${label}ต้องไม่เกิน ${max}`);
  }

  return value;
}

function parseMoney(form, field, label, errors, options = {}) {
  return parseNumber(form, field, label, errors, {
    min: options.min ?? 0,
    max: options.max ?? 1000000
  });
}

function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value));
}

function parseMonth(form, field, label, errors) {
  const value = asText(form[field]);
  if (!value) {
    addError(errors, field, `กรุณาเลือก${label}`);
    return '';
  }

  if (!isValidMonth(value)) {
    addError(errors, field, `${label}ไม่ถูกต้อง`);
    return '';
  }

  return value;
}

function validatePassword(password, field, label, errors, min = 6) {
  if (!password) {
    addError(errors, field, `กรุณากรอก${label}`);
    return;
  }

  if (password.length < min) {
    addError(errors, field, `${label}ต้องมีอย่างน้อย ${min} ตัวอักษร`);
  }
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

module.exports = {
  addError,
  asText,
  firstValue,
  hasErrors,
  isValidMonth,
  optionalText,
  parseMoney,
  parseMonth,
  parseNumber,
  requiredText,
  validatePassword
};
