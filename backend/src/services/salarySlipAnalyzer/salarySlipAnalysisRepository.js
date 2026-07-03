const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { env } = require("../../config/env");

let db;

function saveSalarySlipAnalysis(record) {
  const database = getDatabase();
  const payload = {
    analysis: record.analysis,
    finance: record.finance,
    extraction: record.extraction,
    piiMasking: record.piiMasking,
    llm: record.llm
  };

  const result = database.prepare(`
    INSERT INTO salary_slip_documents (
      document_type,
      source_filename_hash,
      payload_json
    ) VALUES (
      @documentType,
      @sourceFilenameHash,
      @payloadJson
    )
  `).run({
    documentType: record.analysis.doc_type || "payslip",
    sourceFilenameHash: record.sourceFilenameHash || null,
    payloadJson: JSON.stringify(payload)
  });

  return getSalarySlipAnalysisById(result.lastInsertRowid);
}

function getSalarySlipAnalysisById(id) {
  const row = getDatabase()
    .prepare("SELECT * FROM salary_slip_documents WHERE id = ?")
    .get(id);

  return row ? mapRow(row) : null;
}

function getLatestSalarySlipAnalysis() {
  const row = getDatabase()
    .prepare("SELECT * FROM salary_slip_documents ORDER BY id DESC LIMIT 1")
    .get();

  return row ? mapRow(row) : null;
}

function getDatabase() {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), env.sqliteDbPath);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS salary_slip_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_type TEXT NOT NULL,
        source_filename_hash TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_salary_slip_documents_type
        ON salary_slip_documents(document_type);

      CREATE INDEX IF NOT EXISTS idx_salary_slip_documents_created_at
        ON salary_slip_documents(created_at);
    `);
  }

  return db;
}

function mapRow(row) {
  const payload = JSON.parse(row.payload_json);

  return {
    id: row.id,
    documentType: row.document_type,
    sourceFilenameHash: row.source_filename_hash,
    payload,
    createdAt: row.created_at
  };
}

module.exports = {
  saveSalarySlipAnalysis,
  getSalarySlipAnalysisById,
  getLatestSalarySlipAnalysis
};
