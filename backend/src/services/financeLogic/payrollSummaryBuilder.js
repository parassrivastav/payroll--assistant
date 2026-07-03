function buildPayrollSummaryFromRecord(record) {
  const analysis = record.payload?.analysis || {};
  const finance = record.payload?.finance || {};

  return {
    id: record.id,
    documentType: record.documentType,
    createdAt: record.createdAt,
    payroll_json: finance.payroll || {},
    calculated_values: finance.calculated || {},
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
    extraction: record.payload?.extraction || null,
    piiMasking: record.payload?.piiMasking || null,
    llm: record.payload?.llm || null
  };
}

module.exports = { buildPayrollSummaryFromRecord };
