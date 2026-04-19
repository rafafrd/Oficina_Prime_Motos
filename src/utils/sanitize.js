function sanitizeText(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeEmail(value) {
  return sanitizeText(value, 120).toLowerCase();
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

module.exports = {
  sanitizeText,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeBoolean
};
