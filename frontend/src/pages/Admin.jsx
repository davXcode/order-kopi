import { useEffect, useMemo, useState } from 'react';
import {
  API_BASE,
  fetchOrders,
  fetchStats,
  setPaid,
  fetchStore,
  setStoreOpen,
} from '../api';
import * as XLSX from 'xlsx';

function rupiah(n) {
  return `Rp${Number(n ?? 0).toLocaleString('id-ID')}`;
}

function ymdToLocalDate(ymd) {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatTanggalId(ymd) {
  const dt = ymdToLocalDate(ymd);
  if (!dt) return '-';
  return dt.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateId(dateObj) {
  return dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addDays(dateObj, days) {
  return new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate() + days
  );
}

function sumRevenue(list) {
  return list.reduce((acc, o) => acc + Number(o.totalPrice || 0), 0);
}

// Support:
// - URL penuh (Cloudinary): https://...
// - path lama: /uploads/xxx.jpg
function resolveProofUrl(paymentProofUrl) {
  if (!paymentProofUrl) return '';
  if (typeof paymentProofUrl !== 'string') return '';
  const trimmed = paymentProofUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // fallback untuk data lama (path relatif)
  return `${API_BASE}${trimmed}`;
}

function exportOrdersToExcel({ filename, orders, meta }) {
  const ordersSheet = XLSX.utils.json_to_sheet(
    orders.map((o) => ({
      orderId: o.id,
      createdAt: new Date(o.createdAt).toLocaleString('id-ID'),
      customerName: o.customerName,
      item: o.item,
      qty: o.quantity,
      unitPrice: o.unitPrice,
      totalPrice: o.totalPrice,
      paid: o.paid ? 'PAID' : 'UNPAID',
      paymentProofUrl: resolveProofUrl(o.paymentProofUrl) || '',
    }))
  );

  const summaryRows = [
    { key: 'Tanggal order dibuat', value: meta.createdLabel },
    { key: 'Untuk besok', value: meta.tomorrowLabel },
    { key: 'Status bayar', value: meta.paidFilterText },
    { key: 'Jumlah order (sesuai filter)', value: meta.filteredTotalOrders },
    {
      key: 'Revenue (sesuai filter)',
      value: rupiah(meta.filteredTotalRevenue),
    },
    { key: 'Jumlah order (overall)', value: meta.overallTotalOrders },
    { key: 'Revenue (overall)', value: rupiah(meta.overallTotalRevenue) },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, ordersSheet, 'Orders');

  XLSX.writeFile(wb, filename);
}

export default function Admin() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [sort, setSort] = useState('desc');
  const [paidFilter, setPaidFilter] = useState('all');
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const [storeOpen, setStoreOpenState] = useState(true);
  const [closeFrom, setCloseFrom] = useState('');
  const [openUntil, setOpenUntil] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD

  const baseDate = useMemo(
    () => (dateFilter ? ymdToLocalDate(dateFilter) : new Date()),
    [dateFilter]
  );
  const createdLabel = baseDate ? formatDateId(baseDate) : '-';
  const tomorrowLabel = baseDate ? formatDateId(addDays(baseDate, 1)) : '-';

  const paidFilterText =
    paidFilter === 'paid'
      ? 'Sudah dibayar'
      : paidFilter === 'unpaid'
      ? 'Belum dibayar'
      : 'Semua';

  const filteredTotalOrders = orders.length;
  const filteredTotalRevenue = useMemo(() => sumRevenue(orders), [orders]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function load() {
    setError('');
    try {
      const [s, o, store] = await Promise.all([
        fetchStats(),
        fetchOrders(sort, paidFilter, dateFilter),
        fetchStore(),
      ]);

      setStats(s);
      setOrders(o);

      setStoreOpenState(!!store.open);
      setCloseFrom(store.closeFrom ?? '');
      setOpenUntil(store.openUntil ?? '');
    } catch (e) {
      setError(e?.message || 'Gagal load data');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, paidFilter, dateFilter]);

  const rows = useMemo(() => {
    return orders.map((o) => ({
      ...o,
      createdAtText: new Date(o.createdAt).toLocaleString('id-ID'),
      proofUrl: resolveProofUrl(o.paymentProofUrl),
    }));
  }, [orders]);

  async function onTogglePaid(orderId, nextPaid) {
    setError('');
    setUpdatingId(orderId);
    try {
      await setPaid(orderId, nextPaid);
      await load();
    } catch (e) {
      setError(e?.message || 'Gagal update paid');
    } finally {
      setUpdatingId(null);
    }
  }

  async function onToggleStore(nextOpen) {
    setError('');
    try {
      setStoreOpenState(nextOpen);
      await setStoreOpen(nextOpen, closeFrom || null, openUntil || null);
      await load();
    } catch (e) {
      setError(e?.message || 'Gagal update status toko');
      await load();
    }
  }

  async function onChangeCloseFrom(nextDate) {
    setError('');
    setCloseFrom(nextDate);
    try {
      await setStoreOpen(storeOpen, nextDate || null, openUntil || null);
      await load();
    } catch (e) {
      setError(e?.message || 'Gagal update tanggal tutup');
      await load();
    }
  }

  async function onChangeOpenUntil(nextDate) {
    setError('');
    setOpenUntil(nextDate);
    try {
      await setStoreOpen(storeOpen, closeFrom || null, nextDate || null);
      await load();
    } catch (e) {
      setError(e?.message || 'Gagal update tanggal buka');
      await load();
    }
  }

  function onExportFiltered() {
    exportOrdersToExcel({
      filename: `kopi-orders-${dateFilter || 'today'}-filtered.xlsx`,
      orders,
      meta: {
        createdLabel,
        tomorrowLabel,
        paidFilterText,
        filteredTotalOrders,
        filteredTotalRevenue,
        overallTotalOrders: stats.totalOrders,
        overallTotalRevenue: stats.totalRevenue,
      },
    });
  }

  async function onExportAll() {
    setError('');
    try {
      const all = await fetchOrders('desc', 'all', '');
      exportOrdersToExcel({
        filename: `kopi-orders-all.xlsx`,
        orders: all,
        meta: {
          createdLabel: 'Semua tanggal',
          tomorrowLabel: '-',
          paidFilterText: 'Semua',
          filteredTotalOrders: all.length,
          filteredTotalRevenue: sumRevenue(all),
          overallTotalOrders: all.length,
          overallTotalRevenue: sumRevenue(all),
        },
      });
    } catch (e) {
      setError(e?.message || 'Gagal export semua order');
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HERO */}
        <div
          style={{ ...styles.hero, flexDirection: isMobile ? 'column' : 'row' }}
        >
          <div>
            <div style={styles.badge}>Admin</div>
            <h1 style={styles.title}>Dashboard Kopi david.ardi</h1>
            <p style={styles.subtitle}>
              Pantau order, revenue, bukti transfer, dan atur jadwal buka/tutup.
            </p>

            <div style={styles.heroMini}>
              <div style={styles.heroMiniRow}>
                <span style={styles.muted}>Tutup mulai</span>
                <b>{closeFrom ? formatTanggalId(closeFrom) : '-'}</b>
              </div>
              <div style={styles.heroMiniRow}>
                <span style={styles.muted}>Buka lagi</span>
                <b>{openUntil ? formatTanggalId(openUntil) : '-'}</b>
              </div>
            </div>
          </div>

          <div style={styles.heroCard}>
            <div style={styles.heroCardRow}>
              <span style={styles.muted}>Total Order</span>
              <b style={{ fontSize: 18 }}>{stats.totalOrders}</b>
            </div>
            <div style={styles.heroCardRow}>
              <span style={styles.muted}>Total Revenue</span>
              <b style={{ fontSize: 18 }}>{rupiah(stats.totalRevenue)}</b>
            </div>
            <div style={styles.divider} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontWeight: 800 }}>Toko</span>
              <span
                style={{
                  ...styles.pill,
                  ...(storeOpen ? styles.pillOn : styles.pillOff),
                }}
              >
                {storeOpen ? 'Buka' : 'Tutup'}
              </span>
            </div>

            <button onClick={load} style={styles.primaryBtn}>
              Refresh
            </button>
          </div>
        </div>

        {/* KONTROL */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Kontrol</h2>
            <span style={styles.chip}>Filter & Jadwal</span>
          </div>
          <p style={styles.cardDesc}>Semua setting ada di sini biar rapi.</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 12,
              alignItems: 'stretch',
            }}
          >
            {/* Status toko */}
            <div style={styles.fieldCard}>
              <div style={styles.fieldHead}>
                <div>
                  <div style={styles.label}>Status toko</div>
                  <div style={styles.mutedSmall}>Toggle buka/tutup manual</div>
                </div>

                <label style={styles.switchWrap}>
                  <input
                    type="checkbox"
                    checked={storeOpen}
                    onChange={(e) => onToggleStore(e.target.checked)}
                  />
                  <span style={{ fontWeight: 900 }}>
                    {storeOpen ? 'Buka' : 'Tutup'}
                  </span>
                </label>
              </div>
            </div>

            {/* Filter */}
            <div style={styles.fieldCard}>
              <div style={styles.fieldHead}>
                <div>
                  <div style={styles.label}>Filter order</div>
                  <div style={styles.mutedSmall}>
                    Tanggal, sort, dan status bayar
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                  gap: 10,
                }}
              >
                <div>
                  <div style={styles.smallLabel}>Tanggal</div>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <div style={styles.smallLabel}>Sort tanggal</div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    style={styles.input}
                  >
                    <option value="desc">Terbaru</option>
                    <option value="asc">Terlama</option>
                  </select>
                </div>

                <div>
                  <div style={styles.smallLabel}>Status bayar</div>
                  <select
                    value={paidFilter}
                    onChange={(e) => setPaidFilter(e.target.value)}
                    style={styles.input}
                  >
                    <option value="all">Semua</option>
                    <option value="paid">Sudah dibayar</option>
                    <option value="unpaid">Belum dibayar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scheduler */}
            <div style={styles.fieldCard}>
              <div style={styles.fieldHead}>
                <div>
                  <div style={styles.label}>Jadwal WFH (tutup)</div>
                  <div style={styles.mutedSmall}>Tutup mulai & buka lagi</div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 10,
                }}
              >
                <div>
                  <div style={styles.smallLabel}>Tutup mulai</div>
                  <input
                    type="date"
                    value={closeFrom || ''}
                    onChange={(e) => onChangeCloseFrom(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <div style={styles.smallLabel}>Buka lagi</div>
                  <input
                    type="date"
                    value={openUntil || ''}
                    onChange={(e) => onChangeOpenUntil(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* Export + Tip + Error */}
            <div style={styles.fieldCard}>
              <div style={styles.label}>Export</div>
              <div style={styles.mutedSmall}>
                Excel sesuai filter atau semua data
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onExportFiltered}
                  style={styles.btnGhost}
                >
                  Export (sesuai filter)
                </button>
                <button
                  type="button"
                  onClick={onExportAll}
                  style={styles.btnGhost}
                >
                  Export (semua order)
                </button>
              </div>

              <div
                style={{ ...styles.mutedSmall, lineHeight: 1.5, marginTop: 8 }}
              >
                Tip: Jangan auto-set <b>paid</b> saat bukti upload. Verifikasi
                manual lewat checklist.
              </div>

              {error && (
                <div
                  style={{ ...styles.toast, ...styles.toastErr, marginTop: 10 }}
                >
                  Error: {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ORDERS */}
        <div style={styles.card}>
          <div style={styles.ordersHeader}>
            <div>
              <h2 style={styles.cardTitle}>Orders</h2>
              <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
                Catatan: Tabel ini menampilkan tanggal order dibuat{' '}
                <strong>({createdLabel})</strong> untuk besok{' '}
                <strong>({tomorrowLabel})</strong>.
              </div>
            </div>

            <span style={styles.chip}>{rows.length} data</span>
          </div>

          <div style={styles.tableWrap}>
            <div style={{ overflowX: 'auto' }}>
              <table
                width="100%"
                cellPadding="10"
                style={{ borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr style={{ background: '#f6f6f6' }}>
                    <th align="left">Tanggal</th>
                    <th align="left">Order ID</th>
                    <th align="left">Nama</th>
                    <th align="left">Item</th>
                    <th align="right">Qty</th>
                    <th align="right">Unit</th>
                    <th align="right">Total</th>
                    <th align="center">Paid</th>
                    <th align="left">Bukti</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} style={{ borderTop: '1px solid #eee' }}>
                      <td>{o.createdAtText}</td>

                      <td
                        style={{
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 12,
                        }}
                      >
                        {o.id}
                      </td>

                      <td>{o.customerName}</td>
                      <td>{o.item}</td>
                      <td align="right">{o.quantity}</td>
                      <td align="right">
                        Rp{o.unitPrice.toLocaleString('id-ID')}
                      </td>
                      <td align="right">
                        Rp{o.totalPrice.toLocaleString('id-ID')}
                      </td>

                      <td align="center">
                        <input
                          type="checkbox"
                          checked={!!o.paid}
                          disabled={updatingId === o.id}
                          onChange={(e) => onTogglePaid(o.id, e.target.checked)}
                          title={o.paid ? 'Sudah dibayar' : 'Belum dibayar'}
                        />
                      </td>

                      <td>
                        {o.proofUrl ? (
                          <a
                            href={o.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <img
                              src={o.proofUrl}
                              alt="bukti"
                              style={{
                                width: 52,
                                height: 52,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '1px solid #eee',
                              }}
                              onError={(e) => {
                                // fallback kalau image broken (optional)
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span>Lihat</span>
                          </a>
                        ) : (
                          <span style={{ color: '#777' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        style={{ padding: 16, textAlign: 'center' }}
                      >
                        Belum ada order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
  title: { margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em' },
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

  heroMini: {
    marginTop: 12,
    border: '1px solid #eee',
    borderRadius: 14,
    padding: 12,
    background: '#fff',
    maxWidth: 360,
  },
  heroMiniRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
  },

  divider: { height: 1, background: '#e9e9e9', margin: '10px 0' },

  pill: {
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: '1px solid #eee',
  },
  pillOn: { background: '#f1fff5', borderColor: '#bfe8c8', color: '#166534' },
  pillOff: { background: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239' },

  primaryBtn: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #111',
    background: '#111',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 900,
    marginTop: 8,
  },

  card: {
    border: '1px solid #eee',
    borderRadius: 16,
    padding: 16,
    background: '#fff',
    marginBottom: 16,
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

  ordersHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },

  chip: {
    border: '1px solid #eee',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    background: '#fafafa',
    fontWeight: 800,
    whiteSpace: 'nowrap',
    height: 'fit-content',
  },

  fieldCard: {
    border: '1px solid #eee',
    borderRadius: 14,
    padding: 12,
    background: '#fafafa',
    display: 'grid',
    gap: 10,
    alignContent: 'start',
    minHeight: 110,
  },
  fieldHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  label: { fontSize: 12, fontWeight: 900, color: '#333' },
  smallLabel: { fontSize: 12, fontWeight: 800, color: '#444', marginBottom: 6 },

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

  switchWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #e6e6e6',
    background: '#fff',
    height: 42,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
  },

  btnGhost: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
  },

  tableWrap: { border: '1px solid #eee', borderRadius: 14, overflow: 'hidden' },

  toast: {
    padding: 12,
    borderRadius: 14,
    border: '1px solid #eee',
    fontSize: 13,
  },
  toastErr: { background: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239' },

  muted: { color: '#666' },
  mutedSmall: { color: '#777', fontSize: 12 },
  footer: {
    marginTop: 8,
    padding: 8,
    display: 'flex',
    justifyContent: 'center',
  },
};
