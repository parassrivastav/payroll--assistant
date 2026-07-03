const MOCK_USERS = {
  emp_001: { userId: "emp_001", employeeId: "emp_001", role: "EMPLOYEE" },
  emp_002: { userId: "emp_002", employeeId: "emp_002", role: "EMPLOYEE" },
  admin_001: { userId: "admin_001", employeeId: null, role: "PAYROLL_ADMIN" }
};

function login(userId) {
  const user = MOCK_USERS[userId];

  if (!user) {
    const err = new Error("Unknown mock user.");
    err.statusCode = 401;
    err.code = "INVALID_LOGIN";
    throw err;
  }

  return {
    token: tokenForUser(user.userId),
    user
  };
}

function authenticateToken(token) {
  const match = /^mock-token-(.+)$/.exec(token || "");
  const user = match ? MOCK_USERS[match[1]] : null;

  if (!user) {
    const err = new Error("Invalid bearer token.");
    err.statusCode = 401;
    err.code = "INVALID_TOKEN";
    throw err;
  }

  return user;
}

function tokenForUser(userId) {
  return `mock-token-${userId}`;
}

function resolveEmployeeAccess(user, requestedEmployeeId) {
  const employeeId = requestedEmployeeId || user.employeeId || null;

  if (user.role === "PAYROLL_ADMIN") {
    return employeeId;
  }

  if (!employeeId || employeeId === user.employeeId) {
    return user.employeeId;
  }

  const err = new Error("You do not have access to this employee's payroll data.");
  err.statusCode = 403;
  err.code = "FORBIDDEN_EMPLOYEE_DATA";
  throw err;
}

module.exports = {
  MOCK_USERS,
  login,
  authenticateToken,
  resolveEmployeeAccess
};
