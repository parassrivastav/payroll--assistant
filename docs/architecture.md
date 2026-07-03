# Architecture

## Components

- React frontend: one-page dashboard for login, payslip upload, salary views, chat, tax simulator, proof checklist, and month comparison.
- Express backend: API layer for auth, salary slip analysis, finance logic, narrator calls, and audit logging.
- SQLite JSON storage: stores extracted payroll analysis payloads locally.
- OpenAI wrapper: used for sanitized payslip extraction and payroll narration only.

## Backend Modules

- `salarySlipAnalyzer`: document text extraction, OCR fallback, PII masking, LLM extraction, and local storage.
- `financeLogic`: payroll summary, deterministic calculations, 80C simulator, proof checklist, and month comparison.
- `llmNarrator`: builds grounded prompts with payroll JSON, calculation JSON, and source references.
- `auth`: simple mock users and fake bearer tokens.
- `audit`: minimal in-memory audit entries.

## Request Boundaries

Business calculations remain in backend code so they are deterministic and testable. The LLM does not decide salary totals, tax savings, proof status, or month comparison values.
