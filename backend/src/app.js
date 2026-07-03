const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/auth/authRoutes");
const salarySlipRoutes = require("./routes/salarySlipAnalyzer/salarySlipRoutes");
const payrollNarratorRoutes = require("./routes/llmNarrator/payrollNarratorRoutes");
const financeLogicRoutes = require("./routes/financeLogic/financeLogicRoutes");
const { corsOptions } = require("./middleware/corsOptions");
const { errorHandler } = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiters");

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/", authRoutes);
app.use("/", salarySlipRoutes);
app.use("/", payrollNarratorRoutes);
app.use("/", financeLogicRoutes);
app.use(errorHandler);

module.exports = app;
