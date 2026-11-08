# KONTEKS BERSAMA: Ekonomi Gotong Royong

- **Diperbarui**: 2026-11-08, Antigravity AI
- **Tujuan dan batas lingkup**: Mempelajari dokumen `Ekonomi_Gotong_Royong.pdf`, membangun platform mandiri e-commerce produk digital dengan sistem afiliasi bagi hasil 50% gotong royong, menghubungkannya dengan akun **DOKU Production** merchant `AYAM GEPREK RAJA RASA`, serta **memperbaiki celah keamanan pembayaran belum selesai tetapi sudah menampilkan berhasil dan mengizinkan unduhan barang digital**.
- **Keputusan yang berlaku**:
  1. Perbaikan Kritis Celah Unduhan Sebelum Bayar:
     - Menghapus total panggilan simulasi bayar otomatis pada berkas `success.html`.
     - Menerapkan penguncian ketat di backend (`server.js`): atribut `download_url` dan token unduhan hanya diserahkan jika `order.status === 'PAID'`. Jika masih `PENDING`, server mengembalikan `null`.
     - Pada endpoint unduhan `/download/:download_token`, diterapkan verifikasi status ketat. Permintaan unduhan dari pesanan yang belum lunas ditolak dengan HTTP 403 Forbidden.
  2. Sinkronisasi Real-Time dengan API Status DOKU:
     - Ditambahkan pemanggilan API resmi DOKU `/orders/v1/status/{invoice_number}` pada backend. Jika ada pembeli yang menyelesaikan transfer bank, status akan otomatis terverifikasi lunas secara real-time.
  3. Pemisahan Antarmuka `success.html`:
     - Status `PENDING`: Menampilkan ikon jam pasir kuning "Pembayaran Belum Selesai", menyembunyikan tombol unduhan, menyediakan tombol lanjut bayar ke DOKU, dan melakukan polling setiap 5 detik.
     - Status `PAID`: Menampilkan ikon centang hijau, ucapan terima kasih, dan baru memunculkan tombol unduhan berkas PDF resmi (164 KB).
- **Artefak dan lokasi**:
  - Dokumen Asal: [Ekonomi_Gotong_Royong.pdf](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/Ekonomi_Gotong_Royong.pdf)
  - Modul DOKU: [doku.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/doku.js)
  - Server & Database:
    - [server.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/server.js)
    - [db.js](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/db.js)
  - Halaman Antarmuka:
    - [public/index.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/index.html)
    - [public/checkout.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/checkout.html)
    - [public/mitra.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/mitra.html)
    - [public/success.html](file:///D:/GDRIVE/00_OTAK_AI/02_PROYEK/Ekonomi%20Gotong%20Royong/public/success.html)
- **Pengujian serta bukti**:
  - Uji pesanan baru yang belum dibayar terbukti menghasilkan `download_url: ''` (kosong) dan akses unduhan diblokir.
  - Setelah verifikasi pelunasan, `download_url` baru diserahkan dan berkas PDF 163.953 bytes berhasil diunduh (HTTP 200).
- **Kendala yang belum selesai**:
  - Menunggu aktivasi QRIS dari Bank Indonesia pada akun DOKU (status saat ini: `UPDATING`).
- **Langkah berikutnya**:
  - Sistem penguncian unduhan sudah aman dan siap digunakan melayani pelanggan nyata.
