const { Doku } = require('./doku');

async function testDoku() {
  console.log('=== PEMERIKSAAN STATUS QRIS DINAMIS DOKU ===');
  const config = Doku.getConfig();
  console.log('Merchant Client ID:', config.clientId);
  console.log('Endpoint Origin:', config.origin);

  const sampleOrder = {
    order_id: 'QRIS-CHECK-' + Date.now(),
    pembeli_nama: 'Uji Pembeli QRIS',
    pembeli_email: 'pembeli@example.com',
    pembeli_wa: '081234567890',
    harga: 50000
  };

  // 1. Uji Permintaan Khusus Channel QRIS Murni (Tanpa Fallback)
  console.log('\n[1] Memeriksa Channel Khusus QRIS Dinamis ke DOKU API...');
  try {
    const resQris = await Doku.createCheckoutPayment(sampleOrder, ['QRIS']);
    console.log('🎉 SELAMAT! Channel QRIS Dinamis DOKU SUDAH AKTIF!');
    console.log('  Payment URL Khusus QRIS:', resQris.paymentUrl);
    console.log('  Status: SIAP DIPASANG SECARA EKSKLUSIF');
  } catch (err) {
    console.log('⏳ STATUS QRIS SAAT INI:');
    console.log('  Respon DOKU:', err.message);
    if (err.message.includes('INACTIVE')) {
      console.log('  Keterangan: Channel QRIS masih dalam antrean aktivasi Bank Indonesia / DOKU.');
    }
  }

  // 2. Uji Hosted Checkout (Metode Lengkap: VA, Minimarket, QRIS jika aktif)
  console.log('\n[2] Memeriksa Hosted Checkout Umum...');
  try {
    const resGeneral = await Doku.createCheckoutPayment(sampleOrder, null);
    console.log('✓ Hosted Checkout DOKU: 100% AKTIF & BERJALAN');
    console.log('  URL Pembayaran:', resGeneral.paymentUrl);
  } catch (err) {
    console.log('✗ Hosted Checkout Gagal:', err.message);
  }
}

testDoku();
