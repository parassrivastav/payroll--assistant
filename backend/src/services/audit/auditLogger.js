const auditEntries = [];

function logAudit({ user, employeeId, action, metadata = {} }) {
  const entry = {
    timestamp: new Date().toISOString(),
    userId: user?.userId || null,
    role: user?.role || null,
    employeeId: employeeId || null,
    action,
    metadata: sanitizeMetadata(metadata)
  };

  auditEntries.push(entry);
  return entry;
}

function getAuditEntries() {
  return [...auditEntries];
}

function clearAuditEntries() {
  auditEntries.length = 0;
}

function sanitizeMetadata(metadata) {
  const sanitized = {};

  for (const [key, value] of Object.entries(metadata || {})) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes("raw") ||
      normalizedKey.includes("base64") ||
      normalizedKey.includes("pan") ||
      normalizedKey.includes("bank") ||
      normalizedKey.includes("text") ||
      normalizedKey.includes("content")
    ) {
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

module.exports = {
  logAudit,
  getAuditEntries,
  clearAuditEntries
};
