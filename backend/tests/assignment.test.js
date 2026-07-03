process.env.SQLITE_DB_PATH = "data/test-payroll-assistant.sqlite";
process.env.OPENAI_API_KEY = "test-key";

jest.mock("../src/services/salarySlipAnalyzer/salarySlipAnalyzer", () => {
  const actual = jest.requireActual("../src/services/salarySlipAnalyzer/salarySlipAnalyzer");

  return {
    ...actual,
    analyzePayslipText: jest.fn(async () => ({
      analysis: {
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
        year_to_date: {}
      },
      model: "test-model",
      usage: null,
      request: { messages: [] }
    }))
  };
});

jest.mock("../src/services/llmNarrator/payrollNarrator", () => {
  const actual = jest.requireActual("../src/services/llmNarrator/payrollNarrator");

  return {
    ...actual,
    narratePayroll: jest.fn(async () => ({
      narration: {
        answer: "Net pay is available.\n\nSource:\nPayslip -> Summary -> Net Pay"
      },
      usage: null,
      model: "test-model"
    }))
  };
});

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const { saveSalarySlipAnalysis } = require("../src/services/salarySlipAnalyzer/salarySlipAnalysisRepository");
const { buildPayrollFinancePayload } = require("../src/services/financeLogic/payrollCalculator");
const { buildPayrollSummaryFromRecord } = require("../src/services/financeLogic/payrollSummaryBuilder");
const { getAuditEntries, clearAuditEntries } = require("../src/services/audit/auditLogger");
const { queryCompanyWrapper } = require("../src/services/llm/companyLlmWrapperClient");
const { env } = require("../src/config/env");

const emp1Token = "Bearer mock-token-emp_001";
const emp2Token = "Bearer mock-token-emp_002";
const adminToken = "Bearer mock-token-admin_001";

beforeAll(() => {
  const dbBase = path.join(__dirname, "../data/test-payroll-assistant.sqlite");
  for (const suffix of ["", "-shm", "-wal"]) {
    fs.rmSync(`${dbBase}${suffix}`, { force: true });
  }
});

beforeEach(() => {
  clearAuditEntries();
});

function createRecord(employeeId = "emp_001", overrides = {}) {
  const analysis = {
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
    year_to_date: {},
    ...overrides
  };

  return saveSalarySlipAnalysis({
    employeeId,
    analysis,
    finance: buildPayrollFinancePayload(analysis),
    extraction: { method: "test", extractedCharacterCount: 20 },
    piiMasking: { redactions: {}, sanitizedCharacterCount: 20 },
    llm: { model: "test", usage: null }
  });
}

describe("authentication and ownership", () => {
  test("login returns fake bearer token and creates audit entry", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ userId: "emp_001" });
    expect(response.status).toBe(200);
    expect(response.body.token).toBe("mock-token-emp_001");
    expect(getAuditEntries().some((entry) => entry.action === "login")).toBe(true);
  });

  test("protected endpoint rejects missing token", async () => {
    const response = await request(app).get("/payroll/summary");
    expect(response.status).toBe(401);
  });

  test("invalid token is rejected", async () => {
    const response = await request(app)
      .get("/payroll/summary")
      .set("Authorization", "Bearer nope");
    expect(response.status).toBe(401);
  });

  test("employee can access own payroll", async () => {
    const record = createRecord("emp_001");
    const response = await request(app)
      .get(`/payroll/${record.id}/summary`)
      .set("Authorization", emp1Token);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(record.id);
  });

  test("employee cannot access another employee payroll", async () => {
    const record = createRecord("emp_002");
    const response = await request(app)
      .get(`/payroll/${record.id}/summary`)
      .set("Authorization", emp1Token);
    expect(response.status).toBe(403);
  });

  test("employee cannot upload payslip for another employee", async () => {
    const response = await request(app)
      .post("/upload-doc/salary-slip")
      .set("Authorization", emp1Token)
      .send({ employeeId: "emp_002", text: "Gross Pay 90000 Net Pay 80500 PAN ABCDE1234F" });
    expect(response.status).toBe(403);
  });

  test("admin can access employee summary", async () => {
    const record = createRecord("emp_002");
    const response = await request(app)
      .get(`/payroll/${record.id}/summary`)
      .set("Authorization", adminToken);
    expect(response.status).toBe(200);
  });
});

