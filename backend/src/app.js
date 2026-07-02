const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const salarySlipRoutes = require("./routes/salarySlipRoutes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/", salarySlipRoutes);
app.use(errorHandler);

module.exports = app;
