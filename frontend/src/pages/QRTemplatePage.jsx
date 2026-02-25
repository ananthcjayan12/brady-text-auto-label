import { useMemo, useState, useEffect, useRef } from 'react';
import { Printer, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '../api';

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
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [scannedText, setScannedText] = useState('');
    const [label, setLabel] = useState('');
    const [printing, setPrinting] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [textFields, setTextFields] = useState(() => {
        return {
            firstValue: '',
            lastValue: '',
            dateText: getDefaultDateText(),
            pincode: '482305',
            country: 'INDIA'
        };
    });

    const printTimerRef = useRef(null);
    const scanInputRef = useRef(null);

    const qrData = scannedText.trim();

    const previewLines = useMemo(() => {
        return [
            textFields.firstValue,
            textFields.lastValue,
            textFields.dateText,
            `${textFields.pincode} ${textFields.country}`.trim()
        ].filter(Boolean);
    }, [textFields]);

    const labelSettings = useMemo(() => {
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
    }, []);

    const serverUrl = useMemo(() => {
        return localStorage.getItem('api_url') || 'http://localhost:5001';
    }, []);

    const selectedPrinter = useMemo(() => {
        return localStorage.getItem('selected_printer') || '';
    }, []);

    const autoPrintDelay = useMemo(() => {
        const stored = localStorage.getItem('auto_print_delay');
        return stored ? parseInt(stored, 10) : 2;
    }, []);

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

    const onPrint = async (dataOverride = null, fieldsOverride = null) => {
        const dataToUse = dataOverride !== null ? dataOverride : qrData;
        const fieldsToUse = fieldsOverride !== null ? fieldsOverride : textFields;

        if (!dataToUse) {
            setStatus({ type: 'error', message: 'Enter QR data before printing.' });
            return;
        }

        setPrinting(true);
        setStatus({ type: 'loading', message: 'Sending print job...' });

        try {
            const response = await api.printQrLabel({
                data: dataToUse,
                label,
                printerName: selectedPrinter || null,
                labelSettings,
                textFields: fieldsToUse
            });

            if (response?.mode === 'preview') {
                // Build preview URL from actual data being used
                const base = serverUrl.replace(/\/$/, '');
                const params = new URLSearchParams({
                    data: dataToUse,
                    label,
                    width: String(labelSettings.width),
                    height: String(labelSettings.height),
                    first_value: fieldsToUse.firstValue,
                    last_value: fieldsToUse.lastValue,
                    date_text: fieldsToUse.dateText,
                    pincode: fieldsToUse.pincode,
                    country: fieldsToUse.country
                });
                const dynamicPreviewUrl = `${base}/api/qr/preview?${params.toString()}`;
                window.open(dynamicPreviewUrl, '_blank');
            }

            if (response.success) {
                setStatus({ type: 'success', message: response.message || 'Print sent successfully.' });
                // Clear scan input after successful print
                setTimeout(() => {
                    setScannedText('');
                    setTextFields({
                        firstValue: '',
                        lastValue: '',
                        dateText: getDefaultDateText(),
                        pincode: '482305',
                        country: 'INDIA'
                    });
                    setStatus({ type: 'idle', message: '' });
                    scanInputRef.current?.focus();
                }, 1500);
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
        // Clear any pending print timer
        if (printTimerRef.current) {
            clearTimeout(printTimerRef.current);
            clearInterval(printTimerRef.current);
        }
        setCountdown(null);

        setScannedText(value);
        const parsed = parseScannedText(value);
        const newFields = {
            firstValue: parsed.firstValue,
            lastValue: parsed.lastValue,
            dateText: getDefaultDateText(),
            pincode: '482305',
            country: 'INDIA'
        };
        setTextFields(newFields);

        // Trigger auto-print after delay if text is valid
        if (value.trim() && autoPrintDelay >= 0) {
            let timeLeft = autoPrintDelay;
            setCountdown(timeLeft);

            const countdownInterval = setInterval(() => {
                timeLeft -= 0.1;
                setCountdown(Math.max(0, timeLeft));
            }, 100);

            printTimerRef.current = setTimeout(() => {
                clearInterval(countdownInterval);
                setCountdown(null);
                onPrint(value.trim(), newFields);
            }, autoPrintDelay * 1000);
        }
    };

    useEffect(() => {
        // Focus scan input on mount
        scanInputRef.current?.focus();

        // Cleanup timer on unmount
        return () => {
            if (printTimerRef.current) {
                clearTimeout(printTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="container" style={{ maxWidth: '900px', paddingTop: '40px', paddingBottom: '40px' }}>
            <div className="card" style={{ marginBottom: '16px' }}>
                <h1 style={{ marginBottom: '8px' }}>QR Label Scanner</h1>
                <p>Scan or paste QR text to automatically generate and print labels.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="card">
                    <div className="flex items-center" style={{ marginBottom: '12px' }}>
                        <Printer size={18} color="var(--primary)" />
                        <h3>Scanner Input</h3>
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Scanned QR Text</label>
                    <textarea
                        ref={scanInputRef}
                        className="input"
                        rows={4}
                        value={scannedText}
                        onChange={(e) => onScannedTextChange(e.target.value)}
                        placeholder="Paste scanner output separated by ;"
                        style={{ marginTop: '6px', marginBottom: '10px', resize: 'vertical', fontSize: '14px' }}
                        autoFocus
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
                        style={{ marginTop: '6px', marginBottom: '16px' }}
                    />

                    {countdown !== null && countdown > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px',
                            background: 'var(--primary-light)',
                            borderRadius: '6px',
                            marginBottom: '10px'
                        }}>
                            <Clock size={16} color="var(--primary)" />
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>
                                Auto-printing in {countdown.toFixed(1)}s...
                            </span>
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        onClick={onPrint}
                        disabled={printing || !qrData}
                        style={{ width: '100%' }}
                    >
                        {printing ? 'Printing...' : 'Print Now'}
                    </button>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '12px' }}>Preview</h3>
                    {previewLines.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                border: '2px solid var(--border)',
                                borderRadius: '8px',
                                padding: '20px 24px',
                                textAlign: 'center',
                                background: 'var(--card-bg)',
                                minHeight: '180px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '4px'
                            }}>
                                {previewLines.map((line, index) => (
                                    <p key={index} style={{
                                        fontSize: '18px',
                                        fontWeight: 700,
                                        lineHeight: 1.3,
                                        margin: 0,
                                        fontFamily: 'monospace'
                                    }}>{line}</p>
                                ))}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Label will be printed with the text above
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            border: '2px dashed var(--border)',
                            borderRadius: '8px'
                        }}>
                            <p>Scan QR code to see preview</p>
                        </div>
                    )}
                </div>
            </div>

            {status.type !== 'idle' && (
                <div
                    className={`status-badge ${status.type === 'error' ? 'status-error' : status.type === 'success' ? 'status-success' : ''}`}
                    style={{
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        justifyContent: 'center'
                    }}
                >
                    {status.type === 'success' && <CheckCircle size={16} />}
                    {status.type === 'error' && <AlertCircle size={16} />}
                    {status.message}
                </div>
            )}
        </div>
    );
}

export default QRTemplatePage;
