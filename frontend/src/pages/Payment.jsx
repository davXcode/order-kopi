import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { uploadProof, fetchStore } from '../api';

function rupiah(n) {
  return `Rp${Number(n).toLocaleString('id-ID')}`;
}

// --- date helpers (anti timezone geser) ---
function ymdToLocalDate(ymd) {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// closeFrom adalah tanggal WFH (besok), jadi order/payment diblok mulai H-1
function isTodayGteCloseFromMinus1(closeFromYmd) {
  const closeFrom = ymdToLocalDate(closeFromYmd);
  if (!closeFrom) return false;

  const effectiveClose = new Date(
    closeFrom.getFullYear(),
    closeFrom.getMonth(),
    closeFrom.getDate() - 1
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return today.getTime() >= effectiveClose.getTime();
}

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const order = location.state?.order;

  // store
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true);
  const [closeFrom, setCloseFrom] = useState('');
  const [openUntil, setOpenUntil] = useState('');

  // upload
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // success modal
  const [successModal, setSuccessModal] = useState(false);

  const scheduledClosed = useMemo(
    () => isTodayGteCloseFromMinus1(closeFrom),
    [closeFrom]
  );
  const shouldClose = !storeOpen || scheduledClosed;

  const totalText = useMemo(
    () => (order ? rupiah(order.totalPrice) : '-'),
    [order]
  );

  // fetch store status
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchStore(); // { open, closeFrom, openUntil }
        setStoreOpen(!!s.open);
        setCloseFrom(s.closeFrom ?? '');
        setOpenUntil(s.openUntil ?? '');
      } catch {
        setStoreOpen(true);
        setCloseFrom('');
        setOpenUntil('');
      } finally {
        setStoreLoading(false);
      }
    })();
  }, []);

  // cleanup preview URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onUpload(e) {
    e.preventDefault();
    setMsg('');

    if (!file) {
      setMsg('❌ Pilih gambar bukti pembayaran dulu.');
      return;
    }

    setLoading(true);
    try {
      await uploadProof(id, file);
      // ✅ sukses -> modal
      setSuccessModal(true);
    } catch (err) {
      setMsg(`❌ Gagal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // loading store
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

  // store closed (sama seperti user page)
  if (shouldClose) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ ...styles.card, textAlign: 'center', padding: 28 }}>
            <h2 style={{ margin: 0 }}>maaf bang lagi tutup WFH</h2>

            <p style={{ margin: '10px 0 0', color: '#666' }}>
              {openUntil ? (
                <>
                  Buka lagi tanggal{' '}
                  <strong>
                    {new Date(openUntil).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                </>
              ) : (
                'Buka lagi menyusul'
              )}
            </p>

            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ ...styles.btnGhost, marginTop: 14, maxWidth: 260 }}
            >
              Kembali ke halaman order
            </button>
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

  // normal payment
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={{ ...styles.hero }}>
          <div>
            <div style={styles.badge}>Pembayaran</div>
            <h1 style={styles.title}>Transfer & Upload Bukti</h1>
            <p style={styles.subtitle}>
              Silakan transfer ke rekening berikut, lalu upload bukti
              pembayaran.
            </p>
          </div>

          <div style={styles.heroCard}>
            <div style={styles.heroCardRow}>
              <span style={styles.muted}>Total</span>
              <b style={{ fontSize: 18 }}>{totalText}</b>
            </div>
            <div style={styles.heroCardRow}>
              <span style={styles.muted}>Order ID</span>
              <b>{id}</b>
            </div>
            {order && (
              <div style={{ color: '#666', fontSize: 12, marginTop: 6 }}>
                Order: {order.item} x {order.quantity}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={styles.card}>
            <h3 style={{ margin: 0 }}>Detail Rekening</h3>

            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <div style={styles.row}>
                <span style={styles.muted}>Bank</span>
                <b>BCA</b>
              </div>
              <div style={styles.row}>
                <span style={styles.muted}>Nama</span>
                <b>David Surya</b>
              </div>
              <div style={styles.row}>
                <span style={styles.muted}>No Rek</span>
                <b style={{ fontSize: 18 }}>8030275943</b>
              </div>

              <div style={styles.divider} />

              <div style={styles.row}>
                <span style={styles.muted}>Total</span>
                <b style={{ fontSize: 18 }}>{totalText}</b>
              </div>

              <div style={{ color: '#666', fontSize: 12, marginTop: 6 }}>
                Setelah upload, status <b>paid</b> tetap diverifikasi admin.
              </div>
            </div>
          </div>

          <form onSubmit={onUpload} style={styles.card}>
            <h4 style={{ margin: 0 }}>Upload Bukti Pembayaran</h4>
            <p style={{ margin: '6px 0 12px', color: '#555', fontSize: 13 }}>
              Format: JPG/PNG, max 5MB.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);

                if (preview) URL.revokeObjectURL(preview);
                setPreview(f ? URL.createObjectURL(f) : '');
              }}
              style={styles.input}
            />

            {preview && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                  Preview:
                </div>
                <img
                  src={preview}
                  alt="preview"
                  style={{
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 12,
                    border: '1px solid #eee',
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                disabled={loading}
                style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Uploading...' : 'Upload Bukti'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={styles.btnGhost}
              >
                Kembali
              </button>
            </div>

            {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
          </form>
        </div>

        <footer style={styles.footer}>
          <span style={styles.mutedSmall}>
            © {new Date().getFullYear()} Kopi david.ardi
          </span>
        </footer>

        {/* ✅ SUCCESS MODAL */}
        {successModal && (
          <div style={styles.modalBackdrop} role="dialog" aria-modal="true">
            <div style={styles.modalCard}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
                Order berhasil dibuat.
              </div>
              <div style={{ color: '#666', fontSize: 13, marginBottom: 14 }}>
                Bukti pembayaran sudah diterima.
              </div>

              <button
                type="button"
                style={{ ...styles.btnGhost, width: '100%' }}
                onClick={() => {
                  setSuccessModal(false);
                  navigate('/');
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
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
  container: { maxWidth: 1100, margin: '0 auto', width: '100%' },

  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    border: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    background: '#111',
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
    width: 'fit-content',
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: '-0.02em',
  },
  subtitle: { margin: '8px 0 0', color: '#555', maxWidth: 620 },

  heroCard: {
    width: '100%',
    maxWidth: 320,
    border: '1px solid #eee',
    borderRadius: 14,
    padding: 12,
    background: '#fff',
    display: 'grid',
    gap: 6,
    boxSizing: 'border-box',
  },
  heroCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
  },

  card: {
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: 16,
    padding: 16,
  },

  row: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  muted: { color: '#666' },
  mutedSmall: { color: '#777', fontSize: 12 },

  divider: { height: 1, background: '#eee', margin: '10px 0' },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #e6e6e6',
    outline: 'none',
    fontSize: 14,
    background: '#fff',
  },

  btnPrimary: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #111',
    background: '#111',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
  },

  btnGhost: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },

  footer: {
    marginTop: 18,
    padding: 8,
    display: 'flex',
    justifyContent: 'center',
  },

  // ✅ modal styles
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #eee',
    padding: 16,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  },
};
