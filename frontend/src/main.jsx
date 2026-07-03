import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  Calculator,
  CheckCircle2,
  FileImage,
  FileText,
  Image,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Upload,
  User,
  X,
  XCircle
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function createInitialMessages(userId = "emp_001") {
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      type: "text",
      content: `Logged in as ${userId}. Upload a salary slip, then ask me anything about your payroll.`
    }
  ];
}

function App() {
  const [messages, setMessages] = useState(() => createInitialMessages());
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("emp_001");
  const [auth, setAuth] = useState(null);
  const [analysisState, setAnalysisState] = useState(null);
  const [summary, setSummary] = useState(null);
  const [monthComparison, setMonthComparison] = useState(null);
  const [proofChecklist, setProofChecklist] = useState(null);
  const [taxInputs, setTaxInputs] = useState({ alreadyDeclared80C: 80000, additionalInvestment: 50000 });
  const [taxResult, setTaxResult] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loginAs("emp_001");
  }, []);

  useEffect(() => {
    if (!auth?.token) return;
    loadLatestPayrollSummary();
    loadMonthComparison();
    loadProofChecklist();
  }, [auth?.token]);

  const canSend = useMemo(() => {
    return !isBusy && (Boolean(file) || input.trim().length > 0);
  }, [file, input, isBusy]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSend) return;

    const question = input.trim();
    const selectedFile = file;

    setInput("");
    setFile(null);

    if (selectedFile) {
      await analyzeSlipAndMaybeAsk(selectedFile, question);
      return;
    }

    await askFollowUp(question);
  }

  async function loginAs(userId = selectedUserId) {
    setStatus("Logging in");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const payload = await parseJsonResponse(response);
      setSelectedUserId(userId);
      resetUserScopedState(userId);
      setAuth(payload);
      setStatus("Ready");
    } catch (error) {
      appendError(error);
      setStatus("Login required");
    }
  }

  async function analyzeSlipAndMaybeAsk(selectedFile, question) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        type: "upload",
        content: question || "Analyze this salary slip.",
        fileName: selectedFile.name
      }
    ]);
    setIsBusy(true);
    setStatus("Analyzing salary slip");

    try {
      const formData = new FormData();
      formData.append("salarySlip", selectedFile);

      const response = await fetch(`${API_BASE_URL}/upload-doc/salary-slip`, {
        method: "POST",
        headers: authHeaders(auth),
        body: formData
      });

      const payload = await parseJsonResponse(response);
      const nextState = {
        id: payload.id,
        finance: payload.finance,
        analysis: payload.analysis,
        extraction: payload.extraction,
        storage: payload.storage
      };
      setAnalysisState(nextState);
      setSummary(await fetchPayrollSummary(payload.id, payload));
      await loadMonthComparison();

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "analysis",
          content: "I analyzed the salary slip and prepared the payroll dashboard.",
          data: payload
        }
      ]);

      if (question) {
        await askFollowUp(question, {
          explicitId: payload.id,
          explicitFinance: payload.finance,
          skipUserMessage: true
        });
      }
    } catch (error) {
      appendError(error);
    } finally {
      setIsBusy(false);
      setStatus("Ready");
    }
  }

  async function fetchPayrollSummary(id, fallbackPayload) {
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${id}/summary`, {
        headers: authHeaders(auth)
      });
      return await parseJsonResponse(response);
    } catch (_error) {
      return fallbackPayload
        ? {
            id: fallbackPayload.id,
            payroll_json: fallbackPayload.finance?.payroll,
            calculated_values: fallbackPayload.finance?.calculated,
            source_reference_json: fallbackPayload.finance?.source_reference,
            salary_breakdown: fallbackPayload.analysis,
            year_to_date: fallbackPayload.analysis?.year_to_date,
            extraction: fallbackPayload.extraction
          }
        : null;
    }
  }

  async function loadLatestPayrollSummary() {
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/summary`, {
        headers: authHeaders(auth)
      });
      const payload = await parseJsonResponse(response);
      setSummary(payload);

      if (payload.source === "latest_extracted" && payload.id) {
        setAnalysisState({
          id: payload.id,
          finance: {
            payroll: payload.payroll_json,
            calculated: payload.calculated_values,
            source_reference: payload.source_reference_json
          },
          analysis: payload.salary_breakdown,
          extraction: payload.extraction
        });
      } else {
        setAnalysisState(null);
      }
    } catch (_error) {
      setSummary(null);
      setAnalysisState(null);
    }
  }

  async function loadProofChecklist() {
    try {
      const response = await fetch(`${API_BASE_URL}/investment-proofs/checklist`, {
        headers: authHeaders(auth)
      });
      setProofChecklist(await parseJsonResponse(response));
    } catch (error) {
      setProofChecklist({
        items: [],
        summary: { missing_proof_summary: error.message, missing_count: 0, submitted_count: 0 }
      });
    }
  }

  async function loadMonthComparison() {
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/month-comparison`, {
        headers: authHeaders(auth)
      });
      setMonthComparison(await parseJsonResponse(response));
    } catch (_error) {
      setMonthComparison(null);
    }
  }

  async function runTaxSimulation(event) {
    event.preventDefault();
    setStatus("Running 80C simulator");

    try {
      const response = await fetch(`${API_BASE_URL}/tax/80c/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(auth) },
        body: JSON.stringify({
          alreadyDeclared80C: taxInputs.alreadyDeclared80C,
          additionalInvestment: taxInputs.additionalInvestment
        })
      });
      setTaxResult(await parseJsonResponse(response));
    } catch (error) {
      appendError(error);
    } finally {
      setStatus("Ready");
    }
  }

  async function askFollowUp(
    question,
    {
      explicitId = analysisState?.id,
      explicitFinance = analysisState?.finance,
      skipUserMessage = false
    } = {}
  ) {
    if (!question) return;

    if (!explicitId && !explicitFinance) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "text",
          content: "Please upload a salary slip first so I have payroll data to answer from."
        }
      ]);
      return;
    }

    if (!skipUserMessage) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          type: "text",
          content: question
        }
      ]);
    }

    setIsBusy(true);
    setStatus("Asking payroll assistant");

    try {
      const history = buildHistory();
      const endpoint = explicitId
        ? `${API_BASE_URL}/payroll/${explicitId}/narrate`
        : `${API_BASE_URL}/payroll/narrate`;
      const body = explicitId
        ? { question, history }
        : { finance: explicitFinance, question, history };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(auth) },
        body: JSON.stringify(body)
      });

      const payload = await parseJsonResponse(response);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "text",
          content: payload.answer
        }
      ]);
    } catch (error) {
      appendError(error);
    } finally {
      setIsBusy(false);
      setStatus("Ready");
    }
  }

  function buildHistory() {
    return messages
      .filter((message) => message.type === "text" && message.content)
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content
      }));
  }

  function appendError(error) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error",
        content: error.message || "Something went wrong."
      }
    ]);
  }

  function resetUserScopedState(userId) {
    setMessages(createInitialMessages(userId));
    setInput("");
    setFile(null);
    setAnalysisState(null);
    setSummary(null);
    setMonthComparison(null);
    setProofChecklist(null);
    setTaxResult(null);
  }

  const finance = {
    payroll: summary?.payroll_json || analysisState?.finance?.payroll,
    calculated: summary?.calculated_values || analysisState?.finance?.calculated,
    source_reference: summary?.source_reference_json || analysisState?.finance?.source_reference
  };

  return (
    <main className="app-shell">
      <section className="dashboard">
        <header className="topbar">
          <div className="brand-row">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <h1>Payroll Assistant</h1>
              <p>{status}</p>
            </div>
          </div>
          <form className="login-strip" onSubmit={(event) => {
            event.preventDefault();
            loginAs(selectedUserId);
          }}>
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="emp_001">emp_001</option>
              <option value="emp_002">emp_002</option>
              <option value="admin_001">admin_001</option>
            </select>
            <button type="submit" className="secondary-button">Login</button>
            <span>{auth?.user ? `${auth.user.role}` : "Not signed in"}</span>
          </form>
          <div className="status-pill">
            {isBusy ? <Loader2 className="spin" size={15} /> : <Bot size={15} />}
            <span>{isBusy ? "Working" : "Online"}</span>
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="left-stack">
            <SalaryCards finance={finance} />
            <SalaryBreakdown summary={summary} finance={finance} />
            <MonthComparison comparison={monthComparison} />
            <TaxSimulator
              taxInputs={taxInputs}
              setTaxInputs={setTaxInputs}
              taxResult={taxResult}
              runTaxSimulation={runTaxSimulation}
            />
            <ProofChecklist proofChecklist={proofChecklist} />
          </div>

          <section className="chat-panel">
            <div className="chat-header">
              <div>
                <h2>AI Payroll Chat</h2>
                <p>
                  {analysisState?.id
                    ? `Using saved analysis #${analysisState.id}`
                    : "Upload a salary slip to begin"}
                </p>
              </div>
              <Upload size={20} />
            </div>

            <div className="messages" aria-live="polite">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isBusy && (
                <div className="message assistant">
                  <div className="avatar"><Bot size={16} /></div>
                  <div className="bubble typing">
                    <Loader2 className="spin" size={16} />
                    <span>Thinking through payroll numbers</span>
                  </div>
                </div>
              )}
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              {file && (
                <div className="attachment-chip">
                  {file.type.startsWith("image/") ? <Image size={15} /> : <FileText size={15} />}
                  <span>{file.name}</span>
                  <button type="button" aria-label="Remove attachment" onClick={() => setFile(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="composer-row">
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Attach salary slip"
                  title="Attach salary slip"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={19} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Attach image"
                  title="Attach image"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage size={19} />
                </button>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask payroll question"
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSubmit(event);
                    }
                  }}
                />
                <button className="send-button" type="submit" disabled={!canSend} aria-label="Send">
                  {isBusy ? <Loader2 className="spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}

function SalaryCards({ finance }) {
  const payroll = finance?.payroll || {};
  const calculated = finance?.calculated || {};
  const cards = [
    ["Gross pay", formatMoney(payroll.gross, payroll.currency)],
    ["Net pay", formatMoney(payroll.net, payroll.currency)],
    ["Total earnings", formatMoney(calculated.total_earnings, payroll.currency)],
    ["Total deductions", formatMoney(calculated.total_deductions, payroll.currency)]
  ];

  return (
    <section className="panel">
      <PanelTitle title="Salary Summary" subtitle={payroll.month || "Upload a payslip to populate values"} />
      <div className="value-grid">
        {cards.map(([label, value]) => (
          <div className="value-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function SalaryBreakdown({ summary, finance }) {
  const payroll = finance?.payroll || {};
  const calculated = finance?.calculated || {};
  const structured = summary?.summary || {};
  const earningsRows = [
    ["Basic salary", payroll.basic],
    ["HRA", payroll.hra],
    ["LTA", payroll.lta],
    ["Special allowance", payroll.special_allowance],
    ["Reimbursements", payroll.reimbursements]
  ];
  const deductionRows = [
    ["PF", payroll.pf],
    ["Professional tax", payroll.professional_tax],
    ["Income tax/TDS", payroll.tds]
  ];
  const ytdRows = [
    ["Gross pay", structured.year_to_date?.gross_pay],
    ["PF", structured.year_to_date?.provident_fund],
    ["Income tax/TDS", structured.year_to_date?.income_tax_tds]
  ];
  const validationWarnings = structured.validation_warnings || [];

  return (
    <section className="panel">
      <PanelTitle
        title="Salary Breakdown"
        subtitle={summary?.extraction?.method ? `Extracted via ${summary.extraction.method}` : "Waiting for payslip"}
      />
      <BreakdownTable title="Earnings" rows={earningsRows} currency={payroll.currency} />
      <BreakdownTable title="Deductions" rows={deductionRows} currency={payroll.currency} />
      <div className="calculated-line">
        <span>Calculated Net Pay</span>
        <strong>{formatMoney(calculated.calculated_net_pay ?? calculated.calculated_net, payroll.currency)}</strong>
      </div>
      <div className="ytd-block">
        <h3>Year-to-Date</h3>
        <div className="ytd-grid">
          {ytdRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{formatMoney(value?.amount, value?.currency || payroll.currency)}</strong>
            </div>
          ))}
        </div>
      </div>
      {validationWarnings.length > 0 && (
        <div className="warning-list">
          <h3>Validation Warnings</h3>
          {validationWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}

function BreakdownTable({ title, rows, currency }) {
  return (
    <div className="breakdown-group">
      <h3>{title}</h3>
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{formatMoney(value, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthComparison({ comparison }) {
  const rows = comparison?.fields?.filter((field) => (
    ["gross_pay", "net_pay", "income_tax_tds", "pf", "reimbursements"].includes(field.key)
  )) || [];

  return (
    <section className="panel">
      <PanelTitle
        title="Month Comparison"
        subtitle={comparison
          ? `${comparison.previous_month} to ${comparison.current_month}`
          : "Comparing current and previous month"}
      />
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Previous</th>
            <th>Current</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((field) => (
            <tr key={field.key}>
              <th>{field.label === "Income tax/TDS" ? "TDS" : field.label}</th>
              <td>{formatMoney(field.previous?.amount, field.previous?.currency)}</td>
              <td>{formatMoney(field.current?.amount, field.current?.currency)}</td>
              <td className={field.difference.amount < 0 ? "negative" : field.difference.amount > 0 ? "positive" : ""}>
                {formatSignedMoney(field.difference?.amount, field.difference?.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {comparison?.explanation?.length > 0 && (
        <ul className="comparison-explanation">
          {comparison.explanation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaxSimulator({ taxInputs, setTaxInputs, taxResult, runTaxSimulation }) {
  return (
    <section className="panel">
      <PanelTitle title="80C Tax-Saving Simulator" subtitle="Simplified assumption, not tax advice" />
      <form className="tax-form" onSubmit={runTaxSimulation}>
        <label>
          Already declared 80C
          <input
            type="number"
            min="0"
            value={taxInputs.alreadyDeclared80C}
            onChange={(event) => setTaxInputs((current) => ({ ...current, alreadyDeclared80C: event.target.value }))}
          />
        </label>
        <label>
          Additional 80C investment
          <input
            type="number"
            min="0"
            value={taxInputs.additionalInvestment}
            onChange={(event) => setTaxInputs((current) => ({ ...current, additionalInvestment: event.target.value }))}
          />
        </label>
        <button type="submit" className="secondary-button">
          <Calculator size={16} />
          Run simulator
        </button>
      </form>
      {taxResult && (
        <div className="tax-result">
          <div>
            <span>Eligible extra 80C</span>
            <strong>{formatMoney(taxResult.result.eligible_extra_80c)}</strong>
          </div>
          <div>
            <span>Estimated tax saving</span>
            <strong>{formatMoney(taxResult.result.estimated_tax_saving)}</strong>
          </div>
          <ol>
            {taxResult.explanation.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>{taxResult.assumptions.disclaimer}</p>
        </div>
      )}
    </section>
  );
}

function ProofChecklist({ proofChecklist }) {
  const items = proofChecklist?.items || [];
  return (
    <section className="panel">
      <PanelTitle title="Investment Proof Checklist" subtitle={proofChecklist?.note || "Mock proof items"} />
      <div className="proof-list">
        {items.map((item) => (
          <div className="proof-item" key={item.key}>
            {item.proof_status === "submitted" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <div>
              <strong>{item.label}</strong>
              <span>{formatMoney(item.declared_amount)} declared</span>
            </div>
            <em className={item.proof_status}>{item.proof_status}</em>
          </div>
        ))}
      </div>
      <p className="missing-summary">{proofChecklist?.summary?.missing_proof_summary || "Loading proof checklist..."}</p>
    </section>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`message ${isUser ? "user" : "assistant"}`}>
      <div className="avatar">{isUser ? <User size={16} /> : <Bot size={16} />}</div>
      <div className={`bubble ${message.type === "error" ? "error" : ""}`}>
        {message.fileName && <div className="file-line"><Paperclip size={14} /> {message.fileName}</div>}
        <p>{message.content}</p>
        {message.type === "analysis" && <MiniAnalysis data={message.data} />}
      </div>
    </div>
  );
}

function MiniAnalysis({ data }) {
  return (
    <div className="mini-analysis">
      <span>Net {formatMoney(data.finance?.payroll?.net, data.finance?.payroll?.currency)}</span>
      <span>Gross {formatMoney(data.finance?.payroll?.gross, data.finance?.payroll?.currency)}</span>
      <span>{data.finance?.payroll?.month || ""}</span>
    </div>
  );
}

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "Request failed.");
  }
  return payload;
}

function formatMoney(value, currency = "INR") {
  if (typeof value !== "number") return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatSignedMoney(value, currency = "INR") {
  if (typeof value !== "number") return "";
  if (value === 0) return formatMoney(0, currency);
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatMoney(Math.abs(value), currency)}`;
}

function authHeaders(auth) {
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

createRoot(document.getElementById("root")).render(<App />);
