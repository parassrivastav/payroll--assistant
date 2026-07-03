const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

function createLimiter(max, message) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message,
        code: "RATE_LIMITED"
      }
    }
  });
}

const generalLimiter = createLimiter(env.rateLimitMax, "Too many requests. Please try again shortly.");
const authLimiter = createLimiter(env.authRateLimitMax, "Too many login attempts. Please try again shortly.");
const uploadLimiter = createLimiter(env.uploadRateLimitMax, "Too many upload attempts. Please try again shortly.");
const chatLimiter = createLimiter(env.chatRateLimitMax, "Too many chat requests. Please try again shortly.");

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  chatLimiter
};
