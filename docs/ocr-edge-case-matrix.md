# OCR Edge Case Coverage Matrix

| Case | Current Handling | Test/Check |
| --- | --- | --- |
| Text PDF with readable layer | `pdf-parse` extracts text before OCR fallback | Smoke and endpoint dry-run |
| Scanned PDF with weak/no text layer | Converts pages through `pdftoppm`, then OCRs page images | Documented path; requires Poppler and Tesseract |
| PNG/JPEG/WebP payslip | Image OCR through Tesseract after Sharp preprocessing | OCR service unit checks for preprocessing behavior |
| Small/low-resolution image | Sharp upsizes images below target width | OCR service prepares image before worker recognition |
| Rotated image | Sharp auto-rotates using metadata | OCR service preprocessing |
| Unsupported upload type | Returns `415 UNSUPPORTED_DOCUMENT_TYPE` | Existing extractor path |
| Empty OCR/extraction result | Returns `422 EMPTY_DOCUMENT_TEXT` | Validation path |
| OCR noise / inconsistent output | Summary builder handles missing fields and returns warnings | Unit test in `assignment.test.js` |
| Missing payroll fields | Values become blank in UI and warnings are returned by backend | Unit test in `assignment.test.js` |

This is an assignment-level matrix. Production OCR would need a larger corpus with real scanned payslips, blurred images, handwritten annotations, multi-page PDFs, and coordinate-aware redaction checks.
