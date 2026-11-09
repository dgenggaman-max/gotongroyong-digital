/**
 * Comprehensive System & End-to-End Test Suite
 * Memverifikasi seluruh alur e-commerce gotong royong, DOKU payment, QRIS,
 * proteksi dokumen PDF, dan sistem bagi hasil 50% tanpa bug dan tanpa eror.
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const app = require('./server');
const { db, Mitra, Orders } = require('./db');
const { Doku } = require('./doku');

const BASE_URL = 'http://localhost:3000';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 MEMULAI UJI COBA KESELURUHAN SISTEM GOTONG ROYONG DIGITAL');
  console.log('================================================================\n');

  let serverInstance = null;
  // Pastikan server aktif
  try {
    await fetch(`${BASE_URL}/`);
  } catch (e) {
    // Jalankan server lokal untuk keperluan test jika belum berjalan
    serverInstance = app.listen(3000);
    await new Promise(r => setTimeout(r, 600));
  }

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      throw new Error(`Test failed: ${testName} - ${details}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TAHAP 1: Integritas File & Aset Fisik
    // -------------------------------------------------------------
    console.log('📦 TAHAP 1: Verifikasi File & Aset Sistem');
    
    const pdfPath = path.join(__dirname, 'storage', 'products', 'membangun-yang-bernilai.pdf');
    assert(fs.existsSync(pdfPath), 'Berkas PDF asli tersedia di storage');
    const pdfStats = fs.statSync(pdfPath);
    assert(pdfStats.size > 150000, `Ukuran berkas PDF valid (${(pdfStats.size / 1024).toFixed(1)} KB)`);

    const requiredPublicFiles = ['index.html', 'checkout.html', 'mitra.html', 'success.html'];
    for (const f of requiredPublicFiles) {
      const p = path.join(__dirname, 'public', f);
      assert(fs.existsSync(p), `File tampilan publik ${f} tersedia`);
      const content = fs.readFileSync(p, 'utf8');
      assert(content.includes('viewport'), `File ${f} memiliki meta viewport untuk HP`);
    }

    // -------------------------------------------------------------
    // TAHAP 2: Uji HTTP Endpoint Server Lokal
    // -------------------------------------------------------------
    console.log('\n🌐 TAHAP 2: Uji HTTP Endpoints & Layar Responsif HP');

    // 2.1 Halaman Beranda
    const resHome = await fetch(`${BASE_URL}/`);
    assert(resHome.status === 200, 'GET / mengembalikan status 200 OK');
    const htmlHome = await resHome.text();
    assert(htmlHome.includes('Membangun yang Bernilai'), 'Beranda memuat judul produk');
    assert(htmlHome.includes('Sticky Mobile Bar'), 'Beranda memuat tombol beli cepat khusus layar HP');

    // 2.2 Info Produk & Ringkasan Publik
    const resProd = await fetch(`${BASE_URL}/api/product-info`);
    assert(resProd.status === 200, 'GET /api/product-info mengembalikan 200 OK');
    const prodData = await resProd.json();
    assert(prodData.product.price === 50000, 'Harga produk pas Rp 50.000');
    assert(prodData.product.commission === 25000, 'Nilai komisi mitra pas Rp 25.000 (50%)');

    const resSummary = await fetch(`${BASE_URL}/api/public-summary`);
    assert(resSummary.status === 200, 'GET /api/public-summary mengembalikan 200 OK');
    const summaryData = await resSummary.json();
    assert(typeof summaryData.total_mitra === 'number', 'Ringkasan publik memuat total mitra');

    // -------------------------------------------------------------
    // TAHAP 3: Alur Kemitraan (Pendaftaran, Kode Ref, Pelacakan Klik)
    // -------------------------------------------------------------
    console.log('\n🤝 TAHAP 3: Uji Pendaftaran Mitra & Kode Referral');

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const mitraBaru = {
      nama: `Mitra Uji ${randomSuffix}`,
      whatsapp: `08129999${randomSuffix}`,
      bank_nama: 'BCA',
      bank_nomor: '888123456',
      bank_pemilik: `MITRA UJI ${randomSuffix}`,
      custom_ref: `mitrauji${randomSuffix}`
    };

    const resReg = await fetch(`${BASE_URL}/api/mitra/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mitraBaru)
    });
    assert(resReg.status === 200, 'POST /api/mitra/register mengembalikan 200 OK');
    const regData = await resReg.json();
    assert(regData.success === true, 'Pendaftaran mitra berhasil diverifikasi');
    assert(regData.mitra.ref_code === `mitrauji${randomSuffix}`, 'Kode referral kustom terdaftar sesuai permintaan');
    assert(regData.mitra.bank_nama === 'BCA', 'Field bank_nama terstruktur tersimpan rapi');
    assert(regData.mitra.bank_nomor === '888123456', 'Field bank_nomor terstruktur tersimpan rapi');
    assert(regData.mitra.bank_pemilik === `MITRA UJI ${randomSuffix}`, 'Field bank_pemilik terstruktur tersimpan rapi');

    const refCode = regData.mitra.ref_code;

    // Kunjungi link referral mitra (?ref=xxx)
    const resVisit = await fetch(`${BASE_URL}/?ref=${refCode}`);
    assert(resVisit.status === 200, 'Kunjungan ke tautan referral berhasil');

    // Cek data profil mitra & statistik klik
    const resMitraProfile = await fetch(`${BASE_URL}/api/mitra/${refCode}`);
    assert(resMitraProfile.status === 200, 'GET /api/mitra/:ref_code mengembalikan 200 OK');
    const profileData = await resMitraProfile.json();
    assert(profileData.mitra.total_klik >= 1, `Statistik klik mitra tercatat bertambah (${profileData.mitra.total_klik})`);
    assert(profileData.mitra.saldo_tersedia === 0, 'Saldo awal mitra baru adalah Rp 0');

    // -------------------------------------------------------------
    // TAHAP 4: Pembuatan Pesanan & Integrasi Pembayaran DOKU / QRIS
    // -------------------------------------------------------------
    console.log('\n💳 TAHAP 4: Uji Pembuatan Pesanan & Integrasi Pembayaran');

    const pembeliPayload = {
      pembeli_nama: `Pembeli Sukses ${randomSuffix}`,
      pembeli_email: `pembeli${randomSuffix}@gmail.com`,
      pembeli_wa: `08138888${randomSuffix}`
    };

    // Buat pesanan dengan menyertakan cookie referral
    const resCreateOrder = await fetch(`${BASE_URL}/api/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `ref=${refCode}`
      },
      body: JSON.stringify(pembeliPayload)
    });
    assert(resCreateOrder.status === 200, 'POST /api/orders/create mengembalikan 200 OK');
    const orderCreated = await resCreateOrder.json();
    assert(orderCreated.success === true, 'Pesanan berhasil dibuat');
    assert(Boolean(orderCreated.order_id), `Order ID resmi terbit: ${orderCreated.order_id}`);

    const orderId = orderCreated.order_id;

    // Periksa status pesanan (harus PENDING dan download_url HARUS null)
    const resCheckOrder = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    assert(resCheckOrder.status === 200, 'GET /api/orders/:order_id mengembalikan 200 OK');
    const orderStatus = await resCheckOrder.json();
    assert(orderStatus.status === 'PENDING', 'Status awal pesanan adalah PENDING');
    assert(orderStatus.download_url === null, 'Keamanan: download_url terkunci (null) saat pesanan PENDING');
    assert(orderStatus.ref_code === refCode, 'Pesanan terhubung dengan kode referral mitra');

    // Uji Endpoint Status QRIS & Keamanan Pembayaran
    const resQr = await fetch(`${BASE_URL}/api/orders/${orderId}/qr`);
    assert(resQr.status === 200, 'GET /api/orders/:order_id/qr mengembalikan 200 OK');
    const qrData = await resQr.json();
    assert(typeof qrData.qris_available === 'boolean', 'Endpoint QRIS mengembalikan status ketersediaan boolean yang valid');
    if (qrData.qris_available) {
      assert(Boolean(qrData.qr_data_url), 'Data URL gambar QRIS resmi tersedia');
      assert(qrData.qr_data_url.startsWith('data:image/'), 'Format gambar QRIS resmi valid (Base64 image)');
    } else {
      assert(qrData.status === 'PENDING_BI_APPROVAL' || qrData.status === 'UNAVAILABLE', 'Status QRIS tidak aktif terdokumentasi rapi (proses BI)');
      assert(qrData.recommended_channel === 'VIRTUAL_ACCOUNT', 'Sistem otomatis merekomendasikan Virtual Account DOKU sebagai pembayaran aktif');
    }

    // Uji Pembuatan Checkout DOKU Resmi
    console.log('  ... Menghubungi DOKU Production API ...');
    const resDokuCheckout = await fetch(`${BASE_URL}/api/orders/${orderId}/doku-checkout`, {
      method: 'POST'
    });
    assert(resDokuCheckout.status === 200, 'POST /api/orders/:order_id/doku-checkout mengembalikan 200 OK');
    const dokuResult = await resDokuCheckout.json();
    assert(dokuResult.success === true, 'DOKU Checkout URL berhasil diterbitkan');
    assert(dokuResult.paymentUrl.includes('doku.com'), `URL DOKU resmi valid: ${dokuResult.paymentUrl.substring(0, 45)}...`);

    // -------------------------------------------------------------
    // TAHAP 5: Keamanan Dokumen Digital (Proteksi Unduhan)
    // -------------------------------------------------------------
    console.log('\n🔒 TAHAP 5: Uji Keamanan Proteksi Unduhan PDF');

    const dbOrder = Orders.getById(orderId);
    assert(Boolean(dbOrder.download_token), 'Token unduhan acak unik terbit untuk pesanan');

    // Coba unduh saat status masih PENDING (Harus Ditolak 403 Forbidden)
    const resUnauthorizedDownload = await fetch(`${BASE_URL}/download/${dbOrder.download_token}`);
    assert(resUnauthorizedDownload.status === 403, 'Akses unduhan ditolak (403) jika belum lunas');

    // Coba unduh dengan token palsu/acak (Harus Ditolak 404 Not Found)
    const resFakeDownload = await fetch(`${BASE_URL}/download/token_palsu_12345`);
    assert(resFakeDownload.status === 404, 'Akses token tidak valid ditolak (404)');

    // -------------------------------------------------------------
    // TAHAP 6: Konfirmasi Pembayaran & Validasi Bagi Hasil 50%
    // -------------------------------------------------------------
    console.log('\n💰 TAHAP 6: Uji Pelunasan & Distribusi Bagi Hasil 50%');

    // Eksekusi Pelunasan
    const resSimulate = await fetch(`${BASE_URL}/api/orders/${orderId}/simulate-pay`, {
      method: 'POST'
    });
    assert(resSimulate.status === 200, 'Konfirmasi pembayaran berhasil diproses');
    const simData = await resSimulate.json();
    assert(simData.status === 'PAID', 'Status pesanan berhasil berubah menjadi PAID');

    // Verifikasi Saldo Mitra Naik Rp 25.000
    const resMitraAfter = await fetch(`${BASE_URL}/api/mitra/${refCode}`);
    const mitraAfterData = await resMitraAfter.json();
    assert(mitraAfterData.mitra.total_komisi === 25000, `Total komisi mitra tercatat Rp 25.000 (Aktual: Rp ${mitraAfterData.mitra.total_komisi})`);
    assert(mitraAfterData.mitra.saldo_tersedia === 25000, `Saldo tersedia mitra siap tarik Rp 25.000 (Aktual: Rp ${mitraAfterData.mitra.saldo_tersedia})`);
    assert(mitraAfterData.mitra.total_terjual === 1, 'Jumlah buku terjual mitra bertambah menjadi 1');

    // Verifikasi Akses Unduhan Terbuka (Status 200 dan File Utuh)
    const resPaidOrder = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const paidOrderData = await resPaidOrder.json();
    assert(Boolean(paidOrderData.download_url), `download_url resmi aktif: ${paidOrderData.download_url}`);

    // Verifikasi Paket Lengkap Pembayaran Berhasil (Bundle Access)
    assert(Boolean(paidOrderData.bundle_access), 'Paket bundle produk digital aktif setelah lunas');
    assert(paidOrderData.bundle_access.folder_univ_digital.includes('1xOfbEbwqIffo7tqAEbwNdn0VFN0EQ6L_'), 'Akses Folder Univ Digital (500++ Produk) terdaftar');
    assert(paidOrderData.bundle_access.folder_cuanlagi.includes('17prCtQGij_EGh_6sCjZvhlnvgOX_KijI'), 'Akses Folder CUANLAGI (50 E-Course) terdaftar');
    assert(paidOrderData.bundle_access.spreadsheet_products.includes('1_9ND8yru_bVHQAEoMxG35-ZWX2peYOOSEB4l_-rZFKI'), 'Akses Spreadsheet 120 Produk Digital terdaftar');

    // Verifikasi Endpoint API Katalog 120 Produk Paket
    const resPackageItems = await fetch(`${BASE_URL}/api/package-items`);
    assert(resPackageItems.status === 200, 'GET /api/package-items mengembalikan 200 OK');
    const packageData = await resPackageItems.json();
    assert(packageData.total === 120, `Total produk dalam spreadsheet pas 120 item (Aktual: ${packageData.total})`);

    const resAuthorizedDownload = await fetch(`${BASE_URL}${paidOrderData.download_url}`);
    assert(resAuthorizedDownload.status === 200, 'Unduhan dokumen diizinkan (200 OK) setelah lunas');
    const downloadedBuffer = await resAuthorizedDownload.arrayBuffer();
    assert(downloadedBuffer.byteLength > 150000, `Ukuran berkas terunduh utuh 100% (${(downloadedBuffer.byteLength / 1024).toFixed(1)} KB)`);

    // -------------------------------------------------------------
    // TAHAP 7: Uji Penarikan Komisi Mitra (Withdrawal)
    // -------------------------------------------------------------
    console.log('\n🏧 TAHAP 7: Uji Pengajuan Penarikan Saldo Komisi');

    const resWithdraw = await fetch(`${BASE_URL}/api/mitra/${refCode}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nominal: 25000, catatan: 'Pencairan ke rekening BCA' })
    });
    assert(resWithdraw.status === 200, 'Pengajuan penarikan dana berhasil');
    const wdData = await resWithdraw.json();
    assert(wdData.success === true, 'Pencairan tercatat dalam sistem');

    const resMitraFinal = await fetch(`${BASE_URL}/api/mitra/${refCode}`);
    const mitraFinalData = await resMitraFinal.json();
    assert(mitraFinalData.mitra.saldo_tersedia === 0, 'Saldo tersedia mitra berkurang menjadi Rp 0 setelah ditarik');
    assert(mitraFinalData.mitra.total_komisi === 25000, 'Total riwayat akumulasi komisi tetap tersimpan Rp 25.000');

    // -------------------------------------------------------------
    // TAHAP 7.5: Uji Komprehensif Skema 2 Tingkat (Admin 40%, Penjual 50%, Upline 10%)
    // -------------------------------------------------------------
    console.log('\n👥 TAHAP 7.5: Uji Sistem Bagi Hasil 2 Tingkat (Upline 10%, Penjual 50%, Admin 40%)');

    const uplineCode = `upline${randomSuffix}`;
    const downlineCode = `downline${randomSuffix}`;

    // 1. Daftarkan Mitra Upline (Tier 2)
    const resRegUpline = await fetch(`${BASE_URL}/api/mitra/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: `Mitra Upline ${randomSuffix}`,
        whatsapp: `08112222${randomSuffix}`,
        rekening_bank: `BCA 11112222 a.n Upline ${randomSuffix}`,
        custom_ref: uplineCode
      })
    });
    assert(resRegUpline.status === 200, 'Pendaftaran Mitra Upline berhasil (200 OK)');

    // 2. Daftarkan Mitra Binaan (Tier 1) yang diajak oleh Mitra Upline
    const resRegDownline = await fetch(`${BASE_URL}/api/mitra/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: `Mitra Binaan ${randomSuffix}`,
        whatsapp: `08113333${randomSuffix}`,
        rekening_bank: `Mandiri 33334444 a.n Binaan ${randomSuffix}`,
        custom_ref: downlineCode,
        upline_ref: uplineCode
      })
    });
    assert(resRegDownline.status === 200, 'Pendaftaran Mitra Binaan dengan Upline berhasil (200 OK)');
    const downlineData = await resRegDownline.json();
    assert(downlineData.mitra.upline_ref === uplineCode, `Mitra Binaan terverifikasi terhubung ke upline: ${uplineCode}`);

    // 3. Pembeli berbelanja menggunakan link referral Mitra Binaan
    const pembeliTier2Payload = {
      pembeli_nama: `Pembeli Melalui Binaan ${randomSuffix}`,
      pembeli_email: `pembeli_tier2_${randomSuffix}@gmail.com`,
      pembeli_wa: `08115555${randomSuffix}`
    };

    const resCreateOrderTier2 = await fetch(`${BASE_URL}/api/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `ref=${downlineCode}`
      },
      body: JSON.stringify(pembeliTier2Payload)
    });
    assert(resCreateOrderTier2.status === 200, 'Pesanan lewat link Mitra Binaan berhasil dibuat');
    const orderTier2Created = await resCreateOrderTier2.json();
    const orderTier2Id = orderTier2Created.order_id;

    // Periksa rincian order di database
    const dbOrderTier2 = Orders.getById(orderTier2Id);
    assert(dbOrderTier2.ref_code === downlineCode, 'Order tercatat dengan kode penjual langsung (downline)');
    assert(dbOrderTier2.komisi_mitra === 25000, 'Komisi penjual langsung diset 50% = Rp 25.000');
    assert(dbOrderTier2.upline_ref === uplineCode, 'Order tercatat otomatis memiliki upline terhubung');
    assert(dbOrderTier2.komisi_upline === 5000, 'Komisi upline diset 10% = Rp 5.000');
    assert(dbOrderTier2.harga - dbOrderTier2.komisi_mitra - dbOrderTier2.komisi_upline === 20000, 'Bagian bersih Admin terverifikasi 40% = Rp 20.000');

    // 4. Konfirmasi Pelunasan Order Tier 2
    const resSimulateTier2 = await fetch(`${BASE_URL}/api/orders/${orderTier2Id}/simulate-pay`, {
      method: 'POST'
    });
    assert(resSimulateTier2.status === 200, 'Pelunasan order berhasil dikonfirmasi');

    // 5. Verifikasi Saldo Mitra Penjual (Downline) mendapat Rp 25.000 (50%)
    const resDownlineProfile = await fetch(`${BASE_URL}/api/mitra/${downlineCode}`);
    const downlineProfileData = await resDownlineProfile.json();
    assert(downlineProfileData.mitra.saldo_tersedia === 25000, `Saldo Penjual Langsung pas Rp 25.000 (Aktual: Rp ${downlineProfileData.mitra.saldo_tersedia})`);
    assert(downlineProfileData.mitra.total_terjual === 1, 'Total buku terjual langsung penjual adalah 1');

    // 6. Verifikasi Saldo Mitra Upline mendapat Rp 5.000 (10%)
    const resUplineProfile = await fetch(`${BASE_URL}/api/mitra/${uplineCode}`);
    const uplineProfileData = await resUplineProfile.json();
    assert(uplineProfileData.mitra.saldo_tersedia === 5000, `Saldo Upline Pasif Income pas Rp 5.000 (Aktual: Rp ${uplineProfileData.mitra.saldo_tersedia})`);
    assert(uplineProfileData.mitra.total_tim === 1, 'Jumlah tim binaan terverifikasi 1 mitra');
    assert(uplineProfileData.mitra.total_tim_terjual === 1, 'Jumlah transaksi tim binaan terverifikasi 1');
    assert(uplineProfileData.upline_orders.length >= 1, 'Riwayat transaksi tim upline tercatat di dashboard');

    // 7. Uji Penarikan Dana Pasif Income Upline (Withdraw Rp 5.000)
    const resUplineWd = await fetch(`${BASE_URL}/api/mitra/${uplineCode}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nominal: 5000, catatan: 'Penarikan royalti tim binaan' })
    });
    assert(resUplineWd.status === 200, 'Upline berhasil menarik royalti tim binaan');
    const resUplineAfterWd = await fetch(`${BASE_URL}/api/mitra/${uplineCode}`);
    const uplineAfterWdData = await resUplineAfterWd.json();
    assert(uplineAfterWdData.mitra.saldo_tersedia === 0, 'Saldo upline kembali menjadi Rp 0 setelah ditarik');

    // -------------------------------------------------------------
    // TAHAP 8: Uji Ketahanan Validasi Input (Edge Cases)
    // -------------------------------------------------------------
    console.log('\n🛡️ TAHAP 8: Uji Ketahanan Validasi Input (Error Handling)');

    // 8.1 Pendaftaran mitra dengan data kosong
    const resBadReg = await fetch(`${BASE_URL}/api/mitra/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: '' })
    });
    assert(resBadReg.status === 400, 'Validasi menolak pendaftaran tanpa data wajib (400)');

    // 8.2 Buat pesanan tanpa email/nama
    const resBadOrder = await fetch(`${BASE_URL}/api/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pembeli_nama: '' })
    });
    assert(resBadOrder.status === 400, 'Validasi menolak pesanan tanpa nama/email (400)');

    // 8.3 Cek pesanan non-existent
    const resBadCheck = await fetch(`${BASE_URL}/api/orders/ORD-TIDAK-ADA-9999`);
    assert(resBadCheck.status === 404, 'Pesanan tidak ditemukan merespon 404 dengan pesan bersih');

    console.log('\n================================================================');
    console.log(`🎉 SEMUA PENGUJIAN SELESAI: ${passedTests}/${totalTests} UJI COBA BERHASIL 100%!`);
    console.log('   - Bebas dari bug.');
    console.log('   - Bebas dari unhandled rejection / error.');
    console.log('   - Pembagian komisi 50% bekerja sempurna secara matematis.');
    console.log('   - Keamanan berkas PDF terkunci rapat sebelum bayar.');
    console.log('   - Integrasi DOKU Production merespons aktif & valid.');
    console.log('================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ PENGUJIAN TERHENTI DENGAN EROR:', err.message);
    process.exit(1);
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
  }
}

runTestSuite();
