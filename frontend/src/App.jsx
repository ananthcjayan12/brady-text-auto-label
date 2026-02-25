import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QrCode, Settings } from 'lucide-react';
import QRTemplatePage from './pages/QRTemplatePage';
import SettingsPage from './pages/SettingsPage';

function Navigation() {
  const location = useLocation();

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      padding: '12px 20px',
      background: 'var(--card-bg)',
      display: 'flex',
      gap: '16px',
      alignItems: 'center'
    }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, flex: 1 }}>QR Label Print</h2>
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '6px',
          textDecoration: 'none',
          color: location.pathname === '/' ? 'var(--primary)' : 'var(--text)',
          background: location.pathname === '/' ? 'var(--primary-light)' : 'transparent',
          fontWeight: 500
        }}
      >
        <QrCode size={18} />
        Scanner
      </Link>
      <Link
        to="/settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '6px',
          textDecoration: 'none',
          color: location.pathname === '/settings' ? 'var(--primary)' : 'var(--text)',
          background: location.pathname === '/settings' ? 'var(--primary-light)' : 'transparent',
          fontWeight: 500
        }}
      >
        <Settings size={18} />
        Settings
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<QRTemplatePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
