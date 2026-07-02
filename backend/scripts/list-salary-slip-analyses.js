const { getSalarySlipAnalysisById } = require("../src/services/salarySlipAnalyzer/salarySlipAnalysisRepository");

const id = Number(process.argv[2]);

if (!id) {
  console.error("Usage: node scripts/list-salary-slip-analyses.js <id>");
  process.exitCode = 1;
} else {
  const record = getSalarySlipAnalysisById(id);
  if (!record) {
    console.error(`No salary slip analysis found for id ${id}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({
      id: record.id,
      documentType: record.documentType,
      sourceFilenameHash: record.sourceFilenameHash,
      createdAt: record.createdAt,
      payload: record.payload
    }, null, 2));
  }
}
