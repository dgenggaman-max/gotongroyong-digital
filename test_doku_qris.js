const { Doku } = require('./doku');

async function testDoku() {
  console.log('Testing DOKU payment integration...');
  const config = Doku.getConfig();
  console.log('Merchant Client ID:', config.clientId);
  console.log('Origin:', config.origin);

  const sampleOrder = {
    order_id: 'TEST-' + Date.now(),
    pembeli_nama: 'Uji Pembeli',
    pembeli_email: 'pembeli@example.com',
    pembeli_wa: '081234567890',
    harga: 50000
  };

  // 1. Uji Checkout Standar (Semua metode: VA, Minimarket, QRIS jika aktif)
  console.log('\n--- 1. Menguji DOKU Hosted Checkout ---');
  try {
    const res = await Doku.createCheckoutPayment(sampleOrder);
    console.log('✓ DOKU Hosted Checkout Berhasil!');
    console.log('  Payment URL:', res.paymentUrl);
  } catch (err) {
    console.log('✗ Hosted Checkout Gagal:', err.message);
  }

  // 2. Uji QRIS Khusus (payment_method_types: ['QRIS'])
  console.log('\n--- 2. Menguji DOKU Khusus QRIS ---');
  try {
    const resQris = await Doku.createQrisPayment(sampleOrder);
    console.log('✓ DOKU QRIS Payment Berhasil!');
    console.log('  QRIS Payment URL:', resQris.paymentUrl);
  } catch (err) {
    console.log('✗ Khusus QRIS belum diaktifkan DOKU / Masih Antrean BI:');
    console.log('  Pesan DOKU:', err.message);
  }
}

testDoku();
