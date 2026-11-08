const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, 'gotong_royong.db');
const db = new DatabaseSync(dbPath);

// Inisialisasi Tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS mitra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_code TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    rekening_bank TEXT NOT NULL,
    total_klik INTEGER DEFAULT 0,
    total_komisi INTEGER DEFAULT 0,
    saldo_tersedia INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    pembeli_nama TEXT NOT NULL,
    pembeli_email TEXT NOT NULL,
    pembeli_wa TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    harga INTEGER NOT NULL,
    ref_code TEXT,
    komisi_mitra INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    payment_url TEXT,
    download_token TEXT UNIQUE NOT NULL,
    paid_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mitra_id INTEGER NOT NULL,
    nominal INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING',
    catatan TEXT,
    created_at TEXT NOT NULL
  );
`);

// Migrasi Kolom Tambahan jika belum ada
try {
  db.exec('ALTER TABLE orders ADD COLUMN payment_url TEXT;');
} catch (e) {}

// Helpers Database
const Mitra = {
  create: (nama, whatsapp, rekening_bank, customRef = null) => {
    let ref_code = customRef
      ? customRef.toLowerCase().replace(/[^a-z0-9]/g, '')
      : (nama.toLowerCase().split(' ')[0] + Math.floor(100 + Math.random() * 900));

    // Pastikan ref_code unik
    let check = db.prepare('SELECT id FROM mitra WHERE ref_code = ?').get(ref_code);
    while (check) {
      ref_code = nama.toLowerCase().split(' ')[0] + Math.floor(1000 + Math.random() * 9000);
      check = db.prepare('SELECT id FROM mitra WHERE ref_code = ?').get(ref_code);
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO mitra (ref_code, nama, whatsapp, rekening_bank, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(ref_code, nama, whatsapp, rekening_bank, now);
    return { id: info.lastInsertRowid, ref_code, nama, whatsapp, rekening_bank, created_at: now };
  },

  getByRef: (ref_code) => {
    return db.prepare('SELECT * FROM mitra WHERE ref_code = ?').get(ref_code);
  },

  incrementClick: (ref_code) => {
    db.prepare('UPDATE mitra SET total_klik = total_klik + 1 WHERE ref_code = ?').run(ref_code);
  },

  addCommission: (ref_code, nominal) => {
    db.prepare(`
      UPDATE mitra 
      SET total_komisi = total_komisi + ?, 
          saldo_tersedia = saldo_tersedia + ? 
      WHERE ref_code = ?
    `).run(nominal, nominal, ref_code);
  },

  getAll: () => {
    return db.prepare('SELECT * FROM mitra ORDER BY id DESC').all();
  }
};

const Orders = {
  create: (data) => {
    const order_id = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const download_token = 'DL-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO orders (
        order_id, pembeli_nama, pembeli_email, pembeli_wa,
        product_id, product_name, harga, ref_code, komisi_mitra,
        status, download_token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `);

    stmt.run(
      order_id,
      data.pembeli_nama,
      data.pembeli_email,
      data.pembeli_wa,
      data.product_id,
      data.product_name,
      data.harga,
      data.ref_code || null,
      data.komisi_mitra || 0,
      download_token,
      now
    );

    return Orders.getById(order_id);
  },

  getById: (order_id) => {
    return db.prepare('SELECT * FROM orders WHERE order_id = ?').get(order_id);
  },

  getByToken: (download_token) => {
    return db.prepare('SELECT * FROM orders WHERE download_token = ?').get(download_token);
  },

  getByRef: (ref_code) => {
    return db.prepare('SELECT * FROM orders WHERE ref_code = ? ORDER BY id DESC').all(ref_code);
  },

  setPaymentUrl: (order_id, payment_url) => {
    db.prepare('UPDATE orders SET payment_url = ? WHERE order_id = ?').run(payment_url, order_id);
    return Orders.getById(order_id);
  },

  markPaid: (order_id) => {
    const order = Orders.getById(order_id);
    if (!order || order.status === 'PAID') return order;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE orders 
      SET status = 'PAID', paid_at = ? 
      WHERE order_id = ?
    `).run(now, order_id);

    // Salurkan komisi ke mitra jika ada ref_code
    if (order.ref_code && order.komisi_mitra > 0) {
      Mitra.addCommission(order.ref_code, order.komisi_mitra);
    }

    return Orders.getById(order_id);
  }
};

module.exports = { db, Mitra, Orders };
