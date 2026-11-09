# KONTEKS BERSAMA: Ekonomi Gotong Royong

- **Diperbarui**: 2026-11-09 (09:50 WIB), Antigravity AI
- **Tujuan dan batas lingkup**: Mempelajari dokumen `Ekonomi_Gotong_Royong.pdf`, membangun platform mandiri e-commerce produk digital dengan sistem afiliasi bagi hasil gotong royong terintegrasi DOKU Production (`AYAM GEPREK RAJA RASA`), mengamankan jalur unduhan hanya untuk pesanan berstatus `PAID`, serta menerapkan sistem bagi hasil afiliasi 2-tingkat transparan (Admin 40%, Penjual Langsung 50%, Upline 10%) dengan integritas pengujian menyeluruh end-to-end tanpa bug dan tanpa eror.
- **Keputusan yang berlaku**:
  1. **Skema Pembagian Keuntungan 2 Tingkat (Multi-Tier Gotong Royong)**:
     - **Harga Produk**: Rp 50.000 (E-Book & Workbook 30 Hari Membangun Usaha yang Bernilai).
     - **Tier 1 (Mitra Penjual Langsung)**: **50% = Rp 25.000** per penjualan dari tautan bukunya.
     - **Tier 2 (Upline yang Mengajak Mitra)**: **10% = Rp 5.000** pasif income per penjualan yang dihasilkan oleh mitra binaannya.
     - **Platform & Admin**: **40% = Rp 20.000** per transaksi untuk pemeliharaan server, payment gateway, dan pengembangan materi.
     - **Penjualan Organik (Tanpa Referral)**: 100% (Rp 50.000) masuk penuh ke Admin.
  2. **Implementasi Database & Sistem Afiliasi 2 Tingkat**:
     - Tabel `mitra`: Ditambahkan kolom `upline_ref TEXT`, serta kolom data rekening terstruktur `bank_nama TEXT`, `bank_nomor TEXT`, dan `bank_pemilik TEXT`.
     - Tabel `orders`: Ditambahkan kolom `upline_ref TEXT` dan `komisi_upline INTEGER DEFAULT 0`.
     - Saat pendaftaran mitra di `/mitra?ref=upline`, sistem otomatis mendeteksi dan mengikat relasi upline ke akun baru.
     - Isian rekening di formulir pendaftaran [mitra.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/mitra.html) distandarisasi menjadi 3 komponen terstruktur:
       1. Pilihan Dropdown Bank / E-Wallet (BCA, Mandiri, BRI, BNI, BSI, CIMB, Permata, Bank Jago, SeaBank, BTN, Danamon, Maybank, DANA, GoPay, OVO, ShopeePay, LinkAja, atau Bank Daerah Lainnya).
       2. Nomor Rekening / Nomor Akun HP (numeric sanitization).
       3. Nama Pemilik Rekening (Atas Nama sesuai buku tabungan/akun e-wallet).
     - Dashboard mitra dan dialog penarikan komisi menampilkan kartu rekening terstruktur yang rapi dan tervalidasi.
     - Saat pesanan berstatus `PAID`, fungsi `Orders.markPaid` menyalurkan komisi Rp 25.000 ke penjual dan Rp 5.000 ke upline secara otomatis.
  3. **Investigasi & Resolusi Masalah QRIS Dinamis ("QRIS Terjadi Kesalahan")**:
     - Menghapus pembuatan dummy QR fiktif di [server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js).
     - Menambahkan modul pengecekan status channel QRIS di [doku.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/doku.js) (`Doku.checkQrisActive`) dengan caching otomatis.
     - Menyediakan dukungan pemindaian QRIS statis toko fisik jika pemilik menaruh gambar di `storage/qris/`.
     - Mengubah [checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html) agar tab default utama adalah metode resmi DOKU (Virtual Account & Gerai Retail) yang sudah pasti berhasil dibayar 100%.
  4. **Hasil Uji Coba Komprehensif (78 Skenario Pengujian Lulus 100%)**:
     - Berkas penguji: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js)
     - Tahap 1: Verifikasi File & Aset (PDF 160.1 KB, 4 berkas HTML mobile).
     - Tahap 2: Uji HTTP Endpoints & Layar Responsif HP.
     - Tahap 3: Pendaftaran Mitra & Pelacakan Link Referral (termasuk verifikasi kolom rekening terstruktur).
     - Tahap 4: Pembuatan Pesanan, Validasi Status QRIS Asli & DOKU Checkout URL Resmi.
     - Tahap 5: Keamanan Dokumen Digital (Status 403 saat belum lunas, 404 pada token palsu).
     - Tahap 6: Pelunasan & Distribusi Bagi Hasil 50% Otomatis.
     - Tahap 7: Penarikan Saldo Komisi Mitra Langsung.
     - Tahap 7.5: Pembagian Keuntungan 2 Tingkat (Upline 10%, Penjual 50%, Admin 40%) & Penarikan Royalti Upline.
     - Tahap 8: Validasi Input & Ketahanan Error Handling.
- **Artefak dan lokasi**:
  - Repositori GitHub Resmi: [github.com/dgenggaman-max/gotongroyong-digital](https://github.com/dgenggaman-max/gotongroyong-digital) (Commit `030a856`)
  - Modul & Layanan:
    - [server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js)
    - [db.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/db.js)
    - [mitra.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/mitra.html)
    - [doku.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/doku.js)
    - [checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html)
  - Suite Pengujian Menyeluruh: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js)
- **Status Akhir**:
  - Sistem pembagian keuntungan 2 tingkat aktif dan teruji 100%.
  - Format rekening bank & e-wallet terstruktur dan tervalidasi.
  - Seluruh 78 skenario pengujian lulus 100% tanpa bug dan tanpa eror.
  - Perubahan telah di-push ke branch `main` GitHub.
