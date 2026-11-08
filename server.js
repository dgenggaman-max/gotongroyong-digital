const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const QRCode = require('qrcode');
const { db, Mitra, Orders } = require('./db');
const { Doku } = require('./doku');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS Lengkap (Mencegah error 'Failed to fetch' dari browser / file://)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Client-Id, Request-Id, Request-Timestamp, Signature');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware untuk menangkap raw body khusus webhook DOKU
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Parser Cookie Sederhana
const parseCookies = (req) => {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
};

// Middleware Pelacak Referral (?ref=xxx)
app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const refQuery = req.query.ref;

  if (refQuery) {
    const cleanRef = String(refQuery).toLowerCase().trim();
    const existingMitra = Mitra.getByRef(cleanRef);
    if (existingMitra) {
      if (cookies['last_ref'] !== cleanRef) {
        Mitra.incrementClick(cleanRef);
        res.setHeader('Set-Cookie', `ref=${cleanRef}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax`);
      }
      req.currentRef = cleanRef;
    }
  } else if (cookies['ref']) {
    req.currentRef = cookies['ref'];
  }
  next();
});

// Produk Utama yang Dijual
const PRODUCT = {
  id: 'PROD-BUKU-01',
  name: 'E-Book & Lembar Kerja 30 Hari: Membangun Usaha yang Bernilai',
  author: 'Karya Digital Gotong Royong',
  price: 50000,
  commission: 25000, // 50% bagi hasil langsung ke mitra
  file_path: path.join(__dirname, 'storage', 'products', 'membangun-yang-bernilai.pdf')
};

// Route Halaman
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/mitra', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mitra.html'));
});

