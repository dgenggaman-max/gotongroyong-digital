const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const QRCode = require('qrcode');
const { db, Mitra, Orders } = require('./db');
const { Doku } = require('./doku');

const app = express();
const PORT = process.env.PORT || 3000;

// Set default URL publik live jika belum ditentukan di environment
if (!process.env.APP_BASE_URL) {
  if (process.env.VERCEL_URL) {
    process.env.APP_BASE_URL = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.RENDER_EXTERNAL_URL) {
    process.env.APP_BASE_URL = process.env.RENDER_EXTERNAL_URL;
  } else {
    process.env.APP_BASE_URL = 'http://localhost:' + PORT;
  }
}

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

// Middleware Pelacak Referral (?ref=xxx) - HARUS SEBELUM express.static agar kunjungan ke /?ref=xxx tercatat
app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const refQuery = req.query.ref;

  if (refQuery) {
    const cleanRef = String(refQuery).toLowerCase().trim();
    const existingMitra = Mitra.getByRef(cleanRef);
    if (existingMitra) {
      if (cookies['last_ref'] !== cleanRef) {
        Mitra.incrementClick(cleanRef);
        res.setHeader('Set-Cookie', [
          `ref=${cleanRef}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax`,
          `last_ref=${cleanRef}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax`
        ]);
      }
      req.currentRef = cleanRef;
    }
  } else if (cookies['ref']) {
    req.currentRef = cookies['ref'];
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Produk Utama & Paket Lengkap yang Dijual
const PRODUCT = {
  id: 'PROD-BUKU-01',
  name: 'Membangun yang Bernilai & Mega Bundle 670+ Produk Digital + 50 Masterclass E-Course',
  author: 'Karya Digital Gotong Royong',
  price: 49999,
  commission: 25000,          // Kompatibilitas mundur
  commission_mitra: 25000,    // Tier 1: 50% (Rp 25.000) bagi hasil langsung ke mitra penjual
  commission_upline: 5000,    // Tier 2: 10% (Rp 5.000) bagi hasil ke upline yang mengajak mitra
  admin_share: 19999,         // Admin: ~40% (Rp 19.999) pemeliharaan sistem & produk
  file_path: path.join(__dirname, 'storage', 'products', 'membangun-yang-bernilai.pdf'),
  bundle_links: {
    folder_univ_digital: 'https://drive.google.com/drive/folders/1xOfbEbwqIffo7tqAEbwNdn0VFN0EQ6L_?usp=drive_link',
    folder_cuanlagi: 'https://drive.google.com/drive/folders/17prCtQGij_EGh_6sCjZvhlnvgOX_KijI',
    spreadsheet_products: 'https://docs.google.com/spreadsheets/d/1_9ND8yru_bVHQAEoMxG35-ZWX2peYOOSEB4l_-rZFKI/edit?usp=sharing'
  }
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
      commission: PRODUCT.commission,
      commission_mitra: PRODUCT.commission_mitra,
      commission_upline: PRODUCT.commission_upline,
      admin_share: PRODUCT.admin_share
    },
    active_ref: mitraInfo,
    doku_ready: dokuCfg.isConfigured
  });
});

// Ringkasan Publik Platform Gotong Royong
app.get('/api/public-summary', (req, res) => {
  const totalMitra = db.prepare('SELECT COUNT(*) as count FROM mitra').get().count;
  const totalOrders = db.prepare("SELECT COUNT(*) as count, SUM(harga) as omzet, SUM(komisi_mitra + komisi_upline) as komisi FROM orders WHERE status = 'PAID'").get();

  res.json({
    total_mitra: totalMitra,
    total_buku_terjual: totalOrders.count || 0,
    total_omzet: totalOrders.omzet || 0,
    total_komisi_tersalurkan: totalOrders.komisi || 0
  });
});

