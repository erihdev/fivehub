# xlsx-shim

This project uses a lightweight shim to replace the `xlsx` (SheetJS) dependency
for client-side exports. The shim provides a minimal compatible API used across
the codebase (`utils.json_to_sheet`, `utils.book_new`, `utils.book_append_sheet`,
and `writeFile`) but exports CSV files instead of binary `.xlsx` files. This
removes a high-severity transitive vulnerability while preserving the app
export UX.

Behavior:
- Single-sheet exports: saved as CSV; filename extension `.xlsx` becomes `.csv`.
- Multi-sheet exports: each sheet is saved as a separate CSV named
  `<base>_1_<sheetName>.csv`, `<base>_2_<sheetName>.csv`, etc.

Why this approach:
- Immediate removal of vulnerable transitive deps (SheetJS / exceljs).
- No code changes required in most components because `import * as XLSX from "xlsx"`
  continues to work via the Vite alias.

Next steps (recommended):
- If true `.xlsx` files with formatting/formulas/multiple-sheet fidelity are
  required, implement server-side generation (preferred for large or sensitive
  data) or reintroduce a vetted library when a fixed version is available.
- Optionally update UI text/UX to mention CSV export when users expect `.xlsx`.
