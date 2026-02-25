# Local QR Print Bridge

This server is the local companion for the QR Template frontend. It generates QR label PDFs and sends them to your local printer.

## Installation

1.  **Install Python**: Ensure you have Python 3.8+ installed.
2.  **Run the Server**:
    *   **Mac/Linux**: Open Terminal, navigate to this folder, and run `./run_server.sh`
    *   **Windows**: Open PowerShell, navigate to this folder, and run `python app.py` (ensure you install requirements first: `pip install -r requirements_server.txt`)

## How it Works

*   Server runs on `http://localhost:5001`.
*   Frontend calls QR endpoints to preview or print labels.
*   Keep this process running while using the app.

## QR Endpoints

*   `GET /api/qr/preview?data=...&label=...&width=...&height=...`
        * Also supports optional text fields: `first_value`, `last_value`, `date_text`, `pincode`, `country`.
        * Returns generated QR label PDF for preview.
*   `POST /api/qr/print`
        * Body:
            ```json
            {
                "data": "113A8200-625;DOOR ASSY-CENTER & INBD MLG;;000119061000300029;110000730222",
                "label": "",
                "printer_name": "Optional Printer Name",
                "label_settings": {
                    "width": 3.94,
                    "height": 2.0
                },
                "text_fields": {
                    "firstValue": "113A8200-625",
                    "lastValue": "110000730222",
                    "dateText": "03 MAY 2025",
                    "pincode": "482305",
                    "country": "INDIA"
                },
                "username": "template-user"
            }
            ```

## Troubleshooting

*   **Printer not found**: Ensure printer is installed in OS settings and visible in `lpstat -p` (macOS/Linux) or Windows printer settings.
*   **Connection failed**: Ensure nothing blocks port `5001`.
