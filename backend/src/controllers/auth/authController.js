const { login } = require("../../services/auth/mockAuthService");
const { logAudit } = require("../../services/audit/auditLogger");

function loginUser(req, res, next) {
  try {
    const result = login(req.body?.userId);
    logAudit({
      user: result.user,
      employeeId: result.user.employeeId,
      action: "login",
      metadata: { userId: result.user.userId }
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { loginUser };
