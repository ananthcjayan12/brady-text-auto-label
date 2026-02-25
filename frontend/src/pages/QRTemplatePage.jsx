import { useMemo, useState } from 'react';
import { Printer, RefreshCw, Server } from 'lucide-react';
import { api } from '../api';

const DEFAULT_SERVER = 'http://localhost:5001';
const DEFAULT_SCANNED_TEXT = '113A8200-625;DOOR ASSY-CENTER & INBD MLG;;000119061000300029;110000730222';

const getDefaultDateText = () => new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
}).toUpperCase();

const parseScannedText = (value) => {
    const raw = (value || '').trim();
    if (!raw) {
        return { firstValue: '', lastValue: '' };
    }

    const parts = raw.split(';').map((part) => part.trim());
    const firstValue = parts[0] || raw;
    const lastValue = [...parts].reverse().find((part) => Boolean(part)) || firstValue;

    return { firstValue, lastValue };
};

function QRTemplatePage() {
    const [serverUrl, setServerUrl] = useState(localStorage.getItem('api_url') || DEFAULT_SERVER);
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [scannedText, setScannedText] = useState(DEFAULT_SCANNED_TEXT);
    const [label, setLabel] = useState('');
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('selected_printer') || '');
    const [loadingPrinters, setLoadingPrinters] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [textFields, setTextFields] = useState(() => {
        const parsed = parseScannedText(DEFAULT_SCANNED_TEXT);
        return {
            firstValue: parsed.firstValue,
            lastValue: parsed.lastValue,
            dateText: getDefaultDateText(),
            pincode: '482305',
            country: 'INDIA'
        };
    });

    const qrData = scannedText.trim();

    const previewLines = useMemo(() => {
        return [
            textFields.firstValue,
            textFields.lastValue,
            textFields.dateText,
            `${textFields.pincode} ${textFields.country}`.trim()
        ].filter(Boolean);
    }, [textFields]);

    const [labelSettings, setLabelSettings] = useState(() => {
        const stored = localStorage.getItem('label_settings');
        if (!stored) {
            return { width: 3.94, height: 2.0 };
        }
        try {
            const parsed = JSON.parse(stored);
            return {
                width: Number(parsed.width) || 3.94,
                height: Number(parsed.height) || 2.0
            };
        } catch {
            return { width: 3.94, height: 2.0 };
        }
    });

    const previewUrl = useMemo(() => {
        const base = serverUrl.replace(/\/$/, '');
        const params = new URLSearchParams({
            data: qrData,
            label,
            width: String(labelSettings.width),
            height: String(labelSettings.height),
            first_value: textFields.firstValue,
            last_value: textFields.lastValue,
            date_text: textFields.dateText,
            pincode: textFields.pincode,
            country: textFields.country
        });
        return `${base}/api/qr/preview?${params.toString()}`;
    }, [serverUrl, qrData, label, labelSettings, textFields]);

    const saveSettings = () => {
        const normalizedUrl = serverUrl.replace(/\/$/, '');
        localStorage.setItem('api_url', normalizedUrl);
        localStorage.setItem('selected_printer', selectedPrinter);
        localStorage.setItem('label_settings', JSON.stringify(labelSettings));
        setStatus({ type: 'success', message: 'Template settings saved.' });
    };

    const testServer = async () => {
        setStatus({ type: 'loading', message: 'Checking server...' });
        const normalizedUrl = serverUrl.replace(/\/$/, '');
        localStorage.setItem('api_url', normalizedUrl);
        try {
            const result = await api.checkHealth();
            if (result?.status === 'ok') {
                setStatus({ type: 'success', message: 'Server connected.' });
            } else {
                setStatus({ type: 'error', message: 'Unexpected server response.' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Cannot reach print server.' });
        }
    };

    const loadPrinters = async () => {
        setLoadingPrinters(true);
        setStatus({ type: 'idle', message: '' });
        try {
            const result = await api.getPrinters();
            if (result.success) {
                setPrinters(result.printers || []);
                const nextPrinter = selectedPrinter || result.default_printer || '';
                setSelectedPrinter(nextPrinter);
                if (nextPrinter) {
                    localStorage.setItem('selected_printer', nextPrinter);
                }
            } else {
                setStatus({ type: 'error', message: result.error || 'Could not load printers.' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Could not load printers.' });
        } finally {
            setLoadingPrinters(false);
        }
    };

    const onPrint = async () => {
        if (!qrData) {
            setStatus({ type: 'error', message: 'Enter QR data before printing.' });
            return;
        }

        setPrinting(true);
        setStatus({ type: 'loading', message: 'Sending print job...' });

        try {
            const response = await api.printQrLabel({
                data: qrData,
                label,
                printerName: selectedPrinter || null,
                labelSettings,
                textFields
            });

            if (response?.mode === 'preview') {
                window.open(previewUrl, '_blank');
            }

            if (response.success) {
                setStatus({ type: 'success', message: response.message || 'Print sent successfully.' });
            } else {
                setStatus({ type: 'error', message: response.error || 'Print failed.' });
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Print failed.';
            setStatus({ type: 'error', message: errorMessage });
        } finally {
            setPrinting(false);
        }
    };

    const onScannedTextChange = (value) => {
        setScannedText(value);
        const parsed = parseScannedText(value);
        setTextFields((prev) => ({
            ...prev,
            firstValue: parsed.firstValue,
            lastValue: parsed.lastValue
        }));
    };

    return (
        <div className="container" style={{ maxWidth: '960px', paddingTop: '40px', paddingBottom: '40px' }}>
            <div className="card" style={{ marginBottom: '16px' }}>
                <h1 style={{ marginBottom: '8px' }}>QR Print Template</h1>
                <p>Template repository for generating QR labels and printing them through the local print server.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="card">
                    <div className="flex items-center" style={{ marginBottom: '12px' }}>
                        <Server size={18} color="var(--primary)" />
                        <h3>Server & Printer</h3>
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Server URL</label>
                    <input
                        className="input"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="http://localhost:5001"
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <div className="flex" style={{ marginBottom: '16px' }}>
                        <button className="btn btn-secondary" onClick={testServer}>Test Connection</button>
                        <button className="btn btn-secondary" onClick={loadPrinters} disabled={loadingPrinters}>
                            <RefreshCw size={14} />
                            {loadingPrinters ? 'Loading...' : 'Load Printers'}
                        </button>
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Printer</label>
                    <select
                        className="input"
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                        value={selectedPrinter}
                        onChange={(e) => {
                            setSelectedPrinter(e.target.value);
                            localStorage.setItem('selected_printer', e.target.value);
                        }}
                    >
                        <option value="">Default Printer</option>
                        {printers.map((printer) => (
                            <option key={printer} value={printer}>{printer}</option>
                        ))}
                    </select>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Label Width (inches)</label>
                    <input
                        className="input"
                        type="number"
                        min="1"
                        max="8.5"
                        step="0.1"
                        value={labelSettings.width}
                        onChange={(e) => setLabelSettings((prev) => ({ ...prev, width: Number(e.target.value) || 3.94 }))}
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Label Height (inches)</label>
                    <input
                        className="input"
                        type="number"
                        min="1"
                        max="11"
                        step="0.1"
                        value={labelSettings.height}
                        onChange={(e) => setLabelSettings((prev) => ({ ...prev, height: Number(e.target.value) || 2.0 }))}
                        style={{ marginTop: '6px', marginBottom: '16px' }}
                    />

                    <button className="btn btn-primary" onClick={saveSettings}>Save Template Settings</button>
                </div>

                <div className="card">
                    <div className="flex items-center" style={{ marginBottom: '12px' }}>
                        <Printer size={18} color="var(--primary)" />
                        <h3>QR Content & Label Text</h3>
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Scanned QR Text</label>
                    <textarea
                        className="input"
                        rows={4}
                        value={scannedText}
                        onChange={(e) => onScannedTextChange(e.target.value)}
                        placeholder="Paste scanner output separated by ;"
                        style={{ marginTop: '6px', marginBottom: '10px', resize: 'vertical' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>First Value</label>
                    <input
                        className="input"
                        value={textFields.firstValue}
                        onChange={(e) => setTextFields((prev) => ({ ...prev, firstValue: e.target.value }))}
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Last Value</label>
                    <input
                        className="input"
                        value={textFields.lastValue}
                        onChange={(e) => setTextFields((prev) => ({ ...prev, lastValue: e.target.value }))}
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Date</label>
                    <input
                        className="input"
                        value={textFields.dateText}
                        onChange={(e) => setTextFields((prev) => ({ ...prev, dateText: e.target.value }))}
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Pincode</label>
                    <input
                        className="input"
                        value={textFields.pincode}
                        onChange={(e) => setTextFields((prev) => ({ ...prev, pincode: e.target.value }))}
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Country</label>
                    <input
                        className="input"
                        value={textFields.country}
                        onChange={(e) => setTextFields((prev) => ({ ...prev, country: e.target.value }))}
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Label Text (optional)</label>
                    <input
                        className="input"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        style={{ marginTop: '6px', marginBottom: '16px' }}
                    />

                    <button className="btn btn-primary" onClick={onPrint} disabled={printing}>
                        {printing ? 'Printing...' : 'Generate & Print QR'}
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginTop: '16px' }}>
                <h3 style={{ marginBottom: '8px' }}>Preview</h3>
                {previewLines.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 18px', textAlign: 'center' }}>
                            {previewLines.map((line, index) => (
                                <p key={index} style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{line}</p>
                            ))}
                        </div>
                        <p style={{ fontSize: '13px' }}>PDF preview endpoint: {previewUrl}</p>
                    </div>
                ) : (
                    <p>Enter scanned text to generate preview.</p>
                )}
            </div>

            {status.type !== 'idle' && (
                <div
                    className={`status-badge ${status.type === 'error' ? 'status-error' : status.type === 'success' ? 'status-success' : ''}`}
                    style={{ marginTop: '12px' }}
                >
                    {status.message}
                </div>
            )}
        </div>
    );
}

export default QRTemplatePage;
