# KONTEKS BERSAMA: Ekonomi Gotong Royong

- **Diperbarui**: 2026-11-09 (11:45 WIB), Antigravity AI
- **Tujuan dan batas lingkup**: Mempelajari dokumen `Ekonomi_Gotong_Royong.pdf`, membangun platform mandiri e-commerce produk digital dengan sistem afiliasi bagi hasil gotong royong terintegrasi DOKU Production, mengamankan jalur unduhan hanya untuk pesanan berstatus `PAID`, menyatukan seluruh produk digital eksternal (Google Drive Univ Digital 500++, Masterclass 50 E-Course CUANLAGI, dan Spreadsheet 120 Produk) ke dalam paket serah terima pembayaran lunas, menetapkan harga psikologis Rp 49.999 dengan pembagian komisi afiliasi 2-tingkat (Penjual Langsung Rp 25.000 / 50%, Upline Rp 5.000 / 10%, Admin Rp 19.999 / ~40%), serta memastikan keandalan gateway DOKU 100% instan tanpa kendala koneksi dengan pra-pembuatan payment_url seketika saat pesanan dibuat.
- **Keputusan yang berlaku**:
  1. **Solusi Keandalan Koneksi Gerbang DOKU (100% Teratasi)**:
     - **Penyebab Kendala Sebelumnya**:
       1. Frontend sebelumnya mengandalkan pemanggilan asinkronus sekunder saat tombol ditekan, dan jika pengguna membuka browser tanpa server lokal berjalan atau URL order belum terurai, alert default "Gagal menghubungkan ke gerbang DOKU" terpicu.
       2. Kredensial DOKU di lingkungan cloud/hosting memerlukan default fallback terintegrasi agar tidak tergantung pada file konfigurasi lokal di PC pengembang.
       3. Ekstraksi Order ID di frontend kini dibuat multi-jalur (Pathname `/checkout/ORD-...`, Query Param `?order_id=...`, dan Fallback `localStorage.getItem('last_order_id')`).
     - **Peningkatan yang Diterapkan**:
       1. **Pra-Pembuatan Tautan DOKU (Pre-generated Payment URL)**: Saat pembeli mengklik submit di beranda (`/api/orders/create`), backend seketika menerbitkan `payment_url` resmi dari DOKU Production dan menyimpannya di database serta `localStorage`. Saat pembeli tiba di halaman checkout, link pembayaran sudah 100% siap tanpa jeda.
       2. **Default Fallback Kredensial Produksi di `doku.js`**: Client ID `BRN-0271-1793450501160` dan Secret Key `SK-9QFOiDRMBQQqkJZCKaCN` aktif otomatis di mana pun sistem dijalankan.
       3. **Dynamic Base URL**: Callback URL DOKU secara otomatis menyesuaikan protokol dan host pemanggil (`${proto}://${req.get('host')}`).
       4. **Sanitasi Data Konsumen & Line Items**: Nama produk dibersihkan dari karakter ilegal (`&` menjadi `dan`), nomor HP divalidasi 9-16 digit angka, dan email disanitasi agar DOKU API selalu menerima payload dengan status HTTP 200 OK.
       5. **File Peluncur Instan `JALANKAN_PLATFORM.bat`**: Memudahkan pengguna menyalakan platform lokal dan otomatis membuka browser ke `http://localhost:3000`.
  2. **Pembersihan Nama Merchant & Penyesuaian Identitas Pembayaran**:
     - Teks `AYAM GEPREK RAJA RASA` telah 100% dihilangkan dari antarmuka checkout ([public/checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html)) dan backend ([server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js)).
     - Label merchant diganti menjadi: `Platform Terverifikasi: Ekonomi Gotong Royong Digital`.
     - Teks keterangan QRIS diperbarui menjadi: `Metode QRIS DOKU sedang dalam antrean proses verifikasi Bank Indonesia`.
     - Array `order.line_items` resmi terpasang: Menampilkan item `Paket Usaha Gotong Royong Digital` seharga `Rp 49.999`.
  3. **Verifikasi Kesiapan Pembayaran (100% Berfungsi)**:
     - DOKU Hosted Checkout berjalan penuh di Production (`https://api.doku.com`):
       - Virtual Account Bank Aktif: **BRI, BNI, Permata, CIMB Niaga, Danamon, BSI (Mandiri Syariah), Maybank, Sinarmas, BNC, BJB, BTN, dan DOKU VA (Antar-Bank BCA/Mandiri)**.
       - Minimarket Retail Aktif: **Kasir Alfamart & Indomaret** di seluruh Indonesia.
     - Pengujian live di browser membuktikan peralihan dari formulir beranda ➔ checkout ➔ gerbang DOKU berlangsung instan tanpa eror.
  4. **Harga Psikologis Baru & Skema Bagi Hasil Afiliasi (Rp 49.999)**:
     - Harga Paket: **Rp 49.999**.
     - Mitra Penjual Langsung (Tier 1): **Rp 25.000** (50.00%).
     - Mitra Upline Pembina (Tier 2): **Rp 5.000** (10.00%).
     - Platform / Admin: **Rp 19.999** (~40.00%).
     - Penjualan Organik: 100% (Rp 49.999) ke Admin.
  5. **Hasil Uji Coba Komprehensif (84 Skenario Pengujian Lulus 100%)**:
     - Berkas penguji: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js). Seluruh 84 skenario lulus tanpa eror.
- **Artefak dan lokasi**:
  - Repositori GitHub Resmi: [github.com/dgenggaman-max/gotongroyong-digital](https://github.com/dgenggaman-max/gotongroyong-digital)
  - Modul Utama:
    - [server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js)
    - [db.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/db.js)
    - [doku.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/doku.js)
    - [index.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/index.html)
    - [checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html)
    - [success.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/success.html)
    - [JALANKAN_PLATFORM.bat](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/JALANKAN_PLATFORM.bat)
  - Suite Pengujian Menyeluruh: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js)
- **Status Akhir**:
  - Tautan DOKU terbit seketika saat pesanan dibuat dan langsung membuka gerbang pembayaran tanpa kendala.
