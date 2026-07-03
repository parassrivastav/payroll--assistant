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
- `validation`: lightweight request validation for chat questions and related inputs.
- `middleware`: CORS allowlist, rate limiting, auth, and error handling.

## Request Boundaries

Business calculations remain in backend code so they are deterministic and testable. The LLM does not decide salary totals, tax savings, proof status, or month comparison values.

## Production Readiness Additions

- Dockerfiles for backend and frontend.
- `docker-compose.yml` for local container evaluation.
- GitHub Actions CI for backend tests/smoke checks and frontend build.
- Optional OCR worker warmup with `WARM_OCR_ON_STARTUP=true`.
- Paginated payroll history endpoint with short in-memory caching.
