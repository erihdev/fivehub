const express = require('express');
const ExcelJS = require('exceljs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.post('/generate-xlsx', async (req, res) => {
  try {
    const { sheets = [], filename = 'export.xlsx' } = req.body || {};
    const workbook = new ExcelJS.Workbook();

    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i] || { name: `Sheet${i + 1}`, data: [] };
      const name = s.name || `Sheet${i + 1}`;
      const data = s.data || [];
      const ws = workbook.addWorksheet(name);
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        ws.columns = keys.map((k) => ({ header: k, key: k }));
        data.forEach((row) => ws.addRow(row));
      }
    }

    const buf = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('generate-xlsx error', err);
    res.status(500).json({ error: 'Failed to generate XLSX' });
  }
});

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`generate-xlsx server listening on ${port}`));
