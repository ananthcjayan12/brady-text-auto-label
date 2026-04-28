import { useState, useEffect } from 'react';
import { Server, RefreshCw, CheckCircle, XCircle, Printer, Save } from 'lucide-react';
import { api } from '../api';

function SettingsPage() {
    const [serverUrl, setServerUrl] = useState('http://localhost:5001');
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [loadingPrinters, setLoadingPrinters] = useState(false);

    const [labelSettings, setLabelSettings] = useState({
        width: 3.94,
        height: 2.0
    });

    useEffect(() => {
        const storedUrl = localStorage.getItem('api_url');
        if (storedUrl) setServerUrl(storedUrl);

        const storedLabel = localStorage.getItem('label_settings');
        if (storedLabel) {
            try {
                const parsed = JSON.parse(storedLabel);
                setLabelSettings({
                    width: Number(parsed.width) || 3.94,
                    height: Number(parsed.height) || 2.0
                });
            } catch (e) { }
        }

        const storedPrinter = localStorage.getItem('selected_printer');
        if (storedPrinter) setSelectedPrinter(storedPrinter);

        loadPrinters();
    }, []);

    const loadPrinters = async () => {
        setLoadingPrinters(true);
        try {
            const result = await api.getPrinters();
            if (result.success) {
                setPrinters(result.printers || []);
                if (!selectedPrinter && result.default_printer) {
                    setSelectedPrinter(result.default_printer);
                    localStorage.setItem('selected_printer', result.default_printer);
                }
            }
        } catch (e) {
            console.error('Failed to load printers:', e);
        } finally {
            setLoadingPrinters(false);
        }
    };

    const testServerConnection = async () => {
        setStatus({ type: 'loading', message: 'Testing connection...' });
        const url = serverUrl.replace(/\/$/, '');

        try {
            const result = await api.checkHealth();
            if (result?.status === 'ok') {
                setStatus({ type: 'success', message: 'Server connected successfully!' });
            } else {
                setStatus({ type: 'error', message: 'Invalid server response' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: `Connection failed: ${error.message}` });
        }
    };

    const saveAllSettings = () => {
        const normalizedUrl = serverUrl.replace(/\/$/, '');
        localStorage.setItem('api_url', normalizedUrl);
        localStorage.setItem('selected_printer', selectedPrinter);
        localStorage.setItem('label_settings', JSON.stringify(labelSettings));
        localStorage.removeItem('auto_print_delay');

        setStatus({ type: 'success', message: 'All settings saved successfully!' });
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    };

    return (
        <div className="container" style={{ maxWidth: '800px', paddingTop: '40px', paddingBottom: '40px' }}>
            <div className="card" style={{ marginBottom: '16px' }}>
                <h1 style={{ marginBottom: '8px' }}>Application Settings</h1>
                <p>Configure server connection, printer, and label dimensions.</p>
            </div>

            {/* Server Connection */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                    <Server size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0, marginLeft: '10px' }}>Server Connection</h3>
                </div>

                <label style={{ fontSize: '13px', fontWeight: 500 }}>Server URL</label>
                <input
                    type="text"
                    className="input"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:5001"
                    style={{ marginTop: '6px', marginBottom: '12px' }}
                />

                <button className="btn btn-secondary" onClick={testServerConnection}>
                    <RefreshCw size={14} style={{ marginRight: '6px' }} />
                    Test Connection
                </button>
            </div>

            {/* Printer Settings */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                    <Printer size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0, marginLeft: '10px' }}>Printer Settings</h3>
                </div>

                <label style={{ fontSize: '13px', fontWeight: 500 }}>Printer</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', marginBottom: '12px' }}>
                    <select
                        className="input"
                        value={selectedPrinter}
                        onChange={(e) => {
                            setSelectedPrinter(e.target.value);
                            localStorage.setItem('selected_printer', e.target.value);
                        }}
                        style={{ flex: 1 }}
                    >
                        <option value="">Default Printer</option>
                        {printers.map((printer) => (
                            <option key={printer} value={printer}>{printer}</option>
                        ))}
                    </select>
                    <button
                        className="btn btn-secondary"
                        onClick={loadPrinters}
                        disabled={loadingPrinters}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 500 }}>Label Width (inches)</label>
                        <input
                            className="input"
                            type="number"
                            min="1"
                            max="8.5"
                            step="0.1"
                            value={labelSettings.width}
                            onChange={(e) => setLabelSettings(prev => ({
                                ...prev,
                                width: Number(e.target.value) || 3.94
                            }))}
                            style={{ marginTop: '6px' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 500 }}>Label Height (inches)</label>
                        <input
                            className="input"
                            type="number"
                            min="1"
                            max="11"
                            step="0.1"
                            value={labelSettings.height}
                            onChange={(e) => setLabelSettings(prev => ({
                                ...prev,
                                height: Number(e.target.value) || 2.0
                            }))}
                            style={{ marginTop: '6px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Save All */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-primary" onClick={saveAllSettings} style={{ paddingLeft: '24px', paddingRight: '24px' }}>
                    <Save size={16} style={{ marginRight: '8px' }} />
                    Save All Settings
                </button>
            </div>

            {/* Status Message */}
            {status.type !== 'idle' && (
                <div
                    className={`status-badge ${status.type === 'error' ? 'status-error' : status.type === 'success' ? 'status-success' : ''}`}
                    style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                >
                    {status.type === 'success' && <CheckCircle size={16} />}
                    {status.type === 'error' && <XCircle size={16} />}
                    {status.message}
                </div>
            )}
        </div>
    );
}

export default SettingsPage;
