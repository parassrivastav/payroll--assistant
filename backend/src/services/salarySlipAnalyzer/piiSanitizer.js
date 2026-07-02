const RULES = [
  {
    type: "person_name",
    pattern: /\b(?:employee\s+name|name)\s*[:#-]?\s*[A-Z][A-Za-z.' -]{1,80}\b/gi,
    replacement: "Employee Name: [REDACTED_PERSON_NAME]"
  },
  {
    type: "person_name",
    pattern: /^\s*:\s*[A-Z][A-Za-z.' -]{1,80}\s*$/gm,
    replacement: ": [REDACTED_PERSON_NAME]"
  },
  {
    type: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED_EMAIL]"
  },
  {
    type: "pf_account",
    pattern: /\b(?:PF\.?\s*(?:(?:A\/C|Account)(?:\s*(?:Number|No\.?))?|No\.?|Number)|P\.F\.?\s*(?:No\.?|Number))\s*[:#.-]?\s*[A-Z0-9/.-]{6,}\b/gi,
    replacement: "PF Account: [REDACTED_PF_ACCOUNT]"
  },
  {
    type: "pf_account",
    pattern: /\b[A-Z]{2}\/[A-Z]{3}\/\d{6,}\/\d{2}[A-Z]\/\d{6,}\b/g,
    replacement: "[REDACTED_PF_ACCOUNT]"
  },
  {
    type: "esi_account",
    pattern: /\b(?:ESI\s*(?:No\.?|Number|Account(?:\s*(?:Number|No\.?))?)|ESIC\s*(?:No\.?|Number))\s*[:#.-]?\s*[A-Z0-9/.-]{6,}\b/gi,
    replacement: "ESI Account: [REDACTED_ESI_ACCOUNT]"
  },
  {
    type: "phone",
    pattern: /(?:\+?91[-.\s]?)?(?:\b[6-9]\d{9}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/g,
    replacement: "[REDACTED_PHONE]"
  },
  {
    type: "date_of_birth",
    pattern: /\b(?:DOB|Date of Birth)\s*[:#-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi,
    replacement: "DOB: [REDACTED_DOB]"
  },
  {
    type: "uan",
    pattern: /\b(?:UAN(?:\s+Number)?|Universal Account Number)\s*[:#-]?\s*\d{12}\b/gi,
    replacement: "UAN: [REDACTED_UAN]"
  },
  {
    type: "pan",
    pattern: /\bPAN(?:\s+Number)?\s*[:#-]?\s*[A-Z]{5}\d{4}[A-Z]\b/gi,
    replacement: "PAN: [REDACTED_PAN]"
  },
  {
    type: "pan",
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    replacement: "[REDACTED_PAN]"
  },
  {
    type: "ifsc",
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    replacement: "[REDACTED_IFSC]"
  },
  {
    type: "aadhaar",
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[REDACTED_AADHAAR]"
  },
  {
    type: "bank_account",
    pattern: /\b(?:account|acct|a\/c)\s*(?:number|no\.?|#)?\s*[:#-]?\s*\d{8,18}\b/gi,
    replacement: "Account Number: [REDACTED_BANK_ACCOUNT]"
  },
  {
    type: "employee_id",
    pattern: /\b(?:employee|emp)\s*(?:id|code|no\.?|number)\s*[:#-]?\s*[A-Z0-9/-]{1,}\b/gi,
    replacement: "Employee ID: [REDACTED_EMPLOYEE_ID]"
  },
  {
    type: "employee_id",
    pattern: /^\s*©\s*\d{3,12}\s*$/gm,
    replacement: "[REDACTED_EMPLOYEE_ID]"
  },
  {
    type: "address",
    pattern: /\b(?:address|residential address|current location|location)\s*[:#-]?\s*.+(?:\n\s*.+){0,2}/gi,
    replacement: "Address: [REDACTED_ADDRESS]"
  }
];

function maskPii(input) {
  let text = input;
  const redactions = {};

  for (const rule of RULES) {
    text = text.replace(rule.pattern, (match) => {
      redactions[rule.type] = (redactions[rule.type] || 0) + 1;
      return rule.replacement;
    });
  }

  return {
    text,
    redactions
  };
}

module.exports = { maskPii };
