# QR Label Template Frontend

This frontend is now a template UI for:

- Pasting scanned QR payload text (`;` separated)
- Auto-filling editable label fields (first value, last value, date, pincode, country)
- Previewing generated QR locally in the browser
- Sending print jobs to the local print bridge

## Run

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open the app and set the print-server URL (default: `http://localhost:5001`).

## Template Flow

1. Configure server URL and printer.
2. Paste scanned QR text (example: `113A8200-625;...;110000730222`).
3. Review/edit auto-filled fields and optional label text.
4. Click **Generate & Print QR**.

On macOS, backend runs in preview mode and opens generated PDF preview instead of physical print.
