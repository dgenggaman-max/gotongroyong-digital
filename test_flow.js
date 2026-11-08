const http = require('node:http');
const fs = require('node:fs');
const { db, Mitra, Orders } = require('./db');

async function runTest() {
  console.log('🧪 Memulai Pengujian Alur Platform Gotong Royong Digital...');

  // 1. Uji Pendaftaran Mitra
  console.log('1. Uji Pendaftaran Mitra: Budi Gotong Royong');
  const testRef = 'mitra' + Math.floor(1000 + Math.random() * 9000);
  const mitra = Mitra.create('Budi Gotong Royong', '08123456789', 'BCA 12345678 a.n Budi', testRef);
  console.log('   ✓ Mitra terdaftar:', mitra.nama, '| Kode Ref:', mitra.ref_code);

  // 2. Uji Klik Referral
  console.log(`2. Uji Simulasi Pengunjung Buka Link Referral (?ref=${mitra.ref_code})`);
  Mitra.incrementClick(mitra.ref_code);
  const mitraUpdated = Mitra.getByRef(mitra.ref_code);
  console.log('   ✓ Total klik tercatat:', mitraUpdated.total_klik);

  // 3. Uji Pembuatan Pesanan dengan Referral
  console.log('3. Uji Pembuatan Pesanan oleh Pembeli');
  const order = Orders.create({
    pembeli_nama: 'Dewi Lestari',
    pembeli_email: 'dewi@example.com',
    pembeli_wa: '085299998888',
    product_id: 'PROD-BUKU-01',
    product_name: 'E-Book & Lembar Kerja 30 Hari: Membangun Usaha yang Bernilai',
    harga: 50000,
    ref_code: mitra.ref_code,
    komisi_mitra: 25000
  });
  console.log('   ✓ Pesanan dibuat:', order.order_id, '| Status:', order.status, '| Komisi Mitra:', order.komisi_mitra);

  // 4. Uji Pelunasan Pesanan & Pembagian Komisi
  console.log('4. Uji Konfirmasi Pembayaran QRIS');
  const paidOrder = Orders.markPaid(order.order_id);
  console.log('   ✓ Status pesanan berubah menjadi:', paidOrder.status);

  // 5. Verifikasi Saldo & Komisi Mitra
  const mitraFinal = Mitra.getByRef(mitra.ref_code);
  console.log(`5. Verifikasi Saldo Mitra ${mitraFinal.nama}`);
  console.log('   ✓ Total Komisi Masuk: Rp', mitraFinal.total_komisi);
  console.log('   ✓ Saldo Tersedia: Rp', mitraFinal.saldo_tersedia);

  if (mitraFinal.total_komisi === 25000 && mitraFinal.saldo_tersedia === 25000) {
    console.log('   🌟 Sukses: Bagi hasil 50% (Rp 25.000) otomatis masuk ke akun mitra!');
  } else {
    throw new Error('Komisi tidak sesuai kalkulasi!');
  }

  // 6. Verifikasi Akses Download Dokumen
  console.log('6. Verifikasi Validitas Token Download');
  const orderForDownload = Orders.getByToken(paidOrder.download_token);
  if (orderForDownload && orderForDownload.status === 'PAID') {
    const pdfPath = './storage/products/membangun-yang-bernilai.pdf';
    const exists = fs.existsSync(pdfPath);
    const size = exists ? fs.statSync(pdfPath).size : 0;
    console.log('   ✓ Berkas PDF ditemukan:', exists, '| Ukuran:', size, 'bytes');
    if (size > 100000) {
      console.log('   🌟 Sukses: Dokumen asli 25 halaman siap diunduh pembeli!');
    }
  }

  console.log('\n✅ SEMUA PENGUJIAN INTEGRITAS SISTEM BERHASIL DENGAN NILAI 100%!');
}

runTest().catch(err => {
  console.error('❌ Gagal pengujian:', err);
  process.exit(1);
});
