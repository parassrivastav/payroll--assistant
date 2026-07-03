const MOCK_ANALYSIS = {
  doc_type: "payslip",
  pay_period: "June 2026",
  basic: { amount: 50000, currency: "INR" },
  hra: { amount: 20000, currency: "INR" },
  lta: { amount: 0, currency: "INR" },
  special_allowance: { amount: 20000, currency: "INR" },
  reimbursements: { amount: 0, currency: "INR" },
  provident_fund: { amount: 6000, currency: "INR" },
  professional_tax: { amount: 0, currency: "INR" },
  income_tax_tds: { amount: 3500, currency: "INR" },
  gross_pay: { amount: 90000, currency: "INR" },
  net_pay: { amount: 80500, currency: "INR" },
  year_to_date: {
    gross_pay: { amount: 540000, currency: "INR" },
    provident_fund: { amount: 36000, currency: "INR" },
    income_tax_tds: { amount: 21000, currency: "INR" }
  }
};

const MOCK_FINANCE = {
  payroll: {
    month: "June 2026",
    currency: "INR",
    basic: 50000,
    hra: 20000,
    lta: 0,
    special_allowance: 20000,
    reimbursements: 0,
    pf: 6000,
    professional_tax: 0,
    tds: 3500,
    gross: 90000,
    net: 80500
  },
  calculated: {
    total_earnings_components: 90000,
    total_deductions: 9500,
    total_reimbursements: 0,
    net_formula: "gross - deductions + reimbursements",
    calculated_net: 80500,
    net_difference: 0,
    gross_difference: 0
  }
};

function buildPayrollSummaryFromRecord(record) {
  return buildStructuredPayrollSummary({
    id: record.id,
    documentType: record.documentType,
    createdAt: record.createdAt,
    source: "latest_extracted",
    analysis: record.payload?.analysis || {},
    finance: record.payload?.finance || {},
    extraction: record.payload?.extraction || null,
    piiMasking: record.payload?.piiMasking || null,
    llm: record.payload?.llm || null
  });
}

function buildMockPayrollSummary() {
  return buildStructuredPayrollSummary({
    id: null,
    documentType: "payslip",
    createdAt: null,
    source: "mock",
    analysis: MOCK_ANALYSIS,
    finance: MOCK_FINANCE,
    extraction: null,
    piiMasking: null,
    llm: null
  });
}

function buildStructuredPayrollSummary({
  id,
  documentType,
  createdAt,
  source,
  analysis,
  finance,
  extraction,
  piiMasking,
  llm
}) {
  const payroll = finance.payroll || {};
  const calculated = finance.calculated || {};
  const currency = payroll.currency || pickCurrency(analysis);
  const totalEarnings = sum([
    payroll.basic,
    payroll.hra,
    payroll.lta,
    payroll.special_allowance,
    payroll.reimbursements
  ]);
  const totalDeductions = valueOrNumber(calculated.total_deductions, sum([
    payroll.pf,
    payroll.professional_tax,
    payroll.tds
  ]));
  const calculatedNetPay = valueOrNumber(
    calculated.calculated_net,
    valueOrNumber(payroll.gross, totalEarnings - valueOrNumber(payroll.reimbursements, 0)) -
      totalDeductions +
      valueOrNumber(payroll.reimbursements, 0)
  );

  return {
    id,
    source,
    documentType,
    createdAt,
    month: payroll.month || analysis.pay_period || null,
    currency,
    payroll_json: finance.payroll || {},
    calculated_values: {
      ...calculated,
      total_earnings: totalEarnings,
      total_deductions: totalDeductions,
      calculated_net_pay: calculatedNetPay
    },
    summary: {
      month: payroll.month || analysis.pay_period || null,
      basic_salary: money(payroll.basic, currency),
      hra: money(payroll.hra, currency),
      lta: money(payroll.lta, currency),
      special_allowance: money(payroll.special_allowance, currency),
      reimbursements: money(payroll.reimbursements, currency),
      provident_fund: money(payroll.pf, currency),
      professional_tax: money(payroll.professional_tax, currency),
      income_tax_tds: money(payroll.tds, currency),
      gross_pay: money(payroll.gross, currency),
      net_pay: money(payroll.net, currency),
      year_to_date: normalizeYtd(analysis.year_to_date || {}, currency),
      total_earnings: money(totalEarnings, currency),
      total_deductions: money(totalDeductions, currency),
      calculated_net_pay: money(calculatedNetPay, currency),
      validation_warnings: buildValidationWarnings({ payroll, totalEarnings, totalDeductions, calculatedNetPay })
    },
    salary_breakdown: {
      basic: analysis.basic,
      hra: analysis.hra,
      lta: analysis.lta,
      special_allowance: analysis.special_allowance,
      reimbursements: analysis.reimbursements,
      provident_fund: analysis.provident_fund,
      professional_tax: analysis.professional_tax,
      income_tax_tds: analysis.income_tax_tds,
      gross_pay: analysis.gross_pay,
      net_pay: analysis.net_pay
    },
    year_to_date: analysis.year_to_date || {},
    extraction,
    piiMasking,
    llm
  };
}

function normalizeYtd(ytd, currency) {
  return {
    gross_pay: money(ytd.gross_pay?.amount, ytd.gross_pay?.currency || currency),
    provident_fund: money(ytd.provident_fund?.amount, ytd.provident_fund?.currency || currency),
    income_tax_tds: money(ytd.income_tax_tds?.amount, ytd.income_tax_tds?.currency || currency)
  };
}

function buildValidationWarnings({ payroll, totalEarnings, totalDeductions, calculatedNetPay }) {
  const warnings = [];

  if (typeof payroll.gross === "number" && totalEarnings !== payroll.gross) {
    warnings.push(`Gross pay differs from earnings total by ${payroll.gross - totalEarnings}.`);
  }

  if (typeof payroll.net === "number" && calculatedNetPay !== payroll.net) {
    warnings.push(`Net pay differs from calculated net pay by ${payroll.net - calculatedNetPay}.`);
  }

  if (typeof payroll.gross !== "number") {
    warnings.push("Gross pay is missing.");
  }

  if (typeof payroll.net !== "number") {
    warnings.push("Net pay is missing.");
  }

  if (totalDeductions === 0) {
    warnings.push("No deductions were found.");
  }

  return warnings;
}

function money(amount, currency = "INR") {
  return {
    amount: typeof amount === "number" ? amount : null,
    currency: currency || "INR"
  };
}

function sum(values) {
  return values.reduce((total, value) => total + valueOrNumber(value, 0), 0);
}

function valueOrNumber(value, fallback) {
  return typeof value === "number" ? value : fallback;
}

function pickCurrency(analysis) {
  return (
    analysis.net_pay?.currency ||
    analysis.gross_pay?.currency ||
    analysis.basic?.currency ||
    analysis.hra?.currency ||
    "INR"
  );
}

module.exports = {
  buildPayrollSummaryFromRecord,
  buildMockPayrollSummary
};
