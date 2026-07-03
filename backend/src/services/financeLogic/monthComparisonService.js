const { buildPayrollSummaryFromRecord } = require("./payrollSummaryBuilder");

const MOCK_PREVIOUS_PAYROLL = {
  month: "May 2026",
  currency: "INR",
  gross: 95000,
  net: 83500,
  tds: 2500,
  pf: 6000,
  reimbursements: 3000
};

const MOCK_CURRENT_PAYROLL = {
  month: "June 2026",
  currency: "INR",
  gross: 92000,
  net: 79500,
  tds: 3500,
  pf: 6000,
  reimbursements: 0
};

const COMPARISON_FIELDS = [
  { key: "gross_pay", label: "Gross pay", payrollKey: "gross" },
  { key: "net_pay", label: "Net pay", payrollKey: "net" },
  { key: "income_tax_tds", label: "Income tax/TDS", payrollKey: "tds" },
  { key: "pf", label: "PF", payrollKey: "pf" },
  { key: "reimbursements", label: "Reimbursements", payrollKey: "reimbursements" },
  { key: "total_deductions", label: "Total deductions", payrollKey: "total_deductions" }
];

function buildMonthComparison(records = []) {
  const [current, previous] = records.length >= 2
    ? [
        payrollFromSummary(buildPayrollSummaryFromRecord(records[0])),
        payrollFromSummary(buildPayrollSummaryFromRecord(records[1]))
      ]
    : [
        withCalculatedDeductions(MOCK_CURRENT_PAYROLL),
        withCalculatedDeductions(MOCK_PREVIOUS_PAYROLL)
      ];

  const fields = COMPARISON_FIELDS.map((field) => {
    const currentAmount = numberOrZero(current[field.payrollKey]);
    const previousAmount = numberOrZero(previous[field.payrollKey]);

    return {
      key: field.key,
      label: field.label,
      previous: money(previousAmount, previous.currency),
      current: money(currentAmount, current.currency),
      difference: money(currentAmount - previousAmount, current.currency)
    };
  });

  return {
    source: records.length >= 2 ? "historical_uploaded" : "mock",
    current_month: current.month,
    previous_month: previous.month,
    currency: current.currency || previous.currency || "INR",
    differences: Object.fromEntries(fields.map((field) => [field.key, field])),
    fields,
    explanation: buildExplanation(fields)
  };
}

function payrollFromSummary(summary) {
  const payroll = summary.payroll_json || {};
  const calculated = summary.calculated_values || {};

  return withCalculatedDeductions({
    month: summary.month || payroll.month,
    currency: summary.currency || payroll.currency || "INR",
    gross: payroll.gross,
    net: payroll.net,
    tds: payroll.tds,
    pf: payroll.pf,
    reimbursements: payroll.reimbursements,
    total_deductions: calculated.total_deductions
  });
}

function withCalculatedDeductions(payroll) {
  return {
    ...payroll,
    currency: payroll.currency || "INR",
    total_deductions: typeof payroll.total_deductions === "number"
      ? payroll.total_deductions
      : sum([payroll.tds, payroll.pf, payroll.professional_tax])
  };
}

function buildExplanation(fields) {
  const explanations = fields.map((field) => explainField(field)).filter(Boolean);
  const netPay = fields.find((field) => field.key === "net_pay");

  if (netPay?.difference.amount < 0) {
    explanations.push("These changes contributed to the lower net salary.");
  } else if (netPay?.difference.amount > 0) {
    explanations.push("These changes contributed to the higher net salary.");
  } else {
    explanations.push("Net salary stayed the same between these months.");
  }

  return explanations;
}

function explainField(field) {
  const difference = field.difference.amount;
  if (difference === 0) {
    return `${field.label} stayed the same.`;
  }

  const direction = difference > 0 ? "increased" : "decreased";
  return `${field.label} ${direction} by ${formatMoney(Math.abs(difference), field.difference.currency)}.`;
}

function money(amount, currency = "INR") {
  return {
    amount,
    currency: currency || "INR"
  };
}

function sum(values) {
  return values.reduce((total, value) => total + numberOrZero(value), 0);
}

function numberOrZero(value) {
  return typeof value === "number" ? value : 0;
}

function formatMoney(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

module.exports = { buildMonthComparison };
