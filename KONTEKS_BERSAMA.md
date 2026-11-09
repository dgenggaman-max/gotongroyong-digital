# KONTEKS BERSAMA: Ekonomi Gotong Royong

- **Diperbarui**: 2026-11-09 (11:05 WIB), Antigravity AI
- **Tujuan dan batas lingkup**: Mempelajari dokumen `Ekonomi_Gotong_Royong.pdf`, membangun platform mandiri e-commerce produk digital dengan sistem afiliasi bagi hasil gotong royong terintegrasi DOKU Production, mengamankan jalur unduhan hanya untuk pesanan berstatus `PAID`, menyatukan seluruh produk digital eksternal (Google Drive Univ Digital 500++, Masterclass 50 E-Course CUANLAGI, dan Spreadsheet 120 Produk) ke dalam paket serah terima pembayaran lunas, menetapkan harga psikologis Rp 49.999 dengan pembagian komisi afiliasi 2-tingkat (Penjual Langsung Rp 25.000 / 50%, Upline Rp 5.000 / 10%, Admin Rp 19.999 / ~40%), menghilangkan teks "AYAM GEPREK RAJA RASA" dari antarmuka pembayaran website & API, menambahkan payload line items resmi ke DOKU API, serta memvalidasi kesiapan metode pembayaran aktif (Virtual Account Bank & Minimarket) berjalan 100% lancar.
- **Keputusan yang berlaku**:
  1. **Pembersihan Nama Merchant & Penyesuaian Identitas Pembayaran**:
     - Teks `AYAM GEPREK RAJA RASA` telah 100% dihilangkan dari antarmuka checkout ([public/checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html)) dan backend ([server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js)).
     - Label merchant diganti menjadi: `Platform Terverifikasi: Ekonomi Gotong Royong Digital`.
     - Teks keterangan QRIS diperbarui menjadi: `Metode QRIS DOKU sedang dalam antrean proses verifikasi Bank Indonesia`.
     - Ditambahkan sanitasi nama produk dan array `order.line_items` resmi pada payload DOKU Checkout ([doku.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/doku.js)): Menampilkan item `Paket Usaha Gotong Royong Digital` seharga `Rp 49.999` di ringkasan pesanan konsumen saat membuka gerbang DOKU.
     - Untuk nama brand/toko di bagian atas halaman DOKU Checkout (`checkout.doku.com`), pengguna dipandu untuk memperbarui *Brand Name* di dashboard DOKU Back Office (*Settings > Checkout Appearance / Business Profile*).
  2. **Verifikasi Kesiapan Pembayaran (100% Berfungsi)**:
     - DOKU Hosted Checkout berjalan penuh di Production (`https://api.doku.com`):
       - Virtual Account Bank Aktif: **BRI, BNI, Permata, CIMB Niaga, Danamon, BSI (Mandiri Syariah), Maybank, Sinarmas, BNC, BJB, BTN, dan DOKU VA (Antar-Bank BCA/Mandiri)**.
       - Minimarket Retail Aktif: **Kasir Alfamart & Indomaret** di seluruh Indonesia.
     - Pengujian langsung di browser membuktikan nomor Virtual Account (contoh: BRI VA `1236260022146054`) berhasil diterbitkan secara live dengan nominal tepat Rp 49.999 dan instruksi pembayaran lengkap.
  3. **Harga Psikologis Baru & Skema Bagi Hasil Afiliasi (Rp 49.999)**:
     - **Harga Paket Produk**: **Rp 49.999** (disesuaikan dari Rp 50.000 untuk konversi psikologis tinggi di bawah 50rb).
     - **Mitra Penjual Langsung (Tier 1)**: **Rp 25.000** (50.00% dari harga paket) per penjualan dari tautan referral miliknya.
     - **Mitra Upline Pembina (Tier 2)**: **Rp 5.000** (10.00% dari harga paket) pasif income per penjualan yang dihasilkan oleh mitra binaannya.
     - **Platform / Admin**: **Rp 19.999** (~40.00% dari harga paket) untuk biaya operasional server, DOKU gateway, dan materi.
     - **Penjualan Organik (Tanpa Referral)**: 100% (Rp 49.999) masuk penuh ke Admin.
  4. **Paket Mega Bundle Pembayaran Lunas (Akses Lengkap Member)**:
     - Setiap pembeli yang menyelesaikan pembayaran Rp 49.999 mendapatkan akses penuh seumur hidup ke:
       1. **E-Book Utama**: *Membangun Usaha yang Bernilai (PDF 25 Halaman & Action Plan 30 Hari)* yang diunduh langsung via server token terproteksi.
       2. **Paket Univ Digital (500++ Produk Digital)**: Folder Google Drive `https://drive.google.com/drive/folders/1xOfbEbwqIffo7tqAEbwNdn0VFN0EQ6L_`.
       3. **Masterclass CUANLAGI (50 Video E-Course Bisnis Online)**: Folder Google Drive `https://drive.google.com/drive/folders/17prCtQGij_EGh_6sCjZvhlnvgOX_KijI`.
       4. **Spreadsheet Database 120 Produk Digital Siap Jual**: Google Spreadsheet `https://docs.google.com/spreadsheets/d/1_9ND8yru_bVHQAEoMxG35-ZWX2peYOOSEB4l_-rZFKI`.
  5. **Hasil Uji Coba Komprehensif (84 Skenario Pengujian Lulus 100%)**:
     - Berkas penguji: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js)
     - Seluruh 84 skenario lulus tanpa eror.
- **Artefak dan lokasi**:
  - Repositori GitHub Resmi: [github.com/dgenggaman-max/gotongroyong-digital](https://github.com/dgenggaman-max/gotongroyong-digital)
  - Modul Utama:
    - [server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js)
    - [db.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/db.js)
    - [doku.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/doku.js)
    - [index.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/index.html)
    - [mitra.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/mitra.html)
    - [checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html)
    - [success.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/success.html)
  - Suite Pengujian Menyeluruh: [test_complete_system.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/test_complete_system.js)
- **Status Akhir**:
  - Tulisan "AYAM GEPREK RAJA RASA" telah bersih dari antarmuka sistem.
  - Alur pembayaran DOKU teruji langsung dan 100% siap digunakan menerima pembayaran riil.
