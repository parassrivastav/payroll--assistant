const moneyValueSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    amount: { type: ["number", "null"] },
    currency: { type: ["string", "null"] }
  },
  required: ["amount", "currency"]
};

const payslipSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    doc_type: { type: "string", enum: ["payslip"] },
    date: { type: ["string", "null"], description: "ISO 8601 date, YYYY-MM-DD" },
    pay_period: { type: ["string", "null"] },
    basic: moneyValueSchema,
    hra: moneyValueSchema,
    lta: moneyValueSchema,
    special_allowance: moneyValueSchema,
    provident_fund: moneyValueSchema,
    professional_tax: moneyValueSchema,
    income_tax_tds: moneyValueSchema,
    reimbursements: moneyValueSchema,
    gross_pay: moneyValueSchema,
    net_pay: moneyValueSchema,
    year_to_date: {
      type: "object",
      additionalProperties: false,
      description: "Year-to-date amount/currency objects for salary slip fields.",
      properties: {
        basic: moneyValueSchema,
        hra: moneyValueSchema,
        lta: moneyValueSchema,
        special_allowance: moneyValueSchema,
        provident_fund: moneyValueSchema,
        professional_tax: moneyValueSchema,
        income_tax_tds: moneyValueSchema,
        reimbursements: moneyValueSchema,
        gross_pay: moneyValueSchema,
        net_pay: moneyValueSchema
      },
      required: [
        "basic",
        "hra",
        "lta",
        "special_allowance",
        "provident_fund",
        "professional_tax",
        "income_tax_tds",
        "reimbursements",
        "gross_pay",
        "net_pay"
      ]
    }
  },
  required: [
    "doc_type",
    "date",
    "pay_period",
    "basic",
    "hra",
    "lta",
    "special_allowance",
    "provident_fund",
    "professional_tax",
    "income_tax_tds",
    "reimbursements",
    "gross_pay",
    "net_pay",
    "year_to_date"
  ]
};

module.exports = { payslipSchema };
