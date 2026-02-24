import { saveAs } from "file-saver";

type SheetData = Array<Record<string, any>>;

// Minimal shim that avoids heavy deps: store sheets and export as CSV files.
export const utils = {
  json_to_sheet(data: SheetData) {
    return data || [];
  },
  book_new() {
    return { __sheets: [] as Array<{ name: string; data: SheetData }> };
  },
  book_append_sheet(wb: { __sheets: Array<{ name: string; data: SheetData }> }, sheetData: SheetData, name = "Sheet1") {
    wb.__sheets.push({ name, data: sheetData || [] });
  },
};

function toCSV(data: SheetData) {
  if (!data || data.length === 0) return "";
  const keys = Object.keys(data[0]);
  const rows = [keys.join(",")];
  for (const r of data) {
    const row = keys.map((k) => {
      const v = r[k];
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes("\n") ? `"${s}"` : s;
    });
    rows.push(row.join(","));
  }
  return rows.join("\n");
}

export async function writeFile(wb: { __sheets: Array<{ name: string; data: SheetData }> }, filename: string) {
  // If a server endpoint is configured, prefer server-side XLSX generation
  const serverUrl = (import.meta as any)?.env?.VITE_XLSX_SERVER_URL;
  if (serverUrl) {
    try {
      const url = `${serverUrl.replace(/\/$/, "")}/generate-xlsx`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets: wb.__sheets, filename }),
      });
      if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
      const ab = await resp.arrayBuffer();
      const blob = new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
      return;
    } catch (e) {
      // fallback to CSV export if server call fails
      console.error("XLSX server export failed, falling back to CSV:", e);
    }
  }

  if (!wb || !wb.__sheets || wb.__sheets.length === 0) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
    return;
  }

  // If single sheet, save as CSV with the requested filename (change extension to .csv)
  if (wb.__sheets.length === 1) {
    const csv = toCSV(wb.__sheets[0].data);
    const outName = filename.replace(/\.xlsx?$/i, ".csv");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, outName);
    return;
  }

  // Multiple sheets: save each sheet as separate CSV files with numbered suffixes
  for (let i = 0; i < wb.__sheets.length; i++) {
    const sheet = wb.__sheets[i];
    const csv = toCSV(sheet.data);
    const base = filename.replace(/\.xlsx?$/i, "");
    const outName = `${base}_${i + 1}_${sheet.name.replace(/[^a-z0-9_-]/gi, "_")}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, outName);
  }
}

const shim = {
  utils,
  writeFile,
};

export default shim;
