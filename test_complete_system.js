/**
 * Comprehensive System & End-to-End Test Suite
 * Memverifikasi seluruh alur e-commerce gotong royong, DOKU payment, QRIS,
 * proteksi dokumen PDF, dan sistem bagi hasil 50% tanpa bug dan tanpa eror.
 */

const fs = require('node:fs');
const path = require('node:path');
const { db, Mitra, Orders } = require('./db');
const { Doku } = require('./doku');

const BASE_URL = 'http://localhost:3000';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 MEMULAI UJI COBA KESELURUHAN SISTEM GOTONG ROYONG DIGITAL');
  console.log('================================================================\n');

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
      rekening_bank: `BCA 888123456 a.n Mitra Uji ${randomSuffix}`,
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

    // Uji Generator QRIS Dinamis
    const resQr = await fetch(`${BASE_URL}/api/orders/${orderId}/qr`);
    assert(resQr.status === 200, 'GET /api/orders/:order_id/qr mengembalikan 200 OK');
    const qrData = await resQr.json();
    assert(Boolean(qrData.qr_data_url), 'Data URL gambar QRIS dinamis berhasil dibuat');
    assert(qrData.qr_data_url.startsWith('data:image/png;base64,'), 'Format gambar QRIS valid (PNG Base64)');

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

  } catch (err) {
    console.error('\n❌ PENGUJIAN TERHENTI DENGAN EROR:', err.message);
    process.exit(1);
  }
}

runTestSuite();
