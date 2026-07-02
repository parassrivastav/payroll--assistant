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
    calculated
  };
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

module.exports = { buildPayrollFinancePayload };