// Pendaftaran Mitra Baru
app.post('/api/mitra/register', (req, res) => {
  const { nama, whatsapp, rekening_bank, bank_nama, bank_nomor, bank_pemilik, custom_ref, upline_ref } = req.body;

  let finalRekening = (rekening_bank || '').trim();
  let finalBankNama = (bank_nama || '').trim() || null;
  let finalBankNomor = (bank_nomor || '').trim() || null;
  let finalBankPemilik = (bank_pemilik || '').trim().toUpperCase() || null;

  // Jika dikirim data rekening terstruktur, bentuk format rapi standar
  if (finalBankNama && finalBankNomor && finalBankPemilik) {
    finalRekening = `${finalBankNama} - ${finalBankNomor} a.n ${finalBankPemilik}`;
  }

  if (!nama || !whatsapp || !finalRekening) {
    return res.status(400).json({ error: 'Nama, No WhatsApp, dan Data Rekening (Bank, No Rekening, Atas Nama) wajib diisi lengkap.' });
  }

  // Deteksi upline dari form body, query/currentRef, atau cookie
  const cookies = parseCookies(req);
  const targetUpline = upline_ref || req.currentRef || cookies['ref'] || cookies['ref_code'] || null;

  try {
    const newMitra = Mitra.create(
      nama,
      whatsapp,
      finalRekening,
      custom_ref,
      targetUpline,
      { bank_nama: finalBankNama, bank_nomor: finalBankNomor, bank_pemilik: finalBankPemilik }
    );
    res.json({
      success: true,
      message: 'Pendaftaran mitra gotong royong berhasil!',
      mitra: newMitra
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ambil Data Profil & Statistik Mitra (Termasuk Tim Binaan / Tier 2)
app.get('/api/mitra/:ref_code', (req, res) => {
  const cleanRef = req.params.ref_code.toLowerCase();
  const mitra = Mitra.getByRef(cleanRef);
  if (!mitra) {
    return res.status(404).json({ error: 'Mitra tidak ditemukan.' });
  }

  const directOrders = Orders.getByRef(cleanRef);
  const paidDirectOrders = directOrders.filter(o => o.status === 'PAID');

  const uplineOrders = Orders.getUplineOrders ? Orders.getUplineOrders(cleanRef) : [];
  const paidUplineOrders = uplineOrders.filter(o => o.status === 'PAID');

  const downlines = Mitra.getDownlines ? Mitra.getDownlines(cleanRef) : [];

  let uplineInfo = null;
  if (mitra.upline_ref) {
    const uplineMitra = Mitra.getByRef(mitra.upline_ref);
    if (uplineMitra) {
      uplineInfo = { nama: uplineMitra.nama, ref_code: uplineMitra.ref_code };
    }
  }

  const totalKomisiLangsung = paidDirectOrders.reduce((sum, o) => sum + (o.komisi_mitra || 0), 0);
  const totalKomisiTim = paidUplineOrders.reduce((sum, o) => sum + (o.komisi_upline || 0), 0);

  res.json({
    mitra: {
      id: mitra.id,
      ref_code: mitra.ref_code,
      nama: mitra.nama,
      whatsapp: mitra.whatsapp,
      rekening_bank: mitra.rekening_bank,
      bank_nama: mitra.bank_nama,
      bank_nomor: mitra.bank_nomor,
      bank_pemilik: mitra.bank_pemilik,
      upline_ref: mitra.upline_ref,
      upline_info: uplineInfo,
      total_klik: mitra.total_klik,
      total_komisi: mitra.total_komisi,
      saldo_tersedia: mitra.saldo_tersedia,
      total_terjual: paidDirectOrders.length,
      total_tim: downlines.length,
      total_tim_terjual: paidUplineOrders.length,
      komisi_langsung: totalKomisiLangsung,
      komisi_tim: totalKomisiTim,
      created_at: mitra.created_at
    },
    downlines: downlines.map(d => ({
      nama: d.nama,
      ref_code: d.ref_code,
      created_at: d.created_at
    })),
    orders: directOrders.map(o => ({
      order_id: o.order_id,
      type: 'DIRECT',
      pembeli_nama: o.pembeli_nama.substring(0, 3) + '***',
      harga: o.harga,
      komisi: o.komisi_mitra,
      status: o.status,
      created_at: o.created_at
    })),
    upline_orders: uplineOrders.map(o => ({
      order_id: o.order_id,
      type: 'UPLINE',
      seller_ref: o.ref_code,
      pembeli_nama: o.pembeli_nama.substring(0, 3) + '***',
      harga: o.harga,
      komisi: o.komisi_upline,
      status: o.status,
      created_at: o.created_at
    }))
  });
});

// Pengajuan Penarikan Saldo Komisi Mitra
app.post('/api/mitra/:ref_code/withdraw', (req, res) => {
  const cleanRef = req.params.ref_code.toLowerCase();
  const { nominal, catatan } = req.body;
  const amount = Number(nominal);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Nominal penarikan dana tidak valid.' });
  }

  try {
    const wd = Mitra.withdraw(cleanRef, amount, catatan || '');
    res.json({
      success: true,
      message: 'Permintaan penarikan komisi berhasil dicatat!',
      withdrawal: wd
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Buat Pesanan Baru (Mendukung Pembagian Keuntungan 2 Tingkat)
app.post('/api/orders/create', (req, res) => {
  const { pembeli_nama, pembeli_email, pembeli_wa } = req.body;
  if (!pembeli_nama || !pembeli_email || !pembeli_wa) {
    return res.status(400).json({ error: 'Data pembeli wajib diisi lengkap.' });
  }

  const cookies = parseCookies(req);
  const ref_code = req.body.ref_code || req.currentRef || cookies['ref'] || cookies['ref_code'] || null;

  let komisi_mitra = 0;
  let upline_ref = null;
  let komisi_upline = 0;

  if (ref_code) {
    const directMitra = Mitra.getByRef(ref_code);
    if (directMitra) {
      // Tier 1: Mitra Penjual Langsung dapat 50% (Rp 25.000)
      komisi_mitra = PRODUCT.commission_mitra;

      // Tier 2: Upline yang mengajak mitra ini dapat 10% (Rp 5.000)
      if (directMitra.upline_ref) {
        const uplineMitra = Mitra.getByRef(directMitra.upline_ref);
        if (uplineMitra) {
          upline_ref = uplineMitra.ref_code;
          komisi_upline = PRODUCT.commission_upline;
        }
      }
    }
  }

  const order = Orders.create({
    pembeli_nama,
    pembeli_email,
    pembeli_wa,
    product_id: PRODUCT.id,
    product_name: PRODUCT.name,
    harga: PRODUCT.price,
    ref_code: ref_code,
    komisi_mitra: komisi_mitra,
    upline_ref: upline_ref,
    komisi_upline: komisi_upline
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
    // KUNCI KEAMANAN: download_url & bundle_access HANYA diberikan bila status benar-benar LUNAS (PAID)
    download_url: isPaid ? `/download/${order.download_token}` : null,
    bundle_access: isPaid ? {
      ebook_pdf: `/download/${order.download_token}`,
      folder_univ_digital: PRODUCT.bundle_links.folder_univ_digital,
      folder_cuanlagi: PRODUCT.bundle_links.folder_cuanlagi,
      spreadsheet_products: PRODUCT.bundle_links.spreadsheet_products
    } : null
  });
});

// Endpoint Katalog 120 Produk Digital Siap Jual (Dalam Paket)
app.get('/api/package-items', (req, res) => {
  const jsonPath = path.join(__dirname, 'storage', 'products', 'package_items.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.json({ success: true, total: data.length, items: data });
    } catch (e) {
      return res.status(500).json({ error: 'Gagal memuat katalog paket produk.' });
    }
  }
  res.json({ success: true, total: 0, items: [] });
});

// Status Channel & QRIS Image Endpoint (Terverifikasi Aman Tanpa String Palsu)
app.get('/api/orders/:order_id/qr', async (req, res) => {
  const order = Orders.getById(req.params.order_id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  // 1. Cek apakah ada file QRIS statis resmi milik toko merchant di storage/qris
  const qrisDir = path.join(__dirname, 'storage', 'qris');
  const possibleFiles = ['merchant_qris.png', 'merchant_qris.jpg', 'merchant_qris.jpeg', 'qris.png'];
  let staticQrBase64 = null;

  for (const filename of possibleFiles) {
    const fullPath = path.join(qrisDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const fileBuf = fs.readFileSync(fullPath);
        const mime = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        staticQrBase64 = `data:${mime};base64,${fileBuf.toString('base64')}`;
        break;
      } catch (e) {}
    }
  }

  if (staticQrBase64) {
    return res.json({
      qris_available: true,
      is_official: true,
      source: 'MERCHANT_OFFICIAL_QRIS',
      qr_data_url: staticQrBase64,
      merchant_name: 'AYAM GEPREK RAJA RASA'
    });
  }

  // 2. Cek status aktifasi channel QRIS resmi di DOKU Production
  try {
    const qrisStatus = await Doku.checkQrisActive();
    if (qrisStatus.isActive) {
      // Jika DOKU sudah menyetujui QRIS, buat pembayaran resmi DOKU QRIS
      const qrisPayment = await Doku.createCheckoutPayment(order, ['QRIS']);
      return res.json({
        qris_available: true,
        is_official: true,
        source: 'DOKU_DYNAMIC_QRIS',
        payment_url: qrisPayment.paymentUrl,
        merchant_name: 'AYAM GEPREK RAJA RASA'
      });
    }

    // 3. Jika QRIS DOKU belum aktif (sedang antrean BI), berikan status transparan
    // JANGAN generate string QR palsu yang menyebabkan error "QRIS terjadi kesalahan" di HP!
    return res.json({
      qris_available: false,
      is_official: false,
      status: 'PENDING_BI_APPROVAL',
      reason: qrisStatus.reason || 'Channel QRIS sedang dalam proses verifikasi aktivasi oleh Bank Indonesia di dashboard DOKU.',
      recommended_channel: 'VIRTUAL_ACCOUNT',
      instruction: 'Silakan gunakan Virtual Account Bank (BCA, Mandiri, BRI, BNI) atau Minimarket (Alfamart/Indomaret) melalui tombol DOKU Resmi.'
    });
  } catch (err) {
    return res.json({
      qris_available: false,
      is_official: false,
      status: 'UNAVAILABLE',
      reason: err.message,
      recommended_channel: 'VIRTUAL_ACCOUNT'
    });
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
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Platform Gotong Royong Digital aktif di http://localhost:${PORT}`);
    console.log(`📖 Katalog & Pembelian: http://localhost:${PORT}`);
    console.log(`🤝 Portal Mitra/Afiliasi: http://localhost:${PORT}/mitra`);
    console.log(`💳 Integrasi DOKU: ${Doku.getConfig().isConfigured ? 'TERHUBUNG (' + Doku.getConfig().origin + ')' : 'BELUM DIKONFIGURASI'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
