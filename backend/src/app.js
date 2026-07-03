const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const salarySlipRoutes = require("./routes/salarySlipAnalyzer/salarySlipRoutes");
const payrollNarratorRoutes = require("./routes/llmNarrator/payrollNarratorRoutes");
const financeLogicRoutes = require("./routes/financeLogic/financeLogicRoutes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/", salarySlipRoutes);
app.use("/", payrollNarratorRoutes);
app.use("/", financeLogicRoutes);
app.use(errorHandler);

module.exports = app;
