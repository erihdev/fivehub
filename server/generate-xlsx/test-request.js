const fs = require('fs');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/generate-xlsx';

const payload = {
  sheets: [
    {
      name: 'TestSheet',
      data: [
        { id: 1, name: 'Alice', amount: 123.45 },
        { id: 2, name: 'Bob', amount: 67.89 },
      ],
    },
  ],
  filename: 'test_export.xlsx',
};

(async () => {
  try {
    console.log('Posting to', SERVER_URL);
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Server returned', res.status, await res.text());
      process.exit(1);
    }
    const ab = await res.arrayBuffer();
    const outPath = 'server/generate-xlsx/test-output.xlsx';
    fs.writeFileSync(outPath, Buffer.from(ab));
    console.log('Saved', outPath);
  } catch (err) {
    console.error('Test request failed:', err);
    process.exit(1);
  }
})();
