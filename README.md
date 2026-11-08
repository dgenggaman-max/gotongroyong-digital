# GotongRoyong.Digital — Platform Mandiri Karya Digital & Bagi Hasil

Platform e-commerce digital mandiri (*self-hosted*) yang menerapkan prinsip **gotong royong riil, transparan, dan 100% legal**:
1. Menjual produk digital bernilai nyata (E-book panduan usaha & lembar kerja 30 hari).
2. Sistem afiliasi langsung (*single-tier affiliate*) dengan bagi hasil adil **50% (Rp 25.000 per transaksi)**.
3. Otomatisasi pembayaran menggunakan **QRIS dinamis** dan pengiriman produk instan (*instant delivery*).

---

## Fitur Utama

- **Katalog & Landing Page Penjualan**: Halaman beranda modern, responsif, dan persuasif yang menjelaskan manfaat produk serta mendeteksi referral mitra (`/?ref=kode`).
- **Dashboard Mitra Gotong Royong (`/mitra`)**:
  - Pendaftaran gratis tanpa biaya masuk.
  - Pembuatan tautan referral otomatis & kustom.
  - Tombol 1-klik salin tautan & bagikan langsung ke WhatsApp.
  - Kartu statistik real-time: total klik, penjualan sukses, dan akumulasi saldo komisi.
  - Riwayat transaksi terperinci.
- **Gerbang Pembayaran QRIS Interaktif (`/checkout/:order_id`)**:
  - Tampilan QRIS dinamis berbasis standar nasional.
  - Timer hitung mundur 15 menit.
  - Fitur pendeteksi pembayaran otomatis (*auto polling / webhook*).
  - Dilengkapi tombol simulasi pembayaran sukses untuk pengujian instan.
- **Pengiriman Produk Otomatis (`/success/:order_id`)**:
  - Pembeli yang sudah melunasi tagihan langsung mendapatkan tautan unduhan dokumen PDF asli 25 halaman.
- **Basis Data Mandiri**:
  - Menggunakan SQLite bawaan Node.js 24 (`node:sqlite`) yang ringan, cepat, dan tanpa dependensi rumit.

---

## Cara Menjalankan

### Cara 1: Menggunakan Terminal / PowerShell
```powershell
cd "D:\GDRIVE\00_OTAK_AI\02_PROYEK\Ekonomi Gotong Royong"
node server.js
```

### Cara 2: Klik Ganda Berkas
Klik ganda pada berkas `start-server.bat`.

Server akan aktif pada alamat:
- **Toko & Pembelian**: `http://localhost:3000`
- **Portal Mitra / Penjual**: `http://localhost:3000/mitra`
- **Contoh Link Referral**: `http://localhost:3000/?ref=budi`

---

## Pengujian Terverifikasi

Jalankan skrip uji integrasi menyeluruh:
```powershell
node test_flow.js
```
Hasil uji mencakup pendaftaran mitra, pelacakan klik referral, pembuatan pesanan, konfirmasi pembayaran QRIS, pencairan komisi otomatis ke saldo mitra, serta validasi ukuran berkas unduhan PDF.
