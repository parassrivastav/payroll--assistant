const SECTION_80C_LIMIT = 150000;
const ASSUMED_TAX_RATE = 0.2;

function simulateSection80C({ additionalInvestment = 0, alreadyDeclared80C = 0 }) {
  const declared = normalizeAmount(alreadyDeclared80C);
  const additional = normalizeAmount(additionalInvestment);
  const remainingLimit = Math.max(SECTION_80C_LIMIT - declared, 0);
  const eligibleExtra80C = Math.min(additional, remainingLimit);
  const estimatedTaxSaving = Math.round(eligibleExtra80C * ASSUMED_TAX_RATE);

  return {
    inputs: {
      additional_80c_investment: additional,
      already_declared_80c: declared
    },
    assumptions: {
      section_80c_limit: SECTION_80C_LIMIT,
      assumed_tax_rate_percent: ASSUMED_TAX_RATE * 100,
      disclaimer: "This is a simplified assumption for demo purposes, not tax advice."
    },
    result: {
      remaining_80c_limit: remainingLimit,
      eligible_extra_80c: eligibleExtra80C,
      estimated_tax_saving: estimatedTaxSaving
    },
    explanation: [
      `Section 80C limit assumed: INR ${SECTION_80C_LIMIT}.`,
      `Already declared 80C: INR ${declared}.`,
      `Remaining eligible limit: INR ${remainingLimit}.`,
      `Additional investment considered: INR ${additional}.`,
      `Eligible extra 80C is the lower of additional investment and remaining limit: INR ${eligibleExtra80C}.`,
      `Estimated tax saving at 20%: INR ${estimatedTaxSaving}.`
    ]
  };
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount);
}

module.exports = {
  SECTION_80C_LIMIT,
  ASSUMED_TAX_RATE,
  simulateSection80C
};
