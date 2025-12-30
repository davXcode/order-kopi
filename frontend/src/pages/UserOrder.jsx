import { useEffect, useMemo, useState } from 'react';
import { createOrder, fetchStore } from '../api';
import { useNavigate } from 'react-router-dom';

const MENU = [
  {
    key: 'americano',
    name: 'Americano',
    desc: 'Kopi hitam, clean & bold',
    price: 15000,
  },
  {
    key: 'latte',
    name: 'Latte',
    desc: 'Espresso + susu, creamy',
    price: 18000,
  },
];

function rupiah(n) {
  return `Rp${Number(n).toLocaleString('id-ID')}`;
}

function formatBesokId() {
  const now = new Date();
  const besok = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return besok.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// YYYY-MM-DD -> Date (local) supaya aman timezone
function ymdToLocalDate(ymd) {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatTanggalId(ymd) {
  const dt = ymdToLocalDate(ymd);
  if (!dt) return '';
  return dt.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isTodayGteCloseFromMinus1(closeFromYmd) {
  const dt = ymdToLocalDate(closeFromYmd);
  if (!dt) return false;

  // closeFrom - 1 hari (karena order untuk besok)
  const effectiveClose = new Date(
    dt.getFullYear(),
    dt.getMonth(),
    dt.getDate() - 1
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return today.getTime() >= effectiveClose.getTime();
}

export default function UserOrder() {
  const navigate = useNavigate();

  // responsive
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // store open/close
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true); // manual toggle dari admin
  const [closeFrom, setCloseFrom] = useState(''); // mulai tutup (YYYY-MM-DD)
  const [openUntil, setOpenUntil] = useState(''); // buka lagi (YYYY-MM-DD)

  // form state
  const [customerName, setCustomerName] = useState('');
  const [item, setItem] = useState('americano');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const selected = useMemo(() => MENU.find((m) => m.key === item), [item]);
  const total = selected.price * Number(quantity || 0);

  // responsive listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // fetch store status
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchStore(); // { open, closeFrom, openUntil }
        setStoreOpen(!!s.open);
        setCloseFrom(s.closeFrom ?? '');
        setOpenUntil(s.openUntil ?? '');
      } catch {
        // kalau backend error, default buka supaya user tetap bisa order
        setStoreOpen(true);
        setCloseFrom('');
        setOpenUntil('');
      } finally {
        setStoreLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setToast(null);

    const name = customerName.trim();
    if (!name) {
      setToast({ type: 'err', msg: 'Nama wajib diisi.' });
      return;
    }

    setLoading(true);
    try {
      const created = await createOrder({
        customerName: name,
        item,
        quantity: Number(quantity),
      });

      navigate(`/pay/${created.id}`, { state: { order: created } });
    } catch (err) {
      setToast({ type: 'err', msg: `Gagal: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  // ====== EFFECTIVE OPEN/CLOSED (schedule + toggle) ======
  const scheduledClosed = isTodayGteCloseFromMinus1(closeFrom);
  const effectiveOpen = storeOpen && !scheduledClosed;

  // Loading store status
  if (storeLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <b>Loading...</b>
            <div style={{ color: '#666', marginTop: 6 }}>
              Cek status toko dulu ya.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Store closed (manual OR schedule)
  if (!effectiveOpen) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ ...styles.card, textAlign: 'center', padding: 28 }}>
            <h2 style={{ margin: 0 }}>maaf bang lagi tutup WFH</h2>

            {closeFrom && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#777' }}>
                (Order ditutup mulai H-1 dari tanggal WFH)
              </div>
            )}

            <p style={{ margin: '10px 0 0', color: '#666' }}>
              {openUntil ? (
                <>
                  Buka lagi tanggal{' '}
                  <strong style={{ color: '#111' }}>
                    {formatTanggalId(openUntil)}
                  </strong>
                </>
              ) : (
                'Buka lagi menyusul'
              )}
            </p>
          </div>

          <footer style={styles.footer}>
            <span style={styles.mutedSmall}>
              © {new Date().getFullYear()} Kopi david.ardi
            </span>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div
          style={{ ...styles.hero, flexDirection: isMobile ? 'column' : 'row' }}
        >
          <div>
            <div style={styles.badge}>Kopi david.ardi</div>
            <h1 style={styles.title}>Order kopi tanpa ribet ☕</h1>
            <p style={styles.subtitle}>
              Pilih menu, isi nama/EID, lanjut bayar dan upload bukti
              pembayaran.
            </p>

            <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>
              Order untuk besok{' '}
              <strong style={{ color: '#111' }}>({formatBesokId()})</strong>
            </p>
          </div>

          <div style={styles.heroCard}>
            <div style={styles.heroCardRow}>
              <span style={styles.muted}>Menu tersedia</span>
              <b>{MENU.length}</b>
            </div>
            <div style={styles.heroCardRow}>
              <span style={styles.muted}>Beans</span>
              <b>Full Arabica</b>
            </div>
            <div style={styles.divider} />
            <div style={{ ...styles.muted, fontSize: 12 }}>
              Isi nama/EID yang benar ya.
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.grid,
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          }}
        >
          {/* Menu */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Menu</h2>
              <span style={styles.chip}>{rupiah(selected.price)}</span>
            </div>
            <p style={styles.cardDesc}>Pilih salah satu menu di bawah.</p>

            <div style={{ display: 'grid', gap: 10 }}>
              {MENU.map((m) => {
                const active = m.key === item;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setItem(m.key)}
                    style={{
                      ...styles.menuBtn,
                      ...(active ? styles.menuBtnActive : null),
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <div
                        style={{
                          ...styles.dot,
                          ...(active ? styles.dotActive : null),
                        }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                        <div style={styles.mutedSmall}>{m.desc}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{rupiah(m.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Buat Order</h2>
            </div>
            <p style={styles.cardDesc}>Isi data di bawah untuk submit order.</p>

            <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={styles.label}>Nama / EID</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: david.ardi"
                  style={styles.input}
                  autoComplete="off"
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <label style={styles.label}>Item</label>
                  <div style={styles.readonly}>
                    <b>{selected.name}</b>
                    <span style={styles.mutedSmall}>
                      {rupiah(selected.price)}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Quantity</label>
                  <div style={styles.qtyWrap}>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.max(1, Number(q) - 1))
                      }
                      style={styles.qtyBtn}
                      aria-label="minus"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={styles.qtyInput}
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(100, Number(q) + 1))
                      }
                      style={styles.qtyBtn}
                      aria-label="plus"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.summary}>
                <div style={styles.summaryRow}>
                  <span style={styles.muted}>Harga</span>
                  <b>{rupiah(selected.price)}</b>
                </div>
                <div style={styles.summaryRow}>
                  <span style={styles.muted}>Quantity</span>
                  <b>{Number(quantity || 0)}</b>
                </div>
                <div style={styles.divider} />
                <div style={styles.summaryRow}>
                  <span style={{ ...styles.muted, fontSize: 14 }}>Total</span>
                  <b style={{ fontSize: 18 }}>{rupiah(total)}</b>
                </div>
              </div>

              <button
                disabled={loading}
                style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Mengirim...' : 'Lanjut Pembayaran'}
              </button>

              {toast && (
                <div
                  style={{
                    ...styles.toast,
                    ...(toast.type === 'ok' ? styles.toastOk : styles.toastErr),
                  }}
                >
                  {toast.msg}
                </div>
              )}
            </form>
          </div>
        </div>

        <footer style={styles.footer}>
          <span style={styles.mutedSmall}>
            © {new Date().getFullYear()} Kopi david.ardi
          </span>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: 16,
    background:
      'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #fff7ed 100%)',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    width: '100%',
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    border: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    marginBottom: 20,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    background: '#111',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    width: 'fit-content',
    marginBottom: 10,
  },
  title: { margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em' },
  subtitle: { margin: '8px 0 0', color: '#555', maxWidth: 520 },
  heroCard: {
    minWidth: 240,
    border: '1px solid #eee',
    borderRadius: 14,
    padding: 12,
    background: '#fff',
  },
  heroCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
  },
  grid: {
    display: 'grid',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  card: {
    border: '1px solid #eee',
    borderRadius: 16,
    padding: 16,
    background: '#fff',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  cardTitle: { margin: 0, fontSize: 18 },
  cardDesc: { margin: '0 0 12px', color: '#666', fontSize: 13 },
  chip: {
    border: '1px solid #eee',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    background: '#fafafa',
    fontWeight: 700,
  },
  menuBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    border: '1px solid #eee',
    background: '#fff',
    cursor: 'pointer',
  },
  menuBtnActive: {
    border: '1px solid #111',
    boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
  },
  dot: { width: 10, height: 10, borderRadius: 999, border: '2px solid #bbb' },
  dotActive: { border: '2px solid #111' },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#444',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #e6e6e6',
    outline: 'none',
    fontSize: 14,
  },
  readonly: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #eee',
    background: '#fafafa',
  },
  qtyWrap: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 40px',
    border: '1px solid #e6e6e6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  qtyBtn: {
    border: 'none',
    background: '#fafafa',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 700,
  },
  qtyInput: {
    border: 'none',
    outline: 'none',
    textAlign: 'center',
    fontSize: 14,
    padding: 10,
  },
  summary: {
    border: '1px solid #eee',
    borderRadius: 14,
    padding: 12,
    background: '#fafafa',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
  },
  divider: { height: 1, background: '#e9e9e9', margin: '10px 0' },
  primaryBtn: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid #111',
    background: '#111',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 14,
  },
  toast: {
    padding: 12,
    borderRadius: 14,
    border: '1px solid #eee',
    fontSize: 13,
  },
  toastOk: { background: '#f1fff5', borderColor: '#bfe8c8', color: '#166534' },
  toastErr: { background: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239' },
  muted: { color: '#666' },
  mutedSmall: { color: '#777', fontSize: 12 },
  footer: {
    marginTop: 18,
    padding: 8,
    display: 'flex',
    justifyContent: 'center',
  },
};
