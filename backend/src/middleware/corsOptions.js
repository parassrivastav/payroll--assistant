const { env } = require("../config/env");

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin is not allowed."));
  }
};

module.exports = { corsOptions };