app.get('/checkout/:order_id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/success/:order_id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// ================= API ENDPOINTS =================

// Cek Status Konfigurasi DOKU
app.get('/api/doku/config', (req, res) => {
  const cfg = Doku.getConfig();
  res.json({
    isConfigured: cfg.isConfigured,
    clientId: cfg.clientId ? (cfg.clientId.substring(0, 4) + '****') : '',
    isProduction: cfg.isProduction,
    origin: cfg.origin
  });
});

// Simpan Konfigurasi DOKU (Client ID & Secret Key dari https://dashboard.doku.com/bo/dashboard)
app.post('/api/doku/config', (req, res) => {
  const { clientId, secretKey, isProduction } = req.body;
  if (!clientId || !secretKey) {
    return res.status(400).json({ error: 'Client ID dan Secret Key wajib diisi dari dashboard DOKU.' });
  }

  try {
    const saved = Doku.saveConfig({ clientId, secretKey, isProduction: isProduction ?? true });
    res.json({
      success: true,
      message: 'Kredensial DOKU berhasil disimpan dan terhubung!',
      isConfigured: saved.isConfigured,
      isProduction: saved.isProduction
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buat Transaksi Khusus QRIS Dinamis DOKU
app.post('/api/orders/:order_id/doku-qris', async (req, res) => {
  const order = Orders.getById(req.params.order_id);
  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
  }

  if (order.status === 'PAID') {
    return res.json({ success: true, redirect_url: `/success/${order.order_id}` });
  }

  try {
    const checkoutResult = await Doku.createQrisPayment(order);
    Orders.setPaymentUrl(order.order_id, checkoutResult.paymentUrl);
    res.json({
      success: true,
      paymentUrl: checkoutResult.paymentUrl,
      isQris: true
    });
  } catch (err) {
    console.error('DOKU QRIS Error:', err.message);
    res.status(500).json({
      error: err.message,
      needSetup: !Doku.getConfig().isConfigured
    });
  }
});

// Buat Checkout DOKU Nyata (Semua Channel)
app.post('/api/orders/:order_id/doku-checkout', async (req, res) => {
  const order = Orders.getById(req.params.order_id);
  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
  }

  if (order.status === 'PAID') {
    return res.json({ success: true, redirect_url: `/success/${order.order_id}` });
  }

  try {
    const checkoutResult = await Doku.createCheckoutPayment(order);
    Orders.setPaymentUrl(order.order_id, checkoutResult.paymentUrl);
    res.json({
      success: true,
      paymentUrl: checkoutResult.paymentUrl
    });
  } catch (err) {
    console.error('DOKU Checkout Error:', err.message);
    res.status(500).json({
      error: err.message,
      needSetup: !Doku.getConfig().isConfigured
    });
  }
});

// Webhook Notifikasi Pembayaran dari DOKU
app.post('/api/doku/notification', (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const result = Doku.verifyNotification(req.headers, rawBody);

  if (!result.valid) {
    console.warn('DOKU Webhook Invalid Signature/Headers:', result.reason);
    return res.status(401).json({ error: result.reason });
  }

  const { invoice, status } = result;
  console.log(`[DOKU Notification] Invoice: ${invoice}, Status: ${status}`);

  if (status === 'SUCCESS') {
    const updated = Orders.markPaid(invoice);
    if (updated) {
      console.log(`[DOKU Notification] Order ${invoice} lunas. Komisi telah dikreditkan ke mitra.`);
    }
  }

  // Standar respons DOKU webhook
  res.status(200).json({ received: true });
});

// Informasi Produk & Referral Aktif
app.get('/api/product-info', (req, res) => {
  let mitraInfo = null;
  if (req.currentRef) {
    const m = Mitra.getByRef(req.currentRef);
    if (m) {
      mitraInfo = { nama: m.nama, ref_code: m.ref_code };
    }
  }
  const dokuCfg = Doku.getConfig();
  res.json({
    product: {
      id: PRODUCT.id,
      name: PRODUCT.name,
      price: PRODUCT.price,
      commission: PRODUCT.commission
    },
    active_ref: mitraInfo,
    doku_ready: dokuCfg.isConfigured
  });
});

// Ringkasan Publik Platform Gotong Royong
app.get('/api/public-summary', (req, res) => {
  const totalMitra = db.prepare('SELECT COUNT(*) as count FROM mitra').get().count;
  const totalOrders = db.prepare("SELECT COUNT(*) as count, SUM(harga) as omzet, SUM(komisi_mitra) as komisi FROM orders WHERE status = 'PAID'").get();

  res.json({
    total_mitra: totalMitra,
    total_buku_terjual: totalOrders.count || 0,
    total_omzet: totalOrders.omzet || 0,
    total_komisi_tersalurkan: totalOrders.komisi || 0
  });
});

// Pendaftaran Mitra Baru
app.post('/api/mitra/register', (req, res) => {
  const { nama, whatsapp, rekening_bank, custom_ref } = req.body;
  if (!nama || !whatsapp || !rekening_bank) {
    return res.status(400).json({ error: 'Nama, No WhatsApp, dan Data Rekening wajib diisi lengkap.' });
  }

  try {
    const newMitra = Mitra.create(nama, whatsapp, rekening_bank, custom_ref);
    res.json({
      success: true,
      message: 'Pendaftaran mitra gotong royong berhasil!',
      mitra: newMitra
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ambil Data Profil & Statistik Mitra
app.get('/api/mitra/:ref_code', (req, res) => {
  const cleanRef = req.params.ref_code.toLowerCase();
  const mitra = Mitra.getByRef(cleanRef);
  if (!mitra) {
    return res.status(404).json({ error: 'Mitra tidak ditemukan.' });
  }

  const orders = Orders.getByRef(cleanRef);
  res.json({
    mitra: {
      id: mitra.id,
      ref_code: mitra.ref_code,
      nama: mitra.nama,
      whatsapp: mitra.whatsapp,
      rekening_bank: mitra.rekening_bank,
      total_klik: mitra.total_klik,
      total_komisi: mitra.total_komisi,
      saldo_tersedia: mitra.saldo_tersedia,
      created_at: mitra.created_at
    },
    orders: orders.map(o => ({
      order_id: o.order_id,
      pembeli_nama: o.pembeli_nama.substring(0, 3) + '***',
      harga: o.harga,
      komisi: o.komisi_mitra,
      status: o.status,
      created_at: o.created_at
    }))
  });
});

// Buat Pesanan Baru
app.post('/api/orders/create', (req, res) => {
  const { pembeli_nama, pembeli_email, pembeli_wa } = req.body;
  if (!pembeli_nama || !pembeli_email || !pembeli_wa) {
    return res.status(400).json({ error: 'Data pembeli wajib diisi lengkap.' });
  }

  const cookies = parseCookies(req);
  const ref_code = req.currentRef || cookies['ref'] || null;

  const order = Orders.create({
    pembeli_nama,
    pembeli_email,
    pembeli_wa,
    product_id: PRODUCT.id,
    product_name: PRODUCT.name,
    harga: PRODUCT.price,
    ref_code: ref_code,
    komisi_mitra: ref_code ? PRODUCT.commission : 0
  });

  res.json({
    success: true,
    order_id: order.order_id,
    redirect_url: `/checkout/${order.order_id}`
  });
});

// Detail Pesanan untuk Halaman Checkout & Success
app.get('/api/orders/:order_id', async (req, res) => {
  let order = Orders.getById(req.params.order_id);
  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
  }

  // Jika masih PENDING, periksa secara langsung status transaksi ke DOKU
  if (order.status === 'PENDING' && Doku.getConfig().isConfigured) {
    try {
      const dokuStatus = await Doku.checkOrderStatus(order.order_id);
      if (dokuStatus && dokuStatus.transaction?.status === 'SUCCESS') {
        order = Orders.markPaid(order.order_id);
        console.log(`[DOKU Sync] Order ${order.order_id} terverifikasi LUNAS dari DOKU status API.`);
      }
    } catch (e) {
      console.warn('Gagal sinkron status DOKU:', e.message);
    }
  }

  const dokuCfg = Doku.getConfig();
  const isPaid = order.status === 'PAID';

  res.json({
    order_id: order.order_id,
    product_name: order.product_name,
    pembeli_nama: order.pembeli_nama,
    pembeli_email: order.pembeli_email,
    harga: order.harga,
    status: order.status,
    is_paid: isPaid,
    payment_url: order.payment_url,
    ref_code: order.ref_code,
    created_at: order.created_at,
    paid_at: order.paid_at,
    doku_configured: dokuCfg.isConfigured,
    // KUNCI KEAMANAN: download_url HANYA diberikan bila status benar-benar LUNAS (PAID)
    download_url: isPaid ? `/download/${order.download_token}` : null
  });
});

// Generate QRIS Code Image
app.get('/api/orders/:order_id/qr', async (req, res) => {
  const order = Orders.getById(req.params.order_id);
  if (!order) return res.status(404).send('Not Found');

  const qrisPayload = `00020101021226670016ID.CO.GOTONGROYONG.WWW01189360099900000000000215${order.order_id}520458125303360540${order.harga}5802ID5919GOTONG ROYONG KARYA6013KALSEL BERSAMA62070703A016304C7B2`;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrisPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff'
      }
    });
    res.json({ qr_data_url: qrDataUrl, qris_payload: qrisPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulasi Bayar Sukses (Untuk Pengujian & Demo)
app.post('/api/orders/:order_id/simulate-pay', (req, res) => {
  const updatedOrder = Orders.markPaid(req.params.order_id);
  if (!updatedOrder) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
  }

  res.json({
    success: true,
    message: 'Pembayaran berhasil dikonfirmasi!',
    status: updatedOrder.status,
    download_token: updatedOrder.download_token,
    redirect_url: `/success/${updatedOrder.order_id}`
  });
});

// Unduh Dokumen Digital Resmi (Hanya yang Sudah Lunas)
app.get('/download/:download_token', (req, res) => {
  const order = Orders.getByToken(req.params.download_token);
  if (!order) {
    return res.status(404).send('Tautan unduhan tidak valid atau sudah kedaluwarsa.');
  }

  if (order.status !== 'PAID') {
    return res.status(403).send('Pembayaran belum dikonfirmasi.');
  }

  if (!fs.existsSync(PRODUCT.file_path)) {
    return res.status(500).send('Berkas dokumen sedang disiapkan server.');
  }

  res.download(PRODUCT.file_path, 'Membangun_Yang_Bernilai_Workbook_30_Hari.pdf');
});

// Mulai Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Platform Gotong Royong Digital aktif di http://localhost:${PORT}`);
  console.log(`📖 Katalog & Pembelian: http://localhost:${PORT}`);
  console.log(`🤝 Portal Mitra/Afiliasi: http://localhost:${PORT}/mitra`);
  console.log(`💳 Integrasi DOKU: ${Doku.getConfig().isConfigured ? 'TERHUBUNG (' + Doku.getConfig().origin + ')' : 'BELUM DIKONFIGURASI'}`);
  console.log(`=======================================================`);
});
