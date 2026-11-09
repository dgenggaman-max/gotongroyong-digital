# KONTEKS BERSAMA: Ekonomi Gotong Royong

- **Diperbarui**: 2026-11-09 (10:20 WIB), Antigravity AI
- **Tujuan dan batas lingkup**: Mempelajari dokumen `Ekonomi_Gotong_Royong.pdf`, membangun platform mandiri e-commerce produk digital dengan sistem afiliasi bagi hasil gotong royong terintegrasi DOKU Production (`AYAM GEPREK RAJA RASA`), mengamankan jalur unduhan hanya untuk pesanan berstatus `PAID`, menyatukan seluruh produk digital eksternal (Google Drive Univ Digital 500++, Masterclass 50 E-Course CUANLAGI, dan Spreadsheet 120 Produk) ke dalam paket serah terima pembayaran lunas, serta menerapkan sistem bagi hasil afiliasi 2-tingkat transparan (Admin 40%, Penjual Langsung 50%, Upline 10%) dengan integritas pengujian menyeluruh end-to-end tanpa bug dan tanpa eror.
- **Keputusan yang berlaku**:
  1. **Paket Mega Bundle Pembayaran Lunas (Akses Lengkap Member)**:
     - Setiap pembeli yang menyelesaikan pembayaran Rp 50.000 mendapatkan akses penuh seumur hidup ke:
       1. **E-Book Utama**: *Membangun Usaha yang Bernilai (PDF 25 Halaman & Action Plan 30 Hari)* yang diunduh langsung via server token terproteksi.
       2. **Paket Univ Digital (500++ Produk Digital)**: Folder Google Drive `https://drive.google.com/drive/folders/1xOfbEbwqIffo7tqAEbwNdn0VFN0EQ6L_` berisi Panduan Jualan, Marketing Kit, Bonus 90 E-Course, 640+ Canva Mockup, E-Book Cuan TikTok, Template Website & Grup Support.
       3. **Masterclass CUANLAGI (50 Video E-Course Bisnis Online)**: Folder Google Drive `https://drive.google.com/drive/folders/17prCtQGij_EGh_6sCjZvhlnvgOX_KijI` berisi 50 Video Masterclass (Website, Affiliate, WA, FB Ads, Funnel, Email, Canva, dll).
       4. **Spreadsheet Database 120 Produk Digital Siap Jual**: Google Spreadsheet `https://docs.google.com/spreadsheets/d/1_9ND8yru_bVHQAEoMxG35-ZWX2peYOOSEB4l_-rZFKI` berisi 120 template Excel Keuangan, PPT Presentasi, Medsos Canva, Elementor, Printable Journal, & Worksheet Anak yang terintegrasi langsung dengan fitur filter dan pencarian interaktif di halaman [success.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/success.html).
  2. **Skema Pembagian Keuntungan 2 Tingkat (Multi-Tier Gotong Royong)**:
     - **Harga Produk**: Rp 50.000 (Akses Mega Bundle Lengkap).
     - **Tier 1 (Mitra Penjual Langsung)**: **50% = Rp 25.000** per penjualan dari tautan bukunya.
     - **Tier 2 (Upline yang Mengajak Mitra)**: **10% = Rp 5.000** pasif income per penjualan yang dihasilkan oleh mitra binaannya.
     - **Platform & Admin**: **40% = Rp 20.000** per transaksi untuk pemeliharaan server, payment gateway, dan pengembangan materi.
     - **Penjualan Organik (Tanpa Referral)**: 100% (Rp 50.000) masuk penuh ke Admin.
  3. **Implementasi Database & Sistem Afiliasi 2 Tingkat**:
     - Tabel `mitra`: Ditambahkan kolom `upline_ref TEXT`, serta kolom data rekening terstruktur `bank_nama TEXT`, `bank_nomor TEXT`, dan `bank_pemilik TEXT`.
     - Tabel `orders`: Ditambahkan kolom `upline_ref TEXT` dan `komisi_upline INTEGER DEFAULT 0`.
     - Saat pendaftaran mitra di `/mitra?ref=upline`, sistem otomatis mendeteksi dan mengikat relasi upline ke akun baru.
     - Isian rekening di formulir pendaftaran [mitra.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/mitra.html) distandarisasi menjadi 3 komponen terstruktur:
       1. Pilihan Dropdown Bank / E-Wallet (BCA, Mandiri, BRI, BNI, BSI, CIMB, Permata, Bank Jago, SeaBank, BTN, Danamon, Maybank, DANA, GoPay, OVO, ShopeePay, LinkAja, atau Bank Daerah Lainnya).
       2. Nomor Rekening / Nomor Akun HP (numeric sanitization).
       3. Nama Pemilik Rekening (Atas Nama sesuai buku tabungan/akun e-wallet).
     - Dashboard mitra dan dialog penarikan komisi menampilkan kartu rekening terstruktur yang rapi dan tervalidasi.
     - Saat pesanan berstatus `PAID`, fungsi `Orders.markPaid` menyalurkan komisi Rp 25.000 ke penjual dan Rp 5.000 ke upline secara otomatis.
  4. **Hasil Uji Coba Komprehensif (84 Skenario Pengujian Lulus 100%)**:
     - Berkas penguji: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js)
     - Tahap 1: Verifikasi File & Aset (PDF 160.1 KB, 4 berkas HTML mobile).
     - Tahap 2: Uji HTTP Endpoints & Layar Responsif HP.
     - Tahap 3: Pendaftaran Mitra & Pelacakan Link Referral (termasuk verifikasi kolom rekening terstruktur).
     - Tahap 4: Pembuatan Pesanan, Validasi Status QRIS Asli & DOKU Checkout URL Resmi.
     - Tahap 5: Keamanan Dokumen Digital (Status 403 saat belum lunas, 404 pada token palsu).
     - Tahap 6: Pelunasan, Distribusi Bagi Hasil 50% Otomatis, dan Validasi Paket Lengkap (Akses Drive Univ Digital, CUANLAGI, & Spreadsheet 120 Produk).
     - Tahap 7: Penarikan Saldo Komisi Mitra Langsung.
     - Tahap 7.5: Pembagian Keuntungan 2 Tingkat (Upline 10%, Penjual 50%, Admin 40%) & Penarikan Royalti Upline.
     - Tahap 8: Validasi Input & Ketahanan Error Handling.
- **Artefak dan lokasi**:
  - Repositori GitHub Resmi: [github.com/dgenggaman-max/gotongroyong-digital](https://github.com/dgenggaman-max/gotongroyong-digital) (Commit `3817375`)
  - Modul & Layanan:
    - [server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js)
    - [db.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/db.js)
    - [index.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/index.html)
    - [mitra.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/mitra.html)
    - [checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html)
    - [success.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/success.html)
  - Suite Pengujian Menyeluruh: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js)
- **Status Akhir**:
  - Seluruh paket produk digital Google Drive & Spreadsheet terintegrasi penuh ke alur serah terima setelah pembayaran berhasil.
  - Seluruh 84 skenario pengujian lulus 100% tanpa bug dan tanpa eror.
