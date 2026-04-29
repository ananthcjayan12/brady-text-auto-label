import { useMemo, useState, useEffect, useRef } from 'react';
import { Printer, CheckCircle, AlertCircle } from 'lucide-react';
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
    const [textFields, setTextFields] = useState(() => {
        return {
            firstValue: '',
            lastValue: '',
            dateText: getDefaultDateText(),
            pincode: '482305',
            country: 'INDIA'
        };
    });

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
        const isEventObject = dataOverride && typeof dataOverride === 'object' && 'nativeEvent' in dataOverride;
        const dataToUse = dataOverride !== null && !isEventObject ? dataOverride : qrData;
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
    };

    useEffect(() => {
        // Focus scan input on mount
        scanInputRef.current?.focus();
    }, []);

    return (
        <div className="container" style={{ maxWidth: '900px', paddingTop: '40px', paddingBottom: '40px' }}>
            <div className="card" style={{ marginBottom: '16px' }}>
                <h1 style={{ marginBottom: '8px' }}>QR Label Scanner</h1>
                <p>Scan or paste QR text, review, then print labels manually.</p>
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
                    <div
                        style={{
                            marginTop: '6px',
                            marginBottom: '10px',
                            minHeight: '42px',
                            padding: '10px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--card-bg)',
                            color: textFields.firstValue ? 'var(--text)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {textFields.firstValue || 'Auto-filled from QR scan'}
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Last Value</label>
                    <div
                        style={{
                            marginTop: '6px',
                            marginBottom: '10px',
                            minHeight: '42px',
                            padding: '10px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--card-bg)',
                            color: textFields.lastValue ? 'var(--text)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {textFields.lastValue || 'Auto-filled from QR scan'}
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Date</label>
                    <input
                        className="input"
                        value={textFields.dateText}
                        onChange={(e) => setTextFields((prev) => ({ ...prev, dateText: e.target.value }))}
                        style={{ marginTop: '6px', marginBottom: '10px' }}
                    />

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Pincode</label>
                    <div
                        style={{
                            marginTop: '6px',
                            marginBottom: '10px',
                            minHeight: '42px',
                            padding: '10px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--card-bg)',
                            color: textFields.pincode ? 'var(--text)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {textFields.pincode || 'Auto-filled from QR scan'}
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: 500 }}>Country</label>
                    <div
                        style={{
                            marginTop: '6px',
                            marginBottom: '16px',
                            minHeight: '42px',
                            padding: '10px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--card-bg)',
                            color: textFields.country ? 'var(--text)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {textFields.country || 'Auto-filled from QR scan'}
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => onPrint()}
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
