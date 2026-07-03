const { authenticateToken, resolveEmployeeAccess } = require("../services/auth/mockAuthService");

function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = /^Bearer\s+(.+)$/i.exec(header);

    if (!match) {
      const err = new Error("Authorization bearer token is required.");
      err.statusCode = 401;
      err.code = "AUTH_REQUIRED";
      throw err;
    }

    req.user = authenticateToken(match[1]);
    next();
  } catch (err) {
    next(err);
  }
}

function resolveRequestEmployee(req) {
  return resolveEmployeeAccess(
    req.user,
    req.body?.employeeId || req.query?.employeeId || req.params?.employeeId
  );
}

module.exports = {
  requireAuth,
  resolveRequestEmployee
};