describe("payslip and extraction validation", () => {
  test("missing payroll fields are reported in validation warnings", () => {
    const analysis = {
      doc_type: "payslip",
      pay_period: "June 2026",
      gross_pay: { amount: 100000, currency: "INR" },
      net_pay: { amount: 100000, currency: "INR" }
    };
    const record = {
      id: 1,
      documentType: "payslip",
      createdAt: new Date().toISOString(),
      payload: { analysis, finance: buildPayrollFinancePayload(analysis) }
    };
    const summary = buildPayrollSummaryFromRecord(record);
    expect(summary.summary.validation_warnings.join(" ")).toContain("Basic Salary is missing");
  });

  test("inconsistent extraction output does not crash", () => {
    const analysis = { doc_type: "payslip", pay_period: "OCR noise ###" };
    const record = {
      id: 2,
      documentType: "payslip",
      createdAt: new Date().toISOString(),
      payload: { analysis, finance: buildPayrollFinancePayload(analysis) }
    };
    expect(() => buildPayrollSummaryFromRecord(record)).not.toThrow();
  });

  test("gross/net mismatch creates validation warning", () => {
    const analysis = {
      doc_type: "payslip",
      pay_period: "June 2026",
      gross_pay: { amount: 100000, currency: "INR" },
      net_pay: { amount: 50000, currency: "INR" },
      income_tax_tds: { amount: 1000, currency: "INR" }
    };
    const record = {
      id: 3,
      documentType: "payslip",
      createdAt: new Date().toISOString(),
      payload: { analysis, finance: buildPayrollFinancePayload(analysis) }
    };
    const summary = buildPayrollSummaryFromRecord(record);
    expect(summary.summary.validation_warnings.join(" ")).toContain("Net pay differs");
  });
});

describe("tax assumptions", () => {
  test("80C simulation respects limit and remaining declared amount", async () => {
    const response = await request(app)
      .post("/tax/80c/simulate")
      .set("Authorization", emp1Token)
      .send({ alreadyDeclared80C: 120000, additionalInvestment: 50000 });
    expect(response.status).toBe(200);
    expect(response.body.result.eligible_extra_80c).toBe(30000);
    expect(response.body.result.estimated_tax_saving).toBe(6000);
    expect(response.body.assumptions.disclaimer).toContain("not tax advice");
  });

  test("negative input is handled safely", async () => {
    const response = await request(app)
      .post("/tax/80c/simulate")
      .set("Authorization", emp1Token)
      .send({ alreadyDeclared80C: -100, additionalInvestment: -500 });
    expect(response.status).toBe(200);
    expect(response.body.inputs.already_declared_80c).toBe(0);
    expect(response.body.inputs.additional_80c_investment).toBe(0);
  });
});

describe("audit logging", () => {
  test("upload, chat, and summary actions create audit entries without raw PII", async () => {
    const upload = await request(app)
      .post("/upload-doc/salary-slip")
      .set("Authorization", emp1Token)
      .send({ text: "PAN ABCDE1234F bank account 123 base64 AAA Gross Pay 90000 Net Pay 80500" });
    expect(upload.status).toBe(200);

    await request(app)
      .get(`/payroll/${upload.body.id}/summary`)
      .set("Authorization", emp1Token);

    await request(app)
      .post(`/payroll/${upload.body.id}/narrate`)
      .set("Authorization", emp1Token)
      .send({ question: "Why is my net lower?" });

    const entries = getAuditEntries();
    expect(entries.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(["payslip_upload", "payroll_summary_view", "chat_query"])
    );
    expect(JSON.stringify(entries)).not.toContain("ABCDE1234F");
    expect(JSON.stringify(entries)).not.toContain("base64");
    expect(JSON.stringify(entries)).not.toContain("bank account");
    expect(JSON.stringify(entries)).not.toContain("Gross Pay 90000");
  });

  test("proof checklist view creates audit entry", async () => {
    const response = await request(app)
      .get("/investment-proofs/checklist")
      .set("Authorization", emp2Token);
    expect(response.status).toBe(200);
    expect(getAuditEntries().some((entry) => entry.action === "proof_checklist_view")).toBe(true);
  });
});

describe("llm provider switch", () => {
  test("company wrapper reports missing token clearly", async () => {
    const previousToken = env.llmWrapperApiToken;
    env.llmWrapperApiToken = "";

    await expect(queryCompanyWrapper({
      prompt: "Hello",
      metadata: { flow: "payroll-narration" }
    })).rejects.toMatchObject({
      code: "LLM_WRAPPER_TOKEN_MISSING"
    });

    env.llmWrapperApiToken = previousToken;
  });
});
