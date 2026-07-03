process.env.SQLITE_DB_PATH = "data/test-payroll-assistant.sqlite";
process.env.OPENAI_API_KEY = "test-key";

const { validateQuestion } = require("../src/services/validation/questionValidator");
const { buildNarrationFallback } = require("../src/services/llmNarrator/narrationFallback");
const { simulateSection80C } = require("../src/services/financeLogic/section80CSimulator");
const { corsOptions } = require("../src/middleware/corsOptions");
const { env } = require("../src/config/env");
const {
  getCachedHistory,
  setCachedHistory,
  clearHistoryCache
} = require("../src/services/financeLogic/payrollHistoryCache");

describe("question validator unit tests", () => {
  test("trims valid question", () => {
    expect(validateQuestion("  Why lower?  ")).toBe("Why lower?");
  });

  test("rejects empty and oversized questions", () => {
    expect(() => validateQuestion("   ")).toThrow("question is required");
    expect(() => validateQuestion("x".repeat(501))).toThrow("500 characters");
  });
});

describe("deterministic narration fallback unit tests", () => {
  test("returns payroll answer with source references", () => {
    const fallback = buildNarrationFallback({
      question: "Why is my net lower?",
      finance: {
        payroll: { net: 80500, gross: 90000, currency: "INR" },
        calculated: { total_deductions: 9500 },
        source_reference: {
          net_pay: { source: "Payslip → Summary → Net Pay" },
          total_deductions: { source: "Calculated → Deductions" }
        }
      }
    });

    expect(fallback.fallback).toBe(true);
    expect(fallback.answer).toContain("₹80,500");
    expect(fallback.answer).toContain("Payslip → Summary → Net Pay");
  });
});

describe("tax simulator unit tests", () => {
  test("clamps negative inputs and preserves disclaimer", () => {
    const result = simulateSection80C({ alreadyDeclared80C: -1, additionalInvestment: -100 });
    expect(result.inputs.already_declared_80c).toBe(0);
    expect(result.result.eligible_extra_80c).toBe(0);
    expect(result.assumptions.disclaimer).toContain("not tax advice");
  });
});

describe("cors and history cache unit tests", () => {
  test("allows configured origin and rejects unknown origin", (done) => {
    const previousOrigins = env.corsAllowedOrigins;
    env.corsAllowedOrigins = ["http://allowed.test"];

    corsOptions.origin("http://allowed.test", (allowedErr, allowed) => {
      expect(allowedErr).toBeNull();
      expect(allowed).toBe(true);

      corsOptions.origin("http://blocked.test", (blockedErr) => {
        expect(blockedErr).toBeInstanceOf(Error);
        env.corsAllowedOrigins = previousOrigins;
        done();
      });
    });
  });

  test("history cache stores and clears values", () => {
    clearHistoryCache();
    setCachedHistory("emp_001:20:0", { items: [{ id: 1 }] });
    expect(getCachedHistory("emp_001:20:0").items[0].id).toBe(1);
    clearHistoryCache();
    expect(getCachedHistory("emp_001:20:0")).toBeNull();
  });
});
