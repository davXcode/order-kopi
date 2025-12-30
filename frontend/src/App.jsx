import { Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import UserOrder from './pages/UserOrder.jsx';
import Admin from './pages/Admin.jsx';
import Payment from './pages/Payment.jsx';

export default function App() {
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.minHeight = '100vh';
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #fff7ed 100%)',
      }}
    >
      <div
        style={{
          fontFamily: 'system-ui',
          maxWidth: 900,
          margin: '0 auto',
          padding: 16,
        }}
      >
        <header style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Kopi david.ardi ☕</h2>
        </header>

        <Routes>
          <Route path="/" element={<UserOrder />} />
          <Route path="/pay/:id" element={<Payment />} />
          <Route path="/dav-order" element={<Admin />} />
        </Routes>
      </div>
    </div>
  );
}
