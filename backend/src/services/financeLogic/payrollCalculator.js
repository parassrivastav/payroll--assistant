function buildPayrollFinancePayload(analysis) {
  const payroll = {
    month: analysis.pay_period,
    date: analysis.date,
    currency: pickCurrency(analysis),
    basic: amountOf(analysis.basic),
    hra: amountOf(analysis.hra),
    lta: amountOf(analysis.lta),
    special_allowance: amountOf(analysis.special_allowance),
    pf: amountOf(analysis.provident_fund),
    professional_tax: amountOf(analysis.professional_tax),
    tds: amountOf(analysis.income_tax_tds),
    reimbursements: amountOf(analysis.reimbursements),
    gross: amountOf(analysis.gross_pay),
    net: amountOf(analysis.net_pay)
  };

  const calculated = {
    total_earnings_components: sum([
      payroll.basic,
      payroll.hra,
      payroll.lta,
      payroll.special_allowance
    ]),
    total_deductions: sum([
      payroll.pf,
      payroll.professional_tax,
      payroll.tds
    ]),
    total_reimbursements: payroll.reimbursements,
    net_formula: "gross - deductions + reimbursements",
    calculated_net: calculateNet(payroll),
    net_difference: difference(payroll.net, calculateNet(payroll)),
    gross_difference: difference(payroll.gross, sum([
      payroll.basic,
      payroll.hra,
      payroll.lta,
      payroll.special_allowance
    ]))
  };

  return {
    payroll,
    calculated,
    source_reference: buildSourceReference(payroll, calculated, analysis)
  };
}

function buildSourceReference(payroll, calculated, analysis = {}) {
  return {
    month: sourceValue(payroll.month, "Payslip → Header → Pay Period", Boolean(analysis.pay_period)),
    basic_salary: sourceValue(payroll.basic, "Payslip → Earnings → Basic Salary", hasAmount(analysis.basic)),
    hra: sourceValue(payroll.hra, "Payslip → Earnings → HRA", hasAmount(analysis.hra)),
    lta: sourceValue(payroll.lta, "Payslip → Earnings → LTA", hasAmount(analysis.lta)),
    special_allowance: sourceValue(
      payroll.special_allowance,
      "Payslip → Earnings → Special Allowance",
      hasAmount(analysis.special_allowance)
    ),
    reimbursements: sourceValue(
      payroll.reimbursements,
      "Payslip → Earnings → Reimbursements",
      hasAmount(analysis.reimbursements)
    ),
    provident_fund: sourceValue(
      payroll.pf,
      "Payslip → Deductions → Provident Fund",
      hasAmount(analysis.provident_fund)
    ),
    professional_tax: sourceValue(
      payroll.professional_tax,
      "Payslip → Deductions → Professional Tax",
      hasAmount(analysis.professional_tax)
    ),
    income_tax_tds: sourceValue(
      payroll.tds,
      "Payslip → Deductions → Income Tax/TDS",
      hasAmount(analysis.income_tax_tds)
    ),
    gross_pay: sourceValue(payroll.gross, "Payslip → Summary → Gross Pay", hasAmount(analysis.gross_pay)),
    net_pay: sourceValue(payroll.net, "Payslip → Summary → Net Pay", hasAmount(analysis.net_pay)),
    total_deductions: sourceValue(
      calculated.total_deductions,
      "Calculated → Provident Fund + Professional Tax + Income Tax/TDS",
      hasAnyAmount([analysis.provident_fund, analysis.professional_tax, analysis.income_tax_tds])
    ),
    calculated_net_pay: sourceValue(
      calculated.calculated_net,
      "Calculated → Gross Pay - Total Deductions + Reimbursements",
      hasAmount(analysis.gross_pay)
    )
  };
}

function sourceValue(value, source, isAvailable = true) {
  return {
    value,
    source: isAvailable && value !== null && value !== undefined ? source : null
  };
}

function hasAmount(value) {
  return typeof value?.amount === "number";
}

function hasAnyAmount(values) {
  return values.some(hasAmount);
}

function amountOf(value) {
  return typeof value?.amount === "number" ? value.amount : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + amountOrZero(value), 0);
}

function amountOrZero(value) {
  return typeof value === "number" ? value : 0;
}

function calculateNet(payroll) {
  if (typeof payroll.gross !== "number") {
    return null;
  }

  return payroll.gross - sum([
    payroll.pf,
    payroll.professional_tax,
    payroll.tds
  ]) + amountOrZero(payroll.reimbursements);
}

function difference(actual, calculated) {
  if (typeof actual !== "number" || typeof calculated !== "number") {
    return null;
  }

  return actual - calculated;
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

module.exports = { buildPayrollFinancePayload, buildSourceReference };
