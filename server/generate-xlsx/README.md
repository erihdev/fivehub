# generate-xlsx

Simple Node express service to generate .xlsx files from JSON payloads.

Install and run:

```bash
cd server/generate-xlsx
npm install
node index.js
```

POST /generate-xlsx
- Body: { sheets: [ { name: string, data: Array<object> } ], filename: string }
- Response: binary `.xlsx` with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Use `VITE_XLSX_SERVER_URL` in the frontend (e.g. `http://localhost:3000`) to enable server-side generation.
